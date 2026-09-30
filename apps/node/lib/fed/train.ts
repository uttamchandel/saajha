// A state node's local step in a live round (Saajha step 3): train the released model on the cases this
// state's experts verified since the last round. The same maths as fl/saajha_fl/task.py train() with
// mask_absent=False, the recipe of the recorded Flower run otherwise unchanged:
//   x -> L2-normalise -> Linear(1280,64) -> ReLU -> Linear(64,10)
//   class-balanced cross-entropy (weights present.sum() / (count_c * classes present), as torch's
//   weighted mean), SGD lr 0.2 momentum 0.9 (torch semantics), 2 epochs, batch 64.
// Checked against the Python code by fl/scripts/check_live_round.py. No imports: pure maths.

export const RECIPE = { epochs: 2, lr: 0.2, momentum: 0.9, batch: 64 } as const;
export const DIM = 1280;
export const HIDDEN = 64;
export const K = 10;

export type Tensors = Record<string, Float32Array>;

/** Deterministic shuffle (mulberry32 + Fisher-Yates); fl/scripts/check_live_round.py mirrors it. */
export function permutation(n: number, seed: number): number[] {
  let a = seed >>> 0;
  const rand = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const p = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [p[i], p[j]] = [p[j], p[i]];
  }
  return p;
}

/** Train a copy of `base` on (x, y) cases. Returns the new weights and the mean training loss. */
export function trainLocal(base: Tensors, cases: { x: Float32Array; y: number }[], seed: number): { tensors: Tensors; loss: number } {
  const W0 = Float32Array.from(base["net.0.weight"]), b0 = Float32Array.from(base["net.0.bias"]);
  const W2 = Float32Array.from(base["net.2.weight"]), b2 = Float32Array.from(base["net.2.bias"]);
  const params = [W0, b0, W2, b2];
  const bufs = params.map((p) => new Float32Array(p.length));
  let started = false;

  // L2-normalise each case once (torch F.normalize, eps 1e-12).
  const X = cases.map(({ x }) => {
    let s = 0;
    for (let i = 0; i < DIM; i++) s += x[i] * x[i];
    const n = Math.max(Math.sqrt(s), 1e-12);
    const out = new Float32Array(DIM);
    for (let i = 0; i < DIM; i++) out[i] = x[i] / n;
    return out;
  });
  const Y = cases.map((c) => c.y);
  const counts = new Array(K).fill(0);
  for (const y of Y) counts[y]++;
  const present = counts.filter((c) => c > 0).length;
  const cw = counts.map((c) => (c > 0 ? Y.length / (c * present) : 0));

  const gW0 = new Float64Array(W0.length), gb0 = new Float64Array(b0.length);
  const gW2 = new Float64Array(W2.length), gb2 = new Float64Array(b2.length);
  const z1 = new Float64Array(HIDDEN), h = new Float64Array(HIDDEN), z2 = new Float64Array(K), dz2 = new Float64Array(K), dh = new Float64Array(HIDDEN);
  let lossSum = 0;
  let seen = 0;

  for (let epoch = 0; epoch < RECIPE.epochs; epoch++) {
    const order = permutation(Y.length, seed * 1000 + epoch);
    for (let start = 0; start < order.length; start += RECIPE.batch) {
      const batch = order.slice(start, start + RECIPE.batch);
      gW0.fill(0); gb0.fill(0); gW2.fill(0); gb2.fill(0);
      let wsum = 0;
      for (const i of batch) wsum += cw[Y[i]];
      let batchLoss = 0;
      for (const i of batch) {
        const x = X[i], y = Y[i], w = cw[y] / wsum;
        for (let j = 0; j < HIDDEN; j++) {
          let s = b0[j];
          const row = j * DIM;
          for (let d = 0; d < DIM; d++) s += W0[row + d] * x[d];
          z1[j] = s;
          h[j] = s > 0 ? s : 0;
        }
        let m = -Infinity;
        for (let c = 0; c < K; c++) {
          let s = b2[c];
          const row = c * HIDDEN;
          for (let j = 0; j < HIDDEN; j++) s += W2[row + j] * h[j];
          z2[c] = s;
          if (s > m) m = s;
        }
        let se = 0;
        for (let c = 0; c < K; c++) se += Math.exp(z2[c] - m);
        batchLoss += w * (m + Math.log(se) - z2[y]);
        for (let c = 0; c < K; c++) dz2[c] = w * (Math.exp(z2[c] - m) / se - (c === y ? 1 : 0));
        dh.fill(0);
        for (let c = 0; c < K; c++) {
          const row = c * HIDDEN;
          gb2[c] += dz2[c];
          for (let j = 0; j < HIDDEN; j++) {
            gW2[row + j] += dz2[c] * h[j];
            dh[j] += W2[row + j] * dz2[c];
          }
        }
        for (let j = 0; j < HIDDEN; j++) {
          if (z1[j] <= 0) continue; // ReLU gradient
          const g = dh[j];
          gb0[j] += g;
          const row = j * DIM;
          for (let d = 0; d < DIM; d++) gW0[row + d] += g * x[d];
        }
      }
      // torch.optim.SGD with momentum: buf = g on the first step, then buf = momentum * buf + g; p -= lr * buf.
      const grads = [gW0, gb0, gW2, gb2];
      for (let k = 0; k < params.length; k++) {
        const p = params[k], g = grads[k], buf = bufs[k];
        for (let i = 0; i < p.length; i++) {
          buf[i] = started ? RECIPE.momentum * buf[i] + g[i] : g[i];
          p[i] -= RECIPE.lr * buf[i];
        }
      }
      started = true;
      lossSum += batchLoss * batch.length;
      seen += batch.length;
    }
  }
  return { tensors: { "net.0.weight": W0, "net.0.bias": b0, "net.2.weight": W2, "net.2.bias": b2 }, loss: lossSum / Math.max(seen, 1) };
}

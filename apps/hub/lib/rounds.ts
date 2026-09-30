// Live federated rounds: the learning loop (Saajha step 3). Server-only.
//
// A round: each state node trains the released model on the cases its experts verified since its last
// contribution and sends only the weights (apps/node/app/api/fl/update). The hub checks every update at
// the border, averages them weighted by cases (FedAvg), and moves the release part of the way toward
// the average: the largest server step in STEPS that keeps accuracy on the 516 validation photos within
// VAL_TOLERANCE (a server learning rate, as in FedOpt). It then fits a new temperature and threshold on
// the validation photos and releases the round only if accuracy on the 1,549 held-out test photos has
// not fallen by more than TEST_TOLERANCE. Why the step: a state's few new cases, applied in full, undo
// what 16,536 recorded cases taught (measured: held-out accuracy fell to 17-85%); a step keeps it level.
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { HeadFile } from "./contract";
import type { NodeInfo } from "./exchange";

export const DIM = 1280;
export const HIDDEN = 64;
export const K = 10;
export const SHAPES: Record<string, number[]> = {
  "net.0.bias": [HIDDEN],
  "net.0.weight": [HIDDEN, DIM],
  "net.2.bias": [K],
  "net.2.weight": [K, HIDDEN],
};
export const NAMES = Object.keys(SHAPES).sort();
export const STEPS = [0.3, 0.2, 0.1, 0.05, 0.02];
export const VAL_TOLERANCE = 0.005;
export const TEST_TOLERANCE = 0.005;
export const UPDATE_SCHEMA = "saajha.model_update.v1";

export type Tensors = Record<string, Float32Array>;

// ---------------------------------------------------------------- the held-out benchmark (server-only)

type Split = { X: Float32Array; y: Uint8Array; n: number };
let benchP: Promise<{ val: Split; test: Split }> | null = null;

function f16(h: number): number {
  const s = h & 0x8000 ? -1 : 1;
  const e = (h >> 10) & 0x1f;
  const f = h & 0x3ff;
  if (e === 0) return s * 2 ** -14 * (f / 1024);
  if (e === 31) return f ? NaN : s * Infinity;
  return s * 2 ** (e - 15) * (1 + f / 1024);
}

/** val + test embeddings (fl/scripts/export_benchmark.py), L2-normalised once, as the head does. */
export function benchmark(): Promise<{ val: Split; test: Split }> {
  benchP ??= (async () => {
    const dir = path.join(process.cwd(), "data", "benchmark");
    const meta = JSON.parse(await readFile(path.join(dir, "meta.json"), "utf8")) as { splits: Record<string, { n: number; labels: number[] }> };
    const load = async (s: "val" | "test"): Promise<Split> => {
      const buf = await readFile(path.join(dir, `${s}.f16`));
      const { n, labels } = meta.splits[s];
      const X = new Float32Array(n * DIM);
      for (let r = 0; r < n; r++) {
        let norm = 0;
        for (let i = 0; i < DIM; i++) {
          const v = f16(buf.readUInt16LE((r * DIM + i) * 2));
          X[r * DIM + i] = v;
          norm += v * v;
        }
        norm = Math.max(Math.sqrt(norm), 1e-12);
        for (let i = 0; i < DIM; i++) X[r * DIM + i] /= norm;
      }
      return { X, y: Uint8Array.from(labels), n };
    };
    return { val: await load("val"), test: await load("test") };
  })();
  benchP.catch(() => {
    benchP = null;
  });
  return benchP;
}

// ---------------------------------------------------------------- the head's maths (fl/saajha_fl/task.py)

/** Logits for rows that are already L2-normalised: Linear(1280,64) -> ReLU -> Linear(64,10). */
export function logits(t: Tensors, X: Float32Array, n: number): Float32Array {
  const W0 = t["net.0.weight"], b0 = t["net.0.bias"], W2 = t["net.2.weight"], b2 = t["net.2.bias"];
  const out = new Float32Array(n * K);
  const h = new Float64Array(HIDDEN);
  for (let r = 0; r < n; r++) {
    const off = r * DIM;
    for (let j = 0; j < HIDDEN; j++) {
      let s = b0[j];
      const w = j * DIM;
      for (let i = 0; i < DIM; i++) s += W0[w + i] * X[off + i];
      h[j] = s > 0 ? s : 0;
    }
    for (let c = 0; c < K; c++) {
      let s = b2[c];
      const w = c * HIDDEN;
      for (let j = 0; j < HIDDEN; j++) s += W2[w + j] * h[j];
      out[r * K + c] = s;
    }
  }
  return out;
}

function argmax(z: Float32Array, r: number): number {
  let best = 0;
  for (let c = 1; c < K; c++) if (z[r * K + c] > z[r * K + best]) best = c;
  return best;
}

export function accuracy(z: Float32Array, y: Uint8Array): number {
  let ok = 0;
  for (let r = 0; r < y.length; r++) if (argmax(z, r) === y[r]) ok++;
  return ok / y.length;
}

/** Temperature scaling as in fl/scripts/export_web.py: the grid value with the lowest validation NLL. */
export function fitTemperature(z: Float32Array, y: Uint8Array): number {
  let bestT = 1;
  let bestNll = Infinity;
  for (let g = 0; g < 80; g++) {
    const T = 0.25 * (50 / 0.25) ** (g / 79);
    let nll = 0;
    for (let r = 0; r < y.length; r++) {
      let m = -Infinity;
      for (let c = 0; c < K; c++) m = Math.max(m, z[r * K + c] / T);
      let s = 0;
      for (let c = 0; c < K; c++) s += Math.exp(z[r * K + c] / T - m);
      nll += m + Math.log(s) - z[r * K + y[r]] / T;
    }
    nll /= y.length;
    if (nll < bestNll) {
      bestNll = nll;
      bestT = T;
    }
  }
  return Math.round(bestT * 1e4) / 1e4;
}

/** The lowest calibrated confidence at which accepted predictions are >= 90% right on validation (min 20). */
export function thresholdAt90(z: Float32Array, y: Uint8Array, T: number): number {
  const conf: number[] = [];
  const right: boolean[] = [];
  for (let r = 0; r < y.length; r++) {
    let m = -Infinity;
    for (let c = 0; c < K; c++) m = Math.max(m, z[r * K + c] / T);
    let s = 0;
    for (let c = 0; c < K; c++) s += Math.exp(z[r * K + c] / T - m);
    const top = argmax(z, r);
    conf.push(Math.exp(z[r * K + top] / T - m) / s);
    right.push(top === y[r]);
  }
  for (let i = 30; i <= 95; i++) {
    const t = i / 100;
    let n = 0;
    let ok = 0;
    for (let r = 0; r < conf.length; r++)
      if (conf[r] >= t) {
        n++;
        if (right[r]) ok++;
      }
    if (n >= 20 && ok / n >= 0.9) return t;
  }
  return 0.5;
}

// ---------------------------------------------------------------- weights: encoding and fingerprints

export function sha256Of(t: Tensors): string {
  const h = createHash("sha256");
  for (const name of NAMES) {
    h.update(Buffer.from(name, "utf8"));
    h.update(Buffer.from(t[name].buffer, t[name].byteOffset, t[name].byteLength));
  }
  return h.digest("hex");
}

export function toB64(a: Float32Array): string {
  return Buffer.from(a.buffer, a.byteOffset, a.byteLength).toString("base64");
}

export function fromB64(b64: string): Float32Array {
  const buf = Buffer.from(b64, "base64");
  const out = new Float32Array(buf.byteLength / 4);
  for (let i = 0; i < out.length; i++) out[i] = buf.readFloatLE(i * 4);
  return out;
}

export function headFile(t: Tensors, round: number, temperature: number): HeadFile {
  return {
    id: `global_r${round}`,
    kind: "global",
    state: null,
    round,
    arch: "mlp1",
    temperature,
    tensors: NAMES.map((name) => ({ name, shape: SHAPES[name], dtype: "float32-le", b64: toB64(t[name]) })),
    sha256: sha256Of(t),
  } as HeadFile;
}

export function tensorsOf(file: { tensors: { name: string; b64: string }[] }): Tensors {
  const t: Tensors = {};
  for (const x of file.tensors) t[x.name] = fromB64(x.b64);
  return t;
}

// ---------------------------------------------------------------- the border check for model updates

const UPDATE_KEYS = new Set(["schema", "node", "state", "base_round", "base_sha256", "n_cases", "tensors", "sha256", "metrics"]);

export type CheckedUpdate = { ok: true; state: string; n: number; tensors: Tensors; sha256: string; bytes: number } | { ok: false; state: string; reason: string };

/** Only weights of the released model's exact shape, finite, fingerprinted, plus a case count, may cross. */
export function checkUpdate(env: unknown, node: NodeInfo, base: { round: number; sha256: string }): CheckedUpdate {
  const e = (env ?? {}) as Record<string, unknown>;
  const no = (reason: string): CheckedUpdate => ({ ok: false, state: node.state, reason });
  if (e.schema !== UPDATE_SCHEMA) return no("not a Saajha model update");
  if (e.state !== node.state) return no("the update names a different state from the node that sent it");
  if (Object.keys(e).some((k) => !UPDATE_KEYS.has(k))) return no("it carries a field other than weights, fingerprints and a case count");
  if (e.base_round !== base.round || e.base_sha256 !== base.sha256) return no("it was trained from a different model version");
  if (typeof e.n_cases !== "number" || !Number.isInteger(e.n_cases) || e.n_cases < 1 || e.n_cases > 1000) return no("the case count is not a whole number from 1 to 1,000");
  if (e.metrics != null && (typeof e.metrics !== "object" || Object.values(e.metrics as object).some((v) => typeof v !== "number"))) return no("its metrics are not plain numbers");
  if (!Array.isArray(e.tensors) || e.tensors.length !== NAMES.length) return no("it does not carry exactly the model's four weight tensors");
  const t: Tensors = {};
  let bytes = 0;
  for (const raw of e.tensors as Record<string, unknown>[]) {
    const name = String(raw?.name ?? "");
    const shape = SHAPES[name];
    if (!shape || JSON.stringify(raw.shape) !== JSON.stringify(shape) || raw.dtype !== "float32-le" || typeof raw.b64 !== "string") return no("a tensor's name, shape or type does not match the model");
    const data = fromB64(raw.b64);
    if (data.length !== shape.reduce((a, b) => a * b, 1)) return no("a tensor has the wrong number of values");
    for (let i = 0; i < data.length; i++) if (!Number.isFinite(data[i]) || Math.abs(data[i]) > 100) return no("a weight is not a finite, plausible number");
    t[name] = data;
    bytes += data.byteLength;
  }
  if (NAMES.some((n) => !t[n])) return no("a weight tensor is missing");
  if (sha256Of(t) !== e.sha256) return no("the weights do not match their fingerprint");
  return { ok: true, state: node.state, n: e.n_cases as number, tensors: t, sha256: e.sha256 as string, bytes };
}

// ---------------------------------------------------------------- one round

export type Release = { round: number; sha256: string; temperature: number; tau: number; tensors: Tensors; headUrl: string; source: "recorded" | "live" };

export function fedAvg(updates: { n: number; tensors: Tensors }[]): Tensors {
  const total = updates.reduce((a, u) => a + u.n, 0);
  const out: Tensors = {};
  for (const name of NAMES) {
    const acc = new Float64Array(updates[0].tensors[name].length);
    for (const u of updates) {
      const w = u.n / total;
      const d = u.tensors[name];
      for (let i = 0; i < acc.length; i++) acc[i] += w * d[i];
    }
    out[name] = Float32Array.from(acc);
  }
  return out;
}

function stepToward(base: Tensors, target: Tensors, a: number): Tensors {
  const out: Tensors = {};
  for (const name of NAMES) {
    const b = base[name], t = target[name];
    const o = new Float32Array(b.length);
    for (let i = 0; i < b.length; i++) o[i] = b[i] + a * (t[i] - b[i]);
    out[name] = o;
  }
  return out;
}

export type RoundOutcome =
  | { status: "released"; tensors: Tensors; step: number; temperature: number; tau: number; valBase: number; val: number; testBase: number; test: number }
  | { status: "refused"; reason: string; step: number | null; valBase: number; val: number | null; testBase: number; test: number | null };

export async function computeRound(base: Release, updates: { n: number; tensors: Tensors }[]): Promise<RoundOutcome> {
  const { val, test } = await benchmark();
  const valBase = accuracy(logits(base.tensors, val.X, val.n), val.y);
  const testBase = accuracy(logits(base.tensors, test.X, test.n), test.y);
  const avg = fedAvg(updates);
  for (const a of STEPS) {
    const cand = stepToward(base.tensors, avg, a);
    const zv = logits(cand, val.X, val.n);
    const va = accuracy(zv, val.y);
    if (va < valBase - VAL_TOLERANCE) continue;
    const temperature = fitTemperature(zv, val.y);
    const tau = thresholdAt90(zv, val.y, temperature);
    const ta = accuracy(logits(cand, test.X, test.n), test.y);
    if (ta < testBase - TEST_TOLERANCE) {
      return {
        status: "refused",
        reason: `Held-out accuracy would fall from ${(testBase * 100).toFixed(1)}% to ${(ta * 100).toFixed(1)}%, so round ${base.round} stays in use.`,
        step: a, valBase, val: va, testBase, test: ta,
      };
    }
    return { status: "released", tensors: cand, step: a, temperature, tau, valBase, val: va, testBase, test: ta };
  }
  return {
    status: "refused",
    reason: `Every step toward this update lowered accuracy on the validation photos, so round ${base.round} stays in use.`,
    step: null, valBase, val: null, testBase, test: null,
  };
}

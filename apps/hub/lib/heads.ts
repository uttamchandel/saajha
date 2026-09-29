// The federated head, run in the browser: the same maths as fl/saajha_fl/task.py.
//   x -> L2-normalise -> Linear(1280,64) -> ReLU -> Linear(64,10) -> / temperature -> softmax
// Weights arrive as base64 little-endian float32; the sha256 is recomputed here exactly as
// the Python inspector computes it (for name in sorted(names): name bytes, then raw bytes).
import type { HeadFile } from "./contract";

export interface LoadedHead {
  file: HeadFile;
  tensors: Record<string, { shape: number[]; data: Float32Array; bytes: Uint8Array }>;
}

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function decodeFloat32(b64: string): Float32Array {
  const bytes = b64ToBytes(b64);
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const out = new Float32Array(bytes.byteLength / 4);
  for (let i = 0; i < out.length; i++) out[i] = view.getFloat32(i * 4, true);
  return out;
}

export function loadHead(file: HeadFile): LoadedHead {
  const tensors: LoadedHead["tensors"] = {};
  for (const t of file.tensors) {
    const bytes = b64ToBytes(t.b64);
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const data = new Float32Array(bytes.byteLength / 4);
    for (let i = 0; i < data.length; i++) data[i] = view.getFloat32(i * 4, true);
    tensors[t.name] = { shape: t.shape, data, bytes };
  }
  return { file, tensors };
}

const headCache = new Map<string, Promise<LoadedHead>>();

export function fetchHead(url: string): Promise<LoadedHead> {
  let p = headCache.get(url);
  if (!p) {
    p = fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`Could not load model weights (${r.status}) from ${url}`);
        return r.json() as Promise<HeadFile>;
      })
      .then(loadHead)
      .catch((e) => {
        headCache.delete(url); // let the next attempt retry instead of replaying the failure
        throw e;
      });
    headCache.set(url, p);
  }
  return p;
}

/** y = W x + b for W of shape [out, in]. */
function linear(W: Float32Array, b: Float32Array, x: Float32Array, out: number, inp: number): Float32Array {
  const y = new Float32Array(out);
  for (let o = 0; o < out; o++) {
    let s = b[o];
    const row = o * inp;
    for (let i = 0; i < inp; i++) s += W[row + i] * x[i];
    y[o] = s;
  }
  return y;
}

/** Class probabilities for one 1280-d embedding. */
export function runHead(head: LoadedHead, embedding: Float32Array): Float32Array {
  let norm = 0;
  for (let i = 0; i < embedding.length; i++) norm += embedding[i] * embedding[i];
  norm = Math.max(Math.sqrt(norm), 1e-12); // matches torch F.normalize eps
  let x: Float32Array = new Float32Array(embedding.length);
  for (let i = 0; i < embedding.length; i++) x[i] = embedding[i] / norm;

  const t = head.tensors;
  if (head.file.arch === "mlp1") {
    const W0 = t["net.0.weight"], b0 = t["net.0.bias"], W2 = t["net.2.weight"], b2 = t["net.2.bias"];
    const h = linear(W0.data, b0.data, x, W0.shape[0], W0.shape[1]);
    for (let i = 0; i < h.length; i++) h[i] = Math.max(0, h[i]);
    x = linear(W2.data, b2.data, h, W2.shape[0], W2.shape[1]);
  } else {
    const W = t["net.0.weight"], b = t["net.0.bias"];
    x = linear(W.data, b.data, x, W.shape[0], W.shape[1]);
  }
  const T = head.file.temperature || 1;
  let max = -Infinity;
  for (let i = 0; i < x.length; i++) max = Math.max(max, x[i] / T);
  let sum = 0;
  const p = new Float32Array(x.length);
  for (let i = 0; i < x.length; i++) {
    p[i] = Math.exp(x[i] / T - max);
    sum += p[i];
  }
  for (let i = 0; i < p.length; i++) p[i] /= sum;
  return p;
}

/** Recompute the head's sha256 in the browser, the way the border inspector computed it. */
export async function verifyHeadSha(head: LoadedHead): Promise<boolean> {
  const enc = new TextEncoder();
  const names = Object.keys(head.tensors).sort();
  const parts: Uint8Array[] = [];
  for (const n of names) {
    parts.push(enc.encode(n));
    parts.push(head.tensors[n].bytes);
  }
  const total = parts.reduce((a, p) => a + p.length, 0);
  const buf = new Uint8Array(total);
  let off = 0;
  for (const p of parts) {
    buf.set(p, off);
    off += p.length;
  }
  const digest = await crypto.subtle.digest("SHA-256", buf);
  const hex = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
  return hex === head.file.sha256;
}

export function topK(p: Float32Array, keys: readonly string[], k = 3): [string, number][] {
  return Array.from(p, (v, i) => [keys[i], v] as [string, number])
    .sort((a, b) => b[1] - a[1])
    .slice(0, k);
}

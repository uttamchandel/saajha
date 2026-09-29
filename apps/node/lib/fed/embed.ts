// Copied from apps/hub/lib/embed.ts — the node runs the hub's released model with the same code. Keep identical.
// The frozen MobileNetV3 backbone, run in the visitor's browser with onnxruntime-web.
// Same file, same preprocessing as fl/saajha_fl/backbone.py: squash-resize to 224x224 with
// a port of Pillow's bilinear resampler, RGB / 255, ImageNet mean/std, NCHW float32 -> 1280-d embedding. /dev/parity checks
// the result against the embeddings Python computed.
//
// onnxruntime-web is loaded from a pinned jsDelivr build with a <script> tag, not an npm
// import: Turbopack cannot bundle its import.meta.url worker loading.
import type { RunFile } from "./contract";

export const ORT_VERSION = "1.30.0";
const ORT_BASE = `https://cdn.jsdelivr.net/npm/onnxruntime-web@${ORT_VERSION}/dist/`;
const ORT_SCRIPT = `${ORT_BASE}ort.wasm.min.js`;

// The small slice of the onnxruntime-web API this file uses.
interface OrtTensor {
  data: Float32Array | ArrayLike<number>;
  dims: readonly number[];
}
interface OrtSession {
  run(feeds: Record<string, OrtTensor>): Promise<Record<string, OrtTensor>>;
}
interface OrtNamespace {
  env: { wasm: { wasmPaths?: string; numThreads?: number; proxy?: boolean } };
  Tensor: new (type: "float32", data: Float32Array, dims: number[]) => OrtTensor;
  InferenceSession: {
    create(model: Uint8Array, options?: Record<string, unknown>): Promise<OrtSession>;
  };
}

declare global {
  interface Window {
    ort?: OrtNamespace;
  }
}

export type LoadStage = "runtime" | "download" | "verify" | "session" | "ready";

export interface LoadProgress {
  stage: LoadStage;
  /** Bytes of the model file received so far. */
  loaded: number;
  /** Expected size of the model file (from run.json), if known. */
  total: number | null;
}

export interface Backbone {
  session: OrtSession;
  ort: OrtNamespace;
  cfg: RunFile["backbone"];
  /** true if the downloaded file matched run.backbone.onnx_sha256; null if there was no hash to check. */
  shaOk: boolean | null;
}

let ortPromise: Promise<OrtNamespace> | null = null;

function loadOrt(): Promise<OrtNamespace> {
  if (typeof window === "undefined") return Promise.reject(new Error("The model runs in the browser only."));
  if (window.ort) return Promise.resolve(window.ort);
  ortPromise ??= new Promise<OrtNamespace>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = ORT_SCRIPT;
    s.async = true;
    s.crossOrigin = "anonymous";
    s.onload = () => (window.ort ? resolve(window.ort) : reject(new Error("The model runtime loaded but did not start.")));
    s.onerror = () => reject(new Error("Could not load the model runtime from cdn.jsdelivr.net. Check your connection."));
    document.head.appendChild(s);
  }).then((ort) => {
    ort.env.wasm.wasmPaths = ORT_BASE;
    // No cross-origin isolation on this site, so no SharedArrayBuffer threads.
    ort.env.wasm.numThreads = 1;
    return ort;
  });
  ortPromise.catch(() => {
    ortPromise = null; // let a later click retry
  });
  return ortPromise;
}

// A stalled connection (no bytes for this long) aborts the download instead of hanging the page;
// the caller can then retry or hand the case to a person.
const STALL_MS = 20_000;

async function fetchWithProgress(url: string, total: number | null, onBytes: (n: number) => void): Promise<Uint8Array> {
  const ctrl = new AbortController();
  let timer = setTimeout(() => ctrl.abort(), STALL_MS);
  const alive = () => {
    clearTimeout(timer);
    timer = setTimeout(() => ctrl.abort(), STALL_MS);
  };
  try {
    const r = await fetch(url, { signal: ctrl.signal });
    if (!r.ok) throw new Error(`Could not download the model (${r.status}).`);
    alive();
    const headerLen = Number(r.headers.get("content-length"));
    // Content-Length is the compressed size when the server compresses; prefer run.json's byte count.
    const expected = total ?? (Number.isFinite(headerLen) && headerLen > 0 ? headerLen : null);
    if (!r.body) {
      const buf = new Uint8Array(await r.arrayBuffer());
      onBytes(buf.byteLength);
      return buf;
    }
    const reader = r.body.getReader();
    const chunks: Uint8Array[] = [];
    let received = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      alive();
      chunks.push(value);
      received += value.byteLength;
      onBytes(received);
    }
    if (expected && received < expected * 0.5) {
      // A truncated download would fail later with a confusing ONNX error.
      throw new Error("The model download was cut short. Reload to try again.");
    }
    const out = new Uint8Array(received);
    let off = 0;
    for (const c of chunks) {
      out.set(c, off);
      off += c.byteLength;
    }
    return out;
  } catch (e) {
    if (ctrl.signal.aborted) throw new Error("The model download stalled. Check the connection and try again.");
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

async function sha256Hex(bytes: Uint8Array): Promise<string | null> {
  if (typeof crypto === "undefined" || !crypto.subtle) return null; // non-secure context
  const digest = await crypto.subtle.digest("SHA-256", bytes as Uint8Array<ArrayBuffer>);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

let backbonePromise: Promise<Backbone> | null = null;
const listeners = new Set<(p: LoadProgress) => void>();
let lastProgress: LoadProgress | null = null;

function emit(p: LoadProgress) {
  lastProgress = p;
  for (const l of listeners) l(p);
}

/** Load (once per page) the runtime and the backbone. Progress goes to every caller's listener. */
export function loadBackbone(cfg: RunFile["backbone"], onProgress?: (p: LoadProgress) => void): Promise<Backbone> {
  if (onProgress) {
    listeners.add(onProgress);
    if (lastProgress) onProgress(lastProgress);
  }
  if (!backbonePromise) {
    const total = cfg.onnx_bytes ?? null;
    backbonePromise = (async () => {
      emit({ stage: "runtime", loaded: 0, total });
      const ortP = loadOrt();
      emit({ stage: "download", loaded: 0, total });
      const bytes = await fetchWithProgress(cfg.onnx_url, total, (n) => emit({ stage: "download", loaded: n, total }));
      emit({ stage: "verify", loaded: bytes.byteLength, total });
      const hex = cfg.onnx_sha256 ? await sha256Hex(bytes) : null;
      const shaOk = cfg.onnx_sha256 && hex ? hex === cfg.onnx_sha256 : null;
      if (shaOk === false) throw new Error("The downloaded model does not match its recorded fingerprint. Reload to try again.");
      const ort = await ortP;
      emit({ stage: "session", loaded: bytes.byteLength, total });
      const session = await ort.InferenceSession.create(bytes, {
        executionProviders: ["wasm"],
        graphOptimizationLevel: "all",
      });
      emit({ stage: "ready", loaded: bytes.byteLength, total });
      return { session, ort, cfg, shaOk };
    })();
    backbonePromise.catch(() => {
      backbonePromise = null;
      lastProgress = null;
    });
  }
  const p = backbonePromise;
  if (onProgress) p.finally(() => listeners.delete(onProgress)).catch(() => {});
  return p;
}

export type ImageSource = HTMLImageElement | ImageBitmap | HTMLCanvasElement;

function sourceSize(src: ImageSource): { w: number; h: number } {
  if (src instanceof HTMLImageElement) return { w: src.naturalWidth, h: src.naturalHeight };
  return { w: src.width, h: src.height };
}

/**
 * Full-resolution RGBA pixels of the source. Drawn 1:1, so the canvas does no resampling;
 * only a photo above ~16 MP (Safari's canvas limit) is first scaled down to fit.
 */
function readPixels(src: ImageSource): { data: Uint8ClampedArray; w: number; h: number } {
  const { w: sw, h: sh } = sourceSize(src);
  const MAX_PIXELS = 16_000_000;
  const s = sw * sh > MAX_PIXELS ? Math.sqrt(MAX_PIXELS / (sw * sh)) : 1;
  const w = Math.max(1, Math.floor(sw * s));
  const h = Math.max(1, Math.floor(sh * s));
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("This browser cannot read the photo's pixels.");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(src, 0, 0, sw, sh, 0, 0, w, h);
  return { data: ctx.getImageData(0, 0, w, h).data, w, h };
}

// Pillow's Image.resize(size, Image.BILINEAR) for 8-bit RGB, ported from libImaging/Resample.c
// so the browser feeds the backbone the pixels Python fed it during training. A canvas
// drawImage resize is close but not equal (measured on /dev/parity: cosine 0.970-0.991, and
// one own-data verdict flipped). Pillow: a triangle filter whose support widens with the
// downscale factor, 22-bit fixed-point weights, a horizontal pass, rounding to 8 bits, then
// a vertical pass.
const PRECISION_BITS = 22;
const HALF = 1 << (PRECISION_BITS - 1);
const ONE = 1 << PRECISION_BITS;

function bilinearCoeffs(inSize: number, outSize: number) {
  const scale = inSize / outSize;
  const filterscale = Math.max(scale, 1);
  const support = 1 * filterscale; // bilinear filter support is 1.0
  const ksize = Math.ceil(support) * 2 + 1;
  const bounds = new Int32Array(outSize * 2);
  const kk = new Int32Array(outSize * ksize);
  const pre = new Float64Array(ksize);
  const ss = 1 / filterscale;
  for (let xx = 0; xx < outSize; xx++) {
    const center = (xx + 0.5) * scale;
    const xmin = Math.max(0, Math.trunc(center - support + 0.5));
    const xmax = Math.min(inSize, Math.trunc(center + support + 0.5)) - xmin;
    let ww = 0;
    for (let x = 0; x < xmax; x++) {
      const t = Math.abs((x + xmin - center + 0.5) * ss);
      const w = t < 1 ? 1 - t : 0;
      pre[x] = w;
      ww += w;
    }
    for (let x = 0; x < xmax; x++) {
      const k = ww !== 0 ? pre[x] / ww : pre[x];
      kk[xx * ksize + x] = k < 0 ? Math.trunc(-0.5 + k * ONE) : Math.trunc(0.5 + k * ONE);
    }
    bounds[xx * 2] = xmin;
    bounds[xx * 2 + 1] = xmax;
  }
  return { bounds, kk, ksize };
}

const clip8 = (v: number) => {
  const q = Math.floor(v / ONE);
  return q < 0 ? 0 : q > 255 ? 255 : q;
};

/** RGBA (sw x sh) -> RGB (dw x dh), bit-exact with Pillow's BILINEAR resize. */
export function resizeBilinearPil(rgba: Uint8ClampedArray, sw: number, sh: number, dw: number, dh: number): Uint8Array {
  const H = bilinearCoeffs(sw, dw);
  const tmp = new Uint8Array(dw * sh * 3);
  for (let y = 0; y < sh; y++) {
    const row = y * sw * 4;
    for (let xx = 0; xx < dw; xx++) {
      const xmin = H.bounds[xx * 2], xmax = H.bounds[xx * 2 + 1], k0 = xx * H.ksize;
      let r = HALF, g = HALF, b = HALF;
      for (let x = 0; x < xmax; x++) {
        const k = H.kk[k0 + x], p = row + (x + xmin) * 4;
        r += rgba[p] * k;
        g += rgba[p + 1] * k;
        b += rgba[p + 2] * k;
      }
      const o = (y * dw + xx) * 3;
      tmp[o] = clip8(r);
      tmp[o + 1] = clip8(g);
      tmp[o + 2] = clip8(b);
    }
  }
  const V = bilinearCoeffs(sh, dh);
  const out = new Uint8Array(dw * dh * 3);
  for (let yy = 0; yy < dh; yy++) {
    const ymin = V.bounds[yy * 2], ymax = V.bounds[yy * 2 + 1], k0 = yy * V.ksize;
    for (let xx = 0; xx < dw; xx++) {
      let r = HALF, g = HALF, b = HALF;
      for (let y = 0; y < ymax; y++) {
        const k = V.kk[k0 + y], p = ((y + ymin) * dw + xx) * 3;
        r += tmp[p] * k;
        g += tmp[p + 1] * k;
        b += tmp[p + 2] * k;
      }
      const o = (yy * dw + xx) * 3;
      out[o] = clip8(r);
      out[o + 1] = clip8(g);
      out[o + 2] = clip8(b);
    }
  }
  return out;
}

/** Squash-resize (no crop) and normalise to NCHW float32, exactly as backbone.preprocess() does. */
export function preprocess(src: ImageSource, cfg: RunFile["backbone"]["input"]): Float32Array {
  const { w, h, mean, std } = cfg;
  const px = readPixels(src);
  const rgb = resizeBilinearPil(px.data, px.w, px.h, w, h);
  const plane = w * h;
  const out = new Float32Array(3 * plane);
  for (let i = 0; i < plane; i++) {
    for (let ch = 0; ch < 3; ch++) {
      // float32 maths in the same order as numpy: (x / 255 - mean) / std
      out[ch * plane + i] = (Math.fround(rgb[i * 3 + ch] / 255) - Math.fround(mean[ch])) / Math.fround(std[ch]);
    }
  }
  return out;
}

/** Run the backbone on an image: returns the 1280-d embedding. */
export async function embedImage(bb: Backbone, src: ImageSource): Promise<Float32Array> {
  const cfg = bb.cfg.input;
  const data = preprocess(src, cfg);
  const input = new bb.ort.Tensor("float32", data, [1, 3, cfg.h, cfg.w]);
  const out = await bb.session.run({ [cfg.input_name]: input });
  const emb = out[cfg.output_name];
  if (!emb) throw new Error(`The model did not return "${cfg.output_name}".`);
  return Float32Array.from(emb.data as ArrayLike<number>);
}

/** Decode an image URL or Blob into a bitmap (EXIF orientation applied by the browser). */
export async function decodeImage(src: string | Blob): Promise<ImageBitmap> {
  const blob = typeof src === "string" ? await fetch(src).then((r) => {
    if (!r.ok) throw new Error(`Could not load the photo (${r.status}).`);
    return r.blob();
  }) : src;
  try {
    // No colour-profile conversion: PIL reads the raw decoded pixels, so the browser must too.
    return await createImageBitmap(blob, { colorSpaceConversion: "none", premultiplyAlpha: "none" });
  } catch {
    throw new Error("Your browser could not read this photo. Try a JPEG or PNG (HEIC photos from some phones do not open in every browser).");
  }
}

/** A JPEG copy for Gemini: longest side at most maxSide px. Returns raw base64 (no data: prefix). */
export async function toJpegBase64(src: ImageSource, maxSide = 1024, quality = 0.85): Promise<{ b64: string; w: number; h: number; bytes: number }> {
  const { w: sw, h: sh } = sourceSize(src);
  const scale = Math.min(1, maxSide / Math.max(sw, sh));
  const w = Math.max(1, Math.round(sw * scale));
  const h = Math.max(1, Math.round(sh * scale));
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("This browser cannot prepare the photo.");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.fillStyle = "#fff"; // flatten transparent PNGs
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(src, 0, 0, sw, sh, 0, 0, w, h);
  const blob = await new Promise<Blob>((resolve, reject) =>
    c.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not encode the photo."))), "image/jpeg", quality),
  );
  const buf = new Uint8Array(await blob.arrayBuffer());
  let bin = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < buf.length; i += CHUNK) bin += String.fromCharCode(...buf.subarray(i, i + CHUNK));
  return { b64: btoa(bin), w, h, bytes: buf.byteLength };
}

export function cosine(a: Float32Array, b: Float32Array): number {
  let dot = 0, na = 0, nb = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / Math.max(Math.sqrt(na) * Math.sqrt(nb), 1e-12);
}

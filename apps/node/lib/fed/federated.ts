"use client";

// The shared paddy model, as released by the Saajha hub, run in this page (browser).
// Same flow as apps/hub/components/diagnose/DiagnoseApp.tsx: fetch run.json, the latest national
// head and the frozen backbone from the hub, check each against the sha256 the aggregator recorded,
// then classify the photo locally. Only the model crosses from the hub; the photo stays here.
import { CLASS_KEYS, type ClassKey } from "./classes";
import type { RunFile } from "./contract";
import { decodeImage, embedImage, loadBackbone, toJpegBase64, type LoadProgress } from "./embed";
import { fetchHead, runHead, topK, verifyHeadSha, type LoadedHead } from "./heads";

export const HUB_URL = (process.env.NEXT_PUBLIC_HUB_URL ?? "https://saajha-hub.vercel.app").replace(/\/+$/, "");

// run.json stores hub-relative URLs; a state node needs them absolute.
const abs = (u: string) => (/^https?:\/\//.test(u) ? u : `${HUB_URL}${u.startsWith("/") ? "" : "/"}${u}`);

export interface Release {
  run: RunFile;
  head: LoadedHead;
  round: number;
  sha256: string;
  tauFed: number;
}

let releaseP: Promise<Release> | null = null;
let releaseAt = 0;

type Latest = { round: number; sha256: string; tau: number; head_url: string };

/**
 * The hub's current national model, fingerprint-checked: the newest live round (the learning loop,
 * /api/rounds/latest) or the recorded run's last round. Re-checked every minute, so a round released
 * while this page is open reaches the next photo.
 */
export function loadRelease(): Promise<Release> {
  if (releaseP && Date.now() - releaseAt > 60_000) releaseP = null;
  releaseP ??= (async () => {
    const r = await fetch(`${HUB_URL}/fl/run.json`, { cache: "no-store" });
    if (!r.ok) throw new Error(`Could not reach the Saajha hub for the shared model (${r.status}).`);
    const run = (await r.json()) as RunFile;
    run.backbone = { ...run.backbone, onnx_url: abs(run.backbone.onnx_url) };
    const last = run.rounds[run.rounds.length - 1];
    let latest: Latest = { round: last.round, sha256: last.weights_sha256, tau: run.gate.tau_fed, head_url: last.head_url };
    try {
      const l = await fetch(`${HUB_URL}/api/rounds/latest`, { cache: "no-store" });
      if (l.ok) latest = (await l.json()) as Latest;
    } catch {
      // The registry is unreachable: the recorded release still works.
    }
    const head = await fetchHead(abs(latest.head_url));
    if (!(await verifyHeadSha(head)) || head.file.sha256 !== latest.sha256) {
      throw new Error("The model the hub released does not match its recorded fingerprint, so it was not used.");
    }
    return { run, head, round: latest.round, sha256: latest.sha256, tauFed: latest.tau };
  })();
  releaseAt = Date.now();
  releaseP.catch(() => {
    releaseP = null; // let the next photo retry
  });
  return releaseP;
}

function f32ToB64(v: Float32Array): string {
  const bytes = new Uint8Array(v.length * 4);
  const view = new DataView(bytes.buffer);
  for (let i = 0; i < v.length; i++) view.setFloat32(i * 4, v[i], true);
  let s = "";
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return btoa(s);
}

export interface FedResult {
  top: ClassKey;
  /** Calibrated probability of `top`, 0-1. */
  p: number;
  top3: [ClassKey, number][];
  round: number;
  sha256: string;
  tauFed: number;
  ms: number;
  /** The frozen backbone's reading of the photo (1280 float32, base64): kept in this state with any ticket,
   *  so an expert's verified label can train the next round. */
  embedding: string;
}

export interface PhotoAnalysis {
  /** null when the model could not run here (see fedError); the server then sends the case to an expert. */
  fed: FedResult | null;
  fedError: string | null;
  /** JPEG copy (longest side 1024 px) for Gemini's paddy check and second opinion. */
  jpegB64: string;
}

/** Decode once, then run the shared model and prepare Gemini's copy of the photo. */
export async function analysePhoto(src: Blob | string, onProgress?: (p: LoadProgress) => void): Promise<PhotoAnalysis> {
  const bmp = await decodeImage(src);
  const jpeg = await toJpegBase64(bmp);
  try {
    // Mobile networks drop connections; a failed download is retried once before giving up.
    let rel: Release;
    let bb: Awaited<ReturnType<typeof loadBackbone>>;
    try {
      rel = await loadRelease();
      bb = await loadBackbone(rel.run.backbone, onProgress);
    } catch {
      rel = await loadRelease();
      bb = await loadBackbone(rel.run.backbone, onProgress);
    }
    const t0 = performance.now();
    const vec = await embedImage(bb, bmp);
    const top3 = topK(runHead(rel.head, vec), CLASS_KEYS, 3) as [ClassKey, number][];
    return {
      fed: { top: top3[0][0], p: top3[0][1], top3, round: rel.round, sha256: rel.sha256, tauFed: rel.tauFed, ms: Math.round(performance.now() - t0), embedding: f32ToB64(vec) },
      fedError: null,
      jpegB64: jpeg.b64,
    };
  } catch (e) {
    return { fed: null, fedError: e instanceof Error ? e.message : String(e), jpegB64: jpeg.b64 };
  }
}

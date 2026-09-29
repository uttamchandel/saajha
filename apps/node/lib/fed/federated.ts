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

/** The hub's latest national model: run.json + last round's head, fingerprint-checked. */
export function loadRelease(): Promise<Release> {
  releaseP ??= (async () => {
    const r = await fetch(`${HUB_URL}/fl/run.json`, { cache: "no-store" });
    if (!r.ok) throw new Error(`Could not reach the Saajha hub for the shared model (${r.status}).`);
    const run = (await r.json()) as RunFile;
    run.backbone = { ...run.backbone, onnx_url: abs(run.backbone.onnx_url) };
    const last = run.rounds[run.rounds.length - 1];
    const head = await fetchHead(abs(last.head_url));
    if (!(await verifyHeadSha(head)) || head.file.sha256 !== last.weights_sha256) {
      throw new Error("The model the hub released does not match its recorded fingerprint, so it was not used.");
    }
    return { run, head, round: last.round, sha256: last.weights_sha256, tauFed: run.gate.tau_fed };
  })();
  releaseP.catch(() => {
    releaseP = null; // let the next photo retry
  });
  return releaseP;
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
      fed: { top: top3[0][0], p: top3[0][1], top3, round: rel.round, sha256: rel.sha256, tauFed: rel.tauFed, ms: Math.round(performance.now() - t0) },
      fedError: null,
      jpegB64: jpeg.b64,
    };
  } catch (e) {
    return { fed: null, fedError: e instanceof Error ? e.message : String(e), jpegB64: jpeg.b64 };
  }
}

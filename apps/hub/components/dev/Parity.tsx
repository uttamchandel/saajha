"use client";

// Browser vs Python parity for the whole inference path:
//   gallery JPEG -> canvas squash-resize -> ONNX backbone (onnxruntime-web) -> 1280-d features
// compared with the features Python computed (cosine), then both heads run in JS on those
// features and their top-1 compared with the Python top-k recorded in gallery.json.
import { useState } from "react";
import { CLASS_KEYS, classLabel, type ClassKey } from "@/lib/classes";
import type { GalleryItem, RunFile } from "@/lib/contract";
import { ORT_VERSION, cosine, decodeImage, embedImage, loadBackbone, type Backbone, type LoadProgress } from "@/lib/embed";
import { fetchGallery, fetchRun } from "@/lib/fl";
import { decodeFloat32, fetchHead, runHead, topK, verifyHeadSha } from "@/lib/heads";

const COS_MIN = 0.99;

type HeadCheck = {
  key: string;
  python: [ClassKey, number];
  jsLive: [ClassKey, number];
  jsCached: [ClassKey, number];
  /** Largest |p_js(cached features) - p_python| over Python's recorded top-k. */
  maxProbDiff: number;
};

type Row = {
  id: string;
  trueKey: ClassKey;
  cos: number;
  ms: number;
  heads: HeadCheck[];
  pass: boolean;
};

type Summary = {
  rows: Row[];
  shaModel: boolean | null;
  shaHeads: Record<string, boolean>;
  pass: boolean;
  finishedAt: string;
};

function headUrl(run: RunFile, key: string): string | null {
  const local = /^local_([A-D])$/.exec(key);
  if (local) return run.local_models[local[1] as keyof RunFile["local_models"]]?.head_url ?? null;
  const g = /^global_r(\d+)$/.exec(key);
  if (g) return run.rounds.find((r) => r.round === Number(g[1]))?.head_url ?? null;
  return null;
}

async function checkItem(run: RunFile, bb: Backbone, item: GalleryItem, shaHeads: Record<string, boolean>): Promise<Row> {
  const bmp = await decodeImage(item.image_url);
  const t0 = performance.now();
  const live = await embedImage(bb, bmp);
  const ms = Math.round(performance.now() - t0);
  bmp.close();
  const cached = decodeFloat32(item.embedding_b64);
  const cos = cosine(live, cached);

  const heads: HeadCheck[] = [];
  for (const [key, pyTop] of Object.entries(item.python_topk)) {
    const url = headUrl(run, key);
    if (!url) continue;
    const head = await fetchHead(url);
    if (!(key in shaHeads)) shaHeads[key] = await verifyHeadSha(head);
    const pLive = runHead(head, live);
    const pCached = runHead(head, cached);
    const jsLive = topK(pLive, CLASS_KEYS, 1)[0] as [ClassKey, number];
    const jsCached = topK(pCached, CLASS_KEYS, 1)[0] as [ClassKey, number];
    const maxProbDiff = Math.max(
      ...pyTop.map(([k, p]) => Math.abs(pCached[CLASS_KEYS.indexOf(k)] - p)),
    );
    heads.push({ key, python: pyTop[0], jsLive, jsCached, maxProbDiff });
  }
  const pass = cos >= COS_MIN && heads.every((h) => h.jsLive[0] === h.python[0] && h.jsCached[0] === h.python[0]);
  return { id: item.id, trueKey: item.true_key, cos, ms, heads, pass };
}

export default function Parity() {
  const [progress, setProgress] = useState<LoadProgress | null>(null);
  const [status, setStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);

  const start = async () => {
    setStatus("running");
    setError(null);
    setRows([]);
    setSummary(null);
    try {
      const [run, gallery] = await Promise.all([fetchRun(), fetchGallery()]);
      const bb = await loadBackbone(run.backbone, setProgress);
      const shaHeads: Record<string, boolean> = {};
      const done: Row[] = [];
      for (const item of gallery) {
        const row = await checkItem(run, bb, item, shaHeads);
        done.push(row);
        setRows([...done]);
      }
      const s: Summary = {
        rows: done,
        shaModel: bb.shaOk,
        shaHeads,
        pass: done.length > 0 && done.every((r) => r.pass) && Object.values(shaHeads).every(Boolean) && bb.shaOk !== false,
        finishedAt: new Date().toISOString(),
      };
      setSummary(s);
      setStatus("done");
      (window as unknown as { __saajhaParity?: Summary }).__saajhaParity = s;
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setStatus("error");
    }
  };

  return (
    <div className="mt-8">
      <div className="flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={start}
          disabled={status === "running"}
          className="rounded-md bg-ink px-5 py-3 text-base font-semibold text-white hover:bg-[#2a3888] disabled:cursor-wait disabled:opacity-70"
        >
          {status === "running" ? "Running the check" : status === "idle" ? "Run the parity check" : "Run it again"}
        </button>
        {summary && (
          <p className={`display text-3xl ${summary.pass ? "text-shoot" : "text-blight"}`} data-testid="parity-verdict">
            {summary.pass ? "PASS" : "FAIL"}
          </p>
        )}
      </div>
      <p className="mt-3 text-sm text-muted">
        onnxruntime-web {ORT_VERSION} (WebAssembly, 1 thread). Pass rule: cosine ≥ {COS_MIN} between browser and Python
        features for every photo, and the browser&apos;s top-1 equals Python&apos;s for every head.
      </p>

      {status === "running" && progress && progress.stage !== "ready" && (
        <p className="mt-4 text-[15px]" role="status">
          {progress.stage === "download"
            ? `Downloading the model: ${(progress.loaded / 1e6).toFixed(1)}${progress.total ? ` of ${(progress.total / 1e6).toFixed(1)}` : ""} MB`
            : `Model: ${progress.stage}`}
        </p>
      )}
      {error && <p className="mt-4 border-l-[3px] border-ink pl-3 font-semibold">Error: {error}</p>}

      {rows.length > 0 && (
        <div className="mt-6 relative overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-left text-[15px]">
            <caption className="sr-only">Parity per gallery photo</caption>
            <thead>
              <tr className="border-b border-ink text-sm text-muted">
                <th scope="col" className="py-2 pr-4 font-normal">Photo</th>
                <th scope="col" className="py-2 pr-4 font-normal">Expert label</th>
                <th scope="col" className="py-2 pr-4 font-normal">Cosine</th>
                <th scope="col" className="py-2 pr-4 font-normal">Backbone time</th>
                <th scope="col" className="py-2 pr-4 font-normal">Head: Python top-1 / browser top-1 (live features) / max prob diff</th>
                <th scope="col" className="py-2 font-normal">Result</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-rule align-top">
                  <td className="py-2 pr-4 font-semibold">{r.id}</td>
                  <td className="py-2 pr-4">{classLabel(r.trueKey)}</td>
                  <td className={`condensed py-2 pr-4 font-semibold ${r.cos >= COS_MIN ? "text-shoot" : "text-blight"}`}>
                    {r.cos.toFixed(6)}
                  </td>
                  <td className="py-2 pr-4">{r.ms} ms</td>
                  <td className="py-2 pr-4">
                    <ul className="space-y-1">
                      {r.heads.map((h) => (
                        <li key={h.key}>
                          <span className="text-muted">{h.key}:</span> {classLabel(h.python[0])} {(h.python[1] * 100).toFixed(1)}% /{" "}
                          <span className={h.jsLive[0] === h.python[0] ? "text-shoot" : "text-blight"}>
                            {classLabel(h.jsLive[0])} {(h.jsLive[1] * 100).toFixed(1)}%
                          </span>{" "}
                          / {h.maxProbDiff.toFixed(4)}
                        </li>
                      ))}
                    </ul>
                  </td>
                  <td className={`py-2 font-semibold ${r.pass ? "text-shoot" : "text-blight"}`}>{r.pass ? "Pass" : "Fail"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {summary && (
        <p className="mt-4 text-sm text-muted">
          Model file fingerprint:{" "}
          {summary.shaModel == null ? "not checked (no secure context)" : summary.shaModel ? "matches run.json" : "DOES NOT MATCH"}. Head
          fingerprints:{" "}
          {Object.entries(summary.shaHeads)
            .map(([k, ok]) => `${k} ${ok ? "matches" : "DOES NOT MATCH"}`)
            .join(", ")}
          . Finished {summary.finishedAt}.
        </p>
      )}
    </div>
  );
}

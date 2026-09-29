"use client";

// Does this state node run the hub's model exactly as Python did? Adapted from the hub's /dev/parity
// (apps/hub/components/dev/Parity.tsx): for each attributed gallery photo, the node downloads the photo
// and the released model from the hub, computes the image features in this browser, and compares them
// (cosine) and the national head's answer with what Python recorded in gallery.json.
import { useState } from "react";
import { CLASS_KEYS, classLabel, type ClassKey } from "@/lib/fed/classes";
import type { GalleryItem } from "@/lib/fed/contract";
import { ORT_VERSION, cosine, decodeImage, embedImage, loadBackbone, type LoadProgress } from "@/lib/fed/embed";
import { HUB_URL, loadRelease } from "@/lib/fed/federated";
import { decodeFloat32, runHead, topK } from "@/lib/fed/heads";

const COS_MIN = 0.99;

type Row = {
  id: string;
  trueKey: ClassKey;
  cos: number;
  ms: number;
  python: [ClassKey, number];
  node: [ClassKey, number];
  maxProbDiff: number;
  pass: boolean;
};

export default function ModelCheck() {
  const [status, setStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const [progress, setProgress] = useState<LoadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [release, setRelease] = useState<{ round: number; sha256: string } | null>(null);
  const [pass, setPass] = useState<boolean | null>(null);

  const start = async () => {
    setStatus("running");
    setError(null);
    setRows([]);
    setPass(null);
    try {
      const rel = await loadRelease();
      setRelease({ round: rel.round, sha256: rel.sha256 });
      const key = `global_r${rel.round}`;
      const bb = await loadBackbone(rel.run.backbone, setProgress);
      const gallery = (await fetch(`${HUB_URL}/fl/gallery.json`).then((r) => {
        if (!r.ok) throw new Error(`Could not load the hub's gallery (${r.status}).`);
        return r.json();
      })) as GalleryItem[];
      const done: Row[] = [];
      for (const item of gallery) {
        const pyTop = item.python_topk[key];
        if (!pyTop) continue;
        const bmp = await decodeImage(`${HUB_URL}${item.image_url}`);
        const t0 = performance.now();
        const live = await embedImage(bb, bmp);
        const ms = Math.round(performance.now() - t0);
        bmp.close();
        const cos = cosine(live, decodeFloat32(item.embedding_b64));
        const p = runHead(rel.head, live);
        const node = topK(p, CLASS_KEYS, 1)[0] as [ClassKey, number];
        const maxProbDiff = Math.max(...pyTop.map(([k, pk]) => Math.abs(p[CLASS_KEYS.indexOf(k)] - pk)));
        done.push({ id: item.id, trueKey: item.true_key, cos, ms, python: pyTop[0], node, maxProbDiff, pass: cos >= COS_MIN && node[0] === pyTop[0][0] });
        setRows([...done]);
      }
      const ok = done.length > 0 && done.every((r) => r.pass) && bb.shaOk !== false;
      setPass(ok);
      setStatus("done");
      (window as unknown as { __saajhaNodeCheck?: unknown }).__saajhaNodeCheck = { pass: ok, round: rel.round, rows: done };
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
          className="rounded-xl bg-forest px-5 py-3 font-semibold text-paper hover:bg-leaf disabled:cursor-wait disabled:opacity-70"
        >
          {status === "running" ? "Running the check" : status === "idle" ? "Run the model check" : "Run it again"}
        </button>
        {pass !== null && (
          <p className={`font-display text-3xl font-semibold ${pass ? "text-forest" : "text-clay"}`} data-testid="model-check-verdict">
            {pass ? "PASS" : "FAIL"}
          </p>
        )}
      </div>
      <p className="mt-3 text-sm text-ink-soft">
        onnxruntime-web {ORT_VERSION} in this browser. Pass rule: cosine ≥ {COS_MIN} between this node&rsquo;s image features and
        Python&rsquo;s for every photo, and the same top answer from the national head.
        {release && ` Model: national round ${release.round}, fingerprint ${release.sha256.slice(0, 12)}… (matches the hub's record).`}
      </p>
      {status === "running" && progress && progress.stage !== "ready" && (
        <p className="mt-4" role="status">
          {progress.stage === "download"
            ? `Downloading the model from the hub: ${(progress.loaded / 1e6).toFixed(1)}${progress.total ? ` of ${(progress.total / 1e6).toFixed(1)}` : ""} MB`
            : `Model: ${progress.stage}`}
        </p>
      )}
      {error && <p className="mt-4 border-l-4 border-clay pl-3 font-semibold text-clay">Error: {error}</p>}
      {rows.length > 0 && (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <caption className="sr-only">Model check per gallery photo</caption>
            <thead>
              <tr className="border-b border-forest/30 text-ink-soft">
                <th scope="col" className="py-2 pr-4 font-normal">Photo</th>
                <th scope="col" className="py-2 pr-4 font-normal">Dataset label</th>
                <th scope="col" className="py-2 pr-4 font-normal">Cosine vs Python</th>
                <th scope="col" className="py-2 pr-4 font-normal">Python / this node</th>
                <th scope="col" className="py-2 pr-4 font-normal">Max prob diff</th>
                <th scope="col" className="py-2 font-normal">Result</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-forest/10 align-top">
                  <td className="py-2 pr-4 font-semibold">{r.id}</td>
                  <td className="py-2 pr-4">{classLabel(r.trueKey)}</td>
                  <td className={`py-2 pr-4 font-semibold ${r.cos >= COS_MIN ? "text-forest" : "text-clay"}`}>{r.cos.toFixed(6)}</td>
                  <td className="py-2 pr-4">
                    {classLabel(r.python[0])} {(r.python[1] * 100).toFixed(1)}% /{" "}
                    <span className={r.node[0] === r.python[0] ? "text-forest" : "text-clay"}>
                      {classLabel(r.node[0])} {(r.node[1] * 100).toFixed(1)}%
                    </span>
                  </td>
                  <td className="py-2 pr-4">{r.maxProbDiff.toFixed(4)}</td>
                  <td className={`py-2 font-semibold ${r.pass ? "text-forest" : "text-clay"}`}>{r.pass ? "Pass" : "Fail"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

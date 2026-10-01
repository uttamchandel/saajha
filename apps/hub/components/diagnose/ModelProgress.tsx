"use client";

// Progress of the one-time download of the shared image model, with real byte counts.
import type { LoadProgress } from "@/lib/embed";
import { card } from "@/lib/ui";

const mb = (n: number) => (n / 1_000_000).toFixed(1);

const STAGE_TEXT: Record<LoadProgress["stage"], string> = {
  runtime: "Starting the model runtime",
  download: "Downloading the shared image model",
  verify: "Checking the model's fingerprint",
  session: "Preparing the model",
  ready: "Model ready",
};

export default function ModelProgress({ progress }: { progress: LoadProgress | null }) {
  const p = progress ?? { stage: "runtime" as const, loaded: 0, total: null };
  const showBytes = p.stage === "download" && p.loaded > 0;
  return (
    <div className={`${card} p-4`} role="status" aria-live="polite">
      <p className="text-[15px]">
        {STAGE_TEXT[p.stage]}
        {showBytes && (
          <>
            : <span className="condensed font-semibold">{mb(p.loaded)} MB</span>
            {p.total ? <> of {mb(p.total)} MB</> : null}
          </>
        )}
      </p>
      <progress
        className="mt-2 h-2 w-full appearance-none overflow-hidden rounded-full bg-forest/10 accent-[var(--forest)] [&::-webkit-progress-bar]:bg-transparent [&::-webkit-progress-value]:rounded-full [&::-webkit-progress-value]:bg-forest [&::-moz-progress-bar]:rounded-full [&::-moz-progress-bar]:bg-forest"
        max={p.total ?? undefined}
        value={p.total ? Math.min(p.loaded, p.total) : undefined}
        aria-label="Model download progress"
      />
      <p className="mt-2 text-sm text-muted">
        MobileNetV3, the same frozen feature extractor every state runs. Downloaded once, then it runs in this browser.
      </p>
    </div>
  );
}

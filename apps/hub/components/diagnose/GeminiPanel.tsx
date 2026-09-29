"use client";

// Step 3: Gemini's second opinion on the same photo (it also checks the photo is paddy). Shown exactly as the API returned it;
// when the API is unavailable the panel says so and the gate falls back to the federated model.
import type { DiagnoseResponse } from "@/app/api/diagnose/route";
import { classLabel } from "@/lib/classes";
import { savedOn } from "@/lib/pregen";

export type GeminiState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ok"; data: DiagnoseResponse; savedAt?: string }
  | { status: "error"; error: string; retryable: boolean };

export default function GeminiPanel({
  state,
  onRetry,
}: {
  state: GeminiState;
  onRetry: () => void;
}) {
  return (
    <section aria-labelledby="gemini-h" className="rounded-md border border-rule bg-sheet p-5 sm:p-6" aria-live="polite">
      <h2 id="gemini-h" className="text-lg font-semibold">
        Gemini&apos;s second opinion
      </h2>
      {state.status === "idle" && <p className="mt-2 text-muted">Waiting for a photo.</p>}
      {state.status === "loading" && (
        <p className="mt-2 text-muted">
          <span className="mr-2 inline-block size-2.5 animate-pulse rounded-full bg-carbon align-middle" aria-hidden="true" />
          Asking Gemini to look at the photo. This usually takes a few seconds.
        </p>
      )}
      {state.status === "error" && (
        <div className="mt-2">
          <p>
            Gemini is unavailable right now ({state.error.replace(/\.$/, "")}). The federated model&apos;s result above is
            still valid.
          </p>
          {state.retryable && (
            <button
              type="button"
              onClick={onRetry}
              className="mt-3 inline-flex items-center rounded-md border border-ink bg-sheet px-3 py-1.5 text-sm font-semibold text-ink hover:bg-carbon-wash"
            >
              Ask Gemini again
            </button>
          )}
        </div>
      )}
      {state.status === "ok" && <GeminiResult data={state.data} />}
      {state.status === "ok" && state.savedAt && (
        <p className="mt-3 text-sm text-muted">
          Gemini gave this answer on {savedOn(state.savedAt)}; it is saved for this test photo so the page works when
          Gemini is busy.{" "}
          <button type="button" onClick={onRetry} className="text-carbon underline underline-offset-4">
            Ask Gemini again, live
          </button>
        </p>
      )}
    </section>
  );
}

function GeminiResult({ data }: { data: DiagnoseResponse }) {
  if (!data.is_plant || !data.is_rice) {
    return (
      <p className="mt-2">
        {data.is_plant ? "Gemini sees a plant, but not paddy." : "Gemini does not see a plant in this photo."}{" "}
        <span className="text-muted">Model: {data.model}</span>
      </p>
    );
  }
  return (
    <div className="mt-3">
      <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="display text-[clamp(1.4rem,3vw,1.9rem)]">{classLabel(data.class_key)}</span>
        <span className="condensed text-2xl font-semibold">{data.confidence}%</span>
        <span className="text-sm text-muted">Gemini&apos;s own confidence</span>
      </p>
      {data.alternatives.length > 0 && (
        <p className="mt-2 text-[15px] text-muted">
          Also considered:{" "}
          {data.alternatives.map((a, i) => (
            <span key={a.class_key}>
              {i > 0 && ", "}
              {classLabel(a.class_key).toLowerCase()} ({a.confidence}%)
            </span>
          ))}
        </p>
      )}
      {data.visible_symptoms.length > 0 && (
        <>
          <h3 className="mt-4 text-sm text-muted">What Gemini says it can see</h3>
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-[15px]">
            {data.visible_symptoms.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </>
      )}
      <p className="mt-4 text-sm text-muted">Model: {data.model}</p>
    </div>
  );
}

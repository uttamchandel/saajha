"use client";

// The transit slip: what crossed the state border in a federation round, in the form of
// the paperwork India already uses for things crossing state borders. Every figure is the
// border inspector's measurement for that round, read from run.json.
import type { RoundEntry, RunFile } from "@/lib/contract";
import { bytesLabel, grouped } from "@/lib/fl";
import { slip } from "@/lib/ui";

export default function TransitSlip({ run, round, landed }: { run: RunFile; round?: RoundEntry; landed: number }) {
  const states = run.states.map((s) => s.id);
  const perState = round ? Object.values(round.update_bytes)[0] ?? run.head.bytes_fp32 : run.head.bytes_fp32;
  return (
    <section aria-labelledby="slip-h" className={`${slip} relative mt-6 overflow-hidden p-5 sm:p-6`}>
      <h2 id="slip-h" className="text-lg font-semibold">
        {round ? `Transit slip for round ${round.round}` : "Transit slip"}
      </h2>
      <p className="text-sm text-muted">
        From States {states.join(", ")} to the national aggregator, and back. Checked by the border inspector.
      </p>
      <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-[15px]">
        <dt>Model weights sent</dt>
        <dd>
          <span className="rounded-md bg-straw-wash px-1.5 font-semibold ring-1 ring-turmeric-soft/60">
            {states.length} × {bytesLabel(perState)}
          </span>{" "}
          <span className="text-sm text-muted">({grouped(perState)} bytes each)</span>
        </dd>
        <dt>Farmer records sent</dt>
        <dd className="font-semibold">{grouped(round ? round.raw_rows_transmitted : 0)}</dd>
        <dt>Photos sent</dt>
        <dd className="font-semibold">0</dd>
        <dt>Weights fingerprint</dt>
        <dd className={`text-muted ${round ? "break-all font-mono text-[13px]" : ""}`}>
          {round ? `${round.weights_sha256.slice(0, 16)}…` : "issued when a round runs"}
        </dd>
      </dl>
      {landed > 0 && (
        <p
          key={landed}
          aria-hidden="true"
          className="stamp pointer-events-none absolute right-4 top-4 rounded-xl border-[3px] border-forest px-3 py-1 text-lg font-bold text-forest sm:right-8 sm:top-6"
        >
          Weights only
        </p>
      )}
    </section>
  );
}

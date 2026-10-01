// Section 1: the run in one paragraph, and the ledger of what crossed a state border.
import type { RunFile } from "@/lib/contract";
import { bytesLabel, grouped } from "@/lib/fl";
import { card, figure, lede } from "@/lib/ui";
import { andList, capitalize, countWord, trainingRounds, updateBytesSummary } from "./shared";

const PAYLOAD_MEANING: Record<string, string> = {
  ArrayRecord: "the model weights",
  MetricRecord: "each state's training-example count and training loss",
};

export default function Summary({ run }: { run: RunFile }) {
  const nStates = run.states.length;
  const rounds = trainingRounds(run);
  const { min, max } = updateBytesSummary(run);
  const perState = min === max ? `${grouped(min)} bytes` : `between ${grouped(min)} and ${grouped(max)} bytes`;
  const roundsWithRecords = rounds.filter((r) => r.raw_rows_transmitted > 0).length;
  const payloads = Array.from(new Set(rounds.flatMap((r) => r.payload_types)));
  const recordsMoved = run.totals.records_moved;

  return (
    <div>
      <p className={`${lede} mt-5 max-w-[62ch]`}>
        {capitalize(countWord(nStates))} state nodes trained together for {rounds.length} rounds. Each round, each state
        sent {perState} of model weights to the national aggregator and received the averaged model back. Farmer records
        sent: <strong className="font-semibold text-ink">{grouped(recordsMoved)}</strong>.
      </p>

      <dl className={`${card} mt-8 grid max-w-4xl overflow-hidden sm:grid-cols-2`}>
        <div className="border-b border-rule bg-straw-wash p-5 sm:border-b-0 sm:border-r sm:p-6">
          <dt className="text-[15px]">Crossed state borders, whole run</dt>
          <dd className={`${figure} mt-1 text-5xl text-forest`}>{bytesLabel(run.totals.bytes_on_wire)}</dd>
          <dd className="mt-1 text-[15px] text-muted">
            {grouped(run.totals.bytes_on_wire)} bytes of model weights, up and back, over {rounds.length} rounds
          </dd>
        </div>
        <div className="bg-sheet p-5 sm:p-6">
          <dt className="text-[15px]">Farmer records that crossed</dt>
          <dd className={`${figure} mt-1 text-5xl text-forest`}>{grouped(recordsMoved)}</dd>
          <dd className="mt-1 text-[15px] text-muted">
            {roundsWithRecords === 0
              ? `in every one of the ${rounds.length} rounds`
              : `records were logged in ${roundsWithRecords} of ${rounds.length} rounds`}
          </dd>
        </div>
      </dl>

      <div className="mt-8 max-w-[68ch] space-y-3 text-[17px] text-muted">
        {payloads.length > 0 && (
          <p>
            The aggregator logged {payloads.length === 1 ? "one kind" : `${countWord(payloads.length)} kinds`} of payload
            and nothing else:{" "}
            {andList(payloads.map((p) => (PAYLOAD_MEANING[p] ? `${p} (${PAYLOAD_MEANING[p]})` : p)))}. None of them
            carries a photo, a farmer record or a location.
          </p>
        )}
        <p>
          This page replays recorded run <span className="font-semibold text-ink">{run.run_id}</span>, a Flower{" "}
          {run.provenance.runtime}. The weights, fingerprints and accuracies below are that run&apos;s; nothing is retrained
          when you open this page. {run.provenance.disclosure}
        </p>
      </div>
    </div>
  );
}

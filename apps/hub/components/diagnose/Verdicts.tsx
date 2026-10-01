"use client";

// Step 2: the same photo scored by the hero state's model twice, in this browser:
// trained on its own verified cases only, and after the recorded federation.
import { Check, X } from "lucide-react";
import { classLabel, type ClassKey } from "@/lib/classes";
import { pct, prob } from "@/lib/fl";
import { card, figure } from "@/lib/ui";

function andList(items: string[]): string {
  return items.length <= 1 ? items.join("") : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

export type Top3 = [ClassKey, number][];

function VerdictCard({
  title,
  sub,
  top,
  trueKey,
  note,
}: {
  title: string;
  sub: string;
  top: Top3;
  trueKey: ClassKey | null;
  note?: React.ReactNode;
}) {
  const [first, ...rest] = top;
  const known = trueKey != null;
  const right = known && first[0] === trueKey;
  const tone = !known ? "text-forest" : right ? "text-shoot" : "text-blight";
  return (
    <div className={`${card} flex min-w-0 flex-col p-5`}>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="text-sm text-muted">{sub}</p>
      <p className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className={`display text-[clamp(1.6rem,3.6vw,2.2rem)] ${tone}`}>{classLabel(first[0])}</span>
        <span className={`${figure} text-3xl text-forest`}>{prob(first[1])}</span>
      </p>
      {known && (
        <p className={`mt-1 flex items-center gap-1.5 text-sm font-semibold ${tone}`}>
          {right ? <Check size={16} aria-hidden="true" /> : <X size={16} aria-hidden="true" />}
          {right ? "Matches the expert label" : "Does not match the expert label"}
        </p>
      )}
      <p className="mt-3 text-sm text-muted">Next most likely</p>
      <ul className="mt-1 space-y-0.5 text-[15px]">
        {rest.map(([k, p]) => (
          <li key={k} className="flex justify-between gap-4 border-b border-rule py-1 last:border-b-0">
            <span>{classLabel(k)}</span>
            <span className="condensed font-semibold">{p < 0.001 ? "under 0.1%" : pct(p, p < 0.01 ? 1 : 0)}</span>
          </li>
        ))}
      </ul>
      {note && <div className="mt-4 text-[15px]">{note}</div>}
    </div>
  );
}

export default function Verdicts({
  stateId,
  local,
  fed,
  trueKey,
  unseen,
  nLocalTrain,
  rounds,
  others,
  taughtBy,
  footer,
}: {
  stateId: string;
  local: Top3;
  fed: Top3;
  trueKey: ClassKey | null;
  unseen: ClassKey[];
  nLocalTrain: number;
  rounds: number;
  others: string[];
  /** States whose experts have verified the federated model's top class. */
  taughtBy: string[];
  footer?: React.ReactNode;
}) {
  const fedTop = fed[0][0];
  const localTop = local[0][0];
  const cannotName = unseen.includes(fedTop) && localTop !== fedTop;
  const localNamesUnseen = unseen.includes(localTop);

  return (
    <section aria-labelledby="verdicts-h">
      <h2 id="verdicts-h" className="display text-forest text-[clamp(1.4rem,3vw,1.9rem)]">
        State {stateId}&apos;s model on this photo
      </h2>
      <p className="mt-2 max-w-[62ch] text-muted">
        Both run in your browser on the same image features. Percentages are calibrated probabilities.
      </p>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <VerdictCard
          title={`State ${stateId}, own data only`}
          sub={`Trained on ${nLocalTrain.toLocaleString("en-IN")} cases verified by State ${stateId}'s own experts`}
          top={local}
          trueKey={trueKey}
          note={
            cannotName ? (
              <p className="rounded-xl border border-forest/15 bg-paper-warm px-4 py-3">
                State {stateId}&apos;s experts have never recorded {classLabel(fedTop).toLowerCase()}. A model trained only on
                their cases has never seen it, so it cannot give that answer. It picks the nearest thing it knows.
              </p>
            ) : localNamesUnseen ? (
              <p className="rounded-xl border border-forest/15 bg-paper-warm px-4 py-3">
                Its top answer is a problem State {stateId} has never recorded, so this model has no training for it. Treat
                it as a guess.
              </p>
            ) : null
          }
        />
        <VerdictCard
          title={`State ${stateId} after federation`}
          sub={`After ${rounds} rounds of sharing weights with States ${andList(others)}`}
          top={fed}
          trueKey={trueKey}
          note={
            cannotName && taughtBy.length > 0 ? (
              <p className="rounded-xl bg-straw-wash px-4 py-3">
                It learned {classLabel(fedTop).toLowerCase()} from weights trained in{" "}
                {taughtBy.length === 1 ? "State" : "States"} {andList(taughtBy)}. No photo or farmer record left those
                states.
              </p>
            ) : null
          }
        />
      </div>
      {footer}
    </section>
  );
}

// Section 3: the design choices, each in plain language, each with the number behind it.
import { bytesLabel, grouped, pct } from "@/lib/fl";
import type { RunFile } from "@/lib/contract";
import type { MethodFigures } from "./figures";
import { orList, pointsBetween } from "./figures";
import Section from "./Section";

/** Gemini reports confidence as a percentage (0-100); tolerate a 0-1 value too. */
const conf = (v: number) => (v > 1 ? `${Math.round(v)}%` : pct(v));

export default function WhyTheseChoices({ f, bench }: { f: MethodFigures; bench: RunFile["gemini_benchmark"] }) {
  const items: { term: string; body: React.ReactNode }[] = [
    {
      term: "A frozen backbone with a federated head",
      body: (
        <>
          Every state runs the same public image model, MobileNetV3-Large, frozen, and trains only a small head on top
          ({grouped(f.params)} weights). Each update is {bytesLabel(f.updateBytes)}
          {f.backboneBytes != null && <> instead of the {bytesLabel(f.backboneBytes)} backbone</>}, so every round&apos;s
          real weights ship with this site ({f.roundsServed} heads, from the untrained start to round {f.finalRound}) and
          can be replayed. The cost is a ceiling on
          accuracy, listed under known limits.
        </>
      ),
    },
    {
      term: "Masked softmax for label skew",
      body: (
        <>
          State {f.heroState} holds no cases of {orList(f.heroUnseenLabels.map((l) => l.toLowerCase()))}. With an
          ordinary softmax, every training step in State {f.heroState} would push those outputs down, teaching the shared
          model that {f.heroClassLabel.toLowerCase()} never happens. Saajha leaves the conditions a state does not hold
          out of that state&apos;s training loss, so they are learned only from states that have seen them.
          {!f.maskAbsent && <> (This run did not use the mask.)</>}
        </>
      ),
    },
    {
      term: f.strategyName === "FedAvg" ? "Federated averaging (FedAvg)" : f.strategyName,
      body: (
        <>
          The aggregator takes an average of the state heads, weighted by how many verified cases each state trained on.
          It is Flower&apos;s standard strategy and the simplest to audit. In this run it came within{" "}
          {pointsBetween(f.pooledAcc, f.fedAcc)} points of training on all the data pooled in one place (
          {pct(f.fedAcc, 1)} against {pct(f.pooledAcc, 1)}).
        </>
      ),
    },
    {
      term: "Calibrated confidence",
      body: (
        <>
          Neural networks tend to be over-confident. Each round&apos;s head gets one temperature, fitted on a validation
          split that no state trained on, so the confidence shown is closer to how often the model is actually right.
          The final round&apos;s temperature is {f.finalTemperature.toFixed(2)}.
        </>
      ),
    },
    {
      term: "A gate threshold set on held-out data",
      body: (
        <>
          The federated model&apos;s answer counts as confident only at {pct(f.tauFed)} calibrated confidence or more:
          the lowest threshold at which its accepted answers were at least 90% correct on a validation split that no
          state trained on. Gemini&apos;s stated confidence plays no part in the gate.
        </>
      ),
    },
    {
      term: "Why Gemini stays in the loop",
      body: (
        <>
          Gemini does jobs the small head cannot. It checks the photo shows paddy at all: the head knows only{" "}
          {f.nClasses} conditions of one crop and will name one of them for any photo. It writes the advice in the
          farmer&apos;s language from the cited card for that condition, and speaks it. And it gives a second opinion
          that is logged for a state expert to audit when it differs. It does not decide the diagnosis.{" "}
          {bench ? (
            <>
              It is not reliable at telling these field conditions apart: on {grouped(bench.n)} held-out photos, Gemini
              alone ({bench.model}, zero-shot, limited to the{" "}
              {f.nClasses} labels) named the right condition {pct(bench.acc)} of the time
              {bench.mean_conf_correct != null && bench.mean_conf_wrong != null && (
                <>
                  {" "}
                  and stated about {conf(bench.mean_conf_correct)} confidence when right and{" "}
                  {conf(bench.mean_conf_wrong)} when wrong
                </>
              )}
              ; the federated model was right {pct(bench.fed_acc_same_images)} of the time on the same photos.
            </>
          ) : (
            <>Gemini&apos;s accuracy on these {f.nClasses} conditions has not been measured yet, so this site claims no
            comparison between the two.</>
          )}
        </>
      ),
    },
  ];

  return (
    <Section id="choices" title="Why these choices">
      <dl className="mt-8 grid max-w-5xl gap-x-12 md:grid-cols-2">
        {items.map((it) => (
          <div key={it.term} className="border-t border-rule py-6">
            <dt className="text-lg font-semibold leading-snug">{it.term}</dt>
            <dd className="mt-2 text-[17px] leading-relaxed">{it.body}</dd>
          </div>
        ))}
      </dl>
    </Section>
  );
}

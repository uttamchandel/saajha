// Section 5: known limits. Said plainly, with the numbers that qualify the headline.
import { grouped, pct } from "@/lib/fl";
import { link } from "@/lib/ui";
import type { MethodFigures } from "./figures";
import Section from "./Section";

const PAPER_URL = "https://arxiv.org/abs/2205.11108";

export default function KnownLimits({ f, origin }: { f: MethodFigures; origin: string }) {
  const limits: { lead: string; body: React.ReactNode }[] = [
    {
      lead: "One site, one season, one annotator.",
      body: (
        <>
          Every photo comes from {origin.replace(/^Paddy/, "paddy")}: according to the{" "}
          <a href={PAPER_URL} className={link}>
            dataset paper
          </a>
          , a single village, photographed from February to April 2021 and labelled with the help of one agricultural
          officer. Other states&apos; varieties, soils, light and phones are not represented.
        </>
      ),
    },
    {
      lead: "Near-duplicate photos flatter every model.",
      body: (
        <>
          The dataset photographs the same plants repeatedly, so a random test split contains near-twins of training
          photos. On the {grouped(f.hard.n)} of {grouped(f.hard.nTest)} held-out photos with no near-twin in any
          state&apos;s training data, the federated model scores {pct(f.hard.fedAcc, 1)} (against {pct(f.fedAcc, 1)} on
          all of them), and State {f.heroState} on conditions it never recorded goes from {pct(f.hard.heroUnseenBefore)}{" "}
          to {pct(f.hard.heroUnseenAfter)}.
          <span className="mt-1 block text-[15px] text-muted">Rule: {f.hard.rule}.</span>
        </>
      ),
    },
    {
      lead: `Paddy only, ${f.nClasses} conditions.`,
      body: (
        <>
          The federated head knows {f.nClasses} conditions of one crop. Another crop, a nutrient deficiency or a pest
          outside the list can only be flagged by Gemini as not one of these.
        </>
      ),
    },
    {
      lead: "The frozen backbone caps accuracy.",
      body: (
        <>
          Training the same head on all {f.nStates} states&apos; data pooled in one place reaches {pct(f.pooledAcc, 1)};
          federated reaches {pct(f.fedAcc, 1)}. Fine-tuning the backbone would probably raise both, at the cost of much
          larger updates. We have not measured that.
        </>
      ),
    },
    {
      lead: "Simulated topology.",
      body: (
        <>
          The {f.nStates} states were processes on one machine, not state data centres. Real networks add latency,
          nodes that drop out and software version drift, none of which this run faced.
        </>
      ),
    },
    {
      lead: f.dp ? "Differential privacy is set for this run only." : "No differential privacy in this run.",
      body: f.dp ? (
        <>
          This run added differential privacy to the updates (
          {Object.entries(f.dp)
            .map(([k, v]) => `${k} ${v}`)
            .join(", ")}
          ). How much protection those settings give against a determined attacker has not been tested.
        </>
      ) : (
        <>
          Model weights can, in principle, leak something about the data they were trained on. Flower supports
          differential privacy on the updates; adding it is the next step.
        </>
      ),
    },
    {
      lead: "Confidence is not correctness.",
      body: (
        <>
          Even a well-calibrated 90% means being wrong about one time in ten. That is why an answer below the{" "}
          {pct(f.tauFed)} threshold goes to a human instead of straight to the farmer, and why every case where
          Gemini&apos;s second opinion differs is logged for an expert to audit.
        </>
      ),
    },
  ];

  return (
    <Section id="limits" title="Known limits">
      <ul className="mt-8 max-w-4xl border-b border-rule">
        {limits.map((l) => (
          <li key={l.lead} className="grid gap-x-8 border-t border-rule py-5 md:grid-cols-[16rem_minmax(0,1fr)]">
            <h3 className="text-lg font-semibold leading-snug">{l.lead}</h3>
            <div className="mt-1 max-w-[64ch] text-[17px] leading-relaxed md:mt-0">{l.body}</div>
          </li>
        ))}
      </ul>
    </Section>
  );
}

// Section 1: the Saajha loop, as the sequence it really is.
import { LANGS_FULL } from "@/lib/langs";
import { grouped, pct } from "@/lib/fl";
import { figure } from "@/lib/ui";
import type { MethodFigures } from "./figures";
import Section from "./Section";

type Step = {
  title: string;
  body: React.ReactNode;
  where: string;
  /** This step is something crossing a state border (weights, never records). */
  crosses?: boolean;
};

export default function HowItWorks({ f }: { f: MethodFigures }) {
  const steps: Step[] = [
    {
      title: "A photo of the crop",
      body: "A farmer, or an extension worker with them, photographs the affected paddy.",
      where: "In the field",
    },
    {
      title: "The federated model names the condition",
      body: (
        <>
          The state&apos;s copy of the federated model names the likeliest of the {f.nClasses} conditions, with a
          calibrated confidence, and that answer decides. Gemini 3.5 Flash-Lite checks the photo shows paddy, which the
          federated model cannot tell, and names its own answer as a second opinion.
        </>
      ),
      where: "The federated model on the device; Gemini on a server",
    },
    {
      title: "Uncertain cases go to an expert in the same state",
      body: (
        <>
          Below {pct(f.tauFed)} confidence, no advice is shown. An agricultural expert in the farmer&apos;s own state, at a Krishi Vigyan Kendra (KVK) or a Rythu Seva Kendra
          (RSK) for example, confirms the label. The photo and the confirmed label are stored in that state and stay
          there. <span className="text-muted">On this site, escalation tickets stay in your browser; no expert receives them.</span>
        </>
      ),
      where: "In the state",
    },
    {
      title: "Each state trains on its own verified cases",
      body: (
        <>
          A Flower client in each state trains a small model head ({grouped(f.params)} weights) on that state&apos;s
          verified cases, on top of a frozen image model that never changes.
        </>
      ),
      where: "In the state",
    },
    {
      title: "Only the weights go to the national aggregator",
      body: (
        <>
          Each state sends its head&apos;s weights, {grouped(f.updateBytes)} bytes, to the national aggregator, which
          averages them ({f.strategyName}). No photo, label or farmer record is sent.
        </>
      ),
      where: "Crosses the state border",
      crosses: true,
    },
    {
      title: "Every state gets the improved model",
      body: (
        <>
          The averaged head goes back to every state. A state that has never recorded a pest can now recognise it: in
          the recorded run, State {f.heroState} went from {pct(f.heroUnseenBefore)} to {pct(f.heroUnseenAfter)} on the
          conditions it had never seen.
        </>
      ),
      where: "Crosses back, to every state",
      crosses: true,
    },
    {
      title: "Gemini writes the advisory in the farmer's language",
      body: (
        <>
          When the federated model is at least {pct(f.tauFed)} sure and the photo is paddy, Gemini writes the advice in
          the farmer&apos;s choice of {LANGS_FULL.length} languages, from the advisory card for that condition (compiled
          from cited public sources), and reads it aloud.
        </>
      ),
      where: "On a server, back to the farmer",
    },
    {
      title: "When the federated model is unsure, a human decides",
      body: (
        <>
          If the federated model is below {pct(f.tauFed)} confidence, the state&apos;s expert decides. If Gemini&apos;s
          second opinion names a different condition, the advice still stands and the case is logged for that expert to
          audit. Either way, the confirmed label becomes a new verified case for step 4.
        </>
      ),
      where: "Back to step 3",
    },
  ];

  return (
    <Section
      id="how"
      title="How Saajha works"
      lede="Eight steps, in order. Two of them cross a state border, and what crosses is model weights, never a farmer's record."
    >
      <ol className="mt-8 max-w-5xl border-b border-rule">
        {steps.map((s, i) => (
          <li
            key={s.title}
            className={`grid grid-cols-[2.25rem_minmax(0,1fr)] gap-x-4 border-t px-2 py-5 sm:grid-cols-[3rem_minmax(0,1fr)_13rem] sm:gap-x-6 sm:px-4 ${
              s.crosses ? "rounded-xl border-transparent bg-straw-wash" : "border-rule"
            }`}
          >
            <span aria-hidden="true" className={`${figure} text-4xl text-leaf`}>
              {i + 1}
            </span>
            <div>
              <h3 className="text-lg font-semibold leading-snug">
                <span className="sr-only">Step {i + 1}: </span>
                {s.title}
              </h3>
              <p className="mt-1 max-w-[62ch] text-[17px] leading-relaxed">{s.body}</p>
            </div>
            <p
              className={`col-start-2 mt-2 text-[15px] sm:col-start-3 sm:mt-1 ${
                s.crosses ? "font-semibold text-ink" : "text-muted"
              }`}
            >
              {s.where}
            </p>
          </li>
        ))}
      </ol>
    </Section>
  );
}

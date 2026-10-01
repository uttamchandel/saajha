// Section 6: what a state needs to join. Written for a policy reader; claims kept modest.
import { grouped } from "@/lib/fl";
import { card } from "@/lib/ui";
import type { MethodFigures } from "./figures";
import Section from "./Section";

export default function JoiningState({ f }: { f: MethodFigures }) {
  const needs: { lead: string; body: React.ReactNode }[] = [
    {
      lead: "One state node.",
      body: (
        <>
          A Flower SuperNode with the frozen backbone and the head-training code in this repository, on the
          state&apos;s own servers or a cloud region in India. In this prototype it runs as a process; packaging it as
          a container is the next step.
        </>
      ),
    },
    {
      lead: "Read access to its own verified cases.",
      body: <>The node reads photos and expert-confirmed labels from the state&apos;s own case store. Nothing is copied out.</>,
    },
    {
      lead: "A network route to the national aggregator.",
      body: (
        <>
          What travels is {grouped(f.updateBytes)} bytes of weights each way per round, plus a few numbers: how many
          cases the state trained on and its training loss.
        </>
      ),
    },
    {
      lead: "Modest compute.",
      body:
        f.medianRoundSeconds != null ? (
          <>
            In the recorded run, a full round (all {f.nStates} states training, then the aggregator scoring) took a
            median of {Math.round(f.medianRoundSeconds)} seconds on one machine, using the CPU only.
          </>
        ) : (
          <>The head is small enough to train on an ordinary CPU.</>
        ),
    },
  ];

  return (
    <Section
      id="join"
      title="What a state needs to join"
      lede="Adding a state means starting one more node pointed at the same aggregator. The other states do not have to change anything."
    >
      <div className="mt-8 grid max-w-5xl gap-10 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <ul className="border-b border-rule">
          {needs.map((n) => (
            <li key={n.lead} className="border-t border-rule py-5 text-[17px] leading-relaxed">
              <strong className="font-semibold">{n.lead}</strong> {n.body}
            </li>
          ))}
        </ul>
        <div className={`${card} self-start p-5 sm:p-6`}>
          <h3 className="text-lg font-semibold">What it does not need</h3>
          <p className="mt-2 text-[17px] leading-relaxed">
            A data-sharing agreement for raw farmer records, because none move.
          </p>
          <p className="mt-3 text-[17px] leading-relaxed text-muted">
            It would still need agreements on who runs the aggregator, who may use the national model, and how a state
            leaves. In this prototype the {f.nStates} states are fixed in <span className="font-semibold text-ink">fl/saajha_fl/common.py</span> so the
            benchmark can score each one.
          </p>
        </div>
      </div>
    </Section>
  );
}

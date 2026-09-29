// Section 4: what is real and what is not. Scannable, specific, no hedging.
import Link from "next/link";
import { grouped } from "@/lib/fl";
import type { MethodFigures } from "./figures";
import Section from "./Section";

type Item = { lead: string; body: React.ReactNode };

function Column({ id, heading, items }: { id: string; heading: string; items: Item[] }) {
  return (
    <div className="rounded-md border border-rule bg-sheet p-5 sm:p-6">
      <h3 id={id} className="display text-xl">
        {heading}
      </h3>
      <ul aria-labelledby={id} className="mt-4">
        {items.map((it) => (
          <li key={it.lead} className="border-t border-rule py-4 text-[17px] leading-relaxed first:border-t-0 first:pt-2">
            <strong className="font-semibold">{it.lead}</strong> {it.body}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function RealVsSimulated({ f, disclosure }: { f: MethodFigures; disclosure: string }) {
  const real: Item[] = [
    {
      lead: "Flower training and aggregation.",
      body: (
        <>
          A real Flower deployment: one SuperLink and {f.nStates} SuperNode processes, each holding one state&apos;s
          partition, running {f.trainingRounds} rounds on one machine.
        </>
      ),
    },
    {
      lead: "Every weight file and its sha256.",
      body: (
        <>
          All {f.roundsServed} national heads (round 0 is the untrained start) and the {f.nStates} local-only heads are
          served exactly as the run recorded them.
        </>
      ),
    },
    {
      lead: "All accuracies.",
      body: <>Measured on {grouped(f.nTest)} held-out photos that no state trained on.</>,
    },
    {
      lead: "The border inspector check.",
      body: (
        <>
          It checked every reply in every round. Farmer records moved: {grouped(f.recordsMoved)}
          {f.roundsWithRecords === 0 ? `, in all ${f.trainingRounds} rounds` : ""}.
        </>
      ),
    },
    {
      lead: "Gemini on uploaded photos.",
      body: (
        <>
          A photo you upload on{" "}
          <Link href="/diagnose" className="text-carbon underline underline-offset-4">
            Try a photo
          </Link>{" "}
          is sent to Gemini live. If Gemini is unavailable, you get an error, never a made-up diagnosis.
        </>
      ),
    },
    {
      lead: "Browser inference.",
      body: <>The federated model runs on your device, with the same backbone file the states used.</>,
    },
  ];

  const simulated: Item[] = [
    {
      lead: "The states.",
      body: (
        <>
          {disclosure} Which state holds which condition was chosen to make the federation measurable.
        </>
      ),
    },
    {
      lead: "“Expert-verified” labels.",
      body: <>They are the dataset&apos;s own labels, assigned by its authors with the help of an agricultural officer, not new reviews by state experts.</>,
    },
    {
      lead: "The network.",
      body: <>All nodes and the aggregator ran on one computer. No state government runs a node.</>,
    },
    {
      lead: "Training on this site.",
      body: <>The site replays recorded run {f.runId}. Nothing is retrained when you open a page.</>,
    },
    {
      lead: "Gallery outputs.",
      body: <>Some gallery results may be pre-generated; where they are, they are dated.</>,
    },
    {
      lead: "Escalation tickets.",
      body: <>They stay in your browser. No expert or KVK receives them.</>,
    },
    {
      lead: "Advisory cards.",
      body: (
        <>
          Compiled from cited public sources (TNAU Agritech Portal, IRRI Rice Knowledge Bank, ICAR-NRRI and others).
          They have not been reviewed by an agronomist.
        </>
      ),
    },
    {
      lead: "AgriStack and Kisan Sarathi.",
      body: <>No integration exists. The design is meant to sit on them; nothing here is connected to them.</>,
    },
  ];

  return (
    <Section id="real" title="What is real and what is not">
      <div className="mt-8 grid max-w-5xl gap-6 md:grid-cols-2">
        <Column id="real-list" heading="Real" items={real} />
        <Column id="simulated-list" heading="Simulated or seeded" items={simulated} />
      </div>
    </Section>
  );
}

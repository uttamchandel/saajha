"use client";

// The federation record: the auditable evidence behind the flip. Loads run.json once;
// weight files are fetched only when a reader asks to verify them.
import { useEffect, useState } from "react";
import type { RunFile } from "@/lib/contract";
import { fetchRun } from "@/lib/fl";
import { card, lede } from "@/lib/ui";
import AccuracyMatrix from "./AccuracyMatrix";
import GeminiBenchmark from "./GeminiBenchmark";
import LearningCurve from "./LearningCurve";
import LiveRounds from "./LiveRounds";
import Provenance from "./Provenance";
import RoundLog from "./RoundLog";
import Summary from "./Summary";
import Topology from "./Topology";
import { Section, capitalize, countWord } from "./shared";

export default function FederationRecord() {
  const [run, setRun] = useState<RunFile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetchRun()
      .then((r) => alive && setRun(r))
      .catch((e: unknown) => alive && setError(e instanceof Error ? e.message : String(e)));
    return () => {
      alive = false;
    };
  }, []);

  if (error) {
    return (
      <p role="alert" className="mt-5 max-w-[62ch] text-lg text-blight">
        The federation record could not be loaded ({error}). Reload the page to try again.
      </p>
    );
  }

  if (!run) {
    return (
      <div aria-busy="true" className="mt-5">
        <p className={lede}>Loading the recorded run…</p>
        <div className={`${card} mt-8 h-40 max-w-4xl animate-pulse motion-reduce:animate-none`} />
      </div>
    );
  }

  const S = run.hero.state;
  const last = run.rounds[run.rounds.length - 1].round;

  return (
    <>
      <Summary run={run} />

      <Section id="topology" title={`${capitalize(countWord(run.states.length))} state nodes, one national aggregator`}>
        <Topology run={run} />
      </Section>

      <Section id="accuracy" title="What each state can diagnose, before and after federation">
        <AccuracyMatrix run={run} />
      </Section>

      <Section id="curve" title={`How State ${S} learned classes it has never recorded`}>
        <LearningCurve run={run} />
      </Section>

      <Section id="rounds" title={`Round log, all ${last} rounds`}>
        <RoundLog run={run} />
      </Section>

      <LiveRounds />

      <Section id="gemini" title="Gemini, measured on the same photos">
        <GeminiBenchmark run={run} />
      </Section>

      <Section id="provenance" title="Provenance">
        <Provenance run={run} />
      </Section>
    </>
  );
}

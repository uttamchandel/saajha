"use client";

// The flip: one held-out hispa photo, scored by State C's model — first trained on
// State C's own verified cases only, then after each real federation round. Every
// prediction shown was computed from that round's recorded weights (see /federation
// to verify their sha256); the replay does not train anything.
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { classLabel, type ClassKey } from "@/lib/classes";
import type { GalleryItem, RunFile } from "@/lib/contract";
import { fetchGallery, fetchRun, grouped, pct, prob } from "@/lib/fl";
import TransitSlip from "./TransitSlip";

const STEP_MS = 140;

type Verdict = { top: ClassKey; p: number; trueP: number | null; runnerUp?: [ClassKey, number] };

export default function FlipDemo() {
  const [run, setRun] = useState<RunFile | null>(null);
  const [hero, setHero] = useState<GalleryItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [round, setRound] = useState(0); // 0 = own data only; 1..N = after federation round N
  const [playing, setPlaying] = useState(false);
  const [landed, setLanded] = useState(0); // bumps when a replay finishes, re-triggering the stamp
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    Promise.all([fetchRun(), fetchGallery()])
      .then(([r, g]) => {
        setRun(r);
        setHero(g.find((x) => x.hero) ?? g[0]);
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  const last = run ? run.rounds[run.rounds.length - 1].round : 40;
  const stateId = run?.hero.state ?? "C";

  const verdict: Verdict | null = useMemo(() => {
    if (!hero || !run) return null;
    if (round === 0) {
      const top3 = hero.python_topk[`local_${stateId}`];
      const trueP = top3.find(([k]) => k === hero.true_key)?.[1] ?? null; // null: not in its top three
      return { top: top3[0][0], p: top3[0][1], trueP, runnerUp: top3[1] };
    }
    const t = hero.trajectory.find((x) => x.round === round);
    return t ? { top: t.top, p: t.top_p, trueP: t.true_p } : null;
  }, [hero, run, round, stateId]);

  const stop = useCallback(() => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    setPlaying(false);
  }, []);

  const play = useCallback(() => {
    stop();
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setRound(last);
      setLanded((n) => n + 1);
      return;
    }
    setRound(0);
    setPlaying(true);
    let r = 0;
    timer.current = setInterval(() => {
      r += 1;
      setRound(r);
      if (r >= last) {
        stop();
        setLanded((n) => n + 1);
      }
    }, STEP_MS);
  }, [last, stop]);

  useEffect(() => stop, [stop]);

  if (error) {
    return <p className="text-blight">The federation record could not be loaded: {error}. Reload the page to try again.</p>;
  }
  if (!run || !hero || !verdict) {
    return <div className="h-[560px] animate-pulse rounded-md bg-sheet" aria-label="Loading the federation record" />;
  }

  const correct = verdict.top === hero.true_key;
  const unsure = verdict.p < run.gate.tau_fed;
  const neverRecorded = run.states.find((s) => s.id === stateId)?.unseen.includes(hero.true_key);
  const local = run.local_models[stateId];
  const final = run.rounds[run.rounds.length - 1];
  const entry = round > 0 ? run.rounds.find((r) => r.round === round) : undefined;
  const verifiedCases = run.states
    .filter((s) => s.id !== stateId && s.seen.includes(hero.true_key))
    .map((s) => ({ id: s.id, n: s.n_train[hero.true_key] ?? 0 }));

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-12">
      <figure className="lg:sticky lg:top-6 lg:self-start">
        <div className="relative overflow-hidden rounded-md border border-rule bg-sheet">
          <Image
            src={hero.image_url}
            alt={`Paddy leaves photographed in a Tamil Nadu field, showing ${classLabel(hero.true_key).toLowerCase()} damage: pale feeding streaks along the leaf.`}
            width={480}
            height={640}
            priority
            className="h-auto w-full"
          />
        </div>
        <figcaption className="mt-2 text-sm text-muted">
          Held out from training in every state. Expert label: {classLabel(hero.true_key)}.{" "}
          <span className="whitespace-nowrap">Photo: Paddy Doctor, CC BY 4.0.</span>
        </figcaption>
      </figure>

      <div className="min-w-0">
        <h2 className="display text-[clamp(2.1rem,5.2vw,3.6rem)]">
          State {stateId} has never recorded {classLabel(hero.true_key).toLowerCase()}. Its model learns to see it anyway.
        </h2>
        <p className="mt-5 max-w-[62ch] text-lg text-muted">
          Experts in States {verifiedCases.map((v) => v.id).join(" and ")} have verified{" "}
          {grouped(verifiedCases.reduce((a, v) => a + v.n, 0))} cases of it. Those photos and the farmers behind them never
          leave their states. Only what each state&apos;s model learned — its weights — travels to a national aggregator and
          back.
        </p>

        <section aria-labelledby="verdict-h" className="mt-8 rounded-md border border-rule bg-sheet p-5 sm:p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h3 id="verdict-h" className="text-lg font-semibold">
              State {stateId}&apos;s diagnosis of this photo
            </h3>
            <p className="text-sm text-muted" aria-live="polite">
              {round === 0 ? "Trained on its own verified cases only" : `After federation round ${round} of ${last}`}
            </p>
          </div>

          <p className="mt-4 flex flex-wrap items-baseline gap-x-4 gap-y-1" aria-live="polite">
            <span className={`display text-[clamp(1.9rem,4.4vw,2.8rem)] ${correct ? "text-shoot" : "text-blight"}`}>
              {classLabel(verdict.top)}
            </span>
            <span className="condensed text-3xl font-semibold">{prob(verdict.p)}</span>
            <span className="text-base text-muted">
              {correct ? (unsure ? "right, but not yet confident" : "right and confident") : unsure ? "wrong, and unsure" : "wrong"}
            </span>
          </p>
          <p className="mt-2 min-h-[3rem] max-w-[60ch] text-[15px] text-muted">
            {round === 0 && neverRecorded
              ? `State ${stateId}'s own model has never seen a single verified ${classLabel(hero.true_key).toLowerCase()} case, so the right answer is not something it can give — it is not even among its top three guesses.`
              : correct
                ? `The same photo, the same state — now scored with the averaged model.`
                : `Probability it gives to the right answer: ${verdict.trueP == null ? "not in its top three" : prob(verdict.trueP)}.`}
          </p>

          <div className="mt-6">
            <label htmlFor="round" className="text-sm text-muted">
              Step through the recorded rounds
            </label>
            <input
              id="round"
              type="range"
              min={0}
              max={last}
              value={round}
              onChange={(e) => {
                stop();
                setRound(Number(e.target.value));
              }}
              className="mt-2 w-full accent-[var(--ink)]"
              aria-valuetext={round === 0 ? "Own data only" : `Round ${round}`}
            />
            <div className="mt-1 flex justify-between text-xs text-muted">
              <span>Own data only</span>
              <span>Round {last}</span>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={playing ? stop : play}
              className="rounded-md bg-ink px-5 py-3 text-base font-semibold text-white hover:bg-[#2a3888]"
            >
              {playing ? "Pause" : round === last ? "Replay the federation" : "Run the federation"}
            </button>
            <Link href="/diagnose" className="text-carbon underline underline-offset-4">
              Try it with your own photo
            </Link>
          </div>
        </section>

        <TransitSlip run={run} round={entry} landed={landed} />

        <dl className="mt-10 grid gap-x-8 gap-y-6 border-t border-rule pt-6 sm:grid-cols-3">
          <div>
            <dt className="text-sm text-muted">State {stateId}, on pests and diseases it has never recorded</dt>
            <dd className="condensed mt-1 text-3xl font-semibold">
              {pct(local.acc_unseen)} <span className="text-muted">to</span>{" "}
              <span className="text-shoot">{pct(final.per_state[stateId].acc_unseen)}</span>
            </dd>
          </div>
          <div>
            <dt className="text-sm text-muted">All states together, on held-out photos</dt>
            <dd className="condensed mt-1 text-3xl font-semibold">{pct(final.global.acc_all, 1)}</dd>
            <dd className="text-sm text-muted">
              Pooling every photo in one place would reach {pct(run.centralized_upper_bound.acc_all, 1)}.
            </dd>
          </div>
          <div>
            <dt className="text-sm text-muted">Farmer records that crossed a state border</dt>
            <dd className="condensed mt-1 text-3xl font-semibold">{grouped(run.totals.records_moved)}</dd>
            <dd className="text-sm text-muted">
              in {last} rounds. <Link href="/federation" className="text-carbon underline underline-offset-4">Check every round</Link>
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}

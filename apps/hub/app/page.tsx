import { readFileSync } from "node:fs";
import path from "node:path";
import FlipDemo from "@/components/flip/FlipDemo";
import AddAState from "@/components/landing/AddAState";
import BorderRule from "@/components/landing/BorderRule";
import FinalCta from "@/components/landing/FinalCta";
import Hero from "@/components/landing/Hero";
import LiveNow from "@/components/landing/LiveNow";
import Problem from "@/components/landing/Problem";
import Reach from "@/components/landing/Reach";

// The latest recorded release, read at build time; the hero swaps in the live one once it loads.
function latestRelease(): { round: number; sha256: string } {
  const run = JSON.parse(readFileSync(path.join(process.cwd(), "public/fl/run.json"), "utf8")) as {
    rounds: { round: number; weights_sha256: string }[];
  };
  const last = run.rounds[run.rounds.length - 1];
  return { round: last.round, sha256: last.weights_sha256 };
}

export default function Home() {
  const rel = latestRelease();
  return (
    <main>
      <Hero round={rel.round} sha256={rel.sha256} />
      <Problem />
      <section id="flip" aria-label="The proof: a replay of the real run" className="scroll-mt-4 bg-paper">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
          <p className="mb-6 text-[13px] font-semibold uppercase tracking-[0.14em] text-muted">
            The proof · a replay of the real run
          </p>
          <FlipDemo />
        </div>
      </section>
      <BorderRule />
      <LiveNow />
      <Reach />
      <AddAState />
      <FinalCta />
    </main>
  );
}

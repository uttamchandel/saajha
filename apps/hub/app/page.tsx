import { readFileSync } from "node:fs";
import path from "node:path";
import FlipDemo from "@/components/flip/FlipDemo";
import NetworkLive from "@/components/network/NetworkLive";

// The latest release, read at build time from the run the site serves.
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
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <FlipDemo />
      <NetworkLive round={rel.round} sha256={rel.sha256} />
    </main>
  );
}

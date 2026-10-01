// /method: how Saajha works, why it is built this way, what is real, and its limits.
// Every figure is read from public/fl/run.json (the exported federation run) when the
// page renders; none is typed in by hand.
import { readFileSync } from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import type { RunFile } from "@/lib/contract";
import ArchitectureDiagram from "@/components/method/ArchitectureDiagram";
import Credits from "@/components/method/Credits";
import HowItWorks from "@/components/method/HowItWorks";
import JoiningState from "@/components/method/JoiningState";
import KnownLimits from "@/components/method/KnownLimits";
import RealVsSimulated from "@/components/method/RealVsSimulated";
import WhyTheseChoices from "@/components/method/WhyTheseChoices";
import { methodFigures } from "@/components/method/figures";
import { chip, h1, lede, noteBad } from "@/lib/ui";

export const metadata: Metadata = {
  title: "Method and limits — Saajha",
  description:
    "How Saajha's federated learning works, why it is built this way, what on the site is real and what is simulated, and its known limits.",
};

const CONTENTS = [
  { href: "#how", label: "How it works" },
  { href: "#architecture", label: "Architecture" },
  { href: "#choices", label: "Why these choices" },
  { href: "#real", label: "What is real" },
  { href: "#limits", label: "Known limits" },
  { href: "#join", label: "Joining" },
  { href: "#credits", label: "Credits" },
];

function loadRun(): RunFile | null {
  try {
    const raw = readFileSync(path.join(process.cwd(), "public", "fl", "run.json"), "utf8");
    const run = JSON.parse(raw) as RunFile;
    return run.schema_version === 1 && run.rounds?.length > 0 ? run : null;
  } catch {
    return null;
  }
}

export default function MethodPage() {
  const run = loadRun();

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <header className="pb-10 sm:pb-12">
        <h1 className={h1}>Method and limits</h1>
        <p className={`mt-5 max-w-[60ch] ${lede}`}>
          How Saajha works, why it is built this way, what on this site is real and what is simulated, and where it
          falls short.
        </p>
        {run ? (
          <p className="mt-3 max-w-[64ch] text-[17px] text-muted">
            Every figure on this page is read from recorded federation run{" "}
            <span className="font-semibold text-ink">{run.run_id}</span>, exported{" "}
            {methodFigures(run).createdLabel}.
          </p>
        ) : (
          <p role="alert" className={`${noteBad} mt-4 max-w-[64ch] p-4 text-[17px]`}>
            The run record (public/fl/run.json) could not be read, so this page cannot show its figures. Nothing here
            is filled in by hand, so the sections below are hidden until the file is back.
          </p>
        )}
        {run && (
          <nav aria-label="On this page" className="mt-8">
            <p className="text-[15px] text-muted">On this page</p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {CONTENTS.map((c) => (
                <li key={c.href}>
                  <a href={c.href} className={`${chip} text-leaf transition-colors hover:border-forest/40 hover:text-forest`}>
                    {c.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </header>

      {run && <MethodSections run={run} />}
    </main>
  );
}

function MethodSections({ run }: { run: RunFile }) {
  const f = methodFigures(run);
  return (
    <>
      <HowItWorks f={f} />
      <ArchitectureDiagram f={f} />
      <WhyTheseChoices f={f} bench={run.gemini_benchmark} />
      <RealVsSimulated f={f} disclosure={run.provenance.disclosure} />
      <KnownLimits f={f} origin={run.provenance.dataset.origin} />
      <JoiningState f={f} />
      <Credits provenance={run.provenance} />
    </>
  );
}

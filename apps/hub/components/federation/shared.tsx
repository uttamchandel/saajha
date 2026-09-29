// Small shared pieces for the federation record. Every figure is derived from run.json.
import type { PerStateAcc, RunFile, StateId } from "@/lib/contract";

export function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="scroll-mt-6 border-t border-rule py-10 sm:py-14">
      <h2 id={`${id}-h`} className="display text-[clamp(1.5rem,3.2vw,2.1rem)]">
        {title}
      </h2>
      {children}
    </section>
  );
}

/** Verified cases a state holds: the sum of its per-class training counts. */
export function casesHeld(run: RunFile, id: StateId): number {
  const s = run.states.find((x) => x.id === id);
  if (!s) return 0;
  return Object.values(s.n_train).reduce<number>((a, b) => a + (b ?? 0), 0);
}

/** Training rounds (round 0 is the untrained starting model). */
export function trainingRounds(run: RunFile) {
  return run.rounds.filter((r) => r.round > 0);
}

export function finalRound(run: RunFile) {
  return run.rounds[run.rounds.length - 1];
}

/** The update size each state sent per round: one number if every update was the same size. */
export function updateBytesSummary(run: RunFile): { min: number; max: number } {
  const all = trainingRounds(run).flatMap((r) => Object.values(r.update_bytes).filter((v): v is number => v != null));
  if (all.length === 0) return { min: 0, max: 0 };
  return { min: Math.min(...all), max: Math.max(...all) };
}

/** Change in percentage points, signed, e.g. "+2.9 points". */
export function pointsDelta(before: number | null, after: number | null): { text: string; dir: -1 | 0 | 1 } | null {
  if (before == null || after == null) return null;
  const d = (after - before) * 100;
  const r = Math.round(d * 10) / 10;
  if (r === 0) return { text: "no change", dir: 0 };
  return { text: `${r > 0 ? "+" : "−"}${Math.abs(r).toFixed(1)} points`, dir: r > 0 ? 1 : -1 };
}

export function localOnHardSubset(run: RunFile, id: StateId): PerStateAcc | undefined {
  const v = (run.hard_subset as unknown as Record<string, unknown>)[`local_${id}_per_state`];
  if (v && typeof v === "object" && "acc_seen" in v && "acc_unseen" in v) return v as PerStateAcc;
  return undefined;
}

/** "A, B and C" */
export function andList(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

const NUMBER_WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
export function countWord(n: number): string {
  return NUMBER_WORDS[n] ?? String(n);
}

export function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function plural(n: number, one: string, many = `${one}s`): string {
  return n === 1 ? one : many;
}

export function formatIST(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d)} IST`;
}

/** Text colour for an "after" value compared with its "before": only right/wrong tokens, only when it moved. */
export function moveTone(before: number | null | undefined, after: number | null | undefined): string {
  if (before == null || after == null || after === before) return "text-ink";
  return after > before ? "text-shoot" : "text-blight";
}

export const btnPrimary =
  "inline-flex items-center rounded-md bg-ink px-4 py-2 text-[15px] font-semibold text-white hover:bg-[#2a3888] disabled:cursor-not-allowed disabled:bg-muted";

export const btnSecondary =
  "inline-flex items-center rounded-md border border-ink bg-sheet px-3 py-1.5 text-sm font-semibold text-ink hover:bg-carbon-wash disabled:cursor-not-allowed disabled:border-rule disabled:text-muted disabled:hover:bg-sheet";

export const link = "text-carbon underline underline-offset-4 hover:text-ink";

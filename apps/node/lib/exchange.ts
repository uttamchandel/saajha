// What this state node publishes for cross-border early warning (Saajha step 4): outbreak counts
// only, by district, ISO week and condition, and never a count below K, so no single farmer can
// be picked out. No names, numbers, villages or photos. The hub pulls these, checks them at the
// border and warns the neighbouring state; it stores nothing.
//
// SCENARIO: the counts below are seeded so the warning can be shown end to end. No real farmer
// reports them; the envelope says scenario: true and every screen labels it. In production the
// node counts its own verified reports (tickets and diagnoses) the same way.
import { NODE_STATE } from "./node";

export const K_MIN = 5;

export type OutbreakCount = { district: string; iso_week: string; condition: string; count: number };

export type CountsEnvelope = {
  schema: "saajha.outbreak_counts.v1";
  node: string;
  state: string;
  k: number;
  generated_at: string;
  scenario: boolean;
  counts: OutbreakCount[];
  /** How many district-week-condition cells were held back because they were below k. */
  withheld: number;
};

// Last three ISO weeks, oldest first. Adilabad (Telangana) borders Yavatmal (Maharashtra) along the
// Penganga river; cotton is the main crop on both banks.
const SCENARIO: Record<string, { district: string; condition: string; weekly: [number, number, number] }[]> = {
  Maharashtra: [
    { district: "Yavatmal", condition: "pink_bollworm", weekly: [6, 14, 31] },
    { district: "Amravati", condition: "pink_bollworm", weekly: [5, 6, 7] },
    { district: "Nashik", condition: "fall_armyworm", weekly: [3, 4, 2] },
  ],
  Telangana: [
    { district: "Adilabad", condition: "pink_bollworm", weekly: [2, 3, 4] },
    { district: "Warangal", condition: "blast", weekly: [7, 8, 6] },
  ],
};

/** ISO-8601 week label ("2026-W40") for a date, in UTC. */
export function isoWeek(d: Date): string {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((t.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${t.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

export function countsEnvelope(now = new Date()): CountsEnvelope {
  const weeks = [14, 7, 0].map((daysAgo) => isoWeek(new Date(now.getTime() - daysAgo * 86_400_000)));
  const counts: OutbreakCount[] = [];
  let withheld = 0;
  for (const row of SCENARIO[NODE_STATE] ?? []) {
    row.weekly.forEach((count, i) => {
      if (count < K_MIN) withheld += 1;
      else counts.push({ district: row.district, iso_week: weeks[i], condition: row.condition, count });
    });
  }
  return {
    schema: "saajha.outbreak_counts.v1",
    node: `saajha-node-${NODE_STATE.toLowerCase().replace(/\s+/g, "-")}`,
    state: NODE_STATE,
    k: K_MIN,
    generated_at: now.toISOString(),
    scenario: true,
    counts,
    withheld,
  };
}

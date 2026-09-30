"use client";

// Warnings from neighbouring states, via the Saajha hub (step 4). The hub pulls every node's
// k-anonymous outbreak counts and tells this state when a pest is rising in a district across its
// border; the officer can then alert farmers in the adjoining district. Only counts ever crossed.
import { useEffect, useState } from "react";
import { DISTRICTS } from "@/lib/districts";
import { NODE_STATE, STATE_LANGUAGE } from "@/lib/node";
import { HUB_URL } from "@/lib/fed/federated";
import type { ComposeTarget } from "./BroadcastComposer";
import { SectionCard } from "./ui";

type Warning = {
  condition: string;
  label: string;
  from: { state: string; district: string };
  to: { state: string; district: string };
  along: string;
  weeks: string[];
  counts: number[];
};

type Exchange = { warnings: Warning[]; nodes: { state: string; scenario: boolean }[] };

// What a farmer can check without spraying anything. The officer edits the alert before it is sent.
const FIRST_STEPS: Record<string, string> = {
  pink_bollworm: "Check green cotton bolls for pink larvae this week and set pheromone traps.",
  fall_armyworm: "Check maize whorls for fresh feeding holes and sawdust-like droppings this week.",
  blast: "Look for spindle-shaped grey spots on paddy leaves this week and hold back extra urea.",
};

const alertText = (w: Warning) =>
  `${w.label} is rising in ${w.from.district} district of ${w.from.state}, just across ${w.along}. ${
    FIRST_STEPS[w.condition] ?? "Check your crop this week."
  } Ask your RSK or KVK before spraying anything. Helpline: 1800-180-1551`;

export default function CrossBorderPanel({ onCompose }: { onCompose: (t: ComposeTarget) => void }) {
  const [data, setData] = useState<Exchange | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch(`${HUB_URL}/api/exchange?state=${encodeURIComponent(NODE_STATE)}`, { signal: AbortSignal.timeout(15000) })
      .then((r) => (r.ok ? (r.json() as Promise<Exchange>) : Promise.reject(new Error(String(r.status)))))
      .then((d) => alive && setData(d))
      .catch(() => alive && setError(true));
    return () => {
      alive = false;
    };
  }, []);

  const scenario = data?.nodes.some((n) => n.scenario);
  return (
    <SectionCard
      title={`Warnings from neighbouring states · ${NODE_STATE}`}
      sub="From the Saajha hub. Other states share only district-week outbreak counts (never below 5), never farmer records."
      actions={
        <a href={`${HUB_URL}/exchange`} className="text-xs font-medium text-emerald-700 hover:underline">
          How counts cross ↗
        </a>
      }
    >
      {error && <p className="text-sm text-slate-500">The Saajha hub could not be reached just now.</p>}
      {!data && !error && <div className="h-16 animate-pulse rounded bg-slate-100" aria-label="Checking the hub" />}
      {data && data.warnings.length === 0 && <p className="text-sm text-slate-500">No outbreak is rising next to {NODE_STATE}&apos;s borders.</p>}
      {data && data.warnings.length > 0 && (
        <ul className="space-y-3">
          {data.warnings.map((w, i) => {
            const target = DISTRICTS.find((d) => d.district === w.to.district && d.state === w.to.state);
            return (
              <li key={i} className="rounded-md border border-red-200 bg-red-50 p-3">
                <div className="text-sm font-semibold text-red-900">
                  {w.label} rising in {w.from.district}, {w.from.state}: {w.counts.join(" → ")} reports a week
                </div>
                <div className="mt-1 text-xs text-red-900/80">
                  {w.to.district} shares the border along {w.along}. Weeks {w.weeks[0]} to {w.weeks[w.weeks.length - 1]}.
                </div>
                <button
                  type="button"
                  onClick={() =>
                    onCompose({
                      kind: "outbreak",
                      title: `${w.label}: rising across the border in ${w.from.district}`,
                      district: w.to.district,
                      state: w.to.state,
                      language: STATE_LANGUAGE[w.to.state] ?? "Hindi",
                      message: alertText(w),
                      messageLanguage: "English",
                      recipients: target?.farmers ?? 0,
                    })
                  }
                  className="mt-2 rounded-md bg-red-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-800"
                >
                  Alert farmers in {w.to.district}
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {scenario && (
        <p className="mt-3 text-[11px] text-slate-500">
          Scenario counts: the nodes publish seeded counts so this can be shown end to end; the pull, the border check and the
          warning are live.
        </p>
      )}
    </SectionCard>
  );
}

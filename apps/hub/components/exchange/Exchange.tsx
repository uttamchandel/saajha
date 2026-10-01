"use client";

// Live view of /api/exchange: which state nodes were pulled, the counts that crossed the border,
// what was refused, and the warnings sent to neighbouring states.
import { useEffect, useState } from "react";
import { TriangleAlert } from "lucide-react";
import type { Count, NodePull, Refusal, Warning } from "@/lib/exchange";
import { CONDITION_LABELS } from "@/lib/exchange";
import { card, link, noteBad, noteWarn } from "@/lib/ui";
import BorderTest from "./BorderTest";

type Payload = {
  generated_at: string;
  rule: string;
  nodes: NodePull[];
  counts: Count[];
  refusals: Refusal[];
  farmer_records_moved: number;
  warnings: Warning[];
};

export default function Exchange() {
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pull = () =>
    fetch("/api/exchange", { cache: "no-store" }).then((r) =>
      r.ok ? (r.json() as Promise<Payload>) : Promise.reject(new Error(`HTTP ${r.status}`)),
    );
  const fail = (e: unknown) => setError(e instanceof Error ? e.message : String(e));

  useEffect(() => {
    let alive = true;
    pull()
      .then((d) => alive && setData(d))
      .catch((e) => alive && fail(e));
    return () => {
      alive = false;
    };
  }, []);

  const load = () => {
    setError(null);
    pull().then(setData).catch(fail);
  };

  if (error) return <p className={`${noteBad} mt-8 px-4 py-3`}>The exchange could not be reached: {error}. Reload to try again.</p>;
  if (!data) return <div className={`${card} mt-8 h-48 animate-pulse`} aria-label="Pulling counts from the state nodes" />;

  const scenario = data.nodes.some((n) => n.scenario);
  return (
    <div className="mt-8 space-y-10">
      {scenario && (
        <p className={`${noteWarn} px-4 py-3 text-[15px]`}>
          <b>Scenario counts.</b> The nodes publish seeded district-week counts so the warning can be shown end to end; no real
          farmer reports them. The pull, the border check and the warning logic are live.
        </p>
      )}

      <section aria-labelledby="warn-h">
        <h2 id="warn-h" className="display text-2xl text-forest">Warnings sent to neighbouring states</h2>
        {data.warnings.length === 0 ? (
          <p className="mt-3 text-muted">No outbreak is rising next to a state border right now.</p>
        ) : (
          <ul className="mt-4 space-y-4">
            {data.warnings.map((w, i) => (
              <li key={i} className={`${noteBad} flex items-start gap-3 p-4`}>
                <TriangleAlert size={16} className="mt-1 shrink-0 text-blight" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="font-semibold">
                    To {w.to.state}: {w.label} rising across the border in {w.from.district}
                  </p>
                  <p className="mt-1 text-[15px]">
                    Weekly reports in {w.from.district} ({w.from.state}):{" "}
                    <span className="condensed font-semibold text-sky">{w.counts.join(" → ")}</span> ({w.weeks[0]} to {w.weeks[w.weeks.length - 1]}).{" "}
                    {w.to.district} shares the border along {w.along}. {w.to.state}&apos;s district officer is warned and can
                    alert farmers in {w.to.district} before the pest arrives.
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="nodes-h">
        <h2 id="nodes-h" className="display text-2xl text-forest">What crossed the border</h2>
        <p className="mt-2 text-[15px] text-muted">{data.rule} Farmer records moved: {data.farmer_records_moved}.</p>
        <div className={`${card} mt-4 overflow-x-auto`}>
          <table className="w-full min-w-[560px] border-collapse text-left text-[15px]">
            <caption className="sr-only">Counts pulled from each state node</caption>
            <thead>
              <tr className="border-b border-rule bg-paper-warm text-sm text-ink-soft">
                <th scope="col" className="px-4 py-2 font-normal">State node</th>
                <th scope="col" className="px-4 py-2 font-normal">Counts accepted</th>
                <th scope="col" className="px-4 py-2 font-normal">Held back at the node (below k)</th>
                <th scope="col" className="px-4 py-2 font-normal">Refused at the border</th>
              </tr>
            </thead>
            <tbody>
              {data.nodes.map((n) => (
                <tr key={n.state} className="border-b border-rule last:border-b-0">
                  <td className="px-4 py-2">
                    <a href={n.url} className={`font-semibold ${link}`}>{n.state}</a>
                    {n.ok && (
                      <a href={`${n.url}/api/exchange/counts`} className={`ml-2 text-sm ${link}`}>
                        what it sent
                      </a>
                    )}
                    {!n.ok && <span className="ml-2 text-sm text-blight">unreachable ({n.error})</span>}
                  </td>
                  <td className="px-4 py-2">{n.accepted}</td>
                  <td className="px-4 py-2">{n.withheldAtNode}</td>
                  <td className="px-4 py-2">{n.refused}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data.counts.length > 0 && (
          <div className={`${card} mt-6 overflow-x-auto`}>
            <table className="w-full min-w-[560px] border-collapse text-left text-[15px]">
              <caption className="sr-only">Every count that crossed</caption>
              <thead>
                <tr className="border-b border-rule bg-paper-warm text-sm text-ink-soft">
                  <th scope="col" className="px-4 py-2 font-normal">State</th>
                  <th scope="col" className="px-4 py-2 font-normal">District</th>
                  <th scope="col" className="px-4 py-2 font-normal">Week</th>
                  <th scope="col" className="px-4 py-2 font-normal">Condition</th>
                  <th scope="col" className="px-4 py-2 font-normal">Reports</th>
                </tr>
              </thead>
              <tbody>
                {data.counts.map((c, i) => (
                  <tr key={i} className="border-b border-rule last:border-b-0">
                    <td className="px-4 py-1.5">{c.state}</td>
                    <td className="px-4 py-1.5">{c.district}</td>
                    <td className="condensed px-4 py-1.5">{c.iso_week}</td>
                    <td className="px-4 py-1.5">{CONDITION_LABELS[c.condition] ?? c.condition}</td>
                    <td className="condensed px-4 py-1.5 font-semibold text-sky">{c.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {data.refusals.length > 0 && (
          <ul className="mt-4 list-disc pl-5 text-[15px] text-muted">
            {data.refusals.map((r, i) => (
              <li key={i}>
                {r.state}: refused, {r.reason}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-4 text-sm text-muted">
          Pulled live at {new Date(data.generated_at).toLocaleString("en-IN")}.{" "}
          <button type="button" onClick={load} className={link}>
            Pull again
          </button>
        </p>
      </section>

      <BorderTest />
    </div>
  );
}

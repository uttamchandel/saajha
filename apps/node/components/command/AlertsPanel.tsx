"use client";

import { useCallback, useEffect, useState } from "react";
import { CloudRain, Sun, Thermometer, Megaphone, RefreshCw, type LucideIcon } from "lucide-react";
import type { AlertsResponse, AlertType, ZoneAlert } from "@/lib/types";
import { CACHED_ALERTS } from "@/lib/opsData";
import { STATE_LANGUAGE } from "@/lib/node";
import type { ComposeTarget } from "./BroadcastComposer";
import { EmptyState, SectionCard, SeverityChip, SkeletonRows, TableShell, Td, Th, fmtDateTime, nf } from "./ui";

const TYPE_META: Record<AlertType, { icon: LucideIcon; label: string }> = {
  dry_spell: { icon: Sun, label: "Dry spell" },
  heavy_rain: { icon: CloudRain, label: "Heavy rain" },
  heatwave: { icon: Thermometer, label: "Heatwave" },
};

function windowLabel(a: ZoneAlert): string {
  const f = (iso: string) => new Date(iso + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  return `${f(a.windowStart)} – ${f(a.windowEnd)}`;
}

export default function AlertsPanel({ district, onCompose }: {
  district: string;
  onCompose: (t: ComposeTarget) => void;
}) {
  const [data, setData] = useState<AlertsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/alerts", { signal: AbortSignal.timeout(12000) });
      if (!res.ok) throw new Error(`alerts ${res.status}`);
      const json = (await res.json()) as AlertsResponse;
      if (!Array.isArray(json.alerts)) throw new Error("bad shape");
      setData(json);
    } catch (err) {
      console.error("alerts fetch failed, using cached scan", err);
      setData(CACHED_ALERTS); // graceful degrade to the cached scan; the console never shows a dead end
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Fetch on mount; load() sets `loading` synchronously before it awaits the network.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const alerts = (data?.alerts ?? []).filter((a) => district === "All districts" || a.district === district);

  return (
    <div className="space-y-4">
      <SectionCard
        title="Active weather alerts"
        sub={data ? `Scanned ${nf.format(data.scannedDistricts)} districts · generated ${fmtDateTime(data.generatedAt)} IST · source: ${data.source === "cached" ? "cached scan" : "Open-Meteo live"}` : "Scanning district forecast grid…"}
        pad={false}
        actions={
          <button onClick={() => void load()} className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50" disabled={loading}>
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} aria-hidden="true" />
            Rescan
          </button>
        }
      >
        {loading ? (
          <SkeletonRows rows={4} />
        ) : alerts.length === 0 ? (
          <EmptyState title={`No active weather alerts for ${district}`} hint="All monitored blocks are within normal forecast ranges." />
        ) : (
          <TableShell>
            <thead>
              <tr>
                <Th>Severity</Th>
                <Th>Type</Th>
                <Th>District</Th>
                <Th>Affected blocks</Th>
                <Th>Window</Th>
                <Th>Evidence</Th>
                <Th right>Farmers in zone</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {alerts.map((a) => {
                const t = TYPE_META[a.type];
                const Icon = t.icon;
                return (
                  <tr key={a.id} className="align-top hover:bg-slate-50">
                    <Td><SeverityChip sev={a.severity} /></Td>
                    <Td>
                      <span className="inline-flex items-center gap-1.5 font-medium text-slate-800">
                        <Icon className="size-3.5 text-slate-400" aria-hidden="true" />
                        {t.label}
                      </span>
                    </Td>
                    <Td>
                      <span className="font-medium text-slate-900">{a.district}</span>
                      <span className="ml-1 text-slate-400">· {a.state}</span>
                    </Td>
                    <Td>
                      <span className="flex max-w-52 flex-wrap gap-1">
                        {a.blocks.map((b) => (
                          <span key={b} className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-600">{b}</span>
                        ))}
                      </span>
                    </Td>
                    <Td className="tabular-nums">{windowLabel(a)}</Td>
                    <Td className="text-xs text-slate-500">
                      <div className="w-72 whitespace-normal">{a.metric}</div>
                    </Td>
                    <Td right className="font-medium text-slate-900">{nf.format(a.farmersInZone)}</Td>
                    <Td>
                      <button
                        onClick={() =>
                          onCompose({
                            kind: "weather",
                            title: `${t.label} ${a.severity} — ${a.district}`,
                            district: a.district,
                            state: a.state,
                            language: STATE_LANGUAGE[a.state] ?? "Hindi",
                            message: a.farmerMessage,
                            // Alert texts are written in Hindi (a few seeded ones in Telugu); Gemini drafts the district's language.
                            messageLanguage: /[\u0C00-\u0C7F]/.test(a.farmerMessage) ? "Telugu" : "Hindi",
                            recipients: a.farmersInZone,
                          })
                        }
                        className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-forest hover:bg-forest/[0.06]"
                      >
                        <Megaphone className="size-3.5" aria-hidden="true" />
                        Compose broadcast
                      </button>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </TableShell>
        )}
      </SectionCard>
      <p className="text-[11px] text-slate-400">Forecasts: Open-Meteo (demo) · IMD Agromet (production)</p>
    </div>
  );
}

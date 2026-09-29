import { Megaphone, TrendingUp } from "lucide-react";
import { OUTBREAK_ROWS } from "@/lib/opsData";
import type { ComposeTarget } from "./BroadcastComposer";
import { EmptyState, SectionCard, SeverityChip, StatusPill, TableShell, Td, Th, nf } from "./ui";

export default function OutbreaksPanel({ district, onCompose }: {
  district: string;
  onCompose: (t: ComposeTarget) => void;
}) {
  const rows = OUTBREAK_ROWS.filter((o) => district === "All districts" || o.district === district);

  return (
    <div className="space-y-4">
      <SectionCard
        title="Disease outbreak clusters"
        sub="Clusters detected from spatially correlated diagnosis queries (≥5 matching reports within radius, 7-day window)"
        pad={false}
      >
        {rows.length === 0 ? (
          <EmptyState title={`No outbreak clusters in ${district}`} hint="Cluster detection runs on every incoming diagnosis query." />
        ) : (
          <TableShell>
            <thead>
              <tr>
                <Th>ID</Th>
                <Th>Severity</Th>
                <Th>Disease</Th>
                <Th>Crop</Th>
                <Th>District</Th>
                <Th>Blocks</Th>
                <Th right>Reports</Th>
                <Th right>Δ week</Th>
                <Th right>Radius</Th>
                <Th right>Farmers in radius</Th>
                <Th>Status</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {rows.map((o) => (
                <tr key={o.id} className="hover:bg-slate-50">
                  <Td className="font-medium tabular-nums text-slate-500">{o.id}</Td>
                  <Td><SeverityChip sev={o.severity} /></Td>
                  <Td className="font-medium text-slate-900">{o.disease}</Td>
                  <Td>{o.crop}</Td>
                  <Td>
                    {o.district}
                    <span className="ml-1 text-slate-400">· {o.state}</span>
                  </Td>
                  <Td>
                    <span className="flex max-w-44 flex-wrap gap-1">
                      {o.blocks.map((b) => (
                        <span key={b} className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-600">{b}</span>
                      ))}
                    </span>
                  </Td>
                  <Td right className="font-medium text-slate-900">{o.reports}</Td>
                  <Td right>
                    <span className="inline-flex items-center gap-1 font-medium text-red-700">
                      <TrendingUp className="size-3" aria-hidden="true" />
                      +{o.deltaPct}%
                    </span>
                  </Td>
                  <Td right>{o.radiusKm} km</Td>
                  <Td right className="font-medium text-slate-900">{nf.format(o.farmersInRadius)}</Td>
                  <Td><StatusPill status={o.status} /></Td>
                  <Td>
                    <button
                      onClick={() =>
                        onCompose({
                          kind: "outbreak",
                          title: `${o.disease} — ${o.blocks.join(", ")} (${o.district})`,
                          district: o.district,
                          state: o.state,
                          language: o.state === "Telangana" || o.state === "Andhra Pradesh" ? "Telugu" : o.state === "Maharashtra" ? "Marathi" : "Hindi",
                          message: o.farmerMessage,
                          recipients: o.farmersInRadius,
                        })
                      }
                      className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-forest hover:bg-forest/[0.06]"
                    >
                      <Megaphone className="size-3.5" aria-hidden="true" />
                      Compose broadcast
                    </button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableShell>
        )}
      </SectionCard>
      <p className="text-[11px] text-slate-400">
        Detection: query-density clustering on AI diagnosis stream (demo) · integrates NPSS pest surveillance (production)
      </p>
    </div>
  );
}

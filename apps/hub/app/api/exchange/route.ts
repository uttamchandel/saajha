// GET /api/exchange?state=Telangana — cross-border early warning, computed live (lib/exchange.ts).
// Pulls every state node's k-anonymous outbreak counts, checks each at the border, and returns the
// accepted counts, what was refused and why, and the warnings for `state` (or for every state).
// Stores nothing. Public: it carries only counts, never a farmer record.
import { NextRequest, NextResponse } from "next/server";
import { NODES, borderCheck, warnings, type Count, type NodePull, type Refusal } from "@/lib/exchange";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const forState = req.nextUrl.searchParams.get("state") ?? undefined;
  const pulls: NodePull[] = [];
  const counts: Count[] = [];
  const refusals: Refusal[] = [];

  await Promise.all(
    NODES.map(async (node) => {
      try {
        const r = await fetch(`${node.url}/api/exchange/counts`, { signal: AbortSignal.timeout(8000), cache: "no-store" });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const checked = borderCheck(await r.json(), node);
        counts.push(...checked.accepted);
        refusals.push(...checked.refused);
        pulls.push({ state: node.state, url: node.url, ok: true, accepted: checked.accepted.length, refused: checked.refused.length, withheldAtNode: checked.withheldAtNode, scenario: checked.scenario });
      } catch (e) {
        pulls.push({ state: node.state, url: node.url, ok: false, accepted: 0, refused: 0, withheldAtNode: 0, scenario: false, error: e instanceof Error ? e.message : String(e) });
      }
    }),
  );

  pulls.sort((a, b) => a.state.localeCompare(b.state));
  return NextResponse.json(
    {
      generated_at: new Date().toISOString(),
      rule: "Only district-week outbreak counts of at least k=5 may cross; no names, numbers, villages or photos.",
      nodes: pulls,
      counts: counts.sort((a, b) => a.state.localeCompare(b.state) || a.district.localeCompare(b.district) || a.iso_week.localeCompare(b.iso_week)),
      refusals,
      farmer_records_moved: 0,
      warnings: warnings(counts, forState),
    },
    { headers: { "Cache-Control": "no-store", "Access-Control-Allow-Origin": "*" } },
  );
}

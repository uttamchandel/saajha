// GET /api/rounds/41 — a released live round's weights, in the same file format as the recorded run's
// heads (public/fl/heads), so nodes load and fingerprint-check it with the same code.
import { NextResponse } from "next/server";
import { liveHead } from "@/lib/registry";

export const dynamic = "force-dynamic";

const HEADERS = { "Access-Control-Allow-Origin": "*" };

export async function GET(_req: Request, ctx: { params: Promise<{ round: string }> }) {
  const round = Number((await ctx.params).round);
  if (!Number.isInteger(round) || round < 1) return NextResponse.json({ error: "not a round number" }, { status: 400, headers: HEADERS });
  const head = await liveHead(round).catch(() => null);
  if (!head) return NextResponse.json({ error: `round ${round} is not a released live round` }, { status: 404, headers: HEADERS });
  // A released round never changes, so it can be cached for good.
  return NextResponse.json(head, { headers: { ...HEADERS, "Cache-Control": "public, max-age=31536000, immutable" } });
}

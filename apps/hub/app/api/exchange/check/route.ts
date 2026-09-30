// POST /api/exchange/check — "Test the border": run the border check on an envelope a visitor writes, as
// if the Maharashtra node had sent it. Returns what would cross and what is refused. Pulls no node and
// stores nothing; the live pull in /api/exchange runs the same borderCheck().
import { NextRequest, NextResponse } from "next/server";
import { NODES, borderCheck } from "@/lib/exchange";

export const dynamic = "force-dynamic";

const AS_NODE = NODES.find((n) => n.state === "Maharashtra") ?? NODES[0];
const MAX_BYTES = 20_000;

export async function POST(req: NextRequest) {
  const raw = await req.text();
  if (raw.length > MAX_BYTES) return NextResponse.json({ error: "envelope too large" }, { status: 413 });
  let env: unknown;
  try {
    env = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  const { accepted, refused } = borderCheck(env, AS_NODE);
  return NextResponse.json({ as_node: AS_NODE.state, accepted, refused }, { headers: { "Cache-Control": "no-store" } });
}

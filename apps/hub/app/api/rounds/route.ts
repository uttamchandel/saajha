// GET /api/rounds — every live round attempt, newest first (released or refused, with why), for the
// federation record. GET /api/rounds?update=<sha256> — the released round that included that update.
import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { listRounds, roundIncluding } from "@/lib/registry";

export const dynamic = "force-dynamic";

const HEADERS = { "Cache-Control": "no-store", "Access-Control-Allow-Origin": "*" };

export async function GET(req: NextRequest) {
  try {
    const update = req.nextUrl.searchParams.get("update");
    if (update) {
      if (!/^[0-9a-f]{64}$/.test(update)) return NextResponse.json({ error: "update must be a sha256" }, { status: 400, headers: HEADERS });
      return NextResponse.json({ update, included_in: await roundIncluding(update) }, { headers: HEADERS });
    }
    return NextResponse.json({ registry: getDb() ? "connected" : "not connected", rounds: await listRounds() }, { headers: HEADERS });
  } catch (err) {
    console.error("rounds GET error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "The model registry could not be read." }, { status: 503, headers: HEADERS });
  }
}

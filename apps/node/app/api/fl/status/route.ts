// GET /api/fl/status — the learning loop from this state's side, for the officer's console: the model
// in use, and how many verified cases are waiting for (or were learned by) a round. Counts only.
import { NextResponse } from "next/server";
import { dbSource, loopStats } from "@/lib/db";
import { hubLatest } from "@/lib/fed/hub";
import { syncLearned } from "@/lib/fed/loop";
import { NODE_STATE } from "@/lib/node";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await syncLearned();
    const [release, stats] = await Promise.all([hubLatest(true), loopStats()]);
    return NextResponse.json({ state: NODE_STATE, storage: dbSource(), release, ...stats }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("fl/status error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "The learning loop's status could not be read." }, { status: 503 });
  }
}

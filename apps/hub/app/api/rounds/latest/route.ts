// GET /api/rounds/latest — the model every state node should use now: the newest released live round,
// or the recorded run's round 40. `recent` also lists the previous release, so a verdict computed a moment
// before a new release is still accepted.
import { NextRequest, NextResponse } from "next/server";
import { latestRelease } from "@/lib/registry";

export const dynamic = "force-dynamic";

const HEADERS = { "Cache-Control": "no-store", "Access-Control-Allow-Origin": "*" };

export async function GET(req: NextRequest) {
  try {
    const r = await latestRelease(req.nextUrl.origin);
    return NextResponse.json(
      {
        round: r.round,
        sha256: r.sha256,
        temperature: r.temperature,
        tau: r.tau,
        head_url: r.headUrl,
        source: r.source,
        recent_sha256: [r.sha256, r.previousSha256].filter(Boolean),
      },
      { headers: HEADERS },
    );
  } catch (err) {
    console.error("rounds/latest error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "The model registry could not be read." }, { status: 503, headers: HEADERS });
  }
}

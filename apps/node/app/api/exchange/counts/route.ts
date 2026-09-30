// GET /api/exchange/counts — this node's k-anonymous outbreak counts, the only outbreak data that
// may cross to the Saajha hub (lib/exchange.ts). Public by design: it carries no farmer data.
import { NextResponse } from "next/server";
import { countsEnvelope } from "@/lib/exchange";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(countsEnvelope(), {
    headers: { "Cache-Control": "no-store", "Access-Control-Allow-Origin": "*" },
  });
}

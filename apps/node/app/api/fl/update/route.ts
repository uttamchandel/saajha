// POST /api/fl/update — this state's contribution to a live round, asked for by the Saajha hub.
// Body: { round, sha256 } of the hub's current release. The node trains that release on the cases its
// experts verified since its last included update (lib/fed/train.ts) and returns only the new weights,
// their fingerprint and the number of cases: no photo, embedding, label or ticket ever leaves.
import { NextRequest, NextResponse } from "next/server";
import { markSent, trainingCases } from "@/lib/db";
import { isClassKey, CLASS_KEYS } from "@/lib/fed/classes";
import { fromB64, hubLatest, NAMES, releasedTensors, sha256Of, toB64 } from "@/lib/fed/hub";
import { syncLearned } from "@/lib/fed/loop";
import { trainLocal, DIM } from "@/lib/fed/train";
import { NODE_STATE } from "@/lib/node";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SHAPES: Record<string, number[]> = { "net.0.bias": [64], "net.0.weight": [64, 1280], "net.2.bias": [10], "net.2.weight": [10, 64] };

export async function POST(req: NextRequest) {
  let body: { round?: unknown; sha256?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "body must be JSON: { round, sha256 }" }, { status: 400 });
  }
  const latest = await hubLatest(true);
  if (!latest) return NextResponse.json({ error: "The Saajha hub could not be reached." }, { status: 503 });
  if (body.round !== latest.round || body.sha256 !== latest.sha256) {
    return NextResponse.json({ error: `Updates are trained only on the hub's current release (round ${latest.round}).` }, { status: 409 });
  }

  await syncLearned();
  const envelope = { schema: "saajha.model_update.v1", node: `saajha-node-${NODE_STATE.toLowerCase()}`, state: NODE_STATE, base_round: latest.round, base_sha256: latest.sha256 };
  const cases = (await trainingCases())
    .filter((c) => isClassKey(c.label)) // "not one of these" is verified but cannot teach the 10-condition model
    .map((c) => ({ id: c.id, x: fromB64(c.embedding), y: CLASS_KEYS.indexOf(c.label as (typeof CLASS_KEYS)[number]) }))
    .filter((c) => c.x.length === DIM && c.x.every(Number.isFinite));
  if (cases.length === 0) return NextResponse.json({ ...envelope, n_cases: 0 }, { headers: { "Cache-Control": "no-store" } });

  try {
    const base = await releasedTensors(latest);
    const { tensors, loss } = trainLocal(base, cases, latest.round);
    const sha256 = sha256Of(tensors);
    await markSent(cases.map((c) => c.id), sha256);
    return NextResponse.json(
      {
        ...envelope,
        n_cases: cases.length,
        tensors: NAMES.map((name) => ({ name, shape: SHAPES[name], dtype: "float32-le", b64: toB64(tensors[name]) })),
        sha256,
        metrics: { loss: Math.round(loss * 1e6) / 1e6 },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    console.error("fl/update error:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "This node could not train on its cases just now." }, { status: 500 });
  }
}

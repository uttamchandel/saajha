// POST /api/rounds/run — run one live federated round across every state node (lib/rounds.ts).
// The hub asks each node for an update trained on the release, checks each at the border, averages
// them, and records the attempt: released with a new fingerprint, or refused with the reason.
import { NextRequest, NextResponse } from "next/server";
import { acquireRoundLock, ensureSchema, getDb, releaseRoundLock } from "@/lib/db";
import { NODES } from "@/lib/exchange";
import { latestRelease, type Contributor } from "@/lib/registry";
import { checkUpdate, computeRound, headFile, sha256Of } from "@/lib/rounds";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "POST, OPTIONS", "Access-Control-Allow-Headers": "Content-Type" };
const reply = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: { ...CORS, "Cache-Control": "no-store" } });

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function POST(req: NextRequest) {
  const sql = getDb();
  if (!sql) return reply({ status: "error", message: "The hub's model registry is not connected, so no round can be recorded." }, 503);
  if (!(await acquireRoundLock())) return reply({ status: "busy", message: "Another round is running. Try again in a minute." }, 409);

  const t0 = Date.now();
  try {
    const base = await latestRelease(req.nextUrl.origin);
    const contributors: Contributor[] = [];
    const included: { n: number; tensors: Record<string, Float32Array> }[] = [];
    let bytes = 0;

    await Promise.all(
      NODES.map(async (node) => {
        try {
          const r = await fetch(`${node.url}/api/fl/update`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ round: base.round, sha256: base.sha256 }),
            signal: AbortSignal.timeout(40_000),
            cache: "no-store",
          });
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          const env = (await r.json()) as Record<string, unknown>;
          if (env.n_cases === 0 && env.state === node.state) {
            contributors.push({ state: node.state, status: "no_cases" });
            return;
          }
          const u = checkUpdate(env, node, base);
          if (!u.ok) {
            contributors.push({ state: node.state, status: "refused", reason: u.reason });
            return;
          }
          included.push({ n: u.n, tensors: u.tensors });
          bytes += u.bytes;
          contributors.push({ state: node.state, status: "included", n_cases: u.n, update_sha256: u.sha256, bytes: u.bytes });
        } catch (e) {
          contributors.push({ state: node.state, status: "unreachable", reason: e instanceof Error ? e.message : String(e) });
        }
      }),
    );
    contributors.sort((a, b) => a.state.localeCompare(b.state));

    if (included.length === 0) {
      return reply({
        status: "nothing",
        base_round: base.round,
        contributors,
        message: "No state has newly verified cases, so there is nothing to learn yet. An expert verifies a case at a state's expert desk first.",
      });
    }

    const out = await computeRound(base, included);
    await ensureSchema();
    const duration = Date.now() - t0;
    if (out.status === "released") {
      const round = base.round + 1;
      const head = headFile(out.tensors, round, out.temperature);
      const rows = (await sql`INSERT INTO sj_rounds
          (round, base_round, status, step, temperature, tau, val_acc_base, val_acc, test_acc_base, test_acc, sha256, head, contributors, bytes_received, duration_ms)
        VALUES (${round}, ${base.round}, 'released', ${out.step}, ${out.temperature}, ${out.tau}, ${out.valBase}, ${out.val}, ${out.testBase}, ${out.test},
          ${sha256Of(out.tensors)}, ${JSON.stringify(head)}::jsonb, ${JSON.stringify(contributors)}::jsonb, ${bytes}, ${duration})
        ON CONFLICT (round) DO NOTHING RETURNING id`) as unknown[];
      if (!rows.length) return reply({ status: "busy", message: `Round ${round} was released a moment ago by another run.` }, 409);
      return reply({
        status: "released",
        round,
        base_round: base.round,
        sha256: head.sha256,
        step: out.step,
        temperature: out.temperature,
        tau: out.tau,
        val_acc: { before: out.valBase, after: out.val },
        test_acc: { before: out.testBase, after: out.test },
        contributors,
        bytes_received: bytes,
        records_moved: 0,
        duration_ms: duration,
      });
    }
    await sql`INSERT INTO sj_rounds
        (base_round, status, reason, step, val_acc_base, val_acc, test_acc_base, test_acc, contributors, bytes_received, duration_ms)
      VALUES (${base.round}, 'refused', ${out.reason}, ${out.step}, ${out.valBase}, ${out.val}, ${out.testBase}, ${out.test},
        ${JSON.stringify(contributors)}::jsonb, ${bytes}, ${duration})`;
    return reply({
      status: "refused",
      base_round: base.round,
      reason: out.reason,
      val_acc: { before: out.valBase, after: out.val },
      test_acc: { before: out.testBase, after: out.test },
      contributors,
      bytes_received: bytes,
      records_moved: 0,
      duration_ms: duration,
    });
  } catch (err) {
    console.error("rounds/run error:", err instanceof Error ? err.message : err);
    return reply({ status: "error", message: "The round could not be completed. Nothing was released." }, 500);
  } finally {
    await releaseRoundLock().catch(() => undefined);
  }
}

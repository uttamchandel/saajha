// Which model is released: the newest live round in the registry (lib/db.ts), or else the recorded
// run's round 40 (public/fl). Nodes follow /api/rounds/latest.
import type { RunFile, HeadFile } from "./contract";
import { ensureSchema, getDb } from "./db";
import { tensorsOf, type Release } from "./rounds";

type Row = Record<string, unknown>;

let recordedP: Promise<Release> | null = null;

/** Round 40 of the recorded Flower run, read from this hub's own static release. */
export function recordedRelease(origin: string): Promise<Release> {
  recordedP ??= (async () => {
    const run = (await (await fetch(`${origin}/fl/run.json`, { cache: "no-store" })).json()) as RunFile;
    const last = run.rounds[run.rounds.length - 1];
    const head = (await (await fetch(`${origin}${last.head_url}`, { cache: "no-store" })).json()) as HeadFile;
    return { round: last.round, sha256: last.weights_sha256, temperature: last.temperature, tau: run.gate.tau_fed, tensors: tensorsOf(head), headUrl: last.head_url, source: "recorded" };
  })();
  recordedP.catch(() => {
    recordedP = null;
  });
  return recordedP;
}

export type LiveRoundRow = {
  id: number;
  created_at: string;
  round: number | null;
  base_round: number;
  status: "released" | "refused";
  reason: string | null;
  step: number | null;
  temperature: number | null;
  tau: number | null;
  val_acc_base: number | null;
  val_acc: number | null;
  test_acc_base: number | null;
  test_acc: number | null;
  sha256: string | null;
  contributors: Contributor[];
  bytes_received: number | null;
  records_moved: number;
  duration_ms: number | null;
};

export type Contributor = { state: string; status: "included" | "no_cases" | "refused" | "unreachable"; n_cases?: number; update_sha256?: string; bytes?: number; reason?: string };

const COLUMNS = "id, created_at, round, base_round, status, reason, step, temperature, tau, val_acc_base, val_acc, test_acc_base, test_acc, sha256, contributors, bytes_received, records_moved, duration_ms";

export async function listRounds(limit = 50): Promise<LiveRoundRow[]> {
  const sql = getDb();
  if (!sql) return [];
  await ensureSchema();
  const rows = (await sql.query(`SELECT ${COLUMNS} FROM sj_rounds ORDER BY id DESC LIMIT $1`, [limit])) as Row[];
  return rows as unknown as LiveRoundRow[];
}

export async function latestRelease(origin: string): Promise<Release & { previousSha256: string | null }> {
  const sql = getDb();
  if (sql) {
    await ensureSchema();
    const rows = (await sql`SELECT round, sha256, temperature, tau, head FROM sj_rounds
      WHERE status = 'released' ORDER BY round DESC LIMIT 2`) as Row[];
    if (rows.length) {
      const r = rows[0];
      const previous = rows[1] ? String(rows[1].sha256) : (await recordedRelease(origin)).sha256;
      return {
        round: Number(r.round),
        sha256: String(r.sha256),
        temperature: Number(r.temperature),
        tau: Number(r.tau),
        tensors: tensorsOf(r.head as HeadFile),
        headUrl: `/api/rounds/${Number(r.round)}`,
        source: "live",
        previousSha256: previous,
      };
    }
  }
  return { ...(await recordedRelease(origin)), previousSha256: null };
}

export async function liveHead(round: number): Promise<HeadFile | null> {
  const sql = getDb();
  if (!sql) return null;
  await ensureSchema();
  const rows = (await sql`SELECT head FROM sj_rounds WHERE status = 'released' AND round = ${round}`) as Row[];
  return rows.length ? (rows[0].head as HeadFile) : null;
}

/** The released round, if any, that included this state's update. */
export async function roundIncluding(updateSha: string): Promise<number | null> {
  const sql = getDb();
  if (!sql) return null;
  await ensureSchema();
  const probe = JSON.stringify([{ update_sha256: updateSha, status: "included" }]);
  const rows = (await sql`SELECT round FROM sj_rounds WHERE status = 'released' AND contributors @> ${probe}::jsonb ORDER BY round LIMIT 1`) as Row[];
  return rows.length ? Number(rows[0].round) : null;
}

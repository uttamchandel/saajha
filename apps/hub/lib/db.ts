// The hub's model registry (Neon Postgres): live federated rounds only. By construction there is no
// farmer table here: a row holds a round's weights, fingerprint, metrics and which states contributed
// how many cases. The recorded 40-round run stays in public/fl as static files.
import { neon } from "@neondatabase/serverless";

type Sql = ReturnType<typeof neon>;
let client: Sql | null | undefined;

export function getDb(): Sql | null {
  if (client === undefined) client = process.env.DATABASE_URL ? neon(process.env.DATABASE_URL) : null;
  return client;
}

let schemaReady: Promise<void> | null = null;

export function ensureSchema(): Promise<void> {
  const sql = getDb();
  if (!sql) return Promise.resolve();
  schemaReady ??= (async () => {
    await sql`CREATE TABLE IF NOT EXISTS sj_rounds (
      id bigserial PRIMARY KEY,
      created_at timestamptz DEFAULT now(),
      round int UNIQUE,
      base_round int NOT NULL,
      status text NOT NULL,
      reason text,
      step real,
      temperature real,
      tau real,
      val_acc_base real,
      val_acc real,
      test_acc_base real,
      test_acc real,
      sha256 text,
      head jsonb,
      contributors jsonb NOT NULL,
      bytes_received int,
      records_moved int DEFAULT 0,
      duration_ms int
    )`;
    await sql`CREATE TABLE IF NOT EXISTS sj_lock (id int PRIMARY KEY, locked_until timestamptz NOT NULL)`;
    await sql`INSERT INTO sj_lock (id, locked_until) VALUES (1, now() - interval '1 minute') ON CONFLICT (id) DO NOTHING`;
  })().catch((err) => {
    schemaReady = null;
    throw err;
  });
  return schemaReady;
}

/** One round at a time across all hub instances: a lease that expires on its own if a run dies. */
export async function acquireRoundLock(): Promise<boolean> {
  const sql = getDb();
  if (!sql) return false;
  await ensureSchema();
  const rows = (await sql`UPDATE sj_lock SET locked_until = now() + interval '90 seconds'
    WHERE id = 1 AND locked_until < now() RETURNING id`) as unknown[];
  return rows.length === 1;
}

export async function releaseRoundLock(): Promise<void> {
  const sql = getDb();
  if (sql) await sql`UPDATE sj_lock SET locked_until = now() - interval '1 second' WHERE id = 1`;
}

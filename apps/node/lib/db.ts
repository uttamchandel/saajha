// Neon Postgres persistence for escalation tickets, broadcasts and the query log.
// The database is shared with another project, so every table is kv_-prefixed.
// When DATABASE_URL is absent, all helpers degrade to per-instance in-memory
// stores (reset on restart/redeploy) so the demo keeps functioning end-to-end.

import { neon } from "@neondatabase/serverless";
import type { EscalationTicket } from "./types";
import type { BroadcastRecord } from "./opsData";
import { HOME_DISTRICT, kendraFor } from "./node";

type Row = Record<string, unknown>;

// ---------------------------------------------------------------------------
// Connection — lazy singleton; null when DATABASE_URL is not configured.
// ---------------------------------------------------------------------------

type Sql = ReturnType<typeof neon>;
let client: Sql | null | undefined;

export function getDb(): Sql | null {
  if (client === undefined) {
    const url = process.env.DATABASE_URL;
    client = url ? neon(url) : null;
  }
  return client;
}

export function dbSource(): "db" | "memory" {
  return getDb() ? "db" : "memory";
}

// ---------------------------------------------------------------------------
// Schema — created once per process (CREATE TABLE IF NOT EXISTS).
// ---------------------------------------------------------------------------

let schemaReady: Promise<void> | null = null;

export function ensureSchema(): Promise<void> {
  const sql = getDb();
  if (!sql) return Promise.resolve();
  if (!schemaReady) {
    schemaReady = (async () => {
      await sql`CREATE TABLE IF NOT EXISTS kv_tickets (
        id text PRIMARY KEY,
        created_at timestamptz DEFAULT now(),
        farmer text,
        village text,
        district text,
        state text,
        channel text,
        crop text,
        ai_diagnosis text,
        confidence int,
        severity text,
        kendra text,
        officer text,
        status text DEFAULT 'pending',
        sla_hours int DEFAULT 48,
        updated_at timestamptz DEFAULT now()
      )`;
      // The learning loop (Saajha step 3): the photo and the model's reading stay in this state's
      // database; an expert's verified label turns the ticket into a training case for the next round.
      await sql`ALTER TABLE kv_tickets
        ADD COLUMN IF NOT EXISTS photo text,
        ADD COLUMN IF NOT EXISTS embedding text,
        ADD COLUMN IF NOT EXISTS model_top text,
        ADD COLUMN IF NOT EXISTS model_p real,
        ADD COLUMN IF NOT EXISTS model_round int,
        ADD COLUMN IF NOT EXISTS gemini_label text,
        ADD COLUMN IF NOT EXISTS gemini_conf int,
        ADD COLUMN IF NOT EXISTS verified_label text,
        ADD COLUMN IF NOT EXISTS verified_by text,
        ADD COLUMN IF NOT EXISTS verified_at timestamptz,
        ADD COLUMN IF NOT EXISTS expert_note text,
        ADD COLUMN IF NOT EXISTS sent_in_update text,
        ADD COLUMN IF NOT EXISTS used_in_round int,
        ADD COLUMN IF NOT EXISTS followup text`;
      await sql`CREATE TABLE IF NOT EXISTS kv_broadcasts (
        id text PRIMARY KEY,
        created_at timestamptz DEFAULT now(),
        kind text,
        title text,
        district text,
        state text,
        language text,
        channels text,
        recipients int,
        message text,
        status text DEFAULT 'queued'
      )`;
      await sql`CREATE TABLE IF NOT EXISTS kv_queries (
        id bigserial PRIMARY KEY,
        created_at timestamptz DEFAULT now(),
        channel text,
        lang text,
        query text,
        response_source text,
        district text
      )`;
    })().catch((err) => {
      schemaReady = null; // allow the next request to retry
      throw err;
    });
  }
  return schemaReady;
}

// ---------------------------------------------------------------------------
// Tickets
// ---------------------------------------------------------------------------

export type NewTicket = {
  farmer?: string;
  village?: string;
  district?: string;
  state?: string;
  channel: EscalationTicket["channel"];
  crop: string;
  aiDiagnosis: string;
  confidence: number;
  severity: EscalationTicket["severity"];
  evidence?: CaseEvidence;
};

/** What an expert needs to verify a photo case, and what the next round trains on. Never leaves the state. */
export type CaseEvidence = {
  photo: string; // JPEG, base64
  embedding: string | null; // 1280 float32 LE, base64: the frozen backbone's reading of the photo
  modelTop: string | null;
  modelP: number | null;
  modelRound: number | null;
  geminiLabel: string | null;
  geminiConf: number | null;
};

export type TicketPatch = {
  status?: EscalationTicket["status"];
  officer?: string;
  kendra?: string;
};

type MemTicket = Omit<EscalationTicket, "slaHoursLeft"> & { slaHours: number; photo: string | null; embedding: string | null; sentInUpdate: string | null };

// In-memory fallback: per-instance only; documented limitation without a DB.
const memTickets: MemTicket[] = [];

function slaLeft(createdAt: string, slaHours: number, status: string): number {
  if (status === "closed") return 0;
  const elapsedH = (Date.now() - new Date(createdAt).getTime()) / 3_600_000;
  return Math.round((slaHours - elapsedH) * 10) / 10;
}

function rowToTicket(r: Row): EscalationTicket {
  const createdAt = new Date(String(r.created_at)).toISOString();
  const status = String(r.status ?? "pending") as EscalationTicket["status"];
  return {
    id: String(r.id),
    createdAt,
    farmer: String(r.farmer ?? "Unregistered farmer"),
    village: String(r.village ?? ""),
    district: String(r.district ?? ""),
    state: String(r.state ?? ""),
    channel: (r.channel ?? "photo") as EscalationTicket["channel"],
    crop: String(r.crop ?? ""),
    aiDiagnosis: String(r.ai_diagnosis ?? ""),
    confidence: Number(r.confidence ?? 0),
    severity: (r.severity ?? "medium") as EscalationTicket["severity"],
    kendra: String(r.kendra ?? ""),
    officer: r.officer == null ? null : String(r.officer),
    status,
    slaHoursLeft: slaLeft(createdAt, Number(r.sla_hours ?? 48), status),
    hasPhoto: Boolean(r.has_photo ?? r.photo),
    trainable: Boolean(r.has_embedding ?? r.embedding),
    modelTop: r.model_top == null ? null : String(r.model_top),
    modelP: r.model_p == null ? null : Number(r.model_p),
    modelRound: r.model_round == null ? null : Number(r.model_round),
    geminiLabel: r.gemini_label == null ? null : String(r.gemini_label),
    geminiConf: r.gemini_conf == null ? null : Number(r.gemini_conf),
    verifiedLabel: r.verified_label == null ? null : String(r.verified_label),
    verifiedBy: r.verified_by == null ? null : String(r.verified_by),
    expertNote: r.expert_note == null ? null : String(r.expert_note),
    usedInRound: r.used_in_round == null ? null : Number(r.used_in_round),
    followup: r.followup == null ? null : (String(r.followup) as EscalationTicket["followup"]),
  };
}

function memToTicket(m: MemTicket): EscalationTicket {
  const { slaHours, photo: _photo, embedding: _embedding, sentInUpdate: _sent, ...t } = m;
  void _photo;
  void _embedding;
  void _sent;
  return { ...t, slaHoursLeft: slaLeft(m.createdAt, slaHours, m.status) };
}

// 4-digit ids above the seeded RSK-24xx range; collisions resolved by retry.
function newTicketId(): string {
  return `RSK-${3000 + Math.floor(Math.random() * 7000)}`;
}

export async function createTicket(input: NewTicket): Promise<EscalationTicket> {
  const farmer = input.farmer?.trim() || "Unregistered farmer";
  // A ticket that names no place lands in this node's home district.
  const village = input.village?.trim() || HOME_DISTRICT.blocks[0] || HOME_DISTRICT.district;
  const district = input.district?.trim() || HOME_DISTRICT.district;
  const state = input.state?.trim() || HOME_DISTRICT.state;
  const kendra = kendraFor(district, state);
  const confidence = Math.max(0, Math.min(100, Math.round(input.confidence)));
  const ev = input.evidence;
  const sql = getDb();

  if (sql) {
    await ensureSchema();
    for (let attempt = 0; attempt < 5; attempt++) {
      const id = newTicketId();
      const rows = (await sql`
        INSERT INTO kv_tickets
          (id, farmer, village, district, state, channel, crop, ai_diagnosis, confidence, severity, kendra,
           photo, embedding, model_top, model_p, model_round, gemini_label, gemini_conf)
        VALUES
          (${id}, ${farmer}, ${village}, ${district}, ${state}, ${input.channel}, ${input.crop},
           ${input.aiDiagnosis}, ${confidence}, ${input.severity}, ${kendra},
           ${ev?.photo ?? null}, ${ev?.embedding ?? null}, ${ev?.modelTop ?? null}, ${ev?.modelP ?? null},
           ${ev?.modelRound ?? null}, ${ev?.geminiLabel ?? null}, ${ev?.geminiConf ?? null})
        ON CONFLICT (id) DO NOTHING
        RETURNING *`) as Row[];
      if (rows.length > 0) return rowToTicket(rows[0]);
    }
    throw new Error("kv_tickets: id collision after 5 attempts");
  }

  let id = newTicketId();
  while (memTickets.some((t) => t.id === id)) id = newTicketId();
  const rec: MemTicket = {
    id,
    createdAt: new Date().toISOString(),
    farmer,
    village,
    district,
    state,
    channel: input.channel,
    crop: input.crop,
    aiDiagnosis: input.aiDiagnosis,
    confidence,
    severity: input.severity,
    kendra,
    officer: null,
    status: "pending",
    slaHours: 48,
    hasPhoto: Boolean(ev?.photo),
    trainable: Boolean(ev?.embedding),
    modelTop: ev?.modelTop ?? null,
    modelP: ev?.modelP ?? null,
    modelRound: ev?.modelRound ?? null,
    geminiLabel: ev?.geminiLabel ?? null,
    geminiConf: ev?.geminiConf ?? null,
    verifiedLabel: null,
    verifiedBy: null,
    expertNote: null,
    usedInRound: null,
    followup: null,
    photo: ev?.photo ?? null,
    embedding: ev?.embedding ?? null,
    sentInUpdate: null,
  };
  memTickets.unshift(rec);
  return memToTicket(rec);
}

export async function listTickets(limit = 100): Promise<EscalationTicket[]> {
  const sql = getDb();
  if (sql) {
    await ensureSchema();
    const rows = (await sql`
      SELECT id, created_at, farmer, village, district, state, channel, crop, ai_diagnosis, confidence, severity,
        kendra, officer, status, sla_hours, model_top, model_p, model_round, gemini_label, gemini_conf,
        verified_label, verified_by, expert_note, used_in_round, followup,
        (photo IS NOT NULL) AS has_photo, (embedding IS NOT NULL) AS has_embedding
      FROM kv_tickets ORDER BY created_at DESC LIMIT ${limit}`) as Row[];
    return rows.map(rowToTicket);
  }
  return memTickets.slice(0, limit).map(memToTicket);
}

export async function updateTicket(id: string, patch: TicketPatch): Promise<EscalationTicket | null> {
  const sql = getDb();
  if (sql) {
    await ensureSchema();
    const rows = (await sql`
      UPDATE kv_tickets SET
        status = COALESCE(${patch.status ?? null}, status),
        officer = COALESCE(${patch.officer ?? null}, officer),
        kendra = COALESCE(${patch.kendra ?? null}, kendra),
        updated_at = now()
      WHERE id = ${id}
      RETURNING *`) as Row[];
    return rows.length > 0 ? rowToTicket(rows[0]) : null;
  }
  const rec = memTickets.find((t) => t.id === id);
  if (!rec) return null;
  if (patch.status) rec.status = patch.status;
  if (patch.officer !== undefined) rec.officer = patch.officer;
  if (patch.kendra) rec.kendra = patch.kendra;
  return memToTicket(rec);
}

// ---------------------------------------------------------------------------
// The learning loop: cases, verification, follow-up, training set
// ---------------------------------------------------------------------------

export type TicketCase = EscalationTicket & { photo: string | null };

/** One ticket with its photo, for the expert desk. */
export async function getTicketCase(id: string): Promise<TicketCase | null> {
  const sql = getDb();
  if (sql) {
    await ensureSchema();
    const rows = (await sql`SELECT * FROM kv_tickets WHERE id = ${id}`) as Row[];
    return rows.length ? { ...rowToTicket(rows[0]), photo: rows[0].photo == null ? null : String(rows[0].photo) } : null;
  }
  const m = memTickets.find((t) => t.id === id);
  return m ? { ...memToTicket(m), photo: m.photo } : null;
}

/** An expert's answer: the verified label makes a photo case trainable in the next round. */
export async function verifyTicket(id: string, v: { label: string; by: string; note: string | null }): Promise<EscalationTicket | null> {
  const sql = getDb();
  if (sql) {
    await ensureSchema();
    const rows = (await sql`
      UPDATE kv_tickets SET verified_label = ${v.label}, verified_by = ${v.by}, verified_at = now(), expert_note = ${v.note},
        officer = COALESCE(officer, ${v.by}), status = 'expert_replied', followup = NULL, sent_in_update = NULL, used_in_round = NULL,
        updated_at = now()
      WHERE id = ${id} RETURNING *`) as Row[];
    return rows.length ? rowToTicket(rows[0]) : null;
  }
  const m = memTickets.find((t) => t.id === id);
  if (!m) return null;
  Object.assign(m, { verifiedLabel: v.label, verifiedBy: v.by, expertNote: v.note, officer: m.officer ?? v.by, status: "expert_replied", followup: null, sentInUpdate: null, usedInRound: null });
  return memToTicket(m);
}

/**
 * The follow-up call ("Did the advice work? 1 yes, 2 no"). A "no" reopens the ticket and takes the case
 * out of training until an expert looks again: a label the field contradicts must not teach the model.
 */
export async function recordFollowup(id: string, answer: "worked" | "did_not_work"): Promise<EscalationTicket | null> {
  const sql = getDb();
  if (sql) {
    await ensureSchema();
    const rows = (answer === "worked"
      ? await sql`UPDATE kv_tickets SET followup = 'worked', status = 'closed', updated_at = now() WHERE id = ${id} RETURNING *`
      : await sql`UPDATE kv_tickets SET followup = 'did_not_work', status = 'pending',
          expert_note = CONCAT_WS(' ', expert_note, '[Follow-up: the farmer said the advice did not work; the earlier label was', verified_label, ']'),
          verified_label = NULL, sent_in_update = NULL, updated_at = now()
        WHERE id = ${id} RETURNING *`) as Row[];
    return rows.length ? rowToTicket(rows[0]) : null;
  }
  const m = memTickets.find((t) => t.id === id);
  if (!m) return null;
  if (answer === "worked") Object.assign(m, { followup: "worked", status: "closed" });
  else Object.assign(m, { followup: "did_not_work", status: "pending", verifiedLabel: null, sentInUpdate: null });
  return memToTicket(m);
}

export type TrainingCase = { id: string; label: string; embedding: string };

/** Verified photo cases not yet learned by a released round. */
export async function trainingCases(): Promise<TrainingCase[]> {
  const sql = getDb();
  if (sql) {
    await ensureSchema();
    const rows = (await sql`SELECT id, verified_label, embedding FROM kv_tickets
      WHERE verified_label IS NOT NULL AND embedding IS NOT NULL AND used_in_round IS NULL
      ORDER BY verified_at, id LIMIT 1000`) as Row[];
    return rows.map((r) => ({ id: String(r.id), label: String(r.verified_label), embedding: String(r.embedding) }));
  }
  return memTickets
    .filter((m) => m.verifiedLabel && m.embedding && m.usedInRound == null)
    .map((m) => ({ id: m.id, label: m.verifiedLabel as string, embedding: m.embedding as string }));
}

/** Remember which update carried which cases, so they are marked learned once a round includes it. */
export async function markSent(ids: string[], updateSha: string): Promise<void> {
  const sql = getDb();
  if (sql) {
    await ensureSchema();
    await sql`UPDATE kv_tickets SET sent_in_update = ${updateSha} WHERE id = ANY(${ids})`;
    return;
  }
  for (const m of memTickets) if (ids.includes(m.id)) m.sentInUpdate = updateSha;
}

export async function sentUpdates(): Promise<string[]> {
  const sql = getDb();
  if (sql) {
    await ensureSchema();
    const rows = (await sql`SELECT DISTINCT sent_in_update FROM kv_tickets
      WHERE sent_in_update IS NOT NULL AND used_in_round IS NULL AND verified_label IS NOT NULL`) as Row[];
    return rows.map((r) => String(r.sent_in_update));
  }
  return [...new Set(memTickets.filter((m) => m.sentInUpdate && m.usedInRound == null && m.verifiedLabel).map((m) => m.sentInUpdate as string))];
}

export async function markUsed(updateSha: string, round: number): Promise<void> {
  const sql = getDb();
  if (sql) {
    await ensureSchema();
    await sql`UPDATE kv_tickets SET used_in_round = ${round} WHERE sent_in_update = ${updateSha} AND verified_label IS NOT NULL`;
    return;
  }
  for (const m of memTickets) if (m.sentInUpdate === updateSha && m.verifiedLabel) m.usedInRound = round;
}

export type LoopStats = { waiting: number; waitingByLabel: Record<string, number>; learned: number; verified: number };

export async function loopStats(): Promise<LoopStats> {
  const sql = getDb();
  let rows: { label: string; used: number | null; trainable: boolean }[];
  if (sql) {
    await ensureSchema();
    rows = ((await sql`SELECT verified_label, used_in_round, (embedding IS NOT NULL) AS trainable FROM kv_tickets
      WHERE verified_label IS NOT NULL`) as Row[]).map((r) => ({ label: String(r.verified_label), used: r.used_in_round == null ? null : Number(r.used_in_round), trainable: Boolean(r.trainable) }));
  } else {
    rows = memTickets.filter((m) => m.verifiedLabel).map((m) => ({ label: m.verifiedLabel as string, used: m.usedInRound ?? null, trainable: Boolean(m.embedding) }));
  }
  const waitingRows = rows.filter((r) => r.trainable && r.used == null);
  const waitingByLabel: Record<string, number> = {};
  for (const r of waitingRows) waitingByLabel[r.label] = (waitingByLabel[r.label] ?? 0) + 1;
  return { waiting: waitingRows.length, waitingByLabel, learned: rows.filter((r) => r.used != null).length, verified: rows.length };
}

// ---------------------------------------------------------------------------
// Broadcasts
// ---------------------------------------------------------------------------

export type NewBroadcast = {
  kind: BroadcastRecord["kind"];
  title: string;
  district: string;
  state: string;
  language: string;
  channels: string[];
  recipients: number;
  message: string;
};

type MemBroadcast = Omit<BroadcastRecord, "sent" | "delivered" | "heard">;

const memBroadcasts: MemBroadcast[] = [];

// Delivery figures are derived, not stored: the demo has no real gateway, so a
// completed send reports the same simulated ratios the ops console uses.
function broadcastStats(status: string, recipients: number, channels: string[]) {
  if (status !== "completed") return { sent: 0, delivered: 0, heard: 0 };
  return {
    sent: recipients,
    delivered: Math.round(recipients * 0.95),
    heard: channels.includes("Voice call") ? Math.round(recipients * 0.72) : 0,
  };
}

function rowToBroadcast(r: Row): BroadcastRecord {
  const channels = String(r.channels ?? "").split(", ").filter(Boolean);
  const status: BroadcastRecord["status"] = r.status === "completed" ? "completed" : "queued";
  const recipients = Number(r.recipients ?? 0);
  return {
    id: String(r.id),
    createdAt: new Date(String(r.created_at)).toISOString(),
    kind: (r.kind ?? "weather") as BroadcastRecord["kind"],
    title: String(r.title ?? ""),
    district: String(r.district ?? ""),
    state: String(r.state ?? ""),
    language: String(r.language ?? ""),
    channels,
    recipients,
    message: String(r.message ?? ""),
    status,
    ...broadcastStats(status, recipients, channels),
  };
}

export async function createBroadcast(input: NewBroadcast): Promise<BroadcastRecord> {
  const channelsText = input.channels.join(", ");
  const recipients = Math.max(0, Math.round(input.recipients));
  const sql = getDb();

  if (sql) {
    await ensureSchema();
    const countRows = (await sql`SELECT count(*)::int AS n FROM kv_broadcasts`) as Row[];
    let seq = 1100 + Number(countRows[0]?.n ?? 0);
    for (let attempt = 0; attempt < 5; attempt++) {
      const id = `BRD-${seq}`;
      const rows = (await sql`
        INSERT INTO kv_broadcasts
          (id, kind, title, district, state, language, channels, recipients, message)
        VALUES
          (${id}, ${input.kind}, ${input.title}, ${input.district}, ${input.state},
           ${input.language}, ${channelsText}, ${recipients}, ${input.message})
        ON CONFLICT (id) DO NOTHING
        RETURNING *`) as Row[];
      if (rows.length > 0) return rowToBroadcast(rows[0]);
      seq += 1 + Math.floor(Math.random() * 20);
    }
    throw new Error("kv_broadcasts: id collision after 5 attempts");
  }

  let seq = 1100 + memBroadcasts.length;
  while (memBroadcasts.some((b) => b.id === `BRD-${seq}`)) seq++;
  const rec: MemBroadcast = {
    id: `BRD-${seq}`,
    createdAt: new Date().toISOString(),
    kind: input.kind,
    title: input.title,
    district: input.district,
    state: input.state,
    language: input.language,
    channels: input.channels,
    recipients,
    message: input.message,
    status: "queued",
  };
  memBroadcasts.unshift(rec);
  return { ...rec, ...broadcastStats(rec.status, recipients, rec.channels) };
}

export async function listBroadcasts(limit = 100): Promise<BroadcastRecord[]> {
  const sql = getDb();
  if (sql) {
    await ensureSchema();
    // Queued sends older than 60s are marked completed on read — deterministic
    // gateway simulation without background jobs.
    await sql`
      UPDATE kv_broadcasts SET status = 'completed'
      WHERE status = 'queued' AND created_at < now() - interval '60 seconds'`;
    const rows = (await sql`
      SELECT * FROM kv_broadcasts ORDER BY created_at DESC LIMIT ${limit}`) as Row[];
    return rows.map(rowToBroadcast);
  }
  const now = Date.now();
  return memBroadcasts.slice(0, limit).map((b) => {
    const status: BroadcastRecord["status"] =
      b.status === "queued" && now - new Date(b.createdAt).getTime() > 60_000 ? "completed" : b.status;
    return { ...b, status, ...broadcastStats(status, b.recipients, b.channels) };
  });
}

// ---------------------------------------------------------------------------
// Query log — fire-and-forget. Never awaited in a request path, never throws;
// total failure cannot affect the response being sent.
// ---------------------------------------------------------------------------

export type QueryLogEntry = {
  channel: "sms" | "call" | "photo" | "voice";
  lang?: string;
  query: string;
  responseSource: string;
  district?: string;
};

export type LoggedQuery = QueryLogEntry & { id: number; createdAt: string };

export async function listQueries(limit = 30): Promise<LoggedQuery[]> {
  const sql = getDb();
  if (!sql) return [];
  await ensureSchema();
  const rows = (await sql`
    SELECT id, created_at, channel, lang, query, response_source, district
    FROM kv_queries ORDER BY created_at DESC LIMIT ${limit}`) as Record<string, unknown>[];
  return rows.map((r) => ({
    id: Number(r.id),
    createdAt: String(r.created_at),
    channel: r.channel as QueryLogEntry["channel"],
    lang: (r.lang as string) ?? undefined,
    query: String(r.query),
    responseSource: String(r.response_source),
    district: (r.district as string) ?? undefined,
  }));
}

export function logQuery(entry: QueryLogEntry): void {
  try {
    const sql = getDb();
    if (!sql) return;
    void ensureSchema()
      .then(
        () => sql`
          INSERT INTO kv_queries (channel, lang, query, response_source, district)
          VALUES (${entry.channel}, ${entry.lang ?? null}, ${entry.query.slice(0, 2000)},
                  ${entry.responseSource}, ${entry.district ?? null})`
      )
      .catch((err: unknown) => {
        console.error("kv_queries log error:", err instanceof Error ? err.message : err);
      });
  } catch (err) {
    console.error("kv_queries log error:", err instanceof Error ? err.message : err);
  }
}

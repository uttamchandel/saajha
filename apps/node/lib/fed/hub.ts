// Server-side view of the Saajha hub's model release (the node's routes use this; the browser uses
// federated.ts). The release is the newest live round, or the recorded run's round 40.
import { createHash } from "node:crypto";

export const HUB = (process.env.NEXT_PUBLIC_HUB_URL ?? "https://saajha-hub.vercel.app").replace(/\/+$/, "");

export type HubRelease = { round: number; sha256: string; temperature: number; tau: number; head_url: string; source: "live" | "recorded"; recent_sha256: string[] };

let cache: { value: HubRelease; expires: number } | null = null;
let lastLive: HubRelease | null = null; // the last release the registry confirmed

/** The hub's current release (cached 30 s so a new round reaches every photo quickly). */
export async function hubLatest(fresh = false): Promise<HubRelease | null> {
  if (!fresh && cache && Date.now() < cache.expires) return cache.value;
  try {
    const r = await fetch(`${HUB}/api/rounds/latest`, { signal: AbortSignal.timeout(15_000), cache: "no-store" });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const value = (await r.json()) as HubRelease;
    cache = { value, expires: Date.now() + 30_000 };
    lastLive = value;
    return value;
  } catch (err) {
    console.error("hub release unavailable:", err instanceof Error ? err.message : err);
    // A slow or unreachable registry must not roll this node back to an older model.
    if (lastLive) return lastLive;
    // An older hub without live rounds: its static release.
    try {
      const r = await fetch(`${HUB}/fl/run.json`, { signal: AbortSignal.timeout(8000), cache: "no-store" });
      if (!r.ok) return null;
      const run = (await r.json()) as { gate: { tau_fed: number }; rounds: { round: number; weights_sha256: string; temperature: number; head_url: string }[] };
      const last = run.rounds[run.rounds.length - 1];
      const value: HubRelease = { round: last.round, sha256: last.weights_sha256, temperature: last.temperature, tau: run.gate.tau_fed, head_url: last.head_url, source: "recorded", recent_sha256: [last.weights_sha256] };
      cache = { value, expires: Date.now() + 30_000 };
      return value;
    } catch {
      return null;
    }
  }
}

export const NAMES = ["net.0.bias", "net.0.weight", "net.2.bias", "net.2.weight"];

export function fromB64(b64: string): Float32Array {
  const buf = Buffer.from(b64, "base64");
  const out = new Float32Array(buf.byteLength / 4);
  for (let i = 0; i < out.length; i++) out[i] = buf.readFloatLE(i * 4);
  return out;
}

export function toB64(a: Float32Array): string {
  const buf = Buffer.alloc(a.length * 4);
  for (let i = 0; i < a.length; i++) buf.writeFloatLE(a[i], i * 4);
  return buf.toString("base64");
}

/** The border inspector's fingerprint: for name in sorted(names): name bytes, then float32 LE bytes. */
export function sha256Of(t: Record<string, Float32Array>): string {
  const h = createHash("sha256");
  for (const name of NAMES) {
    h.update(Buffer.from(name, "utf8"));
    h.update(Buffer.from(toB64(t[name]), "base64"));
  }
  return h.digest("hex");
}

/** The released weights, fingerprint-checked. */
export async function releasedTensors(rel: HubRelease): Promise<Record<string, Float32Array>> {
  const url = /^https?:\/\//.test(rel.head_url) ? rel.head_url : `${HUB}${rel.head_url}`;
  const r = await fetch(url, { signal: AbortSignal.timeout(15_000), cache: "no-store" });
  if (!r.ok) throw new Error(`the released weights could not be fetched (HTTP ${r.status})`);
  const file = (await r.json()) as { tensors: { name: string; b64: string }[]; sha256: string };
  const t: Record<string, Float32Array> = {};
  for (const x of file.tensors) t[x.name] = fromB64(x.b64);
  if (sha256Of(t) !== rel.sha256 || file.sha256 !== rel.sha256) throw new Error("the released weights do not match their fingerprint");
  return t;
}

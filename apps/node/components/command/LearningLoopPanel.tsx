"use client";

// The learning loop from this state's desk (Saajha step 3): the model in use, the verified cases waiting
// for the next round, and a button that asks the Saajha hub to run a federated round across every state.
// Cases stay in this state's database; a round sends only weights.
import { useCallback, useEffect, useState } from "react";
import { ArrowUpRight, LoaderCircle, RefreshCw } from "lucide-react";
import { classLabel, isDiagnosisKey } from "@/lib/fed/classes";
import { HUB_URL } from "@/lib/fed/federated";
import { NODE_STATE } from "@/lib/node";
import { SectionCard, nf } from "./ui";

type Status = {
  state: string;
  storage: "db" | "memory";
  release: { round: number; sha256: string; tau: number; source: "live" | "recorded" } | null;
  waiting: number;
  waitingByLabel: Record<string, number>;
  learned: number;
  verified: number;
};

type Contributor = { state: string; status: "included" | "no_cases" | "refused" | "unreachable"; n_cases?: number; bytes?: number; reason?: string };

export type RoundResult = {
  status: "released" | "refused" | "nothing" | "busy" | "error";
  round?: number;
  base_round?: number;
  sha256?: string;
  step?: number;
  tau?: number;
  test_acc?: { before: number; after: number | null };
  contributors?: Contributor[];
  bytes_received?: number;
  reason?: string;
  message?: string;
};

const pct = (x: number) => `${(x * 100).toFixed(1)}%`;
const label = (k: string) => (isDiagnosisKey(k) ? classLabel(k) : k);

export function ContributorLine({ c }: { c: Contributor }) {
  const text =
    c.status === "included"
      ? `${nf.format(c.n_cases ?? 0)} verified case${c.n_cases === 1 ? "" : "s"} → ${nf.format(c.bytes ?? 0)} bytes of weights`
      : c.status === "no_cases"
        ? "no new verified cases this round"
        : c.status === "refused"
          ? `update refused at the border: ${c.reason}`
          : `could not be reached (${c.reason})`;
  return (
    <li>
      <span className="font-medium text-slate-900">{c.state}:</span> {text}
    </li>
  );
}

export default function LearningLoopPanel() {
  const [status, setStatus] = useState<Status | null>(null);
  const [failed, setFailed] = useState(false);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<RoundResult | null>(null);

  const fetchStatus = useCallback(
    () =>
      fetch("/api/fl/status", { cache: "no-store" }).then((r) => (r.ok ? (r.json() as Promise<Status>) : Promise.reject(new Error(String(r.status))))),
    [],
  );

  useEffect(() => {
    let alive = true;
    fetchStatus()
      .then((s) => alive && setStatus(s))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [fetchStatus]);

  const refresh = () => {
    setFailed(false);
    fetchStatus().then(setStatus).catch(() => setFailed(true));
  };

  const run = async () => {
    setRunning(true);
    setResult(null);
    try {
      const r = await fetch(`${HUB_URL}/api/rounds/run`, { method: "POST", signal: AbortSignal.timeout(70_000) });
      setResult((await r.json()) as RoundResult);
    } catch {
      setResult({ status: "error", message: "The Saajha hub could not be reached, so no round ran." });
    } finally {
      setRunning(false);
      refresh();
    }
  };

  const rel = status?.release;
  return (
    <SectionCard
      title={`Learning loop · ${NODE_STATE}`}
      sub="An expert's verified answer becomes a training case in this state. A federated round sends only weights to the Saajha hub, which releases a new model only if it is no worse on held-out photos."
      actions={
        <button type="button" onClick={refresh} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Refresh the learning loop">
          <RefreshCw className="size-4" aria-hidden="true" />
        </button>
      }
    >
      {failed && <p className="text-sm text-slate-500">The learning loop&apos;s status could not be read just now.</p>}
      {!status && !failed && <div className="h-16 animate-pulse rounded bg-slate-100" aria-label="Loading the learning loop" />}
      {status && (
        <div className="space-y-3 text-[13px] text-slate-700">
          <dl className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-md border border-slate-200 p-3">
              <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Model in use</dt>
              <dd className="mt-1 font-semibold text-slate-900">
                {rel ? `Round ${rel.round}` : "Unavailable"}
                {rel && <span className="ml-1 font-normal text-slate-500">{rel.source === "live" ? "(live round)" : "(recorded Flower run)"}</span>}
              </dd>
              {rel && <dd className="mt-0.5 font-mono text-[11px] text-slate-500">fingerprint {rel.sha256.slice(0, 12)}… · decides at ≥{Math.round(rel.tau * 100)}%</dd>}
            </div>
            <div className="rounded-md border border-slate-200 p-3">
              <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Verified cases waiting</dt>
              <dd className="mt-1 text-lg font-semibold tabular-nums text-slate-900">{nf.format(status.waiting)}</dd>
              {status.waiting > 0 && (
                <dd className="mt-0.5 text-[11px] text-slate-500">
                  {Object.entries(status.waitingByLabel)
                    .map(([k, n]) => `${label(k)} ${n}`)
                    .join(" · ")}
                </dd>
              )}
            </div>
            <div className="rounded-md border border-slate-200 p-3">
              <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Learned by released rounds</dt>
              <dd className="mt-1 text-lg font-semibold tabular-nums text-slate-900">{nf.format(status.learned)}</dd>
              <dd className="mt-0.5 text-[11px] text-slate-500">of {nf.format(status.verified)} verified here</dd>
            </div>
          </dl>
          {status.storage === "memory" && (
            <p className="rounded-md bg-amber-50 px-3 py-2 text-[12px] text-amber-900">This node&apos;s database is not connected: verified cases are kept in server memory only.</p>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={run}
              disabled={running}
              className="inline-flex items-center gap-2 rounded-md bg-forest px-3.5 py-2 text-sm font-semibold text-white hover:bg-leaf disabled:opacity-60"
            >
              {running && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}
              {running ? "Running a federated round…" : "Run a federated round"}
            </button>
            <span className="text-[11px] text-slate-500">Asks every state node for an update. Takes about 10–30 seconds.</span>
          </div>
          {result && <RoundResultCard r={result} />}
        </div>
      )}
    </SectionCard>
  );
}

export function RoundResultCard({ r }: { r: RoundResult }) {
  const tone =
    r.status === "released" ? "border-emerald-200 bg-emerald-50 text-emerald-950" : r.status === "refused" ? "border-amber-200 bg-amber-50 text-amber-950" : "border-slate-200 bg-slate-50 text-slate-800";
  return (
    <div className={`rounded-md border p-3 text-[13px] ${tone}`} aria-live="polite">
      {r.status === "released" && (
        <>
          <p className="font-semibold">
            Round {r.round} released: the next photo in every state uses it.
          </p>
          <p className="mt-1">
            Held-out accuracy {pct(r.test_acc?.before ?? 0)} → {pct(r.test_acc?.after ?? 0)} · server step {r.step} · decides at ≥{Math.round((r.tau ?? 0) * 100)}% · fingerprint{" "}
            <span className="font-mono">{r.sha256?.slice(0, 12)}…</span> · farmer records moved: 0
          </p>
        </>
      )}
      {r.status === "refused" && (
        <>
          <p className="font-semibold">Not released. {r.reason}</p>
          <p className="mt-1">The verified cases stay in their states and count again in the next round.</p>
        </>
      )}
      {(r.status === "nothing" || r.status === "busy" || r.status === "error") && <p>{r.message}</p>}
      {r.contributors && r.contributors.length > 0 && (
        <ul className="mt-2 space-y-0.5">
          {r.contributors.map((c) => (
            <ContributorLine key={c.state} c={c} />
          ))}
        </ul>
      )}
      {(r.status === "released" || r.status === "refused") && (
        <a href={`${HUB_URL}/federation#live-rounds`} className="mt-2 inline-flex items-center gap-0.5 font-medium underline underline-offset-2">
          See it in the federation record <ArrowUpRight className="size-3.5" aria-hidden="true" />
        </a>
      )}
    </div>
  );
}

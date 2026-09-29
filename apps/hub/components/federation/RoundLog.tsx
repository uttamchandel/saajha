"use client";

// Section 5: the round log, with in-browser verification of every round's weights.
// Weight files are fetched only when a Verify button is used.
import { useEffect, useRef, useState } from "react";
import type { RoundEntry, RunFile, StateId } from "@/lib/contract";
import { bytesLabel, grouped, pct } from "@/lib/fl";
import { fetchHead, verifyHeadSha } from "@/lib/heads";
import { btnPrimary, btnSecondary, capitalize, countWord, trainingRounds } from "./shared";

type Check = { s: "checking" } | { s: "match" } | { s: "mismatch" } | { s: "error"; msg: string };

const DEFAULT_ROWS = 10;
const PARALLEL = 4;

/** Download a weight file, recompute its SHA-256 here, and compare with the fingerprint logged for it. */
async function checkWeights(url: string, expected: string): Promise<Check> {
  try {
    const head = await fetchHead(url);
    const selfConsistent = await verifyHeadSha(head);
    return selfConsistent && head.file.sha256 === expected ? { s: "match" } : { s: "mismatch" };
  } catch (e) {
    return { s: "error", msg: e instanceof Error ? e.message : String(e) };
  }
}

function Status({ c }: { c: Check | undefined }) {
  if (!c) return null;
  if (c.s === "checking") return <span className="text-sm text-muted">checking…</span>;
  if (c.s === "match")
    return (
      <span className="inline-flex items-center gap-1 text-[15px] font-semibold text-shoot">
        <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
          <path d="M2 7.5 L5.5 11 L12 3.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        matches
      </span>
    );
  if (c.s === "mismatch") return <span className="text-[15px] font-semibold text-blight">does not match</span>;
  return (
    <span className="text-sm text-blight" title={c.msg}>
      could not load
    </span>
  );
}

function perStateBytes(r: RoundEntry): string {
  const entries = Object.entries(r.update_bytes).filter((e): e is [string, number] => e[1] != null);
  if (entries.length === 0) return "0";
  const vals = new Set(entries.map((e) => e[1]));
  if (vals.size === 1) return grouped(entries[0][1]);
  return entries
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([s, v]) => `${s} ${grouped(v)}`)
    .join(", ");
}

export default function RoundLog({ run }: { run: RunFile }) {
  const rounds = trainingRounds(run);
  const S: StateId = run.hero.state;
  const [showAll, setShowAll] = useState(false);
  const [checks, setChecks] = useState<Record<string, Check>>({});
  const [bulk, setBulk] = useState<{ running: boolean; done: number; total: number } | null>(null);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const setCheck = (key: string, c: Check) => {
    if (alive.current) setChecks((prev) => ({ ...prev, [key]: c }));
  };

  async function verifyOne(key: string, url: string, expected: string) {
    setCheck(key, { s: "checking" });
    const c = await checkWeights(url, expected);
    setCheck(key, c);
    return c;
  }

  async function verifyAll() {
    const queue = [...rounds];
    let done = 0;
    setBulk({ running: true, done: 0, total: queue.length });
    const worker = async () => {
      for (let r = queue.shift(); r; r = queue.shift()) {
        await verifyOne(`r${r.round}`, r.head_url, r.weights_sha256);
        done += 1;
        if (alive.current) setBulk({ running: true, done, total: rounds.length });
      }
    };
    await Promise.all(Array.from({ length: PARALLEL }, worker));
    if (alive.current) setBulk({ running: false, done, total: rounds.length });
  }

  const roundChecks = rounds.map((r) => checks[`r${r.round}`]);
  const nMatch = roundChecks.filter((c) => c?.s === "match").length;
  const bad = rounds.filter((r) => {
    const c = checks[`r${r.round}`];
    return c?.s === "mismatch";
  });
  const failed = rounds.filter((r) => checks[`r${r.round}`]?.s === "error");
  const visible = showAll ? rounds : rounds.slice(0, DEFAULT_ROWS);
  const estDownload = bytesLabel(Math.round((run.head.bytes_fp32 * 4) / 3) * rounds.length);
  const nStates = run.states.length;
  const example = rounds[0];

  const th = "px-3 py-2 text-left align-bottom text-sm font-normal text-muted";
  const td = "px-3 py-2 align-middle";

  return (
    <div>
      <p className="mt-4 max-w-[64ch] text-[17px] text-muted">
        One row per round, as the aggregator logged it. <strong className="font-semibold text-ink">All traffic</strong>{" "}
        counts each state&apos;s update going up and the averaged model coming back down to each of the{" "}
        {countWord(nStates)} states
        {example && (
          <>
            {" "}
            ({grouped(example.bytes_on_wire_total)} bytes in round {example.round})
          </>
        )}
        .
      </p>
      <p className="mt-3 max-w-[64ch] text-[17px]">
        <strong className="font-semibold">Verify</strong> downloads that round&apos;s weight file, recomputes its SHA-256
        fingerprint in your browser and compares it with the fingerprint the aggregator logged. A match proves the weights
        this site uses are byte-for-byte the weights the aggregator recorded.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
        <button type="button" className={btnPrimary} onClick={verifyAll} disabled={bulk?.running}>
          {bulk?.running ? "Verifying…" : `Verify all ${rounds.length} rounds`}
        </button>
        <span className="text-sm text-muted">Downloads {rounds.length} weight files, about {estDownload}.</span>
      </div>
      <div className="mt-3 min-h-[1.75rem]" aria-live="polite">
        {bulk && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[15px]">
            <progress value={bulk.done} max={bulk.total} className="h-2 w-48 accent-[var(--ink)]" aria-label="Verification progress" />
            <span>
              Checked {bulk.done} of {bulk.total}.{" "}
              {!bulk.running &&
                (bad.length === 0 && failed.length === 0 && nMatch === rounds.length ? (
                  <span className="font-semibold text-shoot">
                    All {rounds.length} rounds match the fingerprints the aggregator logged.
                  </span>
                ) : (
                  <span className="font-semibold text-blight">
                    {bad.length > 0 && `${bad.length} ${bad.length === 1 ? "round does" : "rounds do"} not match (${bad.map((r) => r.round).join(", ")}). `}
                    {failed.length > 0 && `${failed.length} could not be loaded; check your connection and reload the page.`}
                  </span>
                ))}
            </span>
          </div>
        )}
      </div>

      <div
        className="mt-4 relative overflow-x-auto rounded-md border border-rule bg-sheet"
        role="region"
        aria-labelledby="log-caption"
        tabIndex={0}
      >
        <table className="w-full min-w-[920px] border-collapse text-[15px]">
          <caption id="log-caption" className="sr-only">
            Federation round log: duration, bytes sent, farmer records sent, accuracy and weights fingerprint for each
            round
          </caption>
          <thead>
            <tr className="border-b border-rule">
              <th scope="col" className={th}>
                Round
              </th>
              <th scope="col" className={th}>
                Time (s)
              </th>
              <th scope="col" className={th}>
                Each state sent (bytes)
              </th>
              <th scope="col" className={th}>
                All traffic (bytes)
              </th>
              <th scope="col" className={th}>
                Farmer records sent
              </th>
              <th scope="col" className={th}>
                All states accuracy
              </th>
              <th scope="col" className={th}>
                State {S}, never recorded
              </th>
              <th scope="col" className={th}>
                Weights fingerprint
              </th>
              <th scope="col" className={th}>
                <span className="sr-only">Verification</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {visible.map((r) => {
              const key = `r${r.round}`;
              const c = checks[key];
              return (
                <tr key={r.round} className="border-t border-rule first:border-t-0">
                  <th scope="row" className={`${td} text-left font-semibold`}>
                    {r.round}
                  </th>
                  <td className={td}>{r.duration_s.toFixed(1)}</td>
                  <td className={td}>{perStateBytes(r)}</td>
                  <td className={td}>{grouped(r.bytes_on_wire_total)}</td>
                  <td className={`${td} font-semibold`}>{grouped(r.raw_rows_transmitted)}</td>
                  <td className={td}>{pct(r.global.acc_all, 1)}</td>
                  <td className={td}>{pct(r.per_state[S]?.acc_unseen, 1)}</td>
                  <td className={td}>
                    <span title={r.weights_sha256} className="tracking-wide">
                      {r.weights_sha256.slice(0, 12)}
                    </span>
                  </td>
                  <td className={`${td} whitespace-nowrap`}>
                    <span className="flex min-w-[10rem] items-center gap-3">
                      <button
                        type="button"
                        className={btnSecondary}
                        onClick={() => verifyOne(key, r.head_url, r.weights_sha256)}
                        disabled={c?.s === "checking"}
                        aria-label={`Verify round ${r.round} weights`}
                      >
                        Verify
                      </button>
                      <Status c={c} />
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {rounds.length > DEFAULT_ROWS && (
        <button type="button" className={`${btnSecondary} mt-4`} onClick={() => setShowAll((v) => !v)} aria-expanded={showAll}>
          {showAll ? `Show rounds 1 to ${DEFAULT_ROWS} only` : `Show all ${rounds.length} rounds`}
        </button>
      )}
      <p className="mt-4 max-w-[64ch] text-sm text-muted">
        Fingerprints are the first 12 characters of each SHA-256; hover to see all 64, or open run.json below for every fingerprint in full. Round 0, the untrained
        starting model, sent nothing and is not listed. {capitalize(countWord(nStates))} own-data-only models, the
        &ldquo;before&rdquo; column above, can be checked the same way:
      </p>
      <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-3">
        {run.states.map((s) => {
          const m = run.local_models[s.id];
          if (!m) return null;
          const key = `local${s.id}`;
          const c = checks[key];
          return (
            <li key={s.id} className="flex items-center gap-3 text-[15px]">
              <span>
                State {s.id} <span className="text-muted" title={m.sha256}>{m.sha256.slice(0, 12)}</span>
              </span>
              <button
                type="button"
                className={btnSecondary}
                onClick={() => verifyOne(key, m.head_url, m.sha256)}
                disabled={c?.s === "checking"}
                aria-label={`Verify State ${s.id}'s own-data-only weights`}
              >
                Verify
              </button>
              <Status c={c} />
            </li>
          );
        })}
      </ul>
    </div>
  );
}

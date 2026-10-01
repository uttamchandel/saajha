"use client";

// Live rounds after the recorded run (Saajha step 3): every attempt the deployed network made to learn
// from cases its state experts verified, released or refused, with why. Data: /api/rounds.
import { useCallback, useEffect, useState } from "react";
import { btnPrimary, card, lede, noteBad, noteGood } from "@/lib/ui";
import { Section } from "./shared";

type Contributor = { state: string; status: "included" | "no_cases" | "refused" | "unreachable"; n_cases?: number; bytes?: number; reason?: string };
type Row = {
  id: number;
  created_at: string;
  round: number | null;
  base_round: number;
  status: "released" | "refused";
  reason: string | null;
  step: number | null;
  tau: number | null;
  test_acc_base: number | null;
  test_acc: number | null;
  sha256: string | null;
  contributors: Contributor[];
  bytes_received: number | null;
  records_moved: number;
};
type RunResult = { status: string; round?: number; reason?: string; message?: string };

const pct = (x: number | null) => (x == null ? "—" : `${(x * 100).toFixed(1)}%`);
const nf = new Intl.NumberFormat("en-IN");

function who(cs: Contributor[]): string {
  const inc = cs.filter((c) => c.status === "included");
  return inc.length ? inc.map((c) => `${c.state} (${c.n_cases} case${c.n_cases === 1 ? "" : "s"})`).join(", ") : "—";
}

export default function LiveRounds() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [registry, setRegistry] = useState<string>("connected");
  const [error, setError] = useState(false);
  const [running, setRunning] = useState(false);
  const [last, setLast] = useState<RunResult | null>(null);

  const fetchRows = useCallback(
    () => fetch("/api/rounds", { cache: "no-store" }).then((r) => (r.ok ? (r.json() as Promise<{ registry: string; rounds: Row[] }>) : Promise.reject(new Error(String(r.status))))),
    [],
  );

  useEffect(() => {
    let alive = true;
    fetchRows()
      .then((d) => {
        if (!alive) return;
        setRows(d.rounds);
        setRegistry(d.registry);
      })
      .catch(() => alive && setError(true));
    return () => {
      alive = false;
    };
  }, [fetchRows]);

  const run = async () => {
    setRunning(true);
    setLast(null);
    try {
      const r = await fetch("/api/rounds/run", { method: "POST" });
      setLast((await r.json()) as RunResult);
    } catch {
      setLast({ status: "error", message: "The round could not be started." });
    } finally {
      setRunning(false);
      fetchRows()
        .then((d) => setRows(d.rounds))
        .catch(() => setError(true));
    }
  };

  return (
    <Section id="live-rounds" title="Live rounds, after the recorded run">
      <p className={`${lede} mt-3 max-w-[70ch]`}>
        The deployed network keeps learning. When a state&apos;s expert verifies a farmer&apos;s photo, the case stays in that
        state. A round asks every state node to train the released model on its newly verified cases and send back only the
        weights; the hub averages them, takes the largest step toward the average that keeps accuracy on 516 validation
        photos, and releases the round only if accuracy on 1,549 held-out photos has not fallen by more than 0.5 points.
      </p>
      <p className="mt-3 max-w-[70ch] text-[15px] text-muted">
        Why a step: applied in full, a few new cases undo what 16,536 recorded cases taught (held-out accuracy fell as low
        as 17% in our tests). The same maths runs in the deployed code and in the Python/Flower reference, checked to
        within float32 rounding by <span className="condensed">fl/scripts/check_live_round.py</span>.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button type="button" onClick={run} disabled={running || registry !== "connected"} className={btnPrimary}>
          {running ? "Running a round across the state nodes…" : "Run a round now"}
        </button>
        <span className="text-sm text-muted">It learns only if a state has verified new cases: verify one at a state node&apos;s expert desk first.</span>
      </div>
      {last && (
        <p
          className={`${last.status === "released" ? noteGood : last.status === "refused" ? noteBad : card} mt-3 px-4 py-3 text-[15px]`}
          aria-live="polite"
        >
          {last.status === "released" ? `Round ${last.round} released.` : last.status === "refused" ? `Not released: ${last.reason}` : last.message}
        </p>
      )}

      {error && <p className="mt-6">The live rounds could not be loaded just now.</p>}
      {registry !== "connected" && <p className="mt-6">The model registry is not connected on this deployment.</p>}
      {rows && rows.length === 0 && <p className="mt-6 text-muted">No live round yet: round 40 of the recorded run is the model in use.</p>}
      {rows && rows.length > 0 && (
        <div className="mt-6">
          <div className={`${card} overflow-x-auto`}>
            <table className="w-full min-w-[760px] border-collapse text-left text-[15px]">
              <caption className="sr-only">Live federated rounds, newest first</caption>
              <thead>
                <tr className="border-b border-rule bg-paper-warm text-sm text-ink-soft">
                  <th scope="col" className="py-2 pl-4 pr-4 font-normal">When</th>
                  <th scope="col" className="py-2 pr-4 font-normal">Outcome</th>
                  <th scope="col" className="py-2 pr-4 font-normal">Verified cases from</th>
                  <th scope="col" className="py-2 pr-4 font-normal">Held-out accuracy</th>
                  <th scope="col" className="py-2 pr-4 font-normal">Weights received</th>
                  <th scope="col" className="py-2 pr-4 font-normal">Fingerprint</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-rule align-top last:border-b-0">
                    <td className="py-2 pl-4 pr-4 whitespace-nowrap">{new Date(r.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</td>
                    <td className="py-2 pr-4">
                      {r.status === "released" ? (
                        <span className="font-semibold text-shoot">Round {r.round} released</span>
                      ) : (
                        <span>
                          <span className="font-semibold text-blight">Refused</span>
                          <span className="block text-sm text-muted">{r.reason}</span>
                        </span>
                      )}
                      {r.step != null && r.status === "released" && <span className="block text-sm text-muted">step {r.step} from round {r.base_round}</span>}
                    </td>
                    <td className="py-2 pr-4">{who(r.contributors)}</td>
                    <td className="condensed py-2 pr-4 whitespace-nowrap">
                      {pct(r.test_acc_base)} → {pct(r.test_acc)}
                    </td>
                    <td className="condensed py-2 pr-4">{r.bytes_received ? `${nf.format(r.bytes_received)} B` : "—"}</td>
                    <td className="condensed py-2 pr-4 font-mono text-[13px]">{r.sha256 ? `${r.sha256.slice(0, 12)}…` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-sm text-muted">Farmer records moved in every live round: 0. Only weights, fingerprints and case counts crossed.</p>
        </div>
      )}
    </Section>
  );
}

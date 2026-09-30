"use client";

// "Test the border": send the hub an envelope as if you were Maharashtra's node and see what it accepts
// and what it refuses. POST /api/exchange/check runs the same border check as the live pull.
import { useState } from "react";

type Verdict = { accepted: { district: string; condition: string; count: number }[]; refused: { reason: string }[] };
type Result = { status: "pending" } | { status: "done"; verdict: Verdict } | { status: "error"; message: string };

const count = { district: "Yavatmal", iso_week: "2026-W40", condition: "pink_bollworm", count: 31 };
const envelope = (c: Record<string, unknown>, state = "Maharashtra") => ({ schema: "saajha.outbreak_counts.v1", state, k: 5, counts: [c] });

const CASES = [
  { id: "valid", label: "A district's weekly count", body: envelope(count) },
  { id: "phone", label: "The same count with a farmer's phone number", body: envelope({ ...count, farmer_phone: "+91 90000 00000" }) },
  { id: "small", label: "A count of 3, small enough to point to a farmer", body: envelope({ ...count, count: 3 }) },
  { id: "name", label: "A farmer's name where the district goes", body: envelope({ ...count, district: "Ramesh Patil" }) },
  { id: "state", label: "Maharashtra's node sending Telangana's counts", body: envelope({ ...count, district: "Adilabad" }, "Telangana") },
];

export default function BorderTest() {
  const [active, setActive] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  const send = (id: string) => {
    const c = CASES.find((x) => x.id === id);
    if (!c) return;
    setActive(id);
    setResult({ status: "pending" });
    fetch("/api/exchange/check", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(c.body) })
      .then((r) => (r.ok ? (r.json() as Promise<Verdict>) : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((verdict) => setResult({ status: "done", verdict }))
      .catch((e) => setResult({ status: "error", message: e instanceof Error ? e.message : String(e) }));
  };

  const shown = CASES.find((x) => x.id === active);
  return (
    <section aria-labelledby="test-h">
      <h2 id="test-h" className="display text-2xl">Test the border yourself</h2>
      <p className="mt-2 max-w-[68ch] text-[15px] text-muted">
        Send the hub an envelope as if you were Maharashtra&apos;s node. It runs the same check as the live pull above and
        stores nothing.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {CASES.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => send(c.id)}
            aria-pressed={c.id === active}
            className={`rounded-md border px-3 py-2 text-left text-[15px] ${c.id === active ? "border-ink ring-2 ring-ink" : "border-rule hover:border-carbon"}`}
          >
            {c.label}
          </button>
        ))}
      </div>
      {shown && (
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-sm text-muted">What the node sends</p>
            <pre className="mt-1 overflow-x-auto rounded-md bg-sheet p-4 text-[13px] leading-snug">{JSON.stringify(shown.body, null, 2)}</pre>
          </div>
          <div aria-live="polite">
            <p className="text-sm text-muted">What the hub does</p>
            {result?.status === "pending" && <p className="mt-2">Checking at the border…</p>}
            {result?.status === "error" && <p className="mt-2">The check could not run: {result.message}.</p>}
            {result?.status === "done" && result.verdict.refused.length > 0 && (
              <div className="mt-2 rounded-md border-l-[3px] border-blight bg-sheet p-4">
                <p className="font-semibold">
                  Refused at the border.{" "}
                  {result.verdict.accepted.length === 0
                    ? "Nothing in this envelope crossed."
                    : `Only ${result.verdict.accepted.length} of its counts crossed.`}
                </p>
                <ul className="mt-1 list-disc pl-5 text-[15px]">
                  {result.verdict.refused.map((r, i) => (
                    <li key={i}>{r.reason}</li>
                  ))}
                </ul>
              </div>
            )}
            {result?.status === "done" && result.verdict.refused.length === 0 && (
              <div className="mt-2 rounded-md border-l-[3px] border-shoot bg-sheet p-4">
                <p className="font-semibold">
                  Accepted. {result.verdict.accepted.length} count{result.verdict.accepted.length === 1 ? "" : "s"} may cross.
                </p>
                <p className="mt-1 text-[15px]">
                  {result.verdict.accepted.map((a) => `${a.district}: ${a.count} reports`).join("; ")}. No name, number, village or photo.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

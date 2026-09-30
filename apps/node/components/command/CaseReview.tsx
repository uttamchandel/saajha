"use client";

// The expert desk for one live photo case (Saajha step 3): the farmer's photo, the shared model's and
// Gemini's readings, the expert's verified label (which makes the case a training case for the next
// federated round) and the follow-up call ("Did the advice work?"), where a "no" reopens the case.
import { useEffect, useState } from "react";
import { BadgeCheck, LoaderCircle, PhoneCall } from "lucide-react";
import type { EscalationTicket } from "@/lib/types";
import { CLASSES, UNSURE_KEY, classLabel, isDiagnosisKey } from "@/lib/fed/classes";

type Case = EscalationTicket & { photo: string | null };

const label = (k: string | null | undefined) => (k && isDiagnosisKey(k) ? classLabel(k) : (k ?? ""));

async function patch(body: Record<string, unknown>): Promise<EscalationTicket> {
  const r = await fetch("/api/tickets", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const d = (await r.json()) as { ticket?: EscalationTicket; error?: string };
  if (!r.ok || !d.ticket) throw new Error(d.error ?? `HTTP ${r.status}`);
  return d.ticket;
}

export default function CaseReview({ ticket, onReplace }: { ticket: EscalationTicket; onReplace: (t: EscalationTicket) => void }) {
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoState, setPhotoState] = useState<"loading" | "ready" | "none">("loading");
  const [choice, setChoice] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    fetch(`/api/tickets?id=${encodeURIComponent(ticket.id)}`)
      .then((r) => (r.ok ? (r.json() as Promise<{ ticket: Case }>) : Promise.reject(new Error(String(r.status)))))
      .then((d) => {
        if (!alive) return;
        setPhoto(d.ticket.photo);
        setPhotoState(d.ticket.photo ? "ready" : "none");
      })
      .catch(() => alive && setPhotoState("none"));
    return () => {
      alive = false;
    };
  }, [ticket.id]);

  const act = async (body: Record<string, unknown>) => {
    setBusy(true);
    setError(null);
    try {
      onReplace(await patch({ id: ticket.id, ...body }));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const verified = ticket.verifiedLabel;
  return (
    <div className="grid gap-4 lg:grid-cols-[200px_1fr]" onClick={(e) => e.stopPropagation()}>
      <div className="h-40 w-48 overflow-hidden rounded-md border border-slate-200 bg-white">
        {photoState === "ready" && photo ? (
          // eslint-disable-next-line @next/next/no-img-element -- a data URL from this state's own database
          <img src={`data:image/jpeg;base64,${photo}`} alt={`Farmer's crop photo for ticket ${ticket.id}`} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-[11px] text-slate-400">{photoState === "loading" ? "Loading photo…" : "No photo kept"}</div>
        )}
      </div>

      <div className="min-w-0 space-y-3 text-[13px] text-slate-700">
        <div className="space-y-1">
          {ticket.modelTop && (
            <p>
              <span className="font-medium text-slate-900">Shared model{ticket.modelRound ? ` (round ${ticket.modelRound})` : ""}:</span> {label(ticket.modelTop)}{" "}
              {ticket.modelP != null && <span className="tabular-nums">{Math.round(ticket.modelP * 100)}%</span>}
            </p>
          )}
          {ticket.geminiLabel && (
            <p>
              <span className="font-medium text-slate-900">Gemini&apos;s second opinion:</span> {label(ticket.geminiLabel)}{" "}
              {ticket.geminiConf != null && <span className="tabular-nums">{ticket.geminiConf}%</span>}
            </p>
          )}
          <p className="whitespace-normal text-slate-600">{ticket.aiDiagnosis}</p>
          {!ticket.trainable && (
            <p className="text-[12px] text-slate-500">
              No model reading was kept with this photo (it came from WhatsApp, was not paddy, or the model could not run on the farmer&apos;s phone), so an expert can answer it but it cannot train the model.
            </p>
          )}
        </div>

        {!verified ? (
          <form
            className="space-y-2 rounded-md border border-slate-200 bg-white p-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (choice) void act({ action: "verify", label: choice, note });
            }}
          >
            <label htmlFor={`verify-${ticket.id}`} className="block text-xs font-medium text-slate-700">
              What does the expert see in the photo?
            </label>
            <select
              id={`verify-${ticket.id}`}
              value={choice}
              onChange={(e) => setChoice(e.target.value)}
              className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-[13px] focus:border-forest focus:outline-none"
            >
              <option value="">Choose the condition</option>
              {CLASSES.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
              <option value={UNSURE_KEY}>Not one of these / cannot tell from the photo</option>
            </select>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={500}
              placeholder="Note for the farmer's reply (optional)"
              aria-label="Expert note"
              className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-[13px] focus:border-forest focus:outline-none"
            />
            <button
              type="submit"
              disabled={!choice || busy}
              className="inline-flex items-center gap-1.5 rounded-md bg-forest px-3 py-1.5 text-xs font-semibold text-white hover:bg-leaf disabled:opacity-50"
            >
              {busy ? <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" /> : <BadgeCheck className="size-3.5" aria-hidden="true" />}
              Verify case
            </button>
            <p className="text-[11px] text-slate-500">
              The case (photo and answer) stays in this state&apos;s database. {ticket.trainable ? "It trains the next federated round; only weights leave the state." : ""}
            </p>
          </form>
        ) : (
          <div className="space-y-2 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-emerald-950">
            <p>
              <span className="font-semibold">Verified by {ticket.verifiedBy ?? "the state expert"}:</span> {label(verified)}
              {ticket.expertNote && <span className="text-emerald-900/80"> · {ticket.expertNote}</span>}
            </p>
            <p className="text-[12px]">
              {ticket.usedInRound
                ? `Learned by round ${ticket.usedInRound}, which every state now uses.`
                : ticket.trainable && verified !== UNSURE_KEY
                  ? "Waiting for the next federated round (Learning loop, above)."
                  : "Answered; not a training case for the paddy model."}
            </p>
            <div className="border-t border-emerald-200 pt-2">
              <p className="flex items-center gap-1.5 text-[12px] font-medium">
                <PhoneCall className="size-3.5" aria-hidden="true" />
                Follow-up call to the farmer (simulated): &ldquo;Did the advice work? Press 1 for yes, 2 for no.&rdquo;
              </p>
              {ticket.followup === "worked" ? (
                <p className="mt-1 text-[12px]">The farmer pressed 1: it worked. Ticket closed.</p>
              ) : (
                <div className="mt-1.5 flex flex-wrap gap-2">
                  <button type="button" disabled={busy} onClick={() => void act({ action: "followup", answer: "worked" })} className="rounded-md border border-emerald-300 bg-white px-2.5 py-1 text-xs font-medium hover:bg-emerald-100 disabled:opacity-50">
                    1 · It worked
                  </button>
                  <button type="button" disabled={busy} onClick={() => void act({ action: "followup", answer: "did_not_work" })} className="rounded-md border border-emerald-300 bg-white px-2.5 py-1 text-xs font-medium hover:bg-emerald-100 disabled:opacity-50">
                    2 · It did not work
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
        {ticket.followup === "did_not_work" && !verified && (
          <p className="rounded-md bg-amber-50 px-3 py-2 text-[12px] text-amber-900">
            The farmer said the advice did not work, so the case was reopened and taken out of training until an expert looks again.
          </p>
        )}
        {error && <p className="text-[12px] text-red-700">Could not save: {error}</p>}
      </div>
    </div>
  );
}

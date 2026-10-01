"use client";

// Step 4: the gate. The federated model decides when it is confidently calibrated; otherwise a
// human expert decides. Gemini checks the photo is paddy and gives a second opinion that is audited, not obeyed.
import { classLabel } from "@/lib/classes";
import type { RunFile } from "@/lib/contract";
import type { GateDecision } from "@/lib/gate";
import type { Ticket } from "@/lib/tickets";
import { slip } from "@/lib/ui";

export default function GatePanel({
  decision,
  pendingGemini,
  stateId,
  gate,
  ticket,
}: {
  decision: GateDecision | null;
  pendingGemini: boolean;
  stateId: string;
  gate: RunFile["gate"];
  ticket: { ticket: Ticket; stored: boolean } | null;
}) {
  const rule = (
    <p className="mt-3 text-sm text-muted">
      The rule: advice is shown when the federated model is at least {Math.round(gate.tau_fed * 100)}% sure and Gemini
      confirms the photo shows paddy. That threshold was set on held-out validation photos ({gate.calibrated_on}). Gemini&apos;s
      own label is a second opinion: when it differs, the advice stands and the case is logged for a State {stateId} expert
      to audit. Below the threshold, or when Gemini is unavailable to check the photo, an expert decides and no advice is shown.
    </p>
  );

  if (!decision) {
    return (
      <section aria-labelledby="gate-h" className="border-t border-rule pt-6" aria-live="polite">
        <h2 id="gate-h" className="text-lg font-semibold">
          Advice, or an expert?
        </h2>
        <p className="mt-2 text-muted">
          {pendingGemini ? "Waiting for Gemini's first pass before deciding." : "Waiting for the federated model."}
        </p>
        {rule}
      </section>
    );
  }

  if (decision.outcome === "not_rice") {
    return (
      <section aria-labelledby="gate-h" className="border-t border-rule pt-6" aria-live="polite">
        <h2 id="gate-h" className="display text-forest text-[clamp(1.4rem,3vw,1.9rem)]">
          Saajha&apos;s model covers paddy only
        </h2>
        <p className="mt-2 max-w-[62ch]">
          {decision.reason} State {stateId}&apos;s model only knows paddy problems, so it has nothing useful to say about this
          photo. Try a close photo of paddy leaves.
        </p>
      </section>
    );
  }

  if (decision.outcome === "advise") {
    const heading =
      decision.secondOpinion === "agrees" ? "Confident, and Gemini agrees" : "Confident: the federated model decides";
    return (
      <section aria-labelledby="gate-h" className="border-t border-rule pt-6" aria-live="polite">
        <h2 id="gate-h" className="display text-forest text-[clamp(1.4rem,3vw,1.9rem)]">
          {heading}
        </h2>
        <p className="mt-2 max-w-[62ch]">
          {decision.reason} Advice for {classLabel(decision.classKey).toLowerCase()} follows.
        </p>
        {ticket && (
          <p className={`mt-3 inline-block ${slip} px-3 py-1.5 text-[15px]`}>
            Logged for expert audit as ticket <span className="font-semibold">{ticket.ticket.id}</span>
            {!ticket.stored && <span className="text-muted"> (this browser blocks storage, so it is not kept)</span>}
          </p>
        )}
        {rule}
      </section>
    );
  }

  return (
    <section aria-labelledby="gate-h" className="border-t border-rule pt-6" aria-live="polite">
      <h2 id="gate-h" className="display text-forest text-[clamp(1.4rem,3vw,1.9rem)]">
        Sent to a State {stateId} expert for review
      </h2>
      <p className="mt-2 max-w-[62ch]">
        {decision.reason} Saajha does not guess: no advice is shown until the expert has looked at the case.
      </p>
      {ticket && (
        <p className={`mt-3 inline-block ${slip} px-3 py-1.5 text-[15px]`}>
          Ticket <span className="font-semibold">{ticket.ticket.id}</span>, pending
          {!ticket.stored && <span className="text-muted"> (this browser blocks storage, so it is not kept)</span>}
        </p>
      )}
      {rule}
    </section>
  );
}

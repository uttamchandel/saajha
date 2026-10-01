"use client";

// Step 6: the expert review queue, as this browser holds it. No farmer details are stored:
// only the two verdicts and why the case was escalated.
import { useMemo, useSyncExternalStore } from "react";
import { classLabel } from "@/lib/classes";
import { clearTickets, parseTickets, subscribeTickets, ticketsSnapshot } from "@/lib/tickets";
import { btnSecondarySm, card, pillWarn } from "@/lib/ui";

const timeFmt = new Intl.DateTimeFormat("en-IN", {
  timeZone: "Asia/Kolkata",
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export default function TicketQueue() {
  const raw = useSyncExternalStore(subscribeTickets, ticketsSnapshot, () => "");
  const tickets = useMemo(() => parseTickets(raw), [raw]);

  return (
    <section aria-labelledby="queue-h" className="border-t border-rule pt-8">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 id="queue-h" className="display text-forest text-[clamp(1.4rem,3vw,1.9rem)]">
          Expert review queue
        </h2>
        {tickets.length > 0 && (
          <button type="button" onClick={() => clearTickets()} className={btnSecondarySm}>
            Clear this browser&apos;s tickets
          </button>
        )}
      </div>
      <p className="mt-2 max-w-[62ch] text-muted">
        Tickets stay in this browser; in a real deployment they go to the state&apos;s KVK expert queue. A ticket holds the
        two verdicts and the reason, and nothing about the farmer.
      </p>
      {tickets.length === 0 ? (
        <p className="mt-4 text-[15px]">No cases escalated from this browser yet.</p>
      ) : (
        <div className={`${card} relative mt-4 overflow-x-auto p-4`}>
          <table className="w-full min-w-[640px] border-collapse text-left text-[15px]">
            <caption className="sr-only">Escalated cases, newest first</caption>
            <thead>
              <tr className="border-b border-forest/20 text-sm text-muted">
                <th scope="col" className="py-2 pr-4 font-normal">Ticket</th>
                <th scope="col" className="py-2 pr-4 font-normal">Raised</th>
                <th scope="col" className="py-2 pr-4 font-normal">Federated model</th>
                <th scope="col" className="py-2 pr-4 font-normal">Gemini</th>
                <th scope="col" className="py-2 pr-4 font-normal">Why</th>
                <th scope="col" className="py-2 font-normal">Status</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((t) => (
                <tr key={t.id} className="border-b border-rule align-top last:border-b-0">
                  <td className="py-2 pr-4 font-semibold whitespace-nowrap">{t.id}</td>
                  <td className="py-2 pr-4 whitespace-nowrap">
                    {Number.isNaN(Date.parse(t.createdAt)) ? t.createdAt : `${timeFmt.format(new Date(t.createdAt))} IST`}
                    <span className="block text-sm text-muted">State {t.stateId} expert</span>
                  </td>
                  <td className="py-2 pr-4">
                    {classLabel(t.fedLabel)} <span className="condensed font-semibold">{t.fedConfidence}%</span>
                  </td>
                  <td className="py-2 pr-4">
                    {t.geminiLabel ? (
                      <>
                        {classLabel(t.geminiLabel)} <span className="condensed font-semibold">{t.geminiConfidence}%</span>
                      </>
                    ) : (
                      <span className="text-muted">Unavailable</span>
                    )}
                  </td>
                  <td className="py-2 pr-4 text-sm">{t.reason}</td>
                  <td className="py-2 whitespace-nowrap">
                    <span className={pillWarn}>Pending</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

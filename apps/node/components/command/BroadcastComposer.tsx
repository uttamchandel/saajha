"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { X, Send, Users, MapPin, LoaderCircle } from "lucide-react";
import { nf } from "./ui";

export type ComposeTarget = {
  kind: "weather" | "outbreak";
  title: string;
  district: string;
  state: string;
  language: string;
  message: string; // farmer-facing broadcast text (editable)
  messageLanguage?: string; // language `message` is written in, when not `language`: Gemini drafts it in `language`
  recipients: number;
};

// A Gemini draft in the district's language, made from the officer's text (POST /api/alerts/draft).
type Draft = { status: "none" | "drafting" | "done" | "failed"; source: string; from: string };

const CHANNELS = ["Voice call", "SMS", "WhatsApp"] as const;

export default function BroadcastComposer({ target, onClose, onSend }: {
  target: ComposeTarget | null;
  onClose: () => void;
  onSend: (payload: { target: ComposeTarget; message: string; channels: string[] }) => void;
}) {
  const [message, setMessage] = useState("");
  const [channels, setChannels] = useState<Record<string, boolean>>({ "Voice call": true, SMS: true, WhatsApp: false });
  const [step, setStep] = useState<"edit" | "confirm" | "sending">("edit");
  const [draft, setDraft] = useState<Draft>({ status: "none", source: "", from: "" });
  const run = useRef(0); // ignores a draft that arrives after the officer moved on

  const draftIn = useCallback((t: ComposeTarget, text: string) => {
    const id = ++run.current;
    const from = t.messageLanguage ?? "English";
    setDraft({ status: "drafting", source: text, from });
    fetch("/api/alerts/draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text, from, to: t.language }),
      signal: AbortSignal.timeout(30000),
    })
      .then((r) => (r.ok ? (r.json() as Promise<{ text: string }>) : Promise.reject(new Error(String(r.status)))))
      .then((d) => {
        if (run.current !== id) return;
        setMessage(d.text);
        setDraft((prev) => ({ ...prev, status: "done" }));
      })
      .catch(() => {
        if (run.current === id) setDraft((prev) => ({ ...prev, status: "failed" }));
      });
  }, []);

  // re-seed local state whenever a new target opens
  useEffect(() => {
    if (target) {
      // Re-seeds the draft each time the officer opens a new alert target.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMessage(target.message);
      setChannels({ "Voice call": true, SMS: true, WhatsApp: false });
      setStep("edit");
      if (target.messageLanguage && target.messageLanguage !== target.language) draftIn(target, target.message);
      else {
        run.current++;
        setDraft({ status: "none", source: "", from: "" });
      }
    }
  }, [target, draftIn]);

  if (!target) return null;

  const selected = CHANNELS.filter((c) => channels[c]);
  const canSend = message.trim().length > 0 && selected.length > 0 && draft.status !== "drafting";

  const queue = () => {
    setStep("sending");
    setTimeout(() => {
      onSend({ target, message: message.trim(), channels: selected });
      onClose();
    }, 700);
  };

  return (
    <div className="fixed inset-0 z-40" role="dialog" aria-modal="true" aria-label="Compose broadcast">
      <button className="absolute inset-0 bg-slate-900/30" onClick={onClose} aria-label="Close composer" />
      <aside className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-xl">
        <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
              {target.kind === "weather" ? "Weather alert broadcast" : "Outbreak alert broadcast"}
            </p>
            <h2 className="text-sm font-semibold text-slate-900">{target.title}</h2>
          </div>
          <button onClick={onClose} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Close">
            <X className="size-4" aria-hidden="true" />
          </button>
        </header>

        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          <div className="flex flex-wrap gap-3 text-xs text-slate-600">
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="size-3.5 text-slate-400" aria-hidden="true" />
              {target.district}, {target.state}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Users className="size-3.5 text-slate-400" aria-hidden="true" />
              <span className="tabular-nums font-medium text-slate-900">{nf.format(target.recipients)}</span> registered farmers in zone
            </span>
          </div>

          <div>
            <label htmlFor="bc-msg" className="mb-1 flex items-center justify-between gap-2 text-xs font-medium text-slate-700">
              <span>
                Farmer message · {draft.status === "failed" ? `${draft.from} (not yet ${target.language})` : target.language}
              </span>
              {draft.status === "drafting" && (
                <span className="inline-flex items-center gap-1 text-[11px] font-normal text-slate-500">
                  <LoaderCircle className="size-3 animate-spin" aria-hidden="true" />
                  Gemini is writing it in {target.language}…
                </span>
              )}
            </label>
            <textarea
              id="bc-msg"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              disabled={draft.status === "drafting"}
              className="w-full resize-y rounded-md border border-slate-200 p-3 text-[13px] leading-relaxed text-slate-800 focus:border-forest focus:outline-none disabled:opacity-60"
            />
            <p className="mt-1 text-[11px] text-slate-400">
              {message.length} chars · voice call reads this text aloud (TTS); an SMS segment holds 160 characters in English, 70 in
              Indian scripts.
            </p>
            {draft.status === "done" && (
              <div className="mt-2 rounded-md bg-emerald-50 p-2.5 text-[11px] leading-relaxed text-emerald-900">
                Written in {target.language} by Gemini from the {draft.from} draft. Read it before sending.
                <details className="mt-1">
                  <summary className="cursor-pointer font-medium">{draft.from} draft</summary>
                  <p className="mt-1 whitespace-pre-wrap text-slate-700">{draft.source}</p>
                </details>
              </div>
            )}
            {draft.status === "failed" && (
              <div className="mt-2 rounded-md bg-amber-50 p-2.5 text-[11px] leading-relaxed text-amber-900">
                Gemini could not write the {target.language} message just now, so this is the {draft.from} draft. Edit it, or{" "}
                <button type="button" onClick={() => draftIn(target, message)} className="font-semibold underline underline-offset-2">
                  try again
                </button>
                .
              </div>
            )}
          </div>

          <fieldset>
            <legend className="mb-1.5 text-xs font-medium text-slate-700">Delivery channels</legend>
            <div className="space-y-1.5">
              {CHANNELS.map((c) => (
                <label key={c} className="flex items-center gap-2.5 rounded-md border border-slate-200 px-3 py-2 text-[13px] text-slate-700 hover:bg-slate-50">
                  <input
                    type="checkbox"
                    checked={!!channels[c]}
                    onChange={(e) => setChannels((prev) => ({ ...prev, [c]: e.target.checked }))}
                    className="size-3.5 accent-[#1b4332]"
                  />
                  {c}
                  {c === "Voice call" && <span className="ml-auto text-[11px] text-slate-400">works on feature phones</span>}
                  {c === "WhatsApp" && <span className="ml-auto text-[11px] text-slate-400">smartphone users only</span>}
                </label>
              ))}
            </div>
          </fieldset>
        </div>

        <footer className="border-t border-slate-200 p-4">
          {step === "edit" && (
            <button
              onClick={() => setStep("confirm")}
              disabled={!canSend}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-forest px-4 py-2.5 text-sm font-medium text-white hover:bg-leaf disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Send className="size-4" aria-hidden="true" />
              Send to {nf.format(target.recipients)} farmers
            </button>
          )}
          {step === "confirm" && (
            <div className="space-y-2">
              <p className="text-center text-xs text-slate-600">
                Confirm broadcast via <span className="font-medium text-slate-900">{selected.join(" + ")}</span> to{" "}
                <span className="tabular-nums font-medium text-slate-900">{nf.format(target.recipients)}</span> farmers in {target.district}?
              </p>
              <div className="flex gap-2">
                <button onClick={() => setStep("edit")} className="flex-1 rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50">
                  Back
                </button>
                <button onClick={queue} className="flex-1 rounded-md bg-forest px-4 py-2 text-sm font-medium text-white hover:bg-leaf">
                  Confirm &amp; queue
                </button>
              </div>
            </div>
          )}
          {step === "sending" && (
            <div className="flex items-center justify-center gap-2 py-2 text-sm text-slate-600">
              <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
              Queuing broadcast…
            </div>
          )}
        </footer>
      </aside>
    </div>
  );
}

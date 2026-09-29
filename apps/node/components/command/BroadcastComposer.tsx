"use client";

import { useEffect, useState } from "react";
import { X, Send, Users, MapPin, LoaderCircle } from "lucide-react";
import { nf } from "./ui";

export type ComposeTarget = {
  kind: "weather" | "outbreak";
  title: string;
  district: string;
  state: string;
  language: string;
  message: string; // farmer-facing broadcast text (editable)
  recipients: number;
};

const CHANNELS = ["Voice call", "SMS", "WhatsApp"] as const;

export default function BroadcastComposer({ target, onClose, onSend }: {
  target: ComposeTarget | null;
  onClose: () => void;
  onSend: (payload: { target: ComposeTarget; message: string; channels: string[] }) => void;
}) {
  const [message, setMessage] = useState("");
  const [channels, setChannels] = useState<Record<string, boolean>>({ "Voice call": true, SMS: true, WhatsApp: false });
  const [step, setStep] = useState<"edit" | "confirm" | "sending">("edit");

  // re-seed local state whenever a new target opens
  useEffect(() => {
    if (target) {
      // Re-seeds the draft each time the officer opens a new alert target.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMessage(target.message);
      setChannels({ "Voice call": true, SMS: true, WhatsApp: false });
      setStep("edit");
    }
  }, [target]);

  if (!target) return null;

  const selected = CHANNELS.filter((c) => channels[c]);
  const canSend = message.trim().length > 0 && selected.length > 0;

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
            <label htmlFor="bc-msg" className="mb-1 block text-xs font-medium text-slate-700">
              Farmer message · {target.language}
            </label>
            <textarea
              id="bc-msg"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              className="w-full resize-y rounded-md border border-slate-200 p-3 text-[13px] leading-relaxed text-slate-800 focus:border-forest focus:outline-none"
            />
            <p className="mt-1 text-[11px] text-slate-400">
              {message.length} chars · voice call reads this text aloud (TTS); SMS splits at 160 chars/segment.
            </p>
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

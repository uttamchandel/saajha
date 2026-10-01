"use client";

// The hero's night card: this node's place in the Saajha network, drawn the way the hub draws it, with the
// live facts under it. Gold is what crosses a state border (model weights), blue is outbreak counts, and the
// dots, farmers' records, never leave their state.
import { ArrowUpRight, Lock, Radio } from "lucide-react";
import { NODE_STATE } from "@/lib/node";
import NetworkField from "./NetworkField";
import { HUB_URL } from "./hub";
import { useNetwork } from "./useNetwork";

function Swatch({ tone }: { tone: "gold" | "signal" | "dots" }) {
  if (tone === "dots") {
    return (
      <svg viewBox="0 0 16 8" aria-hidden="true" className="mr-1 inline-block h-2 w-4 align-[0.05em]">
        <circle cx="3" cy="4" r="1.5" fill="var(--paper)" />
        <circle cx="8" cy="4" r="1.5" fill="var(--paper)" opacity="0.75" />
        <circle cx="13" cy="4" r="1.5" fill="var(--paper)" opacity="0.55" />
      </svg>
    );
  }
  return <span aria-hidden="true" className={`mr-1 inline-block h-2 w-2 rounded-full align-[0.05em] ${tone === "gold" ? "bg-turmeric-soft" : "bg-signal"}`} />;
}

export default function NetworkCard() {
  const net = useNetwork();
  const facts = net.status === "ready" ? net.facts : null;
  const origin = facts?.source === "live" ? "trained live on verified cases" : "from the recorded Flower run";

  return (
    <aside aria-labelledby="network-card-h" className="rounded-2xl bg-night text-paper p-5 sm:p-6 shadow-2xl">
      <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold">
        <span aria-hidden="true" className="relative inline-flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full rounded-full bg-turmeric-soft opacity-60 motion-safe:animate-ping" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-turmeric-soft" />
        </span>
        <span>
          Saajha <span lang="hi">साझा</span> network, live
        </span>
      </p>
      <h2 id="network-card-h" className="font-display text-2xl font-semibold leading-tight mt-3">
        {NODE_STATE} doesn&rsquo;t learn alone.
      </h2>

      <figure className="mt-2">
        <NetworkField round={facts?.round ?? null} here={NODE_STATE} />
        <figcaption className="mt-1 text-xs leading-snug text-haze">
          <Swatch tone="gold" />
          Gold is model weights, <Swatch tone="signal" />
          blue is outbreak counts. <Swatch tone="dots" />
          The dots are farmers&rsquo; records: they never leave their state.
        </figcaption>
      </figure>

      <ul className="mt-4 space-y-2.5 border-t border-white/15 pt-4 text-sm leading-snug text-haze">
        <li>
          <a href={`${HUB_URL}/federation`} className="group flex gap-3 hover:text-paper transition">
            <span aria-hidden="true" className="mt-[5px] inline-flex h-2.5 w-2.5 shrink-0 rounded-full bg-turmeric-soft" />
            <span className="group-hover:underline underline-offset-4">
              <span className="font-semibold text-paper">Model in use here:</span>{" "}
              {facts ? (
                <>
                  round {facts.round}, {origin},{" "}
                  <span className="whitespace-nowrap">
                    sha256 <span className="font-mono text-[13px] text-paper">{facts.sha256.slice(0, 10)}…</span>
                  </span>
                </>
              ) : net.status === "unreachable" ? (
                "the Saajha hub could not be reached just now."
              ) : (
                "asking the Saajha hub…"
              )}
            </span>
          </a>
        </li>
        {facts?.warning && (
          <li>
            <a href={`${HUB_URL}/exchange`} className="group flex gap-3 hover:text-paper transition">
              <Radio size={16} className="mt-0.5 shrink-0 text-signal" aria-hidden="true" />
              <span className="group-hover:underline underline-offset-4">
                <span className="font-semibold text-signal">
                  {facts.warning.direction === "incoming"
                    ? `Early warning for ${facts.warning.to.district}, ${facts.warning.to.state}:`
                    : `This node's counts warned ${facts.warning.to.district}, ${facts.warning.to.state}:`}
                </span>{" "}
                {facts.warning.label} rising in {facts.warning.from.district}, {facts.warning.from.state}
                {facts.scenario && <span className="text-xs"> (scenario counts)</span>}
              </span>
            </a>
          </li>
        )}
        <li className="flex gap-3">
          <Lock size={16} className="mt-0.5 shrink-0 text-paper/80" aria-hidden="true" />
          <span>
            <span className="font-semibold text-paper">Farmer records sent to the hub or another state: 0.</span> Only model
            weights and outbreak counts cross {NODE_STATE}&rsquo;s border.
          </span>
        </li>
      </ul>

      <a
        href={HUB_URL}
        className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-turmeric-soft px-5 py-3 font-semibold text-night hover:bg-[#fcd34d] transition"
      >
        See the Saajha network <ArrowUpRight size={16} aria-hidden="true" />
      </a>
    </aside>
  );
}

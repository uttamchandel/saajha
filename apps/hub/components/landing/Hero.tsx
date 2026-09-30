"use client";

// The landing hero, at night: the promise in two lines, the network that keeps it (animated), and the live facts
// behind it — the model round every node runs now, and any warning crossing a state border — read from this
// hub's own APIs. Until they answer, it shows the release the page was built with.
import Link from "next/link";
import NetworkField from "./NetworkField";
import StatBand from "./StatBand";
import s from "./hero.module.css";
import { useLiveNetwork } from "./useLiveNetwork";

const NODE_URL = (process.env.NEXT_PUBLIC_NODE_URL ?? "https://saajha-node.vercel.app").replace(/\/+$/, "");

function ArrowDown() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 4v15M6 13l6 6 6-6" />
    </svg>
  );
}

function SignalIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="mt-[1px] h-[18px] w-[18px] shrink-0 text-signal" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
      <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
      <path d="M8.2 8.2a5.4 5.4 0 0 0 0 7.6M15.8 8.2a5.4 5.4 0 0 1 0 7.6M5.1 5.1a9.8 9.8 0 0 0 0 13.8M18.9 5.1a9.8 9.8 0 0 1 0 13.8" />
    </svg>
  );
}

function Swatch({ tone }: { tone: "gold" | "signal" | "dots" }) {
  if (tone === "dots") {
    return (
      <svg viewBox="0 0 16 8" aria-hidden="true" className="mr-1 inline-block h-2 w-4 align-[0.05em]">
        <circle cx="3" cy="4" r="1.5" fill="var(--starlight)" />
        <circle cx="8" cy="4" r="1.5" fill="var(--starlight)" opacity="0.75" />
        <circle cx="13" cy="4" r="1.5" fill="var(--starlight)" opacity="0.55" />
      </svg>
    );
  }
  return <span aria-hidden="true" className={`mr-1 inline-block h-2 w-2 rounded-full align-[0.05em] ${tone === "gold" ? "bg-gold" : "bg-signal"}`} />;
}

export default function Hero({ round, sha256 }: { round: number; sha256: string }) {
  const live = useLiveNetwork();
  const liveRound = live?.round ?? round;
  const sha = live?.sha256 ?? sha256;
  const origin = live?.source === "live" ? "trained live on verified cases" : "from the recorded Flower run";
  const warning = live?.warning ?? null;

  return (
    <section aria-labelledby="hero-title" className="relative overflow-hidden bg-night text-starlight">
      <div className="mx-auto max-w-6xl px-4 pb-8 pt-10 sm:px-6 sm:pt-14 lg:pb-10 lg:pt-12">
        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,11fr)_minmax(0,12fr)] lg:gap-10">
          {/* The promise */}
          <div className="min-w-0">
            <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-haze">
              Saajha ·{" "}
              <span lang="hi" className="normal-case tracking-normal">
                साझा
              </span>{" "}
              means shared
            </p>
            <h1 id="hero-title" className={`display mt-5 text-starlight ${s.h1}`}>
              <span className="block">
                States share <span className="text-gold">what they’ve learned.</span>
              </span>
              <span className="mt-[0.08em] block text-haze">Not who their farmers are.</span>
            </h1>
            <p className="mt-6 max-w-[62ch] text-[17px] leading-relaxed text-haze sm:text-lg">
              Saajha is a federated network for Indian agriculture. Every state runs its own node, which farmers reach
              by voice, SMS, WhatsApp or the web in their own language. The states train one crop-disease model
              together: the model crosses state borders, farmers’ photos and records never do.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <Link
                href="/#flip"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md bg-gold px-6 py-3 text-[16px] font-semibold text-night transition-colors hover:bg-[#f6d46a]"
              >
                Watch a state learn
                <ArrowDown />
              </Link>
              <Link
                href="/diagnose"
                className="inline-flex min-h-12 items-center justify-center rounded-md border border-starlight/60 px-6 py-3 text-[16px] font-semibold text-starlight transition-colors hover:border-starlight hover:bg-starlight/10"
              >
                Diagnose a paddy photo
              </Link>
              <a
                href={NODE_URL}
                className="inline-flex min-h-12 items-center px-1 text-[16px] text-haze underline decoration-haze/40 underline-offset-4 transition-colors hover:text-starlight hover:decoration-starlight sm:px-2"
              >
                Open the Telangana node ↗
              </a>
            </div>
          </div>

          {/* The network, and what it is doing right now */}
          <div className="min-w-0">
            <figure className="mx-auto max-w-[600px] lg:max-w-none">
              <NetworkField round={liveRound} />
              <figcaption className="mt-3 max-w-[64ch] text-[13px] leading-snug text-haze">
                Live: two state nodes, Telangana and Maharashtra. <Swatch tone="gold" />
                Gold is model weights, <Swatch tone="signal" />
                blue is outbreak counts. Farmer records, <Swatch tone="dots" />
                the dots, never leave their state.
              </figcaption>
            </figure>
            <div className="mx-auto mt-4 max-w-[600px] space-y-2.5 border-t border-night-line pt-4 text-[14px] leading-snug lg:max-w-none">
              <Link href="/federation" className="group flex gap-3 text-haze transition-colors hover:text-starlight">
                <span aria-hidden="true" className="relative mt-[5px] inline-flex h-2.5 w-2.5 shrink-0">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gold opacity-60" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-gold" />
                </span>
                <span className="group-hover:underline group-hover:underline-offset-4">
                  <span className="font-semibold text-starlight">Live</span> · Every node runs model round {liveRound},{" "}
                  {origin} · sha256 <span className="font-mono text-[13px] text-starlight">{sha.slice(0, 10)}…</span>
                </span>
              </Link>
              {warning && (
                <Link href="/exchange" className="group flex gap-3 text-haze transition-colors hover:text-starlight">
                  <SignalIcon />
                  <span className="group-hover:underline group-hover:underline-offset-4">
                    <span className="font-semibold text-signal">Early warning:</span> {warning.label} rising in {warning.from}{" "}
                    → alert for {warning.to} <span className="text-[12.5px]">(scenario counts)</span>
                  </span>
                </Link>
              )}
            </div>
          </div>
        </div>

        <StatBand />
      </div>
    </section>
  );
}

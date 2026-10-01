"use client";

// What this state's officer sees when a pest is rising just across the border: the warning the Saajha hub
// is sending right now, read live (the same one the command center's panel shows). Only counts crossed the
// border to make it. If there is no warning, or the hub cannot be reached, it says that instead.
import Link from "next/link";
import { ArrowUpRight, Radio } from "lucide-react";
import { NODE_STATE } from "@/lib/node";
import { HUB_URL } from "./hub";
import { useNetwork } from "./useNetwork";

export default function BorderWarning() {
  const net = useNetwork();
  const w = net.status === "ready" ? net.facts.warning : null;
  const scenario = net.status === "ready" && net.facts.scenario;

  return (
    <div className="rounded-2xl bg-night text-paper p-6 shadow-2xl">
      <div className="flex items-center gap-2 text-xs text-haze mb-3 uppercase tracking-wide">
        <Radio size={14} className="text-signal" aria-hidden="true" />
        Early warning from the Saajha hub · live
      </div>

      {w ? (
        <div className="rounded-xl bg-red-950/50 border border-red-500/30 p-4">
          <div className="font-semibold">{w.label}</div>
          <div className="mt-0.5 text-sm text-paper/80">
            Rising in {w.from.district}, {w.from.state}:{" "}
            <span className="font-semibold text-signal">{w.counts.join(" → ")}</span> reports a week
          </div>
          <div className="mt-1 text-sm text-haze">
            {w.direction === "incoming"
              ? `${w.to.district} shares the border along ${w.along}.`
              : `${w.to.district}, ${w.to.state}, across ${w.along}, was warned by this node's counts.`}
          </div>
          {w.direction === "incoming" ? (
            <Link href="/command" className="mt-3 block rounded-lg bg-turmeric text-white text-center text-sm font-semibold py-2 hover:bg-turmeric-deep transition">
              Alert farmers in {w.to.district}
            </Link>
          ) : (
            <a href={`${HUB_URL}/exchange`} className="mt-3 flex items-center justify-center gap-1 rounded-lg bg-turmeric text-white text-sm font-semibold py-2 hover:bg-turmeric-deep transition">
              See the counts cross <ArrowUpRight size={14} aria-hidden="true" />
            </a>
          )}
        </div>
      ) : (
        <div className="rounded-xl bg-white/5 border border-white/10 p-4 text-sm text-haze">
          {net.status === "loading"
            ? "Asking the Saajha hub…"
            : net.status === "unreachable"
              ? "The Saajha hub could not be reached just now."
              : `No outbreak is rising next to ${NODE_STATE}'s borders.`}
        </div>
      )}

      <div className="mt-3 text-xs leading-relaxed text-haze">
        Only district-week counts of at least 5 crossed the border, never a farmer&rsquo;s record.
        {scenario && " These are scenario counts; the pull, the border check and the warning are live."}
      </div>
    </div>
  );
}

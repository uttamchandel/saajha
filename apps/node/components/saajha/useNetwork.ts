"use client";

// Live facts about this node's place in Saajha, read from the hub's public APIs: the model release every
// node runs now, and any early warning that involves this state. Nothing here is canned: if the hub cannot
// be reached, the components that use this say so.
import { useEffect, useState } from "react";
import { NODE_STATE } from "@/lib/node";
import { HUB_URL } from "./hub";

type Release = { round: number; sha256: string; source: "live" | "recorded" };
type HubWarning = {
  label: string;
  from: { state: string; district: string };
  to: { state: string; district: string };
  along: string;
  counts: number[];
};
type Exchange = { warnings: HubWarning[]; nodes: { state: string; scenario: boolean }[] };

export type NetworkWarning = {
  /** "incoming": a neighbour's counts warned this state. "outgoing": this state's counts warned a neighbour. */
  direction: "incoming" | "outgoing";
  label: string;
  from: { state: string; district: string };
  to: { state: string; district: string };
  /** The shared border, as the hub words it (e.g. "the Penganga river"). */
  along: string;
  /** Reports a week, oldest first. */
  counts: number[];
};

export type NetworkFacts = {
  round: number;
  source: "live" | "recorded";
  sha256: string;
  warning: NetworkWarning | null;
  /** True when the counts behind the warning are the labelled scenario, not farmers' reports. */
  scenario: boolean;
};

export type Network = { status: "loading" } | { status: "unreachable" } | { status: "ready"; facts: NetworkFacts };

const json = <T,>(url: string): Promise<T | null> =>
  fetch(url, { cache: "no-store", signal: AbortSignal.timeout(15000) })
    .then((r) => (r.ok ? (r.json() as Promise<T>) : null))
    .catch(() => null);

async function ask(): Promise<Network> {
  const [rel, ex] = await Promise.all([json<Release>(`${HUB_URL}/api/rounds/latest`), json<Exchange>(`${HUB_URL}/api/exchange`)]);
  if (!rel || typeof rel.round !== "number") return { status: "unreachable" };
  const all = ex?.warnings ?? [];
  const w = all.find((x) => x.to.state === NODE_STATE) ?? all.find((x) => x.from.state === NODE_STATE);
  return {
    status: "ready",
    facts: {
      round: rel.round,
      source: rel.source,
      sha256: rel.sha256,
      warning: w
        ? { direction: w.to.state === NODE_STATE ? "incoming" : "outgoing", label: w.label, from: w.from, to: w.to, along: w.along, counts: w.counts }
        : null,
      scenario: ex?.nodes.some((n) => n.scenario) ?? false,
    },
  };
}

// One question to the hub per page view, shared by every component that shows these facts.
let asked: Promise<Network> | null = null;

export function useNetwork(): Network {
  const [net, setNet] = useState<Network>({ status: "loading" });
  useEffect(() => {
    let alive = true;
    asked ??= ask();
    asked.then((n) => {
      if (n.status === "unreachable") asked = null; // let the next page view try again
      if (alive) setNet(n);
    });
    return () => {
      alive = false;
    };
  }, []);
  return net;
}

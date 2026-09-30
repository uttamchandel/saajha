"use client";

// Live facts for the landing page: the model every state node uses now, and any warning the hub is
// sending across a state border. Read from this hub's own APIs; nothing on the landing is canned.
import { useEffect, useState } from "react";

export type LiveNetwork = {
  round: number;
  source: "live" | "recorded";
  sha256: string;
  warning: { label: string; from: string; to: string; counts: number[] } | null;
};

export function useLiveNetwork(): LiveNetwork | null {
  const [live, setLive] = useState<LiveNetwork | null>(null);
  useEffect(() => {
    let alive = true;
    Promise.all([
      fetch("/api/rounds/latest", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)),
      fetch("/api/exchange", { cache: "no-store" }).then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([rel, ex]) => {
        if (!alive || !rel) return;
        const w = ex?.warnings?.[0];
        setLive({
          round: rel.round,
          source: rel.source,
          sha256: rel.sha256,
          warning: w ? { label: w.label, from: `${w.from.district}, ${w.from.state}`, to: `${w.to.district}, ${w.to.state}`, counts: w.counts } : null,
        });
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);
  return live;
}

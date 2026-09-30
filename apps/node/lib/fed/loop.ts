// The node's side of the learning loop: which verified cases a released round has learned.
import { markUsed, sentUpdates } from "@/lib/db";
import { HUB } from "./hub";

/** Mark cases learned once the hub has released a round that included the update carrying them. */
export async function syncLearned(): Promise<void> {
  for (const sha of await sentUpdates()) {
    try {
      const r = await fetch(`${HUB}/api/rounds?update=${sha}`, { signal: AbortSignal.timeout(8000), cache: "no-store" });
      if (!r.ok) continue;
      const { included_in } = (await r.json()) as { included_in: number | null };
      if (typeof included_in === "number") await markUsed(sha, included_in);
    } catch {
      // The hub is unreachable: try again next time.
    }
  }
}

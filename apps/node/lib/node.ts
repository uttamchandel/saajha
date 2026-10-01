// This deployment's identity in the Saajha network. The same node software runs once per state;
// NEXT_PUBLIC_NODE_STATE says which state this copy serves (saajha-node: Telangana,
// saajha-node-mh: Maharashtra). Adding a state means deploying one more copy with its own value.
import { DISTRICTS, type District } from "./districts";

export const NODE_STATE = process.env.NEXT_PUBLIC_NODE_STATE ?? "Telangana";

/** The registry districts this node serves. */
export const NODE_DISTRICTS: District[] = DISTRICTS.filter((d) => d.state === NODE_STATE);

/** Where tickets and defaults land when a farmer's own district is not known. */
export const HOME_DISTRICT: District = NODE_DISTRICTS[0] ?? DISTRICTS[0];

// A state with no district in the registry borrows the registry's first one as its home.
// Say so in the build log and the server log (never in a visitor's browser) instead of silently.
if (NODE_DISTRICTS.length === 0 && typeof window === "undefined") {
  console.warn(
    `node state: no district in lib/districts.ts has state "${NODE_STATE}" (NEXT_PUBLIC_NODE_STATE). ` +
      `Tickets and defaults will use ${HOME_DISTRICT.district}, ${HOME_DISTRICT.state}. ` +
      `Check the spelling, or add the state's districts to the registry.`,
  );
}

// Routing mirrors the state escalation fabric: RSKs in AP, AEO clusters in TS,
// district KVKs elsewhere.
export function kendraFor(district: string, state: string): string {
  if (state === "Andhra Pradesh") return `RSK ${district}`;
  if (state === "Telangana") return `AEO Cluster ${district}`;
  return `KVK ${district}`;
}

/** The kendra a ticket from the home district is routed to. */
export const HOME_KENDRA = kendraFor(HOME_DISTRICT.district, HOME_DISTRICT.state);

/** The language a state's broadcasts go out in (every state in the district registry). */
export const STATE_LANGUAGE: Record<string, string> = {
  "Andhra Pradesh": "Telugu",
  Assam: "Assamese",
  Bihar: "Hindi",
  Chhattisgarh: "Hindi",
  Gujarat: "Gujarati",
  Haryana: "Hindi",
  Jharkhand: "Hindi",
  Karnataka: "Kannada",
  Kerala: "Malayalam",
  "Madhya Pradesh": "Hindi",
  Maharashtra: "Marathi",
  Odisha: "Odia",
  Punjab: "Punjabi",
  Rajasthan: "Hindi",
  "Tamil Nadu": "Tamil",
  Telangana: "Telugu",
  "Uttar Pradesh": "Hindi",
  "West Bengal": "Bengali",
};

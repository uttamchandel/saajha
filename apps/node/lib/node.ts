// This deployment's identity in the Saajha network. The same node software runs once per state;
// NEXT_PUBLIC_NODE_STATE says which state this copy serves (saajha-node: Telangana,
// saajha-node-mh: Maharashtra). Adding a state means deploying one more copy with its own value.
import { DISTRICTS, type District } from "./districts";

export const NODE_STATE = process.env.NEXT_PUBLIC_NODE_STATE ?? "Telangana";

/** The registry districts this node serves. */
export const NODE_DISTRICTS: District[] = DISTRICTS.filter((d) => d.state === NODE_STATE);

/** Where tickets and defaults land when a farmer's own district is not known. */
export const HOME_DISTRICT: District = NODE_DISTRICTS[0] ?? DISTRICTS[0];

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

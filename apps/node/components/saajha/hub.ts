// Where the Saajha shared layer (apps/hub) lives. Kept free of other imports, so pages that only link to
// the hub or read its public facts do not pull in the model code (lib/fed/federated.ts has the same URL).
export const HUB_URL = (process.env.NEXT_PUBLIC_HUB_URL ?? "https://saajha-hub.vercel.app").replace(/\/+$/, "");

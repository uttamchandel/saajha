// Counts cross: cross-border early warning (Saajha step 4). The hub keeps no database: on each request
// it pulls every state node's published outbreak counts, checks them at the border, and computes which
// neighbouring states to warn. Only district-week counts at or above k ever cross; anything else is
// refused and the refusal is reported.

export type NodeInfo = { state: string; url: string; districts: string[] };

// Each state's districts, from Wikipedia's lists of districts (checked 30 Sep 2026); renamed districts are
// accepted under both names. A count for any other place is refused at the border.
const TELANGANA = [
  "Adilabad", "Bhadradri Kothagudem", "Hanumakonda", "Hanamkonda", "Hyderabad", "Jagtial", "Jangaon", "Jayashankar Bhupalpally",
  "Jogulamba Gadwal", "Kamareddy", "Karimnagar", "Khammam", "Kumuram Bheem Asifabad", "Mahabubabad", "Mahabubnagar", "Mancherial",
  "Medak", "Medchal-Malkajgiri", "Mulugu", "Nagarkurnool", "Nalgonda", "Narayanpet", "Nirmal", "Nizamabad", "Peddapalli",
  "Rajanna Sircilla", "Ranga Reddy", "Sangareddy", "Siddipet", "Suryapet", "Vikarabad", "Wanaparthy", "Warangal", "Yadadri Bhuvanagiri",
];
const MAHARASHTRA = [
  "Ahmednagar", "Ahilyanagar", "Akola", "Amravati", "Aurangabad", "Chhatrapati Sambhajinagar", "Beed", "Bhandara", "Buldhana",
  "Chandrapur", "Dhule", "Gadchiroli", "Gondia", "Hingoli", "Jalgaon", "Jalna", "Kolhapur", "Latur", "Mumbai City", "Mumbai Suburban",
  "Nagpur", "Nanded", "Nandurbar", "Nashik", "Osmanabad", "Dharashiv", "Palghar", "Parbhani", "Pune", "Raigad", "Ratnagiri", "Sangli",
  "Satara", "Sindhudurg", "Solapur", "Thane", "Wardha", "Washim", "Yavatmal",
];

// The state nodes in this network (one deployment each, same software).
export const NODES: NodeInfo[] = [
  { state: "Telangana", url: process.env.NODE_TELANGANA_URL ?? "https://saajha-node.vercel.app", districts: TELANGANA },
  { state: "Maharashtra", url: process.env.NODE_MAHARASHTRA_URL ?? "https://saajha-node-mh.vercel.app", districts: MAHARASHTRA },
];

// District pairs that share a state border. Verified: Adilabad (Telangana) is bordered to the north by
// Yavatmal (Maharashtra), along the Penganga river.
export const BORDERS: { a: { state: string; district: string }; b: { state: string; district: string }; along: string; source: string }[] = [
  {
    a: { state: "Maharashtra", district: "Yavatmal" },
    b: { state: "Telangana", district: "Adilabad" },
    along: "the Penganga river",
    source: "https://en.wikipedia.org/wiki/Adilabad_district",
  },
];

// The shared list of conditions a count may name: two field pests plus the paddy model's conditions
// (lib/classes.ts, without "normal").
export const CONDITION_LABELS: Record<string, string> = {
  pink_bollworm: "Pink bollworm (cotton)",
  fall_armyworm: "Fall armyworm (maize)",
  blast: "Rice blast",
  brown_spot: "Brown spot (paddy)",
  bacterial_leaf_blight: "Bacterial leaf blight (paddy)",
  bacterial_leaf_streak: "Bacterial leaf streak (paddy)",
  bacterial_panicle_blight: "Bacterial panicle blight (paddy)",
  dead_heart: "Stem borer dead heart (paddy)",
  downy_mildew: "Downy mildew (paddy)",
  hispa: "Rice hispa",
  tungro: "Tungro (paddy)",
};

export type Count = { state: string; district: string; iso_week: string; condition: string; count: number };
export type Refusal = { state: string; reason: string };
export type NodePull = { state: string; url: string; ok: boolean; accepted: number; refused: number; withheldAtNode: number; scenario: boolean; error?: string };
export type Warning = {
  condition: string;
  label: string;
  from: { state: string; district: string };
  to: { state: string; district: string };
  along: string;
  weeks: string[];
  counts: number[];
  reason: string;
};

const COUNT_KEYS = ["district", "iso_week", "condition", "count"];
const MAX_COUNTS = 500;
const NAME_RE = /^[A-Za-z][A-Za-z .()-]{1,39}$/;
const COND_RE = /^[a-z_]{2,40}$/;
const WEEK_RE = /^\d{4}-W\d{2}$/;

/** The border check for one node's envelope: shape, k-anonymity, and nothing but the four fields. */
export function borderCheck(env: unknown, node: NodeInfo): { accepted: Count[]; refused: Refusal[]; withheldAtNode: number; scenario: boolean } {
  const refused: Refusal[] = [];
  const accepted: Count[] = [];
  const e = (env ?? {}) as Record<string, unknown>;
  if (e.schema !== "saajha.outbreak_counts.v1") return { accepted, refused: [{ state: node.state, reason: "the envelope is not a Saajha outbreak-count envelope" }], withheldAtNode: 0, scenario: false };
  if (e.state !== node.state) return { accepted, refused: [{ state: node.state, reason: "the envelope names a different state from the node that sent it" }], withheldAtNode: 0, scenario: false };
  const k = typeof e.k === "number" && e.k >= 5 ? e.k : 5;
  if (Array.isArray(e.counts) && e.counts.length > MAX_COUNTS) return { accepted, refused: [{ state: node.state, reason: `the envelope carries more than ${MAX_COUNTS} counts` }], withheldAtNode: 0, scenario: false };
  for (const raw of Array.isArray(e.counts) ? e.counts : []) {
    const c = (raw ?? {}) as Record<string, unknown>;
    const extra = Object.keys(c).filter((key) => !COUNT_KEYS.includes(key));
    // Reasons are fixed text: a refusal never repeats what it refused.
    if (extra.length) refused.push({ state: node.state, reason: "it carries a field other than district, week, condition and count" });
    else if (typeof c.district !== "string" || !NAME_RE.test(c.district)) refused.push({ state: node.state, reason: "the district is not a plain place name" });
    else if (!node.districts.includes(c.district)) refused.push({ state: node.state, reason: `it names a place that is not a district of ${node.state}` });
    else if (typeof c.condition !== "string" || !COND_RE.test(c.condition) || !Object.hasOwn(CONDITION_LABELS, c.condition)) refused.push({ state: node.state, reason: "it names a condition not on the shared list" });
    else if (typeof c.iso_week !== "string" || !WEEK_RE.test(c.iso_week)) refused.push({ state: node.state, reason: "the week is not an ISO week" });
    else if (typeof c.count !== "number" || !Number.isInteger(c.count) || c.count < k) refused.push({ state: node.state, reason: `the count is below ${k}, small enough to point to a farmer` });
    else accepted.push({ state: node.state, district: c.district, iso_week: c.iso_week, condition: c.condition, count: c.count });
  }
  const withheld = typeof e.withheld === "number" && Number.isInteger(e.withheld) && e.withheld >= 0 ? e.withheld : 0;
  return { accepted, refused, withheldAtNode: withheld, scenario: e.scenario === true };
}

/** Rising = at least 10 reports in the latest week and at least double the earliest week shown. */
export function warnings(counts: Count[], forState?: string): Warning[] {
  const series = new Map<string, Count[]>();
  for (const c of counts) {
    const key = `${c.state}|${c.district}|${c.condition}`;
    series.set(key, [...(series.get(key) ?? []), c]);
  }
  const out: Warning[] = [];
  for (const rows of series.values()) {
    rows.sort((x, y) => x.iso_week.localeCompare(y.iso_week));
    const first = rows[0].count;
    const last = rows[rows.length - 1].count;
    if (rows.length < 2 || last < 10 || last < 2 * first) continue;
    const { state, district, condition } = rows[0];
    for (const b of BORDERS) {
      const pair = b.a.state === state && b.a.district === district ? b.b : b.b.state === state && b.b.district === district ? b.a : null;
      if (!pair || pair.state === state || (forState && pair.state !== forState)) continue;
      out.push({
        condition,
        label: CONDITION_LABELS[condition] ?? condition,
        from: { state, district },
        to: pair,
        along: b.along,
        weeks: rows.map((r) => r.iso_week),
        counts: rows.map((r) => r.count),
        reason: `${CONDITION_LABELS[condition] ?? condition} reports in ${district} (${state}) rose from ${first} to ${last} over ${rows.length} weeks. ${pair.district} (${pair.state}) shares the border along ${b.along}.`,
      });
    }
  }
  return out;
}

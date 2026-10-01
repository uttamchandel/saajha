import Link from "next/link";
import { NODE_STATE } from "@/lib/node";
import {
  Sprout,
  CloudRain,
  MessageCircle,
  UserCheck,
  IndianRupee,
  Languages,
  Phone,
  MessageSquare,
  Camera,
  BrainCircuit,
  ChartColumn,
  BookCheck,
  ShieldCheck,
  ArrowRight,
  ArrowUpRight,
} from "lucide-react";
import type { ReactNode } from "react";
import BorderWarning from "@/components/saajha/BorderWarning";
import NetworkCard from "@/components/saajha/NetworkCard";
import SiteNav from "@/components/saajha/SiteNav";
// The Saajha shared layer (apps/hub). Each state node links back to it.
import { HUB_URL } from "@/components/saajha/hub";

// What being in the network adds, measured on the hub's recorded federated run: the same four figures as the
// hub's landing (apps/hub/components/landing/StatBand.tsx); keep the two in step. The run's four states are
// simulated, which the line under the figures and "What's real" both say.
const SAAJHA_RESULTS: { value: ReactNode; label: string }[] = [
  {
    value: (
      <>
        0%
        <ArrowRight className="mx-1 inline-block size-[0.6em] align-[0.02em]" strokeWidth={2.6} aria-hidden="true" />
        <span className="sr-only"> to </span>
        82%
      </>
    ),
    label: "One state's model on pests and diseases that state has never recorded, after 40 federated rounds",
  },
  {
    value: (
      <>
        84% <span className="font-sans text-[0.5em] font-normal text-ink-soft">vs</span> 24%
      </>
    ),
    label: "The shared model against Gemini alone, on 50 held-out paddy photos",
  },
  { value: "0", label: "Farmer records that crossed a state border, in 40 rounds" },
  { value: "330 KB", label: "All a state sends per round: model weights (330,536 bytes)" },
];

// Every figure here has a source in STAT_SOURCES; keep the two in step.
const STATS = [
  { value: "146.5M", label: "farm holdings in India", sub: "86% small or marginal, under 2 ha" },
  { value: "15–25%", label: "of potential crop output lost", sub: "to pests, weeds and diseases" },
  { value: "1 : 1,162", label: "public extension workers to farm holdings", sub: "against a recommended 1 : 750" },
];

const STAT_SOURCES =
  "Sources: Agriculture Census 2015-16 (Phase I); Parliament's Standing Committee on Agriculture chair, reported by Business Standard, July 2016; ICRISAT, Agriculture Extension System in India: A Meta-analysis, 2019.";

// What may cross from a state node to the shared layer, and whether it does yet.
const CROSSINGS = [
  {
    icon: BrainCircuit,
    title: "Model updates",
    body: "The weights of a small shared model. Never a photo, a record or a phone number.",
    status: "Live on the shared layer",
    live: true,
    note: "Federated paddy-disease model: 4 states, 40 recorded rounds, 0 farmer records moved. This node downloads it from the hub, checks its fingerprint, and lets it decide every paddy photo.",
    href: `${HUB_URL}/federation`,
    cta: "See the federation record",
  },
  {
    icon: ChartColumn,
    title: "Outbreak counts",
    body: "District, week, pest and a count of at least 5, so a neighbouring state is warned before a pest arrives. Never who reported it.",
    status: "Live between two state nodes",
    live: true,
    note: "The Telangana and Maharashtra nodes publish counts (a labelled scenario); the hub checks every count at the border and warns the neighbouring state.",
    href: `${HUB_URL}/exchange`,
    cta: "See counts cross",
  },
  {
    icon: BookCheck,
    title: "Expert-approved advice",
    body: "Advice cards an expert in one state has approved, reusable in every state, in each state's languages.",
    status: "Live for paddy",
    live: true,
    note: "This node's paddy advice comes from the hub's card library: only the condition and the language cross, never the photo. Cards cite public sources; expert approval is simulated for now.",
  },
];

const CHANNELS = [
  {
    icon: Phone,
    title: "Voice calls",
    body: "A farmer calls the state's number and speaks in their own language; the answer comes back on the same call. No literacy, internet connection, or app required. Each state plugs in its own number and provider; try the call in the browser demo.",
  },
  {
    icon: MessageSquare,
    title: "SMS on any handset",
    body: "Shorthand like “KAPAS PILA PATTA” gets a native-script reply with exact dosages, within two SMS segments. Works on 2G feature phones.",
  },
  {
    icon: Camera,
    title: "Photo to voice note",
    body: "One smartphone per village is enough. A relay worker sends a leaf photo; for paddy the shared federated model decides, and the farmer gets the advice back as a voice note in their language.",
  },
];

const STEPS = [
  { n: "01", t: "Farmer reaches out", d: "Call, SMS, or photo, on whatever phone they already own." },
  { n: "02", t: "Understood, then decided", d: "Gemini parses Indic speech and shorthand. For paddy photos the shared federated model decides; Gemini checks the photo and gives a second opinion." },
  { n: "03", t: "Advisory delivered", d: "Spoken or SMS reply in the farmer's language: IPM-first steps with exact, safe dosages." },
  { n: "04", t: "District learns", d: "Each query is a geotagged signal. Clusters of similar reports become outbreak alerts for nearby farmers." },
  // The step Saajha adds. It is the only one where something crosses the state border, so its number is gold.
  { n: "05", t: "Every state learns", d: "An expert's verified answer trains the state's model at home. Only the weights go to the Saajha hub, and the improved model comes back to every state.", crosses: true },
];

const MODULES = [
  {
    icon: Sprout,
    title: "Regenerative crop planning",
    body: "Ranked, explained crop choices from ISRIC 250 m soil grids, Soil Health Card records, 16-day weather and ICAR agronomy, each with two scores: this season, and what it does to the soil over the next seasons. Pulses when nitrogen is low, green manure when carbon is low, water-saving methods when rain is short.",
    href: "/recommend",
    cta: "Try the crop advisor",
  },
  {
    icon: CloudRain,
    title: "Dry-spell and heavy-rain zone alerts",
    body: "IMD-threshold detection over each registered district identifies the affected blocks and sends voice and SMS guidance only to farmers inside the zone.",
    href: "/command",
    cta: "View live alerts",
  },
  {
    icon: MessageCircle,
    title: "WhatsApp photo and voice support",
    body: "Farmers send a crop photo or a voice note in any language and get a voice-note reply. Paddy photos are decided by the shared federated model; other crops get a reading marked not yet verified. Feature-phone users receive the advisory by SMS.",
    href: "/whatsapp",
    cta: "Open the WhatsApp demo",
  },
  {
    icon: UserCheck,
    title: "Expert escalation (RSK / KVK)",
    body: "Low-confidence or severe cases become tickets in the state's expert queue with a 48-hour SLA: AI answers first, specialists review. The expert desk is simulated in this demo.",
    href: "/command",
    cta: "View the escalation queue",
  },
  {
    icon: IndianRupee,
    title: "Mandi prices on the same call",
    body: "Press 2 for bhav: modal prices from Agmarknet (Directorate of Marketing and Inspection). Agmarknet now requires a token for automated access, so this demo shows typical prices, not today's.",
    href: "/demo",
    cta: "Check prices on the demo",
  },
  {
    icon: Languages,
    title: "12+ Indian languages, auto-detected",
    body: "Farmers speak in their own language; Gemini detects it from the audio and answers in the same language. No menus, no settings, no literacy assumed.",
    href: "/demo",
    cta: "Try voice input",
  },
];

const DATA_SOURCES = [
  "Soil Health Card, Government of India — district nutrient records (N, P, K, pH)",
  "Agmarknet, Directorate of Marketing and Inspection — mandi modal prices (live feed paused: now needs a token)",
  "ISRIC SoilGrids — 250 m satellite-derived soil properties",
  "NASA POWER — agroclimate normals",
  "Open-Meteo — 16-day forecasts and soil moisture",
  "ICAR and SAU Package of Practices — agronomy grounding",
  "Kisan Call Centre corpus (AIKosh) — grounding roadmap",
];

const GOOGLE_AI = [
  "Gemini 3.5 Flash-Lite — photo check and second opinion",
  "Gemini — spoken-language detection from call audio",
  "Structured JSON-schema output — reliable parsing",
  "Gemini — Indic-language advisory generation",
  "Production: Vertex AI with Cloud Speech / Bhashini ASR-TTS",
  "Production: Exotel or Twilio IVR and SMS gateway",
];

const REAL = [
  "Paddy photos: the federated model the hub released runs in your browser (fingerprint-checked) and decides; Gemini checks the photo and gives a second opinion. The photo is not sent to the hub.",
  "Gemini answers (language detection, advice, photo checks, crop recommendations). If Gemini fails, a photo goes to an expert; the text lines serve saved answers, marked “fallback”.",
  "Weather alerts from Open-Meteo 16-day forecasts, checked against IMD rainfall thresholds.",
  "Soil data from ISRIC SoilGrids and Soil Health Card records.",
];

const SIMULATED = [
  "The phone and WhatsApp screens are browser simulators; no phone number is connected to this deployment yet.",
  "The expert desk is simulated: no RSK or KVK receives these tickets, and tickets are kept in memory.",
  "The farmer registry, KPIs and past tickets in the command center are invented sample data; its weather alerts are live.",
  "Mandi prices are typical values, not today's.",
  "The outbreak counts this node publishes to the hub are a seeded scenario; the hub's pull, border check and warning are live.",
  "Advice cards are compiled from cited public sources and not yet reviewed by an agronomist; card approvals are simulated.",
  "The four states in the shared model's recorded training run are simulated: label-skewed parts of one public Tamil Nadu paddy dataset (Paddy Doctor). The training, the weights and the accuracies are real.",
];

export default function Home() {
  return (
    <div className="min-h-screen">
      <SiteNav />

      {/* Hero: the farmer's promise on the left, the network that keeps it on the right */}
      <header className="mx-auto max-w-6xl px-4 pt-12 pb-12 lg:pt-14">
        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)]">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full bg-leaf-mist text-forest text-xs font-semibold px-3 py-1.5 mb-6">
              {NODE_STATE}&rsquo;s node in the Saajha network
            </div>
            <h1 className="font-display text-4xl sm:text-5xl xl:text-[3.4rem] font-semibold text-forest leading-[1.08]">
              Every farmer deserves an agronomist,<br className="hidden sm:block" />{" "}
              <span className="text-turmeric">even on a ₹1,500 phone.</span>
            </h1>
            <p className="mt-6 text-lg text-ink-soft max-w-2xl leading-relaxed">
              This is how farmers reach their state&rsquo;s node in <b className="text-ink">Saajha</b>: crop advice over
              ordinary <b className="text-ink">voice calls, SMS and WhatsApp</b> in the farmer&rsquo;s own language, with photo
              diagnosis, crop recommendations and weather alerts. Every state runs its own node, so farmers&rsquo; records stay
              in their state; states share only what they learn.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/demo"
                className="bg-forest text-paper rounded-xl px-6 py-3.5 font-semibold hover:bg-leaf transition shadow-lg shadow-forest/20"
              >
                Open the live demo
              </Link>
              <Link
                href="/command"
                className="bg-white border border-forest/20 text-forest rounded-xl px-6 py-3.5 font-semibold hover:border-forest/50 transition"
              >
                View the district command center
              </Link>
            </div>
          </div>
          <div className="min-w-0 w-full max-w-xl lg:max-w-none">
            <NetworkCard />
          </div>
        </div>
      </header>

      {/* What the network adds, measured */}
      <section aria-labelledby="saajha-adds-h" className="border-y border-forest/10 bg-paper-warm">
        <div className="mx-auto max-w-6xl px-4 py-10">
          <h2 id="saajha-adds-h" className="text-xs font-semibold tracking-widest text-ink-soft uppercase">
            What being in Saajha adds, measured
          </h2>
          <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-8 lg:grid-cols-4">
            {SAAJHA_RESULTS.map((s) => (
              <div key={s.label} className="flex flex-col-reverse justify-end">
                <dt className="text-sm text-ink-soft mt-1.5 leading-snug">{s.label}</dt>
                <dd className="font-display text-[1.65rem] sm:text-3xl font-semibold text-forest whitespace-nowrap">{s.value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-6 text-[11px] text-ink-soft leading-relaxed">
            From the federated training run recorded on the Saajha hub: four simulated states, each holding part of one
            public paddy dataset.{" "}
            <a href={`${HUB_URL}/federation`} className="font-medium text-forest underline underline-offset-2">
              Check every round on the hub
            </a>
            .
          </p>
        </div>
      </section>

      {/* The network */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="font-display text-3xl font-semibold text-forest max-w-2xl">
          One state&rsquo;s node in a national network
        </h2>
        <p className="mt-4 text-ink-soft max-w-3xl leading-relaxed">
          Saajha lets states learn from each other without pooling farmers&rsquo; data. Each state runs its own node like
          this one: its farmers, tickets and expert answers stay here. Only three kinds of things may cross to the shared
          layer:
        </p>
        <div className="grid md:grid-cols-3 gap-5 mt-10">
          {CROSSINGS.map((c) => (
            <div key={c.title} className="rounded-2xl bg-white border border-forest/15 p-6 flex flex-col">
              <div className="flex items-center justify-between gap-3">
                <div className="h-9 w-9 rounded-lg bg-leaf-mist flex items-center justify-center">
                  <c.icon size={18} className="text-forest" aria-hidden="true" />
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                    c.live ? "bg-leaf-mist text-forest" : "bg-amber-100 text-clay"
                  }`}
                >
                  {c.status}
                </span>
              </div>
              <h3 className="font-semibold text-lg mt-3 text-ink">{c.title}</h3>
              <p className="text-sm text-ink-soft mt-2 leading-relaxed">{c.body}</p>
              {c.note && <p className="text-sm text-ink mt-3 leading-relaxed">{c.note}</p>}
              {c.href && (
                <a href={c.href} className="mt-auto pt-3 inline-flex items-center gap-1 text-sm font-medium text-forest">
                  {c.cta} <ArrowUpRight size={14} aria-hidden="true" />
                </a>
              )}
            </div>
          ))}
        </div>
        <p className="mt-6 inline-flex items-start gap-2 text-sm text-ink">
          <ShieldCheck size={18} className="text-forest shrink-0 mt-0.5" aria-hidden="true" />
          One rule holds it together: raw farmer data never leaves its state.
        </p>
      </section>

      {/* The gap */}
      <section className="border-t border-forest/10">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="font-display text-3xl font-semibold text-forest max-w-2xl">
            The problem isn&rsquo;t a lack of agri-apps. It&rsquo;s that most expect the farmer to read, type and tap.
          </h2>
          <p className="mt-4 text-ink-soft max-w-3xl leading-relaxed">
            Advisory apps assume a smartphone, a data plan and comfort with text in English or Hindi. Many of the farmers
            losing the most to crop disease would rather talk than type, share one phone across a household, or farm where
            coverage is patchy. A Saajha node meets them on an ordinary call or SMS, in their own language.
          </p>

          <div className="mt-10 border-y border-forest/10 py-8">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {STATS.map((s) => (
                <div key={s.label}>
                  <div className="font-display text-3xl font-semibold text-forest">{s.value}</div>
                  <div className="text-sm font-medium text-ink mt-1">{s.label}</div>
                  <div className="text-xs text-ink-soft mt-0.5">{s.sub}</div>
                </div>
              ))}
            </div>
            <p className="mt-6 text-[11px] text-ink-soft leading-relaxed">{STAT_SOURCES}</p>
          </div>

          <div className="grid md:grid-cols-3 gap-5 mt-10">
            {CHANNELS.map((c) => (
              <div key={c.title} className="rounded-2xl bg-white border border-forest/15 p-6 hover:shadow-lg transition">
                <div className="h-9 w-9 rounded-lg bg-leaf-mist flex items-center justify-center">
                  <c.icon size={18} className="text-forest" aria-hidden="true" />
                </div>
                <h3 className="font-semibold text-lg mt-3 text-ink">{c.title}</h3>
                <p className="text-sm text-ink-soft mt-2 leading-relaxed">{c.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Platform modules */}
      <section className="border-t border-forest/10">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="font-display text-3xl font-semibold text-forest">What this node does today</h2>
          <p className="mt-3 text-ink-soft max-w-3xl">
            Six modules share the node&rsquo;s own data layer, so each interaction adds to the district picture.
          </p>
          <div className="grid md:grid-cols-3 gap-5 mt-10">
            {MODULES.map((m) => (
              <Link key={m.title} href={m.href} className="rounded-2xl bg-white border border-forest/15 p-6 hover:shadow-lg hover:border-forest/40 transition block">
                <div className="h-9 w-9 rounded-lg bg-leaf-mist flex items-center justify-center">
                  <m.icon size={18} className="text-forest" aria-hidden="true" />
                </div>
                <h3 className="font-semibold text-lg mt-3 text-ink">{m.title}</h3>
                <p className="text-sm text-ink-soft mt-2 leading-relaxed">{m.body}</p>
                <div className="text-sm font-medium text-forest mt-3">{m.cta}</div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Data sources */}
      <section className="bg-paper-warm border-y border-forest/10">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <div className="text-xs font-semibold tracking-widest text-ink-soft mb-4 uppercase">Data sources</div>
          <div className="flex flex-wrap gap-2 text-sm">
            {DATA_SOURCES.map((s) => (
              <span key={s} className="rounded-full bg-white border border-forest/15 px-3 py-1.5">{s}</span>
            ))}
          </div>
          <p className="mt-4 text-xs text-ink-soft">
            Weather forecasts in the demo use Open-Meteo; the production source is IMD Agromet Advisory Services.
          </p>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-forest text-paper">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="font-display text-3xl font-semibold">How it works</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-6 mt-10">
            {STEPS.map((s) => (
              <div key={s.n} className="relative">
                <div className={`font-display text-4xl font-semibold ${s.crosses ? "text-turmeric-soft" : "text-leaf-bright/50"}`}>{s.n}</div>
                <h3 className="font-semibold mt-2">{s.t}</h3>
                <p className="text-sm text-paper/70 mt-1.5 leading-relaxed">{s.d}</p>
              </div>
            ))}
          </div>
          <div className="mt-12 rounded-2xl bg-white/5 border border-white/10 p-6">
            <div className="text-xs font-semibold tracking-widest text-paper/50 mb-3 uppercase">Built with Google AI</div>
            <div className="flex flex-wrap gap-2 text-sm">
              {GOOGLE_AI.map((t) => (
                <span key={t} className="rounded-full bg-white/10 px-3 py-1.5">{t}</span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* District early-warning layer */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-amber-100 text-clay text-xs font-semibold px-3 py-1.5 mb-4">
              District early-warning layer
            </div>
            <h2 className="font-display text-3xl font-semibold text-forest">
              Answering one farmer is a service.<br />Learning from every farmer is an <span className="text-turmeric">early-warning system</span>.
            </h2>
            <p className="mt-4 text-ink-soft leading-relaxed">
              Every call, SMS and photo is a structured, geotagged data point. When similar reports cluster in one block,
              the node flags the outbreak and lets the District Agriculture Officer broadcast a voice and SMS alert to the
              farmers in the affected blocks. Saajha takes this across state borders: a neighbouring state&rsquo;s node
              receives the count, never the farmers. That is live between the Telangana and Maharashtra nodes, on
              scenario counts.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
              <Link href="/command" className="inline-block bg-forest text-paper rounded-xl px-5 py-3 font-semibold hover:bg-leaf transition">
                Open the command center
              </Link>
              <a href={`${HUB_URL}/exchange`} className="inline-flex items-center gap-1 text-sm font-medium text-forest">
                See counts cross on the hub <ArrowUpRight size={14} aria-hidden="true" />
              </a>
            </div>
          </div>
          {/* What the officer sees: the warning the hub is sending this state right now, not an invented example */}
          <BorderWarning />
        </div>
      </section>

      {/* What's real */}
      <section className="border-t border-forest/10 bg-paper-warm">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="font-display text-3xl font-semibold text-forest">What&rsquo;s real in this demo</h2>
          <div className="grid md:grid-cols-2 gap-5 mt-8">
            <div className="rounded-2xl bg-white border border-forest/15 p-6">
              <div className="text-xs font-semibold tracking-widest text-forest uppercase">Real</div>
              <ul className="mt-3 space-y-2 text-sm text-ink-soft leading-relaxed list-disc pl-5">
                {REAL.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl bg-white border border-forest/15 p-6">
              <div className="text-xs font-semibold tracking-widest text-clay uppercase">Simulated or sample</div>
              <ul className="mt-3 space-y-2 text-sm text-ink-soft leading-relaxed list-disc pl-5">
                {SIMULATED.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-forest text-paper/75">
        <div className="mx-auto max-w-6xl px-4 py-10 flex flex-wrap items-start justify-between gap-x-12 gap-y-8 text-sm">
          <div className="max-w-xl">
            <span className="font-display text-lg text-paper font-semibold">Saajha · {NODE_STATE} node</span>
            <span className="ml-3">
              <span lang="hi">आवाज़ ही असली ऐप है</span> · the voice is the real app.
            </span>
            <p className="mt-3 text-paper">
              The farmer layer of{" "}
              <a href={HUB_URL} className="font-semibold underline underline-offset-4">
                Saajha <span lang="hi">साझा</span>
              </a>
              : states share what they&rsquo;ve learned, not who their farmers are.
            </p>
            <div className="mt-3 text-xs text-paper/65 leading-relaxed">
              Build with AI: Code for Communities, Edition 2 · PS-04 Agricultural Intelligence.
            </div>
          </div>
          <div className="flex gap-x-12 gap-y-6">
            <div>
              <div className="text-xs font-semibold tracking-widest text-paper/65 uppercase mb-2">This node</div>
              <div className="flex flex-col gap-1.5">
                <Link href="/demo" className="hover:text-paper">Demo</Link>
                <Link href="/recommend" className="hover:text-paper">Crop advisor</Link>
                <Link href="/whatsapp" className="hover:text-paper">WhatsApp</Link>
                <Link href="/command" className="hover:text-paper">Command center</Link>
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold tracking-widest text-paper/65 uppercase mb-2">Saajha network</div>
              <div className="flex flex-col gap-1.5">
                {[
                  { href: HUB_URL, label: "The network" },
                  { href: `${HUB_URL}/federation`, label: "Federation record" },
                  { href: `${HUB_URL}/exchange`, label: "Early warning" },
                  { href: `${HUB_URL}/method`, label: "Method and limits" },
                ].map((l) => (
                  <a key={l.href} href={l.href} className="inline-flex items-center gap-0.5 hover:text-paper">
                    {l.label} <ArrowUpRight size={14} aria-hidden="true" />
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

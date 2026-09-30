// Depth and reach, on paper: farmers never come to this hub; they reach their own state's node in
// their own language. The wall shows each language in its own script (Anek has a cut for each),
// with `lang` set so screen readers and fonts treat every name correctly.
import { ArrowUpRight, ChatIcon, GlobeIcon, PhoneIcon, SmsIcon } from "./sectionIcons";

const NODE_URL = (process.env.NEXT_PUBLIC_NODE_URL ?? "https://saajha-node.vercel.app").replace(/\/+$/, "");

const LANGUAGES = [
  { code: "hi", native: "हिन्दी", english: "Hindi" },
  { code: "en", native: "English", english: "English" },
  { code: "mr", native: "मराठी", english: "Marathi" },
  { code: "te", native: "తెలుగు", english: "Telugu" },
  { code: "ta", native: "தமிழ்", english: "Tamil" },
  { code: "kn", native: "ಕನ್ನಡ", english: "Kannada" },
  { code: "ml", native: "മലയാളം", english: "Malayalam" },
  { code: "bn", native: "বাংলা", english: "Bengali" },
  { code: "gu", native: "ગુજરાતી", english: "Gujarati" },
  { code: "pa", native: "ਪੰਜਾਬੀ", english: "Punjabi" },
  { code: "or", native: "ଓଡ଼ିଆ", english: "Odia" },
  { code: "as", native: "অসমীয়া", english: "Assamese" },
];

const CHANNELS = [
  { label: "Voice call", Icon: PhoneIcon },
  { label: "SMS", Icon: SmsIcon },
  { label: "WhatsApp", Icon: ChatIcon },
  { label: "Web", Icon: GlobeIcon },
];

export default function Reach() {
  return (
    <section aria-labelledby="reach-h" className="bg-paper text-ink">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
        <div className="grid gap-8 lg:grid-cols-12 lg:items-end lg:gap-10">
          <div className="lg:col-span-7">
            <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-muted">Depth and reach</p>
            <h2 id="reach-h" className="display mt-5 text-balance text-[clamp(2rem,4.4vw,3.4rem)]">
              Farmers never visit this site. They reach their own state.
            </h2>
          </div>
          <p className="max-w-[62ch] text-pretty text-lg leading-relaxed text-muted lg:col-span-5">
            Each state&apos;s node is KisanVaani: voice calls, SMS, WhatsApp and the web, in the farmer&apos;s own language. Tickets
            go to the state&apos;s own experts, and alerts to its own district officers.
          </p>
        </div>

        <ul
          aria-label="Languages"
          className="mt-14 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-rule bg-rule sm:mt-16 sm:grid-cols-3 lg:grid-cols-4"
        >
          {LANGUAGES.map((l) => (
            <li key={l.code} className="flex min-w-0 flex-col justify-between gap-3 bg-sheet px-4 py-6 sm:px-7 sm:py-8">
              <span lang={l.code} className="block text-[clamp(1.7rem,3.5vw,3.1rem)] font-semibold leading-[1.3] text-ink">
                {l.native}
              </span>
              <span className="block text-[13px] font-semibold uppercase tracking-[0.14em] text-muted">{l.english}</span>
            </li>
          ))}
        </ul>

        <ul
          aria-label="Channels"
          className="mt-14 grid grid-cols-2 gap-x-6 gap-y-7 border-y border-rule py-8 sm:mt-16 sm:grid-cols-4 sm:py-10"
        >
          {CHANNELS.map(({ label, Icon }) => (
            <li key={label} className="flex items-center gap-3.5">
              <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-full border border-rule bg-sheet text-ink sm:size-14">
                <Icon className="size-6 sm:size-7" />
              </span>
              <span className="text-lg font-semibold leading-tight">{label}</span>
            </li>
          ))}
        </ul>

        <div className="mt-8 flex flex-col gap-6 sm:mt-10 lg:flex-row lg:items-center lg:justify-between lg:gap-10">
          <p className="max-w-[62ch] text-pretty text-[15px] leading-relaxed text-muted">
            In this demo the phone and WhatsApp screens are browser simulators; no public number is connected yet.
          </p>
          <div className="flex shrink-0 flex-wrap gap-3">
            <a
              href={`${NODE_URL}/demo`}
              className="group inline-flex items-center gap-2.5 rounded-md bg-ink px-5 py-3.5 text-base font-semibold text-white no-underline transition-colors hover:bg-[#2a3888]"
            >
              Try it as a farmer
              <ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </a>
            <a
              href={`${NODE_URL}/whatsapp`}
              className="group inline-flex items-center gap-2.5 rounded-md border border-ink px-5 py-3.5 text-base font-semibold text-ink no-underline transition-colors hover:bg-carbon-wash"
            >
              WhatsApp
              <ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

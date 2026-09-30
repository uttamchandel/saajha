// The one rule, as a customs form: what may cross a state border on the left, what stays home on
// the right, and the border itself between them (drawn dash-dot, the way maps draw a boundary),
// stamped by the hub's border check. Gold marks only what crosses.
import Link from "next/link";
import css from "./sections.module.css";
import { ArrowRight, Lock, Tick } from "./sectionIcons";

const CROSSES = [
  {
    what: "Model weights",
    how: "330,536 bytes per state per round, fingerprinted with sha256. A node refuses a file that doesn't match.",
  },
  {
    what: "Outbreak counts",
    how: "District, week, pest and a count of at least 5, so a neighbouring state is warned first.",
  },
  {
    what: "Approved advice",
    how: "A node asks for a condition's advice card in a language. Only the label and the language cross, never the photo.",
  },
];

const STAYS = ["Photos of farmers' fields", "Names and phone numbers", "Tickets, calls and expert notes", "Any count below 5"];

export default function BorderRule() {
  return (
    <section aria-labelledby="rule-h" className="border-t border-rule bg-sheet text-ink">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
        <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-muted">The one rule</p>
        <h2 id="rule-h" className="display mt-5 max-w-[20ch] text-balance text-[clamp(2rem,4.4vw,3.4rem)]">
          Raw farmer data never leaves its state.
        </h2>

        <div className="mt-14 grid md:mt-20 md:grid-cols-[minmax(0,1fr)_10rem_minmax(0,1fr)] lg:grid-cols-[minmax(0,1fr)_13rem_minmax(0,1fr)]">
          {/* What crosses */}
          <div>
            <h3 className="flex items-center gap-3 text-2xl font-semibold">
              <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-gold text-ink">
                <Tick className="size-[18px]" />
              </span>
              Crosses the border
            </h3>
            <dl className="mt-6 border-t border-rule">
              {CROSSES.map((c) => (
                <div key={c.what} className="border-b border-rule py-5">
                  <dt className="text-lg font-semibold">{c.what}</dt>
                  <dd className="mt-1 text-pretty text-base leading-relaxed text-muted">{c.how}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* The border: dash-dot line with the stamp on it. Horizontal when the columns stack. */}
          <div aria-hidden="true" className="relative my-12 flex items-center justify-center md:my-0">
            <svg className="absolute inset-x-0 top-1/2 h-1 w-full -translate-y-1/2 text-ink/45 md:hidden">
              <line x1="0" y1="2" x2="100%" y2="2" stroke="currentColor" strokeWidth="2" strokeDasharray="14 7 0.5 7" strokeLinecap="round" />
            </svg>
            <svg className="absolute inset-y-0 left-1/2 hidden h-full w-1 -translate-x-1/2 text-ink/45 md:block">
              <line x1="2" y1="0" x2="2" y2="100%" stroke="currentColor" strokeWidth="2" strokeDasharray="14 7 0.5 7" strokeLinecap="round" />
            </svg>
            <div className="relative rounded-full bg-sheet p-2">
              <div className={`size-32 text-ink md:size-36 lg:size-40 ${css.stamp}`}>
                <BorderStamp />
              </div>
            </div>
          </div>

          {/* What stays */}
          <div>
            <h3 className="flex items-center gap-3 text-2xl font-semibold">
              <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border-2 border-ink text-ink">
                <Lock className="size-[18px]" />
              </span>
              Stays in the state
            </h3>
            <ul className="mt-6 border-t border-rule">
              {STAYS.map((s) => (
                <li key={s} className="flex items-center gap-3 border-b border-rule py-5 text-lg font-semibold">
                  <Lock className="size-4 shrink-0 text-muted" />
                  {s}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-5 border-t border-rule pt-10 sm:flex-row sm:items-center sm:gap-10 md:mt-20">
          <Link
            href="/exchange"
            className="group inline-flex shrink-0 items-center gap-3 self-start rounded-md bg-ink px-6 py-3.5 text-base font-semibold text-white no-underline transition-colors hover:bg-[#2a3888] sm:self-auto"
          >
            Test the border yourself
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <p className="max-w-[58ch] text-pretty text-[15px] leading-relaxed text-muted">
            Try to send a phone number, a count of 3 or a person&apos;s name. The hub refuses each one without repeating it.
          </p>
        </div>
      </div>
    </section>
  );
}

/** A round rubber stamp: "BORDER CHECK" over the top, "SAAJHA HUB" under the bottom, a tick inside. */
function BorderStamp() {
  return (
    <svg viewBox="0 0 160 160" className="h-full w-full" fill="none">
      <defs>
        {/* Top text sits outside its arc; bottom text reads left to right along the bottom, upright. */}
        <path id="br-stamp-top" d="M 21 80 A 59 59 0 0 1 139 80" />
        <path id="br-stamp-bottom" d="M 10.8 80 A 69.2 69.2 0 0 0 149.2 80" />
        <filter id="br-stamp-rough" x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="11" result="grain" />
          <feDisplacementMap in="SourceGraphic" in2="grain" scale="1.8" />
        </filter>
      </defs>
      <g filter="url(#br-stamp-rough)" stroke="currentColor">
        <circle cx="80" cy="80" r="75" strokeWidth="3.5" />
        <circle cx="80" cy="80" r="54" strokeWidth="1.5" />
        <g fill="currentColor" stroke="none" fontSize="14.5" fontWeight="700" letterSpacing="2">
          <text textAnchor="middle">
            <textPath href="#br-stamp-top" startOffset="50%">
              BORDER CHECK
            </textPath>
          </text>
          <text textAnchor="middle">
            <textPath href="#br-stamp-bottom" startOffset="50%">
              SAAJHA HUB
            </textPath>
          </text>
          <circle cx="16" cy="80" r="2.6" />
          <circle cx="144" cy="80" r="2.6" />
        </g>
        <path d="M55 81 71 97 105 62" strokeWidth="7.5" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  );
}

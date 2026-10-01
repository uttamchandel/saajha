// Running right now: the three things a reviewer can go and see work on the live sites. The learning
// loop (weights cross, so its packets are gold), the early warning (counts cross, so it is signal
// blue), and the measured case against "just ask Gemini" (the shared model's bar is gold).
import type { ReactNode } from "react";
import Link from "next/link";
import { cardNight, figure, labelNight, linkNight, pillNight } from "@/lib/ui";
import css from "./sections.module.css";
import { ArrowRight, ArrowUpRight, LiveDot } from "./sectionIcons";

const NODE_URL = (process.env.NEXT_PUBLIC_NODE_URL ?? "https://saajha-node.vercel.app").replace(/\/+$/, "");

const CARD = `${cardNight} p-6 sm:p-8`;
// `.display` is unlayered CSS (line-height 1.08), so a Tailwind leading-* class can't loosen it;
// multi-line card titles get a little more air through an inline style instead.
const CARD_TITLE = "display mt-4 text-balance";
const TITLE_AIR = { lineHeight: 1.15 } as const;
const CARD_TITLE_SIZE = "text-[clamp(1.4rem,2.3vw,1.85rem)]";
const LINK = `${linkNight} group inline-flex items-center gap-2 font-semibold`;

const HI = "font-semibold text-starlight";

// `crossing`: the step sends something over a state border (weights out, a release back), so its
// marker carries a gold packet, the same gold the hero's packets use.
const LOOP_STEPS: { body: ReactNode; crossing?: boolean }[] = [
  { body: <>A photo the model isn&apos;t sure of goes to a Telangana expert, who verifies it.</> },
  {
    body: <>The state nodes train the released model on their verified cases. Only weights leave.</>,
    crossing: true,
  },
  {
    body: (
      <>
        The hub averages them and releases round 41 only if held-out accuracy holds:{" "}
        <span className={`${HI} whitespace-nowrap`}>84.51% → 84.64%</span>.
      </>
    ),
    crossing: true,
  },
  {
    body: (
      <>
        The next photo, which round 40 read as bacterial leaf blight at 35%, is now decided:{" "}
        <span className={`${HI} whitespace-nowrap`}>brown spot, 78%</span>.
      </>
    ),
  },
];

const WEEKLY = [6, 14, 31];

export default function LiveNow() {
  return (
    <section aria-labelledby="live-h" className="bg-night text-starlight">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
        <p className={pillNight}>
          <LiveDot />
          Running right now
        </p>
        <h2 id="live-h" className="display mt-4 text-balance text-[clamp(2rem,4.4vw,3.4rem)]">
          Not a slide. A working network.
        </h2>

        <div className="mt-12 grid gap-5 sm:mt-16 lg:grid-cols-2">
          {/* (a) Learning loop, full width */}
          <article aria-labelledby="loop-h" className={`${CARD} sm:p-10 lg:col-span-2`}>
            <p className={`${labelNight} flex items-center gap-2.5`}>
              <span aria-hidden="true" className="size-2 rounded-full bg-gold shadow-[0_0_10px_2px_rgba(251,191,36,0.45)]" />
              Learning loop
            </p>
            <h3 id="loop-h" className={`${CARD_TITLE} max-w-[24ch] text-[clamp(1.6rem,3vw,2.35rem)]`} style={TITLE_AIR}>
              One expert verifies a photo. Every state&apos;s model gets better.
            </h3>

            <ol className="mt-10 grid gap-x-8 gap-y-9 sm:grid-cols-2 lg:grid-cols-4">
              {LOOP_STEPS.map((s, i) => (
                <li key={i} className="relative border-t border-night-line pt-6">
                  {s.crossing && (
                    <span
                      aria-hidden="true"
                      className="absolute -top-[4px] left-8 size-[7px] rounded-full bg-gold shadow-[0_0_12px_3px_rgba(251,191,36,0.5)]"
                    />
                  )}
                  <span aria-hidden="true" className={`${figure} block text-4xl text-haze`}>
                    {i + 1}
                  </span>
                  <p className="mt-4 text-pretty text-[15px] leading-relaxed text-haze">{s.body}</p>
                </li>
              ))}
            </ol>

            <div className="mt-10 flex flex-col gap-4 border-t border-night-line pt-6 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[15px] text-haze">Tested on the live site.</p>
              <div className="flex flex-wrap gap-x-7 gap-y-3">
                <Link href="/federation" className={LINK}>
                  See every round
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <a href={`${NODE_URL}/demo`} className={LINK}>
                  Try it as an expert
                  <ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                </a>
              </div>
            </div>
          </article>

          {/* (b) Early warning */}
          <article aria-labelledby="warn-h" className={`${CARD} flex flex-col`}>
            <p className={`${labelNight} flex items-center gap-2.5`}>
              <span aria-hidden="true" className="size-2 rounded-full bg-signal shadow-[0_0_10px_2px_rgba(125,211,252,0.45)]" />
              Early warning
            </p>
            <h3 id="warn-h" className={`${CARD_TITLE} ${CARD_TITLE_SIZE}`} style={TITLE_AIR}>
              Pink bollworm is rising in Yavatmal. Adilabad hears first.
            </h3>

            <figure className="mt-8">
              <div
                role="img"
                aria-label="Weekly pink bollworm reports from Yavatmal: 6, then 14, then 31."
                className="flex h-44 items-end gap-4 border-b border-night-line sm:gap-6"
              >
                {WEEKLY.map((v) => (
                  <div key={v} className="flex h-full flex-1 flex-col items-center justify-end">
                    <span aria-hidden="true" className={`${figure} mb-2 text-3xl text-signal`}>
                      {v}
                    </span>
                    <span
                      aria-hidden="true"
                      className={`block w-full max-w-[5.5rem] rounded-t-[5px] bg-signal ${css.barY}`}
                      style={{ height: `calc((100% - 2.4rem) * ${(v / Math.max(...WEEKLY)).toFixed(4)})` }}
                    />
                  </div>
                ))}
              </div>
              <figcaption className="mt-3 text-[15px] text-haze">Weekly reports from Yavatmal</figcaption>
            </figure>

            <p className="mt-6 text-pretty text-[15px] leading-relaxed text-haze">
              The counts cross the Penganga river from Maharashtra&apos;s node to Telangana&apos;s. Gemini drafts the district
              officer&apos;s alert in Telugu; the officer reviews it before it goes out.
            </p>
            <p className="mt-4 text-[15px] leading-relaxed text-starlight">
              Scenario counts. The pull, the border check and the Gemini draft are live.
            </p>
            <div className="mt-auto pt-7">
              <Link href="/exchange" className={LINK}>
                Watch the counts cross
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </article>

          {/* (c) Why not just ask Gemini? */}
          <article aria-labelledby="gemini-h" className={`${CARD} flex flex-col`}>
            <p className={labelNight}>Accuracy on 50 held-out paddy photos</p>
            <h3 id="gemini-h" className={`${CARD_TITLE} ${CARD_TITLE_SIZE}`} style={TITLE_AIR}>
              Why not just ask Gemini?
            </h3>

            <ul className="mt-8 space-y-7">
              <Bar label="Gemini alone" value={24} barClass="bg-haze" />
              <Bar label="Federated model" value={84} barClass="bg-gold" />
            </ul>

            <p className="mt-8 text-pretty text-[15px] leading-relaxed text-haze">
              Gemini was about 92% confident whether it was right or wrong. So here Gemini never decides a diagnosis: it
              checks each photo, gives a second opinion (a disagreement opens an audit ticket), and writes advice and alerts in
              the farmer&apos;s language.
            </p>
            <div className="mt-auto pt-7">
              <Link href="/method" className={LINK}>
                Method and limits
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}

function Bar({ label, value, barClass }: { label: string; value: number; barClass: string }) {
  return (
    <li>
      <p className="flex items-baseline justify-between gap-4">
        <span className="text-[15px] font-semibold text-starlight">{label}</span>
        <span className={`${figure} text-[2.6rem]`}>{value}%</span>
      </p>
      <div aria-hidden="true" className="mt-3 h-3 overflow-hidden rounded-full bg-night-line">
        <div className={`h-full rounded-full ${barClass} ${css.barX}`} style={{ width: `${value}%` }} />
      </div>
    </li>
  );
}

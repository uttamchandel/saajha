// The problem, on night, straight after the hero: why states can't simply pool their farmers'
// records, and the one idea that answers it (only the model travels). Every figure is sourced below.
import { btnGhostNight, figure, pillNight } from "@/lib/ui";
import { ArrowDown } from "./sectionIcons";

const STATS = [
  { value: "146.5M", label: "farm holdings in India", note: "86% small or marginal, under 2 ha" },
  { value: "15–25%", label: "of potential crop output lost", note: "to pests, weeds and diseases" },
  { value: "1 : 1,162", label: "public extension workers to farm holdings", note: "against a recommended 1 : 750" },
];

export default function Problem() {
  return (
    <section aria-labelledby="problem-h" className="border-t border-night-line bg-night text-starlight">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
        <p className={pillNight}>The problem</p>
        <h2 id="problem-h" className="display mt-4 max-w-[22ch] text-balance text-[clamp(2rem,4.4vw,3.4rem)]">
          Pests cross state borders. Farmer data shouldn&apos;t have to.
        </h2>

        <div className="mt-12 grid gap-12 lg:mt-16 lg:grid-cols-12 lg:gap-10">
          <p className="max-w-[62ch] text-pretty text-lg leading-relaxed text-haze lg:col-span-5 lg:text-[1.2rem]">
            Agriculture is a state subject, and each state keeps its own farmers&apos; records. So each state&apos;s crop-disease
            model learns only what its own farmers have reported, and meets a new pest with a model that has never seen it.
          </p>

          <div className="lg:col-span-7">
            <ul className="grid border-t border-night-line sm:grid-cols-[max-content_minmax(0,1fr)] sm:gap-x-10">
              {STATS.map((s) => (
                <li
                  key={s.value}
                  className="grid gap-y-3 border-b border-night-line py-7 sm:col-span-2 sm:grid-cols-subgrid sm:items-baseline"
                >
                  <p className={`${figure} text-[clamp(2.75rem,5.4vw,4.25rem)] tracking-tight`}>
                    {s.value}
                  </p>
                  <div>
                    <p className="text-lg font-semibold leading-snug">{s.label}</p>
                    <p className="mt-1 text-[15px] text-haze">{s.note}</p>
                  </div>
                </li>
              ))}
            </ul>
            <p className="mt-5 text-[13px] leading-relaxed text-haze">
              Sources: Agriculture Census 2015-16 (Phase I); Parliament&apos;s Standing Committee on Agriculture chair, reported by
              Business Standard, July 2016; ICRISAT, Agriculture Extension System in India: A Meta-analysis, 2019.
            </p>
          </div>
        </div>

        <div className="mt-20 grid gap-8 border-t border-night-line pt-12 sm:mt-24 lg:grid-cols-12 lg:items-end lg:gap-10">
          <p className="text-pretty text-[clamp(1.45rem,2.7vw,2.2rem)] font-semibold leading-[1.22] tracking-[-0.005em] lg:col-span-9">
            Saajha&apos;s answer: each state trains on its own verified cases at home, and{" "}
            <span className="text-gold">only the model travels</span>, to be averaged with every other state&apos;s and sent
            back.
          </p>
          <div className="lg:col-span-3 lg:justify-self-end">
            <a href="#flip" className={`group ${btnGhostNight}`}>
              See it happen
              <ArrowDown className="size-4 transition-transform group-hover:translate-y-0.5" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

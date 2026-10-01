// The run's four headline results, on night. Each number is from the recorded federated run (see /federation)
// or the held-out comparison with Gemini (see /method); nothing here is estimated.
import type { ReactNode } from "react";
import { figure } from "@/lib/ui";

function Arrow() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="mx-[0.12em] inline-block h-[0.62em] w-[0.62em] align-[0.04em]" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12h17M14 5l7 7-7 7" />
    </svg>
  );
}

const STATS: { value: ReactNode; label: string }[] = [
  {
    value: (
      <>
        0%
        <Arrow />
        <span className="sr-only"> to </span>
        82%
      </>
    ),
    label: "State C, on pests and diseases it has never recorded, after 40 federated rounds",
  },
  {
    value: (
      <>
        84% <span className="font-sans text-[0.5em] font-normal text-haze">vs</span> 24%
      </>
    ),
    label: "The federated model vs Gemini alone, on 50 held-out paddy photos",
  },
  { value: "0", label: "Farmer records that crossed a state border, in 40 rounds" },
  { value: "330 KB", label: "All a state sends per round: model weights (330,536 bytes)" },
];

// Hairlines between cells: a 2 × 2 grid on phones, one row of four on desktop.
const CELL = [
  "pl-0",
  "border-l pl-4 sm:pl-6",
  "border-t pl-0 lg:border-t-0 lg:border-l lg:pl-6",
  "border-l border-t pl-4 sm:pl-6 lg:border-t-0",
];

export default function StatBand() {
  return (
    <dl className="mt-12 grid grid-cols-2 border-y border-night-line lg:mt-12 lg:grid-cols-4">
      {STATS.map((st, i) => (
        <div key={st.label} className={`flex flex-col-reverse justify-end border-night-line py-5 pr-3 sm:py-6 sm:pr-6 ${CELL[i]}`}>
          <dt className="mt-2 text-[13.5px] leading-snug text-haze sm:text-[14px]">{st.label}</dt>
          <dd className={`${figure} whitespace-nowrap text-[clamp(1.75rem,3.1vw,2.6rem)] text-starlight`}>
            {st.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}

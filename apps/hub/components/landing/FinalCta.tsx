// The close, on night: three things to try, each a whole-tile link.
import Link from "next/link";
import { cardNight } from "@/lib/ui";
import { ArrowRight } from "./sectionIcons";

const TILES = [
  {
    href: "/diagnose",
    title: "Diagnose a paddy photo",
    body: "The model the states trained together runs in your browser.",
  },
  {
    href: "/federation",
    title: "Replay the federation",
    body: "Every round's weights and fingerprint, on the record.",
  },
  {
    href: "/exchange",
    title: "Test the border",
    body: "Try to send a phone number across. Watch it get refused.",
  },
];

export default function FinalCta() {
  return (
    <section aria-labelledby="cta-h" className="border-t border-night-line bg-night text-starlight">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28">
        <h2 id="cta-h" className="display text-balance text-[clamp(2.4rem,5.6vw,4.6rem)]">
          See it for yourself.
        </h2>

        <ul className="mt-12 grid gap-5 sm:mt-16 md:grid-cols-3">
          {TILES.map((t) => (
            <li key={t.href}>
              <Link
                href={t.href}
                className={`${cardNight} group flex h-full min-h-52 flex-col p-6 text-starlight no-underline transition-colors duration-200 hover:border-white/25 hover:bg-white/10 sm:min-h-60 sm:p-8`}
              >
                <h3 className="display text-balance text-[clamp(1.5rem,2.3vw,1.9rem)]" style={{ lineHeight: 1.1 }}>
                  {t.title}
                </h3>
                <p className="mt-3 max-w-[34ch] text-pretty text-base leading-relaxed text-haze">{t.body}</p>
                <span aria-hidden="true" className="mt-auto block pt-10">
                  <span className="inline-flex size-12 items-center justify-center rounded-full border border-night-line transition-[translate,border-color,background-color,color] duration-200 group-hover:translate-x-1.5 group-hover:border-starlight group-hover:bg-starlight group-hover:text-night">
                    <ArrowRight className="size-5" />
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

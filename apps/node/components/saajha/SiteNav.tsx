// The node's one navigation bar, on every farmer-facing page. The lockup reads the way the product is
// built: Saajha, the network (it links to the hub), then this state's node in it.
import Link from "next/link";
import { ArrowUpRight, Sprout } from "lucide-react";
import { NODE_STATE } from "@/lib/node";
import { HUB_URL } from "./hub";

const LINKS = [
  { href: "/demo", label: "Demo" },
  { href: "/recommend", label: "Crop advisor" },
  { href: "/whatsapp", label: "WhatsApp" },
  { href: "/command", label: "Command center" },
];

export default function SiteNav({ current }: { current?: string }) {
  return (
    <nav aria-label="Main" className="border-b border-forest/10 bg-paper sticky top-0 z-20">
      <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2 sm:gap-2.5">
          <a
            href={HUB_URL}
            title="The Saajha network"
            className="font-display text-xl font-semibold text-forest inline-flex shrink-0 items-center gap-2 hover:text-leaf transition"
          >
            <Sprout size={18} aria-hidden="true" />
            Saajha
            <span lang="hi" className="hidden lg:inline font-sans text-[17px] font-medium text-turmeric-deep">
              साझा
            </span>
          </a>
          <span aria-hidden="true" className="h-5 w-px shrink-0 bg-forest/25" />
          <Link href="/" className="font-display text-base sm:text-xl font-semibold text-forest truncate hover:text-leaf transition">
            {NODE_STATE}
            <span className="hidden sm:inline"> node</span>
          </Link>
        </div>
        <div className="flex shrink-0 items-center gap-4 text-sm whitespace-nowrap">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={current === l.href ? "page" : undefined}
              className={`hidden md:inline hover:text-forest ${current === l.href ? "font-medium text-forest" : "text-ink-soft"}`}
            >
              {l.label}
            </Link>
          ))}
          <a href={HUB_URL} className="hidden xl:inline-flex items-center gap-0.5 text-ink-soft hover:text-forest">
            Saajha network <ArrowUpRight size={14} aria-hidden="true" />
          </a>
          <Link href="/demo" className="bg-forest text-paper rounded-full px-4 py-1.5 font-medium hover:bg-leaf transition">
            <span className="lg:hidden">Live demo</span>
            <span className="hidden lg:inline">Open the live demo</span>
          </Link>
        </div>
      </div>
    </nav>
  );
}

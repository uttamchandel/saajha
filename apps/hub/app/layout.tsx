import type { Metadata } from "next";
import Link from "next/link";
import {
  Anek_Bangla,
  Anek_Devanagari,
  Anek_Gujarati,
  Anek_Gurmukhi,
  Anek_Kannada,
  Anek_Malayalam,
  Anek_Odia,
  Anek_Tamil,
  Anek_Telugu,
  Fraunces,
  Inter,
} from "next/font/google";
import { ArrowUpRight, Sprout } from "lucide-react";
import "./globals.css";

// The family's type pairing, loaded exactly as the state node loads it.
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-fraunces" });
// Inter and Fraunces have no Indic glyphs, so each Indian script falls through to its own Anek cut.
const anekDeva = Anek_Devanagari({ subsets: ["devanagari"], variable: "--font-anek-deva" });
const anekTamil = Anek_Tamil({ subsets: ["tamil"], variable: "--font-anek-tamil" });
// The other scripts farmers read. Not preloaded: a browser fetches a script's file only when a page shows it.
const anekTelugu = Anek_Telugu({ subsets: ["telugu"], variable: "--font-anek-telugu", preload: false });
const anekKannada = Anek_Kannada({ subsets: ["kannada"], variable: "--font-anek-kannada", preload: false });
const anekMalayalam = Anek_Malayalam({ subsets: ["malayalam"], variable: "--font-anek-malayalam", preload: false });
const anekBangla = Anek_Bangla({ subsets: ["bengali"], variable: "--font-anek-bangla", preload: false });
const anekGujarati = Anek_Gujarati({ subsets: ["gujarati"], variable: "--font-anek-gujarati", preload: false });
const anekGurmukhi = Anek_Gurmukhi({ subsets: ["gurmukhi"], variable: "--font-anek-gurmukhi", preload: false });
const anekOdia = Anek_Odia({ subsets: ["oriya"], variable: "--font-anek-odia", preload: false });

const FONTS = [inter, fraunces, anekDeva, anekTamil, anekTelugu, anekKannada, anekMalayalam, anekBangla, anekGujarati, anekGurmukhi, anekOdia]
  .map((f) => f.variable)
  .join(" ");

export const metadata: Metadata = {
  title: "Saajha — states share what they've learned, not who their farmers are",
  description:
    "The shared layer of Saajha, a federated network for Indian agriculture: states' nodes train a crop-disease model together and share approved advice, and no farmer record crosses a state border.",
};

const NODE_URL = process.env.NEXT_PUBLIC_NODE_URL ?? "https://saajha-node.vercel.app";

const NAV = [
  { href: "/#flip", label: "The flip" },
  { href: "/federation", label: "Federation record" },
  { href: "/exchange", label: "Early warning" },
  { href: "/method", label: "Method and limits" },
];

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${FONTS} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-paper text-ink">
        {/* The same bar as the state node: wordmark and tag on the left, links, one pill on the right.
            Solid paper rather than the node's translucent one: this bar also passes over night sections. */}
        <header className="z-20 border-b border-forest/10 bg-paper lg:sticky lg:top-0">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-1 px-4 py-2.5 sm:px-6 lg:h-14 lg:flex-nowrap lg:py-0">
            <Link href="/" className="inline-flex items-center gap-2 font-display text-xl font-semibold text-forest no-underline">
              <Sprout size={18} aria-hidden="true" />
              Saajha
              <span lang="hi" className="font-sans text-[17px] font-medium text-turmeric-deep">
                साझा
              </span>
              <span className="hidden whitespace-nowrap font-sans text-[11px] font-semibold uppercase tracking-wider text-ink-soft sm:inline lg:hidden xl:inline">
                The shared layer
              </span>
            </Link>
            <nav aria-label="Main" className="order-3 flex w-full flex-wrap items-center gap-x-4 gap-y-1 whitespace-nowrap pb-0.5 text-sm lg:order-none lg:w-auto lg:flex-nowrap lg:pb-0">
              {NAV.map((n) => (
                <Link key={n.href} href={n.href} className="text-ink-soft transition-colors hover:text-forest">
                  {n.label}
                </Link>
              ))}
              <a href={NODE_URL} className="inline-flex items-center gap-0.5 text-ink-soft transition-colors hover:text-forest">
                State node <ArrowUpRight size={14} aria-hidden="true" />
              </a>
            </nav>
            <Link
              href="/diagnose"
              className="whitespace-nowrap rounded-full bg-forest px-4 py-1.5 text-sm font-medium text-paper no-underline transition-colors hover:bg-leaf"
            >
              Try a photo
            </Link>
          </div>
        </header>
        <div className="flex-1">{children}</div>
        <footer className="bg-forest text-paper/75">
          <div className="mx-auto flex max-w-6xl flex-wrap items-start justify-between gap-x-10 gap-y-6 px-4 py-10 text-sm sm:px-6 lg:flex-nowrap">
            <div className="min-w-0 max-w-xl">
              <span className="font-display text-lg font-semibold text-paper">Saajha</span>
              <span className="ml-3">
                <span lang="hi">साझा</span> means shared.
              </span>
              <p className="mt-2 text-[13px] leading-relaxed">
                States A–D are simulated partitions of one public Tamil Nadu dataset (Paddy Doctor, CC BY 4.0).
                Federation, weights and accuracies are real; the state topology is simulated.{" "}
                <Link href="/method" className="text-paper underline underline-offset-4">What is real and what is not</Link>.
              </p>
            </div>
            <nav aria-label="Footer" className="flex flex-wrap gap-x-4 gap-y-2 whitespace-nowrap lg:shrink-0">
              <Link href="/diagnose" className="hover:text-paper">Try a photo</Link>
              {NAV.slice(1).map((n) => (
                <Link key={n.href} href={n.href} className="hover:text-paper">
                  {n.label}
                </Link>
              ))}
              <a href={NODE_URL} className="inline-flex items-center gap-0.5 hover:text-paper">
                State node <ArrowUpRight size={14} aria-hidden="true" />
              </a>
            </nav>
          </div>
        </footer>
      </body>
    </html>
  );
}

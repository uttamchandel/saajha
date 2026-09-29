import type { Metadata } from "next";
import Link from "next/link";
import { Anek_Devanagari, Anek_Latin, Anek_Tamil } from "next/font/google";
import "./globals.css";

const anek = Anek_Latin({ subsets: ["latin"], axes: ["wdth"], variable: "--font-anek" });
const anekDeva = Anek_Devanagari({ subsets: ["devanagari"], axes: ["wdth"], variable: "--font-anek-deva" });
const anekTamil = Anek_Tamil({ subsets: ["tamil"], axes: ["wdth"], variable: "--font-anek-tamil" });

export const metadata: Metadata = {
  title: "Saajha — states share what they've learned, not who their farmers are",
  description:
    "A federated learning layer for India's agricultural DPI: one state's expert-verified crop diagnoses improve every state's model, and no farmer record crosses a state border.",
};

const NAV = [
  { href: "/", label: "The flip" },
  { href: "/diagnose", label: "Try a photo" },
  { href: "/federation", label: "Federation record" },
  { href: "/method", label: "Method and limits" },
];

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${anek.variable} ${anekDeva.variable} ${anekTamil.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-paper text-ink">
        <header className="border-b border-rule bg-sheet">
          <div className="mx-auto flex max-w-6xl flex-wrap items-baseline gap-x-8 gap-y-2 px-4 py-4 sm:px-6">
            <Link href="/" className="display text-2xl text-ink no-underline">
              Saajha <span className="font-normal text-muted" lang="hi">साझा</span>
            </Link>
            <nav aria-label="Main" className="flex flex-wrap gap-x-5 gap-y-1 text-[15px]">
              {NAV.map((n) => (
                <Link key={n.href} href={n.href} className="text-carbon underline-offset-4 hover:underline">
                  {n.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>
        <div className="flex-1">{children}</div>
        <footer className="border-t border-rule">
          <div className="mx-auto max-w-6xl px-4 py-6 text-sm text-muted sm:px-6">
            States A–D are simulated partitions of one public Tamil Nadu dataset (Paddy Doctor, CC BY 4.0).
            Federation, weights and accuracies are real; the state topology is simulated.{" "}
            <Link href="/method" className="text-carbon underline underline-offset-4">What is real and what is not</Link>.
          </div>
        </footer>
      </body>
    </html>
  );
}

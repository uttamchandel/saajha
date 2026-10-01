import type { Metadata } from "next";
import Exchange from "@/components/exchange/Exchange";
import { h1, lede } from "@/lib/ui";

export const metadata: Metadata = {
  title: "Early warning across state borders — Saajha",
  description:
    "State nodes share only k-anonymous outbreak counts; the hub checks them at the border and warns the neighbouring state before a pest arrives.",
};

export default function ExchangePage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <h1 className={h1}>Counts cross. Farmers don&apos;t.</h1>
      <p className={`mt-4 max-w-[68ch] ${lede}`}>
        Pests do not stop at state borders. Each state node publishes only how many reports of each pest it saw, by district
        and week, and never a count small enough to point to one farmer. This hub pulls those counts, checks them at the border,
        and warns the neighbouring state when an outbreak is rising next to its districts.
      </p>
      <Exchange />
    </main>
  );
}

import type { Metadata } from "next";
import Parity from "@/components/dev/Parity";

export const metadata: Metadata = {
  title: "Browser parity check — Saajha",
  description: "Checks that the browser's image features and model outputs match the Python run.",
  robots: { index: false, follow: false },
};

export default function ParityPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <h1 className="display text-[clamp(1.9rem,4.4vw,3rem)]">Does the browser see what Python saw?</h1>
      <p className="mt-4 max-w-[64ch] text-lg text-muted">
        For every test photo in the gallery, this page recomputes the image features in your browser from the JPEG, compares
        them with the features Python computed for the recorded run, and checks that both of State C&apos;s models give the
        same top answer as Python did.
      </p>
      <Parity />
    </main>
  );
}

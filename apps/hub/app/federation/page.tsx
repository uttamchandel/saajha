import type { Metadata } from "next";
import FederationRecord from "@/components/federation/FederationRecord";

export const metadata: Metadata = {
  title: "Federation record — Saajha",
  description:
    "Every round of the recorded Flower run: what crossed state borders (model weights only), what each state can diagnose before and after federation, and a way to verify every round's weights in your browser.",
};

export default function FederationPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <h1 className="display text-[clamp(2.1rem,5.2vw,3.6rem)]">Federation record</h1>
      <FederationRecord />
    </main>
  );
}

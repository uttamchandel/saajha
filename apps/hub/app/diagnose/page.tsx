import type { Metadata } from "next";
import Link from "next/link";
import type { Card } from "@/app/api/advisory/route";
import DiagnoseApp from "@/components/diagnose/DiagnoseApp";
import type { ClassKey } from "@/lib/classes";
import knowledge from "@/lib/knowledge.json";

export const metadata: Metadata = {
  title: "Try a photo — Saajha",
  description:
    "Score a paddy photo with State C's model before and after federation, get Gemini's second opinion, and see when a case goes to a human expert instead.",
};

// The reference cards, minus the internal fact-check notes. Shown as-is when Gemini
// cannot write the advisory, and offered for comparison when it can.
const CARDS = Object.fromEntries(
  Object.entries(knowledge as unknown as Record<ClassKey, Card>).map(([k, c]) => {
    const { notes: _notes, ...rest } = c;
    void _notes;
    return [k, rest];
  }),
) as Record<ClassKey, Card>;

export default function DiagnosePage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <h1 className="display max-w-[22ch] text-[clamp(2rem,4.8vw,3.3rem)]">Try it on a photo of your own</h1>
      <p className="mt-5 max-w-[64ch] text-lg text-muted">
        Your photo is scored by State C&apos;s model twice: trained only on its own experts&apos; cases, and after federation.
        The federated model decides. When it clears its calibrated threshold and Gemini confirms the photo shows paddy,
        you get advice in your language. Gemini also names the condition as a second opinion; if it differs, the advice
        stands and the case is logged for a State C expert to audit. When the federated model is unsure, a State C expert
        decides instead of a guess.
      </p>
      <p className="mt-3 max-w-[64ch] text-[15px] text-muted">
        The models are the recorded ones from the federation run, replayed with their real weights; nothing trains here.{" "}
        <Link href="/method" className="text-carbon underline underline-offset-4">
          What is real and what is simulated
        </Link>
        .
      </p>
      <DiagnoseApp cards={CARDS} />
    </main>
  );
}

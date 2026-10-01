import type { Metadata } from "next";
import ModelCheck from "@/components/ModelCheck";

export const metadata: Metadata = {
  title: "Model check — Saajha state node",
  description: "Checks that this state node runs the Saajha hub's released model exactly as Python did.",
  robots: { index: false, follow: false },
};

export default function ModelCheckPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-display text-4xl font-semibold text-forest">Does this state node see what Python saw?</h1>
      <p className="mt-4 max-w-2xl text-lg text-ink-soft">
        The node downloads the shared paddy model the Saajha hub released, checks its fingerprint, and runs it in your
        browser on the hub&rsquo;s attributed test photos. Each result is compared with the image features and the answer
        Python recorded for the same photo during federated training.
      </p>
      <ModelCheck />
    </main>
  );
}

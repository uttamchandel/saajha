// Section 7: credits and licences. Everything reused is named, with its licence.
import type { RunFile } from "@/lib/contract";
import { link } from "@/lib/ui";
import Section from "./Section";

export default function Credits({ provenance }: { provenance: RunFile["provenance"] }) {
  const ds = provenance.dataset;
  const credits: { lead: string; body: React.ReactNode }[] = [
    {
      lead: "Paddy Doctor dataset.",
      body: (
        <>
          {ds.authors}. &ldquo;Paddy Doctor: A Visual Image Dataset for Automated Paddy Disease Classification and
          Benchmarking&rdquo;,{" "}
          <a href={ds.paper} className={link}>
            arXiv:2205.11108
          </a>
          . We use the {ds.name.replace(/^Paddy Doctor \(|\)$/g, "")} from the{" "}
          <a href={ds.url} className={link}>
            Kaggle competition paddy-disease-classification
          </a>
          , licensed {ds.licence}. The images are not redistributed, except at most six attributed samples shown on
          this site.
          {ds.source === "hf-mirror" && <> This run read the images from a public Hugging Face mirror of the Kaggle release.</>}
        </>
      ),
    },
    {
      lead: "Image backbone.",
      body: (
        <>
          MobileNetV3-Large with torchvision&apos;s IMAGENET1K_V2 weights; PyTorch and torchvision are BSD-3-Clause.
        </>
      ),
    },
    {
      lead: "Federated learning.",
      body: <>Flower {provenance.flwr} (Apache-2.0).</>,
    },
    {
      lead: "Browser inference.",
      body: <>onnxruntime-web (MIT), loaded from jsDelivr.</>,
    },
    {
      lead: "Google AI.",
      body: <>Google Gemini API: diagnosis and advisory with Gemini 3.5 Flash-Lite, speech with Gemini text-to-speech.</>,
    },
    {
      lead: "Advisory sources.",
      body: (
        <>
          TNAU Agritech Portal, IRRI Rice Knowledge Bank, ICAR-National Rice Research Institute, the Government of
          India&apos;s Integrated Pest Management package for rice (NCIPM, DPPQS) and others. Each advisory card lists
          its own sources.
        </>
      ),
    },
    {
      lead: "Code shared with the state node.",
      body: (
        <>
          Gemini retry wrapper, 12-language prompt map, speech wrapper and diagnosis-route pattern are adapted from
          the state node&apos;s code. Where that code began is in the repository&apos;s NOTICE file.
        </>
      ),
    },
    {
      lead: "Code adapted from SwasthSetu.",
      body: (
        <>
          Flower app layout and weights-only border inspector adapted from the author&apos;s SwasthSetu project, derived
          from Flower&apos;s quickstart-pytorch (Apache-2.0).
        </>
      ),
    },
    {
      lead: "Web and type.",
      body: (
        <>
          Next.js, React and Tailwind CSS (MIT). Typefaces served by Google Fonts under the SIL Open Font License 1.1:
          Fraunces by Undercase Type, Inter by Rasmus Andersson, and Anek by Ek Type for the Indian scripts.
        </>
      ),
    },
    {
      lead: "Saajha itself.",
      body: <>Apache-2.0. The licence is in the repository.</>,
    },
  ];

  return (
    <Section id="credits" title="Credits and licences">
      <ul className="mt-8 max-w-4xl border-b border-rule">
        {credits.map((c) => (
          <li key={c.lead} className="border-t border-rule py-4 text-[17px] leading-relaxed">
            <strong className="font-semibold">{c.lead}</strong> {c.body}
          </li>
        ))}
      </ul>
    </Section>
  );
}

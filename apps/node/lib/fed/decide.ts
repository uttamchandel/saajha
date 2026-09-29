// Who decides the diagnosis (Saajha step 2). Same rule as apps/hub/lib/gate.ts, plus the two
// cases a state node meets that the hub's paddy-only page does not: other crops, and the
// federated model being unreachable.
//
// Evidence (benchmark S3, 27 Sep): on 50 held-out photos Gemini alone named the right paddy
// condition 24% of the time while stating ~92% confidence right or wrong; the federated model
// was right 84% of the time with calibrated confidence. So for paddy the federated model decides
// and Gemini only checks the photo, gives a second opinion (logged for audit when it differs)
// and writes the advice from an approved card. Below the calibrated threshold a state expert
// decides. Crops with no federated model yet: Gemini's reading is shown as not verified, with
// safe first steps only, and the case always goes to an expert.
import { classLabel, type ClassKey, type DiagnosisKey } from "./classes";

export interface FedVerdict {
  top: ClassKey;
  /** Calibrated probability, 0-1. */
  p: number;
}

export interface GeminiCheck {
  is_plant: boolean;
  is_rice: boolean;
  class_key: DiagnosisKey;
  /** 0-100 */
  confidence: number;
}

export type Outcome = "advise" | "expert" | "unverified" | "not_plant";

export interface Decision {
  outcome: Outcome;
  /** Who made the call the farmer acts on. */
  decidedBy: "federated" | "agreement" | "expert" | "none";
  /** The paddy condition the advice is for (advise only). */
  classKey: ClassKey | null;
  secondOpinion: "agrees" | "differs" | "unavailable" | "not_applicable";
  /** Advice was given while Gemini's label differs: the case goes to an expert for audit. */
  audit: boolean;
  /** Plain-English explanation for the officer console and the demo screens. */
  reason: string;
}

const pct = (p: number) => (p >= 0.995 ? "above 99%" : `${Math.round(p * 100)}%`);

export function decide(tauFed: number, fed: FedVerdict | null, gemini: GeminiCheck | null): Decision {
  if (gemini && !gemini.is_plant) {
    return {
      outcome: "not_plant",
      decidedBy: "none",
      classKey: null,
      secondOpinion: "not_applicable",
      audit: false,
      reason: "Gemini says this photo does not show a plant, so there is nothing to diagnose.",
    };
  }
  if (gemini && !gemini.is_rice) {
    return {
      outcome: "unverified",
      decidedBy: "expert",
      classKey: null,
      secondOpinion: "not_applicable",
      audit: false,
      reason:
        "This crop has no federated model yet, so Gemini's reading is shown as not verified, with safe first steps only; a state expert decides.",
    };
  }
  if (!gemini) {
    // The federated model names a paddy condition for any photo it is shown; without Gemini's
    // paddy check nothing rules out a photo of something else, so a person decides.
    return {
      outcome: "expert",
      decidedBy: "expert",
      classKey: null,
      secondOpinion: "unavailable",
      audit: false,
      reason: fed
        ? `Gemini is unavailable, so nothing has confirmed the photo shows paddy; a state expert decides. The federated model reads it as ${classLabel(fed.top).toLowerCase()} (${pct(fed.p)}).`
        : "Neither Gemini nor the federated model could read this photo; a state expert decides.",
    };
  }
  if (!fed) {
    return {
      outcome: "expert",
      decidedBy: "expert",
      classKey: null,
      secondOpinion: "unavailable",
      audit: false,
      reason: "The federated paddy model could not be loaded, and Gemini's label never decides on its own, so a state expert decides.",
    };
  }

  const fedLabel = classLabel(fed.top).toLowerCase();
  const agrees = gemini.class_key === fed.top;
  const secondText = agrees
    ? "Gemini's second opinion agrees."
    : `Gemini's second opinion differs: ${classLabel(gemini.class_key).toLowerCase()} (${gemini.confidence}%). On our benchmark Gemini alone was right 24% of the time, so its label does not decide.`;

  if (fed.p >= tauFed) {
    return {
      outcome: "advise",
      decidedBy: agrees ? "agreement" : "federated",
      classKey: fed.top,
      secondOpinion: agrees ? "agrees" : "differs",
      audit: !agrees,
      reason: `The federated model is ${pct(fed.p)} sure this is ${fedLabel}, above its ${pct(tauFed)} threshold. ${secondText}${agrees ? "" : " The advice stands; the case is logged for expert audit."}`,
    };
  }
  return {
    outcome: "expert",
    decidedBy: "expert",
    classKey: null,
    secondOpinion: agrees ? "agrees" : "differs",
    audit: false,
    reason: `The federated model is only ${pct(fed.p)} sure (${fedLabel}), below its ${pct(tauFed)} threshold, so a state expert decides. ${secondText}`,
  };
}

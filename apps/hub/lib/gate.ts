// The gate: does the farmer get advice now, or does a state expert decide?
//
// Evidence-based rule (decided Sun 27 Sep after benchmark S3): on 50 held-out photos Gemini
// alone named the right condition 24% of the time and stated ~92% confidence whether right
// or wrong, while the federated model was right 84% of the time with calibrated confidence.
// So the federated model decides; Gemini confirms the photo is paddy, writes and speaks the
// advice, and gives a second opinion. A differing second opinion never blocks the advice, but
// it is logged for a state expert to audit. Below the calibrated threshold, an expert decides.
import { classLabel, type ClassKey, type DiagnosisKey } from "./classes";
import type { RunFile } from "./contract";

export interface GeminiVerdict {
  is_plant: boolean;
  is_rice: boolean;
  class_key: DiagnosisKey;
  /** 0-100 */
  confidence: number;
  model: string;
}

export interface FedVerdict {
  top: ClassKey;
  /** Calibrated probability, 0-1. */
  p: number;
}

export type DecidedBy = "agreement" | "federated" | "gemini";
export type SecondOpinion = "agrees" | "differs" | "unavailable";

export type GateDecision =
  | { outcome: "not_rice"; reason: string }
  | {
      outcome: "advise";
      decidedBy: DecidedBy;
      classKey: ClassKey;
      secondOpinion: SecondOpinion;
      reason: string;
      /** Set when Gemini's label differs: the case is logged for expert audit. */
      auditReason?: string;
    }
  | { outcome: "escalate"; secondOpinion: SecondOpinion; reason: string };

const pct0 = (p: number) => (p >= 0.995 ? "above 99%" : `${Math.round(p * 100)}%`);

export function decide(
  gate: RunFile["gate"],
  fed: FedVerdict,
  gemini: GeminiVerdict | null,
  geminiBenchAcc: number | null = null,
): GateDecision {
  if (gemini && (!gemini.is_plant || !gemini.is_rice)) {
    return {
      outcome: "not_rice",
      reason: gemini.is_plant ? "Gemini says this plant is not paddy." : "Gemini says this photo does not show a plant.",
    };
  }

  const fedLabel = classLabel(fed.top).toLowerCase();
  if (!gemini) {
    // The federated model names a paddy condition for any photo it is shown; without Gemini's
    // paddy check we cannot rule out a photo of something else, so a person decides.
    return {
      outcome: "escalate",
      secondOpinion: "unavailable",
      reason: `Gemini is unavailable, so nothing has confirmed the photo shows paddy; a state expert decides. The federated model reads it as ${fedLabel} (${pct0(fed.p)}).`,
    };
  }
  const second: SecondOpinion = !gemini ? "unavailable" : gemini.class_key === fed.top ? "agrees" : "differs";
  const benchNote =
    geminiBenchAcc != null
      ? ` On our benchmark Gemini alone named the right condition ${Math.round(geminiBenchAcc * 100)}% of the time, so its label does not decide.`
      : " Gemini's label is a second opinion only.";
  const secondText =
    second === "agrees"
      ? "Gemini's second opinion agrees."
      : second === "differs"
        ? `Gemini's second opinion differs: ${classLabel(gemini!.class_key).toLowerCase()} (${gemini!.confidence}%).${benchNote}`
        : "Gemini was unavailable, so it could not confirm the photo shows paddy.";

  if (fed.p >= gate.tau_fed) {
    return {
      outcome: "advise",
      decidedBy: second === "agrees" ? "agreement" : "federated",
      classKey: fed.top,
      secondOpinion: second,
      reason: `The federated model is ${pct0(fed.p)} sure this is ${fedLabel}, above its ${pct0(gate.tau_fed)} threshold. ${secondText}`,
      auditReason:
        second === "differs"
          ? `Second opinion differs (federated: ${fedLabel} ${pct0(fed.p)}; Gemini: ${classLabel(gemini!.class_key).toLowerCase()} ${gemini!.confidence}%). Advice was given; logged for expert audit.`
          : undefined,
    };
  }

  return {
    outcome: "escalate",
    secondOpinion: second,
    reason: `The federated model is only ${pct0(fed.p)} sure (${fedLabel}), below its ${pct0(gate.tau_fed)} threshold, so a state expert decides. ${secondText}`,
  };
}

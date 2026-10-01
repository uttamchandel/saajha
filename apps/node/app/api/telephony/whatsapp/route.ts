// POST /api/telephony/whatsapp — Twilio WhatsApp sandbox webhook (form-encoded).
// Photo message (NumMedia>0): download the media with Twilio basic auth, self-call
// /api/diagnose (Saajha's decision rule), reply with the outcome: never a canned diagnosis.
// Text message: same advisory path as SMS. Replies are plain text — no markdown.

import type { NextRequest } from "next/server";
import { logQuery } from "@/lib/db";
import {
  escapeXml,
  forbiddenTwiml,
  formParams,
  selfBaseUrl,
  textAdvisory,
  twiml,
  validateTwilioSignature,
} from "@/lib/twilio";

const MEDIA_TIMEOUT_MS = 10_000;
const DIAGNOSE_TIMEOUT_MS = 25_000;

// The slice of /api/diagnose's response this reply uses (app/api/diagnose/route.ts).
type DiagnoseResult = {
  plant: string;
  disease_local: string;
  treatment_organic: string[];
  voice_summary: string;
  decision: {
    outcome: "advise" | "expert" | "unverified" | "not_plant";
    ticket: { id: string; kendra: string } | null;
  };
};

async function fetchMediaBase64(url: string): Promise<{ data: string; mimeType: string }> {
  // Twilio media URLs require basic auth (Account SID : Auth Token).
  const sid = process.env.TWILIO_ACCOUNT_SID ?? "";
  const token = process.env.TWILIO_AUTH_TOKEN ?? "";
  const headers: Record<string, string> = {};
  if (sid && token) {
    headers.Authorization = `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`;
  }
  const res = await fetch(url, {
    headers,
    signal: AbortSignal.timeout(MEDIA_TIMEOUT_MS),
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`media fetch HTTP ${res.status}`);
  const mimeType = res.headers.get("content-type")?.split(";")[0] ?? "image/jpeg";
  const data = Buffer.from(await res.arrayBuffer()).toString("base64");
  return { data, mimeType };
}

async function diagnosePhoto(req: NextRequest, mediaUrl: string): Promise<string> {
  const { data, mimeType } = await fetchMediaBase64(mediaUrl);
  // No browser on this line, so no federated verdict yet (step 2b): paddy goes to an expert.
  const res = await fetch(`${selfBaseUrl(req)}/api/diagnose`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image: data, mimeType, lang: "hi", channel: "whatsapp", federated: null }),
    signal: AbortSignal.timeout(DIAGNOSE_TIMEOUT_MS),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`diagnose HTTP ${res.status}`);
  const d = (await res.json()) as DiagnoseResult;
  const ticket = d.decision.ticket;
  const ticketLine = ticket ? `टिकट ${ticket.id}: ${ticket.kendra} के कृषि विशेषज्ञ 48 घंटे में जवाब देंगे।` : "कृषि विशेषज्ञ जल्द जवाब देंगे।";

  switch (d.decision.outcome) {
    case "not_plant":
      return "साझा: यह फोटो फसल या पत्ती की नहीं लग रही। कृपया प्रभावित पौधे की साफ़ फोटो भेजें।";
    case "unverified":
      return [
        `साझा — ${d.plant || "फसल"}: संभावित समस्या (अभी सत्यापित नहीं): ${d.disease_local || "स्पष्ट नहीं"}`,
        ...d.treatment_organic.map((s) => `• ${s}`),
        "कोई दवा छिड़कने से पहले विशेषज्ञ की पुष्टि का इंतज़ार करें।",
        ticketLine,
      ].join("\n");
    case "advise":
      return [`साझा निदान — ${d.disease_local}`, d.voice_summary, "मदद: किसान कॉल सेंटर 1800-180-1551"].filter(Boolean).join("\n");
    default:
      return `साझा: आपकी धान की फोटो राज्य के कृषि विशेषज्ञ को भेज दी गई है। ${ticketLine}`;
  }
}

export async function POST(req: NextRequest) {
  const params = await formParams(req);
  if (!validateTwilioSignature(req, params)) return forbiddenTwiml();

  const numMedia = Number.parseInt(params.NumMedia ?? "0", 10) || 0;
  const body = (params.Body ?? "").trim();

  let reply: string;
  if (numMedia > 0 && params.MediaUrl0) {
    try {
      reply = await diagnosePhoto(req, params.MediaUrl0);
      logQuery({ channel: "photo", lang: "hi", query: "whatsapp photo diagnosis", responseSource: "telephony-live" });
    } catch (err) {
      console.error("telephony whatsapp diagnose error:", err instanceof Error ? err.message : err);
      reply =
        "साझा: फोटो की जाँच अभी नहीं हो पाई। कृपया कुछ देर बाद दोबारा भेजें, या समस्या लिखकर भेजें। मदद: 1800-180-1551";
    }
  } else if (body) {
    reply = await textAdvisory(body);
    logQuery({ channel: "sms", lang: "hi", query: body, responseSource: "telephony-live" });
  } else {
    reply =
      "साझा में आपका स्वागत है। फसल की समस्या लिखकर भेजें, या प्रभावित पौधे की फोटो भेजें।";
  }

  return twiml(`<Message>${escapeXml(reply)}</Message>`);
}

# Saajha state node

> **This is the Saajha state node.** One copy runs per state; it holds that state's farmers, tickets and expert desk. The shared layer is `apps/hub`; see the [root README](../../README.md).

The state node is a farm-advisory platform for Indian farmers who do not own smartphones. It delivers AI-assisted advice over voice calls and SMS in 12+ Indian languages with automatic spoken-language detection, diagnoses crop disease from photos, recommends crops from satellite and Soil Health Card data, issues dry-spell and heavy-rain zone alerts, reads out live mandi prices, and escalates uncertain or severe cases to human experts at Rythu Seva Kendras (RSKs) and Krishi Vigyan Kendras (KVKs).

## Problem

India has more than 146 million farm holdings; 86% are smallholders. Roughly 45% of rural users carry feature phones — no apps, no data plans, oral-first. Existing agri-apps assume a smartphone the farmer does not have, while an estimated 15–25% of yield is lost to pests, disease, and mistimed irrigation. The node works on the phones farmers already own, and aggregates every interaction into district-level intelligence for agriculture officers.

## Modules

| Module | Description | Route |
|---|---|---|
| Voice IVR and SMS advisory | The farmer calls a toll-free number or texts shorthand (e.g. `KAPAS PILA PATTA`); Gemini answers in their language — spoken on the call, native script by SMS. Option 2 reads live mandi prices. | `/demo` |
| Spoken-language auto-detection | The farmer speaks in any Indian language; Gemini identifies the language from the audio itself and replies in it. 12 languages ship with full UI and samples; detection is not limited to these. | `/demo` (Auto mode) |
| Crop recommendation | Satellite soil grids (ISRIC SoilGrids, 250 m), live Government of India Soil Health Card data, 16-day weather, and ICAR agronomy produce ranked, explained crop choices with mandi price context. | `/recommend` |
| Dry-spell and heavy-rain zone alerts | IMD-threshold detection (dry spell; heavy rain ≥64.5 mm/day; very heavy ≥115.6 mm/day) across the district registry, resolved to the affected blocks; broadcasts voice and SMS only to farmers in the zone. | `/command` (Weather alerts) |
| WhatsApp photo and voice support | The farmer sends a crop photo or voice note and receives an AI diagnosis with a voice-note reply. A website link reaches feature phones by SMS. | `/whatsapp` |
| RSK/KVK expert escalation | Low-confidence or severe diagnoses become tickets for Rythu Seva Kendras (AP) and Krishi Vigyan Kendras (national) with a 48-hour SLA — AI first, humans in the loop. | `/command` (Escalations) |

The operations console at `/command` serves the District Agriculture Officer and the MP's office: KPIs, weather-alert composer, disease-outbreak clusters, escalation queue, broadcast log, and farmer registry.

## Telephony and persistence

**No public phone number is connected to this deployment (saajha-node.vercel.app).** Each Saajha state node plugs in its own number with `node scripts/configure-twilio.mjs <node-url>` (see `docs/TELEPHONY.md`). Try the flows in the browser simulators at `/demo` and `/whatsapp`. Inbound calls reach a stateless TwiML IVR (`/api/telephony/voice`) — a Hindi greeting, speech capture, a Gemini-generated spoken advisory, and a mandi-price option; inbound SMS (`/api/telephony/sms`) returns a native-script advisory; the WhatsApp webhook (`/api/telephony/whatsapp`) handles photo diagnosis via Twilio media. All webhooks validate Twilio's HMAC-SHA1 signature and, in production, refuse every request when Twilio is not configured. Photo diagnoses follow Saajha's decision rule (`lib/fed/decide.ts`): the federated model decides paddy, Gemini checks and gives a second opinion, and a failure sends the case to an expert, never a canned diagnosis. A Twilio trial number is US-based (a Twilio notice plays first; international rates apply from India); the production path is an Indian toll-free line via Exotel with DLT-registered SMS — see `docs/TELEPHONY.md`.

Escalation tickets, broadcasts, and the query log persist to Postgres (`kv_tickets`, `kv_broadcasts`, `kv_queries`). Farmer referrals from the demo and WhatsApp flows create real tickets that appear in the operations queue with SLA tracking; every advisory, diagnosis, voice, and telephony interaction is logged and surfaces in the console's live feed. Without `DATABASE_URL`, all of it degrades to per-instance memory so the application still runs.

## Data sources

- Soil Health Card (soilhealth.dac.gov.in) — district N/P/K/OC/pH and micronutrient distributions; GraphQL; updated daily
- Agmarknet 2.0 open API (api.agmarknet.gov.in) — same-day mandi modal prices; Directorate of Marketing & Inspection
- ISRIC SoilGrids v2 — 250 m satellite-derived soil properties and WRB classification, mapped to Indian soil types
- NASA POWER — agroclimate data for any Indian coordinate
- Open-Meteo — 16-day forecasts, ET₀, soil moisture (production source: IMD Agromet Advisory Services)
- ICAR / SAU Package of Practices and FAO Table 14 — embedded, citation-backed agronomy table
- Kisan Call Centre corpus (AIKosh/IndiaAI) — planned grounding data

A note on ground sensors: no public real-time farm-level sensor network exists in India today (WINDS data is procurement-gated; IMD's AWS portal is not publicly accessible). Irrigation guidance therefore uses satellite-derived soil moisture, ET₀, and forecasts. The production plan treats ground sensors as a partnership goal, not an assumed dependency.

## Architecture

```
Farmer (any phone)
  │  voice call / SMS / WhatsApp photo or voice note
  ▼
Channel layer — IVR, SMS gateway, WhatsApp Cloud API
  (simulated in the demo; Exotel/Meta in production)
  ▼
Gemini 3.5 Flash-Lite (fallback 3.1 Flash-Lite)
  ├─ language detection and transcription from raw audio (verified: webm/opus inline)
  ├─ multimodal disease diagnosis (schema-enforced JSON)
  ├─ crop recommendation over live soil, weather, and agronomy data
  └─ channel-aware advisory generation (spoken IVR style; SMS ≤300 characters)
  ▼
Data layer — interactions logged and geotagged
  ├─ outbreak clustering → disease early warnings
  ├─ weather scan → dry-spell and heavy-rain zone alerts by block
  └─ escalation tickets → RSK/KVK officers (48-hour SLA)
  ▼
Operations console — District Agriculture Officer / MP office
```

Every API route falls back to cached, expert-written data if a live source is unavailable, so the farmer always receives an answer.

## Run locally

```bash
npm install
cp .env.example .env.local   # fill in GEMINI_API_KEY at minimum (aistudio.google.com)
npm run dev -- -p 3100
```

Full key/service reference, deployment steps, phone-number wiring, and
environment verification commands: [docs/SETUP.md](docs/SETUP.md).

## Repository notes

`research/*.json` contains the verified data-source research (endpoints, quirks, thresholds) this build is grounded on.

Where this code began is recorded in the repository's [NOTICE](../../NOTICE).

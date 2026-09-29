// Ops command-center seed data — deterministic, typed, embedded.
// Kendra names are real (verified in research/rsk-escalation.json):
//   - Rythu Seva Kendras (RSK) = Andhra Pradesh's 10,778 gram-panchayat centres (VAA-staffed)
//   - AEO Clusters = Telangana's 2,601 extension clusters (Ichoda, Gudi Hathnur, Sirikonda verified)
//   - KVKs = 731 district Krishi Vigyan Kendras (KVK Sehore/Sewania, KVK Ramnagar Adilabad, KVK Kampasagar…)
// No live API exists for this fabric (NIC hosts are India-geo-fenced), so this data is embedded by design.

import type { AlertsResponse, EscalationTicket } from "./types";

// ---------------------------------------------------------------------------
// RSK / KVK escalation queue (18 tickets, kendra ↔ state pairing is correct)
// ---------------------------------------------------------------------------

export const ESCALATIONS: EscalationTicket[] = [
  { id: "RSK-2417", createdAt: "2026-07-08T09:42:00+05:30", farmer: "Ramesh Patel", village: "Bilkisganj", district: "Sehore", state: "Madhya Pradesh", channel: "photo", crop: "Cotton", aiDiagnosis: "Cotton Leaf Curl Virus (whitefly-vectored begomovirus); restricted-class insecticide in treatment path", confidence: 87, severity: "high", kendra: "KVK Sehore (Sewania, Ichhawar)", officer: null, status: "pending", slaHoursLeft: 3.5 },
  { id: "RSK-2416", createdAt: "2026-07-08T08:15:00+05:30", farmer: "Savita Bai", village: "Ashta", district: "Sehore", state: "Madhya Pradesh", channel: "call", crop: "Paddy", aiDiagnosis: "Rice blast (Magnaporthe oryzae) — spindle lesions; confidence below 70% gate", confidence: 62, severity: "high", kendra: "KVK Sehore (Sewania, Ichhawar)", officer: "Dr. J.K. Kanaujia (SMS, Plant Protection)", status: "assigned", slaHoursLeft: 9 },
  { id: "RSK-2415", createdAt: "2026-07-08T07:50:00+05:30", farmer: "Lakshmamma", village: "Ichoda", district: "Adilabad", state: "Telangana", channel: "photo", crop: "Tomato", aiDiagnosis: "Early blight (Alternaria solani) — concentric ring lesions on lower canopy", confidence: 84, severity: "medium", kendra: "AEO Cluster Ichoda", officer: "K. Srinivas (AEO)", status: "assigned", slaHoursLeft: 14 },
  { id: "RSK-2414", createdAt: "2026-07-07T18:22:00+05:30", farmer: "G. Venkatesh", village: "Gudi Hathnur", district: "Adilabad", state: "Telangana", channel: "whatsapp", crop: "Cotton", aiDiagnosis: "Pink bollworm — pheromone trap catch above ETL; field visit advised", confidence: 58, severity: "high", kendra: "AEO Cluster Gudi Hathnur", officer: null, status: "pending", slaHoursLeft: 1.5 },
  { id: "RSK-2413", createdAt: "2026-07-07T16:05:00+05:30", farmer: "P. Ramulu", village: "Sirikonda", district: "Adilabad", state: "Telangana", channel: "call", crop: "Redgram", aiDiagnosis: "Fusarium wilt (Fusarium udum) suspected — wilting in patches, low confidence", confidence: 54, severity: "medium", kendra: "AEO Cluster Sirikonda", officer: "B. Anitha (AEO)", status: "assigned", slaHoursLeft: 20 },
  { id: "RSK-2412", createdAt: "2026-07-07T14:40:00+05:30", farmer: "Mohan Verma", village: "Shyampur", district: "Sehore", state: "Madhya Pradesh", channel: "sms", crop: "Soybean", aiDiagnosis: "Girdle beetle (Obereopsis brevis) infestation — girdling marks on stems", confidence: 76, severity: "medium", kendra: "KVK Sehore (Sewania, Ichhawar)", officer: "Dr. J.K. Kanaujia (SMS, Plant Protection)", status: "expert_replied", slaHoursLeft: 30 },
  { id: "RSK-2411", createdAt: "2026-07-07T11:12:00+05:30", farmer: "Anita Kushwaha", village: "Ichhawar", district: "Sehore", state: "Madhya Pradesh", channel: "call", crop: "Cotton", aiDiagnosis: "Leaf curl virus; farmer asked for restricted chemical — escalated per policy", confidence: 91, severity: "high", kendra: "KVK Sehore (Sewania, Ichhawar)", officer: "Dr. S. Raghuwanshi (SMS, Entomology)", status: "expert_replied", slaHoursLeft: 26 },
  { id: "RSK-2410", createdAt: "2026-07-07T09:30:00+05:30", farmer: "K. Mallesham", village: "Miryalaguda", district: "Nalgonda", state: "Telangana", channel: "photo", crop: "Paddy", aiDiagnosis: "Brown planthopper — hopperburn patches spreading from field centre", confidence: 66, severity: "high", kendra: "KVK Kampasagar", officer: "Dr. T. Prabhakar Reddy (SMS)", status: "assigned", slaHoursLeft: 5 },
  { id: "RSK-2409", createdAt: "2026-07-06T17:55:00+05:30", farmer: "Y. Subba Rao", village: "Tenali", district: "Guntur", state: "Andhra Pradesh", channel: "whatsapp", crop: "Chilli", aiDiagnosis: "Thrips + leaf curl complex — farmer requested expert callback", confidence: 71, severity: "medium", kendra: "RSK Tenali", officer: "V. Padmavathi (VAA)", status: "assigned", slaHoursLeft: 11 },
  { id: "RSK-2408", createdAt: "2026-07-06T15:03:00+05:30", farmer: "N. Aruna", village: "Narasaraopet", district: "Guntur", state: "Andhra Pradesh", channel: "call", crop: "Cotton", aiDiagnosis: "Bacterial blight suspected — angular water-soaked lesions", confidence: 59, severity: "medium", kendra: "RSK Narasaraopet", officer: null, status: "pending", slaHoursLeft: -2 },
  { id: "RSK-2407", createdAt: "2026-07-06T12:47:00+05:30", farmer: "D. Obulesu", village: "Kalyandurg", district: "Anantapur", state: "Andhra Pradesh", channel: "sms", crop: "Groundnut", aiDiagnosis: "Late leaf spot (Phaeoisariopsis personata) — early stage", confidence: 82, severity: "low", kendra: "RSK Kalyandurg", officer: "M. Ramanjaneyulu (VAA)", status: "expert_replied", slaHoursLeft: 38 },
  { id: "RSK-2406", createdAt: "2026-07-06T10:20:00+05:30", farmer: "Ch. Satyanarayana", village: "Undi", district: "West Godavari", state: "Andhra Pradesh", channel: "photo", crop: "Paddy", aiDiagnosis: "Sheath blight (Rhizoctonia solani) — lesions above waterline", confidence: 79, severity: "medium", kendra: "RSK Undi, West Godavari", officer: "G. Suresh (VAA)", status: "closed", slaHoursLeft: 0 },
  { id: "RSK-2405", createdAt: "2026-07-05T16:31:00+05:30", farmer: "Prakash Jadhav", village: "Karanja", district: "Washim", state: "Maharashtra", channel: "sms", crop: "Soybean", aiDiagnosis: "Stem fly damage — confidence below 70% gate, needs field confirmation", confidence: 61, severity: "medium", kendra: "KVK Washim", officer: null, status: "pending", slaHoursLeft: -8 },
  { id: "RSK-2404", createdAt: "2026-07-05T13:58:00+05:30", farmer: "Sunita Pawar", village: "Niphad", district: "Nashik", state: "Maharashtra", channel: "whatsapp", crop: "Grapes", aiDiagnosis: "Downy mildew — restricted fungicide combination flagged for expert sign-off", confidence: 88, severity: "high", kendra: "KVK Nashik", officer: "Dr. R.G. Somkuwar (SMS, Horticulture)", status: "expert_replied", slaHoursLeft: 44 },
  { id: "RSK-2403", createdAt: "2026-07-05T09:26:00+05:30", farmer: "Gurpreet Singh", village: "Jagraon", district: "Ludhiana", state: "Punjab", channel: "call", crop: "Paddy", aiDiagnosis: "False smut early symptoms — orange spore balls on few panicles", confidence: 57, severity: "low", kendra: "KVK Ludhiana (PAU)", officer: null, status: "pending", slaHoursLeft: 8 },
  { id: "RSK-2402", createdAt: "2026-07-04T15:44:00+05:30", farmer: "S. Murugan", village: "Kumbakonam", district: "Thanjavur", state: "Tamil Nadu", channel: "call", crop: "Paddy", aiDiagnosis: "Yellow stem borer — dead-heart count above economic threshold", confidence: 74, severity: "medium", kendra: "KVK Thanjavur", officer: "Dr. K. Subrahmaniyan (SMS, Agronomy)", status: "closed", slaHoursLeft: 0 },
  { id: "RSK-2401", createdAt: "2026-07-04T11:09:00+05:30", farmer: "Dilip Malviya", village: "Nasrullaganj", district: "Sehore", state: "Madhya Pradesh", channel: "photo", crop: "Soybean", aiDiagnosis: "Stem borer suspected — image quality too low for confident call", confidence: 49, severity: "medium", kendra: "KVK Sehore (Sewania, Ichhawar)", officer: "Dr. S. Raghuwanshi (SMS, Entomology)", status: "closed", slaHoursLeft: 0 },
  { id: "RSK-2400", createdAt: "2026-07-03T14:12:00+05:30", farmer: "B. Laxmi", village: "Devarakonda", district: "Nalgonda", state: "Telangana", channel: "call", crop: "Cotton", aiDiagnosis: "Ambiguous: magnesium deficiency vs early mite damage", confidence: 52, severity: "low", kendra: "KVK Kampasagar", officer: "Dr. T. Prabhakar Reddy (SMS)", status: "closed", slaHoursLeft: 0 },
];

// ---------------------------------------------------------------------------
// Broadcast history (composer actions append to this seed at runtime)
// ---------------------------------------------------------------------------

export type BroadcastRecord = {
  id: string; // "BRD-1041"
  createdAt: string;
  kind: "weather" | "outbreak" | "scheme";
  title: string;
  district: string;
  state: string;
  language: string;
  channels: string[]; // e.g. ["Voice call", "SMS"]
  recipients: number;
  sent: number;
  delivered: number;
  heard: number; // voice calls listened >30s
  status: "completed" | "in_progress" | "queued";
  message: string;
};

export const BROADCAST_SEED: BroadcastRecord[] = [
  { id: "BRD-1041", createdAt: "2026-07-08T07:30:00+05:30", kind: "outbreak", title: "Cotton leaf curl virus — Sehore block", district: "Sehore", state: "Madhya Pradesh", language: "Hindi", channels: ["Voice call", "SMS"], recipients: 1240, sent: 1240, delivered: 1181, heard: 934, status: "completed", message: "किसान अलर्ट: सीहोर ब्लॉक में कपास पर लीफ कर्ल वायरस फैल रहा है। सफेद मक्खी रोकें — पीला चिपचिपा कार्ड लगाएँ, नीम तेल 5ml/L शाम को छिड़कें।" },
  { id: "BRD-1040", createdAt: "2026-07-07T17:10:00+05:30", kind: "weather", title: "Dry spell watch — Anantapur groundnut belt", district: "Anantapur", state: "Andhra Pradesh", language: "Telugu", channels: ["Voice call", "SMS"], recipients: 4820, sent: 4820, delivered: 4577, heard: 3390, status: "completed", message: "రైతు హెచ్చరిక: రాబోయే 10 రోజులు వర్షాభావం. వేరుశనగలో తేమ నిలుపుకోవడానికి మల్చింగ్ చేయండి, రక్షక తడి ఇవ్వండి." },
  { id: "BRD-1039", createdAt: "2026-07-07T11:45:00+05:30", kind: "outbreak", title: "Rice blast advisory — Ashta block", district: "Sehore", state: "Madhya Pradesh", language: "Hindi", channels: ["Voice call", "SMS"], recipients: 860, sent: 860, delivered: 812, heard: 601, status: "completed", message: "किसान अलर्ट: आष्टा क्षेत्र में धान पर ब्लास्ट रोग के मामले बढ़े हैं। खेत से पानी निकालें, यूरिया रोकें, ट्राइसाइक्लाज़ोल 0.6g/L छिड़कें।" },
  { id: "BRD-1038", createdAt: "2026-07-06T16:20:00+05:30", kind: "weather", title: "Heavy rain warning — Nashik grape belt", district: "Nashik", state: "Maharashtra", language: "Marathi", channels: ["Voice call", "SMS", "WhatsApp"], recipients: 6115, sent: 6115, delivered: 5871, heard: 4160, status: "completed", message: "शेतकरी सूचना: पुढील ४८ तासांत जोरदार पावसाची शक्यता. द्राक्ष बागेत डाउनी रोखण्यासाठी घड झाकून घ्या, फवारणी पुढे ढकला." },
  { id: "BRD-1037", createdAt: "2026-07-05T09:05:00+05:30", kind: "scheme", title: "PM-Kisan e-KYC deadline reminder", district: "All districts", state: "Pan-India", language: "12 languages", channels: ["SMS"], recipients: 41209, sent: 41209, delivered: 39466, heard: 0, status: "completed", message: "PM-Kisan: e-KYC 31 जुलाई से पहले पूर्ण करें। नज़दीकी CSC या PM-Kisan ऐप पर OTP से करें। सहायता: 155261" },
  { id: "BRD-1036", createdAt: "2026-07-04T18:40:00+05:30", kind: "weather", title: "Heatwave advisory — Jodhpur", district: "Jodhpur", state: "Rajasthan", language: "Hindi", channels: ["Voice call"], recipients: 2210, sent: 2210, delivered: 2087, heard: 1544, status: "completed", message: "किसान अलर्ट: अगले 5 दिन तापमान 44°C से ऊपर। सिंचाई सुबह या शाम करें, पशुओं को छाया-पानी दें, दोपहर में खेत का काम टालें।" },
];

// ---------------------------------------------------------------------------
// Farmer registry (40 rows across the district registry, 14 languages)
// ---------------------------------------------------------------------------

export type FarmerRow = {
  id: string; // "KV-000184"
  name: string;
  village: string;
  district: string;
  state: string;
  channel: "voice" | "sms" | "whatsapp" | "app";
  language: string;
  crop: string;
  landAcres: number;
  phone: "feature" | "smart";
  registered: string; // ISO date
  lastQuery: string; // human, e.g. "2h ago"
};

export const FARMERS: FarmerRow[] = [
  { id: "KV-000184", name: "Ramesh Patel", village: "Bilkisganj", district: "Sehore", state: "Madhya Pradesh", channel: "voice", language: "Hindi", crop: "Cotton", landAcres: 3.5, phone: "feature", registered: "2025-11-14", lastQuery: "2h ago" },
  { id: "KV-000221", name: "Savita Bai", village: "Ashta", district: "Sehore", state: "Madhya Pradesh", channel: "voice", language: "Hindi", crop: "Paddy", landAcres: 2.0, phone: "feature", registered: "2025-11-18", lastQuery: "3h ago" },
  { id: "KV-000307", name: "Mohan Verma", village: "Shyampur", district: "Sehore", state: "Madhya Pradesh", channel: "sms", language: "Hindi", crop: "Cotton", landAcres: 4.2, phone: "feature", registered: "2025-12-02", lastQuery: "5h ago" },
  { id: "KV-000415", name: "Anita Kushwaha", village: "Ichhawar", district: "Sehore", state: "Madhya Pradesh", channel: "voice", language: "Hindi", crop: "Cotton", landAcres: 1.8, phone: "feature", registered: "2025-12-09", lastQuery: "6h ago" },
  { id: "KV-000502", name: "Dilip Malviya", village: "Nasrullaganj", district: "Sehore", state: "Madhya Pradesh", channel: "whatsapp", language: "Hindi", crop: "Soybean", landAcres: 5.0, phone: "smart", registered: "2026-01-06", lastQuery: "1d ago" },
  { id: "KV-000549", name: "Kalpana Bai", village: "Rehti", district: "Sehore", state: "Madhya Pradesh", channel: "voice", language: "Hindi", crop: "Cotton", landAcres: 2.6, phone: "feature", registered: "2026-01-11", lastQuery: "8h ago" },
  { id: "KV-000618", name: "Harish Sharma", village: "Basoda", district: "Vidisha", state: "Madhya Pradesh", channel: "sms", language: "Hindi", crop: "Wheat", landAcres: 6.1, phone: "feature", registered: "2026-01-19", lastQuery: "2d ago" },
  { id: "KV-000684", name: "Lakshmamma", village: "Ichoda", district: "Adilabad", state: "Telangana", channel: "voice", language: "Telugu", crop: "Tomato", landAcres: 1.2, phone: "feature", registered: "2026-01-24", lastQuery: "4h ago" },
  { id: "KV-000731", name: "G. Venkatesh", village: "Gudi Hathnur", district: "Adilabad", state: "Telangana", channel: "whatsapp", language: "Telugu", crop: "Cotton", landAcres: 3.8, phone: "smart", registered: "2026-02-01", lastQuery: "16h ago" },
  { id: "KV-000765", name: "P. Ramulu", village: "Sirikonda", district: "Adilabad", state: "Telangana", channel: "voice", language: "Telugu", crop: "Redgram", landAcres: 2.4, phone: "feature", registered: "2026-02-05", lastQuery: "1d ago" },
  { id: "KV-000812", name: "K. Mallesham", village: "Miryalaguda", district: "Nalgonda", state: "Telangana", channel: "voice", language: "Telugu", crop: "Paddy", landAcres: 4.5, phone: "feature", registered: "2026-02-12", lastQuery: "1d ago" },
  { id: "KV-000856", name: "B. Laxmi", village: "Devarakonda", district: "Nalgonda", state: "Telangana", channel: "sms", language: "Telugu", crop: "Cotton", landAcres: 2.2, phone: "feature", registered: "2026-02-16", lastQuery: "4d ago" },
  { id: "KV-000903", name: "T. Ravinder", village: "Parkal", district: "Warangal", state: "Telangana", channel: "app", language: "Telugu", crop: "Chilli", landAcres: 1.6, phone: "smart", registered: "2026-02-21", lastQuery: "2d ago" },
  { id: "KV-000947", name: "Y. Subba Rao", village: "Tenali", district: "Guntur", state: "Andhra Pradesh", channel: "whatsapp", language: "Telugu", crop: "Chilli", landAcres: 2.8, phone: "smart", registered: "2026-02-27", lastQuery: "18h ago" },
  { id: "KV-000991", name: "N. Aruna", village: "Narasaraopet", district: "Guntur", state: "Andhra Pradesh", channel: "voice", language: "Telugu", crop: "Cotton", landAcres: 3.1, phone: "feature", registered: "2026-03-03", lastQuery: "2d ago" },
  { id: "KV-001038", name: "D. Obulesu", village: "Kalyandurg", district: "Anantapur", state: "Andhra Pradesh", channel: "sms", language: "Telugu", crop: "Groundnut", landAcres: 5.4, phone: "feature", registered: "2026-03-08", lastQuery: "2d ago" },
  { id: "KV-001084", name: "Prakash Jadhav", village: "Karanja", district: "Washim", state: "Maharashtra", channel: "sms", language: "Marathi", crop: "Soybean", landAcres: 4.0, phone: "feature", registered: "2026-03-14", lastQuery: "3d ago" },
  { id: "KV-001129", name: "Sunita Pawar", village: "Niphad", district: "Nashik", state: "Maharashtra", channel: "whatsapp", language: "Marathi", crop: "Grapes", landAcres: 2.5, phone: "smart", registered: "2026-03-19", lastQuery: "3d ago" },
  { id: "KV-001167", name: "Vitthal More", village: "Achalpur", district: "Amravati", state: "Maharashtra", channel: "voice", language: "Marathi", crop: "Orange", landAcres: 6.8, phone: "feature", registered: "2026-03-24", lastQuery: "5d ago" },
  { id: "KV-001204", name: "Gurpreet Singh", village: "Jagraon", district: "Ludhiana", state: "Punjab", channel: "voice", language: "Punjabi", crop: "Paddy", landAcres: 9.2, phone: "smart", registered: "2026-03-29", lastQuery: "3d ago" },
  { id: "KV-001248", name: "Balwinder Kaur", village: "Samrala", district: "Ludhiana", state: "Punjab", channel: "app", language: "Punjabi", crop: "Wheat", landAcres: 7.5, phone: "smart", registered: "2026-04-02", lastQuery: "6d ago" },
  { id: "KV-001286", name: "Suresh Kumar", village: "Assandh", district: "Karnal", state: "Haryana", channel: "sms", language: "Hindi", crop: "Paddy", landAcres: 5.6, phone: "feature", registered: "2026-04-07", lastQuery: "4d ago" },
  { id: "KV-001321", name: "Rakesh Tyagi", village: "Budhana", district: "Muzaffarnagar", state: "Uttar Pradesh", channel: "voice", language: "Hindi", crop: "Sugarcane", landAcres: 4.8, phone: "feature", registered: "2026-04-11", lastQuery: "1d ago" },
  { id: "KV-001369", name: "Ramawadh Nishad", village: "Campierganj", district: "Gorakhpur", state: "Uttar Pradesh", channel: "voice", language: "Bhojpuri", crop: "Paddy", landAcres: 1.4, phone: "feature", registered: "2026-04-16", lastQuery: "7h ago" },
  { id: "KV-001402", name: "Sanjay Yadav", village: "Danapur", district: "Patna", state: "Bihar", channel: "sms", language: "Hindi", crop: "Maize", landAcres: 2.1, phone: "feature", registered: "2026-04-20", lastQuery: "2d ago" },
  { id: "KV-001447", name: "Ranjan Jha", village: "Rosera", district: "Samastipur", state: "Bihar", channel: "voice", language: "Maithili", crop: "Paddy", landAcres: 1.9, phone: "feature", registered: "2026-04-25", lastQuery: "1d ago" },
  { id: "KV-001489", name: "Tapan Mondal", village: "Ranaghat", district: "Nadia", state: "West Bengal", channel: "sms", language: "Bengali", crop: "Jute", landAcres: 2.3, phone: "feature", registered: "2026-04-29", lastQuery: "3d ago" },
  { id: "KV-001523", name: "Anima Ghosh", village: "Kalna", district: "Purba Bardhaman", state: "West Bengal", channel: "voice", language: "Bengali", crop: "Paddy", landAcres: 1.7, phone: "feature", registered: "2026-05-04", lastQuery: "2d ago" },
  { id: "KV-001561", name: "Bijay Behera", village: "Banki", district: "Cuttack", state: "Odisha", channel: "voice", language: "Odia", crop: "Paddy", landAcres: 2.0, phone: "feature", registered: "2026-05-09", lastQuery: "5d ago" },
  { id: "KV-001598", name: "Sanatan Majhi", village: "Dharamgarh", district: "Kalahandi", state: "Odisha", channel: "sms", language: "Odia", crop: "Cotton", landAcres: 3.3, phone: "feature", registered: "2026-05-13", lastQuery: "6d ago" },
  { id: "KV-001634", name: "Mahadev Patil", village: "Gokak", district: "Belagavi", state: "Karnataka", channel: "whatsapp", language: "Kannada", crop: "Sugarcane", landAcres: 5.9, phone: "smart", registered: "2026-05-17", lastQuery: "2d ago" },
  { id: "KV-001678", name: "Shivamma", village: "Maddur", district: "Mandya", state: "Karnataka", channel: "voice", language: "Kannada", crop: "Ragi", landAcres: 1.3, phone: "feature", registered: "2026-05-22", lastQuery: "1d ago" },
  { id: "KV-001712", name: "S. Murugan", village: "Kumbakonam", district: "Thanjavur", state: "Tamil Nadu", channel: "voice", language: "Tamil", crop: "Paddy", landAcres: 2.7, phone: "feature", registered: "2026-05-26", lastQuery: "4d ago" },
  { id: "KV-001756", name: "R. Selvi", village: "Melur", district: "Madurai", state: "Tamil Nadu", channel: "sms", language: "Tamil", crop: "Chilli", landAcres: 1.5, phone: "feature", registered: "2026-05-31", lastQuery: "2d ago" },
  { id: "KV-001791", name: "K.V. Raghavan", village: "Chittur", district: "Palakkad", state: "Kerala", channel: "app", language: "Malayalam", crop: "Paddy", landAcres: 2.2, phone: "smart", registered: "2026-06-04", lastQuery: "3d ago" },
  { id: "KV-001827", name: "Jayesh Bhalodia", village: "Gondal", district: "Rajkot", state: "Gujarat", channel: "whatsapp", language: "Gujarati", crop: "Groundnut", landAcres: 7.2, phone: "smart", registered: "2026-06-09", lastQuery: "1d ago" },
  { id: "KV-001863", name: "Ramesh Chaudhary", village: "Idar", district: "Sabarkantha", state: "Gujarat", channel: "voice", language: "Gujarati", crop: "Maize", landAcres: 3.6, phone: "feature", registered: "2026-06-13", lastQuery: "4d ago" },
  { id: "KV-001904", name: "Bhanwar Lal", village: "Bilara", district: "Jodhpur", state: "Rajasthan", channel: "voice", language: "Hindi", crop: "Bajra", landAcres: 8.4, phone: "feature", registered: "2026-06-18", lastQuery: "1d ago" },
  { id: "KV-001948", name: "Etwa Oraon", village: "Bundu", district: "Ranchi", state: "Jharkhand", channel: "voice", language: "Hindi", crop: "Paddy", landAcres: 1.1, phone: "feature", registered: "2026-06-23", lastQuery: "2d ago" },
  { id: "KV-001982", name: "Phulmati Sahu", village: "Arang", district: "Raipur", state: "Chhattisgarh", channel: "sms", language: "Chhattisgarhi", crop: "Paddy", landAcres: 2.9, phone: "feature", registered: "2026-06-27", lastQuery: "8h ago" },
  { id: "KV-002014", name: "Rina Gogoi", village: "Chabua", district: "Dibrugarh", state: "Assam", channel: "voice", language: "Assamese", crop: "Tea", landAcres: 1.6, phone: "feature", registered: "2026-07-01", lastQuery: "1d ago" },
];

// ---------------------------------------------------------------------------
// Analytics series
// ---------------------------------------------------------------------------

export type DayVolume = { label: string; voice: number; sms: number; whatsapp: number };

export const QUERY_VOLUME_14D: DayVolume[] = [
  { label: "25 Jun", voice: 118, sms: 42, whatsapp: 21 },
  { label: "26 Jun", voice: 124, sms: 39, whatsapp: 24 },
  { label: "27 Jun", voice: 109, sms: 44, whatsapp: 22 },
  { label: "28 Jun", voice: 131, sms: 47, whatsapp: 27 },
  { label: "29 Jun", voice: 142, sms: 51, whatsapp: 25 },
  { label: "30 Jun", voice: 128, sms: 46, whatsapp: 29 },
  { label: "1 Jul", voice: 137, sms: 49, whatsapp: 31 },
  { label: "2 Jul", voice: 151, sms: 55, whatsapp: 34 },
  { label: "3 Jul", voice: 146, sms: 52, whatsapp: 33 },
  { label: "4 Jul", voice: 139, sms: 48, whatsapp: 36 },
  { label: "5 Jul", voice: 163, sms: 58, whatsapp: 38 },
  { label: "6 Jul", voice: 171, sms: 61, whatsapp: 41 },
  { label: "7 Jul", voice: 158, sms: 54, whatsapp: 44 },
  { label: "8 Jul", voice: 122, sms: 40, whatsapp: 32 }, // today, partial
];

export const LANGUAGE_DIST: { language: string; pct: number }[] = [
  { language: "Hindi", pct: 34 },
  { language: "Telugu", pct: 16 },
  { language: "Marathi", pct: 12 },
  { language: "Tamil", pct: 8 },
  { language: "Kannada", pct: 6 },
  { language: "Bengali", pct: 6 },
  { language: "Punjabi", pct: 4 },
  { language: "Gujarati", pct: 4 },
  { language: "Odia", pct: 3 },
  { language: "Bhojpuri", pct: 3 },
  { language: "Malayalam", pct: 2 },
  { language: "Assamese", pct: 1 },
  { language: "Others", pct: 1 },
];

export const TOP_CROPS: { crop: string; queries: number }[] = [
  { crop: "Paddy", queries: 342 },
  { crop: "Cotton", queries: 298 },
  { crop: "Soybean", queries: 214 },
  { crop: "Wheat", queries: 156 },
  { crop: "Chilli", queries: 98 },
  { crop: "Groundnut", queries: 74 },
];

// Resolution funnel, trailing 7 days.
export const RESOLUTION_FUNNEL = {
  total: 1284,
  aiResolved: 1108,
  rskEscalated: 121,
  pending: 55,
};

export const OVERVIEW_KPIS = {
  queriesToday: 194,
  queriesDeltaPct: 12.4, // vs same day last week
  activeWeatherAlerts: 4,
  openOutbreaks: 3, // OUTBREAK_ROWS with status "active"
  escalationsPending: ESCALATIONS.filter((t) => t.status === "pending" || t.status === "assigned").length,
  slaBreaches: ESCALATIONS.filter((t) => t.slaHoursLeft < 0).length,
  advisoriesDelivered: 41209,
  medianResponseSec: 34,
};

// ---------------------------------------------------------------------------
// Extended live query feed (adds district/state to lib/data QUERY_FEED shape)
// ---------------------------------------------------------------------------

export type FeedRow = {
  name: string;
  village: string;
  district: string;
  state: string;
  channel: "call" | "sms" | "photo" | "whatsapp";
  crop: string;
  issue: string;
  time: string;
  lang: string;
  resolution: "ai" | "escalated" | "pending";
};

export const LIVE_FEED: FeedRow[] = [
  { name: "Ramesh Patel", village: "Bilkisganj", district: "Sehore", state: "Madhya Pradesh", channel: "photo", crop: "Cotton", issue: "Leaf curl, yellowing", time: "2 min ago", lang: "Hindi", resolution: "escalated" },
  { name: "Savita Bai", village: "Ashta", district: "Sehore", state: "Madhya Pradesh", channel: "call", crop: "Paddy", issue: "Brown spots on leaves", time: "9 min ago", lang: "Hindi", resolution: "ai" },
  { name: "R. Selvi", village: "Melur", district: "Madurai", state: "Tamil Nadu", channel: "sms", crop: "Chilli", issue: "MILAGAI ILAI SURUL", time: "11 min ago", lang: "Tamil", resolution: "ai" },
  { name: "Mohan Verma", village: "Shyampur", district: "Sehore", state: "Madhya Pradesh", channel: "sms", crop: "Cotton", issue: "KAPAS PILA PATTA", time: "14 min ago", lang: "Hindi", resolution: "ai" },
  { name: "Gurpreet Singh", village: "Jagraon", district: "Ludhiana", state: "Punjab", channel: "call", crop: "Paddy", issue: "Panicle discolouration", time: "18 min ago", lang: "Punjabi", resolution: "pending" },
  { name: "Anita Kushwaha", village: "Ichhawar", district: "Sehore", state: "Madhya Pradesh", channel: "call", crop: "Cotton", issue: "Leaves curling upward", time: "22 min ago", lang: "Hindi", resolution: "ai" },
  { name: "Tapan Mondal", village: "Ranaghat", district: "Nadia", state: "West Bengal", channel: "sms", crop: "Jute", issue: "PAT POKA ATTACK", time: "26 min ago", lang: "Bengali", resolution: "ai" },
  { name: "Dilip Malviya", village: "Nasrullaganj", district: "Sehore", state: "Madhya Pradesh", channel: "photo", crop: "Soybean", issue: "Stem borer suspected", time: "31 min ago", lang: "Hindi", resolution: "escalated" },
  { name: "Shivamma", village: "Maddur", district: "Mandya", state: "Karnataka", channel: "call", crop: "Ragi", issue: "Seedling wilt after transplanting", time: "36 min ago", lang: "Kannada", resolution: "ai" },
  { name: "Lakshmamma", village: "Ichoda", district: "Adilabad", state: "Telangana", channel: "photo", crop: "Tomato", issue: "Ring spots on leaves", time: "40 min ago", lang: "Telugu", resolution: "escalated" },
  { name: "Jayesh Bhalodia", village: "Gondal", district: "Rajkot", state: "Gujarat", channel: "whatsapp", crop: "Groundnut", issue: "White grub in root zone", time: "44 min ago", lang: "Gujarati", resolution: "ai" },
  { name: "Prakash Jadhav", village: "Karanja", district: "Washim", state: "Maharashtra", channel: "sms", crop: "Cotton", issue: "KAPUS PIVLA PANA", time: "48 min ago", lang: "Marathi", resolution: "ai" },
  { name: "Rina Gogoi", village: "Chabua", district: "Dibrugarh", state: "Assam", channel: "call", crop: "Tea", issue: "Red spider mite on bushes", time: "54 min ago", lang: "Assamese", resolution: "ai" },
  { name: "Kalpana Bai", village: "Rehti", district: "Sehore", state: "Madhya Pradesh", channel: "call", crop: "Cotton", issue: "White insects under leaves", time: "1 hr ago", lang: "Hindi", resolution: "ai" },
];

// ---------------------------------------------------------------------------
// Cached weather alerts — used if GET /api/alerts is unreachable client-side.
// Mirrors the AlertsResponse contract exactly; demo never shows an error.
// ---------------------------------------------------------------------------

export const CACHED_ALERTS: AlertsResponse = {
  generatedAt: "2026-07-08T06:00:00+05:30",
  scannedDistricts: 32,
  source: "cached",
  alerts: [
    {
      id: "ZA-SEHORE-DRY", type: "dry_spell", severity: "warning", state: "Madhya Pradesh", district: "Sehore",
      blocks: ["Ashta", "Ichhawar", "Sehore"], lat: 23.2, lon: 77.08,
      windowStart: "2026-07-08", windowEnd: "2026-07-21",
      metric: "Next 14 days forecast rainfall 9 mm vs 84 mm normal",
      advisory: "Soybean at pod-initiation is moisture-sensitive. Advise protective irrigation where available; delay urea top-dressing.",
      farmerMessage: "किसान अलर्ट: अगले 14 दिन बारिश बहुत कम रहने की संभावना है। सोयाबीन में जीवन-रक्षक सिंचाई करें, यूरिया अभी न डालें। मल्चिंग से नमी बचाएँ। मदद: 1800-180-1551",
      farmersInZone: 7420, crops: ["Soybean", "Cotton"], source: "cached",
    },
    {
      id: "ZA-GUNTUR-RAIN", type: "heavy_rain", severity: "severe", state: "Andhra Pradesh", district: "Guntur",
      blocks: ["Tenali", "Guntur"], lat: 16.3, lon: 80.44,
      windowStart: "2026-07-09", windowEnd: "2026-07-11",
      metric: "Forecast 168 mm in 48h (IMD red category threshold 115 mm)",
      advisory: "Chilli nurseries and picked produce at risk. Advise drainage channels, harvest mature chilli before onset, cover heaps.",
      farmerMessage: "రైతు హెచ్చరిక: రేపటి నుండి 48 గంటల్లో అతి భారీ వర్షం. మిర్చి తోటల్లో కాలువలు తీయండి, కోసిన పంటను కప్పి ఉంచండి. సహాయం: 1800-180-1551",
      farmersInZone: 9860, crops: ["Chilli", "Paddy"], source: "cached",
    },
    {
      id: "ZA-JODHPUR-HEAT", type: "heatwave", severity: "warning", state: "Rajasthan", district: "Jodhpur",
      blocks: ["Phalodi", "Bilara"], lat: 26.24, lon: 73.02,
      windowStart: "2026-07-08", windowEnd: "2026-07-13",
      metric: "Max temperature 44-46°C for 5 consecutive days (normal 38°C)",
      advisory: "Bajra germination window at risk; advise evening sowing/irrigation and livestock heat protocol.",
      farmerMessage: "किसान अलर्ट: अगले 5 दिन तापमान 44 डिग्री से ऊपर रहेगा। सिंचाई शाम को करें, पशुओं को छाया और पानी दें, दोपहर का काम टालें। मदद: 1800-180-1551",
      farmersInZone: 4130, crops: ["Bajra", "Moong"], source: "cached",
    },
    {
      id: "ZA-ANANTAPUR-DRY", type: "dry_spell", severity: "watch", state: "Andhra Pradesh", district: "Anantapur",
      blocks: ["Kalyandurg", "Dharmavaram"], lat: 14.68, lon: 77.6,
      windowStart: "2026-07-10", windowEnd: "2026-07-24",
      metric: "Next 14 days forecast rainfall 18 mm vs 66 mm normal",
      advisory: "Groundnut pegging stage approaching; monitor soil moisture, prepare for supplemental irrigation advisories.",
      farmerMessage: "రైతు హెచ్చరిక: రాబోయే రెండు వారాలు వర్షాభావం. వేరుశనగలో తేమ కాపాడేందుకు మల్చింగ్ చేయండి, రక్షక తడికి సిద్ధంగా ఉండండి. సహాయం: 1800-180-1551",
      farmersInZone: 6240, crops: ["Groundnut", "Redgram"], source: "cached",
    },
  ],
};

// ---------------------------------------------------------------------------
// Disease outbreak clusters (extends lib/data OUTBREAKS with routing fields)
// ---------------------------------------------------------------------------

export type OutbreakRow = {
  id: string;
  disease: string;
  crop: string;
  district: string;
  state: string;
  blocks: string[];
  reports: number;
  deltaPct: number; // vs last week
  radiusKm: number;
  farmersInRadius: number;
  severity: "low" | "medium" | "high";
  firstReport: string; // ISO date
  status: "active" | "contained";
  farmerMessage: string;
};

export const OUTBREAK_ROWS: OutbreakRow[] = [
  {
    id: "OB-118", disease: "Cotton Leaf Curl Virus", crop: "Cotton", district: "Sehore", state: "Madhya Pradesh",
    blocks: ["Sehore", "Shyampur"], reports: 23, deltaPct: 187, radiusKm: 5, farmersInRadius: 1240,
    severity: "high", firstReport: "2026-07-02", status: "active",
    farmerMessage: "किसान अलर्ट: सीहोर ब्लॉक में कपास पर लीफ कर्ल वायरस फैल रहा है। सफेद मक्खी रोकें — पीला चिपचिपा कार्ड लगाएँ, नीम तेल 5ml/L शाम को छिड़कें। रोगी पौधे उखाड़ें। मदद: 1800-180-1551",
  },
  {
    id: "OB-117", disease: "Rice Blast", crop: "Paddy", district: "Sehore", state: "Madhya Pradesh",
    blocks: ["Ashta"], reports: 9, deltaPct: 64, radiusKm: 8, farmersInRadius: 860,
    severity: "medium", firstReport: "2026-07-04", status: "active",
    farmerMessage: "किसान अलर्ट: आष्टा क्षेत्र में धान पर ब्लास्ट रोग के मामले बढ़े हैं। खेत से पानी निकालें, यूरिया रोकें, ट्राइसाइक्लाज़ोल 0.6g/L छिड़कें। मदद: 1800-180-1551",
  },
  {
    id: "OB-116", disease: "Brown Planthopper", crop: "Paddy", district: "Nalgonda", state: "Telangana",
    blocks: ["Miryalaguda"], reports: 14, deltaPct: 92, radiusKm: 6, farmersInRadius: 1120,
    severity: "high", firstReport: "2026-07-03", status: "active",
    farmerMessage: "రైతు హెచ్చరిక: మిర్యాలగూడ ప్రాంతంలో వరిపై దోమపోటు (BPH) పెరుగుతోంది. పొలం మధ్యలో నీరు తగ్గించండి, నత్రజని ఎరువు ఆపండి. సహాయం: 1800-180-1551",
  },
  {
    id: "OB-114", disease: "Downy Mildew (Grapes)", crop: "Grapes", district: "Nashik", state: "Maharashtra",
    blocks: ["Niphad", "Sinnar"], reports: 11, deltaPct: 38, radiusKm: 10, farmersInRadius: 940,
    severity: "medium", firstReport: "2026-06-29", status: "contained",
    farmerMessage: "शेतकरी सूचना: निफाड भागात द्राक्षावर डाउनी मिल्ड्यूचे प्रमाण वाढले आहे. बागेत हवा खेळती ठेवा, शिफारशीत बुरशीनाशक फवारा. मदत: 1800-180-1551",
  },
];

// District options for the global filter (registry + ticket districts).
export const OPS_DISTRICTS = [
  "All districts",
  "Sehore", "Vidisha", "Adilabad", "Warangal", "Nalgonda", "Guntur", "Anantapur", "West Godavari",
  "Nashik", "Washim", "Amravati", "Ludhiana", "Karnal", "Muzaffarnagar", "Gorakhpur", "Patna",
  "Samastipur", "Nadia", "Purba Bardhaman", "Cuttack", "Kalahandi", "Belagavi", "Mandya",
  "Thanjavur", "Madurai", "Palakkad", "Rajkot", "Sabarkantha", "Jodhpur", "Sri Ganganagar",
  "Ranchi", "Raipur", "Dibrugarh",
];

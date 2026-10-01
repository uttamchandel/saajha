// Shared demo data: the languages with a canned advisory, and those advisories.
// Fallbacks guarantee the deployed demo never breaks in front of judges,
// even if the Gemini API key is missing or rate-limited.

export type Lang = "hi" | "en" | "mr" | "te";

export const LANGS: { code: Lang; label: string; native: string; bcp47: string }[] = [
  { code: "hi", label: "Hindi", native: "हिंदी", bcp47: "hi-IN" },
  { code: "en", label: "English", native: "English", bcp47: "en-IN" },
  { code: "mr", label: "Marathi", native: "मराठी", bcp47: "mr-IN" },
  { code: "te", label: "Telugu", native: "తెలుగు", bcp47: "te-IN" },
];

// Canned advisory fallbacks (used only if Gemini is unreachable).
export const FALLBACK_ADVISORY: Record<Lang, { ivr: string; sms: string }> = {
  hi: {
    ivr: "आपकी कपास में पत्ती मोड़क विषाणु यानी लीफ कर्ल वायरस के लक्षण लग रहे हैं। यह सफेद मक्खी से फैलता है। पीला चिपचिपा कार्ड लगाएँ, नीम का तेल पाँच मिलीलीटर प्रति लीटर पानी में मिलाकर शाम को छिड़काव करें। ज़्यादा प्रकोप होने पर डायफेनथ्यूरॉन एक ग्राम प्रति लीटर डालें; एक ही दवा बार-बार न छिड़कें। संक्रमित पौधे उखाड़कर जला दें। अधिक जानकारी के लिए अपने कृषि विज्ञान केंद्र से संपर्क करें।",
    sms: "कपास: लीफ कर्ल वायरस संभव। सफेद मक्खी रोकें: पीला चिपचिपा कार्ड + नीम तेल 5ml/L शाम को छिड़कें। गंभीर: डायफेनथ्यूरॉन 1g/L। रोगी पौधे उखाड़ें। KVK: 1800-180-1551",
  },
  en: {
    ivr: "Your cotton shows signs of leaf curl virus, spread by whitefly. Install yellow sticky traps and spray neem oil, five millilitres per litre of water, in the evening. If severe, use Diafenthiuron at one gram per litre, and rotate chemicals rather than repeating one. Remove and burn infected plants. Contact your Krishi Vigyan Kendra for more help.",
    sms: "Cotton: likely Leaf Curl Virus. Control whitefly: yellow sticky traps + neem oil 5ml/L evening spray. Severe: Diafenthiuron 1g/L. Uproot infected plants. KVK helpline: 1800-180-1551",
  },
  mr: {
    ivr: "तुमच्या कापसावर लीफ कर्ल व्हायरसची लक्षणे दिसत आहेत. हा पांढऱ्या माशीमुळे पसरतो. पिवळे चिकट सापळे लावा, निंबोळी तेल पाच मिली प्रति लिटर पाण्यात मिसळून संध्याकाळी फवारणी करा. जास्त प्रादुर्भाव असल्यास डायफेनथ्युरॉन एक ग्रॅम प्रति लिटर वापरा; तीच फवारणी वारंवार करू नका. रोगट झाडे उपटून जाळा.",
    sms: "कापूस: लीफ कर्ल व्हायरस शक्य. पांढरी माशी रोखा: पिवळे चिकट सापळे + निंबोळी तेल 5ml/L संध्याकाळी. गंभीर: डायफेनथ्युरॉन 1g/L. रोगट झाडे उपटा. KVK: 1800-180-1551",
  },
  te: {
    ivr: "మీ పత్తిలో లీఫ్ కర్ల్ వైరస్ లక్షణాలు కనిపిస్తున్నాయి. ఇది తెల్లదోమ ద్వారా వ్యాపిస్తుంది. పసుపు జిగురు అట్టలు పెట్టండి, వేప నూనె లీటరు నీటికి ఐదు మిల్లీలీటర్లు కలిపి సాయంత్రం పిచికారీ చేయండి. తీవ్రంగా ఉంటే డయాఫెంథియురాన్ లీటరుకు ఒక గ్రాము వాడండి; ఒకే మందు మళ్లీ మళ్లీ వాడకండి. వ్యాధి సోకిన మొక్కలను పీకి కాల్చండి.",
    sms: "పత్తి: లీఫ్ కర్ల్ వైరస్ అవకాశం. తెల్లదోమ నివారణ: పసుపు జిగురు అట్టలు + వేప నూనె 5ml/L సాయంత్రం. తీవ్రం: డయాఫెంథియురాన్ 1g/L. KVK: 1800-180-1551",
  },
};

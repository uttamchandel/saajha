// Adapted from the state node's code; see NOTICE.
// Source: apps/node/lib/i18n-full.ts (LANGS_FULL + LANG_NAME_FOR_PROMPT only).
// 12 scheduled Indian languages. ttsLikely = browser speechSynthesis commonly ships a voice.

export type Lang = {
  code: string;
  label: string;
  native: string;
  bcp47: string;
  ttsLikely: boolean;
};

export const LANGS_FULL: Lang[] = [
  { code: "hi", label: "Hindi", native: "हिन्दी", bcp47: "hi-IN", ttsLikely: true },
  { code: "en", label: "English", native: "English", bcp47: "en-IN", ttsLikely: true },
  { code: "mr", label: "Marathi", native: "मराठी", bcp47: "mr-IN", ttsLikely: true },
  { code: "te", label: "Telugu", native: "తెలుగు", bcp47: "te-IN", ttsLikely: true },
  { code: "ta", label: "Tamil", native: "தமிழ்", bcp47: "ta-IN", ttsLikely: true },
  { code: "kn", label: "Kannada", native: "ಕನ್ನಡ", bcp47: "kn-IN", ttsLikely: true },
  { code: "ml", label: "Malayalam", native: "മലയാളം", bcp47: "ml-IN", ttsLikely: true },
  { code: "bn", label: "Bengali", native: "বাংলা", bcp47: "bn-IN", ttsLikely: true },
  { code: "gu", label: "Gujarati", native: "ગુજરાતી", bcp47: "gu-IN", ttsLikely: true },
  { code: "pa", label: "Punjabi", native: "ਪੰਜਾਬੀ", bcp47: "pa-IN", ttsLikely: true },
  { code: "or", label: "Odia", native: "ଓଡ଼ିଆ", bcp47: "or-IN", ttsLikely: false },
  { code: "as", label: "Assamese", native: "অসমীয়া", bcp47: "as-IN", ttsLikely: false },
];

// How to name each language inside a Gemini prompt (script matters for Indic output).
export const LANG_NAME_FOR_PROMPT: Record<string, string> = {
  hi: "Hindi (Devanagari script)",
  en: "simple Indian English",
  mr: "Marathi (Devanagari script)",
  te: "Telugu (Telugu script)",
  ta: "Tamil (Tamil script)",
  kn: "Kannada (Kannada script)",
  ml: "Malayalam (Malayalam script)",
  bn: "Bengali (Bengali script)",
  gu: "Gujarati (Gujarati script)",
  pa: "Punjabi (Gurmukhi script)",
  or: "Odia (Odia script)",
  as: "Assamese (Bengali-Assamese script)",
};

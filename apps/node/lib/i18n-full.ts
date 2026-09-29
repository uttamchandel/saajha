// All-India language pack: 12 scheduled languages for the farmer-facing simulator.
// Superset of lib/i18n.ts (which keeps hi/en/mr/te for legacy imports until step-2 migration).
// Sources: research/languages-voice.json (native names, bcp47, browser-TTS availability).

export type LangFull = {
  code: string;
  label: string;
  native: string;
  bcp47: string;
  ttsLikely: boolean;
};

export const LANGS_FULL: LangFull[] = [
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

// UI strings for the farmer-facing simulator, all 12 languages.
// Keys: everything in lib/i18n.ts T + autoDetect, detected, mandiPrices, recordHint.
export const T_FULL: Record<string, Record<string, string>> = {
  hi: {
    welcome: "किसानवाणी में आपका स्वागत है",
    ivrGreeting:
      "नमस्ते! किसानवाणी में आपका स्वागत है। फसल की समस्या बताने के लिए एक दबाएँ। मंडी भाव के लिए दो दबाएँ। मौसम सलाह के लिए तीन दबाएँ।",
    ivrAskProblem: "बीप के बाद अपनी फसल की समस्या बताएँ।",
    ivrThinking: "आपकी समस्या समझी जा रही है, कृपया प्रतीक्षा करें...",
    callEnded: "कॉल समाप्त। धन्यवाद!",
    dialing: "डायल हो रहा है...",
    connected: "कनेक्टेड — किसानवाणी IVR",
    speakNow: "अब बोलिए...",
    sendSms: "भेजें",
    smsPlaceholder: "फसल + समस्या लिखें",
    listen: "🔊 सुनें",
    stop: "⏹ रोकें",
    autoDetect: "ऑटो — कोई भी भाषा बोलें",
    detected: "भाषा पहचानी गई:",
    mandiPrices: "मंडी भाव",
    recordHint: "माइक दबाएँ और अपनी भाषा में बोलें",
  },
  en: {
    welcome: "Welcome to KisanVaani",
    ivrGreeting:
      "Namaste! Welcome to KisanVaani. Press 1 to describe a crop problem. Press 2 for mandi prices. Press 3 for weather advisory.",
    ivrAskProblem: "After the beep, describe your crop problem.",
    ivrThinking: "Understanding your problem, please wait...",
    callEnded: "Call ended. Thank you!",
    dialing: "Dialling...",
    connected: "Connected — KisanVaani IVR",
    speakNow: "Speak now...",
    sendSms: "Send",
    smsPlaceholder: "Type crop + problem",
    listen: "🔊 Listen",
    stop: "⏹ Stop",
    autoDetect: "Auto — speak any language",
    detected: "Language detected:",
    mandiPrices: "Mandi Prices",
    recordHint: "Press the mic and speak in your language",
  },
  mr: {
    welcome: "किसानवाणी मध्ये आपले स्वागत आहे",
    ivrGreeting:
      "नमस्कार! किसानवाणी मध्ये आपले स्वागत आहे. पिकाची समस्या सांगण्यासाठी एक दाबा. बाजारभावासाठी दोन दाबा. हवामान सल्ल्यासाठी तीन दाबा.",
    ivrAskProblem: "बीप नंतर तुमच्या पिकाची समस्या सांगा.",
    ivrThinking: "तुमची समस्या समजून घेतली जात आहे, कृपया थांबा...",
    callEnded: "कॉल समाप्त. धन्यवाद!",
    dialing: "डायल होत आहे...",
    connected: "कनेक्टेड — किसानवाणी IVR",
    speakNow: "आता बोला...",
    sendSms: "पाठवा",
    smsPlaceholder: "पीक + समस्या लिहा",
    listen: "🔊 ऐका",
    stop: "⏹ थांबवा",
    autoDetect: "ऑटो — कोणतीही भाषा बोला",
    detected: "भाषा ओळखली:",
    mandiPrices: "बाजारभाव",
    recordHint: "माइक दाबा आणि तुमच्या भाषेत बोला",
  },
  te: {
    welcome: "కిసాన్‌వాణికి స్వాగతం",
    ivrGreeting:
      "నమస్తే! కిసాన్‌వాణికి స్వాగతం. పంట సమస్య చెప్పడానికి ఒకటి నొక్కండి. మండి ధరల కోసం రెండు నొక్కండి. వాతావరణ సలహా కోసం మూడు నొక్కండి.",
    ivrAskProblem: "బీప్ తర్వాత మీ పంట సమస్యను చెప్పండి.",
    ivrThinking: "మీ సమస్యను అర్థం చేసుకుంటున్నాం, దయచేసి వేచి ఉండండి...",
    callEnded: "కాల్ ముగిసింది. ధన్యవాదాలు!",
    dialing: "డయల్ అవుతోంది...",
    connected: "కనెక్ట్ అయింది — కిసాన్‌వాణి IVR",
    speakNow: "ఇప్పుడు మాట్లాడండి...",
    sendSms: "పంపండి",
    smsPlaceholder: "పంట + సమస్య రాయండి",
    listen: "🔊 వినండి",
    stop: "⏹ ఆపండి",
    autoDetect: "ఆటో — ఏ భాషలోనైనా మాట్లాడండి",
    detected: "భాష గుర్తించబడింది:",
    mandiPrices: "మండి ధరలు",
    recordHint: "మైక్ నొక్కి మీ భాషలో మాట్లాడండి",
  },
  ta: {
    welcome: "கிசான்வாணிக்கு வரவேற்கிறோம்",
    ivrGreeting:
      "வணக்கம்! கிசான்வாணிக்கு வரவேற்கிறோம். பயிர் பிரச்சனை சொல்ல ஒன்றை அழுத்தவும். மண்டி விலை அறிய இரண்டை அழுத்தவும். வானிலை ஆலோசனைக்கு மூன்றை அழுத்தவும்.",
    ivrAskProblem: "பீப் ஒலிக்குப் பிறகு உங்கள் பயிர் பிரச்சனையைச் சொல்லுங்கள்.",
    ivrThinking: "உங்கள் பிரச்சனையைப் புரிந்துகொள்கிறோம், சிறிது காத்திருங்கள்...",
    callEnded: "அழைப்பு முடிந்தது. நன்றி!",
    dialing: "டயல் ஆகிறது...",
    connected: "இணைக்கப்பட்டது — கிசான்வாணி IVR",
    speakNow: "இப்போது பேசுங்கள்...",
    sendSms: "அனுப்பு",
    smsPlaceholder: "பயிர் + பிரச்சனை எழுதுங்கள்",
    listen: "🔊 கேளுங்கள்",
    stop: "⏹ நிறுத்து",
    autoDetect: "ஆட்டோ — எந்த மொழியிலும் பேசலாம்",
    detected: "மொழி கண்டறியப்பட்டது:",
    mandiPrices: "மண்டி விலை",
    recordHint: "மைக்கை அழுத்தி உங்கள் மொழியில் பேசுங்கள்",
  },
  kn: {
    welcome: "ಕಿಸಾನ್‌ವಾಣಿಗೆ ಸುಸ್ವಾಗತ",
    ivrGreeting:
      "ನಮಸ್ಕಾರ! ಕಿಸಾನ್‌ವಾಣಿಗೆ ಸುಸ್ವಾಗತ. ಬೆಳೆ ಸಮಸ್ಯೆ ಹೇಳಲು ಒಂದು ಒತ್ತಿ. ಮಂಡಿ ದರಗಳಿಗೆ ಎರಡು ಒತ್ತಿ. ಹವಾಮಾನ ಸಲಹೆಗೆ ಮೂರು ಒತ್ತಿ.",
    ivrAskProblem: "ಬೀಪ್ ನಂತರ ನಿಮ್ಮ ಬೆಳೆ ಸಮಸ್ಯೆಯನ್ನು ಹೇಳಿ.",
    ivrThinking: "ನಿಮ್ಮ ಸಮಸ್ಯೆಯನ್ನು ಅರ್ಥಮಾಡಿಕೊಳ್ಳುತ್ತಿದ್ದೇವೆ, ದಯವಿಟ್ಟು ಕಾಯಿರಿ...",
    callEnded: "ಕರೆ ಮುಗಿಯಿತು. ಧನ್ಯವಾದಗಳು!",
    dialing: "ಡಯಲ್ ಆಗುತ್ತಿದೆ...",
    connected: "ಸಂಪರ್ಕಗೊಂಡಿದೆ — ಕಿಸಾನ್‌ವಾಣಿ IVR",
    speakNow: "ಈಗ ಮಾತನಾಡಿ...",
    sendSms: "ಕಳುಹಿಸಿ",
    smsPlaceholder: "ಬೆಳೆ + ಸಮಸ್ಯೆ ಬರೆಯಿರಿ",
    listen: "🔊 ಕೇಳಿ",
    stop: "⏹ ನಿಲ್ಲಿಸಿ",
    autoDetect: "ಆಟೋ — ಯಾವುದೇ ಭಾಷೆಯಲ್ಲಿ ಮಾತನಾಡಿ",
    detected: "ಭಾಷೆ ಗುರುತಿಸಲಾಗಿದೆ:",
    mandiPrices: "ಮಂಡಿ ದರಗಳು",
    recordHint: "ಮೈಕ್ ಒತ್ತಿ ನಿಮ್ಮ ಭಾಷೆಯಲ್ಲಿ ಮಾತನಾಡಿ",
  },
  ml: {
    welcome: "കിസാൻവാണിയിലേക്ക് സ്വാഗതം",
    ivrGreeting:
      "നമസ്കാരം! കിസാൻവാണിയിലേക്ക് സ്വാഗതം. വിളയുടെ പ്രശ്നം പറയാൻ ഒന്ന് അമർത്തുക. മണ്ടി വില അറിയാൻ രണ്ട് അമർത്തുക. കാലാവസ്ഥാ ഉപദേശത്തിന് മൂന്ന് അമർത്തുക.",
    ivrAskProblem: "ബീപ്പിന് ശേഷം നിങ്ങളുടെ വിളയുടെ പ്രശ്നം പറയുക.",
    ivrThinking: "നിങ്ങളുടെ പ്രശ്നം മനസ്സിലാക്കുകയാണ്, ദയവായി കാത്തിരിക്കുക...",
    callEnded: "കോൾ അവസാനിച്ചു. നന്ദി!",
    dialing: "ഡയൽ ചെയ്യുന്നു...",
    connected: "കണക്റ്റായി — കിസാൻവാണി IVR",
    speakNow: "ഇപ്പോൾ സംസാരിക്കൂ...",
    sendSms: "അയയ്ക്കുക",
    smsPlaceholder: "വിള + പ്രശ്നം എഴുതുക",
    listen: "🔊 കേൾക്കുക",
    stop: "⏹ നിർത്തുക",
    autoDetect: "ഓട്ടോ — ഏത് ഭാഷയിലും സംസാരിക്കാം",
    detected: "ഭാഷ തിരിച്ചറിഞ്ഞു:",
    mandiPrices: "മണ്ടി വില",
    recordHint: "മൈക്ക് അമർത്തി നിങ്ങളുടെ ഭാഷയിൽ സംസാരിക്കുക",
  },
  bn: {
    welcome: "কিসানবাণীতে আপনাকে স্বাগতম",
    ivrGreeting:
      "নমস্কার! কিসানবাণীতে আপনাকে স্বাগতম। ফসলের সমস্যা জানাতে এক টিপুন। মান্ডির দর জানতে দুই টিপুন। আবহাওয়ার পরামর্শের জন্য তিন টিপুন।",
    ivrAskProblem: "বিপ শব্দের পর আপনার ফসলের সমস্যা বলুন।",
    ivrThinking: "আপনার সমস্যা বোঝা হচ্ছে, একটু অপেক্ষা করুন...",
    callEnded: "কল শেষ। ধন্যবাদ!",
    dialing: "ডায়াল হচ্ছে...",
    connected: "সংযুক্ত — কিসানবাণী IVR",
    speakNow: "এখন বলুন...",
    sendSms: "পাঠান",
    smsPlaceholder: "ফসল + সমস্যা লিখুন",
    listen: "🔊 শুনুন",
    stop: "⏹ থামান",
    autoDetect: "অটো — যেকোনো ভাষায় বলুন",
    detected: "ভাষা শনাক্ত হয়েছে:",
    mandiPrices: "মান্ডির দর",
    recordHint: "মাইক টিপে আপনার ভাষায় বলুন",
  },
  gu: {
    welcome: "કિસાનવાણીમાં આપનું સ્વાગત છે",
    ivrGreeting:
      "નમસ્તે! કિસાનવાણીમાં આપનું સ્વાગત છે. પાકની સમસ્યા જણાવવા એક દબાવો. મંડીના ભાવ માટે બે દબાવો. હવામાન સલાહ માટે ત્રણ દબાવો.",
    ivrAskProblem: "બીપ પછી તમારા પાકની સમસ્યા જણાવો.",
    ivrThinking: "તમારી સમસ્યા સમજવામાં આવી રહી છે, કૃપા કરી રાહ જુઓ...",
    callEnded: "કૉલ પૂરો થયો. આભાર!",
    dialing: "ડાયલ થઈ રહ્યું છે...",
    connected: "કનેક્ટેડ — કિસાનવાણી IVR",
    speakNow: "હવે બોલો...",
    sendSms: "મોકલો",
    smsPlaceholder: "પાક + સમસ્યા લખો",
    listen: "🔊 સાંભળો",
    stop: "⏹ રોકો",
    autoDetect: "ઑટો — કોઈપણ ભાષામાં બોલો",
    detected: "ભાષા ઓળખાઈ:",
    mandiPrices: "મંડી ભાવ",
    recordHint: "માઇક દબાવી તમારી ભાષામાં બોલો",
  },
  pa: {
    welcome: "ਕਿਸਾਨਵਾਣੀ ਵਿੱਚ ਤੁਹਾਡਾ ਸੁਆਗਤ ਹੈ",
    ivrGreeting:
      "ਸਤ ਸ੍ਰੀ ਅਕਾਲ! ਕਿਸਾਨਵਾਣੀ ਵਿੱਚ ਤੁਹਾਡਾ ਸੁਆਗਤ ਹੈ। ਫ਼ਸਲ ਦੀ ਸਮੱਸਿਆ ਦੱਸਣ ਲਈ ਇੱਕ ਦਬਾਓ। ਮੰਡੀ ਭਾਅ ਲਈ ਦੋ ਦਬਾਓ। ਮੌਸਮ ਸਲਾਹ ਲਈ ਤਿੰਨ ਦਬਾਓ।",
    ivrAskProblem: "ਬੀਪ ਤੋਂ ਬਾਅਦ ਆਪਣੀ ਫ਼ਸਲ ਦੀ ਸਮੱਸਿਆ ਦੱਸੋ।",
    ivrThinking: "ਤੁਹਾਡੀ ਸਮੱਸਿਆ ਸਮਝੀ ਜਾ ਰਹੀ ਹੈ, ਕਿਰਪਾ ਕਰਕੇ ਉਡੀਕ ਕਰੋ...",
    callEnded: "ਕਾਲ ਖ਼ਤਮ। ਧੰਨਵਾਦ!",
    dialing: "ਡਾਇਲ ਹੋ ਰਿਹਾ ਹੈ...",
    connected: "ਕਨੈਕਟਡ — ਕਿਸਾਨਵਾਣੀ IVR",
    speakNow: "ਹੁਣ ਬੋਲੋ...",
    sendSms: "ਭੇਜੋ",
    smsPlaceholder: "ਫ਼ਸਲ + ਸਮੱਸਿਆ ਲਿਖੋ",
    listen: "🔊 ਸੁਣੋ",
    stop: "⏹ ਰੋਕੋ",
    autoDetect: "ਆਟੋ — ਕੋਈ ਵੀ ਭਾਸ਼ਾ ਬੋਲੋ",
    detected: "ਭਾਸ਼ਾ ਪਛਾਣੀ ਗਈ:",
    mandiPrices: "ਮੰਡੀ ਭਾਅ",
    recordHint: "ਮਾਈਕ ਦਬਾ ਕੇ ਆਪਣੀ ਭਾਸ਼ਾ ਵਿੱਚ ਬੋਲੋ",
  },
  or: {
    welcome: "କିସାନବାଣୀକୁ ସ୍ୱାଗତ",
    ivrGreeting:
      "ନମସ୍କାର! କିସାନବାଣୀକୁ ସ୍ୱାଗତ। ଫସଲ ସମସ୍ୟା କହିବାକୁ ଏକ ଦବାନ୍ତୁ। ମଣ୍ଡି ଦର ପାଇଁ ଦୁଇ ଦବାନ୍ତୁ। ପାଣିପାଗ ପରାମର୍ଶ ପାଇଁ ତିନି ଦବାନ୍ତୁ।",
    ivrAskProblem: "ବିପ୍ ପରେ ଆପଣଙ୍କ ଫସଲର ସମସ୍ୟା କୁହନ୍ତୁ।",
    ivrThinking: "ଆପଣଙ୍କ ସମସ୍ୟା ବୁଝାଯାଉଛି, ଦୟାକରି ଅପେକ୍ଷା କରନ୍ତୁ...",
    callEnded: "କଲ୍ ଶେଷ ହେଲା। ଧନ୍ୟବାଦ!",
    dialing: "ଡାୟଲ୍ ହେଉଛି...",
    connected: "ସଂଯୁକ୍ତ — କିସାନବାଣୀ IVR",
    speakNow: "ବର୍ତ୍ତମାନ କୁହନ୍ତୁ...",
    sendSms: "ପଠାନ୍ତୁ",
    smsPlaceholder: "ଫସଲ + ସମସ୍ୟା ଲେଖନ୍ତୁ",
    listen: "🔊 ଶୁଣନ୍ତୁ",
    stop: "⏹ ବନ୍ଦ କରନ୍ତୁ",
    autoDetect: "ଅଟୋ — ଯେକୌଣସି ଭାଷାରେ କୁହନ୍ତୁ",
    detected: "ଭାଷା ଚିହ୍ନଟ ହେଲା:",
    mandiPrices: "ମଣ୍ଡି ଦର",
    recordHint: "ମାଇକ୍ ଦବାଇ ନିଜ ଭାଷାରେ କୁହନ୍ତୁ",
  },
  as: {
    welcome: "কিষাণবাণীলৈ আপোনাক স্বাগতম",
    ivrGreeting:
      "নমস্কাৰ! কিষাণবাণীলৈ আপোনাক স্বাগতম। শস্যৰ সমস্যা ক'বলৈ এক টিপক। মাণ্ডিৰ দৰৰ বাবে দুই টিপক। বতৰৰ পৰামৰ্শৰ বাবে তিনি টিপক।",
    ivrAskProblem: "বিপৰ পিছত আপোনাৰ শস্যৰ সমস্যা কওক।",
    ivrThinking: "আপোনাৰ সমস্যা বুজি লোৱা হৈছে, অনুগ্ৰহ কৰি অপেক্ষা কৰক...",
    callEnded: "কল শেষ হ'ল। ধন্যবাদ!",
    dialing: "ডায়েল হৈ আছে...",
    connected: "সংযোগ হ'ল — কিষাণবাণী IVR",
    speakNow: "এতিয়া কওক...",
    sendSms: "পঠিয়াওক",
    smsPlaceholder: "শস্য + সমস্যা লিখক",
    listen: "🔊 শুনক",
    stop: "⏹ ৰখক",
    autoDetect: "অট' — যিকোনো ভাষাত কওক",
    detected: "ভাষা চিনাক্ত হ'ল:",
    mandiPrices: "মাণ্ডিৰ দৰ",
    recordHint: "মাইক টিপি নিজৰ ভাষাত কওক",
  },
};

// Sample spoken/SMS queries per language — crop-realistic for each language's region.
export const SAMPLE_QUERIES_FULL: Record<string, { ivr: string[]; sms: string[] }> = {
  hi: {
    // Cotton + paddy (MP / north-central belt)
    ivr: [
      "मेरी कपास की पत्तियाँ पीली पड़ रही हैं और मुड़ रही हैं, क्या करूँ?",
      "धान में भूरे धब्बे दिख रहे हैं, कौन सी दवा डालूँ?",
    ],
    sms: ["KAPAS PILA PATTA", "DHAN BHURA DHABBA"],
  },
  en: {
    ivr: [
      "My cotton leaves are turning yellow and curling, what should I do?",
      "Brown spots are appearing on my paddy crop, which medicine to spray?",
    ],
    sms: ["COTTON YELLOW LEAF", "PADDY BROWN SPOT"],
  },
  mr: {
    // Cotton + paddy (Vidarbha / Konkan)
    ivr: [
      "माझ्या कापसाची पाने पिवळी पडत आहेत आणि वळत आहेत, काय करू?",
      "भातावर तपकिरी डाग दिसत आहेत, कोणते औषध फवारू?",
    ],
    sms: ["KAPUS PIVLA PANA", "BHAT TAPKIRI DAG"],
  },
  te: {
    // Cotton + paddy (Telangana / coastal Andhra)
    ivr: [
      "నా పత్తి ఆకులు పసుపు రంగులోకి మారి ముడుచుకుంటున్నాయి, ఏమి చేయాలి?",
      "వరిలో గోధుమ రంగు మచ్చలు కనిపిస్తున్నాయి, ఏ మందు వాడాలి?",
    ],
    sms: ["PATTI PASUPU AKU", "VARI GODHUMA MACHA"],
  },
  ta: {
    // Paddy + banana (Thanjavur delta)
    ivr: [
      "என் நெல் பயிரின் இலைகளில் பழுப்பு நிறப் புள்ளிகள் வந்துள்ளன, என்ன மருந்து அடிக்கலாம்?",
      "வாழை இலைகள் மஞ்சளாகி வாடுகின்றன, என்ன செய்வது?",
    ],
    sms: ["NEL PALUPPU PULLI", "VAZHAI MANJAL ILAI"],
  },
  kn: {
    // Ragi + sugarcane (south Karnataka / Mandya belt)
    ivr: [
      "ನನ್ನ ರಾಗಿ ಎಲೆಗಳ ಮೇಲೆ ಕಂದು ಚುಕ್ಕೆಗಳು ಕಾಣಿಸುತ್ತಿವೆ, ಯಾವ ಔಷಧಿ ಸಿಂಪಡಿಸಬೇಕು?",
      "ಕಬ್ಬಿನ ಎಲೆಗಳು ಹಳದಿಯಾಗಿ ಒಣಗುತ್ತಿವೆ, ಏನು ಮಾಡಬೇಕು?",
    ],
    sms: ["RAGI KANDU CHUKKE", "KABBU HALADI ELE"],
  },
  ml: {
    // Coconut + banana (Kerala)
    ivr: [
      "എന്റെ തെങ്ങിന്റെ ഓലകൾ മഞ്ഞളിച്ച് ഉണങ്ങുന്നു, എന്ത് ചെയ്യണം?",
      "വാഴയിലയിൽ കറുത്ത പാടുകൾ കാണുന്നു, ഏത് മരുന്ന് തളിക്കണം?",
    ],
    sms: ["THENGU MANJA OLA", "VAZHA KARUTHA PADU"],
  },
  bn: {
    // Paddy + jute (West Bengal)
    ivr: [
      "আমার ধানের পাতায় বাদামি দাগ দেখা দিচ্ছে, কোন ওষুধ দেব?",
      "পাট গাছের গোড়া পচে যাচ্ছে, কী করব?",
    ],
    sms: ["DHAN BADAMI DAG", "PAT GORA POCHA"],
  },
  gu: {
    // Groundnut + cotton (Saurashtra)
    ivr: [
      "મારી મગફળીના પાન પર પીળા ધબ્બા દેખાય છે, કઈ દવા છાંટું?",
      "કપાસના પાન પીળા પડીને વળી રહ્યા છે, શું કરું?",
    ],
    sms: ["MAGFALI PILA DHABBA", "KAPAS PILA PAN"],
  },
  pa: {
    // Wheat + paddy (Punjab)
    ivr: [
      "ਮੇਰੀ ਕਣਕ ਦੇ ਪੱਤੇ ਪੀਲੇ ਪੈ ਰਹੇ ਹਨ, ਪੀਲੀ ਕੁੰਗੀ ਲੱਗਦੀ ਹੈ, ਕੀ ਕਰਾਂ?",
      "ਝੋਨੇ ਦੇ ਪੱਤਿਆਂ ਉੱਤੇ ਭੂਰੇ ਧੱਬੇ ਪੈ ਗਏ ਹਨ, ਕਿਹੜੀ ਦਵਾਈ ਛਿੜਕਾਂ?",
    ],
    sms: ["KANAK PILI KUNGI", "JHONA BHURA DHABBA"],
  },
  or: {
    // Paddy (Odisha)
    ivr: [
      "ମୋ ଧାନ ଗଛର ପତ୍ରରେ ମାଟିଆ ଦାଗ ଦେଖାଯାଉଛି, କେଉଁ ଔଷଧ ପକାଇବି?",
      "ଧାନରେ ପୋକ ଲାଗିଛି, ଗଛ ଶୁଖିଯାଉଛି, କ'ଣ କରିବି?",
    ],
    sms: ["DHANA MATIA DAGA", "DHANA POKA SUKHA"],
  },
  as: {
    // Tea + paddy (Assam)
    ivr: [
      "মোৰ চাহ গছৰ পাতত ৰঙা মকৰা লাগিছে, কি দৰব দিম?",
      "ধানৰ পাতত মুগা ৰঙৰ দাগ ওলাইছে, কি কৰিম?",
    ],
    sms: ["SAH RONGA MOKORA", "DHAN MUGA DAG"],
  },
};

// Language name + script hints for Gemini prompts (used by API routes).
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

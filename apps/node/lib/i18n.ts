import type { Lang } from "./data";

// UI strings for the farmer-facing simulator. Landing & command center stay English (judge-facing).
export const T: Record<Lang, Record<string, string>> = {
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
  },
};

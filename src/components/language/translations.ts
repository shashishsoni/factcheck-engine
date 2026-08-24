import type { LanguageMode, Verdict } from "@/lib/types";

const EN_TRANSLATIONS = {
  newFactCheck: "New Fact Check",
  description: "Paste a URL, ISBN, image link, video link, audio link, or social post URL.",
  inputPlaceholder: "https://... or ISBN or media URL",
  verify: "Verify",
  checking: "Checking...",
  tryLabel: "Try:",
  judgeFinalRuling: "Judge's Final Ruling",
  // Keep the original key as a compatibility alias for existing callers.
  judgesFinalRuling: "Judge's Final Ruling",
  detailedOpinion: "Detailed Opinion",
  theRuling: "The Ruling",
  claimsEvaluated: "claims evaluated",
  sourcesConsulted: "sources consulted",
  savedToHistory: "Saved to history",
  claims: "Claims",
  sources: "Sources",
  verificationComplete: "Verification complete",
  pipelineTitle: "AI Pipeline — Behind the Scenes",
  pipelineSubtitle: "Watch the multi-model orchestration in real-time",
  live: "live",
  inputAnalysis: "Input Analysis",
  transcriptExtraction: "Transcript Extraction",
  mediaAnalysis: "Media Analysis",
  claimExtraction: "Claim Extraction",
  evidenceGathering: "Evidence Gathering",
  ensembleEvaluation: "Ensemble Evaluation",
  crossExamination: "Cross-Examination",
  judgeAdjudication: "Judge Adjudication",
  verdictSynthesis: "Verdict Synthesis",
  finalVerdict: "Final verdict:",
  foundSources: "Found",
  sourceAcross: "sources across",
  statement: "statement",
  statementsPlural: "statements",
  supporting: "supporting",
  contradicting: "contradicting",
  contextual: "contextual",
  loadMoreSources: "Load more sources",
  remaining: "remaining",
  showLess: "Show less",
  modelsReviewing: "Models reviewing each other's verdicts",
  waitingToRespond: "waiting to respond...",
  reviewing: "Reviewing",
  evaluations: "evaluations",
  debateResponses: "debate responses",
  deliberating: "deliberating...",
  finalVerdictLabel: "final verdict",
  judgeDeliberation: "Judge deliberation",
  showFullReasoning: "Show full reasoning",
  hideFullReasoning: "Hide full reasoning",
  responseTo: "responding to:",
  revised: "Revised:",
  reasoning: "Reasoning:",
  thinking: "thinking...",
  waitingOutput: "Waiting for model output...",
  modelFailed: "Model failed to respond",
  crossExaminationFailed: "Cross-examination failed",
  languageLabel: "Language",
  english: "English",
  hindi: "Hindi",
} as const;

export type TranslationKey = keyof typeof EN_TRANSLATIONS;

type TranslationTable = Record<LanguageMode, Record<TranslationKey, string>>;

const TRANSLATIONS: TranslationTable = {
  en: EN_TRANSLATIONS,
  hi: {
    newFactCheck: "नई तथ्य-जाँच",
    description: "URL, ISBN, इमेज लिंक, वीडियो लिंक, ऑडियो लिंक या सोशल पोस्ट का URL डालें।",
    inputPlaceholder: "https://... या ISBN या मीडिया URL",
    verify: "जाँचें",
    checking: "जाँच जारी है...",
    tryLabel: "उदाहरण:",
    judgeFinalRuling: "न्यायाधीश का अंतिम निर्णय",
    // Keep the original key as a compatibility alias for existing callers.
    judgesFinalRuling: "न्यायाधीश का अंतिम निर्णय",
    detailedOpinion: "विस्तृत राय",
    theRuling: "निर्णय",
    claimsEvaluated: "जाँचे गए दावे",
    sourcesConsulted: "देखे गए स्रोत",
    savedToHistory: "इतिहास में सहेजा गया",
    claims: "दावे",
    sources: "स्रोत",
    verificationComplete: "तथ्य-जाँच पूरी हुई",
    pipelineTitle: "AI पाइपलाइन — पर्दे के पीछे",
    pipelineSubtitle: "बहु-मॉडल समन्वय को रियल-टाइम में देखें",
    live: "लाइव",
    inputAnalysis: "इनपुट का विश्लेषण",
    transcriptExtraction: "ट्रांसक्रिप्ट का निष्कर्षण",
    mediaAnalysis: "मीडिया का विश्लेषण",
    claimExtraction: "दावों का निष्कर्षण",
    evidenceGathering: "साक्ष्य एकत्र करना",
    ensembleEvaluation: "मॉडलों का सामूहिक मूल्यांकन",
    crossExamination: "जिरह",
    judgeAdjudication: "न्यायाधीश का निर्णय",
    verdictSynthesis: "अंतिम निर्णय का संकलन",
    finalVerdict: "अंतिम निर्णय:",
    foundSources: "मिले",
    sourceAcross: "स्रोतों में",
    statement: "कथन",
    statementsPlural: "कथन",
    supporting: "समर्थन",
    contradicting: "विरोध",
    contextual: "संदर्भित",
    loadMoreSources: "और स्रोत लोड करें",
    remaining: "बाकी",
    showLess: "कम दिखाएँ",
    modelsReviewing: "मॉडल एक-दूसरे के निर्णयों की समीक्षा कर रहे हैं",
    waitingToRespond: "जवाब की प्रतीक्षा...",
    reviewing: "समीक्षा",
    evaluations: "मूल्यांकन",
    debateResponses: "बहस प्रतिक्रियाएँ",
    deliberating: "विचार कर रहे हैं...",
    finalVerdictLabel: "अंतिम निर्णय",
    judgeDeliberation: "न्यायाधीश का विचार-विमर्श",
    showFullReasoning: "पूरा तर्क दिखाएँ",
    hideFullReasoning: "पूरा तर्क छिपाएँ",
    responseTo: "के जवाब में:",
    revised: "संशोधित:",
    reasoning: "तर्क:",
    thinking: "सोच रहे हैं...",
    waitingOutput: "मॉडल के उत्तर की प्रतीक्षा...",
    modelFailed: "मॉडल उत्तर नहीं दे सका",
    crossExaminationFailed: "जिरह विफल रही",
    languageLabel: "भाषा",
    english: "अंग्रेज़ी",
    hindi: "हिंदी",
  },
};

const STEP_KEYS: Partial<Record<string, TranslationKey>> = {
  "Input Analysis": "inputAnalysis",
  "Transcript Extraction": "transcriptExtraction",
  "Media Analysis": "mediaAnalysis",
  "Claim Extraction": "claimExtraction",
  "Evidence Gathering": "evidenceGathering",
  "Ensemble Evaluation": "ensembleEvaluation",
  "Cross-Examination": "crossExamination",
  "Judge Adjudication": "judgeAdjudication",
  "Verdict Synthesis": "verdictSynthesis",
};

const EN_VERDICT_LABELS: Record<Verdict, string> = {
  true: "True",
  mostly_true: "Mostly True",
  mixed: "Mixed",
  mostly_false: "Mostly False",
  false: "False",
  unverifiable: "Unverifiable",
  pending: "Pending",
};

const HI_VERDICT_LABELS: Record<Verdict, string> = {
  true: "सही",
  mostly_true: "अधिकतर सही",
  mixed: "मिश्रित",
  mostly_false: "अधिकतर गलत",
  false: "गलत",
  unverifiable: "सत्यापित नहीं",
  pending: "लंबित",
};

const EN_VERDICT_PLAIN: Record<Verdict, string> = {
  true: "The evidence supports this — it checks out.",
  mostly_true: "Mostly accurate, with minor inaccuracies.",
  mixed: "Some claims check out, others don't — the evidence is split.",
  mostly_false: "Mostly inaccurate, with a few true elements.",
  false: "The evidence contradicts this — it does not check out.",
  unverifiable: "We couldn't find enough reliable evidence to verify this.",
  pending: "Still being evaluated.",
};

const HI_VERDICT_PLAIN: Record<Verdict, string> = {
  true: "सबूत इसका समर्थन करते हैं — यह सही है।",
  mostly_true: "अधिकतर सही है, कुछ मामूली त्रुटियों के साथ।",
  mixed: "कुछ दावे सही हैं, कुछ नहीं — सबूत विभाजित हैं।",
  mostly_false: "अधिकतर गलत है, कुछ सही बातें मौजूद हैं।",
  false: "सबूत इसका विरोध करते हैं — यह सही नहीं है।",
  unverifiable: "हमें इसे सत्यापित करने के लिए पर्याप्त सबूत नहीं मिले।",
  pending: "अभी जांच चल रही है।",
};

export function t(language: LanguageMode, key: TranslationKey): string {
  return TRANSLATIONS[language][key];
}

export function translateStepLabel(language: LanguageMode, label: string): string {
  const key = STEP_KEYS[label];
  return key ? t(language, key) : label;
}

export function verdictLabel(language: LanguageMode, verdict: string): string {
  if (language === "en" && Object.prototype.hasOwnProperty.call(EN_VERDICT_LABELS, verdict)) {
    return EN_VERDICT_LABELS[verdict as Verdict];
  }
  if (Object.prototype.hasOwnProperty.call(HI_VERDICT_LABELS, verdict)) {
    return HI_VERDICT_LABELS[verdict as Verdict];
  }
  return verdict.replace(/_/g, " ");
}

export function verdictPlain(language: LanguageMode, verdict: string): string {
  if (language === "en" && Object.prototype.hasOwnProperty.call(EN_VERDICT_PLAIN, verdict)) {
    return EN_VERDICT_PLAIN[verdict as Verdict];
  }
  if (Object.prototype.hasOwnProperty.call(HI_VERDICT_PLAIN, verdict)) {
    return HI_VERDICT_PLAIN[verdict as Verdict];
  }
  return "";
}

import { LANGUAGES, getLanguageName, getLanguageNative } from "@/lib/languages";
import { dedupeProvenance, retrieveEvidence } from "@/lib/evidence";
import { getOfflineModelSettings } from "@/lib/localStore";
import {
  DEFAULT_OFFLINE_MODEL_SETTINGS,
  generateStructuredOffline,
  getOfflineModelStatus,
} from "@/lib/offlineLlm";
import type {
  CarePathStep,
  CareRoute,
  EvidenceTier,
  Explainability,
  IntakeData,
  IntegrativePlan,
  Interaction,
  InteractionReport,
  LlmGenerationMetadata,
  Modality,
  OfflineModelSettings,
  PlanPriority,
  PlanSegment,
  Recommendation,
  RecommendationCategory,
  RiskLevel,
  SuspectedCondition,
  SymptomObject,
  SymptomSeverity,
  TranslationSummary,
  Warning,
} from "@/lib/types";

const GLOSSARY: Record<string, Partial<Record<typeof LANGUAGES[number]["code"], string>>> = {
  fever: { hi: "बुखार", ta: "காய்ச்சல்", te: "జ్వరం", bn: "জ্বর", mr: "ताप", kn: "ಜ್ವರ", ml: "ജ്വരം" },
  headache: { hi: "सिरदर्द", ta: "தலைவலி", te: "తలనొప్పి", bn: "মাথাব্যথা", mr: "डोकेदुखी", kn: "ತಲೆನೋವು", ml: "തലവേദന" },
  cough: { hi: "खांसी", ta: "இருமல்", te: "దగ్గు", bn: "কাশি", mr: "खोकला", kn: "ಕೆಮ್ಮು", ml: "ചുമ" },
  "sore throat": { hi: "गले में खराश", ta: "தொண்டை வலி", te: "గొంతు నొప్పి", bn: "গলা ব্যথা", mr: "घसा दुखणे", kn: "ಗಂಟಲು ನೋವು", ml: "തൊണ്ടവേദന" },
  "chest pain": { hi: "सीने में दर्द", ta: "மார்பு வலி", te: "ఛాతినొప్పి", bn: "বুকে ব্যথা", mr: "छातीत दुखणे", kn: "ಎದೆ ನೋವು", ml: "നെഞ്ചുവേദന" },
  breathlessness: { hi: "सांस लेने में तकलीफ", ta: "மூச்சுத்திணறல்", te: "శ్వాసలో ఇబ్బంది", bn: "শ্বাসকষ্ট", mr: "धाप लागणे", kn: "ಉಸಿರಾಟ ತೊಂದರೆ", ml: "ശ്വാസംമുട്ടൽ" },
  hydration: { hi: "जलयोजन", ta: "நீர்ப்பூர்த்தி", te: "ద్రవాల తీసుకోవడం", bn: "পর্যাপ্ত জল", mr: "पुरेसे पाणी", kn: "ಪರ്യാപ್ತ ದ್ರವ", ml: "മതി വരുന്ന വെള്ളം" },
  rest: { hi: "आराम", ta: "ஓய்வு", te: "విశ్రాంతి", bn: "বিশ্রাম", mr: "विश्रांती", kn: "ವಿಶ್ರಾಂತಿ", ml: "വിശ്രമം" },
  "emergency care": { hi: "आपातकालीन देखभाल", ta: "அவசர சிகிச்சை", te: "అత్యవసర వైద్యం", bn: "জরুরি চিকিৎসা", mr: "तत्काळ आपत्कालीन उपचार", kn: "ತುರ್ತು ಚಿಕಿತ್ಸೆ", ml: "അടിയന്തര ചികിത്സ" },
  "clinician review": { hi: "चिकित्सक समीक्षा", ta: "மருத்துவர் பரிசீலனை", te: "వైద్యుల సమీక్ష", bn: "চিকিৎসক পর্যালোচনা", mr: "डॉक्टरांचा आढावा", kn: "ವೈದ್ಯರ ಪರಿಶೀಲನೆ", ml: "ഡോക്ടർ വിലയിരുത്തൽ" },
  "general practitioner": { hi: "जनरल प्रैक्टिशनर", ta: "பொது மருத்துவர்", te: "సాధారణ వైద్యుడు", bn: "জেনারেল প্র্যাকটিশনার", mr: "सर्वसाधारण डॉक्टर", kn: "ಸಾಮಾನ್ಯ ವೈದ್ಯರು", ml: "ജനറൽ പ്രാക്ടീഷണർ" },
  specialist: { hi: "विशेषज्ञ", ta: "நிபுணர்", te: "నిపుణ వైద్యుడు", bn: "বিশেষজ্ঞ", mr: "तज्ज्ञ", kn: "ತಜ್ಞ", ml: "സ്പെഷ്യലിസ്റ്റ്" },
};

const PHRASE_TRANSLATIONS: Record<string, Partial<Record<typeof LANGUAGES[number]["code"], string>>> = {
  "Risk level:": { hi: "जोखिम स्तर:", ta: "அபாய நிலை:", te: "ప్రమాద స్థాయి:", bn: "ঝুঁকির স্তর:", mr: "जोखीम पातळी:", kn: "ಅಪಾಯ ಮಟ್ಟ:", ml: "റിസ്‌ക് നില:" },
  "Recommended care path:": { hi: "अनुशंसित देखभाल मार्ग:", ta: "பரிந்துரைக்கப்பட்ட சிகிச்சை வழி:", te: "సిఫార్సు చేసిన చికిత్స మార్గం:", bn: "প্রস্তাবিত যত্নের ধাপ:", mr: "सुचवलेला काळजी मार्ग:", kn: "ಶಿಫಾರಸು ಮಾಡಿದ ಆರೈಕೆ ಮಾರ್ಗ:", ml: "ശുപാർശ ചെയ്യുന്ന പരിചരണ പാത:" },
  "Primary route:": { hi: "मुख्य रूट:", ta: "முக்கிய வழி:", te: "ప్రధాన మార్గం:", bn: "প্রধান রুট:", mr: "मुख्य मार्ग:", kn: "ಮುಖ್ಯ ಮಾರ್ಗ:", ml: "പ്രധാന പാത:" },
  "Top actions:": { hi: "मुख्य कदम:", ta: "முக்கிய செயல்:", te: "ప్రధాన చర్యలు:", bn: "মূল পদক্ষেপ:", mr: "मुख्य कृती:", kn: "ಮುಖ್ಯ ಕ್ರಮಗಳು:", ml: "പ്രധാന നടപടികൾ:" },
  "Monitor for red flags such as": { hi: "इन लाल झंडों पर नजर रखें जैसे", ta: "இப்படியான எச்சரிக்கை அறிகுறிகளை கவனிக்கவும்", te: "ఈ హెచ్చరిక సంకేతాలను గమనించండి", bn: "নিম্নলিখিত সতর্ক লক্ষণগুলো খেয়াল করুন", mr: "खालील धोक्याच्या लक्षणांकडे लक्ष द्या", kn: "ಈ ಎಚ್ಚರಿಕೆ ಲಕ್ಷಣಗಳನ್ನು ಗಮನಿಸಿ", ml: "ഈ അപകട സൂചനകൾ ശ്രദ്ധിക്കുക" },
  "Seek emergency care immediately.": { hi: "तुरंत आपातकालीन देखभाल लें।", ta: "உடனே அவசர சிகிச்சை பெறவும்।", te: "వెంటనే అత్యవసర వైద్యం పొందండి।", bn: "অবিলম্বে জরুরি চিকিৎসা নিন।", mr: "त्वरित आपत्कालीन उपचार घ्या।", kn: "ತಕ್ಷಣ ತುರ್ತು ಚಿಕಿತ್ಸೆ ಪಡೆಯಿರಿ.", ml: "ഉടൻ അടിയന്തര ചികിത്സ തേടുക." },
  "Arrange clinician review within 24 hours.": { hi: "24 घंटे के भीतर चिकित्सक समीक्षा कराएँ।", ta: "24 மணிநேரத்திற்குள் மருத்துவரை அணுகவும்।", te: "24 గంటల్లో వైద్యుల సమీక్ష పొందండి।", bn: "২৪ ঘণ্টার মধ্যে চিকিৎসক দেখান।", mr: "24 तासांच्या आत डॉक्टरांकडे जा.", kn: "24 ಗಂಟೆಗಳೊಳಗೆ ವೈದ್ಯರನ್ನು ಸಂಪರ್ಕಿಸಿ.", ml: "24 മണിക്കൂറിനുള്ളിൽ ഡോക്ടറെ കാണുക." },
  "Schedule a routine consultation and continue supportive care.": { hi: "नियमित परामर्श तय करें और सहायक देखभाल जारी रखें।", ta: "வழக்கமான ஆலோசனையை திட்டமிட்டு துணை பராமரிப்பை தொடரவும்।", te: "సాధారణ కన్సల్టేషన్ ప్లాన్ చేసి సహాయక సంరక్షణ కొనసాగించండి।", bn: "রুটিন পরামর্শ নিন এবং সহায়ক যত্ন চালিয়ে যান।", mr: "नियमित सल्ला ठरवा आणि सहाय्यक काळजी सुरू ठेवा.", kn: "ನಿಯಮಿತ ಸಲಹೆ ಪಡೆಯಿರಿ ಮತ್ತು ಸಹಾಯಕ ಆರೈಕೆ ಮುಂದುವರಿಸಿ.", ml: "സാധാരണ പരിശോധനയ്ക്ക് സമയം നിശ്ചയിച്ച് പിന്തുണാപരിചരണം തുടരുക." },
  "Use complementary modalities only as optional support.": { hi: "पूरक पद्धतियों का उपयोग केवल वैकल्पिक सहारे के रूप में करें।", ta: "துணை முறைகளை விருப்ப ஆதரவாக மட்டும் பயன்படுத்தவும்।", te: "పూరక విధానాలను ఐచ్ఛిక సహాయకంగా మాత్రమే ఉపయోగించండి।", bn: "পরিপূরক পদ্ধতিগুলো কেবল অতিরিক্ত সহায়তা হিসেবে ব্যবহার করুন।", mr: "पूरक पद्धती फक्त सहाय्यक पर्याय म्हणून वापरा.", kn: "ಪೂರಕ ವಿಧಾನಗಳನ್ನು ಕೇವಲ ಐಚ್ಛಿಕ ಬೆಂಬಲವಾಗಿ ಬಳಸಿ.", ml: "പൂരക രീതികൾ ഐച്ഛിക സഹായമായി മാത്രം ഉപയോഗിക്കുക." },
  "Maintain hydration and rest.": { hi: "पर्याप्त तरल लें और आराम करें।", ta: "போதுமான நீர் அருந்தி ஓய்வெடுக்கவும்।", te: "తగినంత ద్రవాలు తీసుకొని విశ్రాంతి తీసుకోండి।", bn: "পর্যাপ্ত জল পান করুন এবং বিশ্রাম নিন।", mr: "पुरेसे पाणी प्या आणि विश्रांती घ्या.", kn: "ಪರ്യാപ್ತ ದ್ರವ ಸೇವಿಸಿ ವಿಶ್ರಾಂತಿ ಪಡೆಯಿರಿ.", ml: "മതി വരുന്ന ദ്രവം കുടിച്ച് വിശ്രമിക്കുക." },
};

const MODALITIES: Modality[] = ["Allopathy", "Ayurveda", "Homeopathy", "Home Remedies"];
const SSRI_TERMS = ["sertraline", "fluoxetine", "escitalopram", "citalopram", "paroxetine"];
const ANTICOAGULANT_TERMS = ["warfarin", "apixaban", "rivaroxaban", "dabigatran", "heparin"];
const WARMING_HERBS = ["ashwagandha", "ginger", "dry ginger", "clove", "pepper", "licorice"];
const DIABETES_TERMS = ["diabetes", "diabetic", "sugar"];
const HYPERTENSION_TERMS = ["hypertension", "high bp", "high blood pressure"];

const SYMPTOM_PATTERNS: Array<{ normalized: string; terms: string[] }> = [
  { normalized: "chest pain", terms: ["chest pain", "tightness in chest", "angina", "सीने में दर्द", "ఛాతినొప్పి", "বুকে ব্যথা", "छातीत दुखणे"] },
  { normalized: "breathlessness", terms: ["breathless", "shortness of breath", "breathing difficulty", " सांस", "శ్వాస", "শ্বাসকষ্ট", "धाप", "മൂച്ച"] },
  { normalized: "fever", terms: ["fever", "high temperature", "bukhar", "बुखार", "জ্বর", "ताप", "జ్వరం", "காய்ச்சல்"] },
  { normalized: "headache", terms: ["headache", "migraine", "sir dard", "सिरदर्द", "తలనొప్పి", "தலைவலி", "মাথাব্যথা", "डोकेदुखी"] },
  { normalized: "cough", terms: ["cough", "खांसी", "దగ్గు", "কাশি", "खोकला", "இருமல்"] },
  { normalized: "sore throat", terms: ["sore throat", "throat pain", "गले", "గొంతు", "ঘলা", "घसा", "தொண்டை"] },
  { normalized: "cold", terms: ["cold", "runny nose", "congestion", "जुकाम", "సర్ది", "সর্দি", "सर्दी"] },
  { normalized: "vomiting", terms: ["vomiting", "nausea", "throwing up", "उल्टी", "వాంతి", "বমি", "उलट्या", "வாந்தி"] },
  { normalized: "diarrhea", terms: ["diarrhea", "loose motions", "stomach upset", "दस्त", "విరేచనాలు", "ডায়রিয়া", "जुलाब", "வயிற்றுப்போக்கு"] },
  { normalized: "fatigue", terms: ["fatigue", "tired", "weakness", "थकान", "అలసట", "ক্লান্তি", "थकवा", "சோர்வு"] },
  { normalized: "dizziness", terms: ["dizzy", "giddy", "lightheaded", "चक्कर", "తల తిరగడం", "মাথা ঘোরা", "गरगर", "தலைச்சுற்றல்"] },
  { normalized: "body ache", terms: ["body ache", "body pain", "muscle pain", "body pains", "बदन दर्द", "శరీర నొప్పి", "শরীর ব্যথা", "अंगदुखी", "உடல் வலி"] },
];

const offlinePlanSchema = {
  type: "object",
  properties: {
    route: {
      type: "object",
      properties: {
        clinical_route: { type: "string", enum: ["general-practitioner", "specialist", "emergency"] },
        specialist_referral: { type: "string" },
        reason: { type: "string" },
      },
      required: ["clinical_route", "reason"],
    },
    patient_summary_en: { type: "string" },
    top_actions_en: { type: "array", items: { type: "string" } },
    safety_review: { type: "string" },
    additional_warnings: {
      type: "array",
      items: {
        type: "object",
        properties: {
          type: {
            type: "string",
            enum: ["herb-drug-interaction", "contraindication", "allergy", "cross-modality-conflict", "red-flag", "general"],
          },
          severity: { type: "string", enum: ["info", "moderate", "severe"] },
          message: { type: "string" },
          resolution: { type: "string" },
        },
        required: ["type", "severity", "message"],
      },
    },
    suspected_conditions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          icd10: { type: "string" },
          ayurveda_dosha: { type: "string" },
          likelihood: { type: "string", enum: ["high", "moderate", "low"] },
        },
        required: ["name", "likelihood"],
      },
    },
    modality_recommendations: {
      type: "object",
      properties: {
        Allopathy: { type: "array", items: recommendationSchema() },
        Ayurveda: { type: "array", items: recommendationSchema() },
        Homeopathy: { type: "array", items: recommendationSchema() },
        "Home Remedies": { type: "array", items: recommendationSchema() },
      },
      required: ["Allopathy", "Ayurveda", "Homeopathy", "Home Remedies"],
    },
  },
  required: ["route", "patient_summary_en", "top_actions_en", "safety_review", "additional_warnings", "modality_recommendations"],
} as const;

const offlineInteractionSchema = {
  type: "object",
  properties: {
    resolution_recommendations: { type: "array", items: { type: "string" } },
    clinical_summary: { type: "string" },
  },
  required: ["resolution_recommendations", "clinical_summary"],
} as const;

function recommendationSchema() {
  return {
    type: "object",
    properties: {
      title: { type: "string" },
      detail: { type: "string" },
      evidence_tier: { type: "string", enum: ["A", "B", "T", "Caution"] },
      source: { type: "string" },
      category: {
        type: "string",
        enum: ["assessment", "medication", "supportive", "lifestyle", "traditional", "remedy", "referral"],
      },
      when_to_use: { type: "string" },
      safety_note: { type: "string" },
    },
    required: ["title", "detail", "evidence_tier", "category"],
  };
}

interface EngineOptions {
  useOfflineModel?: boolean;
  offlineSettings?: OfflineModelSettings;
}

interface HybridTriageResult {
  riskLevel: RiskLevel;
  confidence: number;
  triageReasoning: string;
  triggeredRules: string[];
  riskFactors: string[];
  redFlags: string[];
  modelBreakdown: Explainability["triage_model"];
}

interface OfflinePlanEnrichment {
  route: {
    clinical_route: CareRoute;
    specialist_referral?: string;
    reason: string;
  };
  patient_summary_en: string;
  top_actions_en: string[];
  safety_review: string;
  additional_warnings: Warning[];
  suspected_conditions?: SuspectedCondition[];
  modality_recommendations: Record<Modality, Recommendation[]>;
}

type SymptomCluster =
  | "cardiorespiratory"
  | "respiratory"
  | "digestive"
  | "pain-neurologic"
  | "general";

interface PresentationProfile {
  cluster: SymptomCluster;
  durationDays: number;
  symptomNames: string[];
  hasChestPain: boolean;
  hasBreathlessness: boolean;
  hasFever: boolean;
  hasCough: boolean;
  hasSoreThroat: boolean;
  hasCold: boolean;
  hasVomiting: boolean;
  hasDiarrhea: boolean;
  hasHeadache: boolean;
  hasDizziness: boolean;
  hasBodyAche: boolean;
  hasFatigue: boolean;
}

interface AyurvedaProfile {
  dominantDosha: string;
  supportiveDetail: string;
  routineDetail: string;
  safetyCaution: string;
}

function lower(value: string) {
  return value.trim().toLowerCase();
}

function dedupe<T>(items: T[]) {
  return Array.from(new Set(items));
}

function dedupeWarnings(warnings: Warning[]) {
  const seen = new Set<string>();
  return warnings.filter((warning) => {
    const key = `${warning.type}:${warning.severity}:${warning.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function parseList(value?: string) {
  return (value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function toTitleCase(value: string) {
  return value
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function parseDurationToDays(duration: string) {
  const raw = lower(duration);
  if (!raw) return 1;
  if (raw.includes("today")) return 1;
  if (raw.includes("yesterday")) return 2;

  const match = raw.match(/(\d+(?:\.\d+)?)/);
  const amount = match ? Number(match[1]) : 1;

  if (raw.includes("week")) return Math.max(1, Math.round(amount * 7));
  if (raw.includes("month")) return Math.max(1, Math.round(amount * 30));
  if (raw.includes("hour")) return 1;
  return Math.max(1, Math.round(amount));
}

function getSeverity(text: string): SymptomSeverity {
  const raw = lower(text);
  if (/severe|worst|crushing|unable|unbearable|cannot breathe|collapse|heavy bleeding|faint|stroke/.test(raw)) {
    return "severe";
  }
  if (/persistent|worsening|high fever|moderate|dehydrated/.test(raw)) {
    return "moderate";
  }
  return "mild";
}

export function normalizeSymptoms(symptomText: string): SymptomObject[] {
  const raw = lower(symptomText);
  const matches: SymptomObject[] = [];

  for (const pattern of SYMPTOM_PATTERNS) {
    if (pattern.terms.some((term) => raw.includes(lower(term)))) {
      matches.push({
        text: pattern.normalized,
        normalized: pattern.normalized,
        severity: getSeverity(symptomText),
        detected_from: "dictionary",
      });
    }
  }

  if (matches.length > 0) {
    return dedupe(matches.map((item) => item.normalized)).map((normalized) =>
      matches.find((item) => item.normalized === normalized)!,
    );
  }

  return [
    {
      text: symptomText.trim(),
      normalized: "general symptom concern",
      severity: getSeverity(symptomText),
      detected_from: "fallback",
    },
  ];
}

function buildFeatureWeights(intake: IntakeData, normalizedSymptoms: SymptomObject[]) {
  const durationDays = intake.duration_days ?? parseDurationToDays(intake.duration);
  const comorbidities = lower(intake.comorbidities || "");
  const medications = parseList(intake.medications);
  const symptoms = normalizedSymptoms.map((item) => item.normalized);
  const oxygenSaturation = intake.oxygen_saturation ?? 99;
  const temperature = intake.temperature_c ?? 36.9;
  const painScore = intake.pain_score ?? 0;

  return {
    bias: -1.25,
    age_over_35: (intake.age ?? 0) > 35 ? 0.55 : 0,
    age_over_65: (intake.age ?? 0) >= 65 ? 1.2 : 0,
    chest_pain: symptoms.includes("chest pain") ? 2.8 : 0,
    breathlessness: symptoms.includes("breathlessness") ? 2.6 : 0,
    fever: symptoms.includes("fever") ? 0.55 : 0,
    vomiting_or_diarrhea:
      symptoms.includes("vomiting") || symptoms.includes("diarrhea") ? 0.65 : 0,
    severe_symptom: normalizedSymptoms.some((item) => item.severity === "severe") ? 1.7 : 0,
    duration_over_3_days: durationDays >= 4 ? 0.9 : 0,
    low_oxygen: oxygenSaturation <= 93 ? 2.2 : oxygenSaturation <= 95 ? 1.2 : 0,
    high_temperature: temperature >= 39 ? 1.1 : temperature >= 37.8 ? 0.45 : 0,
    high_pain_score: painScore >= 8 ? 1.1 : painScore >= 5 ? 0.35 : 0,
    pregnancy_risk: /pregnan/i.test(intake.pregnancy_status || "") ? 0.65 : 0,
    comorbidity_burden:
      /hypertension|heart disease|asthma|pregnan/.test(comorbidities) ||
      DIABETES_TERMS.some((term) => comorbidities.includes(term))
        ? 0.95
        : 0,
    medication_burden: medications.length >= 2 ? 0.25 : medications.length === 1 ? 0.1 : 0,
    mild_upper_respiratory_cluster:
      symptoms.includes("fever") &&
      (symptoms.includes("cough") || symptoms.includes("sore throat") || symptoms.includes("cold")) &&
      durationDays <= 3 &&
      !normalizedSymptoms.some((item) => item.severity === "severe")
        ? -0.45
        : 0,
  };
}

function sigmoid(value: number) {
  return 1 / (1 + Math.exp(-value));
}

function getGradientBoostingScore(featureWeights: Record<string, number>) {
  let score = 0.08;
  if (featureWeights.chest_pain > 0) score += 0.6;
  if (featureWeights.breathlessness > 0) score += 0.55;
  if (featureWeights.severe_symptom > 0) score += 0.35;
  if (featureWeights.low_oxygen > 0) score += 0.3;
  if (featureWeights.high_temperature > 0) score += 0.1;
  if (featureWeights.high_pain_score > 0) score += 0.08;
  if (featureWeights.age_over_65 > 0) score += 0.12;
  if (featureWeights.duration_over_3_days > 0) score += 0.12;
  if (featureWeights.comorbidity_burden > 0) score += 0.12;
  if (featureWeights.vomiting_or_diarrhea > 0) score += 0.08;
  if (featureWeights.mild_upper_respiratory_cluster < 0) score -= 0.1;
  return Math.max(0.02, Math.min(0.99, Number(score.toFixed(3))));
}

function riskFromProbability(probability: number): RiskLevel {
  if (probability >= 0.8) return "urgent";
  if (probability >= 0.45) return "routine";
  return "self-care";
}

function buildHybridTriaging(intake: IntakeData, normalizedSymptoms: SymptomObject[]): HybridTriageResult {
  const durationDays = intake.duration_days ?? parseDurationToDays(intake.duration);
  const age = intake.age ?? 0;
  const comorbidities = lower(intake.comorbidities || "");
  const symptomText = lower(intake.symptoms);
  const symptoms = normalizedSymptoms.map((item) => item.normalized);
  const oxygenSaturation = intake.oxygen_saturation ?? 99;
  const temperature = intake.temperature_c ?? 36.9;
  const featureWeights = buildFeatureWeights(intake, normalizedSymptoms);
  const logisticZ = Object.values(featureWeights).reduce((sum, weight) => sum + weight, 0);
  const logisticProbability = Number(sigmoid(logisticZ).toFixed(3));
  const gradientBoostingScore = getGradientBoostingScore(featureWeights);
  const ensembleProbability = Number(
    ((logisticProbability * 0.55) + gradientBoostingScore * 0.45).toFixed(3),
  );

  const triggeredRules: string[] = [];
  const riskFactors: string[] = [];
  const redFlags: string[] = [];

  const hasChestPain = symptoms.includes("chest pain");
  const hasBreathlessness = symptoms.includes("breathlessness");
  const hasFever = symptoms.includes("fever");
  const hasVomiting = symptoms.includes("vomiting");
  const hasDiarrhea = symptoms.includes("diarrhea");

  if (hasChestPain && age > 35) {
    triggeredRules.push("R_EMERG_01");
    riskFactors.push("Rule override: chest pain plus age above 35.");
    redFlags.push("persistent chest pain", "pain radiating to jaw or arm", "sweating or collapse");
    return {
      riskLevel: "emergent",
      confidence: 0.98,
      triageReasoning:
        "Hybrid triage escalated to emergent because the rule engine detected chest pain in an adult older than 35. The ML model is used for context, but the safety rule takes precedence.",
      triggeredRules,
      riskFactors,
      redFlags: dedupe(redFlags),
      modelBreakdown: {
        logistic_probability: logisticProbability,
        gradient_boosting_score: gradientBoostingScore,
        ensemble_probability: Math.max(ensembleProbability, 0.92),
        ensemble_confidence: 0.98,
        feature_weights: featureWeights,
      },
    };
  }

  if (
    hasBreathlessness ||
    oxygenSaturation <= 92 ||
    /stroke|slurred speech|one-sided weakness|altered consciousness|unconscious|anaphylaxis|severe bleeding|suicidal/.test(
      symptomText,
    )
  ) {
    triggeredRules.push("R_EMERG_02");
    riskFactors.push("Rule override: respiratory, neurological, or hemorrhagic red flag.");
    redFlags.push("worsening breathlessness", "confusion", "blue lips", "new weakness");
    return {
      riskLevel: "emergent",
      confidence: 0.97,
      triageReasoning:
        "Hybrid triage escalated to emergent because the rules detected a respiratory, neurological, or hemorrhagic red-flag pattern.",
      triggeredRules,
      riskFactors,
      redFlags: dedupe(redFlags),
      modelBreakdown: {
        logistic_probability: logisticProbability,
        gradient_boosting_score: gradientBoostingScore,
        ensemble_probability: Math.max(ensembleProbability, 0.9),
        ensemble_confidence: 0.97,
        feature_weights: featureWeights,
      },
    };
  }

  const mlRisk = riskFromProbability(ensembleProbability);
  let riskLevel = mlRisk;

  if (
    normalizedSymptoms.some((item) => item.severity === "severe") ||
    (hasFever && durationDays >= 4) ||
    temperature >= 39 ||
    ((hasVomiting || hasDiarrhea) && durationDays >= 2) ||
    age >= 65 ||
    /hypertension|asthma|pregnan|heart disease/.test(comorbidities) ||
    DIABETES_TERMS.some((term) => comorbidities.includes(term))
  ) {
    riskLevel = "urgent";
    triggeredRules.push("R_URGENT_01");
  }

  if (
    riskLevel !== "urgent" &&
    (hasFever || symptoms.some((item) => ["headache", "cough", "sore throat", "cold", "body ache"].includes(item))) &&
    durationDays <= 5
  ) {
    riskLevel = "routine";
    triggeredRules.push("R_ROUTINE_01");
  }

  if (riskLevel === "self-care") {
    triggeredRules.push("R_SELFCARE_01");
  }

  if (hasFever) riskFactors.push("Fever present.");
  if (durationDays >= 4) riskFactors.push("Symptoms have persisted for four or more days.");
  if (age >= 65) riskFactors.push("Older age increases the need for clinician review.");
  if (temperature >= 39) riskFactors.push("High temperature increases the chance of clinician-led review.");
  if (oxygenSaturation <= 95) riskFactors.push("Lower oxygen saturation raises respiratory risk.");
  if ((intake.pain_score ?? 0) >= 7) riskFactors.push("High pain score raises the need for urgent evaluation.");
  if (featureWeights.comorbidity_burden > 0) riskFactors.push("Relevant comorbidity increases clinical risk.");
  if (featureWeights.medication_burden > 0) riskFactors.push("Current medicines require interaction-aware planning.");
  if (riskLevel === "urgent") {
    redFlags.push("persistent fever", "dehydration", "worsening breathing difficulty");
  } else if (riskLevel === "routine") {
    redFlags.push("new chest pain", "new breathing difficulty", "fever not improving after 3 to 4 days");
  } else {
    redFlags.push("worsening symptoms", "new chest pain", "new breathing difficulty");
  }

  const agreementBonus =
    (mlRisk === riskLevel ? 0.1 : 0) +
    Math.max(0, 0.08 - Math.abs(logisticProbability - gradientBoostingScore) / 2);
  const confidence = Number(
    Math.min(
      0.95,
      Math.max(
        riskLevel === "self-care" ? 0.72 : riskLevel === "routine" ? 0.78 : 0.84,
        0.72 + agreementBonus,
      ),
    ).toFixed(3),
  );

  return {
    riskLevel,
    confidence,
    triageReasoning:
      riskLevel === "urgent"
        ? "Hybrid triage combines rules and weighted ML scoring. Persistence, symptom severity, age, and comorbidity features pushed this case into urgent review."
        : riskLevel === "routine"
        ? "Hybrid triage found a routine acute symptom cluster without immediate emergency triggers, so structured follow-up with clear escalation is appropriate."
        : "Hybrid triage found a lower-risk presentation suitable for self-care, while still preserving escalation guidance if symptoms worsen.",
    triggeredRules: dedupe(triggeredRules),
    riskFactors: dedupe(riskFactors),
    redFlags: dedupe(redFlags),
    modelBreakdown: {
      logistic_probability: logisticProbability,
      gradient_boosting_score: gradientBoostingScore,
      ensemble_probability: ensembleProbability,
      ensemble_confidence: confidence,
      feature_weights: featureWeights,
    },
  };
}

function buildSuspectedConditions(normalizedSymptoms: SymptomObject[]): SuspectedCondition[] {
  const profile = buildPresentationProfile({ duration: "", symptoms: "" }, normalizedSymptoms);
  const ayurvedaProfile = buildAyurvedaProfile(profile);
  const names = profile.symptomNames;
  const conditions: SuspectedCondition[] = [];

  if (names.includes("fever") && (names.includes("cough") || names.includes("sore throat") || names.includes("cold"))) {
    conditions.push({
      name: "Upper respiratory tract infection pattern",
      icd10: "J06.9",
      ayurveda_dosha: ayurvedaProfile.dominantDosha,
      likelihood: "moderate",
    });
  }

  if (names.includes("vomiting") || names.includes("diarrhea")) {
    conditions.push({
      name: "Acute gastrointestinal irritation pattern",
      icd10: "K52.9",
      ayurveda_dosha: ayurvedaProfile.dominantDosha,
      likelihood: "moderate",
    });
  }

  if (!names.includes("chest pain") && (names.includes("headache") || names.includes("dizziness") || names.includes("fatigue"))) {
    conditions.push({
      name: "Constitutional headache / fatigue pattern",
      icd10: names.includes("headache") ? "R51.9" : "R53.83",
      ayurveda_dosha: ayurvedaProfile.dominantDosha,
      likelihood: "low",
    });
  }

  if (names.includes("chest pain")) {
    conditions.push({
      name: "Cardiopulmonary emergency pattern requiring exclusion",
      icd10: "R07.9",
      likelihood: "high",
    });
  }

  if (conditions.length === 0) {
    conditions.push({
      name: "Non-specific symptomatic presentation",
      likelihood: "low",
    });
  }

  return conditions;
}

function buildPresentationProfile(
  intake: Pick<IntakeData, "duration" | "duration_days" | "symptoms">,
  normalizedSymptoms: SymptomObject[],
): PresentationProfile {
  const symptomNames = normalizedSymptoms.map((item) => item.normalized);
  const profile: PresentationProfile = {
    cluster: "general",
    durationDays: intake.duration_days ?? parseDurationToDays(intake.duration),
    symptomNames,
    hasChestPain: symptomNames.includes("chest pain"),
    hasBreathlessness: symptomNames.includes("breathlessness"),
    hasFever: symptomNames.includes("fever"),
    hasCough: symptomNames.includes("cough"),
    hasSoreThroat: symptomNames.includes("sore throat"),
    hasCold: symptomNames.includes("cold"),
    hasVomiting: symptomNames.includes("vomiting"),
    hasDiarrhea: symptomNames.includes("diarrhea"),
    hasHeadache: symptomNames.includes("headache"),
    hasDizziness: symptomNames.includes("dizziness"),
    hasBodyAche: symptomNames.includes("body ache"),
    hasFatigue: symptomNames.includes("fatigue"),
  };

  if (profile.hasChestPain || profile.hasBreathlessness) {
    profile.cluster = "cardiorespiratory";
  } else if (profile.hasVomiting || profile.hasDiarrhea) {
    profile.cluster = "digestive";
  } else if (profile.hasFever || profile.hasCough || profile.hasSoreThroat || profile.hasCold) {
    profile.cluster = "respiratory";
  } else if (profile.hasHeadache || profile.hasDizziness || profile.hasBodyAche || profile.hasFatigue) {
    profile.cluster = "pain-neurologic";
  }

  return profile;
}

function buildAyurvedaProfile(profile: PresentationProfile): AyurvedaProfile {
  if (profile.cluster === "digestive") {
    return {
      dominantDosha: "Pitta-vata aggravation pattern",
      supportiveDetail:
        "Use clinician-reviewed pitta-vata support such as light warm meals, rice gruel, coriander-cumin-fennel style digestive soothing, and steady oral fluids while avoiding very spicy, oily, or reheated foods.",
      routineDetail:
        "Prefer smaller meals, gentle hydration, and early rest until appetite and bowel pattern stabilize.",
      safetyCaution:
        "Avoid strong heating herbs, heavy oils, and multi-herb combinations when dehydration, pregnancy, or medicine interactions are possible.",
    };
  }

  if (profile.cluster === "respiratory") {
    return {
      dominantDosha: "Kapha-vata imbalance pattern",
      supportiveDetail:
        "Use clinician-reviewed kapha-vata support such as warm water, light soups, saline steam if tolerated, and gentle throat-soothing measures instead of heavy, cold, or mucus-forming foods.",
      routineDetail:
        "Favor warm meals, lighter dairy intake, voice rest, and a regular sleep schedule while congestion and throat irritation settle.",
      safetyCaution:
        "Avoid stacking warming herbs when hypertension, anticoagulants, pregnancy, or persistent fever need medical review.",
    };
  }

  if (profile.cluster === "pain-neurologic") {
    return {
      dominantDosha: "Vata-pitta aggravation pattern",
      supportiveDetail:
        "Use clinician-reviewed vata-pitta support such as regular meals, gentle hydration, sleep restoration, and calming routines rather than prolonged fasting or overstimulation.",
      routineDetail:
        "Reduce screen strain, keep mealtimes regular, and consider gentle relaxation or breathing practices once acute causes are excluded.",
      safetyCaution:
        "Do not rely on traditional support alone when headache is new, severe, recurrent, or associated with dizziness, vomiting, or blood-pressure concerns.",
    };
  }

  return {
    dominantDosha: "Vata-kapha support pattern",
    supportiveDetail:
      "Use clinician-reviewed vata-kapha supportive care with warm fluids, gentle meals, structured rest, and symptom tracking.",
    routineDetail:
      "Keep hydration, sleep, and mealtimes steady while monitoring for escalation.",
    safetyCaution:
      "Adjunct traditional care should remain secondary to clinician review whenever symptoms intensify or medicines change.",
  };
}

function chooseSelectedModalities(
  riskLevel: RiskLevel,
  normalizedSymptoms: SymptomObject[],
  intake: IntakeData,
) {
  if (riskLevel === "emergent") return ["Allopathy"] as Modality[];

  const profile = buildPresentationProfile(intake, normalizedSymptoms);
  const selected: Modality[] = ["Allopathy"];

  const addIfPossible = (modality: Modality) => {
    if (!selected.includes(modality) && selected.length < 2) {
      selected.push(modality);
    }
  };

  if (profile.cluster === "digestive" && riskLevel !== "urgent") {
    addIfPossible("Ayurveda");
  } else if (profile.cluster === "respiratory") {
    addIfPossible("Home Remedies");
  } else if (profile.cluster === "pain-neurologic" && profile.durationDays >= 5) {
    addIfPossible("Homeopathy");
  } else if (riskLevel === "routine") {
    addIfPossible("Ayurveda");
  } else if (riskLevel === "self-care") {
    addIfPossible("Home Remedies");
  }

  return selected;
}

function determineClinicalRoute(
  riskLevel: RiskLevel,
  normalizedSymptoms: SymptomObject[],
  intake: IntakeData,
): { route: CareRoute; specialist?: string; reason: string } {
  const profile = buildPresentationProfile(intake, normalizedSymptoms);
  const symptoms = profile.symptomNames;
  const comorbidities = lower(intake.comorbidities || "");

  if (riskLevel === "emergent") {
    return {
      route: "emergency",
      specialist: symptoms.includes("chest pain") || symptoms.includes("breathlessness")
        ? "Emergency medicine / cardiology"
        : "Emergency medicine",
      reason: "Emergency rules override all other routing decisions.",
    };
  }

  if (profile.cluster === "cardiorespiratory") {
    return {
      route: "specialist",
      specialist: "Internal medicine or pulmonology",
      reason: "Chest or respiratory symptoms require clinician-led escalation even outside emergency thresholds.",
    };
  }

  if (/pregnan|heart disease/.test(comorbidities)) {
    return {
      route: "specialist",
      specialist: "Relevant specialty review",
      reason: "Comorbidity profile justifies specialist supervision for integrated treatment.",
    };
  }

  if (profile.cluster === "digestive" && (riskLevel === "urgent" || profile.durationDays >= 5)) {
    return {
      route: "specialist",
      specialist: "General medicine or gastroenterology",
      reason: "Digestive symptoms with persistence or higher-risk features need dehydration and medication-safety review.",
    };
  }

  if (profile.cluster === "pain-neurologic" && (profile.durationDays >= 7 || profile.hasDizziness)) {
    return {
      route: "specialist",
      specialist: "General medicine or neurology",
      reason: "Persistent headache, dizziness, or fatigue patterns need clinician-led review to exclude secondary causes.",
    };
  }

  return {
    route: "general-practitioner",
    reason:
      riskLevel === "urgent"
        ? profile.cluster === "digestive"
          ? "Urgent digestive symptoms should be reviewed within 24 hours to assess hydration, triggers, and medicine safety."
          : profile.cluster === "respiratory"
            ? "Urgent respiratory symptoms should be reviewed within 24 hours to assess fever trend, breathing status, and escalation triggers."
            : "Urgent but non-emergency cases should be reviewed by a clinician or GP within 24 hours."
        : profile.cluster === "respiratory"
          ? "Mild respiratory symptom clusters can begin with GP-led evaluation plus supportive care and red-flag monitoring."
          : profile.cluster === "digestive"
            ? "Digestive complaints can begin with GP-led evaluation focused on hydration, bowel pattern, and food or medicine triggers."
            : profile.cluster === "pain-neurologic"
              ? "Headache or fatigue patterns can begin with GP-led assessment of triggers, sleep, hydration, and blood-pressure review."
              : "Routine and self-care cases can begin with structured GP guidance and escalation rules.",
  };
}

function buildCarePath(
  routeDecision: { route: CareRoute; specialist?: string; reason: string },
  selectedModalities: Modality[],
  riskLevel: RiskLevel,
  intake: IntakeData,
  normalizedSymptoms: SymptomObject[],
): CarePathStep[] {
  const profile = buildPresentationProfile(intake, normalizedSymptoms);
  const ayurvedaProfile = buildAyurvedaProfile(profile);

  const buildSelectedReason = (modality: Modality) => {
    if (modality === "Allopathy") {
      if (profile.cluster === "digestive") {
        return "Lead with clinician-guided digestive assessment to review hydration, stool or vomiting frequency, and medication-safe symptom relief.";
      }
      if (profile.cluster === "respiratory") {
        return "Lead with GP or clinician respiratory review to confirm the infection pattern, check fever trend, and screen for worsening breathing symptoms.";
      }
      if (profile.cluster === "pain-neurologic") {
        return "Lead with clinician assessment of headache, dizziness, fatigue, hydration, and blood-pressure triggers before adding adjunct therapies.";
      }
      return routeDecision.reason;
    }

    if (modality === "Ayurveda") {
      return `Optional dosha-aligned support for ${ayurvedaProfile.dominantDosha.toLowerCase()} after medication review and contraindication screening.`;
    }

    if (modality === "Homeopathy") {
      return "Optional clinician-reviewed symptom-matching remedy path for persistent mild symptoms after the lead medical plan is established.";
    }

    if (profile.cluster === "digestive") {
      return "Use simple household support such as oral fluids, bland meals, and rest while monitoring hydration and escalation triggers.";
    }

    if (profile.cluster === "respiratory") {
      return "Use simple household support such as warm fluids, saline gargles, steam if tolerated, and rest while monitoring for red flags.";
    }

    return "Use simple household support such as hydration, rest, and symptom logging while watching for escalation.";
  };

  return MODALITIES.map((modality, index) => {
    const selected = selectedModalities.includes(modality);
    const priority: PlanPriority = selected
      ? index === 0 || modality === selectedModalities[0]
        ? "primary"
        : "complementary"
      : "optional";

    return {
      modality,
      priority,
      selected,
      route: selected ? routeDecision.route : "general-practitioner",
      specialist: selected && routeDecision.route !== "general-practitioner" ? routeDecision.specialist : undefined,
      reason: selected
        ? buildSelectedReason(modality)
        : "Displayed as an optional treatment pathway for clinician comparison, not as part of the default active care path.",
    };
  });
}

function createRecommendation(
  title: string,
  detail: string,
  evidence_tier: EvidenceTier,
  source: string,
  category: RecommendationCategory,
  extras: Partial<Recommendation> = {},
): Recommendation {
  return {
    title,
    detail,
    evidence_tier,
    source,
    category,
    ...extras,
  };
}

function buildRecommendationsForModality(
  modality: Modality,
  step: CarePathStep,
  normalizedSymptoms: SymptomObject[],
  riskLevel: RiskLevel,
  intake: IntakeData,
): Recommendation[] {
  const profile = buildPresentationProfile(intake, normalizedSymptoms);
  const ayurvedaProfile = buildAyurvedaProfile(profile);
  const symptoms = profile.symptomNames;
  const respiratory = profile.cluster === "respiratory";
  const digestive = profile.cluster === "digestive";
  const painNeurologic = profile.cluster === "pain-neurologic";

  if (modality === "Allopathy") {
    const items = [
      createRecommendation(
        "Clinical assessment",
        riskLevel === "emergent"
          ? "Move directly to emergency evaluation. Do not delay emergency assessment with adjunct therapies."
          : step.route === "specialist"
          ? `Prioritize clinician-led review and consider ${step.specialist || "specialist"} involvement based on symptoms.`
          : "Begin with GP-led assessment to confirm the working diagnosis and review comorbidities, current medicines, and hydration status.",
        riskLevel === "emergent" ? "A" : "B",
        riskLevel === "emergent"
          ? "WHO emergency triage guidance"
          : "ICMR fever and respiratory symptom protocol",
        "assessment",
      ),
      createRecommendation(
        "Evidence-first symptom treatment",
        digestive
          ? "Use oral rehydration, light meals, and clinician-approved symptom relief while monitoring for worsening dehydration."
          : respiratory
          ? "Use supportive symptom treatment such as hydration, rest, and clinician-approved fever or pain relief as needed."
          : painNeurologic
          ? "Use clinician-approved relief while reviewing hydration, sleep, blood pressure, and trigger control."
          : "Use guideline-based supportive therapy that matches the final clinician diagnosis.",
        "B",
        respiratory || digestive
          ? "ICMR fever and respiratory symptom protocol"
          : "WHO self-care support measures",
        "supportive",
        {
          when_to_use: riskLevel === "urgent" ? "Use while arranging clinical review." : "Use as the lead treatment pathway.",
        },
      ),
      createRecommendation(
        "Escalation boundary",
        "Escalate immediately if red flags appear, symptoms intensify, or oral intake becomes difficult.",
        "A",
        "WHO emergency triage guidance",
        "referral",
      ),
    ];

    if (step.selected) {
      return items;
    }

    return [
      createRecommendation(
        "Not in active default path",
        "Allopathy remains available as an alternative pathway and should be prioritized if symptoms worsen or a clinician wants tighter medical supervision.",
        "B",
        "ICMR fever and respiratory symptom protocol",
        "assessment",
      ),
      ...items.slice(1, 2),
    ];
  }

  if (modality === "Ayurveda") {
    return [
      createRecommendation(
        `${ayurvedaProfile.dominantDosha} support`,
        ayurvedaProfile.supportiveDetail,
        "T",
        digestive ? "AYUSH digestive support guidance" : "AYUSH supportive respiratory care guidance",
        "traditional",
        {
          when_to_use: step.selected ? "Optional adjunct in the active care path." : "Optional pathway only after clinician review.",
          safety_note: ayurvedaProfile.safetyCaution,
        },
      ),
      createRecommendation(
        "Ayurvedic routine guidance",
        ayurvedaProfile.routineDetail,
        "T",
        digestive ? "AYUSH digestive support guidance" : "AYUSH supportive respiratory care guidance",
        "lifestyle",
      ),
      createRecommendation(
        "Complementary-only position",
        "Ayurveda should complement, not replace, acute medical evaluation for chest pain, breathlessness, dehydration, or persistent fever.",
        "Caution",
        "Integrative medicine herb-drug safety note",
        "referral",
      ),
      createRecommendation(
        "Contraindication screen",
        "Screen for hypertension, anticoagulants, pregnancy, and allergies before introducing herbs or classical preparations.",
        "B",
        "Integrative medicine herb-drug safety note",
        "assessment",
      ),
    ];
  }

  if (modality === "Homeopathy") {
    return [
      createRecommendation(
        "Optional supportive remedy path",
        "Homeopathic remedies should be surfaced only as clinician-reviewed optional support and never as a substitute for needed acute care.",
        "T",
        "Homeopathy complementary-use caution",
        "remedy",
        {
          when_to_use: step.selected ? "Optional adjunct after the lead modality is established." : "Optional comparison path only.",
        },
      ),
      createRecommendation(
        "Avoid parallel remedy stacking",
        "Keep the regimen simple and avoid starting multiple remedies together when the symptom trajectory is still evolving.",
        "Caution",
        "Integrative medicine herb-drug safety note",
        "assessment",
      ),
    ];
  }

  return [
    createRecommendation(
      "Household support",
      respiratory
        ? "Use saline gargles, warm fluids, rest, and steam inhalation if tolerated for short-term upper respiratory relief."
        : digestive
        ? "Use oral fluids, bland meals, and rest while monitoring hydration and stool or vomiting frequency."
        : "Use simple non-pharmacologic support such as hydration, rest, and symptom logging.",
      "B",
      respiratory || digestive
        ? "Evidence-backed household remedies for mild upper respiratory symptoms"
        : "WHO self-care support measures",
      "supportive",
      {
        when_to_use: step.selected ? "Can be used immediately as part of the active plan." : "Optional support once safety checks are clear.",
      },
    ),
    createRecommendation(
      "Safety limits",
      "Avoid allergenic ingredients such as honey when allergies exist, and avoid mixing home remedies with new supplements until the medicine list is reviewed.",
      "B",
      "Integrative medicine herb-drug safety note",
      "assessment",
    ),
  ];
}

function buildBasePlanSegments(
  carePathSteps: CarePathStep[],
  normalizedSymptoms: SymptomObject[],
  riskLevel: RiskLevel,
  intake: IntakeData,
) {
  return carePathSteps.map<PlanSegment>((step) => ({
    modality: step.modality,
    priority: step.priority,
    selected: step.selected,
    recommendations: buildRecommendationsForModality(
      step.modality,
      step,
      normalizedSymptoms,
      riskLevel,
      intake,
    ),
  }));
}

function evaluateSafety(
  intake: IntakeData,
  carePathSteps: CarePathStep[],
  baseSegments: PlanSegment[],
) {
  const warnings: Warning[] = [];
  const triggeredRules: string[] = [];
  const safetyChecks: string[] = [
    "Medication list reviewed.",
    "Comorbidities reviewed.",
    "Modality selection capped at two active pathways.",
  ];

  const medications = parseList(intake.medications).map(lower);
  const comorbidities = parseList(intake.comorbidities).map(lower);
  const allergies = parseList(intake.allergies).map(lower);

  const activeModalities = carePathSteps.filter((step) => step.selected).map((step) => step.modality);
  if (activeModalities.length > 1) {
    warnings.push({
      type: "cross-modality-conflict",
      severity: "info",
      message: "Only two active modalities are allowed by default; the remaining treatment paths are shown as optional reference pathways.",
      resolution: "Keep one lead modality and one adjunct until a clinician explicitly overrides the plan.",
    });
  }

  if (medications.some((med) => SSRI_TERMS.some((term) => med.includes(term)))) {
    warnings.push({
      type: "herb-drug-interaction",
      severity: "moderate",
      message:
        "If St. John's Wort or similar serotonergic supplements are being considered, avoid them with SSRI antidepressants.",
      resolution: "Do not combine serotonergic herbs with SSRI therapy without psychiatrist or prescriber approval.",
    });
    triggeredRules.push("R_HERB_DRUG_01");
    safetyChecks.push("SSRI interaction screen applied.");
  }

  if (
    comorbidities.some((item) => HYPERTENSION_TERMS.some((term) => item.includes(term))) &&
    baseSegments.some((segment) => segment.modality === "Ayurveda")
  ) {
    warnings.push({
      type: "contraindication",
      severity: "moderate",
      message:
        "Hypertension is present, so warming herbs such as concentrated ginger, clove, or licorice require caution.",
      resolution: "Prefer neutral supportive measures and clinician-reviewed formulations instead of strong warming herb combinations.",
    });
    triggeredRules.push("R_AYURV_CONTRA_01");
    safetyChecks.push("Hypertension versus warming-herb rule applied.");
  }

  if (medications.some((med) => ANTICOAGULANT_TERMS.some((term) => med.includes(term)))) {
    warnings.push({
      type: "herb-drug-interaction",
      severity: "severe",
      message:
        "Blood-thinner therapy can interact with turmeric, ginkgo, garlic concentrates, or similar supplements.",
      resolution: "Avoid adding herb or supplement combinations until the prescribing clinician approves them.",
    });
    safetyChecks.push("Anticoagulant interaction screen applied.");
  }

  if (allergies.some((item) => item.includes("honey")) && baseSegments.some((segment) => segment.modality === "Home Remedies")) {
    warnings.push({
      type: "allergy",
      severity: "moderate",
      message: "Honey allergy was reported, so honey-based home remedies should be avoided.",
      resolution: "Use non-honey alternatives such as saline gargles, warm water, or other non-allergenic household support.",
    });
    safetyChecks.push("Allergy screen applied to home remedies.");
  }

  return {
    warnings: dedupeWarnings(warnings),
    triggeredRules,
    safetyChecks,
  };
}

function localizeText(text: string, langCode: string) {
  if (langCode === "en") return { text, glossaryHits: [] as string[] };

  let localized = text;
  const glossaryHits: string[] = [];
  const sortedPhrases = Object.keys(PHRASE_TRANSLATIONS).sort((left, right) => right.length - left.length);

  for (const phrase of sortedPhrases) {
    const translated = PHRASE_TRANSLATIONS[phrase]?.[langCode as keyof (typeof PHRASE_TRANSLATIONS)[string]];
    if (translated && localized.includes(phrase)) {
      localized = localized.replaceAll(phrase, translated);
    }
  }

  for (const [english, translations] of Object.entries(GLOSSARY)) {
    const translated = translations[langCode as keyof typeof translations];
    if (!translated) continue;
    const regex = new RegExp(english.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    if (regex.test(localized)) {
      localized = localized.replace(regex, translated);
      glossaryHits.push(english);
    }
  }

  return { text: localized, glossaryHits: dedupe(glossaryHits) };
}

function buildTranslationBundle(
  langCode: string,
  englishSummary: string,
  englishCarePath: string,
  topActions: string[],
  quality_mode: TranslationSummary["quality_mode"],
): TranslationSummary {
  const localizedSummary = localizeText(englishSummary, langCode);
  const localizedCarePath = localizeText(englishCarePath, langCode);
  const localizedActions = topActions.map((action) => localizeText(action, langCode));

  return {
    language: getLanguageNative(langCode),
    summary: localizedSummary.text,
    care_path: localizedCarePath.text,
    top_actions: localizedActions.map((action) => action.text),
    glossary_hits: dedupe([
      ...localizedSummary.glossaryHits,
      ...localizedCarePath.glossaryHits,
      ...localizedActions.flatMap((action) => action.glossaryHits),
    ]),
    quality_mode,
    back_translation_confidence: null,
  };
}

function computeBackTranslationConfidence(
  translation: TranslationSummary,
  languageCode: string,
  usedOfflineModel: boolean,
) {
  if (languageCode === "en") return 1;
  const glossaryScore = Math.min(translation.glossary_hits.length / 6, 0.05);
  const llmBonus = usedOfflineModel ? 0.02 : 0;
  return Number((0.9 + glossaryScore + llmBonus).toFixed(2));
}

function mergeRecommendations(base: Recommendation[], extra: Recommendation[]) {
  const merged = [...base];
  const seen = new Set(base.map((item) => `${item.title}:${item.detail}`));

  for (const item of extra) {
    const key = `${item.title}:${item.detail}`;
    if (!seen.has(key)) {
      merged.push(item);
      seen.add(key);
    }
  }

  return merged.slice(0, 6);
}

function buildEnglishSummary(input: {
  riskLevel: RiskLevel;
  clinicalRoute: CareRoute;
  specialistReferral?: string;
  carePathSteps: CarePathStep[];
  topActions: string[];
  redFlags: string[];
  summaryOverride?: string;
}) {
  if (input.summaryOverride?.trim()) {
    return input.summaryOverride.trim();
  }

  return [
    `Risk level: ${toTitleCase(input.riskLevel)}.`,
    `Primary route: ${input.clinicalRoute === "general-practitioner" ? "General practitioner" : toTitleCase(input.clinicalRoute)}${input.specialistReferral ? ` (${input.specialistReferral})` : ""}.`,
    `Recommended care path: ${input.carePathSteps
      .filter((step) => step.selected)
      .map((step) => `${step.modality} (${step.priority})`)
      .join(" -> ")}.`,
    input.riskLevel === "emergent"
      ? "Seek emergency care immediately."
      : input.riskLevel === "urgent"
      ? "Arrange clinician review within 24 hours."
      : input.riskLevel === "routine"
      ? "Schedule a routine consultation and continue supportive care."
      : "Maintain hydration and rest.",
    "Use complementary modalities only as optional support.",
    input.topActions.length > 0 ? `Top actions: ${input.topActions.join(" ")}` : "",
    input.redFlags.length > 0 ? `Monitor for red flags such as ${input.redFlags.join(", ")}.` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

function buildTranslations(
  intake: IntakeData,
  carePathSteps: CarePathStep[],
  riskLevel: RiskLevel,
  summaryOverride: string | undefined,
  topActionsOverride: string[],
  redFlags: string[],
  clinicalRoute: CareRoute,
  specialistReferral: string | undefined,
  usedOfflineModel: boolean,
) {
  const topActions = topActionsOverride.length > 0
    ? topActionsOverride
    : carePathSteps
        .filter((step) => step.selected)
        .map((step) => `${step.modality}: ${step.reason}`)
        .slice(0, 4);

  const englishSummary = buildEnglishSummary({
    riskLevel,
    clinicalRoute,
    specialistReferral,
    carePathSteps,
    topActions,
    redFlags,
    summaryOverride,
  });

  const englishCarePath = carePathSteps
    .filter((step) => step.selected)
    .map((step) => `${step.modality}: ${step.reason}`)
    .join(" ");

  const qualityMode: TranslationSummary["quality_mode"] = usedOfflineModel ? "offline-llm" : "glossary";
  const translations = Object.fromEntries(
    LANGUAGES.map((language) => [
      language.code,
      buildTranslationBundle(language.code, englishSummary, englishCarePath, topActions, qualityMode),
    ]),
  ) as Record<string, TranslationSummary>;

  const preferredCode = intake.language_code || "en";
  const translation = translations[preferredCode] ?? translations.en;
  const bt = computeBackTranslationConfidence(translation, preferredCode, usedOfflineModel);

  return {
    translation: { ...translation, back_translation_confidence: bt },
    translations: Object.fromEntries(
      Object.entries(translations).map(([code, summary]) => [
        code,
        {
          ...summary,
          back_translation_confidence: computeBackTranslationConfidence(summary, code, usedOfflineModel),
        },
      ]),
    ) as Record<string, TranslationSummary>,
    backTranslationConfidence: bt,
  };
}

function buildSafetyReviewSummary(warnings: Warning[]) {
  if (warnings.length === 0) {
    return "Safety Review Agent found no immediate high-risk conflicts beyond the standard conservative modality cap and medication review checks.";
  }

  return warnings
    .map((warning) =>
      warning.resolution
        ? `${warning.message} Resolution: ${warning.resolution}`
        : warning.message,
    )
    .join(" ");
}

function aggregateProvenance(
  baseSegments: PlanSegment[],
  warnings: Warning[],
  evidenceTrace: ReturnType<typeof retrieveEvidence>,
) {
  const recommendationSources = baseSegments.flatMap((segment) =>
    segment.recommendations
      .filter((recommendation) => recommendation.source)
      .map((recommendation) => {
        const evidence = evidenceTrace.find((item) => item.title === recommendation.source);
        return evidence
          ? evidence
          : {
              id: recommendation.source?.toLowerCase().replace(/[^a-z0-9]+/g, "_") || "source",
              title: recommendation.source || "Source",
              citation: recommendation.source || "Source",
              reliability_tier: recommendation.evidence_tier,
              modality: segment.modality,
            };
      }),
  );

  const warningSources = warnings.length > 0
    ? evidenceTrace.filter((snippet) => snippet.tags.includes("safety") || snippet.tags.includes("interaction"))
    : [];

  return dedupeProvenance([...evidenceTrace, ...recommendationSources, ...warningSources]);
}

function buildLlmMetadata(status: Awaited<ReturnType<typeof getOfflineModelStatus>> | null, lastError?: string | null): LlmGenerationMetadata {
  if (!status) {
    return {
      provider: "deterministic",
      enabled: false,
      available: false,
      last_error: lastError || null,
    };
  }

  return {
    provider: status.available ? "ollama" : "deterministic",
    enabled: status.enabled,
    available: status.available,
    model: status.model,
    base_url: status.baseUrl,
    last_error: lastError || status.lastError || null,
  };
}

async function enrichPlanWithOfflineModel(input: {
  intake: IntakeData;
  basePlan: IntegrativePlan;
  evidenceTrace: ReturnType<typeof retrieveEvidence>;
  settings: OfflineModelSettings;
}) {
  const systemPrompt = [
    "You are an offline clinical decision-support synthesis agent running locally.",
    "You must stay conservative and safety-first.",
    "Never weaken emergency, interaction, or contraindication warnings already identified by the deterministic system.",
    "Do not invent diagnoses with certainty. Do not prescribe exact dosages.",
    "Use allopathy as the lead for acute or urgent presentations and keep complementary modalities optional.",
    "Return valid JSON matching the schema only.",
  ].join(" ");

  const userPrompt = [
    `PATIENT LANGUAGE: ${input.intake.language} (${input.intake.language_code || "en"})`,
    `AGE: ${input.intake.age ?? "unknown"} SEX: ${input.intake.sex ?? "unknown"}`,
    `PATIENT NAME: ${input.intake.patient_name || "unknown"}`,
    `EMAIL: ${input.intake.email || "unknown"} PHONE: ${input.intake.phone || "unknown"}`,
    `SYMPTOMS: ${input.intake.symptoms}`,
    `DURATION: ${input.intake.duration}`,
    `SYMPTOM SEVERITY: ${input.intake.symptom_severity || "unknown"} PAIN SCORE: ${input.intake.pain_score ?? "unknown"}`,
    `VITALS: temp ${input.intake.temperature_c ?? "unknown"}C, BP ${input.intake.blood_pressure || "unknown"}, SpO2 ${input.intake.oxygen_saturation ?? "unknown"}%, height ${input.intake.height_cm ?? "unknown"}cm, weight ${input.intake.weight_kg ?? "unknown"}kg`,
    `PREGNANCY STATUS: ${input.intake.pregnancy_status || "unknown"}`,
    `COMORBIDITIES: ${input.intake.comorbidities || "none"}`,
    `MEDICATIONS: ${input.intake.medications || "none"}`,
    `ALLERGIES: ${input.intake.allergies || "none"}`,
    `PAST SURGERIES: ${input.intake.past_surgeries || "none"}`,
    `FAMILY HISTORY: ${input.intake.family_history || "none"}`,
    `LIFESTYLE: smoking ${input.intake.smoking_status || "unknown"}, alcohol ${input.intake.alcohol_use || "unknown"}, sleep ${input.intake.sleep_quality || "unknown"}, appetite ${input.intake.appetite_status || "unknown"}`,
    `RECENT EXPOSURE: ${input.intake.recent_exposure || "none"}`,
    `BASE RISK: ${input.basePlan.risk_level}`,
    `BASE ROUTE: ${input.basePlan.clinical_route}${input.basePlan.specialist_referral ? ` (${input.basePlan.specialist_referral})` : ""}`,
    `ACTIVE CARE PATH: ${input.basePlan.care_path_steps.filter((step) => step.selected).map((step) => `${step.modality} (${step.priority})`).join(", ")}`,
    `NORMALIZED SYMPTOMS: ${input.basePlan.normalized_symptoms?.map((symptom) => `${symptom.normalized}:${symptom.severity}`).join(", ") || "none"}`,
    `BASE WARNINGS: ${input.basePlan.warnings.map((warning) => `${warning.severity}:${warning.message}`).join(" | ") || "none"}`,
    `RETRIEVED EVIDENCE:\n${input.evidenceTrace.map((item) => `- ${item.title} [${item.reliability_tier}] ${item.summary}`).join("\n")}`,
    "TASK:",
    "1. Suggest conservative route refinement (GP, specialist, or emergency).",
    "2. Expand treatment options for all four modalities so the UI can show every available treatment path, but keep complementary modalities explicitly optional.",
    "3. For Ayurveda, include dosha-aligned support when the symptom pattern suggests one.",
    "4. Add only safe warnings or resolutions that do not contradict the existing deterministic warnings.",
    "5. Write a patient-friendly English summary and top actions.",
    "6. Keep recommendations modality-specific, non-prescriptive, and short.",
  ].join("\n");

  const { output, status } = await generateStructuredOffline<OfflinePlanEnrichment>({
    settings: input.settings,
    systemPrompt,
    userPrompt,
    schema: offlinePlanSchema,
  });

  return { output, status };
}

function mergePlanWithOfflineEnrichment(
  basePlan: IntegrativePlan,
  enrichment: OfflinePlanEnrichment,
  metadata: LlmGenerationMetadata,
  intake: IntakeData,
) {
  const specialistReferral =
    basePlan.clinical_route === "emergency"
      ? basePlan.specialist_referral
      : enrichment.route.specialist_referral || basePlan.specialist_referral;
  const clinicalRoute: CareRoute =
    basePlan.clinical_route === "emergency"
      ? "emergency"
      : enrichment.route.clinical_route === "emergency"
      ? "specialist"
      : enrichment.route.clinical_route;

  const carePathSteps = basePlan.care_path_steps.map((step) =>
    step.selected
      ? {
          ...step,
          route: clinicalRoute,
          specialist: specialistReferral,
          reason: step.reason,
        }
      : step,
  );

  const planSegments = basePlan.plan_segments.map((segment) => ({
    ...segment,
    recommendations: mergeRecommendations(
      segment.recommendations,
      enrichment.modality_recommendations[segment.modality] || [],
    ),
  }));

  const warnings = dedupeWarnings([...basePlan.warnings, ...enrichment.additional_warnings]);
  const topActions = enrichment.top_actions_en.length > 0
    ? enrichment.top_actions_en
    : basePlan.translation.top_actions;
  const translations = buildTranslations(
    intake,
    carePathSteps,
    basePlan.risk_level,
    enrichment.patient_summary_en,
    topActions,
    basePlan.red_flags_to_watch || [],
    clinicalRoute,
    specialistReferral,
    true,
  );

  return {
    ...basePlan,
    care_path_steps: carePathSteps,
    care_path: carePathSteps.filter((step) => step.selected).map((step) => step.modality).join(" -> "),
    clinical_route: clinicalRoute,
    specialist_referral: specialistReferral,
    plan_segments: planSegments,
    warnings,
    safety_review: enrichment.safety_review || basePlan.safety_review,
    suspected_conditions:
      enrichment.suspected_conditions && enrichment.suspected_conditions.length > 0
        ? enrichment.suspected_conditions
        : basePlan.suspected_conditions,
    translation: translations.translation,
    translations: translations.translations,
    back_translation_confidence: translations.backTranslationConfidence,
    explainability: {
      ...basePlan.explainability,
      llm_mode: `offline-ollama:${metadata.model}`,
      workflow_trace: basePlan.explainability.workflow_trace.map((step, index) =>
        index === 7 ? "Translation Agent (glossary + offline LLM summary)" : step,
      ),
    },
    llm_metadata: metadata,
  } satisfies IntegrativePlan;
}

export async function generateIntegrativePlan(
  intake: IntakeData,
  options: EngineOptions = {},
): Promise<IntegrativePlan> {
  const normalizedSymptoms = normalizeSymptoms(intake.symptoms);
  const triage = buildHybridTriaging(
    {
      ...intake,
      duration_days: intake.duration_days ?? parseDurationToDays(intake.duration),
    },
    normalizedSymptoms,
  );

  const selectedModalities = chooseSelectedModalities(
    triage.riskLevel,
    normalizedSymptoms,
    intake,
  );
  const routeDecision = determineClinicalRoute(triage.riskLevel, normalizedSymptoms, intake);
  const carePathSteps = buildCarePath(routeDecision, selectedModalities, triage.riskLevel, intake, normalizedSymptoms);
  const planSegments = buildBasePlanSegments(carePathSteps, normalizedSymptoms, triage.riskLevel, intake);
  const safety = evaluateSafety(intake, carePathSteps, planSegments);
  const evidenceTrace = retrieveEvidence({
    normalizedSymptoms,
    riskLevel: triage.riskLevel,
    preferredModalities: selectedModalities,
  });
  const topActions = planSegments
    .filter((segment) => segment.selected)
    .flatMap((segment) => segment.recommendations.slice(0, 2).map((recommendation) => recommendation.detail))
    .slice(0, 4);
  const translations = buildTranslations(
    intake,
    carePathSteps,
    triage.riskLevel,
    undefined,
    topActions,
    triage.redFlags,
    routeDecision.route,
    routeDecision.specialist,
    false,
  );

  const basePlan: IntegrativePlan = {
    risk_level: triage.riskLevel,
    confidence: triage.confidence,
    triage_reasoning: triage.triageReasoning,
    care_path: carePathSteps.filter((step) => step.selected).map((step) => step.modality).join(" -> "),
    clinical_route: routeDecision.route,
    specialist_referral: routeDecision.specialist,
    care_path_steps: carePathSteps,
    suspected_conditions: buildSuspectedConditions(normalizedSymptoms),
    plan_segments: planSegments,
    warnings: safety.warnings,
    provenance: aggregateProvenance(planSegments, safety.warnings, evidenceTrace),
    red_flags_to_watch: triage.redFlags,
    safety_review: buildSafetyReviewSummary(safety.warnings),
    translation: translations.translation,
    translations: translations.translations,
    explainability: {
      triggered_rules: dedupe([...triage.triggeredRules, ...safety.triggeredRules]),
      risk_factors: triage.riskFactors,
      modality_selection_rationale: carePathSteps.map((step) =>
        step.selected
          ? `${step.modality} is active because ${step.reason.toLowerCase()}`
          : `${step.modality} is shown as an optional pathway for clinician comparison only.`,
      ),
      normalized_symptoms: normalizedSymptoms,
      safety_checks: safety.safetyChecks,
      triage_model: triage.modelBreakdown,
      evidence_trace: evidenceTrace.map((source) => `${source.title} [${source.reliability_tier}]`),
      workflow_trace: [
        "Intake",
        "Normalization Agent",
        "Hybrid Triage Agent",
        "Care Orchestrator",
        "Specialist Agents",
        "Safety Review Agent",
        "Recommendation Synthesizer",
        "Translation Agent",
        "Feedback / Audit",
      ],
      llm_mode: "deterministic-rules",
    },
    disclaimer:
      "Sanjeevani is a clinical decision-support prototype. It does not diagnose disease and cannot replace a licensed clinician or emergency services.",
    back_translation_confidence: translations.backTranslationConfidence,
    normalized_symptoms: normalizedSymptoms,
    llm_metadata: {
      provider: "deterministic",
      enabled: false,
      available: false,
      last_error: null,
    },
  };

  const useOfflineModel = options.useOfflineModel ?? true;
  if (!useOfflineModel) {
    return basePlan;
  }

  const settings = options.offlineSettings ?? getOfflineModelSettings() ?? DEFAULT_OFFLINE_MODEL_SETTINGS;
  if (!settings.enabled) {
    return {
      ...basePlan,
      llm_metadata: {
        provider: "deterministic",
        enabled: false,
        available: false,
        model: settings.model,
        base_url: settings.baseUrl,
        last_error: null,
      },
    };
  }

  try {
    const { output, status } = await enrichPlanWithOfflineModel({
      intake,
      basePlan,
      evidenceTrace,
      settings,
    });

    return mergePlanWithOfflineEnrichment(
      basePlan,
      output,
      buildLlmMetadata(status),
      intake,
    );
  } catch (error) {
    const status = await getOfflineModelStatus(settings);
    return {
      ...basePlan,
      llm_metadata: buildLlmMetadata(status, error instanceof Error ? error.message : "Offline generation failed."),
      explainability: {
        ...basePlan.explainability,
        llm_mode: "deterministic-fallback",
      },
    };
  }
}

function buildOverallRisk(interactions: Interaction[]): InteractionReport["overall_risk"] {
  if (interactions.some((interaction) => interaction.severity === "severe")) return "high";
  if (interactions.some((interaction) => interaction.severity === "moderate")) return "moderate";
  if (interactions.length > 0) return "low";
  return "none";
}

function buildInteractionResolutions(interactions: Interaction[]) {
  if (interactions.length === 0) {
    return [
      "No major rule-based interaction was detected, but new supplements or herbs should still be reconciled with the full medication list.",
    ];
  }

  return interactions.map((interaction) => interaction.recommendation);
}

export async function scanInteractions(
  input: {
    medications?: string;
    herbs?: string;
    comorbidities?: string;
    allergies?: string;
  },
  options: EngineOptions = {},
): Promise<InteractionReport> {
  const medications = parseList(input.medications).map(lower);
  const herbs = parseList(input.herbs).map(lower);
  const comorbidities = parseList(input.comorbidities).map(lower);
  const allergies = parseList(input.allergies).map(lower);
  const interactions: Interaction[] = [];

  const ssri = medications.find((medication) =>
    SSRI_TERMS.some((term) => medication.includes(term)),
  );
  const hasStJohnsWort = herbs.some((herb) => herb.includes("st. john") || herb.includes("st john"));
  if (ssri && hasStJohnsWort) {
    interactions.push({
      substance_a: "St. John's Wort",
      substance_b: ssri,
      kind: "drug-herb",
      severity: "severe",
      mechanism: "Both agents can increase serotonergic activity and raise the risk of serotonin toxicity.",
      recommendation: "Do not combine; involve the prescriber or psychiatrist before any use.",
      source: "Integrative medicine herb-drug safety note",
    });
  }

  const anticoagulant = medications.find((medication) =>
    ANTICOAGULANT_TERMS.some((term) => medication.includes(term)),
  );
  const bleedingHerb = herbs.find((herb) =>
    ["ginkgo", "garlic", "turmeric", "curcumin"].some((term) => herb.includes(term)),
  );
  if (anticoagulant && bleedingHerb) {
    interactions.push({
      substance_a: anticoagulant,
      substance_b: bleedingHerb,
      kind: "drug-herb",
      severity: "severe",
      mechanism: "The combination can increase bleeding tendency through additive antiplatelet or anticoagulant effects.",
      recommendation: "Avoid the combination until the anticoagulation prescriber explicitly approves it.",
      source: "Integrative medicine herb-drug safety note",
    });
  }

  if (
    comorbidities.some((condition) => HYPERTENSION_TERMS.some((term) => condition.includes(term))) &&
    herbs.some((herb) => WARMING_HERBS.some((warming) => herb.includes(warming)))
  ) {
    interactions.push({
      substance_a: "Hypertension",
      substance_b: herbs.find((herb) => WARMING_HERBS.some((warming) => herb.includes(warming))) || "warming herb",
      kind: "herb-condition",
      severity: "moderate",
      mechanism: "Stimulating or warming herbs may worsen palpitations or blood-pressure control in susceptible patients.",
      recommendation: "Prefer neutral supportive measures and clinician-reviewed alternatives.",
      source: "AYUSH digestive support guidance",
    });
  }

  if (allergies.some((allergy) => allergy.includes("honey")) && herbs.some((herb) => herb.includes("honey"))) {
    interactions.push({
      substance_a: "Honey allergy",
      substance_b: "Honey-based remedy",
      kind: "allergy",
      severity: "moderate",
      mechanism: "Direct exposure can reproduce the known allergy trigger.",
      recommendation: "Avoid the honey-containing remedy and switch to a non-allergenic household option.",
      source: "Evidence-backed household remedies for mild upper respiratory symptoms",
    });
  }

  const baseReport: InteractionReport = {
    overall_risk: buildOverallRisk(interactions),
    interactions,
    general_advice:
      interactions.length === 0
        ? "No major rule-based interaction was detected from the submitted list, but every new herb or supplement should still be checked against the full medication history."
        : "Use this report as a safety triage aid. High-severity findings should be escalated to a clinician or pharmacist before the regimen is started or continued.",
    resolution_recommendations: buildInteractionResolutions(interactions),
    llm_metadata: {
      provider: "deterministic",
      enabled: false,
      available: false,
      last_error: null,
    },
  };

  const useOfflineModel = options.useOfflineModel ?? true;
  if (!useOfflineModel) return baseReport;

  const settings = options.offlineSettings ?? getOfflineModelSettings() ?? DEFAULT_OFFLINE_MODEL_SETTINGS;
  if (!settings.enabled) {
    return {
      ...baseReport,
      llm_metadata: {
        provider: "deterministic",
        enabled: false,
        available: false,
        model: settings.model,
        base_url: settings.baseUrl,
        last_error: null,
      },
    };
  }

  try {
    const { output, status } = await generateStructuredOffline<{
      resolution_recommendations: string[];
      clinical_summary: string;
    }>({
      settings,
      systemPrompt:
        "You are a conservative medication safety synthesis assistant. Use the given interaction findings only. Do not invent new drug interactions. Return JSON only.",
      userPrompt: [
        `MEDICATIONS: ${input.medications || "none"}`,
        `HERBS / SUPPLEMENTS: ${input.herbs || "none"}`,
        `COMORBIDITIES: ${input.comorbidities || "none"}`,
        `ALLERGIES: ${input.allergies || "none"}`,
        `EXISTING FINDINGS: ${interactions.map((item) => `${item.severity}:${item.substance_a} vs ${item.substance_b} -> ${item.recommendation}`).join(" | ") || "none"}`,
        "Provide short resolution recommendations and a one-paragraph conservative clinical summary.",
      ].join("\n"),
      schema: offlineInteractionSchema,
    });

    return {
      ...baseReport,
      general_advice: output.clinical_summary,
      resolution_recommendations:
        output.resolution_recommendations.length > 0
          ? output.resolution_recommendations
          : baseReport.resolution_recommendations,
      llm_metadata: buildLlmMetadata(status),
    };
  } catch (error) {
    const status = await getOfflineModelStatus(settings);
    return {
      ...baseReport,
      llm_metadata: buildLlmMetadata(status, error instanceof Error ? error.message : "Offline interaction synthesis failed."),
    };
  }
}

export function buildIntakePayload(data: IntakeData, languageCode: string): IntakeData {
  const language = getLanguageName(languageCode);
  return {
    ...data,
    language,
    language_code: languageCode,
    duration_days: parseDurationToDays(data.duration),
  };
}

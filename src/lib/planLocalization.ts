import { getLanguageNative, type LanguageCode } from "@/lib/languages";
import { sanitizeTextList } from "@/lib/textSanitizers";
import { translateTextBatch } from "@/lib/translationService";
import type { IntegrativePlan, LocalizedIntegrativePlan, Modality, TranslationSummary } from "@/lib/types";

const MODALITY_TRANSLATIONS: Record<Modality, Partial<Record<LanguageCode, string>>> = {
  Allopathy: { hi: "एलोपैथी", ta: "அலோபதி", te: "అలోపతి", bn: "অ্যালোপ্যাথি", mr: "अ‍ॅलोपथी", kn: "ಅಲೋಪತಿ", ml: "അലോപ്പതി" },
  Ayurveda: { hi: "आयुर्वेद", ta: "ஆயுர்வேதம்", te: "ఆయుర్వేదం", bn: "আয়ুর্বেদ", mr: "आयुर्वेद", kn: "ಆಯುರ್ವೇದ", ml: "ആയുര്‍വേദം" },
  Homeopathy: { hi: "होम्योपैथी", ta: "ஹோமியோபதி", te: "హోమియోపతి", bn: "হোমিওপ্যাথি", mr: "होमिओपॅथी", kn: "ಹೋಮಿಯೋಪಥಿ", ml: "ഹോമിയോപതി" },
  "Home Remedies": { hi: "घरेलू उपाय", ta: "வீட்டு வைத்தியம்", te: "ఇంటి చిట్కాలు", bn: "ঘরোয়া উপায়", mr: "घरगुती उपाय", kn: "ಮನೆಮದ್ದು", ml: "വീട്ടുവൈദ്യങ്ങൾ" },
};

const ROUTE_LABELS: Record<string, Partial<Record<LanguageCode, string>>> = {
  "general-practitioner": { hi: "जनरल प्रैक्टिशनर", ta: "பொது மருத்துவர்", te: "సాధారణ వైద్యుడు", bn: "জেনারেল প্র্যাকটিশনার", mr: "सर्वसाधारण डॉक्टर", kn: "ಸಾಮಾನ್ಯ ವೈದ್ಯರು", ml: "ജനറൽ പ്രാക്ടീഷണർ" },
  specialist: { hi: "विशेषज्ञ", ta: "நிபுணர்", te: "నిపుణ వైద్యుడు", bn: "বিশেষজ্ঞ", mr: "तज्ज्ञ", kn: "ತಜ್ಞ", ml: "സ്പെഷ്യലിസ്റ്റ്" },
  emergency: { hi: "आपातकालीन", ta: "அவசரம்", te: "అత్యవసరం", bn: "জরুরি", mr: "आपत्कालीन", kn: "ತುರ್ತು", ml: "അടിയന്തരം" },
};

interface TranslatableEntry {
  source: string;
  apply: (value: string) => void;
}

function clonePlan(plan: IntegrativePlan) {
  return JSON.parse(JSON.stringify(plan)) as IntegrativePlan;
}

function simpleHash(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

function localizeLabel(label: string, langCode: LanguageCode) {
  return ROUTE_LABELS[label]?.[langCode] || label;
}

function localizeModality(modality: Modality, langCode: LanguageCode) {
  return MODALITY_TRANSLATIONS[modality]?.[langCode] || modality;
}

function pushEntry(entries: TranslatableEntry[], source: string | undefined | null, apply: (value: string) => void) {
  if (source && source.trim()) {
    entries.push({ source, apply });
  }
}

function buildPlanEntries(source: IntegrativePlan, target: IntegrativePlan) {
  const entries: TranslatableEntry[] = [];
  const englishTranslation =
    source.translations.en ?? {
      language: "English",
      summary: source.triage_reasoning,
      care_path: source.care_path,
      top_actions: [],
      glossary_hits: [],
      quality_mode: source.translation.quality_mode,
      back_translation_confidence: 1,
    };

  pushEntry(entries, englishTranslation.summary, (value) => {
    target.translation.summary = value;
  });
  pushEntry(entries, englishTranslation.care_path, (value) => {
    target.translation.care_path = value;
  });
  englishTranslation.top_actions.forEach((action, index) => {
    pushEntry(entries, action, (value) => {
      target.translation.top_actions[index] = value;
    });
  });
  englishTranslation.glossary_hits.forEach((term, index) => {
    pushEntry(entries, term, (value) => {
      target.translation.glossary_hits[index] = value;
    });
  });

  pushEntry(entries, source.triage_reasoning, (value) => {
    target.triage_reasoning = value;
  });
  pushEntry(entries, source.care_path, (value) => {
    target.care_path = value;
  });
  pushEntry(entries, source.specialist_referral, (value) => {
    target.specialist_referral = value;
  });
  pushEntry(entries, source.safety_review, (value) => {
    target.safety_review = value;
  });
  pushEntry(entries, source.disclaimer, (value) => {
    target.disclaimer = value;
  });

  source.red_flags_to_watch?.forEach((flag, index) => {
    pushEntry(entries, flag, (value) => {
      if (!target.red_flags_to_watch) target.red_flags_to_watch = [];
      target.red_flags_to_watch[index] = value;
    });
  });

  source.provenance.forEach((item, index) => {
    pushEntry(entries, item.title, (value) => {
      target.provenance[index].title = value;
    });
    pushEntry(entries, item.citation, (value) => {
      target.provenance[index].citation = value;
    });
  });

  source.care_path_steps.forEach((step, index) => {
    pushEntry(entries, step.reason, (value) => {
      target.care_path_steps[index].reason = value;
    });
    pushEntry(entries, step.specialist, (value) => {
      target.care_path_steps[index].specialist = value;
    });
  });

  source.suspected_conditions?.forEach((condition, index) => {
    pushEntry(entries, condition.name, (value) => {
      if (!target.suspected_conditions) target.suspected_conditions = [];
      target.suspected_conditions[index].name = value;
    });
    pushEntry(entries, condition.ayurveda_dosha, (value) => {
      if (!target.suspected_conditions) target.suspected_conditions = [];
      target.suspected_conditions[index].ayurveda_dosha = value;
    });
  });

  source.plan_segments.forEach((segment, segmentIndex) => {
    segment.recommendations.forEach((recommendation, recommendationIndex) => {
      pushEntry(entries, recommendation.title, (value) => {
        target.plan_segments[segmentIndex].recommendations[recommendationIndex].title = value;
      });
      pushEntry(entries, recommendation.detail, (value) => {
        target.plan_segments[segmentIndex].recommendations[recommendationIndex].detail = value;
      });
      pushEntry(entries, recommendation.source, (value) => {
        target.plan_segments[segmentIndex].recommendations[recommendationIndex].source = value;
      });
      pushEntry(entries, recommendation.when_to_use, (value) => {
        target.plan_segments[segmentIndex].recommendations[recommendationIndex].when_to_use = value;
      });
      pushEntry(entries, recommendation.safety_note, (value) => {
        target.plan_segments[segmentIndex].recommendations[recommendationIndex].safety_note = value;
      });
    });
  });

  source.warnings.forEach((warning, index) => {
    pushEntry(entries, warning.message, (value) => {
      target.warnings[index].message = value;
    });
    pushEntry(entries, warning.resolution, (value) => {
      target.warnings[index].resolution = value;
    });
  });

  source.explainability.risk_factors.forEach((item, index) => {
    pushEntry(entries, item, (value) => {
      target.explainability.risk_factors[index] = value;
    });
  });
  source.explainability.modality_selection_rationale.forEach((item, index) => {
    pushEntry(entries, item, (value) => {
      target.explainability.modality_selection_rationale[index] = value;
    });
  });
  source.explainability.safety_checks.forEach((item, index) => {
    pushEntry(entries, item, (value) => {
      target.explainability.safety_checks[index] = value;
    });
  });
  source.explainability.evidence_trace.forEach((item, index) => {
    pushEntry(entries, item, (value) => {
      target.explainability.evidence_trace[index] = value;
    });
  });
  source.explainability.workflow_trace.forEach((item, index) => {
    pushEntry(entries, item, (value) => {
      target.explainability.workflow_trace[index] = value;
    });
  });
  source.explainability.normalized_symptoms.forEach((symptom, index) => {
    pushEntry(entries, symptom.normalized, (value) => {
      target.explainability.normalized_symptoms[index].normalized = value;
    });
    pushEntry(entries, symptom.text, (value) => {
      target.explainability.normalized_symptoms[index].text = value;
    });
  });

  return entries;
}

function buildLocalizedTranslation(plan: IntegrativePlan, langCode: LanguageCode): TranslationSummary {
  if (langCode === "en") {
    return (
      plan.translations.en ?? {
        language: "English",
        summary: plan.triage_reasoning,
        care_path: plan.care_path,
        top_actions: [],
        glossary_hits: [],
        quality_mode: plan.translation.quality_mode,
        back_translation_confidence: 1,
      }
    );
  }

  const localizedSummary = plan.translations[langCode];
  if (localizedSummary) {
    return {
      ...localizedSummary,
      language: getLanguageNative(langCode),
      top_actions: sanitizeTextList(localizedSummary.top_actions),
      glossary_hits: sanitizeTextList(localizedSummary.glossary_hits),
    };
  }

  return {
    ...plan.translation,
    language: getLanguageNative(langCode),
    top_actions: sanitizeTextList(plan.translation.top_actions),
    glossary_hits: sanitizeTextList(plan.translation.glossary_hits),
  };
}

export async function translateEnglishStrings(strings: string[], langCode: LanguageCode) {
  const result = await translateTextBatch({
    strings,
    langCode,
    cacheNamespace: "plan-ui",
    storage: "session",
  });
  return result.translations;
}

export async function localizePlanForLanguage(
  plan: IntegrativePlan,
  langCode: LanguageCode,
): Promise<LocalizedIntegrativePlan> {
  const normalizedPlan = clonePlan(plan);
  normalizedPlan.translation = buildLocalizedTranslation(plan, langCode);
  normalizedPlan.back_translation_confidence =
    normalizedPlan.translation.back_translation_confidence ??
    plan.back_translation_confidence ??
    null;

  if (langCode === "en") {
    return {
      language_code: "en",
      language_name: "English",
      plan: normalizedPlan,
      translation_warning: null,
    };
  }

  const planSignature = simpleHash(
    JSON.stringify({
      risk_level: plan.risk_level,
      care_path: plan.care_path,
      triage_reasoning: plan.triage_reasoning,
      warnings: plan.warnings.map((warning) => `${warning.type}:${warning.message}`),
      segments: plan.plan_segments.map((segment) =>
        segment.recommendations.map((recommendation) => `${recommendation.title}:${recommendation.detail}`),
      ),
    }),
  );
  const cacheKey = `sanjeevani:localized-plan:v5:${langCode}:${planSignature}`;

  if (typeof window !== "undefined") {
    const cached = window.sessionStorage.getItem(cacheKey);
    if (cached) {
      try {
        return JSON.parse(cached) as LocalizedIntegrativePlan;
      } catch {
        // ignore bad cache and regenerate
      }
    }
  }

  const localizedPlan = clonePlan(normalizedPlan);
  const entries = buildPlanEntries(plan, localizedPlan);
  const translationResult = await translateTextBatch({
    strings: entries.map((entry) => entry.source),
    langCode,
    cacheNamespace: "plan-content",
    storage: "session",
  });
  const translatedStrings = translationResult.translations;

  if (!translationResult.fallback) {
    entries.forEach((entry, index) => {
      entry.apply(translatedStrings[index] || entry.source);
    });
  }

  localizedPlan.translation = {
    ...localizedPlan.translation,
    language: getLanguageNative(langCode),
    top_actions: sanitizeTextList(localizedPlan.translation.top_actions),
    glossary_hits: sanitizeTextList(plan.translations[langCode]?.glossary_hits ?? plan.translation.glossary_hits ?? []),
    quality_mode:
      plan.translations[langCode]?.quality_mode ??
      plan.translation.quality_mode,
    back_translation_confidence:
      plan.translations[langCode]?.back_translation_confidence ??
      plan.back_translation_confidence ??
      null,
  };
  localizedPlan.back_translation_confidence =
    localizedPlan.translation.back_translation_confidence ??
    plan.back_translation_confidence ??
    null;

  const result: LocalizedIntegrativePlan = {
    language_code: langCode,
    language_name: getLanguageNative(langCode),
    plan: localizedPlan,
    translation_warning: translationResult.warning,
  };

  if (typeof window !== "undefined" && !translationResult.fallback) {
    window.sessionStorage.setItem(cacheKey, JSON.stringify(result));
  }

  return result;
}

export function getLocalizedRouteLabel(route: string, langCode: LanguageCode) {
  return localizeLabel(route, langCode);
}

export function getLocalizedModalityLabel(modality: Modality, langCode: LanguageCode) {
  return localizeModality(modality, langCode);
}

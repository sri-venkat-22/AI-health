import type { EvidenceTier, Modality, ProvenanceSource, RiskLevel, SymptomObject } from "@/lib/types";

export interface EvidenceSnippet extends ProvenanceSource {
  tags: string[];
  summary: string;
}

export const EVIDENCE_LIBRARY: EvidenceSnippet[] = [
  {
    id: "who_emergency_triage",
    title: "WHO emergency triage guidance",
    citation:
      "WHO emergency and urgent care guidance prioritizes rapid escalation for chest pain, severe breathing difficulty, stroke-like symptoms, anaphylaxis, and altered mental status.",
    reliability_tier: "A",
    modality: "Cross-modality",
    tags: ["emergent", "chest pain", "breathlessness", "stroke", "anaphylaxis"],
    summary:
      "Emergency symptoms require immediate referral and should not be delayed by complementary treatments.",
  },
  {
    id: "icmr_fever_respiratory",
    title: "ICMR fever and respiratory symptom protocol",
    citation:
      "ICMR-aligned acute fever and upper respiratory guidance recommends hydration, symptom monitoring, and timely medical review if fever persists or breathing worsens.",
    reliability_tier: "B",
    modality: "Allopathy",
    tags: ["fever", "cough", "sore throat", "cold", "routine", "urgent"],
    summary:
      "Persistent fever, worsening cough, or difficulty breathing should move the patient from routine care to urgent review.",
  },
  {
    id: "who_self_care_support",
    title: "WHO self-care support measures",
    citation:
      "WHO self-care guidance supports hydration, rest, symptom logging, and escalation when red flags appear.",
    reliability_tier: "B",
    modality: "Cross-modality",
    tags: ["self-care", "routine", "hydration", "rest", "home remedies"],
    summary:
      "Home support should be safe, simple, and paired with clear escalation instructions.",
  },
  {
    id: "ayush_respiratory_support",
    title: "AYUSH supportive respiratory care guidance",
    citation:
      "AYUSH supportive care references emphasize warm fluids, gentle herbal support, and clinician review before combining multiple formulations.",
    reliability_tier: "T",
    modality: "Ayurveda",
    tags: ["ayurveda", "fever", "cough", "sore throat", "routine"],
    summary:
      "Ayurveda can be positioned as complementary symptom support, especially in non-emergent respiratory complaints.",
  },
  {
    id: "ayush_digestive_support",
    title: "AYUSH digestive support guidance",
    citation:
      "AYUSH digestive support guidance emphasizes light diet, hydration, and avoiding overly heating herbs in patients with cardiovascular risk or dehydration.",
    reliability_tier: "T",
    modality: "Ayurveda",
    tags: ["ayurveda", "vomiting", "diarrhea", "digestive", "urgent"],
    summary:
      "Digestive support should stay gentle and avoid stimulating herb combinations in vulnerable patients.",
  },
  {
    id: "integrative_drug_herb_safety",
    title: "Integrative medicine herb-drug safety note",
    citation:
      "Integrative safety screening should review SSRIs, anticoagulants, hypertension, allergies, and all concurrent herbs or supplements before complementary therapy is started.",
    reliability_tier: "B",
    modality: "Cross-modality",
    tags: ["safety", "interaction", "ssri", "anticoagulant", "hypertension", "allergy"],
    summary:
      "Safety screening is mandatory before adding new supplements, herbs, or remedies to a medication regimen.",
  },
  {
    id: "homeopathy_complementary_only",
    title: "Homeopathy complementary-use caution",
    citation:
      "Homeopathic remedies should be positioned as complementary options only and should not replace indicated acute medical evaluation.",
    reliability_tier: "T",
    modality: "Homeopathy",
    tags: ["homeopathy", "routine", "self-care", "complementary"],
    summary:
      "Homeopathy may be displayed as optional support with explicit safety boundaries and clinician oversight.",
  },
  {
    id: "household_remedies_upper_respiratory",
    title: "Evidence-backed household remedies for mild upper respiratory symptoms",
    citation:
      "Saline gargles, warm fluids, rest, and steam inhalation when tolerated can provide symptomatic relief in mild upper respiratory complaints.",
    reliability_tier: "B",
    modality: "Home Remedies",
    tags: ["home remedies", "cough", "sore throat", "cold", "routine", "self-care"],
    summary:
      "Home remedies should stay non-pharmacologic and avoid known allergens or interactions.",
  },
];

function scoreEvidence(snippet: EvidenceSnippet, tokens: string[]) {
  return snippet.tags.reduce((score, tag) => (tokens.includes(tag) ? score + 1 : score), 0);
}

export function retrieveEvidence(input: {
  normalizedSymptoms: SymptomObject[];
  riskLevel: RiskLevel;
  preferredModalities: string[];
}) {
  const tokens = [
    input.riskLevel,
    ...input.normalizedSymptoms.map((symptom) => symptom.normalized.toLowerCase()),
    ...input.preferredModalities.map((modality) => modality.toLowerCase()),
  ];

  return EVIDENCE_LIBRARY
    .map((snippet) => ({ snippet, score: scoreEvidence(snippet, tokens) }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, 6)
    .map((entry) => entry.snippet);
}

export function dedupeProvenance(sources: ProvenanceSource[]) {
  const seen = new Set<string>();
  return sources.filter((source) => {
    if (seen.has(source.id)) return false;
    seen.add(source.id);
    return true;
  });
}

export function makeEvidenceSource(
  id: string,
  title: string,
  citation: string,
  reliability_tier: EvidenceTier,
  modality?: Modality | "Cross-modality",
): ProvenanceSource {
  return { id, title, citation, reliability_tier, modality };
}

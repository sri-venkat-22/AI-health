export type RiskLevel = "emergent" | "urgent" | "routine" | "self-care";
export type Modality = "Allopathy" | "Ayurveda" | "Homeopathy" | "Home Remedies";
export type EvidenceTier = "A" | "B" | "T" | "Caution";
export type ReviewStatus = "pending" | "approved" | "edited" | "rejected" | "escalated";
export type SymptomSeverity = "mild" | "moderate" | "severe";
export type PlanPriority = "primary" | "complementary" | "optional";
export type CareRoute = "general-practitioner" | "specialist" | "emergency";
export type RecommendationCategory =
  | "assessment"
  | "medication"
  | "supportive"
  | "lifestyle"
  | "traditional"
  | "remedy"
  | "referral";

export interface Recommendation {
  title: string;
  detail: string;
  evidence_tier: EvidenceTier;
  source?: string;
  category?: RecommendationCategory;
  when_to_use?: string;
  safety_note?: string;
}

export interface PlanSegment {
  modality: Modality;
  priority: PlanPriority;
  selected: boolean;
  recommendations: Recommendation[];
}

export interface Warning {
  type: "herb-drug-interaction" | "contraindication" | "allergy" | "cross-modality-conflict" | "red-flag" | "general";
  severity: "info" | "moderate" | "severe";
  message: string;
  resolution?: string;
}

export interface SymptomObject {
  text: string;
  normalized: string;
  severity: SymptomSeverity;
  detected_from: "dictionary" | "phrase" | "fallback";
}

export interface SuspectedCondition {
  name: string;
  icd10?: string;
  ayurveda_dosha?: string;
  likelihood: "high" | "moderate" | "low";
}

export interface CarePathStep {
  modality: Modality;
  priority: PlanPriority;
  selected: boolean;
  reason: string;
  route: CareRoute;
  specialist?: string;
}

export interface ProvenanceSource {
  id: string;
  title: string;
  citation: string;
  reliability_tier: EvidenceTier;
  modality?: Modality | "Cross-modality";
}

export interface TranslationSummary {
  language: string;
  summary: string;
  care_path: string;
  top_actions: string[];
  glossary_hits: string[];
  quality_mode?: "glossary" | "offline-llm";
  back_translation_confidence?: number | null;
}

export interface TriageModelBreakdown {
  logistic_probability: number;
  gradient_boosting_score: number;
  ensemble_probability: number;
  ensemble_confidence: number;
  feature_weights: Record<string, number>;
}

export interface LlmGenerationMetadata {
  provider: "ollama" | "deterministic";
  enabled: boolean;
  available: boolean;
  model?: string;
  base_url?: string;
  last_error?: string | null;
}

export interface OfflineModelSettings {
  enabled: boolean;
  baseUrl: string;
  model: string;
  temperature: number;
  timeoutMs: number;
}

export interface OfflineModelStatus {
  provider: "ollama";
  enabled: boolean;
  available: boolean;
  baseUrl: string;
  model: string;
  installedModels: string[];
  lastError?: string | null;
}

export interface Explainability {
  triggered_rules: string[];
  risk_factors: string[];
  modality_selection_rationale: string[];
  normalized_symptoms: SymptomObject[];
  safety_checks: string[];
  triage_model: TriageModelBreakdown;
  evidence_trace: string[];
  workflow_trace: string[];
  llm_mode: string;
}

export interface IntegrativePlan {
  risk_level: RiskLevel;
  confidence: number;
  triage_reasoning: string;
  care_path: string;
  clinical_route: CareRoute;
  specialist_referral?: string;
  care_path_steps: CarePathStep[];
  suspected_conditions?: SuspectedCondition[];
  plan_segments: PlanSegment[];
  warnings: Warning[];
  provenance: ProvenanceSource[];
  red_flags_to_watch?: string[];
  safety_review: string;
  translation: TranslationSummary;
  translations: Record<string, TranslationSummary>;
  explainability: Explainability;
  disclaimer: string;
  back_translation_confidence?: number | null;
  normalized_symptoms?: SymptomObject[];
  llm_metadata?: LlmGenerationMetadata;
}

export interface IntakeData {
  patient_id?: string;
  patient_hash?: string;
  patient_name?: string;
  language: string;
  language_code?: string;
  age?: number;
  sex?: string;
  email?: string;
  phone?: string;
  symptoms: string;
  duration: string;
  duration_days?: number;
  symptom_severity?: SymptomSeverity;
  pain_score?: number;
  temperature_c?: number;
  blood_pressure?: string;
  oxygen_saturation?: number;
  height_cm?: number;
  weight_kg?: number;
  pregnancy_status?: string;
  comorbidities?: string;
  medications?: string;
  allergies?: string;
  past_surgeries?: string;
  family_history?: string;
  smoking_status?: string;
  alcohol_use?: string;
  sleep_quality?: string;
  appetite_status?: string;
  recent_travel?: string;
  recent_exposure?: string;
  preferences?: string[];
}

export interface Interaction {
  substance_a: string;
  substance_b: string;
  kind: "drug-drug" | "drug-herb" | "drug-condition" | "herb-condition" | "allergy";
  severity: "info" | "moderate" | "severe";
  mechanism: string;
  recommendation: string;
  source?: string;
}

export interface InteractionReport {
  overall_risk: "none" | "low" | "moderate" | "high";
  interactions: Interaction[];
  general_advice: string;
  resolution_recommendations?: string[];
  llm_metadata?: LlmGenerationMetadata;
}

export interface IntakeSessionRecord {
  id: string;
  patient_id?: string | null;
  patient_hash: string;
  patient_name?: string | null;
  patient_session_token: string;
  language: string;
  language_code: string;
  age: number | null;
  sex: string | null;
  email?: string | null;
  phone?: string | null;
  symptoms: string;
  duration: string;
  duration_days: number;
  symptom_severity?: SymptomSeverity | null;
  pain_score?: number | null;
  temperature_c?: number | null;
  blood_pressure?: string | null;
  oxygen_saturation?: number | null;
  height_cm?: number | null;
  weight_kg?: number | null;
  pregnancy_status?: string | null;
  comorbidities: string | null;
  medications: string | null;
  allergies: string | null;
  past_surgeries?: string | null;
  family_history?: string | null;
  smoking_status?: string | null;
  alcohol_use?: string | null;
  sleep_quality?: string | null;
  appetite_status?: string | null;
  recent_travel?: string | null;
  recent_exposure?: string | null;
  preferences: string[];
  normalized_symptoms: SymptomObject[];
  created_at: string;
}

export interface StoredPlanRecord {
  id: string;
  intake_session_id: string;
  risk_level: RiskLevel;
  confidence: number;
  plan_data: IntegrativePlan;
  back_translation_confidence: number | null;
  review_status: ReviewStatus;
  created_at: string;
  intake_session: IntakeSessionRecord;
}

export interface PlanReviewRecord {
  id: string;
  plan_id: string;
  reviewer_id: string;
  reviewer_email: string;
  decision: ReviewStatus;
  notes: string | null;
  edited_plan: IntegrativePlan | null;
  created_at: string;
}

export interface AuditEntry {
  id: string;
  actor_id: string | null;
  action: string;
  resource_type: string;
  resource_id: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface AppUser {
  id: string;
  email: string;
  full_name?: string;
  specialty?: string;
  organization?: string;
  mode: "local" | "supabase";
}

export interface PatientAccount {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  preferred_language?: string;
  created_at: string;
  last_login_at?: string;
}

export interface PatientHistoryRecord {
  id: string;
  patient_id: string;
  plan_id: string;
  created_at: string;
  intake: IntakeData;
  plan: IntegrativePlan;
  risk_level: RiskLevel;
  language_code: string;
  summary: string;
}

export interface LocalizedIntegrativePlan {
  language_code: string;
  language_name: string;
  plan: IntegrativePlan;
  translation_warning?: string | null;
}

import type {
  AppUser,
  AuditEntry,
  IntakeData,
  IntakeSessionRecord,
  IntegrativePlan,
  OfflineModelSettings,
  PlanReviewRecord,
  ReviewStatus,
  StoredPlanRecord,
  SymptomObject,
} from "@/lib/types";
import { DEFAULT_OFFLINE_MODEL_SETTINGS } from "@/lib/offlineLlm";

const STORAGE_KEYS = {
  clinicians: "sanjeevani:clinicians",
  currentClinician: "sanjeevani:current-clinician",
  intakeSessions: "sanjeevani:intake-sessions",
  plans: "sanjeevani:plans",
  reviews: "sanjeevani:reviews",
  audit: "sanjeevani:audit",
  offlineModelSettings: "sanjeevani:offline-model-settings",
} as const;

interface LocalClinicianAccount extends AppUser {
  password: string;
  created_at: string;
}

const isBrowser = () => typeof window !== "undefined";

const fallbackId = () =>
  `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;

export const createId = (prefix: string) =>
  `${prefix}_${typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : fallbackId()}`;

function readStorage<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;
  const raw = window.localStorage.getItem(key);
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeStorage<T>(key: string, value: T) {
  if (!isBrowser()) return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function listClinicianAccounts() {
  return readStorage<LocalClinicianAccount[]>(STORAGE_KEYS.clinicians, []);
}

function saveClinicianAccounts(accounts: LocalClinicianAccount[]) {
  writeStorage(STORAGE_KEYS.clinicians, accounts);
}

export function getCurrentLocalClinician(): AppUser | null {
  return readStorage<AppUser | null>(STORAGE_KEYS.currentClinician, null);
}

function setCurrentLocalClinician(user: AppUser | null) {
  writeStorage(STORAGE_KEYS.currentClinician, user);
}

export function signUpLocalClinician(input: {
  email: string;
  password: string;
  full_name: string;
  specialty?: string;
  organization?: string;
}) {
  const email = normalizeEmail(input.email);
  const clinicians = listClinicianAccounts();

  if (clinicians.some((clinician) => clinician.email === email)) {
    throw new Error("A clinician account already exists for this email.");
  }

  const clinician: LocalClinicianAccount = {
    id: createId("clinician"),
    email,
    password: input.password,
    full_name: input.full_name.trim(),
    specialty: input.specialty?.trim() || "",
    organization: input.organization?.trim() || "",
    mode: "local",
    created_at: new Date().toISOString(),
  };

  clinicians.push(clinician);
  saveClinicianAccounts(clinicians);
  setCurrentLocalClinician(stripPassword(clinician));
  return stripPassword(clinician);
}

export function signInLocalClinician(email: string, password: string) {
  const clinician = listClinicianAccounts().find(
    (account) => account.email === normalizeEmail(email),
  );

  if (!clinician || clinician.password !== password) {
    throw new Error("Incorrect email or password.");
  }

  const user = stripPassword(clinician);
  setCurrentLocalClinician(user);
  return user;
}

export function signOutLocalClinician() {
  setCurrentLocalClinician(null);
}

function stripPassword(account: LocalClinicianAccount): AppUser {
  const { password: _password, ...user } = account;
  return user;
}

export function createIntakeSessionRecord(
  intake: IntakeData,
  normalizedSymptoms: SymptomObject[],
): IntakeSessionRecord {
  const patientHash = intake.patient_hash || `p_${createId("pt").slice(-6)}`;
  const session: IntakeSessionRecord = {
    id: createId("session"),
    patient_id: intake.patient_id ?? null,
    patient_hash: patientHash,
    patient_name: intake.patient_name ?? null,
    patient_session_token: createId("token"),
    language: intake.language,
    language_code: intake.language_code || "en",
    age: intake.age ?? null,
    sex: intake.sex ?? null,
    email: intake.email ?? null,
    phone: intake.phone ?? null,
    symptoms: intake.symptoms,
    duration: intake.duration,
    duration_days: intake.duration_days ?? 1,
    symptom_severity: intake.symptom_severity ?? null,
    pain_score: intake.pain_score ?? null,
    temperature_c: intake.temperature_c ?? null,
    blood_pressure: intake.blood_pressure ?? null,
    oxygen_saturation: intake.oxygen_saturation ?? null,
    height_cm: intake.height_cm ?? null,
    weight_kg: intake.weight_kg ?? null,
    pregnancy_status: intake.pregnancy_status ?? null,
    comorbidities: intake.comorbidities ?? null,
    medications: intake.medications ?? null,
    allergies: intake.allergies ?? null,
    past_surgeries: intake.past_surgeries ?? null,
    family_history: intake.family_history ?? null,
    smoking_status: intake.smoking_status ?? null,
    alcohol_use: intake.alcohol_use ?? null,
    sleep_quality: intake.sleep_quality ?? null,
    appetite_status: intake.appetite_status ?? null,
    recent_exposure: intake.recent_exposure ?? null,
    normalized_symptoms: normalizedSymptoms,
    created_at: new Date().toISOString(),
  };

  const sessions = readStorage<IntakeSessionRecord[]>(STORAGE_KEYS.intakeSessions, []);
  sessions.unshift(session);
  writeStorage(STORAGE_KEYS.intakeSessions, sessions.slice(0, 250));
  return session;
}

export function saveGeneratedPlan(
  intakeSession: IntakeSessionRecord,
  plan: IntegrativePlan,
): StoredPlanRecord {
  const record: StoredPlanRecord = {
    id: createId("plan"),
    intake_session_id: intakeSession.id,
    risk_level: plan.risk_level,
    confidence: plan.confidence,
    plan_data: plan,
    back_translation_confidence: plan.back_translation_confidence ?? null,
    review_status: "pending",
    created_at: new Date().toISOString(),
    intake_session: intakeSession,
  };

  const plans = readStorage<StoredPlanRecord[]>(STORAGE_KEYS.plans, []);
  plans.unshift(record);
  writeStorage(STORAGE_KEYS.plans, plans.slice(0, 250));
  return record;
}

export function listStoredPlans() {
  return readStorage<StoredPlanRecord[]>(STORAGE_KEYS.plans, []);
}

export function getStoredPlan(id: string) {
  return listStoredPlans().find((plan) => plan.id === id) ?? null;
}

export function updateStoredPlan(
  planId: string,
  update: Partial<Omit<StoredPlanRecord, "id" | "intake_session_id" | "created_at" | "intake_session">>,
) {
  const plans = listStoredPlans();
  const index = plans.findIndex((plan) => plan.id === planId);
  if (index === -1) return null;

  const next = {
    ...plans[index],
    ...update,
  };

  plans[index] = next;
  writeStorage(STORAGE_KEYS.plans, plans);
  return next;
}

export function listPlanReviews(planId?: string) {
  const reviews = readStorage<PlanReviewRecord[]>(STORAGE_KEYS.reviews, []);
  return reviews
    .filter((review) => !planId || review.plan_id === planId)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export function addPlanReview(input: {
  plan_id: string;
  reviewer_id: string;
  reviewer_email: string;
  decision: ReviewStatus;
  notes?: string;
  edited_plan?: IntegrativePlan | null;
}) {
  const review: PlanReviewRecord = {
    id: createId("review"),
    plan_id: input.plan_id,
    reviewer_id: input.reviewer_id,
    reviewer_email: input.reviewer_email,
    decision: input.decision,
    notes: input.notes?.trim() || null,
    edited_plan: input.edited_plan ?? null,
    created_at: new Date().toISOString(),
  };

  const reviews = readStorage<PlanReviewRecord[]>(STORAGE_KEYS.reviews, []);
  reviews.unshift(review);
  writeStorage(STORAGE_KEYS.reviews, reviews.slice(0, 500));
  return review;
}

export function addAuditEntry(input: {
  actor_id?: string | null;
  action: string;
  resource_type: string;
  resource_id: string;
  metadata?: Record<string, unknown> | null;
}) {
  const entry: AuditEntry = {
    id: createId("audit"),
    actor_id: input.actor_id ?? null,
    action: input.action,
    resource_type: input.resource_type,
    resource_id: input.resource_id,
    metadata: input.metadata ?? null,
    created_at: new Date().toISOString(),
  };

  const audit = readStorage<AuditEntry[]>(STORAGE_KEYS.audit, []);
  audit.unshift(entry);
  writeStorage(STORAGE_KEYS.audit, audit.slice(0, 1000));
  return entry;
}

export function savePlanDecision(input: {
  planId: string;
  decision: ReviewStatus;
  reviewer: AppUser;
  notes?: string;
  editedPlan?: IntegrativePlan | null;
}) {
  const updatedPlan = updateStoredPlan(input.planId, {
    review_status: input.decision,
    plan_data: input.editedPlan ?? getStoredPlan(input.planId)?.plan_data,
    risk_level: input.editedPlan?.risk_level ?? getStoredPlan(input.planId)?.risk_level,
    confidence: input.editedPlan?.confidence ?? getStoredPlan(input.planId)?.confidence,
    back_translation_confidence:
      input.editedPlan?.back_translation_confidence ??
      getStoredPlan(input.planId)?.back_translation_confidence ??
      null,
  });

  const review = addPlanReview({
    plan_id: input.planId,
    reviewer_id: input.reviewer.id,
    reviewer_email: input.reviewer.email,
    decision: input.decision,
    notes: input.notes,
    edited_plan: input.editedPlan ?? null,
  });

  addAuditEntry({
    actor_id: input.reviewer.id,
    action: `plan.${input.decision}`,
    resource_type: "plan",
    resource_id: input.planId,
    metadata: {
      notes: input.notes?.trim() || null,
      clinician_mode: input.reviewer.mode,
      edited: Boolean(input.editedPlan),
    },
  });

  return { updatedPlan, review };
}

export function getOfflineModelSettings(): OfflineModelSettings {
  const stored = readStorage<OfflineModelSettings>(
    STORAGE_KEYS.offlineModelSettings,
    DEFAULT_OFFLINE_MODEL_SETTINGS,
  );
  const shouldUpgradeLegacyDefault =
    !stored.model || stored.model === "qwen3:8b" || stored.model === "qwen3:latest";
  const normalized: OfflineModelSettings = {
    ...DEFAULT_OFFLINE_MODEL_SETTINGS,
    ...stored,
    baseUrl: (stored.baseUrl || DEFAULT_OFFLINE_MODEL_SETTINGS.baseUrl).replace(
      "http://localhost:",
      "http://127.0.0.1:",
    ),
    model: shouldUpgradeLegacyDefault ? DEFAULT_OFFLINE_MODEL_SETTINGS.model : stored.model,
  };

  if (
    normalized.baseUrl !== stored.baseUrl ||
    normalized.model !== stored.model ||
    normalized.enabled !== stored.enabled ||
    normalized.temperature !== stored.temperature ||
    normalized.timeoutMs !== stored.timeoutMs
  ) {
    writeStorage(STORAGE_KEYS.offlineModelSettings, normalized);
  }

  return normalized;
}

export function saveOfflineModelSettings(settings: OfflineModelSettings) {
  const normalized: OfflineModelSettings = {
    ...settings,
    baseUrl: settings.baseUrl.replace("http://localhost:", "http://127.0.0.1:"),
  };
  writeStorage(STORAGE_KEYS.offlineModelSettings, normalized);
  return normalized;
}

export function seedDemoClinician() {
  const clinicians = listClinicianAccounts();
  if (clinicians.length > 0) return;

  const demoClinician: LocalClinicianAccount = {
    id: createId("clinician"),
    email: "clinician@sanjeevani.demo",
    password: "demo123",
    full_name: "Demo Clinician",
    specialty: "Integrative Medicine",
    organization: "Sanjeevani Research Lab",
    mode: "local",
    created_at: new Date().toISOString(),
  };

  clinicians.push(demoClinician);
  saveClinicianAccounts(clinicians);
}

import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  Home,
  Languages,
  Leaf,
  Loader2,
  ShieldCheck,
  Stethoscope,
  Droplets,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { LANGUAGES, getLanguageNative, type LanguageCode } from "@/lib/languages";
import { getLocalizedModalityLabel, getLocalizedRouteLabel, localizePlanForLanguage, translateEnglishStrings } from "@/lib/planLocalization";
import type { EvidenceTier, IntegrativePlan, Modality, RiskLevel } from "@/lib/types";

const RESULT_UI_ENGLISH = {
  newIntake: "New intake",
  confidence: "Confidence",
  recommendedCarePath: "Recommended care path",
  route: "Route",
  crossModality: "Cross-modality",
  offlineModel: "Offline model",
  offlineModelFallback: "Offline model unavailable, deterministic fallback used",
  patientSummary: "Patient summary",
  backTranslation: "Back-translation",
  suspectedConditions: "Suspected conditions",
  safetyReview: "Safety review",
  resolution: "Resolution",
  integrativePlan: "Integrative plan",
  activePath: "active path",
  optionalPath: "optional path",
  watchForThese: "Watch for these - seek care immediately",
  whyThisPlan: "Why this plan?",
  triggeredRules: "Triggered rules",
  hybridTriage: "Hybrid triage",
  logisticProbability: "Logistic probability",
  boostingScore: "Boosting score",
  ensembleProbability: "Ensemble probability",
  riskFactors: "Risk factors",
  normalizedSymptoms: "Normalized symptoms",
  safetyChecks: "Safety checks",
  evidenceTrace: "Evidence trace",
  workflowTrace: "Workflow trace",
  safetyResolutionAgent: "Safety Resolution Agent",
  provenance: "Provenance",
  startNewIntake: "Start a new intake",
  requestClinicianReview: "Request clinician review",
  whenToUse: "When to use",
  safety: "Safety",
  glossary: "glossary",
  updatingLanguage: "Updating language...",
  loadingResult: "Loading result...",
  severe: "severe",
  moderate: "moderate",
  mild: "mild",
  info: "info",
  high: "high",
  low: "low",
  primary: "primary",
  complementary: "complementary",
  optional: "optional",
  strongEvidence: "Strong evidence",
  observational: "Observational",
  traditional: "Traditional",
  caution: "Caution",
  riskEmergent: "EMERGENT",
  riskUrgent: "URGENT",
  riskRoutine: "ROUTINE",
  riskSelfCare: "SELF-CARE",
  riskEmergentSubtitle: "Seek emergency care now",
  riskUrgentSubtitle: "See a doctor within 24 hours",
  riskRoutineSubtitle: "Schedule a routine visit",
  riskSelfCareSubtitle: "Manage at home with care",
  icd10: "ICD-10",
  dosha: "Dosha",
  herbDrugInteraction: "Herb-drug interaction",
  contraindication: "Contraindication",
  allergy: "Allergy",
  crossModalityConflict: "Cross-modality conflict",
  redFlag: "Red flag",
  general: "General",
} as const;

type ResultUiLabels = typeof RESULT_UI_ENGLISH;

interface EvidenceBadgeMeta {
  shortCode: string;
  label: string;
  cls: string;
}

const MODALITY_ICON: Record<Modality, typeof Stethoscope> = {
  Allopathy: Stethoscope,
  Ayurveda: Leaf,
  Homeopathy: Droplets,
  "Home Remedies": Home,
};

const RESULT_UI_KEYS = Object.keys(RESULT_UI_ENGLISH) as Array<keyof ResultUiLabels>;

function getStoredResultLanguage() {
  if (typeof window === "undefined") return null;
  const raw = window.sessionStorage.getItem("sanjeevani:result-language");
  return LANGUAGES.some((language) => language.code === raw) ? (raw as LanguageCode) : null;
}

function inferLanguageFromPlan(plan: IntegrativePlan) {
  const intakeRaw = typeof window !== "undefined" ? window.sessionStorage.getItem("sanjeevani:intake") : null;
  if (intakeRaw) {
    try {
      const intake = JSON.parse(intakeRaw) as { language_code?: string };
      if (intake.language_code && LANGUAGES.some((language) => language.code === intake.language_code)) {
        return intake.language_code as LanguageCode;
      }
    } catch {
      // ignore malformed intake cache
    }
  }

  const translationMatch = LANGUAGES.find((language) => getLanguageNative(language.code) === plan.translation.language);
  return translationMatch?.code ?? "en";
}

async function getLocalizedUiLabels(lang: LanguageCode): Promise<ResultUiLabels> {
  if (lang === "en") return RESULT_UI_ENGLISH;

  const translated = await translateEnglishStrings(
    RESULT_UI_KEYS.map((key) => RESULT_UI_ENGLISH[key]),
    lang,
  );

  return RESULT_UI_KEYS.reduce((accumulator, key, index) => {
    accumulator[key] = translated[index] || RESULT_UI_ENGLISH[key];
    return accumulator;
  }, { ...RESULT_UI_ENGLISH });
}

function buildRiskMeta(ui: ResultUiLabels) {
  return {
    emergent: {
      label: ui.riskEmergent,
      ring: "ring-risk-emergent/40",
      bg: "bg-risk-emergent",
      text: "text-risk-emergent",
      subtitle: ui.riskEmergentSubtitle,
    },
    urgent: {
      label: ui.riskUrgent,
      ring: "ring-risk-urgent/40",
      bg: "bg-risk-urgent",
      text: "text-risk-urgent",
      subtitle: ui.riskUrgentSubtitle,
    },
    routine: {
      label: ui.riskRoutine,
      ring: "ring-risk-routine/40",
      bg: "bg-risk-routine",
      text: "text-risk-routine",
      subtitle: ui.riskRoutineSubtitle,
    },
    "self-care": {
      label: ui.riskSelfCare,
      ring: "ring-risk-selfcare/40",
      bg: "bg-risk-selfcare",
      text: "text-risk-selfcare",
      subtitle: ui.riskSelfCareSubtitle,
    },
  } satisfies Record<RiskLevel, { label: string; ring: string; bg: string; text: string; subtitle: string }>;
}

function buildTierMeta(ui: ResultUiLabels) {
  return {
    A: {
      shortCode: "A",
      label: ui.strongEvidence,
      cls: "bg-risk-selfcare/15 text-risk-selfcare border-risk-selfcare/30",
    },
    B: {
      shortCode: "B",
      label: ui.observational,
      cls: "bg-risk-routine/15 text-risk-routine border-risk-routine/30",
    },
    T: {
      shortCode: "T",
      label: ui.traditional,
      cls: "bg-primary/15 text-primary border-primary/30",
    },
    Caution: {
      shortCode: "!",
      label: ui.caution,
      cls: "bg-warning/15 text-warning-foreground border-warning/40",
    },
  } satisfies Record<EvidenceTier, EvidenceBadgeMeta>;
}

function EvidenceBadge({ meta }: { meta: EvidenceBadgeMeta }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] whitespace-nowrap ${meta.cls}`}
    >
      <span>{meta.shortCode}</span>
      <span className="opacity-70">·</span>
      <span>{meta.label}</span>
    </span>
  );
}

function localizePriority(priority: string, ui: ResultUiLabels) {
  if (priority === "primary") return ui.primary;
  if (priority === "complementary") return ui.complementary;
  return ui.optional;
}

function localizeSeverity(severity: string, ui: ResultUiLabels) {
  if (severity === "severe") return ui.severe;
  if (severity === "moderate") return ui.moderate;
  if (severity === "mild") return ui.mild;
  return ui.info;
}

function localizeLikelihood(likelihood: string, ui: ResultUiLabels) {
  if (likelihood === "high") return ui.high;
  if (likelihood === "moderate") return ui.moderate;
  return ui.low;
}

function localizeWarningType(type: string, ui: ResultUiLabels) {
  if (type === "herb-drug-interaction") return ui.herbDrugInteraction;
  if (type === "contraindication") return ui.contraindication;
  if (type === "allergy") return ui.allergy;
  if (type === "cross-modality-conflict") return ui.crossModalityConflict;
  if (type === "red-flag") return ui.redFlag;
  return ui.general;
}

function localizeSourceModality(modality: string | undefined, lang: LanguageCode, ui: ResultUiLabels) {
  if (!modality) return "";
  if (modality === "Cross-modality") return ui.crossModality;
  return getLocalizedModalityLabel(modality as Modality, lang);
}

const Results = () => {
  const navigate = useNavigate();
  const [sourcePlan, setSourcePlan] = useState<IntegrativePlan | null>(null);
  const [plan, setPlan] = useState<IntegrativePlan | null>(null);
  const [lang, setLang] = useState<LanguageCode>("en");
  const [ui, setUi] = useState<ResultUiLabels>(RESULT_UI_ENGLISH);
  const [loading, setLoading] = useState(true);
  const [localizing, setLocalizing] = useState(false);

  useEffect(() => {
    const raw = sessionStorage.getItem("sanjeevani:plan");
    if (!raw) {
      navigate("/intake");
      return;
    }

    try {
      const parsed = JSON.parse(raw) as IntegrativePlan;
      setSourcePlan(parsed);
      setLang(getStoredResultLanguage() ?? inferLanguageFromPlan(parsed));
    } catch {
      navigate("/intake");
      return;
    }

    setLoading(false);
  }, [navigate]);

  useEffect(() => {
    if (!sourcePlan) return;

    let cancelled = false;

    const localize = async () => {
      setLocalizing(true);
      try {
        const [localizedPlan, localizedUi] = await Promise.all([
          localizePlanForLanguage(sourcePlan, lang),
          getLocalizedUiLabels(lang),
        ]);

        if (cancelled) return;
        setPlan(localizedPlan.plan);
        setUi(localizedUi);
        sessionStorage.setItem("sanjeevani:result-language", lang);
      } finally {
        if (!cancelled) setLocalizing(false);
      }
    };

    void localize();

    return () => {
      cancelled = true;
    };
  }, [lang, sourcePlan]);

  const riskMeta = useMemo(() => buildRiskMeta(ui), [ui]);
  const tierMeta = useMemo(() => buildTierMeta(ui), [ui]);

  if (loading || !sourcePlan) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <main className="container py-20 max-w-4xl">
          <div className="rounded-3xl border border-border/70 bg-card p-10 shadow-soft flex items-center justify-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span>{RESULT_UI_ENGLISH.loadingResult}</span>
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader lang={lang} onLangChange={setLang} />
        <main className="container py-20 max-w-4xl">
          <div className="rounded-3xl border border-border/70 bg-card p-10 shadow-soft flex items-center justify-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span>{ui.updatingLanguage}</span>
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  const meta = riskMeta[plan.risk_level];

  return (
    <div className="min-h-screen bg-background" lang={lang}>
      <SiteHeader lang={lang} onLangChange={setLang} />
      <main className="container py-10 max-w-5xl">
        <Button variant="ghost" asChild className="mb-6 rounded-full -ml-3">
          <Link to="/intake">
            <ArrowLeft className="mr-1.5 h-4 w-4" /> {ui.newIntake}
          </Link>
        </Button>

        {localizing && (
          <div className="mb-4 rounded-2xl border border-primary/20 bg-primary-soft/60 px-4 py-3 text-sm text-primary flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>{ui.updatingLanguage}</span>
          </div>
        )}

        <section className="relative overflow-hidden rounded-3xl border bg-card p-7 md:p-10 shadow-elegant animate-fade-up">
          <div className={`absolute inset-x-0 top-0 h-1.5 ${meta.bg}`} />
          <div className="flex flex-col md:flex-row md:items-center gap-6 md:gap-10">
            <div className="flex items-center gap-5">
              <div className={`relative h-16 w-16 rounded-2xl ${meta.bg} flex items-center justify-center shadow-glow ${plan.risk_level === "emergent" ? "animate-pulse-ring" : ""}`}>
                <ShieldCheck className="h-8 w-8 text-white" />
              </div>
              <div>
                <div className={`text-xs font-bold tracking-[0.22em] ${meta.text}`}>{meta.label}</div>
                <div className="font-display text-3xl md:text-4xl font-semibold mt-1 tracking-tight">{meta.subtitle}</div>
                <div className="text-sm text-muted-foreground mt-1">
                  {ui.confidence}: {(plan.confidence * 100).toFixed(0)}%
                </div>
              </div>
            </div>
            <div className="md:ml-auto md:max-w-md">
              <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground font-semibold mb-1">{ui.recommendedCarePath}</div>
              <div className="text-foreground leading-relaxed">{plan.translation.care_path || plan.care_path}</div>
              <div className="text-xs text-muted-foreground mt-2">
                {ui.route}: {getLocalizedRouteLabel(plan.clinical_route, lang)}
                {plan.specialist_referral && <> · {plan.specialist_referral}</>}
              </div>
              {plan.llm_metadata?.enabled && (
                <div className="text-xs text-muted-foreground mt-1">
                  {plan.llm_metadata.available
                    ? `${ui.offlineModel}: ${plan.llm_metadata.model}`
                    : ui.offlineModelFallback}
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-3xl border border-border/70 bg-gradient-soft p-7 md:p-9 shadow-soft">
          <div className="flex items-center justify-between gap-4 mb-4 flex-wrap">
            <div className="flex items-center gap-2 text-primary">
              <Languages className="h-5 w-5" />
              <span className="font-semibold">
                {ui.patientSummary} — {plan.translation.language}
              </span>
              {typeof plan.back_translation_confidence === "number" && (
                <span
                  className={`ml-2 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                    plan.back_translation_confidence >= 0.9
                      ? "bg-risk-selfcare/15 text-risk-selfcare border border-risk-selfcare/30"
                      : plan.back_translation_confidence >= 0.75
                        ? "bg-risk-routine/15 text-risk-routine border border-risk-routine/30"
                        : "bg-warning/15 text-warning-foreground border border-warning/40"
                  }`}
                  title={`${ui.backTranslation} fidelity score`}
                >
                  {ui.backTranslation} {(plan.back_translation_confidence * 100).toFixed(0)}%
                </span>
              )}
              {plan.translation.quality_mode && (
                <span className="rounded-full border border-border px-2.5 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                  {plan.translation.quality_mode}
                </span>
              )}
            </div>
          </div>
          <p className="text-lg leading-relaxed text-foreground" lang={lang}>
            {plan.translation.summary}
          </p>
          {plan.translation.top_actions.length > 0 && (
            <ul className="mt-5 space-y-2">
              {plan.translation.top_actions.map((action, index) => (
                <li key={index} className="flex gap-3">
                  <span className="mt-1.5 inline-block h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                  <span>{action}</span>
                </li>
              ))}
            </ul>
          )}
          {plan.translation.glossary_hits.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
              {plan.translation.glossary_hits.map((term) => (
                <span key={term} className="rounded-full border border-primary/20 bg-primary-soft px-3 py-1 text-xs text-primary">
                  {ui.glossary}: {term}
                </span>
              ))}
            </div>
          )}
        </section>

        {plan.suspected_conditions && plan.suspected_conditions.length > 0 && (
          <section className="mt-6">
            <h2 className="font-display text-2xl font-semibold mb-4">{ui.suspectedConditions}</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {plan.suspected_conditions.map((condition, index) => (
                <div key={index} className="rounded-2xl border border-border/70 bg-card p-5 shadow-soft">
                  <div className="flex items-start justify-between gap-3">
                    <div className="font-semibold">{condition.name}</div>
                    <span className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                      condition.likelihood === "high"
                        ? "border-risk-urgent/40 text-risk-urgent bg-risk-urgent/10"
                        : condition.likelihood === "moderate"
                          ? "border-risk-routine/40 text-risk-routine bg-risk-routine/10"
                          : "border-border text-muted-foreground"
                    }`}>
                      {localizeLikelihood(condition.likelihood, ui)}
                    </span>
                  </div>
                  <div className="mt-1.5 text-xs text-muted-foreground space-x-3">
                    {condition.icd10 && (
                      <span>
                        {ui.icd10}: <span className="font-mono text-foreground/70">{condition.icd10}</span>
                      </span>
                    )}
                    {condition.ayurveda_dosha && (
                      <span>
                        {ui.dosha}: <span className="text-foreground/70">{condition.ayurveda_dosha}</span>
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {plan.warnings.length > 0 && (
          <section className="mt-6 rounded-3xl border border-warning/30 bg-warning/5 p-6 md:p-7">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="h-5 w-5 text-warning" />
              <h2 className="font-display text-2xl font-semibold">{ui.safetyReview}</h2>
            </div>
            <ul className="space-y-3">
              {plan.warnings.map((warning, index) => (
                <li key={index} className="flex gap-3 rounded-xl bg-card border border-border/70 p-4">
                  <span className={`mt-0.5 inline-flex h-6 px-2 items-center rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                    warning.severity === "severe"
                      ? "bg-risk-emergent text-white"
                      : warning.severity === "moderate"
                        ? "bg-warning text-warning-foreground"
                        : "bg-secondary text-secondary-foreground"
                  }`}>
                    {localizeSeverity(warning.severity, ui)}
                  </span>
                  <div>
                    <div className="text-xs uppercase tracking-wider text-muted-foreground">{localizeWarningType(warning.type, ui)}</div>
                    <div className="text-foreground mt-0.5">{warning.message}</div>
                    {warning.resolution && (
                      <div className="text-sm text-muted-foreground mt-1">
                        {ui.resolution}: {warning.resolution}
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="mt-8">
          <h2 className="font-display text-3xl font-semibold mb-5">{ui.integrativePlan}</h2>
          <div className="grid gap-5 lg:grid-cols-2">
            {plan.plan_segments.map((segment, index) => {
              const Icon = MODALITY_ICON[segment.modality];
              const isPrimary = segment.priority === "primary";
              return (
                <div
                  key={index}
                  className={`rounded-3xl border p-6 md:p-7 shadow-soft transition-smooth ${
                    segment.selected
                      ? isPrimary
                        ? "border-primary/50 bg-card shadow-glow"
                        : "border-border/70 bg-card"
                      : "border-border/50 bg-muted/30"
                  }`}
                >
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-3">
                      <div className={`h-11 w-11 rounded-xl flex items-center justify-center ${isPrimary ? "bg-gradient-primary text-primary-foreground" : "bg-primary-soft text-primary"}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="font-display text-xl font-semibold">
                          {getLocalizedModalityLabel(segment.modality, lang)}
                        </div>
                        <div className="text-xs uppercase tracking-wider text-muted-foreground">
                          {localizePriority(segment.priority, ui)} {segment.selected ? `· ${ui.activePath}` : `· ${ui.optionalPath}`}
                        </div>
                      </div>
                    </div>
                  </div>
                  <ul className="space-y-4">
                    {segment.recommendations.map((recommendation, recommendationIndex) => (
                      <li key={recommendationIndex} className="border-l-2 border-primary/30 pl-4">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div className="font-semibold text-foreground">{recommendation.title}</div>
                          <EvidenceBadge meta={tierMeta[recommendation.evidence_tier]} />
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">{recommendation.detail}</p>
                        {recommendation.when_to_use && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            {ui.whenToUse}: {recommendation.when_to_use}
                          </p>
                        )}
                        {recommendation.safety_note && (
                          <p className="mt-1 text-xs text-warning-foreground">
                            {ui.safety}: {recommendation.safety_note}
                          </p>
                        )}
                        {recommendation.source && (
                          <div className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                            <BookOpen className="h-3 w-3" />
                            <span>{recommendation.source}</span>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        </section>

        {plan.red_flags_to_watch && plan.red_flags_to_watch.length > 0 && (
          <section className="mt-8 rounded-3xl border border-risk-urgent/30 bg-risk-urgent/5 p-6 md:p-7">
            <h2 className="font-display text-xl font-semibold mb-3 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-risk-urgent" />
              {ui.watchForThese}
            </h2>
            <ul className="grid sm:grid-cols-2 gap-2">
              {plan.red_flags_to_watch.map((flag, index) => (
                <li key={index} className="flex gap-2 text-sm">
                  <span className="mt-1.5 inline-block h-1.5 w-1.5 rounded-full bg-risk-urgent shrink-0" />
                  {flag}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="mt-8 rounded-3xl border border-border/70 bg-card p-6 md:p-7">
          <h2 className="font-display text-xl font-semibold mb-2">{ui.whyThisPlan}</h2>
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">{ui.triggeredRules}</div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {plan.explainability.triggered_rules.map((rule) => (
                  <li key={rule} className="rounded-xl bg-muted/60 px-3 py-2 text-foreground/80">
                    {rule}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">{ui.hybridTriage}</div>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div>{ui.logisticProbability}: {(plan.explainability.triage_model.logistic_probability * 100).toFixed(0)}%</div>
                <div>{ui.boostingScore}: {(plan.explainability.triage_model.gradient_boosting_score * 100).toFixed(0)}%</div>
                <div>{ui.ensembleProbability}: {(plan.explainability.triage_model.ensemble_probability * 100).toFixed(0)}%</div>
              </div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">{ui.riskFactors}</div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {plan.explainability.risk_factors.map((factor) => (
                  <li key={factor} className="flex gap-2">
                    <span className="mt-1.5 inline-block h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                    <span>{factor}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">{ui.normalizedSymptoms}</div>
              <div className="flex flex-wrap gap-2">
                {plan.explainability.normalized_symptoms.map((symptom) => (
                  <span key={symptom.normalized} className="rounded-full border border-border px-3 py-1 text-xs">
                    {symptom.normalized} · {localizeSeverity(symptom.severity, ui)}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">{ui.safetyChecks}</div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {plan.explainability.safety_checks.map((check) => (
                  <li key={check} className="flex gap-2">
                    <span className="mt-1.5 inline-block h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                    <span>{check}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">{ui.evidenceTrace}</div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {plan.explainability.evidence_trace.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="mt-1.5 inline-block h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">{ui.workflowTrace}</div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {plan.explainability.workflow_trace.map((item) => (
                  <li key={item} className="rounded-xl bg-muted/60 px-3 py-2 text-foreground/80">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="mt-4 text-xs text-muted-foreground italic border-t border-border/60 pt-4">{plan.disclaimer}</div>
        </section>

        <section className="mt-8 rounded-3xl border border-border/70 bg-card p-6 md:p-7">
          <h2 className="font-display text-xl font-semibold mb-2">{ui.safetyResolutionAgent}</h2>
          <p className="text-muted-foreground leading-relaxed">{plan.safety_review}</p>
        </section>

        <section className="mt-8 rounded-3xl border border-border/70 bg-card p-6 md:p-7">
          <h2 className="font-display text-xl font-semibold mb-3 flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            {ui.provenance}
          </h2>
          <div className="grid gap-3 md:grid-cols-2">
            {plan.provenance.map((source) => (
              <div key={source.id} className="rounded-2xl border border-border/70 bg-muted/30 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-medium">{source.title}</div>
                  <EvidenceBadge meta={tierMeta[source.reliability_tier]} />
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{source.citation}</p>
                <div className="mt-2 text-xs uppercase tracking-wider text-muted-foreground">
                  {localizeSourceModality(source.modality, lang, ui)}
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="mt-10 flex flex-wrap gap-3 justify-center">
          <Button asChild variant="outline" className="rounded-full">
            <Link to="/intake">{ui.startNewIntake}</Link>
          </Button>
          <Button asChild className="rounded-full bg-gradient-primary text-primary-foreground shadow-glow">
            <Link to="/clinician">{ui.requestClinicianReview}</Link>
          </Button>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
};

export default Results;

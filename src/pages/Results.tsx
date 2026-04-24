import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  MessageSquareQuote,
  Home,
  Languages,
  Leaf,
  Loader2,
  ShieldCheck,
  Stethoscope,
  Droplets,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { useLanguage } from "@/contexts/LanguageContext";
import { LANGUAGES, getLanguageNative, type LanguageCode } from "@/lib/languages";
import { addAuditEntry } from "@/lib/localStore";
import { sanitizeTextList } from "@/lib/textSanitizers";
import { getLocalizedModalityLabel, getLocalizedRouteLabel, localizePlanForLanguage } from "@/lib/planLocalization";
import type { EvidenceTier, IntegrativePlan, Modality, RiskLevel } from "@/lib/types";
import { toast } from "sonner";

interface EvidenceBadgeMeta {
  shortCode: string;
  label: string;
  cls: string;
}

interface PrioritizedTreatmentView {
  primary: IntegrativePlan["plan_segments"][number];
  secondary: IntegrativePlan["plan_segments"][number] | null;
  homeSupport: IntegrativePlan["plan_segments"][number] | null;
}

interface TreatmentCardConfig {
  key: "primary" | "secondary" | "home";
  heading: string;
  segment: IntegrativePlan["plan_segments"][number] | null;
  emphasis: "primary" | "secondary" | "home";
}

const MODALITY_ICON: Record<Modality, typeof Stethoscope> = {
  Allopathy: Stethoscope,
  Ayurveda: Leaf,
  Homeopathy: Droplets,
  "Home Remedies": Home,
};

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

function buildRiskMeta(t: (key: string, values?: Record<string, string | number>) => string) {
  return {
    emergent: {
      label: t("riskEmergent"),
      ring: "ring-risk-emergent/40",
      bg: "bg-risk-emergent",
      text: "text-risk-emergent",
      subtitle: t("riskEmergentSubtitle"),
    },
    urgent: {
      label: t("riskUrgent"),
      ring: "ring-risk-urgent/40",
      bg: "bg-risk-urgent",
      text: "text-risk-urgent",
      subtitle: t("riskUrgentSubtitle"),
    },
    routine: {
      label: t("riskRoutine"),
      ring: "ring-risk-routine/40",
      bg: "bg-risk-routine",
      text: "text-risk-routine",
      subtitle: t("riskRoutineSubtitle"),
    },
    "self-care": {
      label: t("riskSelfCare"),
      ring: "ring-risk-selfcare/40",
      bg: "bg-risk-selfcare",
      text: "text-risk-selfcare",
      subtitle: t("riskSelfCareSubtitle"),
    },
  } satisfies Record<RiskLevel, { label: string; ring: string; bg: string; text: string; subtitle: string }>;
}

function buildTierMeta(t: (key: string, values?: Record<string, string | number>) => string) {
  return {
    A: {
      shortCode: "A",
      label: t("strongEvidence"),
      cls: "bg-risk-selfcare/15 text-risk-selfcare border-risk-selfcare/30",
    },
    B: {
      shortCode: "B",
      label: t("observational"),
      cls: "bg-risk-routine/15 text-risk-routine border-risk-routine/30",
    },
    T: {
      shortCode: "T",
      label: t("traditional"),
      cls: "bg-primary/15 text-primary border-primary/30",
    },
    Caution: {
      shortCode: "!",
      label: t("caution"),
      cls: "bg-warning/15 text-warning-foreground border-warning/40",
    },
  } satisfies Record<EvidenceTier, EvidenceBadgeMeta>;
}

function EvidenceBadge({ meta }: { meta: EvidenceBadgeMeta }) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] whitespace-nowrap ${meta.cls}`}
    >
      <span>{meta.shortCode}</span>
      <span className="opacity-55">•</span>
      <span>{meta.label}</span>
    </span>
  );
}

function localizePriority(
  priority: string,
  t: (key: string, values?: Record<string, string | number>) => string,
) {
  if (priority === "primary") return t("primary");
  if (priority === "complementary") return t("complementary");
  return t("optional");
}

function localizeSeverity(
  severity: string,
  t: (key: string, values?: Record<string, string | number>) => string,
) {
  if (severity === "severe") return t("severe");
  if (severity === "moderate") return t("moderate");
  if (severity === "mild") return t("mild");
  return t("info");
}

function localizeLikelihood(
  likelihood: string,
  t: (key: string, values?: Record<string, string | number>) => string,
) {
  if (likelihood === "high") return t("high");
  if (likelihood === "moderate") return t("moderate");
  return t("low");
}

function localizeWarningType(
  type: string,
  t: (key: string, values?: Record<string, string | number>) => string,
) {
  if (type === "herb-drug-interaction") return t("herbDrugInteraction");
  if (type === "contraindication") return t("contraindication");
  if (type === "allergy") return t("allergy");
  if (type === "cross-modality-conflict") return t("crossModalityConflict");
  if (type === "red-flag") return t("redFlag");
  return t("general");
}

function localizeSourceModality(
  modality: string | undefined,
  lang: LanguageCode,
  t: (key: string, values?: Record<string, string | number>) => string,
) {
  if (!modality) return "";
  if (modality === "Cross-modality") return t("crossModality");
  return getLocalizedModalityLabel(modality as Modality, lang);
}

function localizeQualityMode(
  qualityMode: IntegrativePlan["translation"]["quality_mode"],
  t: (key: string, values?: Record<string, string | number>) => string,
) {
  if (qualityMode === "offline-llm") return t("qualityModeOfflineLlm");
  if (qualityMode === "glossary") return t("qualityModeGlossary");
  return qualityMode ?? "";
}

function buildPrioritizedTreatmentView(plan: IntegrativePlan): PrioritizedTreatmentView {
  const homeSupport =
    plan.plan_segments.find((segment) => segment.modality === "Home Remedies") || null;
  const nonHomeSegments = plan.plan_segments.filter((segment) => segment.modality !== "Home Remedies");

  const primary =
    nonHomeSegments.find((segment) => segment.selected && segment.priority === "primary") ||
    nonHomeSegments.find((segment) => segment.selected) ||
    nonHomeSegments.find((segment) => segment.priority === "primary") ||
    nonHomeSegments[0] ||
    homeSupport ||
    plan.plan_segments[0];

  const secondary =
    nonHomeSegments.find((segment) => segment.selected && segment.modality !== primary.modality) ||
    nonHomeSegments.find((segment) => segment.priority === "complementary" && segment.modality !== primary.modality) ||
    nonHomeSegments.find((segment) => segment.modality !== primary.modality) ||
    null;

  return {
    primary,
    secondary: secondary && secondary.modality !== primary.modality ? secondary : null,
    homeSupport,
  };
}

function getTreatmentCardTone(emphasis: TreatmentCardConfig["emphasis"]) {
  if (emphasis === "primary") {
    return {
      card: "border-primary/40 bg-card shadow-glow",
      icon: "bg-gradient-primary text-primary-foreground shadow-glow",
      pill: "bg-primary text-primary-foreground",
      lead: "border-primary/25 bg-primary-soft/35",
      support: "border-border/70 bg-background/95",
    };
  }

  if (emphasis === "home") {
    return {
      card: "border-primary/20 bg-[linear-gradient(180deg,rgba(234,248,250,0.96),rgba(255,255,255,0.96))]",
      icon: "bg-primary-soft text-primary",
      pill: "bg-primary/15 text-primary",
      lead: "border-primary/20 bg-white/80",
      support: "border-primary/15 bg-white/75",
    };
  }

  return {
    card: "border-border/70 bg-card shadow-soft",
    icon: "bg-primary-soft text-primary",
    pill: "bg-secondary text-secondary-foreground",
    lead: "border-border/70 bg-muted/20",
    support: "border-border/60 bg-background/95",
  };
}

const Results = () => {
  const navigate = useNavigate();
  const { language, setLanguage, t, isTranslating, translationWarning } = useLanguage();
  const [sourcePlan, setSourcePlan] = useState<IntegrativePlan | null>(null);
  const [plan, setPlan] = useState<IntegrativePlan | null>(null);
  const [loading, setLoading] = useState(true);
  const [localizing, setLocalizing] = useState(false);
  const [planTranslationWarning, setPlanTranslationWarning] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");
  const [feedbackSaving, setFeedbackSaving] = useState(false);

  useEffect(() => {
    const raw = sessionStorage.getItem("sanjeevani:plan");
    if (!raw) {
      navigate("/intake");
      return;
    }

    try {
      const parsed = JSON.parse(raw) as IntegrativePlan;
      const initialLanguage = getStoredResultLanguage() ?? inferLanguageFromPlan(parsed);
      setSourcePlan(parsed);
      setLanguage(initialLanguage);
      setLoading(false);
    } catch {
      navigate("/intake");
    }
  }, [navigate, setLanguage]);

  useEffect(() => {
    if (!sourcePlan) return;

    let cancelled = false;

    const localize = async () => {
      setLocalizing(true);
      try {
        const localizedPlan = await localizePlanForLanguage(sourcePlan, language);
        if (cancelled) return;
        setPlan(localizedPlan.plan);
        setPlanTranslationWarning(localizedPlan.translation_warning ?? null);
        sessionStorage.setItem("sanjeevani:result-language", language);
      } finally {
        if (!cancelled) setLocalizing(false);
      }
    };

    void localize();

    return () => {
      cancelled = true;
    };
  }, [language, sourcePlan]);

  const riskMeta = useMemo(() => buildRiskMeta(t), [t]);
  const tierMeta = useMemo(() => buildTierMeta(t), [t]);
  const activeWarnings = Array.from(new Set([translationWarning, planTranslationWarning].filter(Boolean))) as string[];
  const prioritizedTreatment = useMemo(
    () => (plan ? buildPrioritizedTreatmentView(plan) : null),
    [plan],
  );
  const summaryActions = useMemo(
    () => (plan ? sanitizeTextList(plan.translation.top_actions) : []),
    [plan],
  );

  const saveFeedback = () => {
    const notes = feedback.trim();
    if (!notes) {
      toast.error(t("feedbackRequired"));
      return;
    }

    setFeedbackSaving(true);
    try {
      const planId = sessionStorage.getItem("sanjeevani:plan-id") || "results-session";
      addAuditEntry({
        actor_id: null,
        action: "plan.feedback",
        resource_type: "plan",
        resource_id: planId,
        metadata: {
          notes,
          language,
          risk_level: plan?.risk_level ?? null,
        },
      });
      setFeedback("");
      toast.success(t("feedbackSaved"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("genericTryAgain"));
    } finally {
      setFeedbackSaving(false);
    }
  };

  if (loading || !sourcePlan) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <main className="container py-20 max-w-4xl">
          <div className="rounded-3xl border border-border/70 bg-card p-10 shadow-soft flex items-center justify-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span>{t("loadingResult")}</span>
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <main className="container py-20 max-w-4xl">
          <div className="rounded-3xl border border-border/70 bg-card p-10 shadow-soft flex items-center justify-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span>{t("translationLoading")}</span>
          </div>
        </main>
        <SiteFooter />
      </div>
    );
  }

  const meta = riskMeta[plan.risk_level];
  const prioritizedView = prioritizedTreatment || buildPrioritizedTreatmentView(plan);
  const treatmentCards: TreatmentCardConfig[] = [
    {
      key: "primary",
      heading: t("primaryTreatment"),
      segment: prioritizedView.primary,
      emphasis: "primary",
    },
    {
      key: "secondary",
      heading: t("secondaryTreatment"),
      segment: prioritizedView.secondary,
      emphasis: "secondary",
    },
    {
      key: "home",
      heading: t("moduleHomeRemediesTitle"),
      segment: prioritizedView.homeSupport,
      emphasis: "home",
    },
  ];
  const primaryTreatmentCard = treatmentCards[0];
  const supportingTreatmentCards = treatmentCards.slice(1);

  return (
    <div className="min-h-screen bg-background" lang={language}>
      <SiteHeader />
      <main className="container py-10 max-w-5xl">
        <Button variant="ghost" asChild className="mb-6 rounded-full -ml-3">
          <Link to="/intake">
            <ArrowLeft className="mr-1.5 h-4 w-4" /> {t("newIntake")}
          </Link>
        </Button>

        {(localizing || isTranslating) && (
          <div className="mb-4 rounded-2xl border border-primary/20 bg-primary-soft/60 px-4 py-3 text-sm text-primary flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>{t("translationLoading")}</span>
          </div>
        )}

        {activeWarnings.length > 0 && (
          <div className="mb-4 space-y-2">
            {activeWarnings.map((warning) => (
              <div
                key={warning}
                className="rounded-2xl border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning-foreground"
              >
                {warning}
              </div>
            ))}
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
                  {t("confidence")}: {(plan.confidence * 100).toFixed(0)}%
                </div>
              </div>
            </div>
            <div className="md:ml-auto md:max-w-md">
              <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground font-semibold mb-1">
                {t("recommendedCarePath")}
              </div>
              <div className="text-foreground leading-relaxed">{plan.translation.care_path || plan.care_path}</div>
              <div className="text-xs text-muted-foreground mt-2">
                {t("route")}: {getLocalizedRouteLabel(plan.clinical_route, language)}
                {plan.specialist_referral && <> · {plan.specialist_referral}</>}
              </div>
              {plan.llm_metadata?.enabled && (
                <div className="text-xs text-muted-foreground mt-1">
                  {plan.llm_metadata.available
                    ? `${t("offlineModel")}: ${plan.llm_metadata.model}`
                    : t("offlineModelFallback")}
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
                {t("patientSummary")} — {plan.translation.language}
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
                  title={`${t("backTranslation")} fidelity score`}
                >
                  {t("backTranslation")} {(plan.back_translation_confidence * 100).toFixed(0)}%
                </span>
              )}
              {plan.translation.quality_mode && (
                <span className="rounded-full border border-border px-2.5 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                  {localizeQualityMode(plan.translation.quality_mode, t)}
                </span>
              )}
            </div>
          </div>
          <p className="text-lg leading-relaxed text-foreground" lang={language}>
            {plan.translation.summary}
          </p>
          {summaryActions.length > 0 && (
            <ul className="mt-5 space-y-2">
              {summaryActions.map((action, index) => (
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
                  {t("glossary")}: {term}
                </span>
              ))}
            </div>
          )}
        </section>

        {plan.suspected_conditions && plan.suspected_conditions.length > 0 && (
          <section className="mt-6">
            <h2 className="font-display text-2xl font-semibold mb-4">{t("suspectedConditions")}</h2>
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
                      {localizeLikelihood(condition.likelihood, t)}
                    </span>
                  </div>
                  <div className="mt-1.5 text-xs text-muted-foreground space-x-3">
                    {condition.icd10 && (
                      <span>
                        {t("icd10")}: <span className="font-mono text-foreground/70">{condition.icd10}</span>
                      </span>
                    )}
                    {condition.ayurveda_dosha && (
                      <span>
                        {t("dosha")}: <span className="text-foreground/70">{condition.ayurveda_dosha}</span>
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
              <h2 className="font-display text-2xl font-semibold">{t("safetyReview")}</h2>
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
                    {localizeSeverity(warning.severity, t)}
                  </span>
                  <div>
                    <div className="text-xs uppercase tracking-wider text-muted-foreground">{localizeWarningType(warning.type, t)}</div>
                    <div className="text-foreground mt-0.5">{warning.message}</div>
                    {warning.resolution && (
                      <div className="text-sm text-muted-foreground mt-1">
                        {t("resolution")}: {warning.resolution}
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="mt-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between mb-5">
            <div>
              <h2 className="font-display text-3xl md:text-[2.6rem] font-semibold tracking-tight">
                {t("recommendedCarePlan")}
              </h2>
              <p className="mt-2 max-w-3xl text-sm md:text-base text-muted-foreground leading-relaxed">
                {plan.translation.care_path || plan.care_path}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="rounded-full border border-border bg-card px-3 py-1.5 text-muted-foreground">
                {t("route")}: {getLocalizedRouteLabel(plan.clinical_route, language)}
              </span>
              {plan.llm_metadata?.model && plan.llm_metadata.available && (
                <span className="rounded-full border border-primary/20 bg-primary-soft px-3 py-1.5 text-primary">
                  {t("offlineModel")}: {plan.llm_metadata.model}
                </span>
              )}
            </div>
          </div>

          <div className="space-y-5">
            {[primaryTreatmentCard].map((card, index) => {
              const segment = card.segment;
              const Icon = segment ? MODALITY_ICON[segment.modality] : Home;
              const tone = getTreatmentCardTone(card.emphasis);
              const leadRecommendation = segment?.recommendations[0] ?? null;
              const supportingRecommendations = segment?.recommendations.slice(1, card.key === "primary" ? 4 : 3) ?? [];

              return (
                <article
                  key={card.key}
                  className={`flex h-full flex-col rounded-[2rem] border p-5 md:p-6 shadow-soft ${tone.card}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${tone.icon}`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${tone.pill}`}>
                            {String(index + 1).padStart(2, "0")}
                          </span>
                          <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                            {card.heading}
                          </span>
                        </div>
                        {segment ? (
                          <>
                            <h3 className="font-display text-[2rem] leading-none font-semibold tracking-tight">
                              {getLocalizedModalityLabel(segment.modality, language)}
                            </h3>
                            <p className="mt-2 text-sm text-muted-foreground">
                              {t("modalityLabel")}: {localizePriority(segment.priority, t)}
                            </p>
                          </>
                        ) : (
                          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                            {card.key === "home" ? t("homeRemedySupport") : t("secondaryTreatmentHint")}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {segment && leadRecommendation ? (
                    <>
                      <div className={`mt-6 rounded-3xl border p-5 ${tone.lead}`}>
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                            {card.heading}
                          </div>
                          <EvidenceBadge meta={tierMeta[leadRecommendation.evidence_tier]} />
                        </div>
                        <h4 className="mt-3 text-xl font-semibold leading-snug text-foreground">
                          {leadRecommendation.title}
                        </h4>
                        <p className="mt-4 text-sm leading-7 text-foreground/80">
                          {leadRecommendation.detail}
                        </p>
                        {(leadRecommendation.when_to_use || leadRecommendation.safety_note) && (
                          <div className="mt-4 space-y-2 text-xs leading-6 text-muted-foreground">
                            {leadRecommendation.when_to_use && (
                              <p>
                                <span className="font-semibold text-foreground/80">{t("whenToUse")}:</span>{" "}
                                {leadRecommendation.when_to_use}
                              </p>
                            )}
                            {leadRecommendation.safety_note && (
                              <p className="text-warning-foreground">
                                <span className="font-semibold">{t("safetyNav")}:</span>{" "}
                                {leadRecommendation.safety_note}
                              </p>
                            )}
                          </div>
                        )}
                      </div>

                      {supportingRecommendations.length > 0 && (
                        <div className="mt-4 grid gap-3 auto-rows-fr lg:grid-cols-2">
                          {supportingRecommendations.map((recommendation, recommendationIndex) => (
                            <div key={recommendationIndex} className={`flex h-full flex-col rounded-2xl border p-4 ${tone.support}`}>
                              <div className="flex min-w-0 gap-3">
                                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-semibold text-primary">
                                  {recommendationIndex + 2}
                                </span>
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                                      {card.heading}
                                    </div>
                                    <EvidenceBadge meta={tierMeta[recommendation.evidence_tier]} />
                                  </div>
                                  <div className="mt-3 font-semibold leading-snug text-foreground">
                                    {recommendation.title}
                                  </div>
                                  <p className="mt-2 text-sm leading-7 text-muted-foreground">
                                    {recommendation.detail}
                                  </p>
                                </div>
                              </div>
                              {(recommendation.when_to_use || recommendation.safety_note) && (
                                <div className="mt-3 space-y-1 text-xs leading-6 text-muted-foreground sm:pl-10">
                                  {recommendation.when_to_use && (
                                    <p>
                                      <span className="font-semibold text-foreground/80">{t("whenToUse")}:</span>{" "}
                                      {recommendation.when_to_use}
                                    </p>
                                  )}
                                  {recommendation.safety_note && (
                                    <p className="text-warning-foreground">
                                      <span className="font-semibold">{t("safetyNav")}:</span>{" "}
                                      {recommendation.safety_note}
                                    </p>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className={`mt-6 rounded-3xl border p-5 text-sm text-muted-foreground ${tone.lead}`}>
                      {card.key === "home" ? t("homeRemedySupport") : t("secondaryTreatmentHint")}
                    </div>
                  )}
                </article>
              );
            })}

            <div className="grid gap-5 lg:grid-cols-2">
              {supportingTreatmentCards.map((card, index) => {
                const segment = card.segment;
                const Icon = segment ? MODALITY_ICON[segment.modality] : Home;
                const tone = getTreatmentCardTone(card.emphasis);
                const leadRecommendation = segment?.recommendations[0] ?? null;
                const supportingRecommendations = segment?.recommendations.slice(1, card.key === "primary" ? 4 : 3) ?? [];

                return (
                  <article
                    key={card.key}
                    className={`flex h-full flex-col rounded-[2rem] border p-5 md:p-6 shadow-soft ${tone.card}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${tone.icon}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="mb-2 flex flex-wrap items-center gap-2">
                            <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${tone.pill}`}>
                              {String(index + 2).padStart(2, "0")}
                            </span>
                            <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                              {card.heading}
                            </span>
                          </div>
                          {segment ? (
                            <>
                              <h3 className="font-display text-[2rem] leading-none font-semibold tracking-tight">
                                {getLocalizedModalityLabel(segment.modality, language)}
                              </h3>
                              <p className="mt-2 text-sm text-muted-foreground">
                                {t("modalityLabel")}: {localizePriority(segment.priority, t)}
                              </p>
                            </>
                          ) : (
                            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                              {card.key === "home" ? t("homeRemedySupport") : t("secondaryTreatmentHint")}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {segment && leadRecommendation ? (
                      <>
                        <div className={`mt-6 rounded-3xl border p-5 ${tone.lead}`}>
                          <div className="flex flex-wrap items-center gap-2">
                            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                              {card.heading}
                            </div>
                            <EvidenceBadge meta={tierMeta[leadRecommendation.evidence_tier]} />
                          </div>
                          <h4 className="mt-3 text-xl font-semibold leading-snug text-foreground">
                            {leadRecommendation.title}
                          </h4>
                          <p className="mt-4 text-sm leading-7 text-foreground/80">
                            {leadRecommendation.detail}
                          </p>
                          {(leadRecommendation.when_to_use || leadRecommendation.safety_note) && (
                            <div className="mt-4 space-y-2 text-xs leading-6 text-muted-foreground">
                              {leadRecommendation.when_to_use && (
                                <p>
                                  <span className="font-semibold text-foreground/80">{t("whenToUse")}:</span>{" "}
                                  {leadRecommendation.when_to_use}
                                </p>
                              )}
                              {leadRecommendation.safety_note && (
                                <p className="text-warning-foreground">
                                  <span className="font-semibold">{t("safetyNav")}:</span>{" "}
                                  {leadRecommendation.safety_note}
                                </p>
                              )}
                            </div>
                          )}
                        </div>

                        {supportingRecommendations.length > 0 && (
                          <div className="mt-4 grid gap-3 auto-rows-fr">
                            {supportingRecommendations.map((recommendation, recommendationIndex) => (
                              <div key={recommendationIndex} className={`flex h-full flex-col rounded-2xl border p-4 ${tone.support}`}>
                                <div className="flex min-w-0 gap-3">
                                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-semibold text-primary">
                                    {recommendationIndex + 2}
                                  </span>
                                  <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                                        {card.heading}
                                      </div>
                                      <EvidenceBadge meta={tierMeta[recommendation.evidence_tier]} />
                                    </div>
                                    <div className="mt-3 font-semibold leading-snug text-foreground">
                                      {recommendation.title}
                                    </div>
                                    <p className="mt-2 text-sm leading-7 text-muted-foreground">
                                      {recommendation.detail}
                                    </p>
                                  </div>
                                </div>
                                {(recommendation.when_to_use || recommendation.safety_note) && (
                                  <div className="mt-3 space-y-1 text-xs leading-6 text-muted-foreground sm:pl-10">
                                    {recommendation.when_to_use && (
                                      <p>
                                        <span className="font-semibold text-foreground/80">{t("whenToUse")}:</span>{" "}
                                        {recommendation.when_to_use}
                                      </p>
                                    )}
                                    {recommendation.safety_note && (
                                      <p className="text-warning-foreground">
                                        <span className="font-semibold">{t("safetyNav")}:</span>{" "}
                                        {recommendation.safety_note}
                                      </p>
                                    )}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className={`mt-6 rounded-3xl border p-5 text-sm text-muted-foreground ${tone.lead}`}>
                        {card.key === "home" ? t("homeRemedySupport") : t("secondaryTreatmentHint")}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {plan.red_flags_to_watch && plan.red_flags_to_watch.length > 0 && (
          <section className="mt-8 rounded-3xl border border-risk-urgent/30 bg-risk-urgent/5 p-6 md:p-7">
            <h2 className="font-display text-xl font-semibold mb-3 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-risk-urgent" />
              {t("watchForThese")}
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
          <h2 className="font-display text-xl font-semibold mb-2">{t("whyThisPlan")}</h2>
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">{t("triggeredRules")}</div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {plan.explainability.triggered_rules.map((rule) => (
                  <li key={rule} className="rounded-xl bg-muted/60 px-3 py-2 text-foreground/80">
                    {rule}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">{t("hybridTriage")}</div>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div>{t("logisticProbability")}: {(plan.explainability.triage_model.logistic_probability * 100).toFixed(0)}%</div>
                <div>{t("boostingScore")}: {(plan.explainability.triage_model.gradient_boosting_score * 100).toFixed(0)}%</div>
                <div>{t("ensembleProbability")}: {(plan.explainability.triage_model.ensemble_probability * 100).toFixed(0)}%</div>
              </div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">{t("riskFactors")}</div>
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
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">{t("normalizedSymptoms")}</div>
              <div className="flex flex-wrap gap-2">
                {plan.explainability.normalized_symptoms.map((symptom) => (
                  <span key={`${symptom.normalized}-${symptom.severity}`} className="rounded-full border border-border px-3 py-1 text-xs">
                    {symptom.normalized} · {localizeSeverity(symptom.severity, t)}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">{t("safetyChecks")}</div>
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
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">{t("evidenceTrace")}</div>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {plan.explainability.evidence_trace.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="mt-1.5 inline-block h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="mt-4 text-xs text-muted-foreground italic border-t border-border/60 pt-4">{plan.disclaimer}</div>
        </section>

        <section className="mt-8 rounded-3xl border border-border/70 bg-card p-6 md:p-7">
          <h2 className="font-display text-xl font-semibold mb-2">{t("safetyResolutionAgent")}</h2>
          <p className="text-muted-foreground leading-relaxed">{plan.safety_review}</p>
        </section>

        <section className="mt-8 rounded-3xl border border-border/70 bg-card p-6 md:p-7">
          <h2 className="font-display text-xl font-semibold mb-3 flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            {t("provenance")}
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
                  {localizeSourceModality(source.modality, language, t)}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8 rounded-3xl border border-border/70 bg-card p-6 md:p-7">
          <h2 className="font-display text-xl font-semibold mb-2 flex items-center gap-2">
            <MessageSquareQuote className="h-5 w-5 text-primary" />
            {t("resultsFeedbackTitle")}
          </h2>
          <p className="text-sm text-muted-foreground mb-4">{t("resultsFeedbackDescription")}</p>
          <Textarea
            value={feedback}
            onChange={(event) => setFeedback(event.target.value)}
            placeholder={t("resultsFeedbackPlaceholder")}
            rows={4}
            className="rounded-2xl"
          />
          <div className="mt-4 flex justify-end">
            <Button
              type="button"
              onClick={saveFeedback}
              disabled={feedbackSaving}
              className="rounded-full bg-gradient-primary text-primary-foreground shadow-glow"
            >
              {feedbackSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {t("submitFeedback")}
            </Button>
          </div>
        </section>

        <div className="mt-10 flex flex-wrap gap-3 justify-center">
          <Button asChild variant="outline" className="rounded-full">
            <Link to="/intake">{t("startNewIntake")}</Link>
          </Button>
          <Button asChild className="rounded-full bg-gradient-primary text-primary-foreground shadow-glow">
            <Link to="/clinician">{t("requestClinicianReview")}</Link>
          </Button>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
};

export default Results;

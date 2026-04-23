import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Clock3,
  Loader2,
  LogIn,
  Mic,
  MicOff,
  RefreshCw,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { OfflineModelPanel } from "@/components/OfflineModelPanel";
import { usePatient } from "@/contexts/PatientContext";
import { LANGUAGES, getLanguageName, type LanguageCode, t } from "@/lib/languages";
import { buildIntakePayload, generateIntegrativePlan } from "@/lib/clinicalEngine";
import { createIntakeSessionRecord, saveGeneratedPlan } from "@/lib/localStore";
import { getLatestPatientHistory, savePatientHistoryRecord } from "@/lib/offlinePatientDb";
import type { IntakeData, PatientHistoryRecord } from "@/lib/types";
import { toast } from "sonner";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";

const PREF_OPTIONS = [
  { value: "allopathy", label: "Allopathy" },
  { value: "ayurveda", label: "Ayurveda" },
  { value: "homeopathy", label: "Homeopathy" },
  { value: "home remedies", label: "Home remedies" },
];

const SEX_OPTIONS = [
  { value: "", label: "Select" },
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
  { value: "other", label: "Other" },
];

const SEVERITY_OPTIONS = [
  { value: "mild", label: "Mild" },
  { value: "moderate", label: "Moderate" },
  { value: "severe", label: "Severe" },
];

const PREGNANCY_OPTIONS = [
  { value: "", label: "Not stated" },
  { value: "not-applicable", label: "Not applicable" },
  { value: "not-pregnant", label: "Not pregnant" },
  { value: "pregnant", label: "Pregnant" },
  { value: "postpartum", label: "Postpartum" },
];

const SMOKING_OPTIONS = [
  { value: "", label: "Not stated" },
  { value: "never", label: "Never" },
  { value: "former", label: "Former" },
  { value: "current", label: "Current" },
];

const ALCOHOL_OPTIONS = [
  { value: "", label: "Not stated" },
  { value: "none", label: "None" },
  { value: "occasional", label: "Occasional" },
  { value: "regular", label: "Regular" },
];

const SLEEP_OPTIONS = [
  { value: "", label: "Not stated" },
  { value: "poor", label: "Poor" },
  { value: "fair", label: "Fair" },
  { value: "good", label: "Good" },
];

const APPETITE_OPTIONS = [
  { value: "", label: "Not stated" },
  { value: "reduced", label: "Reduced" },
  { value: "normal", label: "Normal" },
  { value: "increased", label: "Increased" },
];

const EMPTY_DATA: IntakeData = {
  language: "English",
  language_code: "en",
  symptoms: "",
  duration: "",
  preferences: ["allopathy"],
  symptom_severity: "moderate",
  smoking_status: "never",
  alcohol_use: "none",
  sleep_quality: "fair",
  appetite_status: "normal",
  pregnancy_status: "not-applicable",
};

function selectClassName() {
  return "mt-2 h-10 w-full rounded-xl border border-input bg-background px-3 text-sm";
}

function hydrateFormFromHistory(record: PatientHistoryRecord, languageCode: LanguageCode): IntakeData {
  return {
    ...EMPTY_DATA,
    ...record.intake,
    language: getLanguageName(languageCode),
    language_code: languageCode,
    preferences:
      record.intake.preferences && record.intake.preferences.length > 0
        ? record.intake.preferences
        : ["allopathy"],
  };
}

function buildBlankIntakeData(
  languageCode: LanguageCode,
  patient?: { id: string; preferred_language?: string | undefined } | null,
): IntakeData {
  return {
    ...EMPTY_DATA,
    patient_id: patient?.id,
    language: getLanguageName(languageCode),
    language_code: languageCode,
  };
}

const Intake = () => {
  const navigate = useNavigate();
  const { patient, history, loading: patientLoading, refreshHistory } = usePatient();
  const [step, setStep] = useState(0);
  const [lang, setLang] = useState<LanguageCode>("en");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<IntakeData>(EMPTY_DATA);
  const [latestHistory, setLatestHistory] = useState<PatientHistoryRecord | null>(null);

  const speech = useSpeechRecognition(lang);

  const update = <K extends keyof IntakeData>(key: K, value: IntakeData[K]) =>
    setData((current) => ({ ...current, [key]: value }));

  const togglePref = (value: string) =>
    setData((current) => {
      const next = new Set(current.preferences || []);
      if (next.has(value)) {
        next.delete(value);
      } else {
        next.add(value);
      }
      return {
        ...current,
        preferences: Array.from(next),
      };
    });

  const onLangChange = (code: LanguageCode) => {
    setLang(code);
    update("language_code", code);
    update("language", getLanguageName(code));
    if (speech.listening) speech.stop();
  };

  const patientSummary = useMemo(() => {
    if (!latestHistory) return null;
    return {
      summary: latestHistory.summary || latestHistory.intake.symptoms,
      createdAt: new Date(latestHistory.created_at).toLocaleString(),
    };
  }, [latestHistory]);

  useEffect(() => {
    let cancelled = false;

    const loadLatestHistory = async () => {
      if (!patient) {
        if (!cancelled) {
          setLatestHistory(null);
        }
        return;
      }

      const record = await getLatestPatientHistory(patient.id).catch(() => null);
      if (cancelled) return;
      setLatestHistory(record);
    };

    void loadLatestHistory();
    return () => {
      cancelled = true;
    };
  }, [patient, history]);

  useEffect(() => {
    const preferredCode = (patient?.preferred_language as LanguageCode | undefined) || "en";
    setLang(preferredCode);
    setData(buildBlankIntakeData(preferredCode, patient));
    setStep(0);
  }, [patient]);

  const reuseLatestHistory = () => {
    if (!latestHistory || !patient) return;
    const nextLanguage = (latestHistory.language_code || patient.preferred_language || "en") as LanguageCode;
    setLang(nextLanguage);
    setData({
      ...hydrateFormFromHistory(latestHistory, nextLanguage),
      patient_id: patient.id,
      patient_name: patient.full_name,
      email: patient.email,
      phone: patient.phone || latestHistory.intake.phone || "",
    });
    toast.success("Previous patient data loaded into the intake form.");
  };

  const startBlankIntake = () => {
    const nextLanguage = (patient?.preferred_language as LanguageCode | undefined) || "en";
    setLang(nextLanguage);
    setData(buildBlankIntakeData(nextLanguage, patient));
    setStep(0);
    toast.success("Started a fresh blank intake form.");
  };

  const toggleVoice = () => {
    if (!speech.supported) {
      toast.error("Voice input isn't supported in this browser. Try Chrome or Edge.");
      return;
    }
    if (speech.listening) {
      speech.stop();
      return;
    }
    speech.start((finalText) => {
      setData((current) => ({
        ...current,
        symptoms: (current.symptoms ? `${current.symptoms.trimEnd()} ` : "") + finalText.trim(),
      }));
    });
  };

  const submit = async () => {
    if (!data.symptoms.trim() || !data.duration.trim()) {
      toast.error("Please describe your symptoms and how long you've had them.");
      return;
    }

    setLoading(true);
    try {
      const payload = buildIntakePayload(
        {
          ...data,
          patient_id: patient?.id || data.patient_id,
          patient_name: data.patient_name || patient?.full_name,
          email: data.email || patient?.email,
          phone: data.phone || patient?.phone,
          language: getLanguageName(lang),
          preferences:
            data.preferences && data.preferences.length > 0 ? data.preferences : ["allopathy"],
        },
        lang,
      );

      const plan = await generateIntegrativePlan(payload);
      const intakeSession = createIntakeSessionRecord(
        {
          ...payload,
          patient_hash: payload.patient_hash,
        },
        plan.normalized_symptoms || [],
      );
      const storedPlan = saveGeneratedPlan(intakeSession, plan);

      if (patient) {
        try {
          await savePatientHistoryRecord({
            patient,
            planId: storedPlan.id,
            intake: payload,
            plan,
          });
          await refreshHistory();
        } catch (historyError) {
          console.error(historyError);
          toast.error("The care plan was created, but local patient history could not be saved.");
        }
      }

      sessionStorage.setItem("sanjeevani:plan", JSON.stringify(storedPlan.plan_data));
      sessionStorage.setItem("sanjeevani:plan-id", storedPlan.id);
      sessionStorage.setItem("sanjeevani:intake", JSON.stringify(payload));
      sessionStorage.setItem("sanjeevani:result-language", payload.language_code || lang);
      navigate("/results");
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    {
      title: t(lang, "yourLanguage"),
      content: (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {LANGUAGES.map((language) => {
            const active = lang === language.code;
            return (
              <button
                key={language.code}
                type="button"
                onClick={() => onLangChange(language.code)}
                className={`rounded-2xl border p-5 text-left transition-smooth ${
                  active
                    ? "border-primary bg-primary-soft shadow-glow"
                    : "border-border bg-card hover:border-primary/40 hover:bg-primary-soft/40"
                }`}
              >
                <div className="font-display text-2xl font-semibold">{language.native}</div>
                <div className="text-xs text-muted-foreground mt-1">{language.name}</div>
              </button>
            );
          })}
        </div>
      ),
    },
    {
      title: "Patient profile",
      content: (
        <div className="space-y-5">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="patient-name" className="text-base">Patient name</Label>
              <Input
                id="patient-name"
                value={data.patient_name ?? ""}
                onChange={(event) => update("patient_name", event.target.value)}
                className="mt-2 rounded-xl"
                placeholder="Full name"
              />
            </div>
            <div>
              <Label htmlFor="patient-phone" className="text-base">Phone</Label>
              <Input
                id="patient-phone"
                value={data.phone ?? ""}
                onChange={(event) => update("phone", event.target.value)}
                className="mt-2 rounded-xl"
                placeholder="Mobile number"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="patient-email" className="text-base">Email</Label>
            <Input
              id="patient-email"
              type="email"
              value={data.email ?? ""}
              onChange={(event) => update("email", event.target.value)}
              className="mt-2 rounded-xl"
              placeholder="name@example.com"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="age" className="text-base">{t(lang, "age")}</Label>
              <Input
                id="age"
                type="number"
                min={0}
                max={120}
                value={data.age ?? ""}
                onChange={(event) => update("age", event.target.value ? Number(event.target.value) : undefined)}
                className="mt-2 rounded-xl"
              />
            </div>
            <div>
              <Label htmlFor="sex" className="text-base">{t(lang, "sex")}</Label>
              <select
                id="sex"
                value={data.sex ?? ""}
                onChange={(event) => update("sex", event.target.value || undefined)}
                className={selectClassName()}
              >
                {SEX_OPTIONS.map((option) => (
                  <option key={option.value || "blank"} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="rounded-2xl border border-border/70 bg-muted/30 p-4 text-sm text-muted-foreground">
            Contact and demographic details help clinician review, longitudinal patient history, and route selection.
          </div>
        </div>
      ),
    },
    {
      title: "Symptoms and vitals",
      content: (
        <div className="space-y-5">
          <div>
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="symptoms" className="text-base">{t(lang, "symptoms")}</Label>
              <Button
                type="button"
                size="sm"
                variant={speech.listening ? "default" : "outline"}
                onClick={toggleVoice}
                className={`rounded-full h-9 px-4 ${
                  speech.listening
                    ? "bg-gradient-primary text-primary-foreground shadow-glow animate-pulse"
                    : ""
                }`}
                aria-pressed={speech.listening}
                aria-label={speech.listening ? "Stop voice input" : "Start voice input"}
              >
                {speech.listening ? (
                  <>
                    <MicOff className="mr-1.5 h-4 w-4" /> Stop
                  </>
                ) : (
                  <>
                    <Mic className="mr-1.5 h-4 w-4" /> Speak
                  </>
                )}
              </Button>
            </div>
            <Textarea
              id="symptoms"
              rows={5}
              value={data.symptoms + (speech.interim ? (data.symptoms ? " " : "") + speech.interim : "")}
              onChange={(event) => update("symptoms", event.target.value)}
              placeholder={t(lang, "symptomsPlaceholder")}
              className="mt-2 rounded-xl text-base"
              maxLength={2000}
            />
            {speech.listening && (
              <p className="mt-1.5 text-xs text-primary flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-full bg-primary animate-pulse" />
                Listening in {LANGUAGES.find((language) => language.code === lang)?.native}…
              </p>
            )}
            {speech.error && <p className="mt-1.5 text-xs text-destructive">{speech.error}</p>}
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="duration" className="text-base">{t(lang, "duration")}</Label>
              <Input
                id="duration"
                value={data.duration}
                onChange={(event) => update("duration", event.target.value)}
                placeholder="e.g. 3 days, 2 weeks"
                className="mt-2 rounded-xl"
                maxLength={120}
              />
            </div>
            <div>
              <Label htmlFor="symptom-severity" className="text-base">Overall severity</Label>
              <select
                id="symptom-severity"
                value={data.symptom_severity ?? "moderate"}
                onChange={(event) => update("symptom_severity", event.target.value as IntakeData["symptom_severity"])}
                className={selectClassName()}
              >
                {SEVERITY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="pain-score" className="text-base">Pain score (0-10)</Label>
              <Input
                id="pain-score"
                type="number"
                min={0}
                max={10}
                value={data.pain_score ?? ""}
                onChange={(event) => update("pain_score", event.target.value ? Number(event.target.value) : undefined)}
                className="mt-2 rounded-xl"
              />
            </div>
            <div>
              <Label htmlFor="temperature" className="text-base">Temperature (°C)</Label>
              <Input
                id="temperature"
                type="number"
                min={30}
                max={45}
                step="0.1"
                value={data.temperature_c ?? ""}
                onChange={(event) => update("temperature_c", event.target.value ? Number(event.target.value) : undefined)}
                className="mt-2 rounded-xl"
              />
            </div>
            <div>
              <Label htmlFor="blood-pressure" className="text-base">Blood pressure</Label>
              <Input
                id="blood-pressure"
                value={data.blood_pressure ?? ""}
                onChange={(event) => update("blood_pressure", event.target.value)}
                className="mt-2 rounded-xl"
                placeholder="e.g. 120/80"
              />
            </div>
            <div>
              <Label htmlFor="oxygen" className="text-base">Oxygen saturation (%)</Label>
              <Input
                id="oxygen"
                type="number"
                min={50}
                max={100}
                value={data.oxygen_saturation ?? ""}
                onChange={(event) => update("oxygen_saturation", event.target.value ? Number(event.target.value) : undefined)}
                className="mt-2 rounded-xl"
              />
            </div>
            <div>
              <Label htmlFor="height" className="text-base">Height (cm)</Label>
              <Input
                id="height"
                type="number"
                min={40}
                max={250}
                value={data.height_cm ?? ""}
                onChange={(event) => update("height_cm", event.target.value ? Number(event.target.value) : undefined)}
                className="mt-2 rounded-xl"
              />
            </div>
            <div>
              <Label htmlFor="weight" className="text-base">Weight (kg)</Label>
              <Input
                id="weight"
                type="number"
                min={1}
                max={300}
                value={data.weight_kg ?? ""}
                onChange={(event) => update("weight_kg", event.target.value ? Number(event.target.value) : undefined)}
                className="mt-2 rounded-xl"
              />
            </div>
          </div>
        </div>
      ),
    },
    {
      title: "Medical history",
      content: (
        <div className="space-y-5">
          <div>
            <Label htmlFor="comorbidities" className="text-base">{t(lang, "comorbidities")}</Label>
            <Input
              id="comorbidities"
              value={data.comorbidities ?? ""}
              onChange={(event) => update("comorbidities", event.target.value)}
              className="mt-2 rounded-xl"
              placeholder="diabetes, hypertension, asthma"
              maxLength={500}
            />
          </div>
          <div>
            <Label htmlFor="medications" className="text-base">{t(lang, "medications")}</Label>
            <Input
              id="medications"
              value={data.medications ?? ""}
              onChange={(event) => update("medications", event.target.value)}
              className="mt-2 rounded-xl"
              placeholder="amlodipine, metformin"
              maxLength={500}
            />
          </div>
          <div>
            <Label htmlFor="allergies" className="text-base">{t(lang, "allergies")}</Label>
            <Input
              id="allergies"
              value={data.allergies ?? ""}
              onChange={(event) => update("allergies", event.target.value)}
              className="mt-2 rounded-xl"
              placeholder="penicillin, honey"
              maxLength={300}
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="surgeries" className="text-base">Past surgeries / admissions</Label>
              <Textarea
                id="surgeries"
                rows={3}
                value={data.past_surgeries ?? ""}
                onChange={(event) => update("past_surgeries", event.target.value)}
                className="mt-2 rounded-xl"
                placeholder="appendix surgery in 2021"
              />
            </div>
            <div>
              <Label htmlFor="family-history" className="text-base">Family history</Label>
              <Textarea
                id="family-history"
                rows={3}
                value={data.family_history ?? ""}
                onChange={(event) => update("family_history", event.target.value)}
                className="mt-2 rounded-xl"
                placeholder="hypertension in parents"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="pregnancy-status" className="text-base">Pregnancy status</Label>
            <select
              id="pregnancy-status"
              value={data.pregnancy_status ?? ""}
              onChange={(event) => update("pregnancy_status", event.target.value)}
              className={selectClassName()}
            >
              {PREGNANCY_OPTIONS.map((option) => (
                <option key={option.value || "blank"} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      ),
    },
    {
      title: "Lifestyle and preferences",
      content: (
        <div className="space-y-5">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="smoking-status" className="text-base">Smoking status</Label>
              <select
                id="smoking-status"
                value={data.smoking_status ?? ""}
                onChange={(event) => update("smoking_status", event.target.value)}
                className={selectClassName()}
              >
                {SMOKING_OPTIONS.map((option) => (
                  <option key={option.value || "blank"} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="alcohol-use" className="text-base">Alcohol use</Label>
              <select
                id="alcohol-use"
                value={data.alcohol_use ?? ""}
                onChange={(event) => update("alcohol_use", event.target.value)}
                className={selectClassName()}
              >
                {ALCOHOL_OPTIONS.map((option) => (
                  <option key={option.value || "blank"} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="sleep-quality" className="text-base">Sleep quality</Label>
              <select
                id="sleep-quality"
                value={data.sleep_quality ?? ""}
                onChange={(event) => update("sleep_quality", event.target.value)}
                className={selectClassName()}
              >
                {SLEEP_OPTIONS.map((option) => (
                  <option key={option.value || "blank"} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="appetite-status" className="text-base">Appetite</Label>
              <select
                id="appetite-status"
                value={data.appetite_status ?? ""}
                onChange={(event) => update("appetite_status", event.target.value)}
                className={selectClassName()}
              >
                {APPETITE_OPTIONS.map((option) => (
                  <option key={option.value || "blank"} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <Label htmlFor="recent-travel" className="text-base">Recent travel</Label>
            <Textarea
              id="recent-travel"
              rows={2}
              value={data.recent_travel ?? ""}
              onChange={(event) => update("recent_travel", event.target.value)}
              className="mt-2 rounded-xl"
              placeholder="Any recent travel, hospitalization, or stay outside your city"
            />
          </div>
          <div>
            <Label htmlFor="recent-exposure" className="text-base">Recent exposure</Label>
            <Textarea
              id="recent-exposure"
              rows={2}
              value={data.recent_exposure ?? ""}
              onChange={(event) => update("recent_exposure", event.target.value)}
              className="mt-2 rounded-xl"
              placeholder="Sick contacts, food poisoning, dust exposure, mosquito exposure"
            />
          </div>
          <div>
            <Label className="text-base">{t(lang, "preferences")}</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {PREF_OPTIONS.map((option) => {
                const active = data.preferences?.includes(option.value);
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => togglePref(option.value)}
                    className={`rounded-full border px-4 py-2 text-sm transition-smooth ${
                      active
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card hover:border-primary/40"
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              The live care path is capped at two modalities unless a clinician overrides it, but the result screen will still show all available treatment pathways.
            </p>
          </div>
        </div>
      ),
    },
  ];

  const isLast = step === steps.length - 1;

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader lang={lang} onLangChange={onLangChange} />

      <main className="container py-12 md:py-16 max-w-4xl">
        <div className="mb-8">
          <OfflineModelPanel
            title="Offline Clinical Model"
            description="This intake flow can use the local Ollama model on your machine for specialist-style synthesis, while the rule engine and hybrid triage remain the final safety authority."
          />
        </div>

        <div className="mb-8 grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl border border-border/70 bg-card p-5 shadow-soft">
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-glow">
                <UserRound className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.18em] text-primary font-semibold">Offline patient memory</div>
                <div className="font-display text-xl font-semibold">
                  {patient ? patient.full_name : "Use local patient sign-in"}
                </div>
              </div>
            </div>
            <div className="mt-4 text-sm text-muted-foreground">
              {patientLoading
                ? "Loading local patient profile..."
                : patient
                  ? "Signed-in patients can reuse their previous intake details and save new results into the local offline database."
                  : "Sign in from the patient portal to reuse prior data and build a local longitudinal patient history."}
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              {patient ? (
                <>
                  <Button asChild variant="outline" className="rounded-full">
                    <Link to="/patient">Open patient portal</Link>
                  </Button>
                  {latestHistory && (
                    <Button type="button" variant="outline" className="rounded-full" onClick={reuseLatestHistory}>
                      <RefreshCw className="mr-2 h-4 w-4" /> Reuse previous data
                    </Button>
                  )}
                  <Button type="button" variant="outline" className="rounded-full" onClick={startBlankIntake}>
                    Start blank intake
                  </Button>
                </>
              ) : (
                <Button asChild className="rounded-full bg-gradient-primary text-primary-foreground shadow-glow">
                  <Link to="/patient">
                    <LogIn className="mr-2 h-4 w-4" /> Sign in locally
                  </Link>
                </Button>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-border/70 bg-card p-5 shadow-soft">
            <div className="text-xs uppercase tracking-[0.18em] text-primary font-semibold">Last patient record</div>
            {patientSummary ? (
              <div className="mt-3 space-y-3">
                <div className="text-sm text-foreground leading-relaxed">{patientSummary.summary}</div>
                <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Clock3 className="h-3.5 w-3.5" />
                  {patientSummary.createdAt}
                </div>
                <div className="text-xs text-muted-foreground">
                  Preferred result language: {LANGUAGES.find((language) => language.code === latestHistory?.language_code)?.native || lang}
                </div>
                <div className="text-xs text-muted-foreground">
                  New intakes now start blank. Use "Reuse previous data" only when you want to carry details forward.
                </div>
              </div>
            ) : (
              <div className="mt-3 text-sm text-muted-foreground">
                No offline patient history yet. The first completed intake will be stored locally for future reuse.
              </div>
            )}
          </div>
        </div>

        <div className="mb-8 flex items-center gap-2">
          {steps.map((currentStep, index) => (
            <div
              key={currentStep.title}
              className={`h-1.5 flex-1 rounded-full transition-smooth ${index <= step ? "bg-gradient-primary" : "bg-secondary"}`}
            />
          ))}
        </div>

        <div className="rounded-3xl border border-border/70 bg-card p-7 md:p-10 shadow-elegant animate-fade-up">
          <div className="mb-6">
            <div className="text-xs uppercase tracking-[0.2em] text-primary font-semibold">
              Step {step + 1} of {steps.length}
            </div>
            <h1 className="font-display text-3xl md:text-4xl font-semibold mt-1.5 tracking-tight">
              {steps[step].title}
            </h1>
          </div>

          <div>{steps[step].content}</div>

          {isLast && (
            <div className="mt-6 space-y-3">
              <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary-soft/50 p-4 text-sm">
                <AlertTriangle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                <p className="text-foreground/80">
                  Hybrid triage, safety rules, multilingual output, and clinician review run locally. When the Ollama model is reachable, Sanjeevani also uses an offline LLM to broaden treatment options across all modalities and localize the full result view.
                </p>
              </div>
              <div className="flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/5 p-4 text-sm">
                <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
                <p className="text-foreground/80">
                  Sanjeevani provides decision-support, not a diagnosis. Call local emergency services if you are in danger.
                </p>
              </div>
            </div>
          )}

          <div className="mt-8 flex items-center justify-between gap-3">
            <Button
              variant="ghost"
              onClick={() => (step === 0 ? navigate("/") : setStep(step - 1))}
              className="rounded-full"
            >
              <ArrowLeft className="mr-1.5 h-4 w-4" /> {t(lang, "back")}
            </Button>
            {!isLast ? (
              <Button
                onClick={() => setStep(step + 1)}
                className="rounded-full bg-gradient-primary text-primary-foreground shadow-glow px-6"
              >
                {t(lang, "next")} <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={submit}
                disabled={loading}
                className="rounded-full bg-gradient-primary text-primary-foreground shadow-glow px-6"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Running hybrid triage + offline model…
                  </>
                ) : (
                  <>
                    {t(lang, "analyze")} <ArrowRight className="ml-1.5 h-4 w-4" />
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
};

export default Intake;

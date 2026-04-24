import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Loader2, ShieldAlert, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { OfflineModelPanel } from "@/components/OfflineModelPanel";
import { useLanguage } from "@/contexts/LanguageContext";
import { scanInteractions } from "@/lib/clinicalEngine";
import type { Interaction, InteractionReport } from "@/lib/types";
import { toast } from "sonner";

const SEV_CLS: Record<Interaction["severity"], string> = {
  severe: "border-risk-emergent/40 bg-risk-emergent/5",
  moderate: "border-risk-urgent/40 bg-risk-urgent/5",
  info: "border-border bg-card",
};
const SEV_PILL: Record<Interaction["severity"], string> = {
  severe: "bg-risk-emergent text-white",
  moderate: "bg-risk-urgent text-white",
  info: "bg-secondary text-secondary-foreground",
};
const OVERALL_PILL: Record<InteractionReport["overall_risk"], string> = {
  high: "bg-risk-emergent text-white",
  moderate: "bg-risk-urgent text-white",
  low: "bg-risk-routine text-white",
  none: "bg-risk-selfcare text-white",
};

function localizeInteractionKind(kind: Interaction["kind"], t: (key: string, values?: Record<string, string | number>) => string) {
  if (kind === "drug-drug") return t("drugDrug");
  if (kind === "drug-herb") return t("drugHerb");
  if (kind === "drug-condition") return t("drugCondition");
  if (kind === "herb-condition") return t("herbCondition");
  return t("allergy");
}

const Interactions = () => {
  const { t } = useLanguage();
  const [form, setForm] = useState({ medications: "", herbs: "", comorbidities: "", allergies: "" });
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<InteractionReport | null>(null);

  const update = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const scan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.medications.trim() && !form.herbs.trim()) {
      toast.error(t("scanRequired"));
      return;
    }
    setBusy(true); setReport(null);
    try {
      const data = await scanInteractions(form);
      setReport(data);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t("scanFailed"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container py-12 max-w-4xl">
        <Button variant="ghost" asChild className="mb-6 rounded-full -ml-3">
          <Link to="/"><ArrowLeft className="mr-1.5 h-4 w-4" /> {t("home")}</Link>
        </Button>

        <div className="text-xs uppercase tracking-[0.2em] text-primary font-semibold mb-3">{t("safetyScannerEyebrow")}</div>
        <h1 className="font-display text-4xl md:text-5xl font-semibold tracking-tight">{t("interactionScannerTitle")}</h1>
        <p className="mt-3 text-muted-foreground max-w-2xl">
          {t("interactionScannerDescription")}
        </p>
        <div className="mt-4 rounded-2xl border border-primary/20 bg-primary-soft/50 px-4 py-3 text-sm text-muted-foreground">
          {t("interactionScannerInfo")}
        </div>
        <div className="mt-5">
          <OfflineModelPanel
            title={t("offlineSafetySynthesisTitle")}
            description={t("offlineSafetySynthesisDescription")}
          />
        </div>

        <form onSubmit={scan} className="mt-8 grid sm:grid-cols-2 gap-4 rounded-3xl border border-border/70 bg-card p-6 shadow-soft">
          <div className="sm:col-span-2">
            <Label htmlFor="meds">{t("allopathicMedications")}</Label>
            <Textarea id="meds" rows={2} value={form.medications} onChange={(e) => update("medications", e.target.value)} className="mt-1.5 rounded-xl" placeholder={t("medicationsPlaceholderScan")} maxLength={1000} />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="herbs">{t("herbsSupplements")}</Label>
            <Textarea id="herbs" rows={2} value={form.herbs} onChange={(e) => update("herbs", e.target.value)} className="mt-1.5 rounded-xl" placeholder={t("herbsPlaceholder")} maxLength={1000} />
          </div>
          <div>
            <Label htmlFor="cond">{t("comorbidities")}</Label>
            <Input id="cond" value={form.comorbidities} onChange={(e) => update("comorbidities", e.target.value)} className="mt-1.5 rounded-xl" maxLength={500} />
          </div>
          <div>
            <Label htmlFor="all">{t("allergies")}</Label>
            <Input id="all" value={form.allergies} onChange={(e) => update("allergies", e.target.value)} className="mt-1.5 rounded-xl" maxLength={300} />
          </div>
          <div className="sm:col-span-2 flex justify-end">
            <Button type="submit" disabled={busy} className="rounded-full bg-gradient-primary text-primary-foreground shadow-glow px-6 h-11">
              {busy ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t("scanning")}</> : t("runSafetyScan")}
            </Button>
          </div>
        </form>

        {report && (
          <section className="mt-8 animate-fade-up">
            <div className="rounded-3xl border border-border/70 bg-card p-7 shadow-elegant">
              <div className="flex items-center gap-3">
                {report.overall_risk === "none" || report.overall_risk === "low" ? (
                  <ShieldCheck className="h-7 w-7 text-accent" />
                ) : (
                  <ShieldAlert className="h-7 w-7 text-risk-urgent" />
                )}
                <div>
                  <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground font-semibold">{t("overallRisk")}</div>
                  <span className={`inline-block mt-1 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${OVERALL_PILL[report.overall_risk]}`}>{t(report.overall_risk)}</span>
                </div>
              </div>
              <p className="mt-4 text-muted-foreground leading-relaxed">{report.general_advice}</p>
              {report.llm_metadata?.available && (
                <p className="mt-2 text-xs text-muted-foreground">
                  {t("localModelUsed", { model: report.llm_metadata.model || "" })}
                </p>
              )}
            </div>

            {report.interactions.length === 0 ? (
              <div className="mt-5 rounded-2xl border border-accent/30 bg-accent/5 p-6 text-center">
                <ShieldCheck className="h-8 w-8 text-accent mx-auto mb-2" />
                <div className="font-semibold">{t("noInteractionsDetected")}</div>
              </div>
            ) : (
              <ul className="mt-5 space-y-3">
                {report.interactions.map((it, i) => (
                  <li key={i} className={`rounded-2xl border p-5 ${SEV_CLS[it.severity]}`}>
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="font-semibold">
                        {it.substance_a} <span className="text-muted-foreground">↔</span> {it.substance_b}
                      </div>
                      <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${SEV_PILL[it.severity]}`}>{t(it.severity)}</span>
                    </div>
                    <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">{localizeInteractionKind(it.kind, t)}</div>
                    <p className="text-sm"><span className="font-medium">{t("mechanism")}:</span> {it.mechanism}</p>
                    <p className="text-sm mt-1"><span className="font-medium">{t("action")}:</span> {it.recommendation}</p>
                    {it.source && <p className="text-xs text-muted-foreground italic mt-2">{it.source}</p>}
                  </li>
                ))}
              </ul>
            )}

            {report.resolution_recommendations && report.resolution_recommendations.length > 0 && (
              <div className="mt-5 rounded-2xl border border-border/70 bg-card p-5">
                <div className="font-semibold mb-2">{t("resolutionRecommendations")}</div>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {report.resolution_recommendations.map((item, index) => (
                    <li key={`${item}-${index}`} className="flex gap-2">
                      <span className="mt-1.5 inline-block h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}
      </main>
      <SiteFooter />
    </div>
  );
};

export default Interactions;

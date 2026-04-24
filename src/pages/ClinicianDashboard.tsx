import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Activity, AlertTriangle, ArrowRight, CheckCircle2, Clock, Filter, LogOut, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/SiteHeader";
import { OfflineModelPanel } from "@/components/OfflineModelPanel";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { listStoredPlans } from "@/lib/localStore";
import type { RiskLevel, StoredPlanRecord } from "@/lib/types";

const RISK_RANK: Record<RiskLevel, number> = { emergent: 0, urgent: 1, routine: 2, "self-care": 3 };

const RISK_PILL: Record<RiskLevel, string> = {
  emergent: "bg-risk-emergent text-white",
  urgent: "bg-risk-urgent text-white",
  routine: "bg-risk-routine text-white",
  "self-care": "bg-risk-selfcare text-white",
};

function localizeRiskLevel(
  risk: RiskLevel,
  t: (key: string, values?: Record<string, string | number>) => string,
) {
  if (risk === "emergent") return t("riskEmergent");
  if (risk === "urgent") return t("riskUrgent");
  if (risk === "routine") return t("riskRoutine");
  return t("riskSelfCare");
}

function localizeReviewStatus(
  status: StoredPlanRecord["review_status"],
  t: (key: string, values?: Record<string, string | number>) => string,
) {
  if (status === "approved") return t("statusApproved");
  if (status === "rejected") return t("statusRejected");
  if (status === "escalated") return t("statusEscalated");
  if (status === "edited") return t("saveEditedPlan");
  return t("statusPending");
}

const ClinicianDashboard = () => {
  const { t } = useLanguage();
  const { user, signOut } = useAuth();
  const [rows, setRows] = useState<StoredPlanRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected" | "escalated">("pending");

  useEffect(() => {
    setRows(listStoredPlans());
    setLoading(false);
  }, []);

  const filtered = rows
    .filter((r) => filter === "all" || r.review_status === filter)
    .sort((a, b) => RISK_RANK[a.risk_level] - RISK_RANK[b.risk_level]);

  const counts = {
    pending: rows.filter((r) => r.review_status === "pending").length,
    emergent: rows.filter((r) => r.risk_level === "emergent" && r.review_status === "pending").length,
    today: rows.filter((r) => new Date(r.created_at).toDateString() === new Date().toDateString()).length,
  };
  const statusFilters = [
    { value: "all", label: t("statusAll") },
    { value: "pending", label: t("statusPending") },
    { value: "approved", label: t("statusApproved") },
    { value: "rejected", label: t("statusRejected") },
    { value: "escalated", label: t("statusEscalated") },
  ] as const;

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container py-10">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <div>
            <div className="text-xs uppercase tracking-[0.2em] text-primary font-semibold">{t("dashboardTitle")}</div>
            <h1 className="font-display text-4xl font-semibold tracking-tight mt-1">{t("dashboardHeading")}</h1>
            <p className="text-muted-foreground mt-1">{t("signedInAs", { email: user?.email || "" })}</p>
          </div>
          <Button variant="outline" onClick={signOut} className="rounded-full">
            <LogOut className="mr-2 h-4 w-4" /> {t("signOut")}
          </Button>
        </div>

        {/* STATS */}
        <div className="grid gap-4 sm:grid-cols-3 mb-8">
          {[
            { icon: Clock, label: t("pendingReview"), value: counts.pending, accent: "text-primary" },
            { icon: AlertTriangle, label: t("emergentPending"), value: counts.emergent, accent: "text-risk-emergent" },
            { icon: Activity, label: t("generatedToday"), value: counts.today, accent: "text-accent" },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl border border-border/70 bg-card p-5 shadow-soft">
              <div className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-xl bg-primary-soft flex items-center justify-center ${s.accent}`}>
                  <s.icon className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-2xl font-display font-semibold">{s.value}</div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wider">{s.label}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mb-8">
          <OfflineModelPanel
            title={t("offlineAgentSettingsTitle")}
            description={t("offlineAgentSettingsDescription")}
          />
        </div>

        {/* FILTERS */}
        <div className="flex flex-wrap items-center gap-2 mb-5">
          <Filter className="h-4 w-4 text-muted-foreground mr-1" />
          {statusFilters.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`rounded-full px-4 py-1.5 text-sm border transition-smooth ${
                filter === f.value ? "bg-foreground text-background border-foreground" : "border-border bg-card hover:border-primary/40"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* TABLE */}
        <div className="rounded-2xl border border-border/70 bg-card overflow-hidden shadow-soft">
          {loading ? (
            <div className="p-10 text-center text-muted-foreground">{t("loading")}</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <CheckCircle2 className="h-10 w-10 text-accent mx-auto mb-3" />
              <div className="font-semibold">{t("allClear")}</div>
              <p className="text-sm text-muted-foreground mt-1">{t("noPlansForFilter")}</p>
            </div>
          ) : (
            <ul className="divide-y divide-border/60">
              {filtered.map((r) => (
                <li key={r.id} className="p-5 hover:bg-muted/40 transition-smooth">
                  <Link to={`/clinician/plan/${r.id}`} className="grid grid-cols-12 gap-4 items-center">
                    <div className="col-span-12 md:col-span-2">
                      <span className={`inline-flex items-center rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${RISK_PILL[r.risk_level]}`}>
                        {localizeRiskLevel(r.risk_level, t)}
                      </span>
                    </div>
                    <div className="col-span-12 md:col-span-6">
                      <div className="font-medium line-clamp-2">{r.intake_session?.symptoms || "—"}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {r.intake_session?.language || "—"}
                        {r.intake_session?.age != null && <> · {r.intake_session.age}y</>}
                        {r.intake_session?.sex && <> · {r.intake_session.sex}</>}
                        <> · {t("confidence")} {(r.confidence * 100).toFixed(0)}%</>
                        {r.back_translation_confidence != null && <> · {t("backTranslation")} {(r.back_translation_confidence * 100).toFixed(0)}%</>}
                      </div>
                    </div>
                    <div className="col-span-6 md:col-span-2 text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleString()}
                    </div>
                    <div className="col-span-6 md:col-span-2 flex items-center justify-end gap-2">
                      <span className="text-xs uppercase tracking-wider text-muted-foreground">{localizeReviewStatus(r.review_status, t)}</span>
                      <ArrowRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          <Link to="/interactions" className="rounded-2xl border border-border/70 bg-gradient-soft p-6 hover:shadow-elegant transition-smooth">
            <ShieldCheck className="h-6 w-6 text-primary mb-2" />
            <div className="font-semibold">{t("interactionCheckerCard")}</div>
            <p className="text-sm text-muted-foreground mt-1">{t("interactionCheckerCardDesc")}</p>
          </Link>
          <Link to="/intake" className="rounded-2xl border border-border/70 bg-gradient-soft p-6 hover:shadow-elegant transition-smooth">
            <Activity className="h-6 w-6 text-primary mb-2" />
            <div className="font-semibold">{t("newPatientIntakeCard")}</div>
            <p className="text-sm text-muted-foreground mt-1">{t("newPatientIntakeCardDesc")}</p>
          </Link>
        </div>
      </main>
    </div>
  );
};

export default ClinicianDashboard;

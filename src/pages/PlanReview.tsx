import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AlertTriangle, ArrowLeft, CheckCircle2, History, Loader2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { SiteHeader } from "@/components/SiteHeader";
import { useAuth } from "@/contexts/AuthContext";
import { getStoredPlan, listPlanReviews, savePlanDecision } from "@/lib/localStore";
import type { IntegrativePlan, PlanReviewRecord, StoredPlanRecord } from "@/lib/types";
import { toast } from "sonner";

const PlanReview = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [row, setRow] = useState<StoredPlanRecord | null>(null);
  const [reviews, setReviews] = useState<PlanReviewRecord[]>([]);
  const [notes, setNotes] = useState("");
  const [editablePlan, setEditablePlan] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const plan = getStoredPlan(id);
    if (!plan) {
      toast.error("Plan not found");
      navigate("/clinician/dashboard");
      return;
    }

    setRow(plan);
    setReviews(listPlanReviews(id));
    setEditablePlan(JSON.stringify(plan.plan_data, null, 2));
    setLoading(false);
  }, [id, navigate]);

  const parsedPreview = useMemo(() => {
    try {
      return JSON.parse(editablePlan) as IntegrativePlan;
    } catch {
      return null;
    }
  }, [editablePlan]);

  const decide = async (decision: "approved" | "rejected" | "escalated" | "edited") => {
    if (!row || !user) return;

    setBusy(true);
    try {
      const requiresEditablePlan = decision === "approved" || decision === "edited";
      let nextPlan: IntegrativePlan | null = null;

      if (requiresEditablePlan) {
        try {
          nextPlan = JSON.parse(editablePlan) as IntegrativePlan;
        } catch {
          throw new Error("The editable plan JSON is invalid. Please fix the JSON before saving.");
        }
      }

      savePlanDecision({
        planId: row.id,
        decision,
        reviewer: user,
        notes,
        editedPlan: nextPlan,
      });

      toast.success(`Plan ${decision}`);
      navigate("/clinician/dashboard");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to record clinician decision");
    } finally {
      setBusy(false);
    }
  };

  if (loading || !row) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <div className="container py-12 text-center text-muted-foreground">Loading…</div>
      </div>
    );
  }

  const plan = parsedPreview ?? row.plan_data;
  const intake = row.intake_session;

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container py-10 max-w-6xl">
        <Button variant="ghost" asChild className="mb-6 rounded-full -ml-3">
          <Link to="/clinician/dashboard">
            <ArrowLeft className="mr-1.5 h-4 w-4" /> Back to queue
          </Link>
        </Button>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="rounded-3xl border border-border/70 bg-card p-7 shadow-elegant">
              <div className="flex items-center gap-3 mb-4 flex-wrap">
                <span
                  className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white ${
                    row.risk_level === "emergent"
                      ? "bg-risk-emergent"
                      : row.risk_level === "urgent"
                      ? "bg-risk-urgent"
                      : row.risk_level === "routine"
                      ? "bg-risk-routine"
                      : "bg-risk-selfcare"
                  }`}
                >
                  {row.risk_level}
                </span>
                <span className="text-xs uppercase tracking-wider text-muted-foreground">
                  Status: {row.review_status}
                </span>
              </div>
              <h1 className="font-display text-2xl font-semibold mb-2">{plan.care_path}</h1>
              <p className="text-muted-foreground leading-relaxed">{plan.triage_reasoning}</p>
              <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">Confidence</div>
                  <div className="font-semibold">{(row.confidence * 100).toFixed(0)}%</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">Back-translation</div>
                  <div className="font-semibold">
                    {row.back_translation_confidence != null
                      ? `${(row.back_translation_confidence * 100).toFixed(0)}%`
                      : "—"}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-border/70 bg-card p-7">
              <h2 className="font-display text-xl font-semibold mb-4">Patient intake</h2>
              <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <div>
                  <dt className="text-xs uppercase tracking-wider text-muted-foreground">Patient hash</dt>
                  <dd>{intake.patient_hash}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wider text-muted-foreground">Language</dt>
                  <dd>{intake.language}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wider text-muted-foreground">Duration</dt>
                  <dd>
                    {intake.duration} ({intake.duration_days} day{intake.duration_days === 1 ? "" : "s"})
                  </dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wider text-muted-foreground">Age / Sex</dt>
                  <dd>
                    {intake.age ?? "—"} / {intake.sex ?? "—"}
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-xs uppercase tracking-wider text-muted-foreground">Symptoms</dt>
                  <dd className="mt-1">{intake.symptoms}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wider text-muted-foreground">Comorbidities</dt>
                  <dd>{intake.comorbidities || "none"}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wider text-muted-foreground">Medications</dt>
                  <dd>{intake.medications || "none"}</dd>
                </div>
              </dl>
            </div>

            {plan.warnings.length > 0 && (
              <div className="rounded-3xl border border-warning/30 bg-warning/5 p-6">
                <h2 className="font-display text-xl font-semibold mb-3 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-warning" />
                  Safety warnings
                </h2>
                <ul className="space-y-2">
                  {plan.warnings.map((warning, index) => (
                    <li key={`${warning.message}-${index}`} className="rounded-lg bg-card border border-border/70 p-3 text-sm">
                      <span className="text-xs uppercase tracking-wider text-muted-foreground">
                        {warning.type.replace(/-/g, " ")} · {warning.severity}
                      </span>
                      <div>{warning.message}</div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="rounded-3xl border border-border/70 bg-card p-7">
              <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
                <div>
                  <h2 className="font-display text-xl font-semibold">Clinician override editor</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Edit the structured plan directly. The saved JSON becomes the new auditable plan version for this case.
                  </p>
                </div>
                {!parsedPreview && (
                  <span className="rounded-full border border-destructive/30 bg-destructive/5 px-3 py-1 text-xs text-destructive">
                    Invalid JSON
                  </span>
                )}
              </div>
              <Textarea
                value={editablePlan}
                onChange={(event) => setEditablePlan(event.target.value)}
                rows={18}
                className="font-mono text-xs rounded-2xl"
              />
            </div>

            <div className="rounded-3xl border border-border/70 bg-card p-7">
              <h2 className="font-display text-xl font-semibold mb-4">Preview of current editable plan</h2>
              <div className="space-y-5">
                {plan.plan_segments.map((segment, index) => (
                  <div key={`${segment.modality}-${index}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold">{segment.modality}</span>
                      <span className="text-xs uppercase tracking-wider text-muted-foreground">
                        {segment.priority}
                      </span>
                    </div>
                    <ul className="space-y-2 pl-4 border-l-2 border-primary/30">
                      {segment.recommendations.map((recommendation, recommendationIndex) => (
                        <li key={`${recommendation.title}-${recommendationIndex}`} className="text-sm">
                          <div className="font-medium">
                            {recommendation.title}{" "}
                            <span className="text-xs text-muted-foreground font-normal">
                              · tier {recommendation.evidence_tier}
                            </span>
                          </div>
                          <div className="text-muted-foreground">{recommendation.detail}</div>
                          {recommendation.source && (
                            <div className="text-xs text-muted-foreground italic mt-0.5">{recommendation.source}</div>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <aside className="lg:sticky lg:top-24 space-y-4 h-fit">
            <div className="rounded-3xl border border-border/70 bg-card p-6 shadow-soft">
              <h3 className="font-display text-lg font-semibold mb-3">Clinician decision</h3>
              <Textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="Notes for the override / approval decision…"
                rows={5}
                className="rounded-xl"
                maxLength={2000}
              />
              <div className="mt-4 grid gap-2">
                <Button
                  onClick={() => decide("approved")}
                  disabled={busy || !parsedPreview}
                  className="rounded-full bg-accent hover:bg-accent/90 text-accent-foreground"
                >
                  {busy ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" /> Approve current plan
                    </>
                  )}
                </Button>
                <Button
                  onClick={() => decide("edited")}
                  disabled={busy || !parsedPreview}
                  variant="outline"
                  className="rounded-full"
                >
                  Save as edited
                </Button>
                <Button
                  onClick={() => decide("escalated")}
                  disabled={busy}
                  variant="outline"
                  className="rounded-full border-warning/40 text-warning-foreground hover:bg-warning/10"
                >
                  <AlertTriangle className="mr-2 h-4 w-4" /> Escalate
                </Button>
                <Button
                  onClick={() => decide("rejected")}
                  disabled={busy}
                  variant="outline"
                  className="rounded-full border-destructive/40 text-destructive hover:bg-destructive/10"
                >
                  <XCircle className="mr-2 h-4 w-4" /> Reject
                </Button>
              </div>
            </div>

            <div className="rounded-3xl border border-border/70 bg-card p-6">
              <h3 className="font-display text-lg font-semibold mb-3 flex items-center gap-2">
                <History className="h-4 w-4" /> History
              </h3>
              {reviews.length === 0 ? (
                <p className="text-sm text-muted-foreground">No prior decisions.</p>
              ) : (
                <ul className="space-y-3">
                  {reviews.map((review) => (
                    <li key={review.id} className="text-sm border-l-2 border-border pl-3">
                      <div className="font-medium uppercase tracking-wider text-xs">{review.decision}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(review.created_at).toLocaleString()} · {review.reviewer_email}
                      </div>
                      {review.notes && <div className="mt-1 text-muted-foreground">{review.notes}</div>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
};

export default PlanReview;

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Clock3, History, Loader2, LogOut, RefreshCw, UserRound } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { usePatient } from "@/contexts/PatientContext";
import { LANGUAGES } from "@/lib/languages";
import type { PatientHistoryRecord } from "@/lib/types";
import { toast } from "sonner";

const signInSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(6),
});

const signUpSchema = signInSchema.extend({
  full_name: z.string().trim().min(2),
  phone: z.string().trim().min(10).max(20).optional(),
  preferred_language: z.string().trim().min(2).optional(),
});

const PatientPortal = () => {
  const navigate = useNavigate();
  const { patient, history, loading, signIn, signUp, signOut, refreshHistory } = usePatient();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    phone: "",
    preferred_language: "en",
  });

  const update = (key: keyof typeof form, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      if (mode === "signin") {
        const parsed = signInSchema.safeParse(form);
        if (!parsed.success) {
          toast.error(parsed.error.issues[0]?.message || "Enter a valid email and password.");
          return;
        }
        await signIn(parsed.data);
        toast.success("Patient signed in.");
      } else {
        const parsed = signUpSchema.safeParse(form);
        if (!parsed.success) {
          toast.error(parsed.error.issues[0]?.message || "Please complete the patient form.");
          return;
        }
        await signUp(parsed.data);
        toast.success("Patient account created locally.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Patient authentication failed.");
    } finally {
      setBusy(false);
    }
  };

  const openRecord = (record: PatientHistoryRecord) => {
    sessionStorage.setItem("sanjeevani:plan", JSON.stringify(record.plan));
    sessionStorage.setItem("sanjeevani:plan-id", record.plan_id);
    sessionStorage.setItem("sanjeevani:intake", JSON.stringify(record.intake));
    sessionStorage.setItem("sanjeevani:result-language", record.language_code || "en");
    navigate("/results");
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container py-10 max-w-5xl">
        <Button variant="ghost" asChild className="mb-6 rounded-full -ml-3">
          <Link to="/">
            <ArrowLeft className="mr-1.5 h-4 w-4" /> Home
          </Link>
        </Button>

        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.25fr]">
          <section className="rounded-3xl border border-border/70 bg-card p-7 shadow-soft">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-12 w-12 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-glow">
                <UserRound className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.2em] text-primary font-semibold">Patient portal</div>
                <h1 className="font-display text-2xl font-semibold">
                  {patient ? patient.full_name : mode === "signin" ? "Patient sign in" : "Create local patient account"}
                </h1>
              </div>
            </div>

            <div className="rounded-2xl border border-primary/20 bg-primary-soft/50 px-4 py-3 text-sm text-muted-foreground mb-5">
              Uses a real offline local database in your browser. Demo patient login: patient@sanjeevani.demo / demo123.
            </div>

            {loading ? (
              <div className="text-sm text-muted-foreground">Loading local patient database…</div>
            ) : patient ? (
              <div className="space-y-4">
                <div className="rounded-2xl border border-border/70 bg-muted/30 p-4">
                  <div className="font-medium">{patient.full_name}</div>
                  <div className="text-sm text-muted-foreground mt-1">{patient.email}</div>
                  {patient.phone && <div className="text-sm text-muted-foreground">{patient.phone}</div>}
                  {patient.preferred_language && (
                    <div className="text-sm text-muted-foreground">
                      Preferred language: {LANGUAGES.find((language) => language.code === patient.preferred_language)?.native || patient.preferred_language}
                    </div>
                  )}
                </div>
                <Button asChild className="w-full rounded-full bg-gradient-primary text-primary-foreground shadow-glow">
                  <Link to="/intake">Start new intake</Link>
                </Button>
                <Button variant="outline" className="w-full rounded-full" onClick={() => void signOut()}>
                  <LogOut className="mr-2 h-4 w-4" /> Sign out
                </Button>
              </div>
            ) : (
              <>
                <form onSubmit={submit} className="space-y-4">
                  {mode === "signup" && (
                    <>
                      <div>
                        <Label htmlFor="patient-full-name">Full name</Label>
                        <Input
                          id="patient-full-name"
                          value={form.full_name}
                          onChange={(event) => update("full_name", event.target.value)}
                          className="mt-2 rounded-xl"
                        />
                      </div>
                      <div>
                        <Label htmlFor="patient-phone">Phone</Label>
                        <Input
                          id="patient-phone"
                          value={form.phone}
                          onChange={(event) => update("phone", event.target.value)}
                          className="mt-2 rounded-xl"
                        />
                      </div>
                      <div>
                        <Label htmlFor="patient-language">Preferred language</Label>
                        <select
                          id="patient-language"
                          value={form.preferred_language}
                          onChange={(event) => update("preferred_language", event.target.value)}
                          className="mt-2 h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
                        >
                          {LANGUAGES.map((language) => (
                            <option key={language.code} value={language.code}>
                              {language.native}
                            </option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}

                  <div>
                    <Label htmlFor="patient-email">Email</Label>
                    <Input
                      id="patient-email"
                      type="email"
                      value={form.email}
                      onChange={(event) => update("email", event.target.value)}
                      className="mt-2 rounded-xl"
                    />
                  </div>

                  <div>
                    <Label htmlFor="patient-password">Password</Label>
                    <Input
                      id="patient-password"
                      type="password"
                      value={form.password}
                      onChange={(event) => update("password", event.target.value)}
                      className="mt-2 rounded-xl"
                    />
                  </div>

                  <Button type="submit" disabled={busy} className="w-full rounded-full bg-gradient-primary text-primary-foreground shadow-glow">
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === "signin" ? "Sign in" : "Create local account"}
                  </Button>
                </form>

                <div className="mt-5 text-center text-sm text-muted-foreground">
                  {mode === "signin" ? (
                    <>
                      New patient?{" "}
                      <button onClick={() => setMode("signup")} className="text-primary font-medium hover:underline">
                        Create account
                      </button>
                    </>
                  ) : (
                    <>
                      Already have an account?{" "}
                      <button onClick={() => setMode("signin")} className="text-primary font-medium hover:underline">
                        Sign in
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </section>

          <section className="rounded-3xl border border-border/70 bg-card p-7 shadow-soft">
            <div className="flex items-center gap-2 mb-4">
              <History className="h-5 w-5 text-primary" />
              <h2 className="font-display text-2xl font-semibold">Previous patient data</h2>
              {patient && history.length > 0 && (
                <span className="rounded-full border border-border bg-muted/40 px-3 py-1 text-xs text-muted-foreground">
                  {history.length} record{history.length === 1 ? "" : "s"}
                </span>
              )}
            </div>

            {!patient ? (
              <p className="text-muted-foreground">
                Sign in with a local patient account to view previous intakes and reuse earlier data during the next consultation.
              </p>
            ) : history.length === 0 ? (
              <div className="space-y-3">
                <p className="text-muted-foreground">No previous offline patient records yet.</p>
                <Button variant="outline" className="rounded-full" onClick={() => void refreshHistory()}>
                  <RefreshCw className="mr-2 h-4 w-4" /> Refresh records
                </Button>
              </div>
            ) : (
              <>
                <div className="mb-4 flex justify-end">
                  <Button variant="outline" size="sm" className="rounded-full" onClick={() => void refreshHistory()}>
                    <RefreshCw className="mr-2 h-4 w-4" /> Refresh records
                  </Button>
                </div>
                <ul className="space-y-3">
                {history.map((record) => (
                  <li key={record.id} className="rounded-2xl border border-border/70 bg-muted/30 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="font-medium">{record.intake.symptoms}</div>
                        <div className="text-sm text-muted-foreground mt-1">
                          {record.plan.care_path} · risk {(record.risk_level || record.plan.risk_level).replace(/-/g, " ")}
                        </div>
                      </div>
                      <span className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
                        {record.language_code}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                      <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <Clock3 className="h-3.5 w-3.5" />
                        {new Date(record.created_at).toLocaleString()}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-full"
                        onClick={() => openRecord(record)}
                      >
                        Open result
                      </Button>
                    </div>
                  </li>
                ))}
                </ul>
              </>
            )}
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
};

export default PatientPortal;

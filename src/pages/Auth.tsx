import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Loader2, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SiteHeader } from "@/components/SiteHeader";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { z } from "zod";

const signInSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(6).max(72),
});

const signUpSchema = signInSchema.extend({
  full_name: z.string().trim().min(2).max(120),
  specialty: z.string().trim().max(120).optional(),
  organization: z.string().trim().max(160).optional(),
});

const Auth = () => {
  const { user, loading, authMode, signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", full_name: "", specialty: "", organization: "" });

  if (loading) return null;
  if (user) return <Navigate to="/clinician/dashboard" replace />;

  const update = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signin") {
        const parsed = signInSchema.safeParse(form);
        if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
        await signIn({ email: parsed.data.email, password: parsed.data.password });
        toast.success("Welcome back");
        navigate("/clinician/dashboard");
      } else {
        const parsed = signUpSchema.safeParse(form);
        if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
        await signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          full_name: parsed.data.full_name,
          specialty: parsed.data.specialty || "",
          organization: parsed.data.organization || "",
        });
        toast.success(
          authMode === "local"
            ? "Local clinician account created and signed in."
            : "Account created. You can sign in.",
        );
        if (authMode === "local") {
          navigate("/clinician/dashboard");
        } else {
          setMode("signin");
        }
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Authentication failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container py-12 max-w-md">
        <div className="rounded-3xl border border-border/70 bg-card p-8 shadow-elegant animate-fade-up">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-12 w-12 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-glow">
              <Stethoscope className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-primary font-semibold">Clinician portal</div>
              <h1 className="font-display text-2xl font-semibold">{mode === "signin" ? "Sign in" : "Create account"}</h1>
            </div>
          </div>

          <div className="mb-5 rounded-2xl border border-border/70 bg-gradient-soft px-4 py-3 text-sm text-muted-foreground">
            {authMode === "local"
              ? "Running in local demo mode. You can create a clinician account here or use the seeded demo login: clinician@sanjeevani.demo / demo123."
              : "Running with Supabase authentication for the clinician portal."}
          </div>

          <form onSubmit={submit} className="space-y-4">
            {mode === "signup" && (
              <>
                <div>
                  <Label htmlFor="full_name">Full name</Label>
                  <Input id="full_name" value={form.full_name} onChange={(e) => update("full_name", e.target.value)} className="mt-1.5 rounded-xl" required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="specialty">Specialty</Label>
                    <Input id="specialty" value={form.specialty} onChange={(e) => update("specialty", e.target.value)} className="mt-1.5 rounded-xl" placeholder="GP, Ayurveda…" />
                  </div>
                  <div>
                    <Label htmlFor="organization">Organization</Label>
                    <Input id="organization" value={form.organization} onChange={(e) => update("organization", e.target.value)} className="mt-1.5 rounded-xl" />
                  </div>
                </div>
              </>
            )}
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={form.email} onChange={(e) => update("email", e.target.value)} className="mt-1.5 rounded-xl" required autoComplete="email" />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={form.password} onChange={(e) => update("password", e.target.value)} className="mt-1.5 rounded-xl" required autoComplete={mode === "signin" ? "current-password" : "new-password"} minLength={6} />
            </div>
            <Button type="submit" disabled={busy} className="w-full rounded-full bg-gradient-primary text-primary-foreground shadow-glow h-11">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === "signin" ? "Sign in" : "Create account"}
            </Button>
          </form>

          <div className="mt-5 text-center text-sm text-muted-foreground">
            {mode === "signin" ? (
              <>New here? <button onClick={() => setMode("signup")} className="text-primary font-medium hover:underline">Create a clinician account</button></>
            ) : (
              <>Already registered? <button onClick={() => setMode("signin")} className="text-primary font-medium hover:underline">Sign in</button></>
            )}
          </div>
          <div className="mt-6 text-center">
            <Link to="/" className="text-xs text-muted-foreground hover:text-foreground">← Back to home</Link>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Auth;

import { Link } from "react-router-dom";
import { ArrowLeft, ShieldCheck, FileCheck2, MessageSquareWarning, Activity, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

const Clinician = () => (
  <div className="min-h-screen bg-background">
    <SiteHeader />
    <main className="container py-12 max-w-4xl">
      <Button variant="ghost" asChild className="mb-6 rounded-full -ml-3">
        <Link to="/"><ArrowLeft className="mr-1.5 h-4 w-4" /> Home</Link>
      </Button>

      <div className="text-xs uppercase tracking-[0.2em] text-primary font-semibold mb-3">For clinicians</div>
      <h1 className="font-display text-4xl md:text-6xl font-semibold tracking-tight text-balance">
        You stay in control of every plan.
      </h1>
      <p className="mt-5 text-lg text-muted-foreground max-w-2xl leading-relaxed">
        Sign in to review the AI's plans, edit modality choices, approve or reject, and run ad-hoc drug-herb safety scans. Every action is audited.
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        <Button asChild size="lg" className="rounded-full bg-gradient-primary text-primary-foreground shadow-glow">
          <Link to="/auth">Sign in to dashboard <ArrowRight className="ml-2 h-4 w-4" /></Link>
        </Button>
        <Button asChild variant="outline" size="lg" className="rounded-full">
          <Link to="/interactions">Open interaction scanner</Link>
        </Button>
      </div>

      <div className="mt-12 grid gap-4 sm:grid-cols-2">
        {[
          { icon: FileCheck2, title: "Review queue", desc: "All AI-generated plans pending sign-off, sorted by risk." },
          { icon: ShieldCheck, title: "Edit & approve", desc: "Override modality choices, add notes, lock the final plan." },
          { icon: MessageSquareWarning, title: "Conflict escalations", desc: "Cross-modality conflicts routed for safety review." },
          { icon: Activity, title: "Audit & feedback", desc: "Every decision is logged; corrections retrain the orchestrator." },
        ].map((f) => (
          <div key={f.title} className="rounded-2xl border border-border/70 bg-card p-6 shadow-soft">
            <div className="h-10 w-10 rounded-xl bg-primary-soft text-primary flex items-center justify-center mb-3">
              <f.icon className="h-5 w-5" />
            </div>
            <div className="font-semibold mb-1">{f.title}</div>
            <p className="text-sm text-muted-foreground">{f.desc}</p>
          </div>
        ))}
      </div>
    </main>
    <SiteFooter />
  </div>
);

export default Clinician;

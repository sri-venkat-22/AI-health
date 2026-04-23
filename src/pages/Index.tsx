import { Link } from "react-router-dom";
import { ArrowRight, Sparkles, ShieldCheck, Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { MODULES } from "@/lib/modules";
import heroBg from "@/assets/hero-bg.jpg";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 -z-10 opacity-70"
          style={{ backgroundImage: `url(${heroBg})`, backgroundSize: "cover", backgroundPosition: "center" }}
          aria-hidden
        />
        <div className="absolute inset-0 -z-10 bg-aurora" aria-hidden />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-background/40 via-background/60 to-background" aria-hidden />

        <div className="container py-20 md:py-32">
          <div className="max-w-3xl animate-fade-up">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary-soft/60 px-3.5 py-1.5 text-xs font-medium text-primary mb-6">
              <Sparkles className="h-3.5 w-3.5" />
              Allopathy · Ayurveda · Homeopathy · Home Remedies — unified
            </div>
            <h1 className="font-display text-5xl md:text-7xl font-semibold leading-[1.02] tracking-tight text-foreground text-balance">
              One safe plan, <br />
              <span className="bg-gradient-primary bg-clip-text text-transparent">across every system of care.</span>
            </h1>
            <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl leading-relaxed">
              Sanjeevani triages your symptoms, orchestrates an integrative treatment plan, checks for herb–drug
              interactions, and explains everything in your own language, using a local offline model when available and a clinician always in the loop.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-4">
              <Button asChild size="lg" className="h-14 px-8 rounded-full bg-gradient-primary text-primary-foreground shadow-glow hover:shadow-elegant transition-smooth text-base">
                <Link to="/intake">
                  Start patient intake
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="h-14 px-7 rounded-full border-border/80 text-base">
                <Link to="/clinician">For clinicians</Link>
              </Button>
            </div>

            <div className="mt-10 flex flex-wrap gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" /> Safety-first triage</div>
              <div className="flex items-center gap-2"><Languages className="h-4 w-4 text-primary" /> 7 Indian languages</div>
              <div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> Cited evidence (A · B · T)</div>
            </div>
          </div>
        </div>
      </section>

      {/* MODULES */}
      <section id="modules" className="container py-20">
        <div className="max-w-2xl mb-12">
          <div className="text-xs uppercase tracking-[0.2em] text-primary font-semibold mb-3">The orchestrator</div>
          <h2 className="font-display text-4xl md:text-5xl font-semibold tracking-tight text-balance">
            Twelve specialist agents working together
          </h2>
          <p className="mt-4 text-muted-foreground text-lg">
            From multilingual intake to evidence-grounded recommendations, each step is auditable and human-reviewable.
          </p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {MODULES.map((m, i) => (
            <div
              key={m.title}
              className="group relative rounded-2xl border border-border/70 bg-card p-6 shadow-soft hover:shadow-elegant transition-smooth hover:-translate-y-0.5"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary-soft text-primary group-hover:bg-gradient-primary group-hover:text-primary-foreground transition-smooth">
                <m.icon className="h-5 w-5" strokeWidth={2} />
              </div>
              <h3 className="font-display text-xl font-semibold mb-1.5">{m.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{m.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* HOW */}
      <section id="how" className="bg-gradient-soft py-20 border-y border-border/60">
        <div className="container">
          <div className="grid gap-12 lg:grid-cols-2 items-center">
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-primary font-semibold mb-3">Workflow</div>
              <h2 className="font-display text-4xl md:text-5xl font-semibold tracking-tight">
                Intake → Triage → Plan → Safety → Translate
              </h2>
              <p className="mt-5 text-muted-foreground text-lg leading-relaxed">
                Patient input is normalized, mapped to ICD/SNOMED and Ayurvedic dosha tags, run through risk triage, then
                routed to specialist agents. The Safety Review agent checks for cross-modality conflicts before the plan
                is translated and presented.
              </p>
            </div>
            <ol className="space-y-3">
              {[
                ["01", "Multilingual intake", "Free-text symptoms in your language, structured by the LLM."],
                ["02", "Risk triage", "Rule + ML hybrid produces a risk level with confidence."],
                ["03", "Specialist agents", "Allopathy lead, Ayurveda/Homeopathy/Home as adjuncts."],
                ["04", "Safety review", "Herb–drug + contraindication scanner."],
                ["05", "Translate & explain", "Patient-facing summary with cited evidence."],
                ["06", "Clinician review", "Edit, approve, store feedback for continuous learning."],
              ].map(([n, t, d]) => (
                <li key={n} className="flex gap-4 rounded-2xl bg-card border border-border/70 p-5 shadow-soft">
                  <div className="font-display text-2xl text-primary font-semibold w-10">{n}</div>
                  <div>
                    <div className="font-semibold text-foreground">{t}</div>
                    <div className="text-sm text-muted-foreground mt-0.5">{d}</div>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* SAFETY CTA */}
      <section id="safety" className="container py-24 text-center">
        <div className="mx-auto max-w-3xl">
          <h2 className="font-display text-4xl md:text-5xl font-semibold tracking-tight text-balance">
            Designed to do no harm.
          </h2>
          <p className="mt-5 text-lg text-muted-foreground leading-relaxed">
            Every recommendation surfaces its evidence tier, every plan is bounded to two modalities by default, and any
            red flag escalates instantly to emergency care. Clinicians retain final authority.
          </p>
          <Button asChild size="lg" className="mt-9 h-14 px-8 rounded-full bg-gradient-primary text-primary-foreground shadow-glow text-base">
            <Link to="/intake">
              Try the intake flow
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
};

export default Index;

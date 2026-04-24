import { Link } from "react-router-dom";
import { ArrowRight, Sparkles, ShieldCheck, Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { useLanguage } from "@/contexts/LanguageContext";
import { MODULES } from "@/lib/modules";
import heroBg from "@/assets/hero-bg.jpg";

const Index = () => {
  const { t } = useLanguage();

  const workflowSteps = [
    ["01", "workflow01Title", "workflow01Desc"],
    ["02", "workflow02Title", "workflow02Desc"],
    ["03", "workflow03Title", "workflow03Desc"],
    ["04", "workflow04Title", "workflow04Desc"],
    ["05", "workflow05Title", "workflow05Desc"],
    ["06", "workflow06Title", "workflow06Desc"],
  ] as const;

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
              {t("heroBadge")}
            </div>
            <h1 className="font-display text-5xl md:text-7xl font-semibold leading-[1.02] tracking-tight text-foreground text-balance">
              {t("heroTitleLine1")} <br />
              <span className="bg-gradient-primary bg-clip-text text-transparent">{t("heroTitleAccent")}</span>
            </h1>
            <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl leading-relaxed">
              {t("heroDescription")}
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-4">
              <Button asChild size="lg" className="h-14 px-8 rounded-full bg-gradient-primary text-primary-foreground shadow-glow hover:shadow-elegant transition-smooth text-base">
                <Link to="/intake">
                  {t("heroPrimaryCta")}
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="h-14 px-7 rounded-full border-border/80 text-base">
                <Link to="/clinician">{t("heroSecondaryCta")}</Link>
              </Button>
            </div>

            <div className="mt-10 flex flex-wrap gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" /> {t("heroFeatureSafety")}</div>
              <div className="flex items-center gap-2"><Languages className="h-4 w-4 text-primary" /> {t("heroFeatureLanguages")}</div>
              <div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> {t("heroFeatureEvidence")}</div>
            </div>
          </div>
        </div>
      </section>

      {/* MODULES */}
      <section id="modules" className="container py-20">
        <div className="max-w-2xl mb-12">
          <div className="text-xs uppercase tracking-[0.2em] text-primary font-semibold mb-3">{t("orchestratorEyebrow")}</div>
          <h2 className="font-display text-4xl md:text-5xl font-semibold tracking-tight text-balance">
            {t("orchestratorTitle")}
          </h2>
          <p className="mt-4 text-muted-foreground text-lg">
            {t("orchestratorDescription")}
          </p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {MODULES.map((m, i) => (
            <div
              key={m.titleKey}
              className="group relative rounded-2xl border border-border/70 bg-card p-6 shadow-soft hover:shadow-elegant transition-smooth hover:-translate-y-0.5"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary-soft text-primary group-hover:bg-gradient-primary group-hover:text-primary-foreground transition-smooth">
                <m.icon className="h-5 w-5" strokeWidth={2} />
              </div>
              <h3 className="font-display text-xl font-semibold mb-1.5">{t(m.titleKey)}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{t(m.descKey)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* HOW */}
      <section id="how" className="bg-gradient-soft py-20 border-y border-border/60">
        <div className="container">
          <div className="grid gap-12 lg:grid-cols-2 items-center">
          <div>
              <div className="text-xs uppercase tracking-[0.2em] text-primary font-semibold mb-3">{t("workflowEyebrow")}</div>
              <h2 className="font-display text-4xl md:text-5xl font-semibold tracking-tight">
                {t("workflowTitle")}
              </h2>
              <p className="mt-5 text-muted-foreground text-lg leading-relaxed">
                {t("workflowDescription")}
              </p>
            </div>
            <ol className="space-y-3">
              {workflowSteps.map(([n, titleKey, descKey]) => (
                <li key={n} className="flex gap-4 rounded-2xl bg-card border border-border/70 p-5 shadow-soft">
                  <div className="font-display text-2xl text-primary font-semibold w-10">{n}</div>
                  <div>
                    <div className="font-semibold text-foreground">{t(titleKey)}</div>
                    <div className="text-sm text-muted-foreground mt-0.5">{t(descKey)}</div>
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
            {t("safetyTitle")}
          </h2>
          <p className="mt-5 text-lg text-muted-foreground leading-relaxed">
            {t("safetyDescription")}
          </p>
          <Button asChild size="lg" className="mt-9 h-14 px-8 rounded-full bg-gradient-primary text-primary-foreground shadow-glow text-base">
            <Link to="/intake">
              {t("safetyCta")}
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

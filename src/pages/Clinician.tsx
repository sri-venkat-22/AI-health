import { Link } from "react-router-dom";
import { ArrowLeft, ShieldCheck, FileCheck2, MessageSquareWarning, Activity, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { useLanguage } from "@/contexts/LanguageContext";

const Clinician = () => {
  const { t } = useLanguage();
  const features = [
    { icon: FileCheck2, title: t("reviewQueueTitle"), desc: t("reviewQueueDesc") },
    { icon: ShieldCheck, title: t("editApproveTitle"), desc: t("editApproveDesc") },
    { icon: MessageSquareWarning, title: t("conflictEscalationsTitle"), desc: t("conflictEscalationsDesc") },
    { icon: Activity, title: t("auditFeedbackTitle"), desc: t("auditFeedbackDesc") },
  ];

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="container py-12 max-w-4xl">
        <Button variant="ghost" asChild className="mb-6 rounded-full -ml-3">
          <Link to="/"><ArrowLeft className="mr-1.5 h-4 w-4" /> {t("home")}</Link>
        </Button>

        <div className="text-xs uppercase tracking-[0.2em] text-primary font-semibold mb-3">{t("clinicianEyebrow")}</div>
        <h1 className="font-display text-4xl md:text-6xl font-semibold tracking-tight text-balance">
          {t("clinicianTitle")}
        </h1>
        <p className="mt-5 text-lg text-muted-foreground max-w-2xl leading-relaxed">
          {t("clinicianDescription")}
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild size="lg" className="rounded-full bg-gradient-primary text-primary-foreground shadow-glow">
            <Link to="/auth">{t("signInToDashboard")} <ArrowRight className="ml-2 h-4 w-4" /></Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="rounded-full">
            <Link to="/interactions">{t("openInteractionScanner")}</Link>
          </Button>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2">
          {features.map((feature) => (
            <div key={feature.title} className="rounded-2xl border border-border/70 bg-card p-6 shadow-soft">
              <div className="h-10 w-10 rounded-xl bg-primary-soft text-primary flex items-center justify-center mb-3">
                <feature.icon className="h-5 w-5" />
              </div>
              <div className="font-semibold mb-1">{feature.title}</div>
              <p className="text-sm text-muted-foreground">{feature.desc}</p>
            </div>
          ))}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
};

export default Clinician;

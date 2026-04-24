import { Link } from "react-router-dom";
import { Activity } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { LANGUAGES, type LanguageCode } from "@/lib/languages";

export const SiteHeader = () => {
  const { language, setLanguage, t, isTranslating, translationWarning } = useLanguage();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
            <Activity className="h-5 w-5 text-primary-foreground" strokeWidth={2.5} />
          </div>
          <div className="leading-tight">
            <div className="font-display text-lg font-semibold text-foreground">{t("appName")}</div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{t("tagline")}</div>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-7 text-sm text-muted-foreground">
          <a href="/#modules" className="hover:text-foreground transition-smooth">{t("modulesNav")}</a>
          <a href="/#how" className="hover:text-foreground transition-smooth">{t("howItWorksNav")}</a>
          <a href="/#safety" className="hover:text-foreground transition-smooth">{t("safetyNav")}</a>
          <Link to="/patient" className="hover:text-foreground transition-smooth">{t("patientPortalNav")}</Link>
          <Link to="/clinician" className="hover:text-foreground transition-smooth">{t("forCliniciansNav")}</Link>
        </nav>

        <div className="flex items-center gap-3">
          {isTranslating && (
            <span className="hidden md:inline text-xs text-primary">{t("translationLoading")}</span>
          )}
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as LanguageCode)}
            className="h-9 rounded-full border border-border bg-card px-3 text-sm font-medium text-foreground shadow-soft focus:outline-none focus:ring-2 focus:ring-ring"
            aria-label={t("chooseLanguage")}
          >
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>{l.native}</option>
            ))}
          </select>
        </div>
      </div>
      {translationWarning && (
        <div className="border-t border-warning/30 bg-warning/10 px-4 py-2 text-center text-xs text-warning-foreground">
          {translationWarning}
        </div>
      )}
    </header>
  );
};

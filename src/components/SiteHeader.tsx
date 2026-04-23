import { Link } from "react-router-dom";
import { Activity } from "lucide-react";
import { LANGUAGES, type LanguageCode, t } from "@/lib/languages";

interface Props {
  lang?: LanguageCode;
  onLangChange?: (l: LanguageCode) => void;
}

export const SiteHeader = ({ lang = "en", onLangChange }: Props) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
            <Activity className="h-5 w-5 text-primary-foreground" strokeWidth={2.5} />
          </div>
          <div className="leading-tight">
            <div className="font-display text-lg font-semibold text-foreground">Sanjeevani</div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Integrative Care AI</div>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-7 text-sm text-muted-foreground">
          <a href="/#modules" className="hover:text-foreground transition-smooth">{t(lang, "modulesNav")}</a>
          <a href="/#how" className="hover:text-foreground transition-smooth">{t(lang, "howItWorksNav")}</a>
          <a href="/#safety" className="hover:text-foreground transition-smooth">{t(lang, "safetyNav")}</a>
          <Link to="/patient" className="hover:text-foreground transition-smooth">{t(lang, "patientPortalNav")}</Link>
          <Link to="/clinician" className="hover:text-foreground transition-smooth">{t(lang, "forCliniciansNav")}</Link>
        </nav>

        {onLangChange && (
          <select
            value={lang}
            onChange={(e) => onLangChange(e.target.value as LanguageCode)}
            className="h-9 rounded-full border border-border bg-card px-3 text-sm font-medium text-foreground shadow-soft focus:outline-none focus:ring-2 focus:ring-ring"
            aria-label={t(lang, "chooseLanguage")}
          >
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>{l.native}</option>
            ))}
          </select>
        )}
      </div>
    </header>
  );
};

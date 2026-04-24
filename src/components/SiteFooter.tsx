import { useLanguage } from "@/contexts/LanguageContext";

export const SiteFooter = () => {
  const { t } = useLanguage();

  return (
    <footer className="border-t border-border/60 mt-24 bg-gradient-soft">
      <div className="container py-12 grid gap-8 md:grid-cols-3 text-sm">
        <div>
          <div className="font-display text-xl font-semibold mb-2">{t("appName")}</div>
          <p className="text-muted-foreground leading-relaxed max-w-xs">
            {t("footerBrandDescription")}
          </p>
        </div>
        <div>
          <div className="font-semibold mb-3 text-foreground">{t("footerEvidenceTitle")}</div>
          <ul className="space-y-1.5 text-muted-foreground">
            <li>{t("footerEvidence1")}</li>
            <li>{t("footerEvidence2")}</li>
            <li>{t("footerEvidence3")}</li>
            <li>{t("footerEvidence4")}</li>
          </ul>
        </div>
        <div>
          <div className="font-semibold mb-3 text-foreground">{t("footerSafetyTitle")}</div>
          <p className="text-muted-foreground leading-relaxed">
            {t("footerSafetyDescription")}
          </p>
        </div>
      </div>
      <div className="border-t border-border/60 py-5 text-center text-xs text-muted-foreground">
        {t("footerCopyright", { year: new Date().getFullYear() })}
      </div>
    </footer>
  );
};

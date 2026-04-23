export const SiteFooter = () => (
  <footer className="border-t border-border/60 mt-24 bg-gradient-soft">
    <div className="container py-12 grid gap-8 md:grid-cols-3 text-sm">
      <div>
        <div className="font-display text-xl font-semibold mb-2">Sanjeevani</div>
        <p className="text-muted-foreground leading-relaxed max-w-xs">
          AI Integrative Multilingual Telehealth Orchestrator. Decision-support, not a substitute for medical judgement.
        </p>
      </div>
      <div>
        <div className="font-semibold mb-3 text-foreground">Evidence sources</div>
        <ul className="space-y-1.5 text-muted-foreground">
          <li>WHO clinical guidelines</li>
          <li>ICMR India treatment protocols</li>
          <li>AYUSH classical texts &amp; pharmacopoeia</li>
          <li>Peer-reviewed integrative research</li>
        </ul>
      </div>
      <div>
        <div className="font-semibold mb-3 text-foreground">Safety</div>
        <p className="text-muted-foreground leading-relaxed">
          Every plan passes through cross-modality conflict checks and a human-in-the-loop clinician review before being acted upon.
        </p>
      </div>
    </div>
    <div className="border-t border-border/60 py-5 text-center text-xs text-muted-foreground">
      © {new Date().getFullYear()} Sanjeevani Health · For research and clinical decision-support only.
    </div>
  </footer>
);

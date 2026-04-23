import { describe, expect, it } from "vitest";
import {
  buildIntakePayload,
  generateIntegrativePlan,
  parseDurationToDays,
  scanInteractions,
} from "@/lib/clinicalEngine";

describe("clinical orchestration engine", () => {
  it("marks chest pain in adults above 35 as emergent and allopathy only", async () => {
    const intake = buildIntakePayload(
      {
        symptoms: "I have chest pain and sweating for the last 1 hour",
        duration: "1 hour",
        age: 42,
        sex: "male",
        preferences: ["allopathy", "ayurveda", "homeopathy"],
        comorbidities: "hypertension",
      },
      "en",
    );

    const plan = await generateIntegrativePlan(intake, { useOfflineModel: false });

    expect(plan.risk_level).toBe("emergent");
    expect(plan.care_path_steps.filter((step) => step.selected)).toHaveLength(1);
    expect(plan.care_path_steps.find((step) => step.selected)?.modality).toBe("Allopathy");
    expect(plan.explainability.triggered_rules).toContain("R_EMERG_01");
    expect(plan.clinical_route).toBe("emergency");
  });

  it("caps the active care path to two modalities and produces multilingual translations", async () => {
    const intake = buildIntakePayload(
      {
        symptoms: "Fever, cough and sore throat for 2 days",
        duration: "2 days",
        age: 29,
        sex: "female",
        preferences: ["allopathy", "ayurveda", "homeopathy", "home"],
      },
      "hi",
    );

    const plan = await generateIntegrativePlan(intake, { useOfflineModel: false });

    expect(plan.care_path_steps.filter((step) => step.selected).length).toBeLessThanOrEqual(2);
    expect(plan.plan_segments).toHaveLength(4);
    expect(plan.translation.language).toBe("हिन्दी");
    expect(plan.translations.hi.summary.length).toBeGreaterThan(0);
    expect(plan.back_translation_confidence).toBeGreaterThanOrEqual(0.9);
    expect(plan.provenance.length).toBeGreaterThan(0);
    expect(plan.explainability.triage_model.ensemble_probability).toBeGreaterThan(0);
  });

  it("flags ssri plus st johns wort as a severe interaction", async () => {
    const report = await scanInteractions({
      medications: "sertraline 50 mg",
      herbs: "St. John's Wort",
    }, { useOfflineModel: false });

    expect(report.overall_risk).toBe("high");
    expect(report.interactions[0]?.severity).toBe("severe");
    expect(report.interactions[0]?.mechanism).toMatch(/seroton/i);
  });

  it("flags hypertension with warming herbs and parses natural duration", async () => {
    const report = await scanInteractions({
      herbs: "ginger tea, clove",
      comorbidities: "hypertension",
    }, { useOfflineModel: false });

    expect(report.overall_risk).toBe("moderate");
    expect(report.interactions[0]?.kind).toBe("herb-condition");
    expect(parseDurationToDays("2 weeks")).toBe(14);
  });
});

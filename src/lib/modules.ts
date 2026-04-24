import { Activity, Stethoscope, Leaf, Droplets, Home, Languages, Shield, BookOpenCheck, Users, GitBranch, BrainCircuit } from "lucide-react";

export const MODULES = [
  { icon: Activity, titleKey: "modulePatientIntakeTitle", descKey: "modulePatientIntakeDesc" },
  { icon: Shield, titleKey: "moduleRiskTriageTitle", descKey: "moduleRiskTriageDesc" },
  { icon: BrainCircuit, titleKey: "moduleOfflineLlmTitle", descKey: "moduleOfflineLlmDesc" },
  { icon: GitBranch, titleKey: "moduleCareOrchestrationTitle", descKey: "moduleCareOrchestrationDesc" },
  { icon: Stethoscope, titleKey: "moduleAllopathyTitle", descKey: "moduleAllopathyDesc" },
  { icon: Leaf, titleKey: "moduleAyurvedaTitle", descKey: "moduleAyurvedaDesc" },
  { icon: Droplets, titleKey: "moduleHomeopathyTitle", descKey: "moduleHomeopathyDesc" },
  { icon: Home, titleKey: "moduleHomeRemediesTitle", descKey: "moduleHomeRemediesDesc" },
  { icon: Shield, titleKey: "moduleSafetyTitle", descKey: "moduleSafetyDesc" },
  { icon: Languages, titleKey: "moduleMultilingualTitle", descKey: "moduleMultilingualDesc" },
  { icon: BookOpenCheck, titleKey: "moduleEvidenceTitle", descKey: "moduleEvidenceDesc" },
  { icon: Users, titleKey: "moduleClinicianTitle", descKey: "moduleClinicianDesc" },
] as const;

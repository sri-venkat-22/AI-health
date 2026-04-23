import { Activity, Stethoscope, Leaf, Droplets, Home, Languages, Shield, BookOpenCheck, Users, GitBranch, BrainCircuit } from "lucide-react";

export const MODULES = [
  { icon: Activity, title: "Patient Intake", desc: "Multilingual structured capture with ICD/SNOMED + Ayurvedic dosha mapping." },
  { icon: Shield, title: "Risk Triage", desc: "Hybrid rule + ML triage: emergent → urgent → routine → self-care." },
  { icon: BrainCircuit, title: "Offline LLM", desc: "Local Ollama synthesis for specialist-style recommendations without cloud dependency." },
  { icon: GitBranch, title: "Care Orchestration", desc: "Routes to GP or specialist; up to two modalities by default." },
  { icon: Stethoscope, title: "Allopathy Engine", desc: "Evidence-first recommendations for acute presentations." },
  { icon: Leaf, title: "Ayurveda Engine", desc: "Dosha-based guidance grounded in classical AYUSH texts." },
  { icon: Droplets, title: "Homeopathy", desc: "Constitutional remedies surfaced as complementary options." },
  { icon: Home, title: "Home Remedies", desc: "Safe self-care that won't conflict with prescribed therapy." },
  { icon: Shield, title: "Safety & Conflicts", desc: "Herb–drug interactions and contraindications flagged in real time." },
  { icon: Languages, title: "Multilingual Output", desc: "English ↔ Hindi, Tamil, Telugu, Bengali, Marathi and more with back-translation." },
  { icon: BookOpenCheck, title: "Evidence & RAG", desc: "Citations from WHO, ICMR, AYUSH with reliability tiers A/B/T." },
  { icon: Users, title: "Clinician-in-the-Loop", desc: "Every plan can be reviewed, edited and approved by a clinician." },
] as const;

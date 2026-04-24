export const LANGUAGES = [
  { code: "en", name: "English", native: "English" },
  { code: "hi", name: "Hindi", native: "हिन्दी" },
  { code: "ta", name: "Tamil", native: "தமிழ்" },
  { code: "te", name: "Telugu", native: "తెలుగు" },
  { code: "bn", name: "Bengali", native: "বাংলা" },
  { code: "mr", name: "Marathi", native: "मराठी" },
  { code: "kn", name: "Kannada", native: "ಕನ್ನಡ" },
  { code: "ml", name: "Malayalam", native: "മലയാളം" },
] as const;

export type LanguageCode = typeof LANGUAGES[number]["code"];

export const getLanguageName = (code: string) =>
  LANGUAGES.find((language) => language.code === code)?.name ?? "English";

export const getLanguageNative = (code: string) =>
  LANGUAGES.find((language) => language.code === code)?.native ?? "English";

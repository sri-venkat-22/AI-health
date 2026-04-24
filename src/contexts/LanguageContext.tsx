import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import enStrings from "@/locales/en.json";
import hiStrings from "@/locales/hi.json";
import taStrings from "@/locales/ta.json";
import teStrings from "@/locales/te.json";
import bnStrings from "@/locales/bn.json";
import mrStrings from "@/locales/mr.json";
import knStrings from "@/locales/kn.json";
import mlStrings from "@/locales/ml.json";
import { getLanguageNative, LANGUAGES, type LanguageCode } from "@/lib/languages";

const LANGUAGE_STORAGE_KEY = "sanjeevani:selected-language";

type TranslationMap = Record<string, string>;

interface LanguageContextValue {
  language: LanguageCode;
  setLanguage: (language: LanguageCode) => void;
  t: (key: string, values?: Record<string, string | number>) => string;
  isTranslating: boolean;
  translationWarning: string | null;
  languageLabel: string;
}

const defaultLanguage: LanguageCode = "en";
const englishResources = enStrings as TranslationMap;
const resourceMap: Record<LanguageCode, TranslationMap> = {
  en: enStrings as TranslationMap,
  hi: hiStrings as TranslationMap,
  ta: taStrings as TranslationMap,
  te: teStrings as TranslationMap,
  bn: bnStrings as TranslationMap,
  mr: mrStrings as TranslationMap,
  kn: knStrings as TranslationMap,
  ml: mlStrings as TranslationMap,
};

const LanguageContext = createContext<LanguageContextValue>({
  language: defaultLanguage,
  setLanguage: () => {},
  t: (key) => englishResources[key] ?? key,
  isTranslating: false,
  translationWarning: null,
  languageLabel: getLanguageNative(defaultLanguage),
});

function interpolate(template: string, values?: Record<string, string | number>) {
  if (!values) return template;
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replaceAll(`{{${key}}}`, String(value)),
    template,
  );
}

function getInitialLanguage(): LanguageCode {
  if (typeof window === "undefined") return defaultLanguage;
  const stored = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  return LANGUAGES.some((language) => language.code === stored)
    ? (stored as LanguageCode)
    : defaultLanguage;
}

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguageState] = useState<LanguageCode>(getInitialLanguage);

  const resources = useMemo(
    () => resourceMap[language] ?? englishResources,
    [language],
  );

  const translationWarning = useMemo(() => {
    if (language === "en") return null;
    const missingKeys = Object.keys(englishResources).filter((key) => !resources[key]);
    return missingKeys.length > 0 ? englishResources.translationWarning : null;
  }, [language, resources]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    }

    document.documentElement.lang = language;
    document.documentElement.dataset.language = language;
    document.body.dataset.language = language;
  }, [language]);

  const t = useCallback(
    (key: string, values?: Record<string, string | number>) =>
      interpolate(resources[key] ?? englishResources[key] ?? key, values),
    [resources],
  );

  const setLanguage = useCallback((nextLanguage: LanguageCode) => {
    setLanguageState(nextLanguage);
  }, []);

  const value = useMemo(
    () => ({
      language,
      setLanguage,
      t,
      isTranslating: false,
      translationWarning,
      languageLabel: getLanguageNative(language),
    }),
    [language, setLanguage, t, translationWarning],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export const useLanguage = () => useContext(LanguageContext);

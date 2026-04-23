import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";
import enStrings from "@/locales/en.json";
import { getLanguageNative, LANGUAGES, type LanguageCode } from "@/lib/languages";
import { translateTextBatch } from "@/lib/translationService";

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
const resourceEntries = Object.entries(englishResources);

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
  const [resources, setResources] = useState<TranslationMap>(englishResources);
  const [isTranslating, setIsTranslating] = useState(false);
  const [translationWarning, setTranslationWarning] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    }

    document.documentElement.lang = language;
    document.documentElement.dataset.language = language;
    document.body.dataset.language = language;
  }, [language]);

  useEffect(() => {
    let cancelled = false;

    const loadResources = async () => {
      if (language === "en") {
        setResources(englishResources);
        setTranslationWarning(null);
        setIsTranslating(false);
        return;
      }

      setIsTranslating(true);
      const result = await translateTextBatch({
        strings: resourceEntries.map(([, value]) => value),
        langCode: language,
        cacheNamespace: "ui-static",
        storage: "local",
      });

      if (cancelled) return;

      const translatedResources = resourceEntries.reduce<TranslationMap>((accumulator, [key], index) => {
        accumulator[key] = result.translations[index] || englishResources[key] || key;
        return accumulator;
      }, {});

      setResources(translatedResources);
      setTranslationWarning(result.fallback ? englishResources.translationWarning : null);
      setIsTranslating(false);
    };

    void loadResources();

    return () => {
      cancelled = true;
    };
  }, [language]);

  const t = useMemo(
    () => (key: string, values?: Record<string, string | number>) =>
      interpolate(resources[key] ?? englishResources[key] ?? key, values),
    [resources],
  );

  const setLanguage = (nextLanguage: LanguageCode) => {
    setLanguageState(nextLanguage);
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t,
        isTranslating,
        translationWarning,
        languageLabel: getLanguageNative(language),
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);

import { getLanguageNative, type LanguageCode } from "@/lib/languages";
import { getOfflineModelSettings } from "@/lib/localStore";
import {
  DEFAULT_OFFLINE_MODEL_SETTINGS,
  generateStructuredOffline,
  getOfflineModelStatus,
} from "@/lib/offlineLlm";

type StorageMode = "session" | "local";

interface TranslateBatchInput {
  strings: string[];
  langCode: LanguageCode;
  cacheNamespace: string;
  storage?: StorageMode;
}

export interface TranslateBatchResult {
  translations: string[];
  fallback: boolean;
  warning: string | null;
}

const PLACEHOLDER_RE = /\{\{[^}]+\}\}/g;
const PROTECTED_TERMS = [
  "Sanjeevani",
  "WHO",
  "ICMR",
  "AYUSH",
  "Ollama",
  "JSON",
  "ICD/SNOMED",
  "ICD-10",
  "SpO2",
  "LLM",
  "GP",
] as const;

function simpleHash(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

function getStorage(mode: StorageMode) {
  if (typeof window === "undefined") return null;
  return mode === "local" ? window.localStorage : window.sessionStorage;
}

function getCacheKey(input: TranslateBatchInput) {
  return `sanjeevani:translation:${input.cacheNamespace}:v2:${input.langCode}:${simpleHash(input.strings.join("\u241f"))}`;
}

function protectText(text: string) {
  let protectedText = text;
  const tokens: Array<[string, string]> = [];
  const replacements = [
    ...Array.from(text.matchAll(PLACEHOLDER_RE)).map((match) => match[0]),
    ...PROTECTED_TERMS,
  ];

  Array.from(new Set(replacements)).forEach((value, index) => {
    if (!value || !protectedText.includes(value)) return;
    const token = `ZXQTOKEN${index}QXZ`;
    protectedText = protectedText.split(value).join(token);
    tokens.push([token, value]);
  });

  return { protectedText, tokens };
}

function restoreText(text: string, tokens: Array<[string, string]>) {
  return tokens.reduce(
    (result, [token, value]) => result.split(token).join(value),
    text,
  );
}

async function translateViaGoogle(text: string, langCode: LanguageCode) {
  if (!text.trim()) return text;

  const { protectedText, tokens } = protectText(text);
  const url =
    "https://translate.googleapis.com/translate_a/single?client=gtx&sl=en" +
    `&tl=${encodeURIComponent(langCode)}&dt=t&q=${encodeURIComponent(protectedText)}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Translation API responded with ${response.status}.`);
  }

  const payload = (await response.json()) as Array<Array<[string]>>;
  const translated = (payload[0] || [])
    .map((part) => part[0] || "")
    .join("");

  return restoreText(translated, tokens)
    .replace(/\u00a0/g, " ")
    .replace(/\s+:/g, ":")
    .replace(/\s+%/g, "%")
    .trim();
}

async function translateViaGoogleBatch(strings: string[], langCode: LanguageCode) {
  const translations = new Array<string>(strings.length);
  let cursor = 0;

  async function worker() {
    while (cursor < strings.length) {
      const index = cursor;
      cursor += 1;
      translations[index] = await translateViaGoogle(strings[index], langCode);
    }
  }

  await Promise.all(Array.from({ length: Math.min(8, strings.length) }, () => worker()));
  return translations;
}

export async function translateTextBatch(input: TranslateBatchInput): Promise<TranslateBatchResult> {
  if (input.langCode === "en" || input.strings.length === 0) {
    return {
      translations: input.strings,
      fallback: false,
      warning: null,
    };
  }

  const storage = getStorage(input.storage ?? "session");
  const cacheKey = getCacheKey(input);

  if (storage) {
    const cached = storage.getItem(cacheKey);
    if (cached) {
      try {
        return {
          translations: JSON.parse(cached) as string[],
          fallback: false,
          warning: null,
        };
      } catch {
        storage.removeItem(cacheKey);
      }
    }
  }

  try {
    const googleTranslations = await translateViaGoogleBatch(input.strings, input.langCode);
    if (storage) {
      storage.setItem(cacheKey, JSON.stringify(googleTranslations));
    }

    return {
      translations: googleTranslations,
      fallback: false,
      warning: null,
    };
  } catch {
    // fall back to offline translation
  }

  const settings = getOfflineModelSettings() || DEFAULT_OFFLINE_MODEL_SETTINGS;
  const status = await getOfflineModelStatus(settings);

  if (!settings.enabled || !status.available) {
    return {
      translations: input.strings,
      fallback: true,
      warning: "Translation service is unavailable for the selected language.",
    };
  }

  const schema = {
    type: "object",
    properties: {
      translations: {
        type: "array",
        items: { type: "string" },
      },
    },
    required: ["translations"],
  } as const;

  try {
    const { output } = await generateStructuredOffline<{ translations: string[] }>({
      settings,
      systemPrompt:
        "Translate each input string from English into the requested Indian language. Preserve the original meaning, punctuation, ordering, and concise UI tone. Return JSON only.",
      userPrompt: [
        `TARGET LANGUAGE CODE: ${input.langCode}`,
        `TARGET LANGUAGE NAME: ${getLanguageNative(input.langCode)}`,
        `INPUT STRINGS JSON: ${JSON.stringify(input.strings)}`,
        "Return the same number of translated strings in the same order.",
      ].join("\n"),
      schema,
    });

    if (output.translations.length === input.strings.length) {
      if (storage) {
        storage.setItem(cacheKey, JSON.stringify(output.translations));
      }

      return {
        translations: output.translations,
        fallback: false,
        warning: null,
      };
    }
  } catch {
    // fall through to warning result
  }

  return {
    translations: input.strings,
    fallback: true,
    warning: "Translation could not be completed for the selected language.",
  };
}

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
  return `sanjeevani:translation:${input.cacheNamespace}:v1:${input.langCode}:${simpleHash(input.strings.join("\u241f"))}`;
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

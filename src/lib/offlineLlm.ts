import type { OfflineModelSettings, OfflineModelStatus } from "@/lib/types";

export const DEFAULT_OFFLINE_MODEL_SETTINGS: OfflineModelSettings = {
  enabled: true,
  baseUrl: "http://127.0.0.1:11434",
  model: "phi3:latest",
  temperature: 0.1,
  timeoutMs: 45000,
};

const PREFERRED_MODEL_ORDER = [
  "phi3:latest",
  "qwen3:8b",
  "qwen3:latest",
] as const;

function joinUrl(baseUrl: string, path: string) {
  return `${baseUrl.replace(/\/+$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
}

function normalizeBaseUrl(baseUrl: string) {
  const trimmed = baseUrl.trim().replace(/\/+$/, "") || DEFAULT_OFFLINE_MODEL_SETTINGS.baseUrl;
  return trimmed.replace("http://localhost:", "http://127.0.0.1:");
}

function getCandidateBaseUrls(baseUrl: string) {
  const normalized = normalizeBaseUrl(baseUrl);
  const candidates = [normalized];
  if (normalized.includes("127.0.0.1")) {
    candidates.push(normalized.replace("127.0.0.1", "localhost"));
  } else if (normalized.includes("localhost")) {
    candidates.push(normalized.replace("localhost", "127.0.0.1"));
  }
  return Array.from(new Set(candidates));
}

function selectBestInstalledModel(requestedModel: string, installedModels: string[]) {
  if (installedModels.includes(requestedModel)) return requestedModel;
  const preferred = PREFERRED_MODEL_ORDER.find((model) => installedModels.includes(model));
  if (preferred) return preferred;
  return installedModels[0] || requestedModel;
}

function withTimeout(timeoutMs: number) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  return {
    signal: controller.signal,
    clear: () => window.clearTimeout(timeout),
  };
}

function parseJsonCandidate<T>(raw: string): T {
  const trimmed = raw.trim();
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    return JSON.parse(trimmed) as T;
  }

  const match = trimmed.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (match) {
    return JSON.parse(match[0]) as T;
  }

  throw new Error("Local model returned non-JSON output.");
}

export async function getOfflineModelStatus(
  settings: OfflineModelSettings = DEFAULT_OFFLINE_MODEL_SETTINGS,
): Promise<OfflineModelStatus> {
  if (!settings.enabled) {
    return {
      provider: "ollama",
      enabled: false,
      available: false,
      baseUrl: settings.baseUrl,
      model: settings.model,
      installedModels: [],
      lastError: null,
    };
  }

  let lastError: string | null = null;

  for (const baseUrl of getCandidateBaseUrls(settings.baseUrl)) {
    const request = withTimeout(settings.timeoutMs);
    try {
      const response = await fetch(joinUrl(baseUrl, "/api/tags"), {
        method: "GET",
        signal: request.signal,
      });

      if (!response.ok) {
        throw new Error(`Ollama responded with ${response.status}.`);
      }

      const payload = (await response.json()) as { models?: Array<{ name: string }> };
      const installedModels = payload.models?.map((model) => model.name) ?? [];
      const selectedModel = selectBestInstalledModel(settings.model, installedModels);

      return {
        provider: "ollama",
        enabled: true,
        available: installedModels.includes(selectedModel),
        baseUrl,
        model: selectedModel,
        installedModels,
        lastError: installedModels.includes(selectedModel)
          ? null
          : `No supported Ollama model is installed. Expected one of: ${PREFERRED_MODEL_ORDER.join(", ")}.`,
      };
    } catch (error) {
      lastError = error instanceof Error ? error.message : "Unable to reach the local Ollama API.";
    } finally {
      request.clear();
    }
  }

  return {
    provider: "ollama",
    enabled: true,
    available: false,
    baseUrl: normalizeBaseUrl(settings.baseUrl),
    model: settings.model,
    installedModels: [],
    lastError,
  };
}

export async function resolveOfflineModelSettings(
  settings: OfflineModelSettings = DEFAULT_OFFLINE_MODEL_SETTINGS,
): Promise<{ settings: OfflineModelSettings; status: OfflineModelStatus }> {
  const status = await getOfflineModelStatus(settings);
  const resolvedSettings: OfflineModelSettings = {
    ...settings,
    baseUrl: status.baseUrl,
    model: status.model,
  };

  return {
    settings: resolvedSettings,
    status,
  };
}

export async function generateStructuredOffline<T>(input: {
  settings: OfflineModelSettings;
  systemPrompt: string;
  userPrompt: string;
  schema: Record<string, unknown>;
}): Promise<{ output: T; status: OfflineModelStatus }> {
  const { settings, status } = await resolveOfflineModelSettings(input.settings);
  if (!status.available) {
    throw new Error(status.lastError || "Offline model is unavailable.");
  }

  const request = withTimeout(settings.timeoutMs);
  try {
    const response = await fetch(joinUrl(settings.baseUrl, "/api/generate"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: settings.model,
        system: input.systemPrompt,
        prompt: input.userPrompt,
        format: input.schema,
        stream: false,
        options: {
          temperature: settings.temperature,
        },
      }),
      signal: request.signal,
    });

    if (!response.ok) {
      throw new Error(`Ollama generation failed with ${response.status}.`);
    }

    const payload = (await response.json()) as { response?: string };
    if (!payload.response) {
      throw new Error("Offline model returned an empty response.");
    }

    return {
      output: parseJsonCandidate<T>(payload.response),
      status,
    };
  } finally {
    request.clear();
  }
}

import type { OfflineModelSettings, OfflineModelStatus } from "@/lib/types";

export const DEFAULT_OFFLINE_MODEL_SETTINGS: OfflineModelSettings = {
  enabled: true,
  baseUrl: "http://127.0.0.1:11434",
  model: "phi3:latest",
  temperature: 0.2,
  timeoutMs: 45000,
};

function joinUrl(baseUrl: string, path: string) {
  return `${baseUrl.replace(/\/+$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
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

  const request = withTimeout(settings.timeoutMs);
  try {
    const response = await fetch(joinUrl(settings.baseUrl, "/api/tags"), {
      method: "GET",
      signal: request.signal,
    });

    if (!response.ok) {
      throw new Error(`Ollama responded with ${response.status}.`);
    }

    const payload = (await response.json()) as { models?: Array<{ name: string }> };
    const installedModels = payload.models?.map((model) => model.name) ?? [];

    return {
      provider: "ollama",
      enabled: true,
      available: installedModels.includes(settings.model),
      baseUrl: settings.baseUrl,
      model: settings.model,
      installedModels,
      lastError: installedModels.includes(settings.model)
        ? null
        : `Configured model "${settings.model}" is not installed.`,
    };
  } catch (error) {
    return {
      provider: "ollama",
      enabled: true,
      available: false,
      baseUrl: settings.baseUrl,
      model: settings.model,
      installedModels: [],
      lastError: error instanceof Error ? error.message : "Unable to reach the local Ollama API.",
    };
  } finally {
    request.clear();
  }
}

export async function generateStructuredOffline<T>(input: {
  settings: OfflineModelSettings;
  systemPrompt: string;
  userPrompt: string;
  schema: Record<string, unknown>;
}): Promise<{ output: T; status: OfflineModelStatus }> {
  const status = await getOfflineModelStatus(input.settings);
  if (!status.available) {
    throw new Error(status.lastError || "Offline model is unavailable.");
  }

  const request = withTimeout(input.settings.timeoutMs);
  try {
    const response = await fetch(joinUrl(input.settings.baseUrl, "/api/generate"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: input.settings.model,
        system: input.systemPrompt,
        prompt: input.userPrompt,
        format: input.schema,
        stream: false,
        options: {
          temperature: input.settings.temperature,
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

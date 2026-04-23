import { useCallback, useEffect, useState } from "react";
import { BrainCircuit, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getOfflineModelSettings, saveOfflineModelSettings } from "@/lib/localStore";
import { DEFAULT_OFFLINE_MODEL_SETTINGS, getOfflineModelStatus } from "@/lib/offlineLlm";
import type { OfflineModelSettings, OfflineModelStatus } from "@/lib/types";

interface Props {
  title?: string;
  description?: string;
  onSettingsChange?: (settings: OfflineModelSettings, status: OfflineModelStatus | null) => void;
}

export const OfflineModelPanel = ({
  title = "Offline LLM",
  description = "Uses Ollama on your machine for local clinical synthesis while deterministic safety rules stay authoritative.",
  onSettingsChange,
}: Props) => {
  const [settings, setSettings] = useState<OfflineModelSettings>(DEFAULT_OFFLINE_MODEL_SETTINGS);
  const [status, setStatus] = useState<OfflineModelStatus | null>(null);
  const [checking, setChecking] = useState(false);

  const refresh = useCallback(async (nextSettings: OfflineModelSettings) => {
    setChecking(true);
    const nextStatus = await getOfflineModelStatus(nextSettings);
    setStatus(nextStatus);
    setChecking(false);
    onSettingsChange?.(nextSettings, nextStatus);
  }, [onSettingsChange]);

  useEffect(() => {
    const stored = getOfflineModelSettings();
    setSettings(stored);
    void refresh(stored);
  }, [refresh]);

  const update = async (patch: Partial<OfflineModelSettings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    saveOfflineModelSettings(next);
    await refresh(next);
  };

  return (
    <section className="rounded-3xl border border-border/70 bg-card p-5 md:p-6 shadow-soft">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <BrainCircuit className="h-5 w-5 text-primary" />
            <h2 className="font-display text-xl font-semibold">{title}</h2>
          </div>
          <p className="mt-2 text-sm text-muted-foreground max-w-2xl">{description}</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-full"
          onClick={() => void refresh(settings)}
          disabled={checking}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${checking ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="md:col-span-1">
          <Label htmlFor="offline-enabled">Use local model</Label>
          <label
            htmlFor="offline-enabled"
            className="mt-2 flex h-10 items-center gap-3 rounded-xl border border-border bg-background px-3 text-sm"
          >
            <input
              id="offline-enabled"
              type="checkbox"
              checked={settings.enabled}
              onChange={(event) => void update({ enabled: event.target.checked })}
            />
            Enable offline Ollama synthesis
          </label>
        </div>

        <div>
          <Label htmlFor="offline-base-url">Base URL</Label>
          <Input
            id="offline-base-url"
            value={settings.baseUrl}
            onChange={(event) => setSettings((current) => ({ ...current, baseUrl: event.target.value }))}
            onBlur={() => void update({ baseUrl: settings.baseUrl })}
            className="mt-2 rounded-xl"
          />
        </div>

        <div>
          <Label htmlFor="offline-model">Model</Label>
          <Input
            id="offline-model"
            list="offline-model-list"
            value={settings.model}
            onChange={(event) => setSettings((current) => ({ ...current, model: event.target.value }))}
            onBlur={() => void update({ model: settings.model })}
            className="mt-2 rounded-xl"
          />
          <datalist id="offline-model-list">
            {(status?.installedModels || []).map((model) => (
              <option key={model} value={model} />
            ))}
          </datalist>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        <span
          className={`rounded-full px-3 py-1 border ${
            status?.available
              ? "border-risk-selfcare/30 bg-risk-selfcare/10 text-risk-selfcare"
              : "border-warning/30 bg-warning/10 text-warning-foreground"
          }`}
        >
          {settings.enabled
            ? status?.available
              ? `Ready: ${status.model}`
              : "Fallback mode"
            : "Offline LLM disabled"}
        </span>
        {status?.installedModels?.map((model) => (
          <span key={model} className="rounded-full px-3 py-1 border border-border bg-muted/60 text-muted-foreground">
            {model}
          </span>
        ))}
      </div>

      {status?.lastError && settings.enabled && (
        <p className="mt-3 text-sm text-warning-foreground">{status.lastError}</p>
      )}
    </section>
  );
};

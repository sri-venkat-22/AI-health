import { useCallback, useEffect, useMemo, useState } from "react";
import { BrainCircuit, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/contexts/LanguageContext";
import { getOfflineModelSettings, saveOfflineModelSettings } from "@/lib/localStore";
import { DEFAULT_OFFLINE_MODEL_SETTINGS, getOfflineModelStatus } from "@/lib/offlineLlm";
import type { OfflineModelSettings, OfflineModelStatus } from "@/lib/types";

interface Props {
  title?: string;
  description?: string;
  onSettingsChange?: (settings: OfflineModelSettings, status: OfflineModelStatus | null) => void;
}

export const OfflineModelPanel = ({
  title,
  description,
  onSettingsChange,
}: Props) => {
  const { t } = useLanguage();
  const [settings, setSettings] = useState<OfflineModelSettings>(DEFAULT_OFFLINE_MODEL_SETTINGS);
  const [status, setStatus] = useState<OfflineModelStatus | null>(null);
  const [checking, setChecking] = useState(false);
  const resolvedTitle = title || t("moduleOfflineLlmTitle");
  const resolvedDescription = description || t("offlinePanelDescription");
  const preferredModelOrder = ["phi3:latest", "qwen3:8b", "qwen3:latest"];
  const modelOptions = useMemo(
    () =>
      Array.from(new Set([...(status?.installedModels || []), settings.model].filter(Boolean))).sort((left, right) => {
        const leftIndex = preferredModelOrder.indexOf(left);
        const rightIndex = preferredModelOrder.indexOf(right);
        if (leftIndex !== -1 || rightIndex !== -1) {
          if (leftIndex === -1) return 1;
          if (rightIndex === -1) return -1;
          return leftIndex - rightIndex;
        }
        return left.localeCompare(right);
      }),
    [settings.model, status?.installedModels],
  );

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
            <h2 className="font-display text-xl font-semibold">{resolvedTitle}</h2>
          </div>
          <p className="mt-2 text-sm text-muted-foreground max-w-2xl">{resolvedDescription}</p>
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
          {t("refresh")}
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="md:col-span-1">
          <Label htmlFor="offline-enabled">{t("useLocalModel")}</Label>
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
            {t("enableOfflineOllamaSynthesis")}
          </label>
        </div>

        <div>
          <Label htmlFor="offline-base-url">{t("baseUrl")}</Label>
          <Input
            id="offline-base-url"
            value={settings.baseUrl}
            onChange={(event) => setSettings((current) => ({ ...current, baseUrl: event.target.value }))}
            onBlur={() => void update({ baseUrl: settings.baseUrl })}
            className="mt-2 rounded-xl"
          />
        </div>

        <div>
          <Label htmlFor="offline-model">{t("model")}</Label>
          <select
            id="offline-model"
            value={settings.model}
            onChange={(event) => void update({ model: event.target.value })}
            className="mt-2 h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
          >
            {modelOptions.map((model) => (
              <option key={model} value={model}>
                {model}
              </option>
            ))}
          </select>
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
              ? t("offlineModelReady", { model: status.model })
              : t("fallbackMode")
            : t("offlineLlmDisabled")}
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

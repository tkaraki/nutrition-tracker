import { useEffect, useMemo, useRef, useState } from "react";
import { Button, Card } from "../components/ui";
import { TargetRow, type RowSaveStatus } from "../components/targets/TargetRow";
import { useClearNutrientTarget, useNutrientTargets, useSetNutrientTarget } from "../hooks/useTargets";
import { NUTRIENT_DISPLAY, NUTRIENT_KEYS, type NutrientKey } from "../lib/nutrients";
import type { NutrientTargets } from "../api/types";

const PRIMARY_KEYS = [...NUTRIENT_KEYS]
  .filter((key) => NUTRIENT_DISPLAY[key].primary)
  .sort((a, b) => NUTRIENT_DISPLAY[a].order - NUTRIENT_DISPLAY[b].order);

const SECONDARY_KEYS = [...NUTRIENT_KEYS]
  .filter((key) => !NUTRIENT_DISPLAY[key].primary)
  .sort((a, b) => NUTRIENT_DISPLAY[a].order - NUTRIENT_DISPLAY[b].order);

function draftFromTargets(targets: NutrientTargets): Record<NutrientKey, string> {
  const draft = {} as Record<NutrientKey, string>;
  for (const key of NUTRIENT_KEYS) {
    const v = targets[key];
    draft[key] = v === undefined ? "" : String(v);
  }
  return draft;
}

function initialRowStatus(): Record<NutrientKey, RowSaveStatus> {
  const status = {} as Record<NutrientKey, RowSaveStatus>;
  for (const key of NUTRIENT_KEYS) status[key] = { state: "idle" };
  return status;
}

function validateField(raw: string): string | null {
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  const num = Number(trimmed);
  if (!Number.isFinite(num) || num < 0) return "Must be 0 or greater";
  return null;
}

/**
 * Per-field save, not one big form submit — the API has no bulk endpoint and
 * each field is independently PUT/DELETE-able. "Save changes" diffs the
 * form against the last-committed server state and fires one PUT (changed/
 * added) or DELETE (blanked via "Clear") per field, in parallel. Partial
 * failure keeps failed rows' typed values and lets the user retry just
 * those — see TargetRow.
 */
export function TargetsRoute() {
  const targetsQuery = useNutrientTargets();
  const setTarget = useSetNutrientTarget();
  const clearTarget = useClearNutrientTarget();

  const [committed, setCommitted] = useState<NutrientTargets | null>(null);
  const [draft, setDraft] = useState<Record<NutrientKey, string> | null>(null);
  const [validationErrors, setValidationErrors] = useState<Partial<Record<NutrientKey, string>>>({});
  const [rowStatus, setRowStatus] = useState<Record<NutrientKey, RowSaveStatus>>(initialRowStatus);
  const [batchSaving, setBatchSaving] = useState(false);
  const [savedBannerVisible, setSavedBannerVisible] = useState(false);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Seed the editable draft from the server exactly once per load — after
  // that, only explicit saves update `committed`/`draft`, so a background
  // refetch (triggered by our own invalidation) never clobbers a field the
  // user is mid-edit on or one that just failed to save.
  useEffect(() => {
    if (targetsQuery.data && draft === null) {
      setCommitted(targetsQuery.data);
      setDraft(draftFromTargets(targetsQuery.data));
    }
  }, [targetsQuery.data, draft]);

  useEffect(() => {
    return () => {
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    };
  }, []);

  function updateDraft(key: NutrientKey, value: string) {
    setDraft((prev) => (prev ? { ...prev, [key]: value } : prev));
    setValidationErrors((prev) => {
      if (!(key in prev)) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setRowStatus((prev) => ({ ...prev, [key]: { state: "idle" } }));
  }

  function handleBlur(key: NutrientKey) {
    if (!draft) return;
    const error = validateField(draft[key]);
    setValidationErrors((prev) => {
      const next = { ...prev };
      if (error) next[key] = error;
      else delete next[key];
      return next;
    });
  }

  function isDirty(key: NutrientKey): boolean {
    if (!draft || !committed) return false;
    const current = draft[key].trim();
    const original = committed[key];
    if (current === "") return original !== undefined;
    const num = Number(current);
    return !Number.isFinite(num) || num !== original;
  }

  const dirtyKeys = draft && committed ? NUTRIENT_KEYS.filter(isDirty) : [];
  const hasRowErrors = NUTRIENT_KEYS.some((k) => rowStatus[k].state === "error");

  async function saveField(key: NutrientKey): Promise<void> {
    if (!draft) return;
    const raw = draft[key];
    const error = validateField(raw);
    if (error) {
      setValidationErrors((prev) => ({ ...prev, [key]: error }));
      return;
    }
    setRowStatus((prev) => ({ ...prev, [key]: { state: "saving" } }));
    try {
      const trimmed = raw.trim();
      if (trimmed === "") {
        await clearTarget.mutateAsync(key);
        setCommitted((prev) => {
          if (!prev) return prev;
          const next = { ...prev };
          delete next[key];
          return next;
        });
      } else {
        const num = Number(trimmed);
        await setTarget.mutateAsync({ key, dailyTarget: num });
        setCommitted((prev) => ({ ...(prev ?? {}), [key]: num }));
      }
      setRowStatus((prev) => ({ ...prev, [key]: { state: "saved" } }));
    } catch (err) {
      setRowStatus((prev) => ({
        ...prev,
        [key]: { state: "error", message: err instanceof Error ? err.message : "Couldn't save — try again" },
      }));
    }
  }

  async function handleSaveAll() {
    if (!draft) return;
    // Validate every dirty field up front and block the whole batch if any
    // fail — a bad request would 400 server-side anyway, so no point
    // firing the valid ones only to leave the form in a half-saved state
    // the user didn't ask for.
    const errors: Partial<Record<NutrientKey, string>> = {};
    for (const key of dirtyKeys) {
      const error = validateField(draft[key]);
      if (error) errors[key] = error;
    }
    if (Object.keys(errors).length > 0) {
      setValidationErrors((prev) => ({ ...prev, ...errors }));
      return;
    }
    setBatchSaving(true);
    if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    await Promise.all(dirtyKeys.map((key) => saveField(key)));
    setBatchSaving(false);
    setSavedBannerVisible(true);
    savedTimerRef.current = setTimeout(() => setSavedBannerVisible(false), 2000);
  }

  const groups = useMemo(
    () => [
      { title: "Calories & macros", keys: PRIMARY_KEYS },
      { title: "Other nutrients", keys: SECONDARY_KEYS },
    ],
    [],
  );

  if (targetsQuery.isPending || !draft) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        <div className="h-16 animate-pulse bg-[var(--color-surface-alt)] rounded-[var(--radius-md)]" />
        <div className="h-52 animate-pulse bg-[var(--color-surface-alt)] rounded-[var(--radius-md)]" />
        <div className="h-80 animate-pulse bg-[var(--color-surface-alt)] rounded-[var(--radius-md)]" />
      </div>
    );
  }

  if (targetsQuery.isError) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6">
        <Card>
          <p role="alert" className="text-[length:var(--text-body-sm)] text-[var(--color-text-muted)]">
            Couldn't load your targets.
          </p>
          <Button variant="secondary" size="sm" className="mt-3" onClick={() => targetsQuery.refetch()}>
            Retry
          </Button>
        </Card>
      </div>
    );
  }

  const saveLabel = hasRowErrors ? "Retry failed" : "Save changes";

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-[length:var(--text-heading-lg)] font-semibold text-[var(--color-text)]">Targets</h1>
        <p className="mt-1 text-[length:var(--text-body-sm)] text-[var(--color-text-muted)]">
          Set a daily target for any nutrient you want to track against. Nutrients without a target still
          show your intake, just without a progress bar.
        </p>
      </div>

      {groups.map((group) => (
        <Card key={group.title}>
          <h2 className="text-[length:var(--text-heading-sm)] font-semibold text-[var(--color-text)] mb-1">
            {group.title}
          </h2>
          <div className="divide-y divide-[var(--color-border)]">
            {group.keys.map((key) => (
              <TargetRow
                key={key}
                nutrientKey={key}
                value={draft[key]}
                validationError={validationErrors[key]}
                status={rowStatus[key]}
                onChange={(v) => updateDraft(key, v)}
                onBlur={() => handleBlur(key)}
                onClear={() => updateDraft(key, "")}
                onRetry={() => saveField(key)}
              />
            ))}
          </div>
        </Card>
      ))}

      <div className="flex items-center gap-3">
        <Button onClick={handleSaveAll} loading={batchSaving} disabled={dirtyKeys.length === 0 && !hasRowErrors}>
          {saveLabel}
        </Button>
        {savedBannerVisible && !hasRowErrors && (
          <span role="status" className="text-[length:var(--text-caption)] text-[var(--color-success)]">
            Saved
          </span>
        )}
      </div>
    </div>
  );
}

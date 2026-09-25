import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ApiError } from "../api/client";
import type { RecipeImportDraft, RecipeImportInput } from "../api/recipeImports";
import { DiscardConfirmBar } from "../components/import/DiscardConfirmBar";
import { ImportErrorPanel } from "../components/import/ImportErrorPanel";
import { ImportSourceForm } from "../components/import/ImportSourceForm";
import { ImportWaitingPanel } from "../components/import/ImportWaitingPanel";
import { IngredientResolutionCard } from "../components/import/IngredientResolutionCard";
import {
  isLineReady,
  makeBlankLine,
  makeLineFromDraft,
  resolvedIngredientId,
  type IngredientLine,
} from "../components/import/lineState";
import { Button, Card, Field, Textarea } from "../components/ui";
import { useCreateRecipe } from "../hooks/useRecipes";
import { useRecipeImport } from "../hooks/useRecipeImport";

// Same cooldown window as CoachRoute's minuteCooldown — both draw from the
// shared llmMinuteLimiter (60s window), so re-enabling partway through
// avoids hammering the limiter right at its own boundary. Not extracted
// into a shared hook since CoachRoute isn't a file this screen owns.
const MINUTE_COOLDOWN_MS = 45_000;

type Step = { kind: "input" } | { kind: "review"; draft: RecipeImportDraft };

export function RecipeImportRoute() {
  const navigate = useNavigate();
  const importMutation = useRecipeImport();
  const createRecipeMutation = useCreateRecipe();

  const [step, setStep] = useState<Step>({ kind: "input" });
  const [sourceMode, setSourceMode] = useState<"url" | "text">("url");
  const [importError, setImportError] = useState<unknown>(null);
  const [minuteCooldown, setMinuteCooldown] = useState(false);
  const [dailyLimitReached, setDailyLimitReached] = useState(false);
  const cooldownTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Review-step form state, seeded from the draft on a successful import.
  const [title, setTitle] = useState("");
  const [servings, setServings] = useState("1");
  const [instructions, setInstructions] = useState("");
  const [lines, setLines] = useState<IngredientLine[]>([]);
  const [hasReviewEdits, setHasReviewEdits] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const nextBlankKey = useRef(0);

  function handleImport(input: RecipeImportInput) {
    setSourceMode(input.source);
    setImportError(null);
    importMutation.mutate(input, {
      onSuccess: (draft) => {
        setStep({ kind: "review", draft });
        setTitle(draft.title ?? "");
        setServings(String(draft.servings ?? 1));
        setInstructions(draft.instructions ?? "");
        setLines(draft.ingredients.map((ing, i) => makeLineFromDraft(ing, `draft-${i}`)));
        setHasReviewEdits(false);
        setSaveError(null);
      },
      onError: (error) => {
        setImportError(error);
        if (error instanceof ApiError && error.status === 429) {
          if (error.message.includes("Too many AI requests this minute")) {
            if (cooldownTimer.current) clearTimeout(cooldownTimer.current);
            setMinuteCooldown(true);
            cooldownTimer.current = setTimeout(() => setMinuteCooldown(false), MINUTE_COOLDOWN_MS);
          } else if (error.message.includes("Daily AI request limit reached")) {
            setDailyLimitReached(true);
          }
        }
      },
    });
  }

  function updateLine(key: string, next: IngredientLine) {
    setHasReviewEdits(true);
    setLines((prev) => prev.map((l) => (l.key === key ? next : l)));
  }

  function addBlankLine() {
    setHasReviewEdits(true);
    const key = `manual-${nextBlankKey.current++}`;
    setLines((prev) => [...prev, makeBlankLine(key)]);
  }

  function removeLine(key: string) {
    setHasReviewEdits(true);
    setLines((prev) => prev.filter((l) => l.key !== key));
  }

  function returnToLibrary() {
    navigate("/library");
  }

  function handleCancel() {
    if (hasReviewEdits) {
      setShowDiscardConfirm(true);
      return;
    }
    returnToLibrary();
  }

  function handleSave() {
    if (step.kind !== "review") return;
    setSaveError(null);

    const ingredients = lines
      .filter((l) => !l.skipped)
      .map((l, i) => ({
        ingredient_id: resolvedIngredientId(l)!,
        quantity_g: Number(l.grams),
        note: l.draft.note ?? undefined,
        sort_order: i,
      }));

    createRecipeMutation.mutate(
      {
        title: title.trim(),
        servings: Number(servings) || 1,
        instructions: instructions.trim() || undefined,
        source_url: step.draft.source_url ?? undefined,
        ingredients,
      },
      {
        // Per architecture doc E, POST /api/recipes echoes the input back,
        // not DB row ids/joined data — navigate and let RecipeDetailRoute
        // fetch fresh rather than trusting this response for detail data.
        onSuccess: (created) => navigate(`/library/recipes/${created.id}`),
        onError: (err) =>
          setSaveError(err instanceof ApiError ? err.message : "Couldn't save the recipe — try again"),
      },
    );
  }

  const ctaDisabled = importMutation.isPending || minuteCooldown || dailyLimitReached;
  const canSave = title.trim() !== "" && lines.every(isLineReady) && !createRecipeMutation.isPending;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-[length:var(--text-display-sm)] font-semibold text-[var(--color-text)]">
          {step.kind === "review" ? "Review import" : "Import a recipe"}
        </h1>
        {step.kind === "input" && (
          <Button type="button" variant="ghost" size="sm" onClick={returnToLibrary}>
            Cancel
          </Button>
        )}
      </div>

      {step.kind === "input" && (
        <Card padding="lg" className="mt-6">
          <ImportSourceForm onSubmit={handleImport} submitDisabled={ctaDisabled} loading={importMutation.isPending} />

          <div className="mt-4">
            {importMutation.isPending && <ImportWaitingPanel />}
            {!importMutation.isPending && importError !== null && (
              <ImportErrorPanel error={importError} sourceMode={sourceMode} />
            )}
          </div>
        </Card>
      )}

      {step.kind === "review" && (
        <div className="mt-6 space-y-4">
          <Card padding="lg" className="space-y-4">
            <Field
              label="Title"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setHasReviewEdits(true);
              }}
              required
            />
            <Field
              label="Servings"
              type="number"
              min={0.25}
              step={0.25}
              value={servings}
              onChange={(e) => {
                setServings(e.target.value);
                setHasReviewEdits(true);
              }}
              className="max-w-32"
            />
            <Textarea
              label="Instructions"
              rows={6}
              value={instructions}
              onChange={(e) => {
                setInstructions(e.target.value);
                setHasReviewEdits(true);
              }}
            />
            {step.draft.source_url && (
              <p className="text-[length:var(--text-caption)] text-[var(--color-text-subtle)]">
                Source:{" "}
                <a
                  href={step.draft.source_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[var(--color-primary)] hover:underline"
                >
                  {step.draft.source_url}
                </a>
              </p>
            )}
          </Card>

          <div className="space-y-3">
            <h2 className="text-[length:var(--text-heading-sm)] font-semibold text-[var(--color-text)]">
              Ingredients
            </h2>
            {lines.length === 0 && (
              <p className="text-[length:var(--text-body-sm)] text-[var(--color-text-muted)]">
                No ingredients were detected — add them manually below.
              </p>
            )}
            {lines.map((line) => (
              <IngredientResolutionCard
                key={line.key}
                line={line}
                onChange={(next) => updateLine(line.key, next)}
                onRemove={line.manuallyAdded ? () => removeLine(line.key) : undefined}
              />
            ))}
            <Button type="button" variant="secondary" size="sm" onClick={addBlankLine}>
              + Add ingredient line
            </Button>
          </div>

          {saveError && (
            <p role="alert" className="text-[length:var(--text-body-sm)] text-[var(--color-error)]">
              {saveError}
            </p>
          )}

          {showDiscardConfirm ? (
            <DiscardConfirmBar onDiscard={returnToLibrary} onKeepEditing={() => setShowDiscardConfirm(false)} />
          ) : (
            <div className="flex justify-end gap-2 pt-4 border-t border-[var(--color-border)]">
              <Button type="button" variant="ghost" onClick={handleCancel}>
                Cancel
              </Button>
              <Button type="button" loading={createRecipeMutation.isPending} disabled={!canSave} onClick={handleSave}>
                Save recipe
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

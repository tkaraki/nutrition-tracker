import { useState, type FormEvent } from "react";
import { Button, Field } from "../ui";
import { useCreateIngredient } from "../../hooks/useIngredients";
import type { Ingredient } from "../../api/types";

/**
 * Minimal, utilitarian ingredient-creation form — not a design focal point.
 * Only `name` is required server-side (every nutrient field defaults to 0),
 * so only calories/protein/carbs/fat are shown prominently; everything else
 * lives behind a collapsed "more nutrients" section.
 */
interface QuickAddIngredientProps {
  onCreated: (ingredient: Ingredient) => void;
  onCancel: () => void;
}

const initialForm = {
  name: "",
  calories_kcal: "",
  protein_g: "",
  carbs_g: "",
  fat_g: "",
  fiber_g: "",
  sodium_mg: "",
  potassium_mg: "",
  calcium_mg: "",
  iron_mg: "",
  vitamin_c_mg: "",
  vitamin_d_mcg: "",
  serving_size_g: "",
};

type FormState = typeof initialForm;

export function QuickAddIngredient({ onCreated, onCancel }: QuickAddIngredientProps) {
  const [form, setForm] = useState<FormState>(initialForm);
  const [showMore, setShowMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const createIngredient = useCreateIngredient();

  function update(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const name = form.name.trim();
    if (!name) return;
    setError(null);

    const toNum = (v: string) => (v.trim() === "" ? 0 : Number(v));

    createIngredient.mutate(
      {
        name,
        calories_kcal: toNum(form.calories_kcal),
        protein_g: toNum(form.protein_g),
        carbs_g: toNum(form.carbs_g),
        fat_g: toNum(form.fat_g),
        fiber_g: toNum(form.fiber_g),
        sodium_mg: toNum(form.sodium_mg),
        potassium_mg: toNum(form.potassium_mg),
        calcium_mg: toNum(form.calcium_mg),
        iron_mg: toNum(form.iron_mg),
        vitamin_c_mg: toNum(form.vitamin_c_mg),
        vitamin_d_mcg: toNum(form.vitamin_d_mcg),
        ...(form.serving_size_g.trim() !== "" ? { serving_size_g: toNum(form.serving_size_g) } : {}),
      },
      {
        onSuccess: (ingredient) => onCreated(ingredient),
        onError: (err) => setError(err instanceof Error ? err.message : "Couldn't create ingredient"),
      },
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface-alt)] p-3"
    >
      <Field
        label="Name"
        value={form.name}
        onChange={(e) => update("name", e.target.value)}
        required
        autoFocus
      />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Field
          label="Calories (kcal)"
          type="number"
          min={0}
          value={form.calories_kcal}
          onChange={(e) => update("calories_kcal", e.target.value)}
        />
        <Field
          label="Protein (g)"
          type="number"
          min={0}
          value={form.protein_g}
          onChange={(e) => update("protein_g", e.target.value)}
        />
        <Field
          label="Carbs (g)"
          type="number"
          min={0}
          value={form.carbs_g}
          onChange={(e) => update("carbs_g", e.target.value)}
        />
        <Field
          label="Fat (g)"
          type="number"
          min={0}
          value={form.fat_g}
          onChange={(e) => update("fat_g", e.target.value)}
        />
      </div>

      <button
        type="button"
        onClick={() => setShowMore((s) => !s)}
        className="text-[length:var(--text-caption)] font-medium text-[var(--color-text-muted)] underline"
      >
        {showMore ? "Hide extra nutrients" : "More nutrients (optional)"}
      </button>

      {showMore && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Field
            label="Fiber (g)"
            type="number"
            min={0}
            value={form.fiber_g}
            onChange={(e) => update("fiber_g", e.target.value)}
          />
          <Field
            label="Sodium (mg)"
            type="number"
            min={0}
            value={form.sodium_mg}
            onChange={(e) => update("sodium_mg", e.target.value)}
          />
          <Field
            label="Potassium (mg)"
            type="number"
            min={0}
            value={form.potassium_mg}
            onChange={(e) => update("potassium_mg", e.target.value)}
          />
          <Field
            label="Calcium (mg)"
            type="number"
            min={0}
            value={form.calcium_mg}
            onChange={(e) => update("calcium_mg", e.target.value)}
          />
          <Field
            label="Iron (mg)"
            type="number"
            min={0}
            value={form.iron_mg}
            onChange={(e) => update("iron_mg", e.target.value)}
          />
          <Field
            label="Vitamin C (mg)"
            type="number"
            min={0}
            value={form.vitamin_c_mg}
            onChange={(e) => update("vitamin_c_mg", e.target.value)}
          />
          <Field
            label="Vitamin D (mcg)"
            type="number"
            min={0}
            value={form.vitamin_d_mcg}
            onChange={(e) => update("vitamin_d_mcg", e.target.value)}
          />
          <Field
            label="Serving size (g)"
            type="number"
            min={0}
            value={form.serving_size_g}
            onChange={(e) => update("serving_size_g", e.target.value)}
          />
        </div>
      )}

      {error && (
        <p role="alert" className="text-[length:var(--text-caption)] text-[var(--color-error)]">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <Button type="submit" size="sm" loading={createIngredient.isPending} disabled={!form.name.trim()}>
          Add ingredient
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

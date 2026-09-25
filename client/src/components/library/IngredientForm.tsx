import { useState, type FormEvent } from "react";
import { Button, Field } from "../ui";
import { useCreateIngredient, useUpdateIngredient } from "../../hooks/useIngredients";
import type { Ingredient } from "../../api/types";

/**
 * Library's create/edit ingredient form — same field set as the Planner's
 * `QuickAddIngredient` (name, primary-4 prominent, "more nutrients"
 * collapsed), plus edit-mode prefill/PATCH. Kept as its own component
 * rather than refactoring `QuickAddIngredient` into a shared one, since
 * that file belongs to the Planner screen's implementer.
 */
interface IngredientFormProps {
  mode: "create" | "edit";
  initial?: Ingredient;
  onSaved: (ingredient: Ingredient) => void;
  onCancel: () => void;
}

const emptyForm = {
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

type FormState = typeof emptyForm;

function formFromIngredient(ingredient: Ingredient): FormState {
  return {
    name: ingredient.name,
    calories_kcal: String(ingredient.calories_kcal),
    protein_g: String(ingredient.protein_g),
    carbs_g: String(ingredient.carbs_g),
    fat_g: String(ingredient.fat_g),
    fiber_g: String(ingredient.fiber_g),
    sodium_mg: String(ingredient.sodium_mg),
    potassium_mg: String(ingredient.potassium_mg),
    calcium_mg: String(ingredient.calcium_mg),
    iron_mg: String(ingredient.iron_mg),
    vitamin_c_mg: String(ingredient.vitamin_c_mg),
    vitamin_d_mcg: String(ingredient.vitamin_d_mcg),
    serving_size_g: ingredient.serving_size_g === null ? "" : String(ingredient.serving_size_g),
  };
}

export function IngredientForm({ mode, initial, onSaved, onCancel }: IngredientFormProps) {
  const [form, setForm] = useState<FormState>(initial ? formFromIngredient(initial) : emptyForm);
  const [showMore, setShowMore] = useState(mode === "edit");
  const [error, setError] = useState<string | null>(null);
  const createIngredient = useCreateIngredient();
  const updateIngredient = useUpdateIngredient();
  const isPending = createIngredient.isPending || updateIngredient.isPending;

  function update(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const name = form.name.trim();
    if (!name) return;
    setError(null);

    const toNum = (v: string) => (v.trim() === "" ? 0 : Number(v));
    const input = {
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
    };

    if (mode === "create") {
      createIngredient.mutate(input, {
        onSuccess: (ingredient) => onSaved(ingredient),
        onError: (err) => setError(err instanceof Error ? err.message : "Couldn't create ingredient"),
      });
    } else if (initial) {
      updateIngredient.mutate(
        { id: initial.id, updates: input },
        {
          onSuccess: (ingredient) => onSaved(ingredient),
          onError: (err) => setError(err instanceof Error ? err.message : "Couldn't save ingredient"),
        },
      );
    }
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
      <p className="text-[length:var(--text-caption)] font-medium text-[var(--color-text-muted)]">
        Nutrients per 100g
      </p>
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
        aria-expanded={showMore}
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
        <Button type="submit" size="sm" loading={isPending} disabled={!form.name.trim()}>
          {mode === "create" ? "Add ingredient" : "Save changes"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

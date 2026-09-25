import { useState, type FormEvent } from "react";
import { Button, Field } from "../ui";
import { useCreateSupplement, useUpdateSupplement } from "../../hooks/useSupplements";
import type { Supplement } from "../../api/supplements";

/**
 * Create/edit form for a supplement product — same layout convention as
 * `QuickAddIngredient.tsx` (primary-4 prominent grid, collapsed "more
 * nutrients" section for the rest), applied to supplements. Values are
 * "per dose" (per `serving_unit`), not per-100g, so the nutrient section is
 * labeled "Nutrients per dose" to disambiguate from Library's ingredients.
 */
interface SupplementFormProps {
  /** Present for edit mode; omitted for create. */
  supplement?: Supplement;
  onSaved: (supplement: Supplement) => void;
  onCancel: () => void;
}

function initialFormFor(supplement?: Supplement) {
  return {
    name: supplement?.name ?? "",
    brand: supplement?.brand ?? "",
    serving_unit: supplement?.serving_unit ?? "dose",
    calories_kcal: supplement ? String(supplement.calories_kcal) : "",
    protein_g: supplement ? String(supplement.protein_g) : "",
    carbs_g: supplement ? String(supplement.carbs_g) : "",
    fat_g: supplement ? String(supplement.fat_g) : "",
    fiber_g: supplement ? String(supplement.fiber_g) : "",
    sodium_mg: supplement ? String(supplement.sodium_mg) : "",
    potassium_mg: supplement ? String(supplement.potassium_mg) : "",
    calcium_mg: supplement ? String(supplement.calcium_mg) : "",
    iron_mg: supplement ? String(supplement.iron_mg) : "",
    vitamin_c_mg: supplement ? String(supplement.vitamin_c_mg) : "",
    vitamin_d_mcg: supplement ? String(supplement.vitamin_d_mcg) : "",
  };
}

type FormState = ReturnType<typeof initialFormFor>;

export function SupplementForm({ supplement, onSaved, onCancel }: SupplementFormProps) {
  const [form, setForm] = useState<FormState>(() => initialFormFor(supplement));
  const [showMore, setShowMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const createSupplement = useCreateSupplement();
  const updateSupplement = useUpdateSupplement();
  const saving = createSupplement.isPending || updateSupplement.isPending;

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
      brand: form.brand.trim() || undefined,
      serving_unit: form.serving_unit.trim() || "dose",
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
    };

    const onError = (err: unknown) =>
      setError(err instanceof Error ? err.message : "Couldn't save — try again");

    if (supplement) {
      updateSupplement.mutate(
        { id: supplement.id, updates: input },
        { onSuccess: onSaved, onError },
      );
    } else {
      createSupplement.mutate(input, { onSuccess: onSaved, onError });
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface-alt)] p-3"
    >
      <Field label="Name" value={form.name} onChange={(e) => update("name", e.target.value)} required autoFocus />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Brand" value={form.brand} onChange={(e) => update("brand", e.target.value)} />
        <Field
          label="Serving unit"
          value={form.serving_unit}
          onChange={(e) => update("serving_unit", e.target.value)}
          hint="e.g. dose, capsule, 2000 IU"
        />
      </div>

      <p className="text-[length:var(--text-body-sm)] font-medium text-[var(--color-text)]">Nutrients per dose</p>
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
        </div>
      )}

      {error && (
        <p role="alert" className="text-[length:var(--text-caption)] text-[var(--color-error)]">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <Button type="submit" size="sm" loading={saving} disabled={!form.name.trim()}>
          {supplement ? "Save changes" : "Add supplement"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

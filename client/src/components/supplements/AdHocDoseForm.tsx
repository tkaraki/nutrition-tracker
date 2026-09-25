import { useState, type FormEvent } from "react";
import { Button, Combobox, Field } from "../ui";
import { useCreateSupplementLog, useSupplements } from "../../hooks/useSupplements";
import { SupplementForm } from "./SupplementForm";
import type { Supplement } from "../../api/supplements";

interface AdHocDoseFormProps {
  /** The date currently being viewed (drives which "Also logged today" list
   * the new row appears in — the Today tab supports date navigation, so
   * this is the viewed date, not necessarily the browser's real "today"). */
  date: string;
  onDone: () => void;
}

/** "+ Log an ad-hoc dose" inline-expand form (mirrors QuickAddRecipe's
 * wrapper shape). Supplement search is client-side (GET /api/supplements
 * has no search query param), filtering the already-fetched full list. */
export function AdHocDoseForm({ date, onDone }: AdHocDoseFormProps) {
  const { data: supplements } = useSupplements();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Supplement | null>(null);
  const [doses, setDoses] = useState("1");
  const [showCreate, setShowCreate] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const createLog = useCreateSupplementLog(date);

  const filtered = (supplements ?? []).filter((s) => s.name.toLowerCase().includes(query.trim().toLowerCase()));

  function selectSupplement(s: Supplement) {
    setSelected(s);
    setQuery(s.name);
  }

  function handleCreated(s: Supplement) {
    setShowCreate(false);
    selectSupplement(s);
  }

  const dosesNum = Number(doses);
  const canSubmit = selected !== null && doses.trim() !== "" && dosesNum > 0 && !createLog.isPending;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit || !selected) return;
    setError(null);
    createLog.mutate(
      { supplement_id: selected.id, doses: dosesNum, log_date: date },
      {
        onSuccess: onDone,
        onError: (err) => setError(err instanceof Error ? err.message : "Couldn't log dose"),
      },
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface-alt)] p-3"
    >
      <Combobox
        label="Supplement"
        value={query}
        onSearch={setQuery}
        onSelect={selectSupplement}
        onClear={() => setSelected(null)}
        items={filtered}
        getKey={(s) => s.id}
        getLabel={(s) => s.name}
        isSelected={selected !== null}
        onCreateNew={() => setShowCreate(true)}
        createNewLabel={(q) => `+ Create "${q || "new supplement"}"`}
        required
      />

      {showCreate && (
        <SupplementForm onSaved={handleCreated} onCancel={() => setShowCreate(false)} />
      )}

      <Field
        label="Doses"
        type="number"
        min={0}
        step="any"
        value={doses}
        onChange={(e) => setDoses(e.target.value)}
        className="w-28"
      />

      {error && (
        <p role="alert" className="text-[length:var(--text-caption)] text-[var(--color-error)]">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <Button type="submit" size="sm" loading={createLog.isPending} disabled={!canSubmit}>
          Log dose
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

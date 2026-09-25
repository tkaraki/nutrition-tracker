import { useState, type FormEvent } from "react";
import { Button, Combobox, Field, WeekdayToggle } from "../ui";
import { ApiError } from "../../api/client";
import { useCreateRoutineItem, useSupplements, useUpdateRoutineItem } from "../../hooks/useSupplements";
import { SLOT_LABELS, SUPPLEMENT_SLOTS } from "../../api/supplements";
import type { RoutineItem, Supplement, SupplementSlot } from "../../api/supplements";
import { SupplementForm } from "./SupplementForm";

interface RoutineItemFormProps {
  /** Present for edit mode; omitted for create ("Add to routine"). */
  item?: RoutineItem;
  onSaved: () => void;
  onCancel: () => void;
}

type SlotChoice = SupplementSlot | "anytime";

const SLOT_CHOICES: SlotChoice[] = [...SUPPLEMENT_SLOTS, "anytime"];

/** Add/edit form for one weekly routine item. Editing does NOT allow
 * changing the supplement itself (PATCH's field set doesn't include
 * supplement_id) — the combobox only appears in add mode. */
export function RoutineItemForm({ item, onSaved, onCancel }: RoutineItemFormProps) {
  const { data: supplements } = useSupplements();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Supplement | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [days, setDays] = useState<number[]>(item?.days_of_week ?? []);
  const [doses, setDoses] = useState(item ? String(item.doses) : "1");
  const [slotChoice, setSlotChoice] = useState<SlotChoice>(item?.slot ?? "anytime");
  const [error, setError] = useState<string | null>(null);
  const [slotError, setSlotError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const createRoutineItem = useCreateRoutineItem();
  const updateRoutineItem = useUpdateRoutineItem();
  const saving = createRoutineItem.isPending || updateRoutineItem.isPending;

  const filtered = (supplements ?? []).filter((s) => s.name.toLowerCase().includes(query.trim().toLowerCase()));
  const servingUnit = item?.serving_unit ?? selected?.serving_unit ?? "dose";

  function selectSupplement(s: Supplement) {
    setSelected(s);
    setQuery(s.name);
  }

  function handleCreated(s: Supplement) {
    setShowCreate(false);
    selectSupplement(s);
  }

  const dosesNum = Number(doses);
  const canSubmit =
    days.length > 0 && doses.trim() !== "" && dosesNum > 0 && (item !== undefined || selected !== null) && !saving;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    setSlotError(null);
    setNotFound(false);

    const slot = slotChoice === "anytime" ? null : slotChoice;
    const onError = (err: unknown) => {
      if (err instanceof ApiError) {
        if (err.status === 409) {
          const name = item?.supplement_name ?? selected?.name ?? "this supplement";
          const slotLabel = slot === null ? "Anytime" : SLOT_LABELS[slot];
          setSlotError(
            `You already have a routine item for ${name} at ${slotLabel}. Edit that one instead, or pick a different slot.`,
          );
          return;
        }
        if (err.status === 404) {
          setNotFound(true);
          return;
        }
      }
      setError("Couldn't save — try again");
    };

    if (item) {
      updateRoutineItem.mutate(
        { id: item.id, updates: { days_of_week: days, doses: dosesNum, slot } },
        { onSuccess: onSaved, onError },
      );
    } else if (selected) {
      createRoutineItem.mutate(
        { supplement_id: selected.id, days_of_week: days, doses: dosesNum, slot },
        { onSuccess: onSaved, onError },
      );
    }
  }

  if (notFound) {
    return (
      <div className="space-y-3 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface-alt)] p-3">
        <p role="alert" className="text-[length:var(--text-body-sm)] text-[var(--color-error)]">
          This routine item no longer exists.
        </p>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
          Close
        </Button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface-alt)] p-3"
    >
      {item ? (
        <div>
          <span className="block text-[length:var(--text-body-sm)] font-medium text-[var(--color-text)] mb-1">
            Supplement
          </span>
          <p className="text-[length:var(--text-body-sm)] text-[var(--color-text)]">{item.supplement_name}</p>
        </div>
      ) : (
        <>
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
          {showCreate && <SupplementForm onSaved={handleCreated} onCancel={() => setShowCreate(false)} />}
        </>
      )}

      <WeekdayToggle value={days} onChange={setDays} />

      <Field
        label={`Dose (${servingUnit})`}
        type="number"
        min={0}
        step="any"
        value={doses}
        onChange={(e) => setDoses(e.target.value)}
        className="w-32"
      />

      <fieldset>
        <legend className="block text-[length:var(--text-body-sm)] font-medium text-[var(--color-text)] mb-1">
          Slot
        </legend>
        <div className="flex flex-wrap gap-3">
          {SLOT_CHOICES.map((choice) => (
            <label key={choice} className="flex min-h-11 items-center gap-1.5 text-[length:var(--text-body-sm)] text-[var(--color-text)]">
              <input
                type="radio"
                name="slot"
                checked={slotChoice === choice}
                onChange={() => setSlotChoice(choice)}
                className="h-4 w-4 accent-[var(--color-primary)]"
              />
              {choice === "anytime" ? "Anytime" : SLOT_LABELS[choice]}
            </label>
          ))}
        </div>
        {slotError && (
          <p role="alert" className="mt-1 text-[length:var(--text-caption)] text-[var(--color-error)]">
            {slotError}
          </p>
        )}
      </fieldset>

      {error && (
        <p role="alert" className="text-[length:var(--text-caption)] text-[var(--color-error)]">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <Button type="submit" size="sm" loading={saving} disabled={!canSubmit}>
          Save
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

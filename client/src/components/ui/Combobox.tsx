import { CircleAlert, Loader2, Plus, Search } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";

export interface ComboboxProps<T> {
  id?: string;
  label: string;
  placeholder?: string;
  /** Current display text (the selected item's label, or the user's in-progress query). */
  value: string;
  /** Called (debounced) as the user types. Fire your search query from here. */
  onSearch: (query: string) => void;
  /** Called when the user picks an item from the list. */
  onSelect: (item: T) => void;
  /** Called when the user edits the text away from a previously selected item. */
  onClear?: () => void;
  items: T[];
  isLoading?: boolean;
  isError?: boolean;
  getKey: (item: T) => string | number;
  getLabel: (item: T) => string;
  renderItem?: (item: T, active: boolean) => ReactNode;
  /** Whether `value` currently refers to a bound item (shows a "Selected" affordance). */
  isSelected?: boolean;
  onCreateNew?: (query: string) => void;
  createNewLabel?: (query: string) => string;
  noResultsLabel?: (query: string) => string;
  errorLabel?: string;
  disabled?: boolean;
  error?: string;
  hint?: string;
  required?: boolean;
  debounceMs?: number;
}

type Row<T> =
  | { kind: "item"; item: T }
  | { kind: "create" }
  | { kind: "loading" }
  | { kind: "error" }
  | { kind: "empty" };

export function Combobox<T>({
  id,
  label,
  placeholder,
  value,
  onSearch,
  onSelect,
  onClear,
  items,
  isLoading = false,
  isError = false,
  getKey,
  getLabel,
  renderItem,
  isSelected = false,
  onCreateNew,
  createNewLabel = (q) => `+ Create "${q}"`,
  noResultsLabel = (q) => `No matches for "${q}".`,
  errorLabel = "Couldn't search — try again",
  disabled = false,
  error,
  hint,
  required,
  debounceMs = 200,
}: ComboboxProps<T>) {
  const generatedId = useId();
  const comboId = id ?? generatedId;
  const listboxId = `${comboId}-listbox`;
  const errorId = `${comboId}-error`;
  const hintId = `${comboId}-hint`;

  const [text, setText] = useState(value);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Keep the displayed text in sync when the bound value changes from outside
  // (e.g. after a selection commits, or the form resets).
  useEffect(() => {
    setText(value);
  }, [value]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
        setActiveIndex(-1);
      }
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  const rows: Row<T>[] = isLoading
    ? [{ kind: "loading" }]
    : isError
      ? [{ kind: "error" }]
      : items.length === 0
        ? [{ kind: "empty" }, ...(onCreateNew ? [{ kind: "create" as const }] : [])]
        : [...items.map((item) => ({ kind: "item" as const, item })), ...(onCreateNew ? [{ kind: "create" as const }] : [])];

  const selectableIndexes = rows
    .map((row, i) => (row.kind === "item" || row.kind === "create" ? i : -1))
    .filter((i) => i !== -1);

  function commit(row: Row<T>) {
    if (row.kind === "item") {
      onSelect(row.item);
      setText(getLabel(row.item));
    } else if (row.kind === "create") {
      onCreateNew?.(text.trim());
    }
    setOpen(false);
    setActiveIndex(-1);
  }

  function handleChange(next: string) {
    setText(next);
    setOpen(true);
    setActiveIndex(-1);
    if (isSelected) onClear?.();
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => onSearch(next.trim()), debounceMs);
  }

  function moveActive(delta: 1 | -1) {
    if (selectableIndexes.length === 0) return;
    const pos = selectableIndexes.indexOf(activeIndex);
    let nextPos = pos + delta;
    if (nextPos < 0) nextPos = selectableIndexes.length - 1;
    if (nextPos >= selectableIndexes.length) nextPos = 0;
    const nextIndex = selectableIndexes[nextPos];
    if (nextIndex === undefined) return;
    setActiveIndex(nextIndex);
    const el = listRef.current?.querySelector<HTMLElement>(`[data-index="${nextIndex}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      moveActive(1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      moveActive(-1);
    } else if (e.key === "Enter") {
      const activeRow = activeIndex >= 0 ? rows[activeIndex] : undefined;
      if (open && activeRow) {
        e.preventDefault();
        commit(activeRow);
      }
    } else if (e.key === "Escape") {
      if (open) {
        e.preventDefault();
        setText(value);
        setOpen(false);
        setActiveIndex(-1);
      }
    } else if (e.key === "Tab") {
      const activeRow = activeIndex >= 0 ? rows[activeIndex] : undefined;
      if (open && activeRow) {
        commit(activeRow);
      }
    }
  }

  const activeRowForId = activeIndex >= 0 ? rows[activeIndex] : undefined;
  const activeOptionId = activeRowForId
    ? activeRowForId.kind === "create"
      ? `${comboId}-option-create`
      : `${comboId}-option-${activeIndex}`
    : undefined;

  return (
    <div ref={rootRef} className={`relative ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}>
      <label
        htmlFor={`${comboId}-input`}
        className="block text-[length:var(--text-body-sm)] font-medium text-[var(--color-text)] mb-1"
      >
        {label}
        {required && <span aria-hidden="true"> *</span>}
      </label>
      <div className="relative">
        <input
          id={`${comboId}-input`}
          role="combobox"
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={activeOptionId}
          aria-describedby={error ? errorId : hint ? hintId : undefined}
          aria-invalid={error ? true : undefined}
          autoComplete="off"
          placeholder={placeholder}
          disabled={disabled}
          value={text}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          className={`min-h-11 w-full bg-[var(--color-surface-alt)] border rounded-[var(--radius-sm)] pl-9 pr-3 py-2 text-[length:var(--text-body-sm)] transition-[border-color,box-shadow] duration-150 focus:outline-none disabled:cursor-not-allowed ${
            error
              ? "border-[var(--color-error)]"
              : "border-[var(--color-border-strong)] focus:border-[var(--color-primary)] focus:shadow-[0_0_0_3px_var(--color-primary-wash)]"
          }`}
        />
        <Search
          size={16}
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-subtle)]"
        />
      </div>

      {isSelected && !error && (
        <p className="mt-1 text-[length:var(--text-caption)] text-[var(--color-success)]">Selected: {value}</p>
      )}
      {error && (
        <p id={errorId} role="alert" className="mt-1 flex items-center gap-1 text-[length:var(--text-caption)] text-[var(--color-error)]">
          <CircleAlert size={14} aria-hidden="true" />
          {error}
        </p>
      )}
      {!error && hint && (
        <p id={hintId} className="mt-1 text-[length:var(--text-caption)] text-[var(--color-text-subtle)]">
          {hint}
        </p>
      )}

      {open && !disabled && (
        <ul
          ref={listRef}
          id={listboxId}
          role="listbox"
          aria-label={label}
          className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-[var(--radius-sm)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] shadow-[var(--shadow-md)]"
        >
          {rows.map((row, i) => {
            if (row.kind === "loading") {
              return (
                <li key="loading" className="flex items-center gap-2 px-3 py-2 text-[length:var(--text-caption)] text-[var(--color-text-subtle)]">
                  <Loader2 size={14} className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
                  Searching…
                </li>
              );
            }
            if (row.kind === "error") {
              return (
                <li key="error" role="alert" className="flex items-center gap-2 px-3 py-2 text-[length:var(--text-caption)] text-[var(--color-error)]">
                  <CircleAlert size={14} aria-hidden="true" />
                  {errorLabel}
                </li>
              );
            }
            if (row.kind === "empty") {
              return (
                <li key="empty" className="px-3 py-2 text-[length:var(--text-caption)] text-[var(--color-text-subtle)]">
                  {noResultsLabel(text.trim())}
                </li>
              );
            }
            if (row.kind === "create") {
              const active = i === activeIndex;
              return (
                <li
                  key="create"
                  id={`${comboId}-option-create`}
                  data-index={i}
                  role="option"
                  aria-selected={active}
                  onPointerDown={(e) => e.preventDefault()}
                  onClick={() => commit(row)}
                  onMouseEnter={() => setActiveIndex(i)}
                  className={`flex items-center gap-1.5 border-t border-[var(--color-border)] px-3 py-2 text-left text-[length:var(--text-caption)] font-medium text-[var(--color-primary)] cursor-pointer ${
                    active ? "bg-[var(--color-primary-wash)]" : ""
                  }`}
                >
                  <Plus size={13} aria-hidden="true" />
                  {createNewLabel(text.trim())}
                </li>
              );
            }
            const active = i === activeIndex;
            return (
              <li
                key={getKey(row.item)}
                id={`${comboId}-option-${i}`}
                data-index={i}
                role="option"
                aria-selected={active}
                onPointerDown={(e) => e.preventDefault()}
                onClick={() => commit(row)}
                onMouseEnter={() => setActiveIndex(i)}
                className={`px-3 py-2 text-left text-[length:var(--text-body-sm)] text-[var(--color-text)] cursor-pointer ${
                  active ? "bg-[var(--color-surface-alt)]" : ""
                }`}
              >
                {renderItem ? renderItem(row.item, active) : getLabel(row.item)}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

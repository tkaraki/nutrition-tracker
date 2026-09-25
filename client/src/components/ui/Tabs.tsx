import { useRef } from "react";
import type { KeyboardEvent, ReactNode } from "react";

export interface TabItem {
  id: string;
  label: string;
}

interface TabsProps {
  items: TabItem[];
  value: string;
  onChange: (id: string) => void;
  label: string;
  className?: string;
}

/** Underline-style tablist (matches the Login/Register toggle's look), fully
 * ARIA-conformant: role="tablist"/"tab", aria-selected, arrow-key navigation. */
export function Tabs({ items, value, onChange, label, className = "" }: TabsProps) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});

  function focusAndSelect(id: string) {
    onChange(id);
    refs.current[id]?.focus();
  }

  function handleKeyDown(e: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
      e.preventDefault();
      const delta = e.key === "ArrowRight" ? 1 : -1;
      const next = (index + delta + items.length) % items.length;
      focusAndSelect(items[next]!.id);
    } else if (e.key === "Home") {
      e.preventDefault();
      focusAndSelect(items[0]!.id);
    } else if (e.key === "End") {
      e.preventDefault();
      focusAndSelect(items[items.length - 1]!.id);
    }
  }

  return (
    <div
      role="tablist"
      aria-label={label}
      className={`flex gap-4 border-b border-[var(--color-border)] ${className}`}
    >
      {items.map((item, i) => {
        const active = item.id === value;
        return (
          <button
            key={item.id}
            ref={(el) => {
              refs.current[item.id] = el;
            }}
            type="button"
            role="tab"
            id={`tab-${item.id}`}
            aria-selected={active}
            aria-controls={`tabpanel-${item.id}`}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(item.id)}
            onKeyDown={(e) => handleKeyDown(e, i)}
            className={`min-h-11 -mb-px border-b-2 px-1 text-[length:var(--text-body-sm)] font-semibold transition-colors duration-150 ${
              active
                ? "border-[var(--color-primary)] text-[var(--color-primary)]"
                : "border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
            }`}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

interface TabPanelProps {
  groupLabel?: string;
  id: string;
  active: boolean;
  children: ReactNode;
}

/** Pair with `Tabs` using the same `id`s. Renders nothing when inactive. */
export function TabPanel({ id, active, children }: TabPanelProps) {
  if (!active) return null;
  return (
    <div role="tabpanel" id={`tabpanel-${id}`} aria-labelledby={`tab-${id}`} tabIndex={0}>
      {children}
    </div>
  );
}

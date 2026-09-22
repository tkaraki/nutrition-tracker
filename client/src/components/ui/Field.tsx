import { CircleAlert } from "lucide-react";
import { useId } from "react";
import type { InputHTMLAttributes } from "react";

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
}

export function Field({
  label,
  error,
  hint,
  id,
  className = "",
  disabled,
  ...props
}: FieldProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  return (
    <div className={disabled ? "opacity-60 cursor-not-allowed" : ""}>
      <label
        htmlFor={inputId}
        className="block text-[length:var(--text-body-sm)] font-medium text-[var(--color-text)] mb-1"
      >
        {label}
      </label>
      <input
        id={inputId}
        disabled={disabled}
        className={`min-h-11 w-full bg-[var(--color-surface-alt)] border rounded-[var(--radius-sm)] px-3 py-2 text-[length:var(--text-body-sm)] transition-[border-color,box-shadow] duration-150 focus:outline-none disabled:cursor-not-allowed ${
          error
            ? "border-[var(--color-error)]"
            : "border-[var(--color-border-strong)] focus:border-[var(--color-primary)] focus:shadow-[0_0_0_3px_var(--color-primary-wash)]"
        } ${className}`}
        aria-invalid={error ? true : undefined}
        aria-describedby={
          error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined
        }
        {...props}
      />
      {error && (
        <p
          id={`${inputId}-error`}
          role="alert"
          className="mt-1 flex items-center gap-1 text-[length:var(--text-caption)] text-[var(--color-error)]"
        >
          <CircleAlert size={14} aria-hidden="true" />
          {error}
        </p>
      )}
      {!error && hint && (
        <p
          id={`${inputId}-hint`}
          className="mt-1 text-[length:var(--text-caption)] text-[var(--color-text-subtle)]"
        >
          {hint}
        </p>
      )}
    </div>
  );
}

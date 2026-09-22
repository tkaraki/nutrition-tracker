import type { HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
  padding?: "sm" | "md" | "lg";
}

const paddingClasses: Record<NonNullable<CardProps["padding"]>, string> = {
  sm: "p-4",
  md: "p-5",
  lg: "p-6",
};

export function Card({
  interactive = false,
  padding = "md",
  className = "",
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={`bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-md)] shadow-[var(--shadow-xs)] ${paddingClasses[padding]} ${
        interactive
          ? "transition-[box-shadow,border-color] duration-150 hover:shadow-[var(--shadow-sm)] hover:border-[var(--color-border-strong)]"
          : ""
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

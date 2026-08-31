"use client";

import { useId } from "react";
import type { ChangeEventHandler } from "react";

export type FormFieldOption = {
  value: string;
  label: string;
};

type FormFieldProps = {
  label: string;
  error?: string;
  hint?: string;
  as?: "input" | "select";
  options?: readonly FormFieldOption[];
  name?: string;
  value?: string;
  onChange?: ChangeEventHandler<HTMLInputElement | HTMLSelectElement>;
  placeholder?: string;
  type?: string;
  autoComplete?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
};

export function FormField({
  label,
  error,
  hint,
  as = "input",
  options = [],
  className = "",
  required = false,
  ...controlProps
}: FormFieldProps) {
  const generatedId = useId();

  const describedBy =
    [hint ? `${generatedId}-hint` : null, error ? `${generatedId}-error` : null]
      .filter(Boolean)
      .join(" ") || undefined;

  const controlClasses = [
    "w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-sm transition-colors",
    "placeholder:text-slate-400",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-1",
    error
      ? "border-accent-500 focus-visible:ring-accent-600"
      : "border-slate-300 hover:border-slate-400 focus-visible:border-brand-600",
  ].join(" ");

  return (
    <div className={className}>
      <label
        htmlFor={generatedId}
        className="mb-1.5 block text-sm font-medium text-slate-800"
      >
        {label}
        {required ? (
          <span className="ml-0.5 text-accent-600" aria-hidden="true">
            *
          </span>
        ) : null}
      </label>

      {as === "select" ? (
        <select
          id={generatedId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={controlClasses}
          required={required}
          {...controlProps}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          id={generatedId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={controlClasses}
          required={required}
          {...controlProps}
        />
      )}

      {hint && !error ? (
        <p id={`${generatedId}-hint`} className="mt-1.5 text-sm text-slate-500">
          {hint}
        </p>
      ) : null}

      {error ? (
        <p
          id={`${generatedId}-error`}
          role="alert"
          className="mt-1.5 text-sm font-medium text-accent-700"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}

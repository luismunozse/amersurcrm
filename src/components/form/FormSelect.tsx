import { SelectHTMLAttributes, ReactNode } from "react";

interface FormSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  required?: boolean;
  helperText?: string;
  children: ReactNode;
}

export function FormSelect({
  label,
  error,
  required = false,
  helperText,
  className = "",
  children,
  ...props
}: FormSelectProps) {
  const hasError = Boolean(error);

  return (
    <div className="space-y-1">
      <label className="block text-xs font-semibold text-crm-text-muted uppercase">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <select
        {...props}
        className={`
          w-full px-3 py-2 rounded-lg border bg-crm-card text-crm-text
          focus:outline-none focus:ring-2 transition-colors
          ${hasError
            ? 'border-red-500 focus:ring-red-500/40'
            : 'border-crm-border focus:ring-crm-primary'
          }
          ${props.disabled ? 'opacity-50 cursor-not-allowed' : ''}
          ${className}
        `}
        aria-invalid={hasError}
        aria-describedby={error ? `${props.id}-error` : helperText ? `${props.id}-helper` : undefined}
      >
        {children}
      </select>
      {error && (
        <p id={`${props.id}-error`} className="text-xs text-red-500 font-medium">
          {error}
        </p>
      )}
      {!error && helperText && (
        <p id={`${props.id}-helper`} className="text-xs text-crm-text-muted">
          {helperText}
        </p>
      )}
    </div>
  );
}

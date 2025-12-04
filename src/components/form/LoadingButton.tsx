import { ButtonHTMLAttributes } from "react";

interface LoadingButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  loadingText?: string;
  variant?: "primary" | "secondary" | "accent";
}

export function LoadingButton({
  isLoading = false,
  loadingText,
  variant = "primary",
  children,
  className = "",
  disabled,
  ...props
}: LoadingButtonProps) {
  const baseStyles = "px-4 py-2 text-sm rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2";

  const variantStyles = {
    primary: "bg-crm-primary text-white hover:bg-crm-primary-dark",
    secondary: "border border-crm-border text-crm-text hover:border-crm-primary",
    accent: "bg-crm-accent text-white hover:bg-crm-accent/90",
  };

  return (
    <button
      {...props}
      disabled={disabled || isLoading}
      className={`${baseStyles} ${variantStyles[variant]} ${className}`}
    >
      {isLoading && (
        <svg
          className="animate-spin h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {isLoading ? loadingText || children : children}
    </button>
  );
}

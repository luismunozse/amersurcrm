import { ButtonHTMLAttributes } from "react";
import { Spinner } from "@/components/ui/Spinner";

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
      {isLoading && <Spinner size="sm" />}
      {isLoading ? loadingText || children : children}
    </button>
  );
}

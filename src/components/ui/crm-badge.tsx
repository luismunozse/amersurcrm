import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const crmBadgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
        success: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
        warning: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
        danger: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
        info: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
        purple: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
        orange: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
        primary: "bg-crm-primary/10 text-crm-primary dark:bg-crm-primary/20 dark:text-crm-accent",
        secondary: "bg-crm-secondary/10 text-crm-secondary dark:bg-crm-secondary/20",
        outline: "border border-crm-border text-crm-text-primary bg-transparent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface CRMBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof crmBadgeVariants> {}

function CRMBadge({ className, variant, ...props }: CRMBadgeProps) {
  return (
    <span className={cn(crmBadgeVariants({ variant }), className)} {...props} />
  );
}

export { CRMBadge, crmBadgeVariants };

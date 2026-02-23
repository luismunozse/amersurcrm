"use client";

import * as React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface CRMSelectOption {
  value: string;
  label: string;
}

interface CRMSelectProps {
  value: string;
  onChange: (value: string) => void;
  options: CRMSelectOption[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  label?: string;
}

export function CRMSelect({
  value,
  onChange,
  options,
  placeholder = "Seleccionar...",
  className,
  disabled,
  label,
}: CRMSelectProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label className="text-sm font-medium text-crm-text-secondary">
          {label}
        </label>
      )}
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger
          className={cn(
            "bg-crm-card border-crm-border text-crm-text-primary",
            "hover:border-crm-border-hover",
            "focus:ring-crm-primary focus:ring-2 focus:ring-offset-0",
            "data-[placeholder]:text-crm-text-muted",
            className
          )}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent className="bg-crm-card border-crm-border">
          {options.map((option) => (
            <SelectItem
              key={option.value}
              value={option.value}
              className="text-crm-text-primary hover:bg-crm-card-hover focus:bg-crm-card-hover cursor-pointer"
            >
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

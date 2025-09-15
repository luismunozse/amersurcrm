import React from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

export function Input({ 
  label, 
  error, 
  helperText, 
  icon, 
  iconPosition = 'left',
  className, 
  id,
  ...props 
}: InputProps) {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
  
  const baseClasses = "w-full px-3 py-2 border rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-crm-primary focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed";
  
  const stateClasses = error 
    ? "border-crm-danger focus:ring-crm-danger" 
    : "border-crm-border hover:border-crm-border-hover";
  
  const iconClasses = icon 
    ? (iconPosition === 'left' ? "pl-10" : "pr-10")
    : "";

  return (
    <div className="space-y-1">
      {label && (
        <label 
          htmlFor={inputId} 
          className="block text-sm font-medium text-crm-text-primary"
        >
          {label}
        </label>
      )}
      
      <div className="relative">
        {icon && iconPosition === 'left' && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="text-crm-text-muted">{icon}</span>
          </div>
        )}
        
        <input
          id={inputId}
          className={cn(
            baseClasses,
            stateClasses,
            iconClasses,
            className
          )}
          {...props}
        />
        
        {icon && iconPosition === 'right' && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <span className="text-crm-text-muted">{icon}</span>
          </div>
        )}
      </div>
      
      {error && (
        <p className="text-sm text-crm-danger">{error}</p>
      )}
      
      {helperText && !error && (
        <p className="text-sm text-crm-text-muted">{helperText}</p>
      )}
    </div>
  );
}



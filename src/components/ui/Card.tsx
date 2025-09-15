import React from 'react';
import { cn } from '@/lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: 'default' | 'elevated' | 'outlined';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
}

export function Card({ 
  children, 
  className, 
  variant = 'default', 
  padding = 'md',
  hover = false,
  ...props 
}: CardProps) {
  const baseClasses = "rounded-xl transition-all duration-200";
  
  const variantClasses = {
    default: "bg-crm-card border border-crm-border",
    elevated: "bg-crm-card shadow-crm-lg border-0",
    outlined: "bg-transparent border-2 border-crm-border",
  };
  
  const paddingClasses = {
    none: "",
    sm: "p-3",
    md: "p-4 sm:p-6",
    lg: "p-6 sm:p-8",
  };
  
  const hoverClasses = hover ? "hover:bg-crm-card-hover hover:shadow-crm cursor-pointer" : "";

  return (
    <div
      className={cn(
        baseClasses,
        variantClasses[variant],
        paddingClasses[padding],
        hoverClasses,
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ 
  children, 
  className, 
  ...props 
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex flex-col space-y-1.5 pb-4", className)} {...props}>
      {children}
    </div>
  );
}

export function CardTitle({ 
  children, 
  className, 
  ...props 
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn("text-lg font-semibold text-crm-text-primary", className)} {...props}>
      {children}
    </h3>
  );
}

export function CardDescription({ 
  children, 
  className, 
  ...props 
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("text-sm text-crm-text-secondary", className)} {...props}>
      {children}
    </p>
  );
}

export function CardContent({ 
  children, 
  className, 
  ...props 
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("", className)} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ 
  children, 
  className, 
  ...props 
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex items-center pt-4", className)} {...props}>
      {children}
    </div>
  );
}



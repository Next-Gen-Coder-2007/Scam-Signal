import React from 'react';
import { cn } from '../../utils/cn';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'critical' | 'warning';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card: React.FC<CardProps> = ({
  className,
  variant = 'default',
  padding = 'md',
  children,
  ...props
}) => {
  const variantStyles = {
    default: 'bg-surface border-surface-border shadow-[0_1px_2px_rgba(15,23,42,0.04)]',
    elevated: 'bg-surface-elevated border-surface-subtle',
    critical: 'bg-surface border-rose-200',
    warning: 'bg-surface border-amber-200',
  }[variant];

  const paddingStyles = {
    none: 'p-0',
    sm: 'p-3.5',
    md: 'p-5',
    lg: 'p-6',
  }[padding];

  return (
    <div
      className={cn(
        'rounded-lg border transition-colors duration-150',
        variantStyles,
        paddingStyles,
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

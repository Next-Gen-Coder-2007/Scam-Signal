import React from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'cyan';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled,
  className,
  children,
  ...props
}) => {
  const variantStyles = {
    primary:
      'bg-accent-violet hover:bg-accent-violet-hover text-white border border-violet-700/20 shadow-sm',
    secondary:
      'bg-surface hover:bg-surface-elevated text-slate-700 border border-surface-border hover:border-surface-subtle shadow-sm',
    ghost:
      'bg-transparent hover:bg-surface-elevated text-slate-600 hover:text-slate-900 border border-transparent',
    danger:
      'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200',
    cyan:
      'bg-cyan-50 hover:bg-cyan-100 text-cyan-800 border border-cyan-200',
  }[variant];

  const sizeStyles = {
    sm: 'h-7 px-2.5 text-xs gap-1.5 rounded',
    md: 'h-9 px-3.5 text-xs gap-2 rounded-md',
    lg: 'h-10 px-4 text-sm gap-2 rounded-md',
  }[size];

  return (
    <button
      disabled={disabled || isLoading}
      className={cn(
        'inline-flex items-center justify-center font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 disabled:opacity-50 disabled:pointer-events-none select-none',
        variantStyles,
        sizeStyles,
        className
      )}
      {...props}
    >
      {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />}
      {children}
    </button>
  );
};

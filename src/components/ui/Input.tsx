import React from 'react';
import { cn } from '../../utils/cn';

interface BaseFieldProps {
  label?: string;
  error?: string;
  hint?: string;
}

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement>,
    BaseFieldProps {}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  hint,
  className,
  id,
  ...props
}) => {
  const inputId = id || props.name;
  return (
    <div className="space-y-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-xs font-medium text-zinc-300"
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={cn(
          'w-full h-9 px-3 rounded-md bg-canvas border text-xs text-zinc-100 placeholder-zinc-500 transition-colors focus:outline-none focus:border-accent-violet',
          error ? 'border-rose-500/60' : 'border-surface-border hover:border-surface-subtle',
          className
        )}
        {...props}
      />
      {error && <p className="text-[11px] text-rose-400">{error}</p>}
      {!error && hint && <p className="text-[11px] text-zinc-400">{hint}</p>}
    </div>
  );
};

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement>,
    BaseFieldProps {}

export const Textarea: React.FC<TextareaProps> = ({
  label,
  error,
  hint,
  className,
  id,
  ...props
}) => {
  const fieldId = id || props.name;
  return (
    <div className="space-y-1.5">
      {label && (
        <label
          htmlFor={fieldId}
          className="block text-xs font-medium text-zinc-300"
        >
          {label}
        </label>
      )}
      <textarea
        id={fieldId}
        className={cn(
          'w-full p-3 rounded-md bg-canvas border text-xs sm:text-sm text-zinc-100 placeholder-zinc-500 font-mono leading-relaxed transition-colors focus:outline-none focus:border-accent-violet resize-none',
          error ? 'border-rose-500/60' : 'border-surface-border hover:border-surface-subtle',
          className
        )}
        {...props}
      />
      {error && <p className="text-[11px] text-rose-400">{error}</p>}
      {!error && hint && <p className="text-[11px] text-zinc-500">{hint}</p>}
    </div>
  );
};

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement>,
    BaseFieldProps {}

export const Select: React.FC<SelectProps> = ({
  label,
  error,
  hint,
  className,
  id,
  children,
  ...props
}) => {
  const fieldId = id || props.name;
  return (
    <div className="space-y-1.5">
      {label && (
        <label
          htmlFor={fieldId}
          className="block text-xs font-medium text-zinc-300"
        >
          {label}
        </label>
      )}
      <select
        id={fieldId}
        className={cn(
          'w-full h-9 px-2.5 rounded-md bg-canvas border text-xs text-zinc-200 transition-colors focus:outline-none focus:border-accent-violet',
          error ? 'border-rose-500/60' : 'border-surface-border hover:border-surface-subtle',
          className
        )}
        {...props}
      >
        {children}
      </select>
      {error && <p className="text-[11px] text-rose-400">{error}</p>}
      {!error && hint && <p className="text-[11px] text-zinc-500">{hint}</p>}
    </div>
  );
};

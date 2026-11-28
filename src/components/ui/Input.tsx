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
          className="block text-xs font-medium text-slate-700"
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={cn(
          'w-full h-9 px-3 rounded-md bg-canvas border text-xs text-slate-900 placeholder-slate-400 transition-colors focus:outline-none focus:border-accent-violet',
          error ? 'border-rose-200' : 'border-surface-border hover:border-surface-subtle',
          className
        )}
        {...props}
      />
      {error && <p className="text-[11px] text-rose-700 break-all">{error}</p>}
      {!error && hint && <p className="text-[11px] text-slate-600">{hint}</p>}
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
          className="block text-xs font-medium text-slate-700"
        >
          {label}
        </label>
      )}
      <textarea
        id={fieldId}
        className={cn(
          'w-full p-3 rounded-md bg-canvas border text-xs sm:text-sm text-slate-900 placeholder-slate-400 font-mono leading-relaxed transition-colors focus:outline-none focus:border-accent-violet resize-none',
          error ? 'border-rose-200' : 'border-surface-border hover:border-surface-subtle',
          className
        )}
        {...props}
      />
      {error && <p className="text-[11px] text-rose-700 break-all">{error}</p>}
      {!error && hint && <p className="text-[11px] text-slate-500">{hint}</p>}
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
          className="block text-xs font-medium text-slate-700"
        >
          {label}
        </label>
      )}
      <select
        id={fieldId}
        className={cn(
          'w-full h-9 px-2.5 rounded-md bg-canvas border text-xs text-slate-800 transition-colors focus:outline-none focus:border-accent-violet',
          error ? 'border-rose-200' : 'border-surface-border hover:border-surface-subtle',
          className
        )}
        {...props}
      >
        {children}
      </select>
      {error && <p className="text-[11px] text-rose-700 break-all">{error}</p>}
      {!error && hint && <p className="text-[11px] text-slate-500">{hint}</p>}
    </div>
  );
};

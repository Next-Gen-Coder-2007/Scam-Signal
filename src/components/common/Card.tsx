import React from 'react';
import { cn } from '../../utils/cn';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  glow?: 'none' | 'rose' | 'amber' | 'emerald' | 'cyan';
}

export const Card: React.FC<CardProps> = ({
  className,
  glow = 'none',
  children,
  ...props
}) => {
  const glowStyles = {
    none: 'border-slate-800/80 bg-slate-900/70',
    rose: 'border-rose-900/40 bg-slate-900/80 shadow-[0_0_25px_-5px_rgba(244,63,94,0.15)]',
    amber: 'border-amber-900/40 bg-slate-900/80 shadow-[0_0_25px_-5px_rgba(245,158,11,0.15)]',
    emerald: 'border-emerald-900/40 bg-slate-900/80 shadow-[0_0_25px_-5px_rgba(16,185,129,0.15)]',
    cyan: 'border-cyan-900/40 bg-slate-900/80 shadow-[0_0_25px_-5px_rgba(6,182,212,0.15)]',
  }[glow];

  return (
    <div
      className={cn(
        'rounded-xl border backdrop-blur-sm p-5 transition-all duration-200',
        glowStyles,
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

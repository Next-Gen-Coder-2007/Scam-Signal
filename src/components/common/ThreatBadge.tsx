import React from 'react';
import { ShieldAlert, ShieldCheck, AlertTriangle } from 'lucide-react';
import { ThreatLevel } from '../../types/threat';
import { cn } from '../../utils/cn';

interface ThreatBadgeProps {
  level: ThreatLevel;
  score?: number;
  className?: string;
  size?: 'sm' | 'md';
}

export const ThreatBadge: React.FC<ThreatBadgeProps> = ({
  level,
  score,
  className,
  size = 'md',
}) => {
  const config = {
    CRITICAL: {
      bg: 'bg-rose-950/70 border-rose-500/40 text-rose-300',
      icon: ShieldAlert,
      label: 'Critical Threat',
    },
    HIGH: {
      bg: 'bg-rose-900/50 border-rose-500/30 text-rose-300',
      icon: ShieldAlert,
      label: 'High Risk',
    },
    SUSPICIOUS: {
      bg: 'bg-amber-950/70 border-amber-500/40 text-amber-300',
      icon: AlertTriangle,
      label: 'Suspicious',
    },
    SAFE: {
      bg: 'bg-emerald-950/70 border-emerald-500/40 text-emerald-300',
      icon: ShieldCheck,
      label: 'Clean / Safe',
    },
    UNKNOWN: {
      bg: 'bg-slate-900 border-slate-700 text-slate-400',
      icon: AlertTriangle,
      label: 'Uncertain',
    },
  }[level];

  const Icon = config.icon;
  const isSm = size === 'sm';

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium border rounded-full transition-colors duration-150',
        isSm ? 'px-2 py-0.5 text-xs gap-1' : 'px-2.5 py-1 text-xs gap-1.5',
        config.bg,
        className
      )}
    >
      <Icon className={isSm ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
      <span>{config.label}</span>
      {typeof score === 'number' && (
        <span className="ml-0.5 pl-1.5 border-l border-current/25 font-mono text-[11px]">
          {score}%
        </span>
      )}
    </span>
  );
};

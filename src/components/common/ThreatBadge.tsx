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
      bg: 'bg-rose-50 border-rose-200 text-rose-700',
      icon: ShieldAlert,
      label: 'Critical Threat',
    },
    HIGH: {
      bg: 'bg-rose-50 border-rose-200 text-rose-700',
      icon: ShieldAlert,
      label: 'High Risk',
    },
    SUSPICIOUS: {
      bg: 'bg-amber-50 border-amber-200 text-amber-800',
      icon: AlertTriangle,
      label: 'Suspicious',
    },
    SAFE: {
      bg: 'bg-emerald-50 border-emerald-200 text-emerald-700',
      icon: ShieldCheck,
      label: 'Clean / Safe',
    },
    UNKNOWN: {
      bg: 'bg-surface-elevated border-surface-border text-slate-600',
      icon: AlertTriangle,
      label: 'Uncertain',
    },
  }[level];

  const Icon = config.icon;
  const isSm = size === 'sm';

  return (
    <span
      className={cn(
        'inline-flex items-center font-medium border rounded',
        isSm ? 'px-2 py-0.5 text-[11px] gap-1' : 'px-2.5 py-1 text-xs gap-1.5',
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

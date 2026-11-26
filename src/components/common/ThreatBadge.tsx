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
      bg: 'bg-rose-950/50 border-rose-500/35 text-rose-300',
      icon: ShieldAlert,
      label: 'Critical Threat',
    },
    HIGH: {
      bg: 'bg-rose-950/30 border-rose-500/25 text-rose-300',
      icon: ShieldAlert,
      label: 'High Risk',
    },
    SUSPICIOUS: {
      bg: 'bg-amber-950/40 border-amber-500/30 text-amber-300',
      icon: AlertTriangle,
      label: 'Suspicious',
    },
    SAFE: {
      bg: 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300',
      icon: ShieldCheck,
      label: 'Clean / Safe',
    },
    UNKNOWN: {
      bg: 'bg-surface-elevated border-surface-border text-zinc-400',
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

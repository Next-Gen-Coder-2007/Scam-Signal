import React from 'react';
import { Cpu, Cloud, HelpCircle } from 'lucide-react';
import { InferenceSource } from '../../types/threat';
import { cn } from '../../utils/cn';

interface InferenceBadgeProps {
  source: InferenceSource;
  modelIdentifier?: string;
  latencyMs?: number;
  className?: string;
}

export const InferenceBadge: React.FC<InferenceBadgeProps> = ({
  source,
  modelIdentifier,
  latencyMs,
  className,
}) => {
  const config = {
    on_device: {
      bg: 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300',
      dot: 'bg-emerald-400',
      icon: Cpu,
      defaultLabel: 'On-Device (SDK)',
    },
    in_cloud: {
      bg: 'bg-violet-950/40 border-violet-500/35 text-violet-300',
      dot: 'bg-violet-400',
      icon: Cloud,
      defaultLabel: 'In-Cloud (SDK)',
    },
    unknown: {
      bg: 'bg-surface-elevated border-surface-border text-zinc-400',
      dot: 'bg-zinc-500',
      icon: HelpCircle,
      defaultLabel: 'Unknown Source',
    },
  }[source];

  const Icon = config.icon;
  const label = modelIdentifier || config.defaultLabel;

  return (
    <span
      title={`SDK inferenceSource: ${source}`}
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono border transition-colors',
        config.bg,
        className
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full', config.dot)} />
      <Icon className="w-3.5 h-3.5" />
      <span>{label}</span>
      {typeof latencyMs === 'number' && (
        <span className="text-[11px] opacity-75 ml-0.5">({latencyMs}ms)</span>
      )}
    </span>
  );
};

import React from 'react';
import { Cpu, Cloud, GitFork } from 'lucide-react';
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
    'on-device': {
      bg: 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300',
      dot: 'bg-emerald-400',
      icon: Cpu,
      defaultLabel: 'On-Device',
    },
    cloud: {
      bg: 'bg-violet-950/40 border-violet-500/35 text-violet-300',
      dot: 'bg-violet-400',
      icon: Cloud,
      defaultLabel: 'Cloud AI',
    },
    'hybrid-fallback': {
      bg: 'bg-cyan-950/35 border-cyan-500/35 text-cyan-300',
      dot: 'bg-cyan-400',
      icon: GitFork,
      defaultLabel: 'Hybrid Fallback',
    },
  }[source];

  const Icon = config.icon;
  const label = modelIdentifier || config.defaultLabel;

  return (
    <span
      title={`Inference Source: ${source}`}
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

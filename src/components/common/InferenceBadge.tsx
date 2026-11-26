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
      bg: 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300',
      dot: 'bg-emerald-400',
      icon: Cpu,
      defaultLabel: 'On-Device (Private)',
    },
    'cloud': {
      bg: 'bg-indigo-950/40 border-indigo-500/30 text-indigo-300',
      dot: 'bg-indigo-400',
      icon: Cloud,
      defaultLabel: 'Cloud Intelligence',
    },
    'hybrid-fallback': {
      bg: 'bg-cyan-950/40 border-cyan-500/30 text-cyan-300',
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
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono border backdrop-blur-sm transition-colors',
        config.bg,
        className
      )}
    >
      <span className={cn('w-1.5 h-1.5 rounded-full animate-pulse', config.dot)} />
      <Icon className="w-3.5 h-3.5" />
      <span>{label}</span>
      {typeof latencyMs === 'number' && (
        <span className="text-[10px] opacity-75 ml-0.5">({latencyMs}ms)</span>
      )}
    </span>
  );
};

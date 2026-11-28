import React from 'react';
import { ShieldCheck, Clock, XCircle } from 'lucide-react';
import { VerificationStatus } from '../../services/firestore/threatConverter';
import { cn } from '../../utils/cn';

interface ReviewStatusBadgeProps {
  status: VerificationStatus;
  className?: string;
}

export const ReviewStatusBadge: React.FC<ReviewStatusBadgeProps> = ({
  status,
  className,
}) => {
  const config = {
    verified: {
      bg: 'bg-emerald-50 border-emerald-200 text-emerald-700',
      icon: ShieldCheck,
      label: 'Verified Warning',
    },
    pending: {
      bg: 'bg-amber-50 border-amber-200 text-amber-800',
      icon: Clock,
      label: 'Unverified User Report',
    },
    rejected: {
      bg: 'bg-rose-50 border-rose-200 text-rose-700',
      icon: XCircle,
      label: 'Rejected',
    },
  }[status];

  const Icon = config.icon;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium border',
        config.bg,
        className
      )}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" />
      <span>{config.label}</span>
    </span>
  );
};

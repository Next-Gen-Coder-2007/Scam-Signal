import React from 'react';
import { HelpCircle, Eye, ShieldCheck } from 'lucide-react';
import type { CampaignVerificationStage } from '../../services/firestore/campaignIntelligenceService';
import { cn } from '../../utils/cn';

interface CampaignStatusBadgeProps {
  stage: CampaignVerificationStage;
  className?: string;
}

const STAGE_CONFIG: Record<
  CampaignVerificationStage,
  { label: string; classes: string; icon: React.ComponentType<{ className?: string }> }
> = {
  potential: {
    label: 'Potential Campaign',
    classes: 'bg-amber-950/35 border-amber-500/35 text-amber-300',
    icon: HelpCircle,
  },
  under_review: {
    label: 'Under Review',
    classes: 'bg-cyan-950/35 border-cyan-500/35 text-cyan-300',
    icon: Eye,
  },
  verified: {
    label: 'Verified Campaign',
    classes: 'bg-emerald-950/45 border-emerald-500/40 text-emerald-300',
    icon: ShieldCheck,
  },
};

export const CampaignStatusBadge: React.FC<CampaignStatusBadgeProps> = ({
  stage,
  className,
}) => {
  const { label, classes, icon: Icon } = STAGE_CONFIG[stage];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium border',
        classes,
        className
      )}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" />
      <span>{label}</span>
    </span>
  );
};

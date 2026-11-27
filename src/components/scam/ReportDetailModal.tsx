import React from 'react';
import { Calendar, Hash, ShieldAlert, Quote, AlertTriangle, ShieldCheck, Clock } from 'lucide-react';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { ThreatBadge } from '../common/ThreatBadge';
import { InferenceBadge } from '../common/InferenceBadge';
import { ReviewStatusBadge } from './ReviewStatusBadge';
import { PendingReportDocument } from '../../services/firestore/threatConverter';
import {
  SCAM_CATEGORY_LABELS,
  ScamCategory,
  MANIPULATION_PATTERN_LABELS,
  ManipulationPattern,
} from '../../services/ai/analysisSchema';
import { redactPII } from '../../utils/redactor';

interface ReportDetailModalProps {
  report: PendingReportDocument | null;
  onClose: () => void;
}

export const ReportDetailModal: React.FC<ReportDetailModalProps> = ({
  report,
  onClose,
}) => {
  if (!report) return null;

  const isVerified = report.verificationStatus === 'verified';
  const categoryLabel =
    SCAM_CATEGORY_LABELS[report.category as ScamCategory] ??
    report.category.replace(/_/g, ' ');
  const safeSummary = redactPII(report.redactedSummary);

  return (
    <Dialog
      isOpen={Boolean(report)}
      onClose={onClose}
      title={`Community Report Details`}
      description={`Observed ${report.observedDate || 'Unknown date'} • Channel: ${report.channel.toUpperCase()}`}
      icon={
        isVerified ? (
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
        ) : (
          <Clock className="w-4 h-4 text-amber-400" />
        )
      }
      maxWidth="2xl"
      footer={
        <Button variant="secondary" onClick={onClose}>
          Close Details
        </Button>
      }
    >
      <div className="space-y-5">
        {/* Verification Status Callout */}
        <div
          className={`p-3 rounded-md border text-xs flex items-start gap-2.5 ${
            isVerified
              ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-200'
              : 'bg-amber-950/20 border-amber-500/30 text-amber-200'
          }`}
        >
          {isVerified ? (
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          ) : (
            <Clock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          )}
          <div>
            <span className="font-semibold block">
              {isVerified
                ? 'Verified Community Warning'
                : 'Unverified User Report'}
            </span>
            <span className="text-[11px] opacity-85">
              {isVerified
                ? 'This redacted pattern has been reviewed and corroborated by an analyst.'
                : 'This report was voluntarily submitted by a community member and has not yet been verified by an analyst.'}
            </span>
          </div>
        </div>

        {/* Metadata Badges */}
        <div className="flex flex-wrap items-center gap-2">
          <ReviewStatusBadge status={report.verificationStatus} />
          <ThreatBadge level={report.riskAssessment} />
          <span className="px-2.5 py-1 rounded text-xs font-mono bg-surface-elevated text-zinc-200 border border-surface-border">
            {categoryLabel}
          </span>
          <InferenceBadge source={report.inferenceSource} />
        </div>

        {/* Sanitized Evidence Summary */}
        <div className="space-y-1.5">
          <h4 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
            Redacted Evidence Summary
          </h4>
          <div className="p-3.5 rounded-md bg-canvas border border-surface-border font-mono text-xs text-zinc-200 leading-relaxed whitespace-pre-wrap">
            {safeSummary}
          </div>
        </div>

        {/* Observed Evidence Quotes */}
        {report.evidence.length > 0 && (
          <div className="space-y-1.5">
            <h4 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
              <Quote className="w-3.5 h-3.5 text-cyan-400" />
              Quoted Evidence
            </h4>
            <div className="space-y-1.5">
              {report.evidence.map((ev, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-md bg-canvas border border-surface-border text-xs font-mono text-cyan-200/90"
                >
                  {redactPII(ev)}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Indicators */}
        {report.indicators.length > 0 && (
          <div className="space-y-1.5">
            <h4 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              Reported Indicators
            </h4>
            <div className="flex flex-wrap gap-2">
              {report.indicators.map((ind, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded text-xs bg-surface-elevated text-zinc-300 border border-surface-border"
                >
                  {MANIPULATION_PATTERN_LABELS[ind as ManipulationPattern] ?? ind}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Footer Metadata */}
        <div className="pt-3 border-t border-surface-border flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-zinc-500">
          <span className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            Observed: {report.observedDate || 'N/A'}
          </span>
          <span className="flex items-center gap-1.5">
            <Hash className="w-3.5 h-3.5 text-cyan-400" />
            Digest: {report.normalizedPatternHash.slice(0, 12)}
          </span>
        </div>

        {/* Advisory Notice */}
        <div className="p-2.5 rounded-md bg-canvas border border-surface-border text-[11px] text-zinc-400 flex items-start gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <span>
            Personal identifiers and raw private messages are excluded. Always verify independently with official sources.
          </span>
        </div>
      </div>
    </Dialog>
  );
};

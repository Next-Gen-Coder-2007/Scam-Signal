import React from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle,
  Hash,
  RotateCcw,
  ListCheck,
  Radio,
} from 'lucide-react';
import { ThreatAnalysisResult } from '../../services/ai/scamAnalyzerService';
import { ThreatBadge } from '../common/ThreatBadge';
import { InferenceBadge } from '../common/InferenceBadge';
import { Card } from '../common/Card';
import { Button } from '../ui/Button';

interface AnalysisResultCardProps {
  result: ThreatAnalysisResult;
  onReset: () => void;
  onShareToCommunity?: (result: ThreatAnalysisResult) => void;
}

export const AnalysisResultCard: React.FC<AnalysisResultCardProps> = ({
  result,
  onReset,
  onShareToCommunity,
}) => {
  const cardVariant =
    result.threatLevel === 'CRITICAL' || result.threatLevel === 'HIGH'
      ? 'critical'
      : result.threatLevel === 'SUSPICIOUS'
      ? 'warning'
      : 'default';

  return (
    <Card variant={cardVariant} className="space-y-6">
      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-surface-border">
        <div className="flex flex-wrap items-center gap-2">
          <ThreatBadge level={result.threatLevel} score={result.confidenceScore} />
          <InferenceBadge
            source={result.inferenceSource}
            modelIdentifier={result.modelIdentifier}
            latencyMs={result.latencyMs}
          />
        </div>

        <div className="flex items-center gap-1.5 text-[11px] font-mono text-cyan-300 bg-canvas border border-surface-border px-2.5 py-1 rounded">
          <Hash className="w-3.5 h-3.5 text-cyan-400" />
          <span>Pattern: {result.normalizedPatternHash.slice(0, 12)}</span>
        </div>
      </div>

      {/* Summary Narrative */}
      <div>
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
          Scam Intelligence Summary
        </h3>
        <p className="text-sm text-zinc-200 leading-relaxed bg-canvas p-3.5 rounded-md border border-surface-border">
          {result.redactedSummary}
        </p>
      </div>

      {/* Detected Threat Categories */}
      <div>
        <h4 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-2">
          Observed Classifications
        </h4>
        <div className="flex flex-wrap gap-2">
          {result.threatCategories.map((cat, idx) => (
            <span
              key={idx}
              className="px-2.5 py-1 rounded text-xs font-mono font-medium bg-surface-elevated text-zinc-200 border border-surface-border"
            >
              {cat.replace(/_/g, ' ')}
            </span>
          ))}
        </div>
      </div>

      {/* Tactical Indicators */}
      <div>
        <h4 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-2 flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
          Tactical Indicators (IOCs)
        </h4>
        <div className="space-y-1.5">
          {result.tacticalIndicators.map((ioc, idx) => (
            <div
              key={idx}
              className="flex items-start gap-2.5 p-2.5 rounded-md bg-canvas border border-surface-border text-xs text-zinc-300 font-mono"
            >
              <span className="text-amber-400 font-bold shrink-0">•</span>
              <span>{ioc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recommended Actions */}
      <div>
        <h4 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-2 flex items-center gap-1.5">
          <ListCheck className="w-3.5 h-3.5 text-emerald-400" />
          Recommended Countermeasures
        </h4>
        <div className="space-y-1.5">
          {result.advisoryAdvice.map((action, idx) => (
            <div
              key={idx}
              className="flex items-start gap-2.5 p-2.5 rounded-md bg-emerald-950/15 border border-emerald-500/25 text-xs text-emerald-200"
            >
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{action}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Mandatory Advisory Notice */}
      <div className="p-3 rounded-md bg-amber-950/20 border border-amber-500/25 text-amber-200/90 text-xs leading-relaxed flex items-start gap-2">
        <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <span>
          <strong>Advisory Disclaimer:</strong> ScamSignal evaluations are automated heuristic
          risk classifications. Verify independently with official banking channels before taking
          financial or legal actions.
        </span>
      </div>

      {/* Action Footer */}
      <div className="pt-4 border-t border-surface-border flex flex-col sm:flex-row items-center justify-between gap-3">
        <Button variant="secondary" onClick={onReset} className="w-full sm:w-auto">
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Analyze Another Message</span>
        </Button>

        {onShareToCommunity && (
          <Button
            variant="primary"
            onClick={() => onShareToCommunity(result)}
            className="w-full sm:w-auto"
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Share Scrubbed Signal to Feed</span>
          </Button>
        )}
      </div>
    </Card>
  );
};

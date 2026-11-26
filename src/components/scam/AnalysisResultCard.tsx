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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800/80">
        <div className="flex flex-wrap items-center gap-2.5">
          <ThreatBadge level={result.threatLevel} score={result.confidenceScore} />
          <InferenceBadge
            source={result.inferenceSource}
            modelIdentifier={result.modelIdentifier}
            latencyMs={result.latencyMs}
          />
        </div>

        <div className="flex items-center gap-1.5 text-[11px] font-mono text-cyan-400 bg-cyan-950/40 border border-cyan-800/40 px-2.5 py-1 rounded-full">
          <Hash className="w-3.5 h-3.5" />
          <span>Pattern Hash: {result.normalizedPatternHash.slice(0, 12)}</span>
        </div>
      </div>

      {/* Summary Narrative */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
          Scam Intelligence Summary
        </h3>
        <p className="text-sm text-slate-200 leading-relaxed font-sans bg-slate-950/60 p-3.5 rounded-lg border border-slate-800/80">
          {result.redactedSummary}
        </p>
      </div>

      {/* Detected Threat Categories */}
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
          Observed Scam Classifications
        </h4>
        <div className="flex flex-wrap gap-2">
          {result.threatCategories.map((cat, idx) => (
            <span
              key={idx}
              className="px-2.5 py-1 rounded-md text-xs font-mono font-medium bg-slate-800/80 text-rose-300 border border-slate-700/80"
            >
              {cat.replace(/_/g, ' ')}
            </span>
          ))}
        </div>
      </div>

      {/* Tactical Indicators */}
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          Tactical Indicators of Compromise (IOCs)
        </h4>
        <div className="space-y-2">
          {result.tacticalIndicators.map((ioc, idx) => (
            <div
              key={idx}
              className="flex items-start gap-2.5 p-2.5 rounded-lg bg-slate-950/60 border border-slate-800 text-xs text-slate-300 font-mono"
            >
              <span className="text-amber-400 font-bold shrink-0 mt-0.5">•</span>
              <span>{ioc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Recommended Actions */}
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
          <ListCheck className="w-4 h-4 text-emerald-400" />
          Recommended Actions & Countermeasures
        </h4>
        <div className="space-y-2">
          {result.advisoryAdvice.map((action, idx) => (
            <div
              key={idx}
              className="flex items-start gap-2.5 p-2.5 rounded-lg bg-emerald-950/20 border border-emerald-500/20 text-xs text-emerald-200"
            >
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{action}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Mandatory Advisory Notice */}
      <div className="p-3 rounded-lg bg-amber-950/30 border border-amber-500/30 text-amber-200/90 text-xs leading-relaxed flex items-start gap-2">
        <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
        <span>
          <strong>Advisory Disclaimer:</strong> ScamSignal evaluations are automated heuristic
          risk classifications. Verify independently with official banking channels before taking
          financial or legal actions.
        </span>
      </div>

      {/* Action Footer */}
      <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
        <button
          onClick={onReset}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Analyze Another Message</span>
        </button>

        {onShareToCommunity && (
          <button
            onClick={() => onShareToCommunity(result)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2 rounded-lg text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white shadow-sm transition-colors"
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Share Scrubbed Signal to Feed</span>
          </button>
        )}
      </div>
    </Card>
  );
};

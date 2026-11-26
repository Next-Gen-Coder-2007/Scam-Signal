import React from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle,
  Hash,
  RotateCcw,
  ListCheck,
  Radio,
  Cpu,
  Cloud,
  Quote,
} from 'lucide-react';
import { ThreatAnalysisResult } from '../../services/ai/scamAnalyzerService';
import { ThreatBadge } from '../common/ThreatBadge';
import { InferenceBadge } from '../common/InferenceBadge';
import { Card } from '../common/Card';
import { Button } from '../ui/Button';
import { ThreatLevel } from '../../types/threat';

interface AnalysisResultCardProps {
  result: ThreatAnalysisResult;
  onReset: () => void;
  onShareToCommunity?: (result: ThreatAnalysisResult) => void;
}

const RISK_HEADLINES: Record<ThreatLevel, string> = {
  CRITICAL: 'High Risk — Strong Scam Signals Detected',
  HIGH: 'High Risk — Likely Scam or Phishing Attempt',
  SUSPICIOUS: 'Proceed with Caution — Suspicious Elements Found',
  SAFE: 'No Obvious Scam Signals Detected',
  UNKNOWN: 'Uncertain — Review Carefully',
};

export const AnalysisResultCard: React.FC<AnalysisResultCardProps> = ({
  result,
  onReset,
  onShareToCommunity,
}) => {
  const cardVariant =
    result.riskLevel === 'CRITICAL' || result.riskLevel === 'HIGH'
      ? 'critical'
      : result.riskLevel === 'SUSPICIOUS'
      ? 'warning'
      : 'default';

  const isOnDevice = result.inferenceSource === 'on_device';

  return (
    <Card variant={cardVariant} className="space-y-6">
      {/* Prominent Inference Source Banner */}
      <div
        className={`p-3.5 rounded-md border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
          isOnDevice
            ? 'bg-emerald-950/20 border-emerald-500/30'
            : 'bg-violet-950/25 border-violet-500/30'
        }`}
      >
        <div className="flex items-start sm:items-center gap-2.5">
          {isOnDevice ? (
            <Cpu className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5 sm:mt-0" />
          ) : (
            <Cloud className="w-4 h-4 text-accent-violet-muted shrink-0 mt-0.5 sm:mt-0" />
          )}
          <div className="text-xs">
            <span className="font-semibold text-zinc-100 block">
              {isOnDevice
                ? 'Processed On-Device (Private, Local AI)'
                : result.inferenceSource === 'in_cloud'
                ? 'Processed in Cloud (Firebase AI Logic)'
                : 'Inference Source Unreported'}
            </span>
            <span className="text-[11px] text-zinc-400">
              {isOnDevice
                ? 'Your message was analyzed locally on your browser without leaving your device.'
                : 'Your scrubbed message was analyzed by the cloud model via Firebase AI Logic.'}
            </span>
          </div>
        </div>

        <InferenceBadge
          source={result.inferenceSource}
          modelIdentifier={result.modelIdentifier}
          latencyMs={result.latencyMs}
        />
      </div>

      {/* Risk Level & Category Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-surface-border">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <ThreatBadge level={result.riskLevel} />
            <span className="px-2.5 py-1 rounded text-xs font-mono font-medium bg-surface-elevated text-zinc-200 border border-surface-border">
              Category: {result.scamCategory}
            </span>
          </div>
          <h2 className="text-base font-semibold text-zinc-100">
            {RISK_HEADLINES[result.riskLevel]}
          </h2>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] font-mono text-cyan-300 bg-canvas border border-surface-border px-2.5 py-1 rounded self-start sm:self-center">
          <Hash className="w-3.5 h-3.5 text-cyan-400" />
          <span>Pattern: {result.normalizedPatternHash.slice(0, 12)}</span>
        </div>
      </div>

      {/* Plain-Language Explanation */}
      <div>
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
          Plain-Language Explanation
        </h3>
        <p className="text-sm text-zinc-200 leading-relaxed bg-canvas p-3.5 rounded-md border border-surface-border">
          {result.explanation}
        </p>
      </div>

      {/* Suspicious Indicators & Supporting Evidence */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h4 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-2 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            Suspicious Indicators
          </h4>
          <div className="space-y-1.5">
            {result.suspiciousIndicators.map((indicator, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2 p-2.5 rounded-md bg-canvas border border-surface-border text-xs text-zinc-300"
              >
                <span className="text-amber-400 font-bold shrink-0">•</span>
                <span>{indicator}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-2 flex items-center gap-1.5">
            <Quote className="w-3.5 h-3.5 text-cyan-400" />
            Supporting Evidence from Message
          </h4>
          <div className="space-y-1.5">
            {result.supportingEvidence.map((evidence, idx) => (
              <div
                key={idx}
                className="p-2.5 rounded-md bg-canvas border border-surface-border text-xs text-cyan-200/90 font-mono"
              >
                {evidence}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recommended Actions */}
      <div>
        <h4 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-2 flex items-center gap-1.5">
          <ListCheck className="w-3.5 h-3.5 text-emerald-400" />
          What You Should Do Next
        </h4>
        <div className="space-y-1.5">
          {result.recommendedActions.map((action, idx) => (
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
          <strong>Advisory Notice:</strong> ScamSignal provides AI-assisted pattern guidance, not
          a guarantee. Always verify independently using official phone numbers or apps before
          sending money or sharing personal details.
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

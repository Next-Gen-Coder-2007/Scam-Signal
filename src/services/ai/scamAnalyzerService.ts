import { ThreatLevel, InferenceSource } from '../../types/threat';
import { redactPII, computePatternHash } from '../../utils/redactor';
import {
  executeHybridInference,
  InferenceMode,
} from './firebaseAILogic';
import {
  ScamCategory,
  ManipulationPattern,
  IndicatorDetail,
} from './analysisSchema';

export type AnalyzerChannel =
  | 'sms'
  | 'whatsapp'
  | 'email'
  | 'job_offer'
  | 'payment_request'
  | 'call'
  | 'web';

export interface ThreatAnalysisResult {
  id: string;
  riskLevel: ThreatLevel;
  scamCategory: ScamCategory;
  manipulationPatterns: ManipulationPattern[];
  observedEvidence: string[];
  indicators: IndicatorDetail[];
  aiInterpretation: string;
  recommendedActions: string[];
  inferenceSource: InferenceSource;
  modelIdentifier: string;
  latencyMs: number;
  normalizedPatternHash: string;
  analyzedAt: string;
}

export interface AnalyzeScamOptions {
  rawContent: string;
  channel: AnalyzerChannel;
  mode: InferenceMode;
  onDownloadProgress?: (loadedRatio: number) => void;
  signal?: AbortSignal;
}

/**
 * High-level scam analysis service.
 * Scrubs PII client-side before invoking Firebase AI Logic hybrid inference.
 */
export async function analyzeScamMessage(
  options: AnalyzeScamOptions
): Promise<ThreatAnalysisResult> {
  const scrubbedText = redactPII(options.rawContent);
  const patternHash = await computePatternHash(scrubbedText);

  const aiResult = await executeHybridInference({
    prompt: scrubbedText,
    channel: options.channel,
    mode: options.mode,
    onDownloadProgress: options.onDownloadProgress,
    signal: options.signal,
  });

  return {
    id: `scan-${crypto.randomUUID().slice(0, 8)}`,
    riskLevel: aiResult.riskLevel,
    scamCategory: aiResult.scamCategory,
    manipulationPatterns: aiResult.manipulationPatterns,
    observedEvidence: aiResult.observedEvidence,
    indicators: aiResult.indicators,
    aiInterpretation: aiResult.aiInterpretation,
    recommendedActions: aiResult.recommendedActions,
    inferenceSource: aiResult.source,
    modelIdentifier: aiResult.modelIdentifier,
    latencyMs: aiResult.latencyMs,
    normalizedPatternHash: patternHash,
    analyzedAt: new Date().toISOString(),
  };
}

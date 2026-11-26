import { ThreatLevel, InferenceSource } from '../../types/threat';
import { redactPII, computePatternHash } from '../../utils/redactor';
import {
  executeHybridInference,
  InferenceMode,
} from './firebaseAILogic';

export interface ThreatAnalysisResult {
  id: string;
  threatLevel: ThreatLevel;
  confidenceScore: number;
  threatCategories: string[];
  redactedSummary: string;
  tacticalIndicators: string[];
  advisoryAdvice: string[];
  inferenceSource: InferenceSource;
  modelIdentifier: string;
  latencyMs: number;
  normalizedPatternHash: string;
  analyzedAt: string;
}

export interface AnalyzeScamOptions {
  rawContent: string;
  channel: 'sms' | 'email' | 'whatsapp' | 'call' | 'web';
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
    threatLevel: aiResult.threatLevel,
    confidenceScore: aiResult.confidenceScore,
    threatCategories: aiResult.threatCategories,
    redactedSummary: aiResult.summary,
    tacticalIndicators: aiResult.tacticalIndicators,
    advisoryAdvice: aiResult.recommendedActions,
    inferenceSource: aiResult.source,
    modelIdentifier: aiResult.modelIdentifier,
    latencyMs: aiResult.latencyMs,
    normalizedPatternHash: patternHash,
    analyzedAt: new Date().toISOString(),
  };
}

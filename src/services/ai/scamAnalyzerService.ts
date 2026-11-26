import { ThreatLevel, InferenceSource } from '../../types/threat';
import { redactPII, computePatternHash } from '../../utils/redactor';
import { runFirebaseAILogic, InferencePreference } from './firebaseAILogic';

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
  preference?: InferencePreference;
  allowCloudFallback?: boolean;
}

/**
 * High-level scam analysis service.
 * Automatically runs client-side PII scrubbing before any inference dispatch.
 */
export async function analyzeScamMessage(
  options: AnalyzeScamOptions
): Promise<ThreatAnalysisResult> {
  // 1. Mandatory client-side PII scrubbing
  const scrubbedText = redactPII(options.rawContent);

  // 2. Deterministic pattern hash computation for safe campaign correlation
  const patternHash = await computePatternHash(scrubbedText);

  // 3. Delegate to Firebase AI Logic
  const aiResult = await runFirebaseAILogic({
    prompt: scrubbedText,
    channel: options.channel,
    preference: options.preference || 'on-device-preferred',
    allowCloudFallback: options.allowCloudFallback ?? true,
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

export type ThreatLevel = 'CRITICAL' | 'HIGH' | 'SUSPICIOUS' | 'SAFE' | 'UNKNOWN';

/**
 * Matches the actual runtime inferenceSource returned by Firebase AI Logic SDK:
 * - 'on_device': Executed locally via Chrome Prompt API / Gemini Nano
 * - 'in_cloud': Executed in the cloud via Firebase AI Logic backend
 * - 'unknown': Runtime source could not be determined from SDK response
 */
export type InferenceSource = 'on_device' | 'in_cloud' | 'unknown';

export interface ThreatTelemetry {
  source: InferenceSource;
  modelIdentifier: string;
  latencyMs?: number;
  isDeterministicVerified?: boolean;
}

export interface ThreatSummaryItem {
  id: string;
  threatLevel: ThreatLevel;
  confidenceScore: number;
  threatCategory: string;
  redactedExcerpt: string;
  channel: 'sms' | 'email' | 'whatsapp' | 'call' | 'web';
  inferenceSource: InferenceSource;
  timestamp: string;
  upvotes?: number;
  campaignId?: string | null;
}

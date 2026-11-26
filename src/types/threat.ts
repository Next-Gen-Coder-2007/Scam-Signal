export type ThreatLevel = 'CRITICAL' | 'HIGH' | 'SUSPICIOUS' | 'SAFE' | 'UNKNOWN';

export type InferenceSource = 'on-device' | 'cloud' | 'hybrid-fallback';

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

import { z } from 'zod';

export const SCAM_CATEGORIES = [
  'job_scam',
  'phishing',
  'impersonation',
  'investment_fraud',
  'payment_fraud',
  'delivery_scam',
  'suspicious_links',
  'legitimate_or_benign',
  'ambiguous_unclear',
] as const;

export type ScamCategory = (typeof SCAM_CATEGORIES)[number];

export const SCAM_CATEGORY_LABELS: Record<ScamCategory, string> = {
  job_scam: 'Job Scam',
  phishing: 'Phishing',
  impersonation: 'Impersonation',
  investment_fraud: 'Investment Fraud',
  payment_fraud: 'Payment Fraud',
  delivery_scam: 'Delivery Scam',
  suspicious_links: 'Suspicious Links',
  legitimate_or_benign: 'Legitimate / Benign',
  ambiguous_unclear: 'Ambiguous / Unclear',
};

export const MANIPULATION_PATTERNS = [
  'urgency',
  'upfront_payment',
  'impersonation',
  'unrealistic_rewards',
  'credential_request',
  'suspicious_communication',
] as const;

export type ManipulationPattern = (typeof MANIPULATION_PATTERNS)[number];

export const MANIPULATION_PATTERN_LABELS: Record<ManipulationPattern, string> = {
  urgency: 'Artificial Urgency',
  upfront_payment: 'Upfront Payment',
  impersonation: 'Impersonation',
  unrealistic_rewards: 'Unrealistic Rewards',
  credential_request: 'Credential Request',
  suspicious_communication: 'Suspicious Communication',
};

export const IndicatorDetailSchema = z.object({
  pattern: z.enum(MANIPULATION_PATTERNS),
  observedEvidence: z.string().min(2),
  explanation: z.string().min(8),
  verificationStep: z.string().min(8),
});

export type IndicatorDetail = z.infer<typeof IndicatorDetailSchema>;

export const ThreatResponseSchema = z
  .object({
    riskLevel: z.enum(['CRITICAL', 'HIGH', 'SUSPICIOUS', 'SAFE', 'UNKNOWN']),
    scamCategory: z.enum(SCAM_CATEGORIES),
    manipulationPatterns: z.array(z.enum(MANIPULATION_PATTERNS)),
    observedEvidence: z.array(z.string()),
    indicators: z.array(IndicatorDetailSchema),
    aiInterpretation: z.string().min(10),
    recommendedActions: z.array(z.string().min(4)).min(1),
  })
  .superRefine((data, ctx) => {
    // High-risk or critical classifications must be backed by observed evidence and indicators
    if (
      (data.riskLevel === 'CRITICAL' || data.riskLevel === 'HIGH') &&
      data.indicators.length === 0
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'CRITICAL or HIGH riskLevel requires at least one explained indicator.',
        path: ['indicators'],
      });
    }
  });

export type ThreatResponseData = z.infer<typeof ThreatResponseSchema>;

/**
 * Extracts and validates a structured ThreatResponseData object from raw model output.
 * Handles markdown code fences and throws descriptive SyntaxError or ZodError on invalid/incomplete output.
 */
export function parseAndValidateModelResponse(rawText: string): ThreatResponseData {
  const trimmed = rawText.trim();
  if (!trimmed) {
    throw new SyntaxError('Model returned an empty response.');
  }

  // Strip optional markdown code fences
  let cleaned = trimmed.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

  // If the model wrapped JSON with brief surrounding text, extract the outermost JSON object
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  }

  const parsed: unknown = JSON.parse(cleaned);
  return ThreatResponseSchema.parse(parsed);
}

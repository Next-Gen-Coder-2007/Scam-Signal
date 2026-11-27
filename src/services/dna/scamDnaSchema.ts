import { z } from 'zod';
import { SCAM_CATEGORIES, type ScamCategory } from '../ai/analysisSchema';

export const CLAIMED_ORG_TYPES = [
  'bank_financial',
  'government_tax',
  'postal_delivery',
  'tech_support',
  'employer_recruiter',
  'telecom_utility',
  'ecommerce_marketplace',
  'crypto_exchange',
  'payment_wallet',
  'unknown_unspecified',
] as const;

export type ClaimedOrgType = (typeof CLAIMED_ORG_TYPES)[number];

export const REQUESTED_ACTIONS = [
  'click_external_link',
  'send_money_or_fee',
  'share_otp_or_credentials',
  'call_phone_number',
  'reply_with_personal_info',
  'install_software_or_app',
  'scan_qr_or_upi',
  'none_detected',
] as const;

export type RequestedAction = (typeof REQUESTED_ACTIONS)[number];

export const PAYMENT_MECHANISMS = [
  'upi',
  'bank_transfer',
  'gift_card',
  'crypto',
  'credit_debit_card',
  'wire_transfer',
  'ewallet',
  'none_detected',
] as const;

export type PaymentMechanism = (typeof PAYMENT_MECHANISMS)[number];

export const URGENCY_PATTERNS = [
  'account_suspension_threat',
  'countdown_deadline',
  'immediate_action_required',
  'legal_or_arrest_threat',
  'limited_time_offer',
  'missed_delivery_hold',
] as const;

export type UrgencyPattern = (typeof URGENCY_PATTERNS)[number];

export const IMPERSONATION_INDICATORS = [
  'authority_title',
  'official_brand_claim',
  'generic_greeting',
  'domain_lookalike_or_mismatch',
  'support_desk_claim',
  'masked_sender_placeholder',
] as const;

export type ImpersonationIndicator = (typeof IMPERSONATION_INDICATORS)[number];

export const ScamDnaInputSchema = z.object({
  sanitizedText: z.string().trim().min(5, 'Sanitized report text must be at least 5 characters.').max(5000),
  categoryHint: z.enum(SCAM_CATEGORIES).optional(),
  observedEvidence: z.array(z.string().trim().min(1)).max(25).optional(),
  channel: z.enum(['sms', 'email', 'whatsapp', 'call', 'web']).optional(),
});

export type ScamDnaInput = z.infer<typeof ScamDnaInputSchema>;

/**
 * Indicators deterministically observed in the sanitized report text.
 * Never populated by unverified AI guesses.
 */
export const ScamDnaObservedSchema = z.object({
  claimedOrganizationTypes: z.array(z.enum(CLAIMED_ORG_TYPES)),
  requestedActions: z.array(z.enum(REQUESTED_ACTIONS)),
  paymentMechanisms: z.array(z.enum(PAYMENT_MECHANISMS)),
  urgencyPatterns: z.array(z.enum(URGENCY_PATTERNS)),
  impersonationIndicators: z.array(z.enum(IMPERSONATION_INDICATORS)),
  suspiciousDomains: z.array(z.string().min(3)),
  recurringPhrases: z.array(z.string().min(3)),
  evidenceSnippets: z.array(z.string().min(2)),
});

export type ScamDnaObserved = z.infer<typeof ScamDnaObservedSchema>;

/**
 * Structured AI interpretation (or conservative deterministic classification when AI is unavailable).
 * Kept strictly separate from observed indicators so AI inference is never treated as confirmed fact.
 */
export const ScamDnaInferredSchema = z.object({
  scamCategory: z.enum(SCAM_CATEGORIES),
  primaryClaimedOrganizationType: z.enum(CLAIMED_ORG_TYPES),
  primaryRequestedAction: z.enum(REQUESTED_ACTIONS),
  primaryPaymentMechanism: z.enum(PAYMENT_MECHANISMS),
  additionalUrgencyPatterns: z.array(z.enum(URGENCY_PATTERNS)),
  additionalImpersonationIndicators: z.array(z.enum(IMPERSONATION_INDICATORS)),
  rationale: z.string().min(8),
  inferenceSource: z.enum(['on_device', 'in_cloud', 'unknown']),
  isAiAssisted: z.boolean(),
});

export type ScamDnaInferred = z.infer<typeof ScamDnaInferredSchema>;

/**
 * Schema for raw JSON returned by Firebase AI Logic during Scam DNA interpretation.
 */
export const ScamDnaAiOutputSchema = z.object({
  scamCategory: z.enum(SCAM_CATEGORIES),
  claimedOrganizationType: z.enum(CLAIMED_ORG_TYPES),
  requestedAction: z.enum(REQUESTED_ACTIONS),
  paymentMechanism: z.enum(PAYMENT_MECHANISMS),
  urgencyPatterns: z.array(z.enum(URGENCY_PATTERNS)),
  impersonationIndicators: z.array(z.enum(IMPERSONATION_INDICATORS)),
  rationale: z.string().min(8),
});

export type ScamDnaAiOutput = z.infer<typeof ScamDnaAiOutputSchema>;

/**
 * Normalized comparable signature combining deterministic observations with
 * validated category/primary attributes for campaign comparison.
 */
export const ScamDnaNormalizedSchema = z.object({
  scamCategory: z.enum(SCAM_CATEGORIES),
  claimedOrganizationType: z.enum(CLAIMED_ORG_TYPES),
  requestedAction: z.enum(REQUESTED_ACTIONS),
  paymentMechanism: z.enum(PAYMENT_MECHANISMS),
  urgencyPatterns: z.array(z.enum(URGENCY_PATTERNS)),
  impersonationIndicators: z.array(z.enum(IMPERSONATION_INDICATORS)),
  suspiciousDomains: z.array(z.string().min(3)),
  recurringPhrases: z.array(z.string().min(3)),
  canonicalSignature: z.string().min(10),
  dnaHash: z.string().regex(/^[a-f0-9]{64}$/),
});

export type ScamDnaNormalized = z.infer<typeof ScamDnaNormalizedSchema>;

export const ScamDnaSignatureSchema = z.object({
  version: z.literal('1.0'),
  observed: ScamDnaObservedSchema,
  inferred: ScamDnaInferredSchema,
  normalized: ScamDnaNormalizedSchema,
  extractedAt: z.string().datetime(),
});

export type ScamDnaSignature = z.infer<typeof ScamDnaSignatureSchema>;

export type { ScamCategory };

/**
 * Parses and validates raw JSON returned by Firebase AI Logic for Scam DNA interpretation.
 */
export function parseAndValidateScamDnaAiResponse(rawText: string): ScamDnaAiOutput {
  const trimmed = rawText.trim();
  if (!trimmed) {
    throw new SyntaxError('Model returned an empty Scam DNA response.');
  }

  let cleaned = trimmed.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  }

  const parsed: unknown = JSON.parse(cleaned);
  return ScamDnaAiOutputSchema.parse(parsed);
}

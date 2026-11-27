import { z } from 'zod';
import type { ScamDnaSignature } from '../dna/scamDnaSchema';

export const CORRELATION_WEIGHTS = {
  shared_domain: 0.4,
  matching_payment_identifier: 0.35,
  repeated_contact_detail: 0.3,
  recurring_phrase: 0.25,
  matching_impersonated_org: 0.2,
  similar_requested_action: 0.15,
} as const;

export type CorrelationEvidenceType = keyof typeof CORRELATION_WEIGHTS;

/** Minimum total deterministic score required to link two reports into a candidate campaign. */
export const MIN_CORRELATION_SCORE = 0.4;

/**
 * Generic standalone words that must NEVER by themselves cause two reports
 * to be grouped into a campaign.
 */
export const GENERIC_NON_DISCRIMINATIVE_WORDS = new Set([
  'urgent',
  'urgency',
  'payment',
  'pay',
  'account',
  'verify',
  'click',
  'link',
  'message',
  'alert',
  'notice',
  'help',
  'support',
  'customer',
  'today',
  'now',
  'immediately',
]);

export const CorrelationEvidenceItemSchema = z.object({
  type: z.enum([
    'shared_domain',
    'matching_payment_identifier',
    'repeated_contact_detail',
    'recurring_phrase',
    'matching_impersonated_org',
    'similar_requested_action',
  ]),
  value: z.string().min(1),
  weight: z.number().min(0).max(1),
  explanation: z.string().min(5),
});

export type CorrelationEvidenceItem = z.infer<typeof CorrelationEvidenceItemSchema>;

export interface ReportCorrelationInput {
  reportId: string;
  dna: ScamDnaSignature;
  /** Safely hashed or tokenized payment identifiers (e.g., hashed UPI/wallet handles, never raw PII). */
  paymentIdentifiers?: string[];
  /** Safely hashed or tokenized contact handles (e.g., hashed phone/email tokens, never raw PII). */
  contactTokens?: string[];
  observedAt?: string;
}

export interface PairwiseCorrelationResult {
  reportAId: string;
  reportBId: string;
  matched: boolean;
  score: number;
  supportingIndicators: CorrelationEvidenceItem[];
  explanation: string;
  rejectionReason?: string;
}

export type CandidateCampaignStatus = 'CANDIDATE' | 'ACTIVE_WAVE';

export interface CorrelatedCampaignCluster {
  campaignId: string;
  name: string;
  primaryCategory: string;
  status: CandidateCampaignStatus;
  /** Candidate campaigns are never automatically verified. */
  verificationStatus: 'unverified';
  reportIds: string[];
  totalReports: number;
  supportingIndicators: CorrelationEvidenceItem[];
  links: PairwiseCorrelationResult[];
  createdAt: string;
}

/**
 * Returns true if a phrase is sufficiently specific (not just a single generic word
 * like "urgent" or "payment").
 */
export function isSpecificRecurringPhrase(phrase: string): boolean {
  const normalized = phrase.trim().toLowerCase();
  if (!normalized || normalized.length < 6) return false;
  const words = normalized.split(/\s+/).filter(Boolean);
  if (words.length === 1 && GENERIC_NON_DISCRIMINATIVE_WORDS.has(words[0])) {
    return false;
  }
  const nonGenericWords = words.filter((w) => !GENERIC_NON_DISCRIMINATIVE_WORDS.has(w));
  return nonGenericWords.length >= 1 && words.length >= 2;
}

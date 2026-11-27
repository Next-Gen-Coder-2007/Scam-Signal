import { z } from 'zod';
import { SCAM_CATEGORIES } from '../ai/analysisSchema';
import {
  CLAIMED_ORG_TYPES,
  IMPERSONATION_INDICATORS,
  PAYMENT_MECHANISMS,
  REQUESTED_ACTIONS,
  URGENCY_PATTERNS,
} from '../dna/scamDnaSchema';
import { CorrelationEvidenceItemSchema } from './correlationRules';
import { containsPII } from '../../utils/redactor';

export const MAX_REPORTS_PER_COLLECTIVE_ANALYSIS = 15;
export const MAX_DOMAINS_PER_REPORT = 8;
export const MAX_PHRASES_PER_REPORT = 8;
export const MAX_PROMPT_CHARS = 6000;

const NoPiiStringSchema = z
  .string()
  .trim()
  .min(1)
  .refine((val) => !containsPII(val), {
    message: 'Unredacted PII detected; only sanitized signatures may be sent to cloud analysis.',
  });

/**
 * Minimal, approved, sanitized report signature permitted for ONLY_IN_CLOUD collective analysis.
 * Raw message bodies are intentionally excluded.
 */
export const ApprovedSanitizedSignatureInputSchema = z.object({
  reportId: z.string().trim().min(1),
  /** Only approved community reports may participate in collective cloud analysis. */
  isApproved: z.literal(true),
  scamCategory: z.enum(SCAM_CATEGORIES),
  claimedOrganizationType: z.enum(CLAIMED_ORG_TYPES),
  requestedAction: z.enum(REQUESTED_ACTIONS),
  paymentMechanism: z.enum(PAYMENT_MECHANISMS),
  urgencyPatterns: z.array(z.enum(URGENCY_PATTERNS)).max(6),
  impersonationIndicators: z.array(z.enum(IMPERSONATION_INDICATORS)).max(6),
  suspiciousDomains: z.array(NoPiiStringSchema).max(MAX_DOMAINS_PER_REPORT),
  recurringPhrases: z.array(NoPiiStringSchema).max(MAX_PHRASES_PER_REPORT),
});

export type ApprovedSanitizedSignatureInput = z.infer<
  typeof ApprovedSanitizedSignatureInputSchema
>;

export const DeterministicLinkSummarySchema = z.object({
  reportAId: z.string().min(1),
  reportBId: z.string().min(1),
  score: z.number().min(0).max(1),
  explanation: z.string().min(5),
});

export const CollectiveCampaignAnalysisInputSchema = z.object({
  campaignId: z.string().trim().min(1),
  primaryCategory: z.enum(SCAM_CATEGORIES),
  deterministicStatus: z.enum(['CANDIDATE', 'ACTIVE_WAVE']),
  supportingIndicators: z.array(CorrelationEvidenceItemSchema).min(1).max(30),
  deterministicLinks: z.array(DeterministicLinkSummarySchema).min(1).max(50),
  approvedSignatures: z
    .array(ApprovedSanitizedSignatureInputSchema)
    .min(2, 'Collective campaign analysis requires at least 2 approved sanitized signatures.')
    .max(
      MAX_REPORTS_PER_COLLECTIVE_ANALYSIS,
      `Collective campaign analysis is capped at ${MAX_REPORTS_PER_COLLECTIVE_ANALYSIS} reports for cost control.`
    ),
});

export type CollectiveCampaignAnalysisInput = z.infer<
  typeof CollectiveCampaignAnalysisInputSchema
>;

export const CollectiveCampaignAiOutputSchema = z.object({
  sharedIndicatorsSummary: z.string().trim().min(10).max(1200),
  relationshipExplanation: z.string().trim().min(10).max(1500),
  inconsistencies: z.array(z.string().trim().min(4).max(300)).max(10),
  evidenceToReview: z.array(z.string().trim().min(4).max(300)).min(1).max(10),
  referencedReportIds: z.array(z.string().trim().min(1)).min(1).max(MAX_REPORTS_PER_COLLECTIVE_ANALYSIS),
});

export type CollectiveCampaignAiOutput = z.infer<typeof CollectiveCampaignAiOutputSchema>;

export interface CollectiveCampaignAnalysisRecord {
  campaignId: string;
  /** Deterministic matching results kept strictly separate from AI explanations. */
  deterministic: {
    status: 'CANDIDATE' | 'ACTIVE_WAVE';
    verificationStatus: 'unverified';
    totalReports: number;
    supportingIndicators: z.infer<typeof CorrelationEvidenceItemSchema>[];
    links: z.infer<typeof DeterministicLinkSummarySchema>[];
  };
  /** AI-generated collective explanation (advisory only, never confirmed fact). */
  aiExplanation: CollectiveCampaignAiOutput & {
    inferenceSource: 'on_device' | 'in_cloud' | 'unknown';
    modelIdentifier: string;
    analyzedAt: string;
  };
}

/**
 * Parses and validates raw JSON from Firebase AI Logic ONLY_IN_CLOUD collective analysis.
 * Rejects any output that references report IDs not present in the supplied evidence.
 */
export function parseAndValidateCollectiveAnalysisResponse(
  rawText: string,
  allowedReportIds: readonly string[]
): CollectiveCampaignAiOutput {
  const trimmed = rawText.trim();
  if (!trimmed) {
    throw new SyntaxError('Model returned an empty collective campaign analysis response.');
  }

  let cleaned = trimmed.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  }

  const parsed: unknown = JSON.parse(cleaned);
  const validated = CollectiveCampaignAiOutputSchema.parse(parsed);

  const allowedSet = new Set(allowedReportIds);
  const unsupportedIds = validated.referencedReportIds.filter((id) => !allowedSet.has(id));
  if (unsupportedIds.length > 0) {
    throw new Error(
      `Model referenced unsupported report ID(s) not present in supplied evidence: ${unsupportedIds.join(', ')}`
    );
  }

  return {
    ...validated,
    referencedReportIds: Array.from(new Set(validated.referencedReportIds)),
  };
}

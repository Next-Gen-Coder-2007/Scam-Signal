import { executeCollectiveCampaignInference } from '../ai/firebaseAILogic';
import {
  CollectiveCampaignAnalysisInput,
  CollectiveCampaignAnalysisInputSchema,
  CollectiveCampaignAnalysisRecord,
  MAX_PROMPT_CHARS,
} from './collectiveAnalysisSchema';

/**
 * Builds a minimal, cost-conscious JSON payload containing only approved,
 * sanitized signatures and deterministic correlation links.
 */
export function buildMinimalCollectivePayload(
  input: CollectiveCampaignAnalysisInput
): string {
  const payload = {
    campaignId: input.campaignId,
    primaryCategory: input.primaryCategory,
    supportingIndicators: input.supportingIndicators.map((ind) => ({
      type: ind.type,
      value: ind.value,
      weight: ind.weight,
    })),
    links: input.deterministicLinks.map((l) => ({
      a: l.reportAId,
      b: l.reportBId,
      score: l.score,
    })),
    signatures: input.approvedSignatures.map((sig) => ({
      reportId: sig.reportId,
      cat: sig.scamCategory,
      org: sig.claimedOrganizationType,
      act: sig.requestedAction,
      pay: sig.paymentMechanism,
      dom: sig.suspiciousDomains,
      phr: sig.recurringPhrases,
      urg: sig.urgencyPatterns,
      imp: sig.impersonationIndicators,
    })),
  };

  const serialized = JSON.stringify(payload);
  if (serialized.length > MAX_PROMPT_CHARS) {
    throw new Error(
      `Collective campaign payload (${serialized.length} chars) exceeds cost-control limit of ${MAX_PROMPT_CHARS} chars.`
    );
  }
  return serialized;
}

/**
 * Runs ONLY_IN_CLOUD collective campaign analysis on approved, sanitized signatures.
 * Strictly separates deterministic matching results from AI-generated explanations.
 */
export async function analyzeCollectiveCampaign(
  rawInput: CollectiveCampaignAnalysisInput,
  options?: { signal?: AbortSignal }
): Promise<CollectiveCampaignAnalysisRecord> {
  const input = CollectiveCampaignAnalysisInputSchema.parse(rawInput);
  const compactPayload = buildMinimalCollectivePayload(input);
  const allowedReportIds = input.approvedSignatures.map((s) => s.reportId);

  const aiResult = await executeCollectiveCampaignInference({
    compactPayload,
    allowedReportIds,
    signal: options?.signal,
  });

  return {
    campaignId: input.campaignId,
    deterministic: {
      status: input.deterministicStatus,
      verificationStatus: 'unverified',
      totalReports: input.approvedSignatures.length,
      supportingIndicators: input.supportingIndicators,
      links: input.deterministicLinks,
    },
    aiExplanation: {
      sharedIndicatorsSummary: aiResult.sharedIndicatorsSummary,
      relationshipExplanation: aiResult.relationshipExplanation,
      inconsistencies: aiResult.inconsistencies,
      evidenceToReview: aiResult.evidenceToReview,
      referencedReportIds: aiResult.referencedReportIds,
      inferenceSource: aiResult.source,
      modelIdentifier: aiResult.modelIdentifier,
      analyzedAt: new Date().toISOString(),
    },
  };
}

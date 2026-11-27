import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockExecuteCollectiveCampaignInference = vi.fn();

vi.mock('../../src/services/ai/firebaseAILogic', () => ({
  executeCollectiveCampaignInference: (...args: unknown[]) =>
    mockExecuteCollectiveCampaignInference(...args),
}));

import {
  analyzeCollectiveCampaign,
  buildMinimalCollectivePayload,
} from '../../src/services/campaigns/collectiveCampaignAnalysisService';
import {
  MAX_REPORTS_PER_COLLECTIVE_ANALYSIS,
  parseAndValidateCollectiveAnalysisResponse,
  type CollectiveCampaignAnalysisInput,
} from '../../src/services/campaigns/collectiveAnalysisSchema';

function makeValidInput(): CollectiveCampaignAnalysisInput {
  return {
    campaignId: 'camp-a1b2c3d4',
    primaryCategory: 'phishing',
    deterministicStatus: 'CANDIDATE',
    supportingIndicators: [
      {
        type: 'shared_domain',
        value: 'verify-bank-kyc.xyz',
        weight: 0.4,
        explanation: 'Both reports reference verify-bank-kyc.xyz.',
      },
    ],
    deterministicLinks: [
      {
        reportAId: 'rep-1',
        reportBId: 'rep-2',
        score: 0.65,
        explanation: 'Matched on shared_domain:verify-bank-kyc.xyz',
      },
    ],
    approvedSignatures: [
      {
        reportId: 'rep-1',
        isApproved: true,
        scamCategory: 'phishing',
        claimedOrganizationType: 'bank_financial',
        requestedAction: 'click_external_link',
        paymentMechanism: 'none_detected',
        urgencyPatterns: ['account_suspension_threat'],
        impersonationIndicators: ['generic_greeting', 'domain_lookalike_or_mismatch'],
        suspiciousDomains: ['verify-bank-kyc.xyz'],
        recurringPhrases: ['verify your account'],
      },
      {
        reportId: 'rep-2',
        isApproved: true,
        scamCategory: 'phishing',
        claimedOrganizationType: 'bank_financial',
        requestedAction: 'click_external_link',
        paymentMechanism: 'none_detected',
        urgencyPatterns: ['countdown_deadline'],
        impersonationIndicators: ['domain_lookalike_or_mismatch'],
        suspiciousDomains: ['verify-bank-kyc.xyz'],
        recurringPhrases: ['within 24 hours'],
      },
    ],
  };
}

describe('Collective Campaign Analysis (ONLY_IN_CLOUD)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects unapproved signatures and PII before calling Firebase AI Logic', async () => {
    const unapproved = makeValidInput();
    // @ts-expect-error testing runtime enforcement of isApproved: true
    unapproved.approvedSignatures[0].isApproved = false;

    await expect(analyzeCollectiveCampaign(unapproved)).rejects.toThrow();
    expect(mockExecuteCollectiveCampaignInference).not.toHaveBeenCalled();

    const piiInput = makeValidInput();
    piiInput.approvedSignatures[0].recurringPhrases = ['call 9876543210 immediately'];
    await expect(analyzeCollectiveCampaign(piiInput)).rejects.toThrow(/PII/);
    expect(mockExecuteCollectiveCampaignInference).not.toHaveBeenCalled();
  });

  it('enforces cost-conscious report count and prompt size limits', async () => {
    const tooMany = makeValidInput();
    const baseSig = tooMany.approvedSignatures[0];
    tooMany.approvedSignatures = Array.from(
      { length: MAX_REPORTS_PER_COLLECTIVE_ANALYSIS + 1 },
      (_, idx) => ({ ...baseSig, reportId: `rep-${idx + 1}` })
    );

    await expect(analyzeCollectiveCampaign(tooMany)).rejects.toThrow(/capped at/i);
    expect(mockExecuteCollectiveCampaignInference).not.toHaveBeenCalled();

    const valid = makeValidInput();
    const compact = buildMinimalCollectivePayload(valid);
    expect(compact.length).toBeLessThan(6000);
  });

  it('rejects model output referencing unsupported report IDs', () => {
    const raw = JSON.stringify({
      sharedIndicatorsSummary: 'Both reports share verify-bank-kyc.xyz.',
      relationshipExplanation: 'Reports appear related through the shared phishing domain.',
      inconsistencies: ['Different urgency wording across reports.'],
      evidenceToReview: ['Check WHOIS registration for verify-bank-kyc.xyz.'],
      referencedReportIds: ['rep-1', 'rep-invented-999'],
    });

    expect(() => parseAndValidateCollectiveAnalysisResponse(raw, ['rep-1', 'rep-2'])).toThrow(
      /unsupported report ID/i
    );
  });

  it('separates deterministic results from ONLY_IN_CLOUD AI explanation', async () => {
    mockExecuteCollectiveCampaignInference.mockResolvedValueOnce({
      sharedIndicatorsSummary: 'Both approved reports reference verify-bank-kyc.xyz.',
      relationshipExplanation:
        'The reports may be related because both impersonate a bank and direct users to verify-bank-kyc.xyz.',
      inconsistencies: ['One uses countdown urgency while the other threatens suspension.'],
      evidenceToReview: ['Inspect DNS history and hosting provider for verify-bank-kyc.xyz.'],
      referencedReportIds: ['rep-1', 'rep-2'],
      source: 'in_cloud',
      modelIdentifier: 'gemini-2.5-flash (Cloud)',
    });

    const record = await analyzeCollectiveCampaign(makeValidInput());

    expect(mockExecuteCollectiveCampaignInference).toHaveBeenCalledWith(
      expect.objectContaining({
        allowedReportIds: ['rep-1', 'rep-2'],
      })
    );
    expect(record.deterministic.verificationStatus).toBe('unverified');
    expect(record.deterministic.supportingIndicators).toHaveLength(1);
    expect(record.aiExplanation.inferenceSource).toBe('in_cloud');
    expect(record.aiExplanation.referencedReportIds).toEqual(['rep-1', 'rep-2']);
    expect(record.aiExplanation.inconsistencies).toHaveLength(1);
    expect(record.aiExplanation.evidenceToReview).toHaveLength(1);
  });
});

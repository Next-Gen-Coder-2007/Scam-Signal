import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockExecuteScamDnaInference = vi.fn();
let mockIsConfigured = true;

vi.mock('../../src/services/firebase/firebaseApp', () => ({
  get firebaseStatus() {
    return { isConfigured: mockIsConfigured, missingKeys: [], appCheckEnabled: false };
  },
  ai: {},
  db: {},
  auth: {},
}));

vi.mock('../../src/services/ai/firebaseAILogic', () => ({
  executeScamDnaInference: (...args: unknown[]) => mockExecuteScamDnaInference(...args),
}));

import {
  extractScamDna,
  extractScamDnaFromPendingReport,
  compareScamDna,
} from '../../src/services/dna/scamDnaService';
import { ScamDnaSignatureSchema } from '../../src/services/dna/scamDnaSchema';

describe('Scam DNA Service (Hybrid Extraction, Validation & Comparison)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsConfigured = true;
  });

  it('produces identical normalized DNA hashes for slightly different messages from the same campaign', async () => {
    const msgA =
      'Dear Customer! Your bank account will be suspended within 24 hours. Click the link below to verify your account at https://www.verify-alert-bank.xyz/auth';
    const msgB =
      'DEAR CUSTOMER, your bank account is suspended within 24 hrs!! Verify your account — click this link: http://verify-alert-bank.xyz:8443/step2';

    const dnaA = await extractScamDna({ sanitizedText: msgA, channel: 'sms' }, { useAi: false });
    const dnaB = await extractScamDna({ sanitizedText: msgB, channel: 'sms' }, { useAi: false });

    expect(ScamDnaSignatureSchema.safeParse(dnaA).success).toBe(true);
    expect(dnaA.normalized.dnaHash).toBe(dnaB.normalized.dnaHash);
    expect(dnaA.normalized.canonicalSignature).toBe(dnaB.normalized.canonicalSignature);

    const comparison = compareScamDna(dnaA, dnaB);
    expect(comparison.exactHashMatch).toBe(true);
    expect(comparison.similarityScore).toBe(1);
    expect(comparison.sharedDomains).toEqual(['verify-alert-bank.xyz']);
  });

  it('keeps observed indicators strictly separate from Firebase AI Logic inferences', async () => {
    mockExecuteScamDnaInference.mockResolvedValueOnce({
      scamCategory: 'delivery_scam',
      claimedOrganizationType: 'postal_delivery',
      requestedAction: 'send_money_or_fee',
      paymentMechanism: 'credit_debit_card',
      urgencyPatterns: ['missed_delivery_hold', 'immediate_action_required'],
      impersonationIndicators: ['official_brand_claim', 'authority_title'],
      rationale: 'Interpreted as a parcel customs fee lure based on delivery hold wording.',
      source: 'in_cloud',
    });

    const dna = await extractScamDna({
      sanitizedText: 'Your parcel is on hold. Pay customs fee at [REDACTED_URL] immediately.',
      channel: 'sms',
    });

    expect(mockExecuteScamDnaInference).toHaveBeenCalledTimes(1);
    expect(dna.inferred.isAiAssisted).toBe(true);
    expect(dna.inferred.inferenceSource).toBe('in_cloud');
    expect(dna.inferred.scamCategory).toBe('delivery_scam');

    // Observed domains remain empty — AI never invents domains into observed
    expect(dna.observed.suspiciousDomains).toEqual([]);
    // Urgency already observed ('missed_delivery_hold', 'immediate_action_required') is not duplicated in additionalUrgencyPatterns
    expect(dna.inferred.additionalUrgencyPatterns).toEqual([]);
    // AI-only impersonation indicators stay in inferred.additionalImpersonationIndicators, not observed
    expect(dna.observed.impersonationIndicators).not.toContain('authority_title');
    expect(dna.inferred.additionalImpersonationIndicators).toContain('authority_title');
  });

  it('falls back gracefully to deterministic DNA if AI fails, unless requireAi is true', async () => {
    mockExecuteScamDnaInference.mockRejectedValueOnce(new Error('Network error'));

    const fallbackDna = await extractScamDna({
      sanitizedText: 'Urgent: update KYC at http://fake-kyc.top/now',
      channel: 'sms',
    });
    expect(fallbackDna.inferred.isAiAssisted).toBe(false);
    expect(fallbackDna.inferred.inferenceSource).toBe('unknown');
    expect(fallbackDna.observed.suspiciousDomains).toEqual(['fake-kyc.top']);

    mockExecuteScamDnaInference.mockRejectedValueOnce(new Error('Network error'));
    await expect(
      extractScamDna(
        { sanitizedText: 'Urgent: update KYC at http://fake-kyc.top/now' },
        { requireAi: true }
      )
    ).rejects.toThrow('Network error');
  });

  it('converts a PendingReportDocument into a validated ScamDnaSignature', async () => {
    const dna = await extractScamDnaFromPendingReport(
      {
        redactedSummary:
          'Caller claimed to be from Tax Department threatening arrest unless gift card sent.',
        category: 'impersonation',
        evidence: ['Threatened arrest', 'Demanded gift card'],
        channel: 'call',
      },
      { useAi: false }
    );

    expect(dna.normalized.scamCategory).toBe('impersonation');
    expect(dna.observed.claimedOrganizationTypes).toContain('government_tax');
    expect(dna.observed.paymentMechanisms).toContain('gift_card');
    expect(dna.observed.urgencyPatterns).toContain('legal_or_arrest_threat');
    expect(dna.observed.evidenceSnippets).toContain('Threatened arrest');
  });
});

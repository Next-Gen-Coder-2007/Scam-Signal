import { describe, it, expect, vi, beforeEach } from 'vitest';
import { submitPublicThreat } from '../../src/services/firestore/threatService';
import { inspectAndRedactPII } from '../../src/utils/redactor';

const mockAddDoc = vi.fn();

vi.mock('../../src/services/firebase/firebaseApp', () => ({
  db: { mockDb: true },
  firebaseStatus: {
    isConfigured: true,
    missingKeys: [],
    error: null,
    appCheckStatus: 'unconfigured',
    appCheckError: null,
  },
}));

vi.mock('firebase/firestore', async (importOriginal) => {
  const actual = await importOriginal<typeof import('firebase/firestore')>();
  return {
    ...actual,
    collection: vi.fn(() => ({
      withConverter: vi.fn(() => 'mock-converted-collection'),
    })),
    addDoc: (...args: unknown[]) => mockAddDoc(...args),
  };
});

describe('Community Reporting Pre-Publish PII Guards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAddDoc.mockResolvedValue({ id: 'doc-new-1' });
  });

  it('scrubs addresses, names, UPI, phone, and OTP before writing to Firestore', async () => {
    const raw =
      'Dear Priya Sharma, send $50 to fraud@okaxis or call +91 9820112233 from 42 Elm Street. OTP is 492011.';

    const saved = await submitPublicThreat({
      reporterUid: 'uid-user-123',
      rawContent: raw,
      threatLevel: 'CRITICAL',
      threatCategories: ['payment_fraud'],
      tacticalIndicators: ['Channel: SMS'],
      inferenceSource: 'on_device',
      channel: 'sms',
    });

    expect(saved.id).toBe('doc-new-1');
    expect(saved.upvotes).toBe(0);
    expect(saved.campaignId).toBeNull();
    expect(saved.redactedSummary).not.toContain('Priya Sharma');
    expect(saved.redactedSummary).not.toContain('fraud@okaxis');
    expect(saved.redactedSummary).not.toContain('9820112233');
    expect(saved.redactedSummary).not.toContain('42 Elm Street');
    expect(saved.redactedSummary).not.toContain('492011');
    expect(mockAddDoc).toHaveBeenCalledTimes(1);
  });

  it('rejects unauthenticated submissions even when Firebase is configured', async () => {
    await expect(
      submitPublicThreat({
        reporterUid: '',
        rawContent: 'Suspicious SMS link http://scam.top',
        threatLevel: 'HIGH',
        threatCategories: ['phishing'],
        tacticalIndicators: [],
        inferenceSource: 'on_device',
        channel: 'sms',
      })
    ).rejects.toThrow(/Authentication is required/);
    expect(mockAddDoc).not.toHaveBeenCalled();
  });

  it('handles already-redacted text idempotently without re-flagging placeholders', () => {
    const alreadyScrubbed =
      'Dear [REDACTED_NAME], pay [REDACTED_UPI] from [REDACTED_ADDRESS] or call [REDACTED_PHONE].';
    const inspection = inspectAndRedactPII(alreadyScrubbed);
    expect(inspection.hasRemainingPII).toBe(false);
    expect(inspection.redactedText).toBe(alreadyScrubbed);
  });
});

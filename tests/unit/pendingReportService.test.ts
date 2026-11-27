import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  submitPendingReport,
  DuplicateReportError,
  buildReportDedupeId,
} from '../../src/services/firestore/threatService';

const mockGetDoc = vi.fn();
const mockSetDoc = vi.fn();

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
    doc: vi.fn((_db, _col, id: string) => ({
      id,
      withConverter: vi.fn(() => ({ id })),
    })),
    getDoc: (...args: unknown[]) => mockGetDoc(...args),
    setDoc: (...args: unknown[]) => mockSetDoc(...args),
  };
});

describe('Pending Report Service & Deduplication', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetDoc.mockResolvedValue({ exists: () => false });
    mockSetDoc.mockResolvedValue(undefined);
  });

  it('submits sanitized pending report with server timestamp and pending verificationStatus', async () => {
    const saved = await submitPendingReport({
      reporterUid: 'user-uid-001',
      rawContent: 'Dear Alex, pay $50 to fraud@okaxis for delivery at 12 Oak Road.',
      category: 'delivery_scam',
      indicators: ['upfront_payment'],
      evidence: ['"pay $50 to fraud@okaxis"'],
      riskAssessment: 'HIGH',
      observedDate: '2026-11-27',
      visibility: 'community_public',
      inferenceSource: 'on_device',
      channel: 'sms',
    });

    expect(saved.verificationStatus).toBe('pending');
    expect(saved.campaignId).toBeNull();
    expect(saved.observedDate).toBe('2026-11-27');
    expect(saved.visibility).toBe('community_public');
    expect(saved.redactedSummary).not.toContain('fraud@okaxis');
    expect(saved.redactedSummary).not.toContain('12 Oak Road');
    expect(saved.evidence[0]).not.toContain('fraud@okaxis');
    expect(mockSetDoc).toHaveBeenCalledTimes(1);
  });

  it('prevents duplicate submissions for the same user, pattern, and date', async () => {
    mockGetDoc.mockResolvedValueOnce({ exists: () => true });

    await expect(
      submitPendingReport({
        reporterUid: 'user-uid-001',
        rawContent: 'Urgent bank alert! Click http://fake.top',
        category: 'phishing',
        indicators: ['urgency'],
        evidence: ['"Urgent bank alert"'],
        riskAssessment: 'CRITICAL',
        observedDate: '2026-11-27',
        visibility: 'analysts_only',
        inferenceSource: 'in_cloud',
        channel: 'sms',
      })
    ).rejects.toThrow(DuplicateReportError);

    expect(mockSetDoc).not.toHaveBeenCalled();
  });

  it('rejects invalid observedDate formats before hitting Firestore', async () => {
    await expect(
      submitPendingReport({
        reporterUid: 'user-uid-001',
        rawContent: 'Urgent bank alert!',
        category: 'phishing',
        indicators: [],
        evidence: [],
        riskAssessment: 'SUSPICIOUS',
        observedDate: '11-27-2026',
        visibility: 'community_public',
        inferenceSource: 'on_device',
        channel: 'sms',
      })
    ).rejects.toThrow(/YYYY-MM-DD/);

    expect(mockGetDoc).not.toHaveBeenCalled();
  });

  it('builds deterministic deduplication IDs scoped by reporterUid and date', () => {
    const id1 = buildReportDedupeId('uid-123', 'abcdef1234567890abcd', '2026-11-27');
    const id2 = buildReportDedupeId('uid-123', 'abcdef1234567890abcd', '2026-11-27');
    const idDiffDate = buildReportDedupeId('uid-123', 'abcdef1234567890abcd', '2026-11-28');
    expect(id1).toBe(id2);
    expect(id1).not.toBe(idDiffDate);
  });
});

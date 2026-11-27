import { describe, it, expect } from 'vitest';
import {
  publicThreatConverter,
  pendingReportConverter,
  PublicThreatDocument,
  PendingReportDocument,
} from '../../src/services/firestore/threatConverter';
import { Timestamp } from 'firebase/firestore';

describe('Firestore Threat & PendingReport Converters', () => {
  it('converts valid PublicThreatDocument to Firestore payload safely', () => {
    const doc: PublicThreatDocument = {
      reporterUid: 'usr-1234',
      threatLevel: 'CRITICAL',
      threatCategories: ['IMPERSONATION', 'URGENCY'],
      redactedSummary: 'Urgent [REDACTED_BANK] alert. Click [REDACTED_LINK]',
      normalizedPatternHash: 'a1b2c3d4e5f6',
      tacticalIndicators: ['Domain typo', 'Urgent countdown'],
      inferenceSource: 'on_device',
      channel: 'sms',
      upvotes: 0,
      campaignId: null,
      createdAt: Timestamp.now(),
    };

    const payload = publicThreatConverter.toFirestore(doc);
    expect(payload.reporterUid).toBe('usr-1234');
    expect(payload.threatLevel).toBe('CRITICAL');
    expect(payload.upvotes).toBe(0);
    expect(payload.campaignId).toBeNull();
    expect(payload.redactedSummary).toBe('Urgent [REDACTED_BANK] alert. Click [REDACTED_LINK]');
  });

  it('rejects empty redactedSummary with explicit error', () => {
    const invalidDoc: PublicThreatDocument = {
      reporterUid: 'usr-1234',
      threatLevel: 'SUSPICIOUS',
      threatCategories: [],
      redactedSummary: '   ',
      normalizedPatternHash: '',
      tacticalIndicators: [],
      inferenceSource: 'on_device',
      channel: 'sms',
      upvotes: 0,
      campaignId: null,
      createdAt: Timestamp.now(),
    };

    expect(() => publicThreatConverter.toFirestore(invalidDoc)).toThrow(
      /must contain non-empty redactedSummary/
    );
  });

  it('rejects oversized redactedSummary exceeding 2000 characters', () => {
    const oversizedDoc: PublicThreatDocument = {
      reporterUid: 'usr-1234',
      threatLevel: 'SUSPICIOUS',
      threatCategories: [],
      redactedSummary: 'A'.repeat(2001),
      normalizedPatternHash: '',
      tacticalIndicators: [],
      inferenceSource: 'on_device',
      channel: 'sms',
      upvotes: 0,
      campaignId: null,
      createdAt: Timestamp.now(),
    };

    expect(() => publicThreatConverter.toFirestore(oversizedDoc)).toThrow(
      /exceeds maximum length/
    );
  });

  it('validates PendingReportDocument and forces pending verificationStatus and null campaignId', () => {
    const report: PendingReportDocument = {
      reporterUid: 'uid-abc',
      redactedSummary: 'Send $50 to [REDACTED_UPI]',
      category: 'job_scam',
      indicators: ['upfront_payment'],
      evidence: ['"send $50"'],
      riskAssessment: 'HIGH',
      observedDate: '2026-11-27',
      visibility: 'community_public',
      channel: 'whatsapp',
      inferenceSource: 'on_device',
      normalizedPatternHash: 'hash123456',
      // Even if a caller attempts to pass 'verified', converter forces 'pending'
      verificationStatus: 'verified',
      campaignId: 'camp-forged',
      createdAt: Timestamp.now(),
    };

    const payload = pendingReportConverter.toFirestore(report);
    expect(payload.verificationStatus).toBe('pending');
    expect(payload.campaignId).toBeNull();
    expect(payload.observedDate).toBe('2026-11-27');
    expect(payload.visibility).toBe('community_public');
  });

  it('rejects invalid observedDate format in PendingReportDocument', () => {
    const badDate: PendingReportDocument = {
      reporterUid: 'uid-abc',
      redactedSummary: 'Suspicious message',
      category: 'phishing',
      indicators: [],
      evidence: [],
      riskAssessment: 'SUSPICIOUS',
      observedDate: '27/11/2026',
      visibility: 'analysts_only',
      channel: 'sms',
      inferenceSource: 'on_device',
      normalizedPatternHash: 'hash123',
      verificationStatus: 'pending',
      campaignId: null,
      createdAt: Timestamp.now(),
    };

    expect(() => pendingReportConverter.toFirestore(badDate)).toThrow(/YYYY-MM-DD/);
  });
});

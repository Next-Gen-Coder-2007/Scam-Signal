import { describe, it, expect } from 'vitest';
import { publicThreatConverter, PublicThreatDocument } from '../../src/services/firestore/threatConverter';
import { Timestamp } from 'firebase/firestore';

describe('Firestore Threat Converter', () => {
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
});

import { describe, it, expect } from 'vitest';
import { clusterThreatReports } from '../../src/services/campaigns/clusteringService';
import { PublicThreatDocument } from '../../src/services/firestore/threatConverter';
import { Timestamp } from 'firebase/firestore';

describe('Deterministic Campaign Clustering', () => {
  it('groups threats with matching pattern hashes into the same campaign cluster', () => {
    const report1: PublicThreatDocument = {
      reporterUid: 'user-1',
      threatLevel: 'CRITICAL',
      threatCategories: ['BANK_IMPERSONATION'],
      redactedSummary: 'Axis bank debit card blocked alert',
      normalizedPatternHash: 'hash-axis-wave-99',
      tacticalIndicators: ['Domain: axis-verify.xyz'],
      inferenceSource: 'on_device',
      channel: 'sms',
      upvotes: 2,
      campaignId: null,
      createdAt: Timestamp.now(),
    };

    const report2: PublicThreatDocument = {
      reporterUid: 'user-2',
      threatLevel: 'CRITICAL',
      threatCategories: ['BANK_IMPERSONATION'],
      redactedSummary: 'Axis bank debit card blocked alert variation',
      normalizedPatternHash: 'hash-axis-wave-99',
      tacticalIndicators: ['Domain: axis-verify.xyz', 'Phone: +91-98xxxx'],
      inferenceSource: 'in_cloud',
      channel: 'sms',
      upvotes: 5,
      campaignId: null,
      createdAt: Timestamp.now(),
    };

    const clusters = clusterThreatReports([report1, report2]);
    expect(clusters.length).toBe(1);
    expect(clusters[0].totalSignals).toBe(2);
    expect(clusters[0].primaryHash).toBe('hash-axis-wave-99');
    expect(clusters[0].indicators).toContain('Domain: axis-verify.xyz');
    expect(clusters[0].indicators).toContain('Phone: +91-98xxxx');
  });

  it('keeps distinct pattern hashes in separate clusters without hallucinations', () => {
    const reportA: PublicThreatDocument = {
      reporterUid: 'user-1',
      threatLevel: 'CRITICAL',
      threatCategories: ['BANK_IMPERSONATION'],
      redactedSummary: 'Bank SMS phish',
      normalizedPatternHash: 'hash-bank-a',
      tacticalIndicators: ['Domain: bank.xyz'],
      inferenceSource: 'on_device',
      channel: 'sms',
      upvotes: 0,
      campaignId: null,
      createdAt: Timestamp.now(),
    };

    const reportB: PublicThreatDocument = {
      reporterUid: 'user-2',
      threatLevel: 'HIGH',
      threatCategories: ['JOB_FRAUD'],
      redactedSummary: 'Telegram video task scam',
      normalizedPatternHash: 'hash-telegram-job-b',
      tacticalIndicators: ['Deposit $50'],
      inferenceSource: 'on_device',
      channel: 'whatsapp',
      upvotes: 1,
      campaignId: null,
      createdAt: Timestamp.now(),
    };

    const clusters = clusterThreatReports([reportA, reportB]);
    expect(clusters.length).toBe(2);
    expect(clusters.map((c) => c.primaryHash)).toEqual(['hash-bank-a', 'hash-telegram-job-b']);
  });

  it('ignores unhashed or empty reports safely', () => {
    const invalidReport: PublicThreatDocument = {
      reporterUid: 'user-1',
      threatLevel: 'UNKNOWN',
      threatCategories: [],
      redactedSummary: 'test',
      normalizedPatternHash: '',
      tacticalIndicators: [],
      inferenceSource: 'on_device',
      channel: 'sms',
      upvotes: 0,
      campaignId: null,
      createdAt: Timestamp.now(),
    };

    const clusters = clusterThreatReports([invalidReport]);
    expect(clusters.length).toBe(0);
  });
});

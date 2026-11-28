import { describe, it, expect } from 'vitest';
import {
  buildScamRadarSnapshot,
  getSampleScamRadarSnapshot,
  type RadarReportInput,
} from '../../src/services/firestore/scamRadarService';
import type { CampaignIntelligenceSummary } from '../../src/services/firestore/campaignIntelligenceService';

const NOW_MS = Date.parse('2026-11-28T12:00:00.000Z');

function makeReport(overrides: Partial<RadarReportInput> = {}): RadarReportInput {
  return {
    id: 'rep-1',
    reporterUid: 'u1',
    redactedSummary: 'Phishing bank SMS [REDACTED_URL]',
    category: 'phishing',
    indicators: ['urgency', 'impersonation'],
    evidence: ['Quoted urgency'],
    riskAssessment: 'HIGH',
    observedDate: '2026-11-27',
    visibility: 'community_public',
    channel: 'sms',
    inferenceSource: 'on_device',
    normalizedPatternHash: 'hash1',
    verificationStatus: 'verified',
    campaignId: null,
    createdAt: '2026-11-27T10:00:00.000Z' as unknown as import('firebase/firestore').FieldValue,
    ...overrides,
  };
}

const sampleCampaign: CampaignIntelligenceSummary = {
  id: 'camp-1',
  name: 'Bank Phishing Cluster',
  category: 'phishing',
  associatedReportCount: 2,
  firstObservedAt: '2026-11-25T00:00:00.000Z',
  latestActivityAt: '2026-11-27T10:00:00.000Z',
  sharedIndicators: ['shared_domain:bad.xyz'],
  verificationStage: 'verified',
  rawStatus: 'CONTAINED',
};

describe('scamRadarService', () => {
  it('filters by category, date window, and verification status', () => {
    const reports: RadarReportInput[] = [
      makeReport({ id: 'r1', category: 'phishing', verificationStatus: 'verified' }),
      makeReport({
        id: 'r2',
        category: 'job_scam',
        verificationStatus: 'pending',
        indicators: ['upfront_payment'],
      }),
      makeReport({
        id: 'r3-old',
        category: 'phishing',
        verificationStatus: 'verified',
        observedDate: '2026-09-01',
        createdAt: '2026-09-01T10:00:00.000Z' as unknown as import('firebase/firestore').FieldValue,
      }),
    ];

    const snap = buildScamRadarSnapshot(
      reports,
      [sampleCampaign],
      { category: 'phishing', dateWindow: '7d', verificationStatus: 'verified' },
      { nowMs: NOW_MS }
    );

    expect(snap.isSampleData).toBe(false);
    expect(snap.totalMatchingReports).toBe(1);
    expect(snap.categorySummaries).toEqual([
      {
        category: 'phishing',
        label: 'Phishing',
        reportCount: 1,
        verifiedCount: 1,
        highestRisk: 'HIGH',
      },
    ]);
    expect(snap.recentCampaigns).toHaveLength(1);
    expect(snap.commonManipulationPatterns.map((p) => p.pattern)).toEqual([
      'urgency',
      'impersonation',
    ]);
  });

  it('hides geographical trends when insufficient safe coarse-grained location data exists', () => {
    const insufficient = buildScamRadarSnapshot(
      [makeReport({ coarseRegion: 'IN-MH' }), makeReport({ id: 'r2', coarseRegion: 'IN-DL' })],
      [],
      { category: 'ALL', dateWindow: '30d', verificationStatus: 'ALL' },
      { nowMs: NOW_MS }
    );
    expect(insufficient.geographicalTrends).toBeNull();
    expect(insufficient.geoUnavailableReason).toContain('do not contain sufficient');

    const sufficient = buildScamRadarSnapshot(
      [
        makeReport({ id: 'r1', coarseRegion: 'IN-MH' }),
        makeReport({ id: 'r2', coarseRegion: 'IN-MH' }),
        makeReport({ id: 'r3', coarseRegion: 'US-CA' }),
      ],
      [],
      { category: 'ALL', dateWindow: '30d', verificationStatus: 'ALL' },
      { nowMs: NOW_MS }
    );
    expect(sufficient.geographicalTrends).toEqual([
      { region: 'IN-MH', count: 2 },
      { region: 'US-CA', count: 1 },
    ]);
    expect(sufficient.geoUnavailableReason).toBeNull();
  });

  it('clearly labels sample demonstration data and keeps it separate from live data', () => {
    const sample = getSampleScamRadarSnapshot(
      { category: 'ALL', dateWindow: '30d', verificationStatus: 'ALL' },
      NOW_MS
    );

    expect(sample.isSampleData).toBe(true);
    expect(sample.recentWarnings.length).toBeGreaterThan(0);
    expect(sample.recentWarnings.every((w) => w.redactedSummary.includes('[SAMPLE]'))).toBe(true);
    expect(sample.recentCampaigns.every((c) => c.name.includes('[SAMPLE]'))).toBe(true);
  });
});

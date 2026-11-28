import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect } from 'vitest';
import {
  buildDashboardSnapshot,
  isWithinTimeWindow,
  type RawDashboardInputs,
} from '../../src/services/firestore/dashboardService';
import { CategoryDistributionChart } from '../../src/components/dashboard/CategoryDistributionChart';

const NOW_MS = Date.parse('2026-11-28T12:00:00.000Z');

describe('Dashboard Service & CategoryDistributionChart', () => {
  it('filters timestamps accurately across 7d, 30d, and all windows', () => {
    expect(isWithinTimeWindow('2026-11-26T12:00:00.000Z', '7d', NOW_MS)).toBe(true);
    expect(isWithinTimeWindow('2026-11-10T12:00:00.000Z', '7d', NOW_MS)).toBe(false);
    expect(isWithinTimeWindow('2026-11-10T12:00:00.000Z', '30d', NOW_MS)).toBe(true);
    expect(isWithinTimeWindow('2026-09-01T12:00:00.000Z', '30d', NOW_MS)).toBe(false);
    expect(isWithinTimeWindow('2026-09-01T12:00:00.000Z', 'all', NOW_MS)).toBe(true);
  });

  it('computes real metrics, category distribution, alerts, and activity without inventing numbers', () => {
    const inputs: RawDashboardInputs = {
      reports: [
        {
          id: 'rep-1',
          reporterUid: 'u1',
          redactedSummary: 'Bank KYC phishing link [REDACTED_URL]',
          category: 'phishing',
          indicators: ['urgency'],
          evidence: ['Quoted link'],
          riskAssessment: 'HIGH',
          observedDate: '2026-11-27',
          visibility: 'community_public',
          channel: 'sms',
          inferenceSource: 'on_device',
          normalizedPatternHash: 'abc',
          verificationStatus: 'verified',
          campaignId: null,
          createdAt: '2026-11-27T10:00:00.000Z' as unknown as import('firebase/firestore').FieldValue,
        },
        {
          id: 'rep-2',
          reporterUid: 'u2',
          redactedSummary: 'Fake job fee via UPI [REDACTED_UPI]',
          category: 'job_scam',
          indicators: ['upfront_payment'],
          evidence: ['Fee requested'],
          riskAssessment: 'SUSPICIOUS',
          observedDate: '2026-11-26',
          visibility: 'community_public',
          channel: 'whatsapp',
          inferenceSource: 'in_cloud',
          normalizedPatternHash: 'def',
          verificationStatus: 'pending',
          campaignId: null,
          createdAt: '2026-11-26T08:00:00.000Z' as unknown as import('firebase/firestore').FieldValue,
        },
        {
          id: 'rep-old',
          reporterUid: 'u3',
          redactedSummary: 'Old report outside 7d window',
          category: 'delivery_scam',
          indicators: [],
          evidence: [],
          riskAssessment: 'HIGH',
          observedDate: '2026-10-01',
          visibility: 'community_public',
          channel: 'sms',
          inferenceSource: 'unknown',
          normalizedPatternHash: 'old',
          verificationStatus: 'verified',
          campaignId: null,
          createdAt: '2026-10-01T08:00:00.000Z' as unknown as import('firebase/firestore').FieldValue,
        },
      ],
      campaigns: [
        {
          id: 'camp-1',
          name: 'Phishing Cluster #1',
          category: 'phishing',
          associatedReportCount: 3,
          firstObservedAt: '2026-11-24T00:00:00.000Z',
          latestActivityAt: '2026-11-27T11:00:00.000Z',
          sharedIndicators: ['shared_domain:verify-bank.xyz'],
          verificationStage: 'under_review',
          rawStatus: 'ACTIVE_WAVE',
        },
      ],
      confirmations: [
        {
          id: 'conf-1',
          campaignId: 'camp-1',
          createdAt: '2026-11-27T11:30:00.000Z',
        },
      ],
      disputes: [
        {
          id: 'disp-1',
          campaignId: 'camp-1',
          reason: 'Unrelated sender domain',
          moderationStatus: 'open',
          createdAt: '2026-11-27T11:45:00.000Z',
        },
      ],
    };

    const snap7d = buildDashboardSnapshot(inputs, '7d', NOW_MS);
    expect(snap7d.metrics.publicReportsCount).toBe(2);
    expect(snap7d.metrics.emergingCampaignsCount).toBe(1);
    expect(snap7d.metrics.verifiedItemsCount).toBe(1);
    expect(snap7d.metrics.corroborationActionsCount).toBe(2);
    expect(snap7d.categoryDistribution).toEqual([
      { category: 'phishing', label: 'Phishing', count: 1, percentage: 50 },
      { category: 'job_scam', label: 'Job Scam', count: 1, percentage: 50 },
    ]);
    expect(snap7d.safetyAlerts).toHaveLength(2);
    expect(snap7d.recentActivity).toHaveLength(4);

    const emptySnap = buildDashboardSnapshot(
      { reports: [], campaigns: [], confirmations: [], disputes: [] },
      '30d',
      NOW_MS
    );
    expect(emptySnap.metrics.publicReportsCount).toBe(0);
    expect(emptySnap.safetyAlerts).toEqual([]);
    expect(emptySnap.recentActivity).toEqual([]);
  });

  it('renders CategoryDistributionChart cleanly for populated and empty states', () => {
    const emptyHtml = renderToStaticMarkup(
      React.createElement(CategoryDistributionChart, { items: [] })
    );
    expect(emptyHtml).toContain('No public reports recorded in this time window');

    const populatedHtml = renderToStaticMarkup(
      React.createElement(CategoryDistributionChart, {
        items: [{ category: 'phishing', label: 'Phishing', count: 4, percentage: 100 }],
      })
    );
    expect(populatedHtml).toContain('Phishing');
    expect(populatedHtml).toContain('4 (100%)');
  });
});

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetDocs = vi.fn();
const mockGetDoc = vi.fn();
const mockGetCampaignLinksForCampaign = vi.fn();
const mockGetCollectiveCampaignAnalysis = vi.fn();

vi.mock('firebase/firestore', async (importOriginal) => {
  const actual = await importOriginal<typeof import('firebase/firestore')>();
  return {
    ...actual,
    collection: vi.fn((_db, col) => ({ col, withConverter: () => ({ col }) })),
    doc: vi.fn((_db, col, id) => ({ col, id, withConverter: () => ({ col, id }) })),
    query: vi.fn((...args) => ({ args })),
    orderBy: vi.fn(),
    limit: vi.fn(),
    getDocs: (...args: unknown[]) => mockGetDocs(...args),
    getDoc: (...args: unknown[]) => mockGetDoc(...args),
  };
});

vi.mock('../../src/services/firebase/firebaseApp', () => ({
  db: {},
  firebaseStatus: { isConfigured: true, missingKeys: [], appCheckEnabled: false },
}));

vi.mock('../../src/services/firestore/campaignLinkService', () => ({
  getCampaignLinksForCampaign: (...args: unknown[]) => mockGetCampaignLinksForCampaign(...args),
}));

vi.mock('../../src/services/firestore/campaignAnalysisService', () => ({
  getCollectiveCampaignAnalysis: (...args: unknown[]) =>
    mockGetCollectiveCampaignAnalysis(...args),
}));

import {
  deriveCampaignVerificationStage,
  fetchCampaignIntelligenceList,
  fetchCampaignDetails,
} from '../../src/services/firestore/campaignIntelligenceService';
import { CampaignStatusBadge } from '../../src/components/campaigns/CampaignStatusBadge';
import { CampaignRelationshipGraph } from '../../src/components/campaigns/CampaignRelationshipGraph';
import type { ReportCampaignLinkDocument } from '../../src/services/firestore/threatConverter';

describe('Campaign Intelligence Service & Components', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('clearly distinguishes potential, under_review, and verified campaign stages', () => {
    expect(
      deriveCampaignVerificationStage({ status: 'MONITORING' }, [
        { status: 'candidate', verificationStatus: 'unverified' },
      ])
    ).toBe('potential');

    expect(
      deriveCampaignVerificationStage({ status: 'ACTIVE_WAVE' }, [
        { status: 'candidate', verificationStatus: 'unverified' },
      ])
    ).toBe('under_review');

    expect(
      deriveCampaignVerificationStage({ status: 'CONTAINED' }, [
        { status: 'confirmed', verificationStatus: 'verified' },
      ])
    ).toBe('verified');
  });

  it('fetches real campaign intelligence summaries and details from Firestore', async () => {
    mockGetDocs.mockResolvedValueOnce({
      docs: [
        {
          data: () => ({
            id: 'camp-1111',
            name: 'Phishing Cluster #1111',
            threatType: 'phishing',
            totalSignals: 2,
            status: 'MONITORING',
            indicators: ['shared_domain:verify-bank.xyz'],
            createdAt: '2026-11-25T10:00:00.000Z',
            updatedAt: '2026-11-27T12:00:00.000Z',
          }),
        },
      ],
    });

    const sampleLinks: ReportCampaignLinkDocument[] = [
      {
        id: 'rep-1_camp-1111',
        reportId: 'rep-1',
        campaignId: 'camp-1111',
        correlationScore: 0.65,
        status: 'candidate',
        verificationStatus: 'unverified',
        supportingIndicators: ['shared_domain:verify-bank.xyz'],
        explanation: 'Both reports reference verify-bank.xyz.',
        createdAt: '2026-11-25T10:00:00.000Z' as unknown as import('firebase/firestore').FieldValue,
        updatedAt: '2026-11-27T12:00:00.000Z' as unknown as import('firebase/firestore').FieldValue,
      },
      {
        id: 'rep-2_camp-1111',
        reportId: 'rep-2',
        campaignId: 'camp-1111',
        correlationScore: 0.65,
        status: 'candidate',
        verificationStatus: 'unverified',
        supportingIndicators: ['shared_domain:verify-bank.xyz'],
        explanation: 'Both reports reference verify-bank.xyz.',
        createdAt: '2026-11-27T12:00:00.000Z' as unknown as import('firebase/firestore').FieldValue,
        updatedAt: '2026-11-27T12:00:00.000Z' as unknown as import('firebase/firestore').FieldValue,
      },
    ];

    mockGetCampaignLinksForCampaign.mockResolvedValue(sampleLinks);

    const list = await fetchCampaignIntelligenceList();
    expect(list).toHaveLength(1);
    expect(list[0].verificationStage).toBe('potential');
    expect(list[0].associatedReportCount).toBe(2);
    expect(list[0].firstObservedAt).toBe('2026-11-25T10:00:00.000Z');
    expect(list[0].latestActivityAt).toBe('2026-11-27T12:00:00.000Z');

    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      id: 'camp-1111',
      data: () => ({
        id: 'camp-1111',
        name: 'Phishing Cluster #1111',
        threatType: 'phishing',
        totalSignals: 2,
        corroboratedHashes: [],
        status: 'MONITORING',
        indicators: ['shared_domain:verify-bank.xyz'],
        createdAt: '2026-11-25T10:00:00.000Z',
        updatedAt: '2026-11-27T12:00:00.000Z',
      }),
    });
    mockGetCollectiveCampaignAnalysis.mockResolvedValueOnce(null);

    const details = await fetchCampaignDetails('camp-1111');
    expect(details?.campaign.name).toBe('Phishing Cluster #1111');
    expect(details?.links).toHaveLength(2);
    expect(details?.verificationStage).toBe('potential');
  });

  it('renders CampaignStatusBadge and responsive CampaignRelationshipGraph cleanly', () => {
    expect(
      renderToStaticMarkup(React.createElement(CampaignStatusBadge, { stage: 'potential' }))
    ).toContain('Potential Campaign');
    expect(
      renderToStaticMarkup(React.createElement(CampaignStatusBadge, { stage: 'under_review' }))
    ).toContain('Under Review');
    expect(
      renderToStaticMarkup(React.createElement(CampaignStatusBadge, { stage: 'verified' }))
    ).toContain('Verified Campaign');

    const emptyGraph = renderToStaticMarkup(
      React.createElement(CampaignRelationshipGraph, {
        campaignName: 'Empty Campaign',
        links: [],
        selectedReportId: null,
      })
    );
    expect(emptyGraph).toContain('No report-to-campaign links');

    const populatedGraph = renderToStaticMarkup(
      React.createElement(CampaignRelationshipGraph, {
        campaignName: 'Phishing Cluster',
        links: [
          {
            reportId: 'rep-1',
            campaignId: 'camp-1',
            correlationScore: 0.65,
            status: 'candidate',
            verificationStatus: 'unverified',
            supportingIndicators: ['shared_domain:verify-bank.xyz'],
            explanation: 'Shared domain',
            createdAt: '2026-11-27' as unknown as import('firebase/firestore').FieldValue,
            updatedAt: '2026-11-27' as unknown as import('firebase/firestore').FieldValue,
          },
        ],
        selectedReportId: 'rep-1',
      })
    );
    expect(populatedGraph).toContain('rep-1');
    expect(populatedGraph).toContain('0.65');
  });
});

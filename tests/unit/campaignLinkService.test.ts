import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSetDoc = vi.fn();
const mockGetDocs = vi.fn();
const mockDoc = vi.fn((_db, col, id) => ({
  col,
  id,
  withConverter: (conv: { toFirestore: (d: unknown) => unknown }) => ({
    col,
    id,
    conv,
  }),
}));
const mockCollection = vi.fn((_db, col) => ({
  col,
  withConverter: () => ({ col }),
}));

vi.mock('firebase/firestore', () => ({
  doc: (...args: unknown[]) => mockDoc(...(args as [unknown, string, string])),
  collection: (...args: unknown[]) => mockCollection(...(args as [unknown, string])),
  setDoc: (...args: unknown[]) => mockSetDoc(...args),
  getDocs: (...args: unknown[]) => mockGetDocs(...args),
  query: vi.fn((...args: unknown[]) => ({ args })),
  where: vi.fn((...args: unknown[]) => ({ args })),
  serverTimestamp: () => 'SERVER_TIMESTAMP',
}));

vi.mock('../../src/services/firebase/firebaseApp', () => ({
  db: {},
  firebaseStatus: { isConfigured: true, missingKeys: [], appCheckEnabled: false },
}));

import {
  saveCampaignCorrelationResults,
  getCampaignLinksForReport,
  getCampaignLinksForCampaign,
} from '../../src/services/firestore/campaignLinkService';
import type { CorrelatedCampaignCluster } from '../../src/services/campaigns/correlationRules';

describe('campaignLinkService (Firestore Report-to-Campaign Persistence)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('stores candidate campaigns and unverified report-to-campaign links with timestamps', async () => {
    mockSetDoc.mockResolvedValue(undefined);

    const cluster: CorrelatedCampaignCluster = {
      campaignId: 'camp-1234abcd',
      name: 'Phishing Cluster #1234ABCD',
      primaryCategory: 'phishing',
      status: 'CANDIDATE',
      verificationStatus: 'unverified',
      reportIds: ['rep-1', 'rep-2'],
      totalReports: 2,
      supportingIndicators: [
        {
          type: 'shared_domain',
          value: 'verify-bank.xyz',
          weight: 0.4,
          explanation: 'Both reports reference verify-bank.xyz',
        },
      ],
      links: [
        {
          reportAId: 'rep-1',
          reportBId: 'rep-2',
          matched: true,
          score: 0.6,
          supportingIndicators: [
            {
              type: 'shared_domain',
              value: 'verify-bank.xyz',
              weight: 0.4,
              explanation: 'Both reports reference verify-bank.xyz',
            },
          ],
          explanation: 'Matched on shared_domain:verify-bank.xyz',
        },
      ],
      createdAt: '2026-11-27T00:00:00.000Z',
    };

    const result = await saveCampaignCorrelationResults([cluster]);

    expect(result).toEqual({ campaignsSaved: 1, linksSaved: 2 });
    expect(mockSetDoc).toHaveBeenCalledTimes(3);

    // Campaign document uses MONITORING status (never auto-verified)
    const campaignPayload = mockSetDoc.mock.calls[0][1];
    expect(campaignPayload.status).toBe('MONITORING');

    // Link documents store candidate status, unverified verificationStatus, and timestamps
    const linkPayload = mockSetDoc.mock.calls[1][1];
    expect(linkPayload.status).toBe('candidate');
    expect(linkPayload.verificationStatus).toBe('unverified');
    expect(linkPayload.campaignId).toBe('camp-1234abcd');
    expect(linkPayload.createdAt).toBe('SERVER_TIMESTAMP');
    expect(linkPayload.updatedAt).toBe('SERVER_TIMESTAMP');
  });

  it('queries report-to-campaign links by reportId and campaignId', async () => {
    mockGetDocs.mockResolvedValue({
      docs: [
        {
          data: () => ({
            id: 'rep-1_camp-1234abcd',
            reportId: 'rep-1',
            campaignId: 'camp-1234abcd',
            correlationScore: 0.6,
            status: 'candidate',
            verificationStatus: 'unverified',
            supportingIndicators: ['shared_domain:verify-bank.xyz'],
            explanation: 'Matched on shared_domain:verify-bank.xyz',
          }),
        },
      ],
    });

    const byReport = await getCampaignLinksForReport('rep-1');
    expect(byReport).toHaveLength(1);
    expect(byReport[0].verificationStatus).toBe('unverified');

    const byCampaign = await getCampaignLinksForCampaign('camp-1234abcd');
    expect(byCampaign).toHaveLength(1);
    expect(byCampaign[0].reportId).toBe('rep-1');
  });
});

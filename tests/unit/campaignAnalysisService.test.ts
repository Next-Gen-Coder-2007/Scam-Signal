import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockSetDoc = vi.fn();
const mockGetDoc = vi.fn();
const mockDoc = vi.fn((_db, col, id) => ({
  col,
  id,
  withConverter: () => ({ col, id }),
}));

vi.mock('firebase/firestore', () => ({
  doc: (...args: unknown[]) => mockDoc(...(args as [unknown, string, string])),
  setDoc: (...args: unknown[]) => mockSetDoc(...args),
  getDoc: (...args: unknown[]) => mockGetDoc(...args),
  serverTimestamp: () => 'SERVER_TIMESTAMP',
}));

vi.mock('../../src/services/firebase/firebaseApp', () => ({
  db: {},
  firebaseStatus: { isConfigured: true, missingKeys: [], appCheckEnabled: false },
}));

import {
  saveCollectiveCampaignAnalysis,
  getCollectiveCampaignAnalysis,
} from '../../src/services/firestore/campaignAnalysisService';
import type { CollectiveCampaignAnalysisRecord } from '../../src/services/campaigns/collectiveAnalysisSchema';

describe('campaignAnalysisService (Firestore Storage for Collective AI Explanations)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('saves collective AI explanation, inference source, and report references to Firestore', async () => {
    mockSetDoc.mockResolvedValueOnce(undefined);

    const record: CollectiveCampaignAnalysisRecord = {
      campaignId: 'camp-a1b2c3d4',
      deterministic: {
        status: 'CANDIDATE',
        verificationStatus: 'unverified',
        totalReports: 2,
        supportingIndicators: [
          {
            type: 'shared_domain',
            value: 'verify-bank-kyc.xyz',
            weight: 0.4,
            explanation: 'Both reference verify-bank-kyc.xyz',
          },
        ],
        links: [
          {
            reportAId: 'rep-1',
            reportBId: 'rep-2',
            score: 0.65,
            explanation: 'Matched on shared_domain:verify-bank-kyc.xyz',
          },
        ],
      },
      aiExplanation: {
        sharedIndicatorsSummary: 'Both reports share verify-bank-kyc.xyz.',
        relationshipExplanation: 'Reports appear linked via shared phishing domain.',
        inconsistencies: ['Different urgency wording.'],
        evidenceToReview: ['Review domain registrar details.'],
        referencedReportIds: ['rep-1', 'rep-2'],
        inferenceSource: 'in_cloud',
        modelIdentifier: 'gemini-2.5-flash (Cloud)',
        analyzedAt: '2026-11-27T00:00:00.000Z',
      },
    };

    await saveCollectiveCampaignAnalysis(record);

    expect(mockDoc).toHaveBeenCalledWith(expect.anything(), 'campaign_analyses', 'camp-a1b2c3d4');
    expect(mockSetDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        campaignId: 'camp-a1b2c3d4',
        inferenceSource: 'in_cloud',
        referencedReportIds: ['rep-1', 'rep-2'],
        deterministicSummary: expect.objectContaining({
          verificationStatus: 'unverified',
          totalReports: 2,
        }),
      }),
      { merge: true }
    );
  });

  it('retrieves saved collective campaign analysis or returns null if absent', async () => {
    mockGetDoc.mockResolvedValueOnce({ exists: () => false });
    expect(await getCollectiveCampaignAnalysis('missing-camp')).toBeNull();

    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({
        campaignId: 'camp-a1b2c3d4',
        inferenceSource: 'in_cloud',
        referencedReportIds: ['rep-1', 'rep-2'],
      }),
    });
    const found = await getCollectiveCampaignAnalysis('camp-a1b2c3d4');
    expect(found?.inferenceSource).toBe('in_cloud');
    expect(found?.referencedReportIds).toEqual(['rep-1', 'rep-2']);
  });
});

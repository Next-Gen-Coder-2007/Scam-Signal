import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetDocs = vi.fn();
const mockSetDoc = vi.fn();

vi.mock('firebase/firestore', async (importOriginal) => {
  const actual = await importOriginal<typeof import('firebase/firestore')>();
  return {
    ...actual,
    collection: vi.fn((_db, ...path) => ({
      path: path.join('/'),
      withConverter: () => ({ path: path.join('/') }),
    })),
    doc: vi.fn((_db, ...path) => ({ path: path.join('/') })),
    query: vi.fn((...args) => ({ args })),
    where: vi.fn((...args) => ({ args })),
    orderBy: vi.fn(),
    limit: vi.fn(),
    getDocs: (...args: unknown[]) => mockGetDocs(...args),
    setDoc: (...args: unknown[]) => mockSetDoc(...args),
    serverTimestamp: () => 'SERVER_TIMESTAMP',
  };
});

vi.mock('../../src/services/firebase/firebaseApp', () => ({
  db: {},
  firebaseStatus: { isConfigured: true, missingKeys: [], appCheckEnabled: false },
}));

import {
  buildAlertsFromRecords,
  fetchUserAlerts,
  markAlertRead,
  markAllAlertsRead,
} from '../../src/services/firestore/alertsService';
import type {
  CampaignDocument,
  PendingReportDocument,
} from '../../src/services/firestore/threatConverter';

describe('alertsService (Followed Categories, Noise Filtering & Read State)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns no alerts when followedCategories is empty and filters out analysts_only/low-signal noise', () => {
    const reports: PendingReportDocument[] = [
      {
        id: 'rep-high',
        reporterUid: 'u1',
        redactedSummary: 'Bank KYC phishing link [REDACTED_URL]',
        category: 'phishing',
        indicators: ['urgency'],
        evidence: ['Quoted link'],
        riskAssessment: 'HIGH',
        observedDate: '2026-11-28',
        visibility: 'community_public',
        channel: 'sms',
        inferenceSource: 'on_device',
        normalizedPatternHash: 'h1',
        verificationStatus: 'verified',
        campaignId: null,
        createdAt: '2026-11-28T09:00:00.000Z' as unknown as import('firebase/firestore').FieldValue,
      },
      {
        id: 'rep-private',
        reporterUid: 'u2',
        redactedSummary: 'Analysts only phishing report',
        category: 'phishing',
        indicators: [],
        evidence: [],
        riskAssessment: 'CRITICAL',
        observedDate: '2026-11-28',
        visibility: 'analysts_only',
        channel: 'sms',
        inferenceSource: 'on_device',
        normalizedPatternHash: 'h2',
        verificationStatus: 'pending',
        campaignId: null,
        createdAt: '2026-11-28T09:10:00.000Z' as unknown as import('firebase/firestore').FieldValue,
      },
      {
        id: 'rep-noise',
        reporterUid: 'u3',
        redactedSummary: 'Benign unverified message',
        category: 'phishing',
        indicators: [],
        evidence: [],
        riskAssessment: 'SAFE',
        observedDate: '2026-11-28',
        visibility: 'community_public',
        channel: 'sms',
        inferenceSource: 'on_device',
        normalizedPatternHash: 'h3',
        verificationStatus: 'pending',
        campaignId: null,
        createdAt: '2026-11-28T09:20:00.000Z' as unknown as import('firebase/firestore').FieldValue,
      },
    ];

    const campaigns: CampaignDocument[] = [
      {
        id: 'camp-1',
        name: 'Phishing Active Wave',
        threatType: 'phishing',
        totalSignals: 4,
        corroboratedHashes: [],
        status: 'ACTIVE_WAVE',
        indicators: ['shared_domain:bad.xyz'],
        createdAt: '2026-11-27T00:00:00.000Z' as unknown as import('firebase/firestore').FieldValue,
        updatedAt: '2026-11-28T10:00:00.000Z' as unknown as import('firebase/firestore').FieldValue,
      },
    ];

    expect(
      buildAlertsFromRecords({
        followedCategories: [],
        reports,
        campaigns,
        readAlertIds: new Set(),
      })
    ).toEqual([]);

    const alerts = buildAlertsFromRecords({
      followedCategories: ['phishing'],
      reports,
      campaigns,
      readAlertIds: new Set(['rep_rep-high']),
    });

    expect(alerts).toHaveLength(2);
    expect(alerts[0].id).toBe('camp_camp-1');
    expect(alerts[0].isRead).toBe(false);
    expect(alerts[0].href).toBe('/campaigns/camp-1');
    expect(alerts[1].id).toBe('rep_rep-high');
    expect(alerts[1].isRead).toBe(true);
    expect(alerts[1].href).toBe('/feed');
  });

  it('enforces authentication checks and persists read/unread states in Firestore', async () => {
    await expect(fetchUserAlerts('', ['phishing'])).rejects.toThrow(/Authentication is required/);
    await expect(markAlertRead('', 'camp_1')).rejects.toThrow(/Authentication is required/);

    mockGetDocs
      .mockResolvedValueOnce({ docs: [] })
      .mockResolvedValueOnce({ docs: [] })
      .mockResolvedValueOnce({ docs: [] });

    const emptyAlerts = await fetchUserAlerts('user-1', ['phishing']);
    expect(emptyAlerts).toEqual([]);

    mockSetDoc.mockResolvedValue(undefined);
    await markAllAlertsRead('user-1', ['camp_1', 'rep_2']);
    expect(mockSetDoc).toHaveBeenCalledTimes(2);
  });
});

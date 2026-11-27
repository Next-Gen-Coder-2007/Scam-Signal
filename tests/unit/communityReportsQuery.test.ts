import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchCommunityReportsPage } from '../../src/services/firestore/threatService';
import { where, orderBy, limit, startAfter } from 'firebase/firestore';

const mockGetDocs = vi.fn();

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
    collection: vi.fn(() => ({
      withConverter: vi.fn(() => 'mock-pending-reports-col'),
    })),
    where: vi.fn((...args) => ({ type: 'where', args })),
    orderBy: vi.fn((...args) => ({ type: 'orderBy', args })),
    limit: vi.fn((...args) => ({ type: 'limit', args })),
    startAfter: vi.fn((...args) => ({ type: 'startAfter', args })),
    query: vi.fn((_col, ...constraints) => ({ constraints })),
    getDocs: (...args: unknown[]) => mockGetDocs(...args),
  };
});

function makeDoc(id: string) {
  return {
    id,
    data: () => ({
      id,
      reporterUid: 'uid-1',
      redactedSummary: `Redacted report ${id}`,
      category: 'phishing',
      indicators: ['urgency'],
      evidence: ['"Click now"'],
      riskAssessment: 'HIGH',
      observedDate: '2026-11-27',
      visibility: 'community_public',
      channel: 'sms',
      inferenceSource: 'on_device',
      normalizedPatternHash: 'hash123',
      verificationStatus: 'pending',
      campaignId: null,
    }),
  };
}

describe('Paginated Community Reports Query', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('enforces community_public visibility and excludes rejected reports', async () => {
    mockGetDocs.mockResolvedValueOnce({ docs: [makeDoc('r1'), makeDoc('r2')] });

    const page = await fetchCommunityReportsPage({ pageSize: 10 });

    expect(where).toHaveBeenCalledWith('visibility', '==', 'community_public');
    expect(where).toHaveBeenCalledWith('verificationStatus', 'in', [
      'pending',
      'verified',
    ]);
    expect(orderBy).toHaveBeenCalledWith('createdAt', 'desc');
    expect(limit).toHaveBeenCalledWith(11);
    expect(page.items).toHaveLength(2);
    expect(page.hasMore).toBe(false);
  });

  it('detects hasMore and returns nextCursor when pageSize + 1 docs are returned', async () => {
    mockGetDocs.mockResolvedValueOnce({
      docs: [makeDoc('r1'), makeDoc('r2'), makeDoc('r3')],
    });

    const page = await fetchCommunityReportsPage({ pageSize: 2 });

    expect(limit).toHaveBeenCalledWith(3);
    expect(page.items).toHaveLength(2);
    expect(page.hasMore).toBe(true);
    expect(page.nextCursor?.id).toBe('r2');
  });

  it('applies category, riskLevel, oldest sortOrder, and startAfter cursor', async () => {
    const mockCursor = { id: 'r2' } as unknown as Parameters<
      typeof fetchCommunityReportsPage
    >[0]['cursor'];
    mockGetDocs.mockResolvedValueOnce({ docs: [makeDoc('r3')] });

    await fetchCommunityReportsPage({
      pageSize: 5,
      cursor: mockCursor,
      category: 'job_scam',
      riskLevel: 'CRITICAL',
      sortOrder: 'oldest',
    });

    expect(where).toHaveBeenCalledWith('category', '==', 'job_scam');
    expect(where).toHaveBeenCalledWith('riskAssessment', '==', 'CRITICAL');
    expect(orderBy).toHaveBeenCalledWith('createdAt', 'asc');
    expect(startAfter).toHaveBeenCalledWith(mockCursor);
  });
});

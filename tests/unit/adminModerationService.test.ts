import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetDocs = vi.fn();
const mockCallableFn = vi.fn();
const mockHttpsCallable = vi.fn(() => mockCallableFn);

vi.mock('firebase/firestore', async (importOriginal) => {
  const actual = await importOriginal<typeof import('firebase/firestore')>();
  return {
    ...actual,
    collection: vi.fn((_db, col) => ({ col, withConverter: () => ({ col }) })),
    query: vi.fn((...args) => ({ args })),
    where: vi.fn((...args) => ({ args })),
    orderBy: vi.fn(),
    limit: vi.fn(),
    getDocs: (...args: unknown[]) => mockGetDocs(...args),
  };
});

vi.mock('firebase/functions', () => ({
  httpsCallable: (...args: unknown[]) => mockHttpsCallable(...(args as [unknown, string])),
}));

vi.mock('../../src/services/firebase/firebaseApp', () => ({
  db: {},
  functions: {},
  firebaseStatus: { isConfigured: true, missingKeys: [], appCheckEnabled: false },
}));

import {
  AdminPermissionError,
  callModerateCampaignLink,
  callModerateCampaignStatus,
  callModeratePendingReport,
  fetchModerationAuditLogs,
  fetchPendingReportsForModeration,
} from '../../src/services/firestore/adminModerationService';

describe('adminModerationService (Server-Side Claims & Audit Logs)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('invokes Cloud Functions for report approval, campaign status, and link review', async () => {
    mockCallableFn
      .mockResolvedValueOnce({ data: { reportId: 'rep-1', verificationStatus: 'verified' } })
      .mockResolvedValueOnce({ data: { campaignId: 'camp-1', status: 'CONTAINED' } })
      .mockResolvedValueOnce({
        data: { linkId: 'rep-1_camp-1', status: 'confirmed', verificationStatus: 'verified' },
      });

    const repRes = await callModeratePendingReport({
      reportId: 'rep-1',
      decision: 'verified',
      reason: 'Verified domain IOC',
    });
    expect(repRes.verificationStatus).toBe('verified');
    expect(mockHttpsCallable).toHaveBeenCalledWith(expect.anything(), 'moderatePendingReport');

    const campRes = await callModerateCampaignStatus({
      campaignId: 'camp-1',
      nextStatus: 'CONTAINED',
      reason: 'Takedown confirmed',
    });
    expect(campRes.status).toBe('CONTAINED');

    const linkRes = await callModerateCampaignLink({
      linkId: 'rep-1_camp-1',
      nextStatus: 'confirmed',
      nextVerificationStatus: 'verified',
      reason: 'Confirmed shared phishing domain',
    });
    expect(linkRes.status).toBe('confirmed');
  });

  it('surfaces server-side permission-denied errors as AdminPermissionError', async () => {
    mockCallableFn.mockRejectedValueOnce({
      code: 'functions/permission-denied',
      message: 'Trusted admin custom claim (admin: true) is required.',
    });

    await expect(
      callModeratePendingReport({
        reportId: 'rep-1',
        decision: 'verified',
        reason: 'Attempt without admin claim',
      })
    ).rejects.toThrow(AdminPermissionError);

    mockGetDocs.mockRejectedValueOnce({
      code: 'permission-denied',
      message: 'Missing or insufficient permissions.',
    });
    await expect(fetchModerationAuditLogs()).rejects.toThrow(AdminPermissionError);
  });

  it('loads pending reports and moderation audit log entries from Firestore', async () => {
    mockGetDocs
      .mockResolvedValueOnce({
        docs: [{ data: () => ({ id: 'rep-1', verificationStatus: 'pending' }) }],
      })
      .mockResolvedValueOnce({
        docs: [
          {
            id: 'log-1',
            data: () => ({
              actorUid: 'admin-1',
              actorEmail: 'admin@scamsignal.org',
              action: 'APPROVE_REPORT',
              targetType: 'pending_report',
              targetId: 'rep-1',
              previousStatus: 'pending',
              newStatus: 'verified',
              reason: 'Confirmed phishing link',
              createdAt: '2026-11-28T10:00:00.000Z',
            }),
          },
        ],
      });

    const reports = await fetchPendingReportsForModeration();
    expect(reports).toHaveLength(1);

    const logs = await fetchModerationAuditLogs();
    expect(logs).toHaveLength(1);
    expect(logs[0].action).toBe('APPROVE_REPORT');
    expect(logs[0].newStatus).toBe('verified');
  });
});

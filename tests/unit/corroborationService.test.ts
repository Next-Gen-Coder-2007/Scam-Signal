import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetDoc = vi.fn();
const mockGetDocs = vi.fn();
const mockSetDoc = vi.fn();
const mockUpdateDoc = vi.fn();

vi.mock('firebase/firestore', async (importOriginal) => {
  const actual = await importOriginal<typeof import('firebase/firestore')>();
  return {
    ...actual,
    doc: vi.fn((_db, col, id) => ({ col, id, withConverter: () => ({ col, id }) })),
    collection: vi.fn((_db, col) => ({ col, withConverter: () => ({ col }) })),
    query: vi.fn((...args) => ({ args })),
    where: vi.fn((...args) => ({ args })),
    getDoc: (...args: unknown[]) => mockGetDoc(...args),
    getDocs: (...args: unknown[]) => mockGetDocs(...args),
    setDoc: (...args: unknown[]) => mockSetDoc(...args),
    updateDoc: (...args: unknown[]) => mockUpdateDoc(...args),
    serverTimestamp: () => 'SERVER_TIMESTAMP',
  };
});

vi.mock('../../src/services/firebase/firebaseApp', () => ({
  db: {},
  firebaseStatus: { isConfigured: true, missingKeys: [], appCheckEnabled: false },
}));

import {
  submitCampaignConfirmation,
  submitCampaignDispute,
  getCampaignCorroborationSummary,
  transitionCampaignStatusAdmin,
  moderateCampaignDisputeAdmin,
  DuplicateCorroborationError,
  UnauthorizedModerationError,
  InvalidCampaignTransitionError,
} from '../../src/services/firestore/corroborationService';

describe('Community Corroboration & Admin Moderation Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates separate confirmation and dispute records and prevents duplicate submissions per user', async () => {
    // First confirmation succeeds
    mockGetDoc.mockResolvedValueOnce({ exists: () => false });
    mockSetDoc.mockResolvedValueOnce(undefined);
    const conf = await submitCampaignConfirmation({
      campaignId: 'camp-1',
      userUid: 'user-1',
    });
    expect(conf.id).toBe('camp-1_user-1');
    expect(mockSetDoc).toHaveBeenCalledTimes(1);

    // Second confirmation by same user is rejected
    mockGetDoc.mockResolvedValueOnce({ exists: () => true });
    await expect(
      submitCampaignConfirmation({ campaignId: 'camp-1', userUid: 'user-1' })
    ).rejects.toThrow(DuplicateCorroborationError);

    // First dispute succeeds
    mockGetDoc.mockResolvedValueOnce({ exists: () => false });
    mockSetDoc.mockResolvedValueOnce(undefined);
    const dispute = await submitCampaignDispute({
      campaignId: 'camp-1',
      userUid: 'user-1',
      targetReportId: 'rep-2',
      reason: 'These two messages reference completely unrelated services.',
    });
    expect(dispute.id).toBe('camp-1_user-1');
    expect(dispute.moderationStatus).toBe('open');

    // Second dispute by same user is rejected
    mockGetDoc.mockResolvedValueOnce({ exists: () => true });
    await expect(
      submitCampaignDispute({
        campaignId: 'camp-1',
        userUid: 'user-1',
        reason: 'Trying to submit a duplicate dispute to inflate count.',
      })
    ).rejects.toThrow(DuplicateCorroborationError);
  });

  it('derives corroboration counts strictly from actual stored Firestore records', async () => {
    mockGetDocs
      .mockResolvedValueOnce({
        docs: [
          { data: () => ({ id: 'camp-1_u1', campaignId: 'camp-1', userUid: 'u1' }) },
          { data: () => ({ id: 'camp-1_u2', campaignId: 'camp-1', userUid: 'u2' }) },
        ],
      })
      .mockResolvedValueOnce({
        docs: [
          {
            data: () => ({
              id: 'camp-1_u3',
              campaignId: 'camp-1',
              userUid: 'u3',
              reason: 'Not the same scammer',
              moderationStatus: 'open',
            }),
          },
        ],
      });

    const summary = await getCampaignCorroborationSummary('camp-1', 'u1');
    expect(summary.confirmationCount).toBe(2);
    expect(summary.disputeCount).toBe(1);
    expect(summary.openDisputeCount).toBe(1);
    expect(summary.userHasConfirmed).toBe(true);
    expect(summary.userHasDisputed).toBe(false);
  });

  it('restricts campaign status transitions and dispute moderation to admins and validates state machine', async () => {
    await expect(
      transitionCampaignStatusAdmin({
        campaignId: 'camp-1',
        nextStatus: 'CONTAINED',
        isAdmin: false,
      })
    ).rejects.toThrow(UnauthorizedModerationError);

    await expect(
      moderateCampaignDisputeAdmin({
        disputeId: 'camp-1_u3',
        decision: 'reviewed_upheld',
        isAdmin: false,
      })
    ).rejects.toThrow(UnauthorizedModerationError);

    // Valid admin transition: MONITORING -> ACTIVE_WAVE
    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ status: 'MONITORING' }),
    });
    mockUpdateDoc.mockResolvedValueOnce(undefined);

    const res = await transitionCampaignStatusAdmin({
      campaignId: 'camp-1',
      nextStatus: 'ACTIVE_WAVE',
      isAdmin: true,
    });
    expect(res).toEqual({ previousStatus: 'MONITORING', nextStatus: 'ACTIVE_WAVE' });

    // Invalid transition: MONITORING -> MONITORING
    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ status: 'MONITORING' }),
    });
    await expect(
      transitionCampaignStatusAdmin({
        campaignId: 'camp-1',
        nextStatus: 'MONITORING',
        isAdmin: true,
      })
    ).rejects.toThrow(InvalidCampaignTransitionError);

    // Admin dispute moderation succeeds
    mockUpdateDoc.mockResolvedValueOnce(undefined);
    await expect(
      moderateCampaignDisputeAdmin({
        disputeId: 'camp-1_u3',
        decision: 'reviewed_dismissed',
        isAdmin: true,
      })
    ).resolves.toBeUndefined();
  });
});

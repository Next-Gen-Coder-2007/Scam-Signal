import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockGetDoc = vi.fn();
const mockSetDoc = vi.fn();
const mockDoc = vi.fn((_db, _col, id) => ({ id }));
const mockUpdateAuthDisplayName = vi.fn();

vi.mock('firebase/firestore', () => ({
  doc: (...args: unknown[]) => mockDoc(...(args as [unknown, string, string])),
  getDoc: (...args: unknown[]) => mockGetDoc(...args),
  setDoc: (...args: unknown[]) => mockSetDoc(...args),
  serverTimestamp: () => 'SERVER_TIMESTAMP',
}));

vi.mock('../../src/services/firebase/firebaseApp', () => ({
  db: {},
  firebaseStatus: { isConfigured: true, missingKeys: [], appCheckEnabled: false },
}));

vi.mock('../../src/services/firebase/authService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/services/firebase/authService')>();
  return {
    ...actual,
    updateAuthDisplayName: (...args: unknown[]) => mockUpdateAuthDisplayName(...args),
  };
});

import {
  loadOrCreateUserProfile,
  updateUserProfilePreferences,
  DEFAULT_USER_PREFERENCES,
} from '../../src/services/firestore/userProfileService';
import type { AuthUser } from '../../src/services/firebase/authService';

const sampleUser: AuthUser = {
  uid: 'user-123',
  email: 'analyst@scamsignal.org',
  displayName: 'Lead Analyst',
  isAnonymous: false,
  isAdmin: false,
  providerId: 'password',
  createdAt: '2026-01-01T00:00:00.000Z',
  lastSignInAt: '2026-01-02T00:00:00.000Z',
};

describe('userProfileService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a minimal user profile with default preferences on first login', async () => {
    mockGetDoc.mockResolvedValueOnce({ exists: () => false });
    mockSetDoc.mockResolvedValueOnce(undefined);

    const profile = await loadOrCreateUserProfile(sampleUser);

    expect(profile.uid).toBe('user-123');
    expect(profile.displayName).toBe('Lead Analyst');
    expect(profile.email).toBe('analyst@scamsignal.org');
    expect(profile.providerId).toBe('password');
    expect(profile.preferences).toEqual(DEFAULT_USER_PREFERENCES);
    expect(mockSetDoc).toHaveBeenCalledTimes(1);
  });

  it('loads an existing profile and merges missing preference defaults', async () => {
    mockGetDoc.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({
        displayName: 'Saved Analyst',
        preferences: { defaultInferenceMode: 'only_on_device' },
      }),
    });

    const profile = await loadOrCreateUserProfile(sampleUser);

    expect(profile.displayName).toBe('Saved Analyst');
    expect(profile.preferences).toEqual({
      defaultInferenceMode: 'only_on_device',
      defaultReportVisibility: 'community_public',
    });
    expect(mockSetDoc).not.toHaveBeenCalled();
  });

  it('updates displayName and preferences and syncs Firebase Auth displayName', async () => {
    mockSetDoc.mockResolvedValueOnce(undefined);
    mockUpdateAuthDisplayName.mockResolvedValueOnce(undefined);

    const current = {
      uid: 'user-123',
      displayName: 'Lead Analyst',
      email: 'analyst@scamsignal.org',
      providerId: 'password',
      preferences: { ...DEFAULT_USER_PREFERENCES },
      createdAt: 'SERVER_TIMESTAMP' as unknown as import('firebase/firestore').FieldValue,
      updatedAt: 'SERVER_TIMESTAMP' as unknown as import('firebase/firestore').FieldValue,
    };

    const updated = await updateUserProfilePreferences(
      'user-123',
      {
        displayName: 'Senior Responder',
        preferences: { defaultReportVisibility: 'analysts_only' },
      },
      current
    );

    expect(updated.displayName).toBe('Senior Responder');
    expect(updated.preferences.defaultReportVisibility).toBe('analysts_only');
    expect(updated.preferences.defaultInferenceMode).toBe('prefer_on_device');
    expect(mockSetDoc).toHaveBeenCalledWith(
      { id: 'user-123' },
      expect.objectContaining({
        displayName: 'Senior Responder',
        preferences: {
          defaultInferenceMode: 'prefer_on_device',
          defaultReportVisibility: 'analysts_only',
        },
      }),
      { merge: true }
    );
    expect(mockUpdateAuthDisplayName).toHaveBeenCalledWith('Senior Responder');
  });
});

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockCreateUserWithEmailAndPassword = vi.fn();
const mockSignInWithEmailAndPassword = vi.fn();
const mockSignOut = vi.fn();
const mockUpdateProfile = vi.fn();

vi.mock('firebase/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('firebase/auth')>();
  return {
    ...actual,
    createUserWithEmailAndPassword: (...args: unknown[]) =>
      mockCreateUserWithEmailAndPassword(...args),
    signInWithEmailAndPassword: (...args: unknown[]) =>
      mockSignInWithEmailAndPassword(...args),
    signOut: (...args: unknown[]) => mockSignOut(...args),
    updateProfile: (...args: unknown[]) => mockUpdateProfile(...args),
  };
});

vi.mock('../../src/services/firebase/firebaseApp', () => ({
  auth: { currentUser: null },
  db: {},
  firebaseStatus: { isConfigured: true, missingKeys: [], appCheckEnabled: false },
}));

const mockUseAuth = vi.fn();
vi.mock('../../src/context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

import {
  signUpWithEmail,
  signInWithEmail,
  signOutUser,
} from '../../src/services/firebase/authService';
import { ProtectedRoute } from '../../src/components/auth/ProtectedRoute';

function makeMockFbUser(overrides: Record<string, unknown> = {}) {
  return {
    uid: 'uid-1',
    email: 'user@example.com',
    displayName: 'Test User',
    isAnonymous: false,
    providerData: [{ providerId: 'password' }],
    metadata: {
      creationTime: '2026-01-01T00:00:00.000Z',
      lastSignInTime: '2026-01-02T00:00:00.000Z',
    },
    getIdTokenResult: vi.fn().mockResolvedValue({ claims: {} }),
    ...overrides,
  };
}

describe('Authentication Flows (Registration, Login, Logout, Errors)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('registers a new user with email, password, and display name', async () => {
    const fbUser = makeMockFbUser({ displayName: null });
    mockCreateUserWithEmailAndPassword.mockResolvedValueOnce({ user: fbUser });
    mockUpdateProfile.mockImplementationOnce(async (_u, { displayName }) => {
      fbUser.displayName = displayName;
    });

    const user = await signUpWithEmail('new@example.com', 'secret123', 'Alice Researcher');

    expect(mockCreateUserWithEmailAndPassword).toHaveBeenCalledWith(
      expect.anything(),
      'new@example.com',
      'secret123'
    );
    expect(mockUpdateProfile).toHaveBeenCalledWith(fbUser, { displayName: 'Alice Researcher' });
    expect(user.displayName).toBe('Alice Researcher');
    expect(user.providerId).toBe('password');
  });

  it('logs in an existing user and maps understandable error messages', async () => {
    const fbUser = makeMockFbUser();
    mockSignInWithEmailAndPassword.mockResolvedValueOnce({ user: fbUser });

    const user = await signInWithEmail('user@example.com', 'secret123');
    expect(user.uid).toBe('uid-1');

    mockSignInWithEmailAndPassword.mockRejectedValueOnce({ code: 'auth/invalid-credential' });
    await expect(signInWithEmail('user@example.com', 'wrong')).rejects.toThrow(
      'Invalid email or password.'
    );

    mockSignInWithEmailAndPassword.mockRejectedValueOnce({ code: 'auth/too-many-requests' });
    await expect(signInWithEmail('user@example.com', 'wrong')).rejects.toThrow(
      'Too many failed attempts. Please wait a few minutes before trying again.'
    );
  });

  it('signs out cleanly', async () => {
    mockSignOut.mockResolvedValueOnce(undefined);
    await expect(signOutUser()).resolves.toBeUndefined();
    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });
});

describe('ProtectedRoute Access Control', () => {
  const baseAuthState = {
    user: null,
    profile: null,
    loading: false,
    error: null,
    isConfigured: true,
    signInGoogle: vi.fn(),
    signInEmail: vi.fn(),
    signUpEmail: vi.fn(),
    signInGuest: vi.fn(),
    signOut: vi.fn(),
    updateProfileSettings: vi.fn(),
    clearError: vi.fn(),
  };

  function renderGuard(requireAdmin = false) {
    return renderToStaticMarkup(
      React.createElement(
        MemoryRouter,
        null,
        React.createElement(
          ProtectedRoute,
          { requireAdmin },
          React.createElement('div', null, 'SECRET_PROTECTED_CONTENT')
        )
      )
    );
  }

  it('shows loading state while verifying session', () => {
    mockUseAuth.mockReturnValue({ ...baseAuthState, loading: true });
    const html = renderGuard();
    expect(html).toContain('Verifying authentication session');
    expect(html).not.toContain('SECRET_PROTECTED_CONTENT');
  });

  it('blocks unauthenticated users from protected routes', () => {
    mockUseAuth.mockReturnValue({ ...baseAuthState, user: null });
    const html = renderGuard();
    expect(html).toContain('Authentication Required');
    expect(html).not.toContain('SECRET_PROTECTED_CONTENT');
  });

  it('blocks non-admin users from admin-only routes', () => {
    mockUseAuth.mockReturnValue({
      ...baseAuthState,
      user: {
        uid: 'u1',
        email: 'member@example.com',
        displayName: 'Member',
        isAnonymous: false,
        isAdmin: false,
        providerId: 'password',
        createdAt: null,
        lastSignInAt: null,
      },
    });
    const html = renderGuard(true);
    expect(html).toContain('Analyst Access Required');
    expect(html).not.toContain('SECRET_PROTECTED_CONTENT');
  });

  it('allows authenticated users into standard protected routes and admins into admin routes', () => {
    mockUseAuth.mockReturnValue({
      ...baseAuthState,
      user: {
        uid: 'u2',
        email: 'admin@example.com',
        displayName: 'Admin',
        isAnonymous: false,
        isAdmin: true,
        providerId: 'password',
        createdAt: null,
        lastSignInAt: null,
      },
    });
    expect(renderGuard(false)).toContain('SECRET_PROTECTED_CONTENT');
    expect(renderGuard(true)).toContain('SECRET_PROTECTED_CONTENT');
  });
});

import {
  User,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
  signOut,
  onAuthStateChanged,
  Unsubscribe,
} from 'firebase/auth';
import { auth, firebaseStatus } from './firebaseApp';

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  isAnonymous: boolean;
  isAdmin: boolean;
}

export class FirebaseNotConfiguredError extends Error {
  constructor(operation: string) {
    super(
      `Cannot perform ${operation}: Firebase is not configured. Add missing environment variables (${firebaseStatus.missingKeys.join(', ')}) to .env.`
    );
    this.name = 'FirebaseNotConfiguredError';
  }
}

function requireAuth() {
  if (!auth || !firebaseStatus.isConfigured) {
    throw new FirebaseNotConfiguredError('authentication');
  }
  return auth;
}

function formatAuthError(error: unknown): Error {
  if (error instanceof FirebaseNotConfiguredError) {
    return error;
  }
  if (error && typeof error === 'object' && 'code' in error) {
    const code = String((error as { code: string }).code);
    switch (code) {
      case 'auth/invalid-credential':
      case 'auth/wrong-password':
      case 'auth/user-not-found':
        return new Error('Invalid email or password.');
      case 'auth/email-already-in-use':
        return new Error('An account with this email already exists.');
      case 'auth/weak-password':
        return new Error('Password must be at least 6 characters.');
      case 'auth/popup-closed-by-user':
        return new Error('Sign-in popup was closed before completion.');
      case 'auth/network-request-failed':
        return new Error('Network error while contacting Firebase Authentication.');
      case 'auth/operation-not-allowed':
        return new Error('This sign-in provider is not enabled in Firebase Console.');
      default:
        return new Error(`Authentication failed (${code}).`);
    }
  }
  return error instanceof Error ? error : new Error('Authentication failed unexpectedly.');
}

async function mapFirebaseUser(user: User): Promise<AuthUser> {
  let isAdmin = false;
  try {
    const tokenResult = await user.getIdTokenResult();
    isAdmin = tokenResult.claims.admin === true;
  } catch {
    isAdmin = false;
  }

  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    isAnonymous: user.isAnonymous,
    isAdmin,
  };
}

export async function signInWithGoogle(): Promise<AuthUser> {
  const authInstance = requireAuth();
  try {
    const provider = new GoogleAuthProvider();
    const credential = await signInWithPopup(authInstance, provider);
    return await mapFirebaseUser(credential.user);
  } catch (err) {
    throw formatAuthError(err);
  }
}

export async function signInWithEmail(email: string, password: string): Promise<AuthUser> {
  const authInstance = requireAuth();
  try {
    const credential = await signInWithEmailAndPassword(authInstance, email.trim(), password);
    return await mapFirebaseUser(credential.user);
  } catch (err) {
    throw formatAuthError(err);
  }
}

export async function signUpWithEmail(email: string, password: string): Promise<AuthUser> {
  const authInstance = requireAuth();
  try {
    const credential = await createUserWithEmailAndPassword(authInstance, email.trim(), password);
    return await mapFirebaseUser(credential.user);
  } catch (err) {
    throw formatAuthError(err);
  }
}

export async function signInAnonymouslySafe(): Promise<AuthUser> {
  const authInstance = requireAuth();
  try {
    const credential = await signInAnonymously(authInstance);
    return await mapFirebaseUser(credential.user);
  } catch (err) {
    throw formatAuthError(err);
  }
}

export async function signOutUser(): Promise<void> {
  const authInstance = requireAuth();
  try {
    await signOut(authInstance);
  } catch (err) {
    throw formatAuthError(err);
  }
}

export function subscribeToAuthChanges(
  onUserChange: (user: AuthUser | null) => void
): Unsubscribe {
  if (!auth || !firebaseStatus.isConfigured) {
    onUserChange(null);
    return () => {};
  }

  return onAuthStateChanged(auth, async (fbUser) => {
    if (!fbUser) {
      onUserChange(null);
      return;
    }
    const mapped = await mapFirebaseUser(fbUser);
    onUserChange(mapped);
  });
}

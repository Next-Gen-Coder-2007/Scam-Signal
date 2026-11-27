import {
  User,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
  signOut,
  updateProfile,
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
  providerId: string;
  createdAt: string | null;
  lastSignInAt: string | null;
}

export class FirebaseNotConfiguredError extends Error {
  constructor(operation: string) {
    super(
      `Cannot perform ${operation}: Firebase is not configured. Add missing environment variables (${firebaseStatus.missingKeys.join(', ')}) to .env.`
    );
    this.name = 'FirebaseNotConfiguredError';
  }
}

export function isGoogleAuthConfigured(): boolean {
  return (
    firebaseStatus.isConfigured &&
    import.meta.env.VITE_FIREBASE_ENABLE_GOOGLE_AUTH !== 'false'
  );
}

function requireAuth() {
  if (!auth || !firebaseStatus.isConfigured) {
    throw new FirebaseNotConfiguredError('authentication');
  }
  return auth;
}

export function formatAuthError(error: unknown): Error {
  if (error instanceof FirebaseNotConfiguredError) {
    return error;
  }
  if (error && typeof error === 'object' && 'code' in error) {
    const code = String((error as { code: string }).code);
    switch (code) {
      case 'auth/invalid-credential':
      case 'auth/wrong-password':
      case 'auth/user-not-found':
        return new Error('Invalid email or password. Please check your credentials and try again.');
      case 'auth/invalid-email':
        return new Error('Please enter a valid email address.');
      case 'auth/email-already-in-use':
        return new Error('An account with this email already exists. Try signing in instead.');
      case 'auth/weak-password':
        return new Error('Password is too weak. Please use at least 6 characters.');
      case 'auth/too-many-requests':
        return new Error('Too many failed attempts. Please wait a few minutes before trying again.');
      case 'auth/user-disabled':
        return new Error('This account has been disabled. Contact support for assistance.');
      case 'auth/account-exists-with-different-credential':
        return new Error('An account already exists with this email using a different sign-in method.');
      case 'auth/requires-recent-login':
        return new Error('Please sign in again before performing this sensitive account action.');
      case 'auth/popup-closed-by-user':
        return new Error('Sign-in popup was closed before completion.');
      case 'auth/network-request-failed':
        return new Error('Network error while contacting Firebase Authentication. Check your connection.');
      case 'auth/operation-not-allowed':
        return new Error('This sign-in provider is not enabled in the Firebase Console.');
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

  const providerId =
    user.providerData && user.providerData.length > 0
      ? user.providerData[0].providerId
      : user.isAnonymous
      ? 'anonymous'
      : 'password';

  return {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    isAnonymous: user.isAnonymous,
    isAdmin,
    providerId,
    createdAt: user.metadata?.creationTime ?? null,
    lastSignInAt: user.metadata?.lastSignInTime ?? null,
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

export async function signUpWithEmail(
  email: string,
  password: string,
  displayName?: string
): Promise<AuthUser> {
  const authInstance = requireAuth();
  try {
    const credential = await createUserWithEmailAndPassword(authInstance, email.trim(), password);
    const trimmedName = displayName?.trim();
    if (trimmedName) {
      await updateProfile(credential.user, { displayName: trimmedName });
    }
    return await mapFirebaseUser(credential.user);
  } catch (err) {
    throw formatAuthError(err);
  }
}

export async function updateAuthDisplayName(displayName: string): Promise<void> {
  const authInstance = requireAuth();
  if (!authInstance.currentUser) {
    throw new Error('No authenticated user found.');
  }
  try {
    await updateProfile(authInstance.currentUser, {
      displayName: displayName.trim(),
    });
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

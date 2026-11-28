import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  Timestamp,
  FieldValue,
} from 'firebase/firestore';
import { db, firebaseStatus } from '../firebase/firebaseApp';
import {
  AuthUser,
  FirebaseNotConfiguredError,
  updateAuthDisplayName,
} from '../firebase/authService';
import { ReportVisibility } from './threatConverter';
import type { ScamCategory } from '../ai/analysisSchema';

export interface UserPreferences {
  defaultInferenceMode: 'prefer_on_device' | 'only_on_device' | 'only_in_cloud';
  defaultReportVisibility: ReportVisibility;
  followedCategories?: ScamCategory[];
}

export interface UserProfileDocument {
  uid: string;
  displayName: string;
  email: string | null;
  providerId: string;
  preferences: UserPreferences;
  createdAt: Timestamp | FieldValue;
  updatedAt: Timestamp | FieldValue;
}

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  defaultInferenceMode: 'prefer_on_device',
  defaultReportVisibility: 'community_public',
};

function requireDb() {
  if (!db || !firebaseStatus.isConfigured) {
    throw new FirebaseNotConfiguredError('Cloud Firestore');
  }
  return db;
}

/**
 * Loads the minimal private user profile from users/{uid}, or creates it on first login.
 */
export async function loadOrCreateUserProfile(
  authUser: AuthUser
): Promise<UserProfileDocument> {
  const firestore = requireDb();
  const userRef = doc(firestore, 'users', authUser.uid);
  const snap = await getDoc(userRef);

  if (snap.exists()) {
    const data = snap.data() as Partial<UserProfileDocument>;
    return {
      uid: authUser.uid,
      displayName: data.displayName || authUser.displayName || 'ScamSignal User',
      email: data.email ?? authUser.email,
      providerId: data.providerId || authUser.providerId,
      preferences: {
        ...DEFAULT_USER_PREFERENCES,
        ...(data.preferences || {}),
      },
      createdAt: data.createdAt || serverTimestamp(),
      updatedAt: data.updatedAt || serverTimestamp(),
    };
  }

  const newProfile: UserProfileDocument = {
    uid: authUser.uid,
    displayName:
      authUser.displayName ||
      (authUser.email ? authUser.email.split('@')[0] : 'ScamSignal User'),
    email: authUser.email,
    providerId: authUser.providerId,
    preferences: { ...DEFAULT_USER_PREFERENCES },
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(userRef, newProfile);
  return newProfile;
}

/**
 * Updates display name and/or privacy & AI preferences for the authenticated user.
 */
export async function updateUserProfilePreferences(
  uid: string,
  updates: {
    displayName?: string;
    preferences?: Partial<UserPreferences>;
  },
  currentProfile: UserProfileDocument
): Promise<UserProfileDocument> {
  const firestore = requireDb();
  const userRef = doc(firestore, 'users', uid);

  const nextDisplayName =
    updates.displayName !== undefined && updates.displayName.trim().length > 0
      ? updates.displayName.trim()
      : currentProfile.displayName;

  if (updates.displayName !== undefined && updates.displayName.trim().length > 0) {
    await updateAuthDisplayName(nextDisplayName);
  }

  const nextPreferences: UserPreferences = {
    ...currentProfile.preferences,
    ...(updates.preferences || {}),
  };

  const nextProfile: UserProfileDocument = {
    ...currentProfile,
    displayName: nextDisplayName,
    preferences: nextPreferences,
    updatedAt: serverTimestamp(),
  };

  await setDoc(userRef, nextProfile, { merge: true });
  return nextProfile;
}

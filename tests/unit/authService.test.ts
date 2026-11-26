import { describe, it, expect } from 'vitest';
import {
  signInWithGoogle,
  signInWithEmail,
  signUpWithEmail,
  signInAnonymouslySafe,
  signOutUser,
  FirebaseNotConfiguredError,
} from '../../src/services/firebase/authService';

describe('Firebase Auth Service (Unconfigured Safety)', () => {
  it('throws FirebaseNotConfiguredError for all auth operations when env vars are missing', async () => {
    await expect(signInWithGoogle()).rejects.toThrow(FirebaseNotConfiguredError);
    await expect(signInWithEmail('test@example.com', 'password123')).rejects.toThrow(
      FirebaseNotConfiguredError
    );
    await expect(signUpWithEmail('test@example.com', 'password123')).rejects.toThrow(
      FirebaseNotConfiguredError
    );
    await expect(signInAnonymouslySafe()).rejects.toThrow(FirebaseNotConfiguredError);
    await expect(signOutUser()).rejects.toThrow(FirebaseNotConfiguredError);
  });
});

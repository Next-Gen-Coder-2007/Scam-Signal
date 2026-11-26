import { describe, it, expect } from 'vitest';
import {
  validateFirebaseConfig,
  firebaseStatus,
  app,
  auth,
  db,
} from '../../src/services/firebase/firebaseApp';

describe('Centralized Firebase Configuration', () => {
  it('detects all missing required environment variables when empty', () => {
    const result = validateFirebaseConfig({});
    expect(result.isValid).toBe(false);
    expect(result.missingKeys).toEqual([
      'VITE_FIREBASE_API_KEY',
      'VITE_FIREBASE_AUTH_DOMAIN',
      'VITE_FIREBASE_PROJECT_ID',
      'VITE_FIREBASE_APP_ID',
    ]);
  });

  it('passes validation when required keys are provided', () => {
    const result = validateFirebaseConfig({
      apiKey: 'test-key',
      authDomain: 'test.firebaseapp.com',
      projectId: 'test-project',
      appId: '1:123:web:abc',
    });
    expect(result.isValid).toBe(true);
    expect(result.missingKeys).toEqual([]);
  });

  it('initializes safely without crashing when env vars are absent', () => {
    expect(firebaseStatus.isConfigured).toBe(false);
    expect(firebaseStatus.missingKeys.length).toBeGreaterThan(0);
    expect(firebaseStatus.error).toContain('Firebase configuration is incomplete');
    expect(app).toBeNull();
    expect(auth).toBeNull();
    expect(db).toBeNull();
  });
});

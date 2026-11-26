import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  AuthUser,
  subscribeToAuthChanges,
  signInWithGoogle,
  signInWithEmail,
  signUpWithEmail,
  signInAnonymouslySafe,
  signOutUser,
} from '../services/firebase/authService';
import { firebaseStatus } from '../services/firebase/firebaseApp';

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  isConfigured: boolean;
  signInGoogle: () => Promise<AuthUser | null>;
  signInEmail: (email: string, password: string) => Promise<AuthUser | null>;
  signUpEmail: (email: string, password: string) => Promise<AuthUser | null>;
  signInGuest: () => Promise<AuthUser | null>;
  signOut: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState<boolean>(firebaseStatus.isConfigured);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges((authUser) => {
      setUser(authUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const runAuthAction = useCallback(
    async <T,>(fn: () => Promise<T>): Promise<T | null> => {
      setError(null);
      setLoading(true);
      try {
        return await fn();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Authentication operation failed.');
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const signInGoogle = useCallback(
    () => runAuthAction(signInWithGoogle),
    [runAuthAction]
  );

  const signInEmail = useCallback(
    (email: string, password: string) =>
      runAuthAction(() => signInWithEmail(email, password)),
    [runAuthAction]
  );

  const signUpEmail = useCallback(
    (email: string, password: string) =>
      runAuthAction(() => signUpWithEmail(email, password)),
    [runAuthAction]
  );

  const signInGuest = useCallback(
    () => runAuthAction(signInAnonymouslySafe),
    [runAuthAction]
  );

  const signOut = useCallback(async () => {
    setError(null);
    try {
      await signOutUser();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Sign-out failed.');
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        error,
        isConfigured: firebaseStatus.isConfigured,
        signInGoogle,
        signInEmail,
        signUpEmail,
        signInGuest,
        signOut,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider.');
  }
  return context;
}

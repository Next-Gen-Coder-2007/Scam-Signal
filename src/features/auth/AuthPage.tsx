import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Lock, AlertTriangle, Mail, UserCheck, ShieldCheck, LogOut, Settings } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useAuth } from '../../context/AuthContext';
import { isGoogleAuthConfigured } from '../../services/firebase/authService';
import { firebaseStatus } from '../../services/firebase/firebaseApp';

/**
 * Dedicated authentication page (/auth) supporting sign-in, registration with
 * display name, optional Google sign-in, and anonymous sessions.
 */
export const AuthPage: React.FC = () => {
  const {
    user,
    isConfigured,
    loading,
    error,
    signInEmail,
    signUpEmail,
    signInGoogle,
    signInGuest,
    signOut,
    clearError,
  } = useAuth();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const googleEnabled = isGoogleAuthConfigured();

  const switchMode = (nextMode: 'signin' | 'signup') => {
    setLocalError(null);
    setConfirmPassword('');
    clearError();
    setMode(nextMode);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    if (!email.trim() || !password) return;

    if (mode === 'signup') {
      if (password.length < 6) {
        setLocalError('Password must be at least 6 characters.');
        return;
      }
      if (password !== confirmPassword) {
        setLocalError('Passwords do not match.');
        return;
      }
    }

    if (mode === 'signin') {
      await signInEmail(email.trim(), password);
    } else {
      await signUpEmail(email.trim(), password, displayName.trim() || undefined);
    }
  };

  if (user) {
    return (
      <div className="max-w-md mx-auto my-8 p-6 rounded-lg bg-surface border border-surface-border space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-md bg-emerald-500/15 border border-emerald-200 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-slate-900">Session Active</h1>
            <p className="text-xs text-slate-600">
              Signed in as{' '}
              <span className="font-mono text-slate-800">
                {user.displayName || user.email || 'Anonymous Session'}
              </span>
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Link to="/profile">
            <Button variant="primary" className="w-full">
              <Settings className="w-3.5 h-3.5" />
              <span>Manage Profile & Preferences</span>
            </Button>
          </Link>
          <Link to="/">
            <Button variant="secondary" className="w-full">
              <span>Open Private Analyzer</span>
            </Button>
          </Link>
          <Button variant="ghost" className="w-full" onClick={() => void signOut()}>
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </Button>
        </div>
      </div>
    );
  }

  const displayedError = localError || error;

  return (
    <div className="max-w-md mx-auto my-8 p-6 rounded-lg bg-surface border border-surface-border space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-md bg-amber-50 border border-accent-violet/30 flex items-center justify-center">
          <Lock className="w-4 h-4 text-accent-violet" />
        </div>
        <div>
          <h1 className="text-base font-semibold text-slate-900">
            {mode === 'signin' ? 'Sign In to ScamSignal' : 'Create ScamSignal Account'}
          </h1>
          <p className="text-xs text-slate-600">
            Persist preferences and submit verified community threat signals.
          </p>
        </div>
      </div>

      {!isConfigured ? (
        <div className="p-3.5 rounded-md bg-amber-50 border border-amber-200 text-amber-800 space-y-2 text-xs">
          <div className="flex items-center gap-2 font-semibold text-amber-800">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Firebase Authentication Unavailable</span>
          </div>
          <p className="text-amber-800 leading-relaxed">
            Copy <code className="font-mono text-slate-900">.env.example</code> to{' '}
            <code className="font-mono text-slate-900">.env</code> and configure:
          </p>
          <ul className="list-disc list-inside font-mono text-[11px] text-amber-800 space-y-0.5">
            {firebaseStatus.missingKeys.map((key) => (
              <li key={key}>{key}</li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="space-y-4">
          {displayedError && (
            <div className="p-3 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
              <span>{displayedError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === 'signup' && (
              <Input
                label="Display Name (Optional)"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Threat Researcher"
                maxLength={60}
              />
            )}
            <Input
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="analyst@example.com"
              required
            />
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 6 characters"
              minLength={6}
              required
            />
            {mode === 'signup' && (
              <Input
                label="Confirm Password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                minLength={6}
                required
              />
            )}
            <Button type="submit" variant="primary" className="w-full" isLoading={loading}>
              <Mail className="w-3.5 h-3.5" />
              <span>{mode === 'signin' ? 'Sign In with Email' : 'Create Account'}</span>
            </Button>
          </form>

          <div className="relative py-1">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-surface-border" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase font-mono">
              <span className="bg-surface px-2 text-slate-500">Or continue with</span>
            </div>
          </div>

          <div className={`grid gap-2.5 ${googleEnabled ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {googleEnabled && (
              <Button
                type="button"
                variant="secondary"
                onClick={() => void signInGoogle()}
                disabled={loading}
              >
                <span>Google</span>
              </Button>
            )}
            <Button
              type="button"
              variant="secondary"
              onClick={() => void signInGuest()}
              disabled={loading}
            >
              <UserCheck className="w-3.5 h-3.5 text-orange-700" />
              <span>Anonymous</span>
            </Button>
          </div>

          <div className="pt-2 border-t border-surface-border text-center text-xs text-slate-600">
            {mode === 'signin' ? (
              <button
                type="button"
                onClick={() => switchMode('signup')}
                className="hover:text-slate-800 underline underline-offset-4"
              >
                Need an account? Sign up
              </button>
            ) : (
              <button
                type="button"
                onClick={() => switchMode('signin')}
                className="hover:text-slate-800 underline underline-offset-4"
              >
                Already have an account? Sign in
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

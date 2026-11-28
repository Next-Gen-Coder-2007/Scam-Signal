import React, { useState } from 'react';
import { Lock, AlertTriangle, Mail, UserCheck } from 'lucide-react';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useAuth } from '../../context/AuthContext';
import { isGoogleAuthConfigured } from '../../services/firebase/authService';
import { firebaseStatus } from '../../services/firebase/firebaseApp';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const {
    isConfigured,
    loading,
    error,
    signInEmail,
    signUpEmail,
    signInGoogle,
    signInGuest,
    clearError,
  } = useAuth();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const googleEnabled = isGoogleAuthConfigured();

  const handleClose = () => {
    setLocalError(null);
    clearError();
    onClose();
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
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

    const res =
      mode === 'signin'
        ? await signInEmail(email.trim(), password)
        : await signUpEmail(email.trim(), password, displayName.trim() || undefined);
    if (res) {
      handleClose();
    }
  };

  const handleGoogle = async () => {
    const res = await signInGoogle();
    if (res) handleClose();
  };

  const handleGuest = async () => {
    const res = await signInGuest();
    if (res) handleClose();
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={handleClose}
      title={mode === 'signin' ? 'Sign In to ScamSignal' : 'Create ScamSignal Account'}
      description="Authenticate via Firebase Auth to submit scrubbed threat signals."
      icon={<Lock className="w-4 h-4 text-accent-violet" />}
      maxWidth="md"
    >
      {!isConfigured ? (
        <div className="space-y-4 text-xs">
          <div className="p-3.5 rounded-md bg-amber-50 border border-amber-200 text-amber-800 space-y-2">
            <div className="flex items-center gap-2 font-semibold text-amber-800">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>Firebase Authentication Unavailable</span>
            </div>
            <p className="text-amber-800 leading-relaxed">
              Firebase credentials are not configured in this environment. Copy{' '}
              <code className="font-mono text-slate-800">.env.example</code> to{' '}
              <code className="font-mono text-slate-800">.env</code> and populate:
            </p>
            <ul className="list-disc list-inside font-mono text-[11px] text-amber-800 space-y-0.5">
              {firebaseStatus.missingKeys.map((key) => (
                <li key={key}>{key}</li>
              ))}
            </ul>
          </div>
          <div className="flex justify-end">
            <Button variant="secondary" onClick={handleClose}>
              Close
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {(localError || error) && (
            <div className="p-3 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
              <span>{localError || error}</span>
            </div>
          )}

          <form onSubmit={handleEmailSubmit} className="space-y-3">
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
            <Button
              type="submit"
              variant="primary"
              className="w-full"
              isLoading={loading}
            >
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
                onClick={handleGoogle}
                disabled={loading}
              >
                <span>Google</span>
              </Button>
            )}
            <Button
              type="button"
              variant="secondary"
              onClick={handleGuest}
              disabled={loading}
            >
              <UserCheck className="w-3.5 h-3.5 text-cyan-700" />
              <span>Anonymous</span>
            </Button>
          </div>

          <div className="pt-2 border-t border-surface-border text-center text-xs text-slate-600">
            {mode === 'signin' ? (
              <button
                type="button"
                onClick={() => {
                  setLocalError(null);
                  setConfirmPassword('');
                  clearError();
                  setMode('signup');
                }}
                className="hover:text-slate-800 underline underline-offset-4"
              >
                Need an account? Sign up
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setLocalError(null);
                  setConfirmPassword('');
                  clearError();
                  setMode('signin');
                }}
                className="hover:text-slate-800 underline underline-offset-4"
              >
                Already have an account? Sign in
              </button>
            )}
          </div>
        </div>
      )}
    </Dialog>
  );
};

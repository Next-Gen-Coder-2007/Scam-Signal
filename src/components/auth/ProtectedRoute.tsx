import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Lock, ShieldAlert, Loader2, AlertTriangle, LogIn, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/Button';
import { AuthModal } from './AuthModal';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  title?: string;
  description?: string;
}

/**
 * Route guard that enforces Firebase Authentication (and optional admin role)
 * before rendering protected views such as user profile settings or triage.
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireAdmin = false,
  title = 'Authentication Required',
  description = 'Sign in with your ScamSignal account to access protected settings and reporting features.',
}) => {
  const { user, loading, isConfigured, signOut } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[320px] text-zinc-400 gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-accent-violet-muted" />
        <p className="text-xs font-mono">Verifying authentication session...</p>
      </div>
    );
  }

  if (!isConfigured) {
    return (
      <div className="max-w-lg mx-auto my-10 p-6 rounded-lg bg-surface border border-amber-500/30 space-y-4">
        <div className="flex items-center gap-2.5 text-amber-300">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <h2 className="text-sm font-semibold">Firebase Authentication Not Configured</h2>
        </div>
        <p className="text-xs text-zinc-300 leading-relaxed">
          Protected routes require Firebase Authentication. Configure your{' '}
          <code className="font-mono text-zinc-100">.env</code> file from{' '}
          <code className="font-mono text-zinc-100">.env.example</code> to enable sign-in and
          profile persistence.
        </p>
        <div className="flex items-center gap-2 pt-1">
          <Link to="/">
            <Button variant="secondary" size="sm">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Private Analyzer</span>
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <div className="max-w-lg mx-auto my-10 p-6 rounded-lg bg-surface border border-surface-border space-y-4">
          <div className="flex items-center gap-2.5 text-zinc-100">
            <div className="w-8 h-8 rounded-md bg-accent-violet/15 border border-accent-violet/30 flex items-center justify-center">
              <Lock className="w-4 h-4 text-accent-violet-muted" />
            </div>
            <div>
              <h2 className="text-sm font-semibold">{title}</h2>
              <p className="text-[11px] font-mono text-zinc-400">Protected ScamSignal Route</p>
            </div>
          </div>

          <p className="text-xs text-zinc-300 leading-relaxed">{description}</p>

          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            <Button variant="primary" size="sm" onClick={() => setAuthModalOpen(true)}>
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In or Create Account</span>
            </Button>
            <Link to="/auth">
              <Button variant="secondary" size="sm">
                <span>Open Sign-In Page</span>
              </Button>
            </Link>
          </div>
        </div>
        <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
      </>
    );
  }

  if (requireAdmin && !user.isAdmin) {
    return (
      <div className="max-w-lg mx-auto my-10 p-6 rounded-lg bg-surface border border-rose-500/30 space-y-4">
        <div className="flex items-center gap-2.5 text-rose-300">
          <ShieldAlert className="w-5 h-5 shrink-0" />
          <h2 className="text-sm font-semibold">Analyst Access Required</h2>
        </div>
        <p className="text-xs text-zinc-300 leading-relaxed">
          You are signed in as{' '}
          <span className="font-mono text-zinc-100">{user.email ?? user.uid}</span>, which does
          not have analyst permissions for the Triage Console.
        </p>
        <div className="flex flex-wrap items-center gap-2.5 pt-1">
          <Link to="/">
            <Button variant="secondary" size="sm">
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to Analyzer</span>
            </Button>
          </Link>
          <Button variant="ghost" size="sm" onClick={() => void signOut()}>
            <span>Sign Out</span>
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, Lock, LogIn, LogOut, User, Bell } from 'lucide-react';
import { InferenceBadge } from '../common/InferenceBadge';
import { Button } from '../ui/Button';
import { useAuth } from '../../context/AuthContext';
import { AuthModal } from '../auth/AuthModal';

interface HeaderProps {
  onToggleSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  const { user, isConfigured, signOut } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-30 h-16 bg-canvas border-b border-surface-border px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        {/* Left: Mobile trigger & active context */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            className="p-2 -ml-2 rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-surface lg:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
            aria-label="Toggle Navigation Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="hidden sm:flex items-center gap-2 text-xs text-zinc-400">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            <span className="font-medium text-zinc-200">Scam Intelligence Network</span>
            <span className="text-zinc-600">/</span>
            <span className="font-mono text-[11px] text-zinc-400">Deterministic Clustering</span>
          </div>
        </div>

        {/* Right: Telemetry, Privacy & Auth */}
        <div className="flex items-center gap-2.5">
          <div className="hidden md:flex items-center">
            <InferenceBadge
              source={isConfigured ? 'in_cloud' : 'unknown'}
              modelIdentifier={isConfigured ? 'Firebase AI Logic' : 'AI Unconfigured'}
            />
          </div>

          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded text-xs bg-surface border border-surface-border text-zinc-300">
            <Lock className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-medium">Zero-PII</span>
          </div>

          {user ? (
            <div className="flex items-center gap-2">
              <Link
                to="/alerts"
                className="flex items-center justify-center p-1.5 rounded bg-surface border border-surface-border text-zinc-300 hover:text-cyan-300 hover:border-cyan-500/40 transition-colors"
                title="Alerts & Notification Center"
                aria-label="Alerts & Notification Center"
              >
                <Bell className="w-3.5 h-3.5" />
              </Link>
              <Link
                to="/profile"
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded text-xs bg-surface border border-surface-border text-zinc-200 hover:border-accent-violet/50 transition-colors"
                title="Profile & Settings"
              >
                <User className="w-3.5 h-3.5 text-accent-violet-muted" />
                <span className="max-w-[120px] truncate font-mono text-[11px]">
                  {user.isAnonymous
                    ? 'Guest'
                    : user.displayName || user.email || user.uid.slice(0, 8)}
                </span>
              </Link>
              <Button variant="secondary" size="sm" onClick={signOut}>
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sign Out</span>
              </Button>
            </div>
          ) : (
            <Button
              variant={isConfigured ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => setAuthModalOpen(true)}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>{isConfigured ? 'Sign In' : 'Firebase Setup'}</span>
            </Button>
          )}
        </div>
      </header>

      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </>
  );
};

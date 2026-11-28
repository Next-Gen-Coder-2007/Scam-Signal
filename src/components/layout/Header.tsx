import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, LogIn, LogOut, User, Bell } from 'lucide-react';
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
      <header className="sticky top-0 z-30 h-14 bg-surface/95 backdrop-blur border-b border-surface-border px-4 sm:px-6 lg:px-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            className="p-2 -ml-2 rounded-md text-slate-500 hover:text-slate-900 hover:bg-surface-elevated lg:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-600"
            aria-label="Toggle Navigation Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <span className="hidden sm:inline-block text-xs font-medium text-slate-600">
            Threat Intelligence Workspace
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center">
            <InferenceBadge
              source={isConfigured ? 'in_cloud' : 'unknown'}
              modelIdentifier={isConfigured ? 'Firebase AI Logic' : 'Local Only'}
            />
          </div>

          {user ? (
            <div className="flex items-center gap-2">
              <Link
                to="/alerts"
                className="flex items-center justify-center p-1.5 rounded-md bg-surface border border-surface-border text-slate-600 hover:text-slate-900 hover:bg-surface-elevated transition-colors"
                title="Alerts"
                aria-label="Alerts"
              >
                <Bell className="w-4 h-4" />
              </Link>
              <Link
                to="/profile"
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs bg-surface border border-surface-border text-slate-700 hover:bg-surface-elevated transition-colors"
                title="Settings"
              >
                <User className="w-3.5 h-3.5 text-accent-violet" />
                <span className="max-w-[120px] truncate font-medium">
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
              <span>{isConfigured ? 'Sign In' : 'Setup'}</span>
            </Button>
          )}
        </div>
      </header>

      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </>
  );
};

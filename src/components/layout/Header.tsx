import React from 'react';
import { Menu, Lock } from 'lucide-react';
import { InferenceBadge } from '../common/InferenceBadge';

interface HeaderProps {
  onToggleSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  return (
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

      {/* Right: Runtime Telemetry & Security Indicators */}
      <div className="flex items-center gap-2.5">
        <div className="hidden md:flex items-center">
          <InferenceBadge
            source="on-device"
            modelIdentifier="Gemini Nano Ready"
          />
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs bg-surface border border-surface-border text-zinc-300">
          <Lock className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden sm:inline font-medium">Zero-PII</span>
        </div>

        <div className="flex items-center text-[11px] font-mono px-2.5 py-1 rounded bg-surface border border-surface-border text-amber-300/90">
          <span>Advisory Only</span>
        </div>
      </div>
    </header>
  );
};

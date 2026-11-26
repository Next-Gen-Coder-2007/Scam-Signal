import React from 'react';
import { Menu, Lock } from 'lucide-react';
import { InferenceBadge } from '../common/InferenceBadge';

interface HeaderProps {
  onToggleSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  return (
    <header className="sticky top-0 z-30 h-16 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80 px-4 sm:px-6 lg:px-8 flex items-center justify-between">
      {/* Left: Mobile trigger & active context indicator */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-2 -ml-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-900 lg:hidden focus:outline-none"
          aria-label="Toggle Navigation Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="font-medium text-slate-300">Scam Intelligence Network</span>
          <span className="text-slate-600">/</span>
          <span className="font-mono text-[11px] text-slate-400">Deterministic Clustering</span>
        </div>
      </div>

      {/* Right: Runtime Telemetry & Security Indicators */}
      <div className="flex items-center gap-3">
        {/* On-device status badge */}
        <div className="hidden md:flex items-center">
          <InferenceBadge
            source="on-device"
            modelIdentifier="Gemini Nano Ready"
          />
        </div>

        {/* Privacy Pill */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-slate-900 border border-slate-800 text-slate-300">
          <Lock className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden sm:inline font-medium">Zero-PII</span>
        </div>

        {/* Advisory indicator */}
        <div className="flex items-center gap-1 text-[11px] font-mono px-2 py-1 rounded bg-amber-950/40 border border-amber-600/30 text-amber-300">
          <span>Advisory Only</span>
        </div>
      </div>
    </header>
  );
};

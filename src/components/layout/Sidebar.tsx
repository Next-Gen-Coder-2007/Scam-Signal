import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  ShieldAlert,
  Search,
  Radio,
  Network,
  Lock,
  ExternalLink,
  ShieldCheck,
  Cpu,
} from 'lucide-react';
import { NavItem } from '../../types/navigation';
import { cn } from '../../utils/cn';

const NAV_ITEMS: NavItem[] = [
  {
    label: 'Private Analyzer',
    href: '/',
    icon: Search,
    badge: 'Local AI',
    description: 'On-device private scam triage',
  },
  {
    label: 'Threat Feed',
    href: '/feed',
    icon: Radio,
    badge: 'Live',
    description: 'Scrubbed community intelligence',
  },
  {
    label: 'Campaign Clusters',
    href: '/campaigns',
    icon: Network,
    description: 'Correlated scam networks',
  },
  {
    label: 'Triage & Verification',
    href: '/admin',
    icon: ShieldCheck,
    description: 'Analyst evidence console',
  },
  {
    label: 'Privacy & Architecture',
    href: '/privacy',
    icon: Lock,
    description: 'Zero-PII safeguards',
  },
];

interface SidebarProps {
  isOpen: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden transition-opacity"
        />
      )}

      <aside
        className={cn(
          'fixed top-0 bottom-0 left-0 z-50 w-64 bg-slate-950/95 border-r border-slate-800/80 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Brand header */}
        <div className="h-16 px-5 border-b border-slate-800/80 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base tracking-tight text-slate-100">ScamSignal</span>
              <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                HYBRID
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium truncate">
              Detect individually. Protect collectively.
            </p>
          </div>
        </div>

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <div className="px-3 pb-2 text-[10px] font-semibold tracking-wider uppercase text-slate-500">
            Platform Operations
          </div>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.href}
                to={item.href}
                onClick={onClose}
                end={item.href === '/'}
                className={({ isActive }) =>
                  cn(
                    'group flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all duration-150',
                    isActive
                      ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
                  )
                }
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon className="w-4 h-4 shrink-0 transition-colors group-hover:text-slate-200" />
                  <div className="truncate">
                    <span className="block truncate">{item.label}</span>
                    <span className="block text-[10px] text-slate-500 font-normal truncate group-hover:text-slate-400">
                      {item.description}
                    </span>
                  </div>
                </div>
                {item.badge && (
                  <span className="ml-2 px-1.5 py-0.5 rounded text-[9px] font-mono font-medium bg-slate-800 text-slate-300 border border-slate-700">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </div>

        {/* Local-First Hybrid Telemetry Pill */}
        <div className="p-3 mx-3 mb-3 rounded-lg bg-slate-900/80 border border-slate-800 text-[11px]">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-slate-400 font-medium flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-emerald-400" />
              Runtime AI Engine
            </span>
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          </div>
          <div className="font-mono text-emerald-300 text-[10px] truncate">
            Firebase AI Logic (Nano/Flash)
          </div>
          <div className="text-[10px] text-slate-500 mt-1 flex items-center justify-between">
            <span>Client Redaction:</span>
            <span className="text-slate-300 font-mono">ACTIVE</span>
          </div>
        </div>

        {/* Hackathon Badge Footer */}
        <div className="p-4 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
          <span>#BuildHybridAI 2026</span>
          <a
            href="https://github.com/Next-Gen-Coder-2007/Scam-Signal"
            target="_blank"
            rel="noreferrer"
            className="hover:text-slate-200 transition-colors flex items-center gap-1 text-[10px]"
          >
            GitHub
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </aside>
    </>
  );
};

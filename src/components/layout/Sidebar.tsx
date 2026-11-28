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
  UserCog,
  LayoutDashboard,
  Radar,
  LifeBuoy,
  Bell,
} from 'lucide-react';
import { NavItem } from '../../types/navigation';
import { cn } from '../../utils/cn';

const NAV_ITEMS: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    description: 'Live threat & campaign overview',
  },
  {
    label: 'Scam Radar',
    href: '/radar',
    icon: Radar,
    description: 'Emerging scam discovery',
  },
  {
    label: 'Safety Assistant',
    href: '/safety',
    icon: LifeBuoy,
    description: 'Guided incident response',
  },
  {
    label: 'Alerts',
    href: '/alerts',
    icon: Bell,
    description: 'Followed category warnings',
  },
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
  {
    label: 'Profile & Settings',
    href: '/profile',
    icon: UserCog,
    description: 'Account & AI preferences',
  },
];

interface SidebarProps {
  isOpen: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  return (
    <>
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/75 lg:hidden"
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          'fixed top-0 bottom-0 left-0 z-50 w-64 bg-canvas border-r border-surface-border flex flex-col transition-transform duration-200 ease-out lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Brand header */}
        <div className="h-16 px-5 border-b border-surface-border flex items-center gap-3">
          <div className="w-8 h-8 rounded-md bg-violet-500/10 border border-violet-500/30 flex items-center justify-center text-accent-violet-muted">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm tracking-tight text-zinc-100">
                ScamSignal
              </span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-medium bg-surface-elevated text-cyan-400 border border-surface-border">
                HYBRID
              </span>
            </div>
            <p className="text-[11px] text-zinc-500 truncate">
              Detect individually. Protect collectively.
            </p>
          </div>
        </div>

        {/* Navigation list */}
        <nav aria-label="Main Navigation" className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <div className="px-3 pb-2 text-[10px] font-semibold tracking-wider uppercase text-zinc-500">
            Operations
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
                    'group flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition-colors duration-150 border',
                    isActive
                      ? 'bg-violet-500/10 text-zinc-100 border-violet-500/30'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-surface border-transparent'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon
                        className={cn(
                          'w-4 h-4 shrink-0 transition-colors',
                          isActive
                            ? 'text-accent-violet-muted'
                            : 'text-zinc-500 group-hover:text-zinc-300'
                        )}
                      />
                      <div className="truncate">
                        <span className="block truncate">{item.label}</span>
                        <span className="block text-[10px] text-zinc-500 font-normal truncate">
                          {item.description}
                        </span>
                      </div>
                    </div>
                    {item.badge && (
                      <span className="ml-2 px-1.5 py-0.5 rounded text-[9px] font-mono font-medium bg-surface-elevated text-zinc-300 border border-surface-border">
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Runtime AI Engine Status */}
        <div className="p-3 mx-3 mb-3 rounded-md bg-surface border border-surface-border text-[11px]">
          <div className="flex items-center justify-between mb-1">
            <span className="text-zinc-400 font-medium flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
              Runtime AI
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          </div>
          <div className="font-mono text-zinc-200 text-[10px] truncate">
            Firebase AI Logic (Nano / Flash)
          </div>
          <div className="text-[10px] text-zinc-500 mt-1.5 pt-1.5 border-t border-surface-border flex items-center justify-between">
            <span>Client Redaction</span>
            <span className="text-emerald-400 font-mono">ACTIVE</span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-surface-border text-[11px] text-zinc-500 flex items-center justify-between">
          <span>#BuildHybridAI 2026</span>
          <a
            href="https://github.com/Next-Gen-Coder-2007/Scam-Signal"
            target="_blank"
            rel="noreferrer"
            className="hover:text-zinc-200 transition-colors flex items-center gap-1 text-[10px]"
          >
            GitHub
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </aside>
    </>
  );
};

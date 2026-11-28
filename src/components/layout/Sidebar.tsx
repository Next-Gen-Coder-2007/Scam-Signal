import React, { useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
  ShieldAlert,
  Search,
  Radio,
  Network,
  Lock,
  ShieldCheck,
  UserCog,
  LayoutDashboard,
  Radar,
  LifeBuoy,
  Bell,
} from 'lucide-react';
import { NavItem } from '../../types/navigation';
import { cn } from '../../utils/cn';

const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Analyzer', href: '/', icon: Search },
  { label: 'Scam Radar', href: '/radar', icon: Radar },
  { label: 'Reports', href: '/feed', icon: Radio },
  { label: 'Campaigns', href: '/campaigns', icon: Network },
  { label: 'Safety Help', href: '/safety', icon: LifeBuoy },
  { label: 'Alerts', href: '/alerts', icon: Bell },
  { label: 'Moderation', href: '/admin', icon: ShieldCheck },
  { label: 'Privacy', href: '/privacy', icon: Lock },
  { label: 'Settings', href: '/profile', icon: UserCog },
];

interface SidebarProps {
  isOpen: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  useEffect(() => {
    if (!isOpen || !onClose) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  return (
    <>
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-[1px] lg:hidden"
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          'fixed top-0 bottom-0 left-0 z-50 w-60 bg-surface border-r border-surface-border flex flex-col transition-transform duration-200 ease-out lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Brand header */}
        <div className="h-14 px-5 border-b border-surface-border flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-violet-50 border border-violet-200 flex items-center justify-center text-accent-violet">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <span className="font-semibold text-sm tracking-tight text-slate-900">
            ScamSignal
          </span>
        </div>

        {/* Navigation list */}
        <nav aria-label="Main Navigation" className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
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
                    'group flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium transition-colors duration-150',
                    isActive
                      ? 'bg-violet-50 text-violet-900 border border-violet-200'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-surface-elevated border border-transparent'
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      className={cn(
                        'w-4 h-4 shrink-0 transition-colors',
                        isActive
                          ? 'text-accent-violet'
                          : 'text-slate-400 group-hover:text-slate-600'
                      )}
                    />
                    <span className="truncate">{item.label}</span>
                  </>
                )}
              </NavLink>
            );
          })}
        </nav>
      </aside>
    </>
  );
};

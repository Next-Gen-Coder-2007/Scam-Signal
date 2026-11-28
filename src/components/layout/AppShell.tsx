import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { FirebaseSetupBanner } from '../common/FirebaseSetupBanner';

export const AppShell: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-canvas text-slate-900 flex flex-col lg:flex-row">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] focus:px-3 focus:py-2 focus:rounded-md focus:bg-accent-violet focus:text-white focus:text-xs focus:font-medium"
      >
        Skip to main content
      </a>

      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 lg:pl-60">
        <Header onToggleSidebar={() => setSidebarOpen((prev) => !prev)} />
        <FirebaseSetupBanner />

        <main
          id="main-content"
          tabIndex={-1}
          className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto focus:outline-none"
        >
          <Outlet />
        </main>

        <footer className="border-t border-surface-border py-3.5 px-4 sm:px-8 text-center text-xs text-slate-500">
          <p>ScamSignal · Advisory threat intelligence only.</p>
        </footer>
      </div>
    </div>
  );
};

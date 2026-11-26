import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export const AppShell: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-canvas text-zinc-100 flex flex-col lg:flex-row">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        <Header onToggleSidebar={() => setSidebarOpen((prev) => !prev)} />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>

        <footer className="border-t border-surface-border py-4 px-4 sm:px-8 text-center text-xs text-zinc-500">
          <p>
            ScamSignal is an AI-assisted threat triage platform for the #BuildHybridAI hackathon.
            Evaluations are advisory pattern recognitions, not certified legal or financial findings.
          </p>
        </footer>
      </div>
    </div>
  );
};

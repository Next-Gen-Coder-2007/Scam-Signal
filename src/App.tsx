import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AppShell } from './components/layout/AppShell';
import { PrivateAnalyzerView } from './features/analyzer/PrivateAnalyzerView';
import { CommunityFeedView } from './features/feed/CommunityFeedView';
import { CampaignExplorerView } from './features/campaigns/CampaignExplorerView';
import { TriageConsoleView } from './features/admin/TriageConsoleView';
import { PrivacyPolicyView } from './features/privacy/PrivacyPolicyView';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<AppShell />}>
            <Route index element={<PrivateAnalyzerView />} />
            <Route path="feed" element={<CommunityFeedView />} />
            <Route path="campaigns" element={<CampaignExplorerView />} />
            <Route path="admin" element={<TriageConsoleView />} />
            <Route path="privacy" element={<PrivacyPolicyView />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;

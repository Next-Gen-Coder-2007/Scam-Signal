import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AppShell } from './components/layout/AppShell';
import { PrivateAnalyzerView } from './features/analyzer/PrivateAnalyzerView';
import { DashboardView } from './features/dashboard/DashboardView';
import { ScamRadarView } from './features/radar/ScamRadarView';
import { SafetyAssistantView } from './features/safety/SafetyAssistantView';
import { CommunityFeedView } from './features/feed/CommunityFeedView';
import { CampaignExplorerView } from './features/campaigns/CampaignExplorerView';
import { CampaignDetailsView } from './features/campaigns/CampaignDetailsView';
import { TriageConsoleView } from './features/admin/TriageConsoleView';
import { PrivacyPolicyView } from './features/privacy/PrivacyPolicyView';
import { AuthPage } from './features/auth/AuthPage';
import { ProfileSettingsView } from './features/profile/ProfileSettingsView';
import { ProtectedRoute } from './components/auth/ProtectedRoute';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<AppShell />}>
            <Route index element={<PrivateAnalyzerView />} />
            <Route path="dashboard" element={<DashboardView />} />
            <Route path="radar" element={<ScamRadarView />} />
            <Route path="safety" element={<SafetyAssistantView />} />
            <Route path="feed" element={<CommunityFeedView />} />
            <Route path="campaigns" element={<CampaignExplorerView />} />
            <Route path="campaigns/:campaignId" element={<CampaignDetailsView />} />
            <Route
              path="admin"
              element={
                <ProtectedRoute
                  requireAdmin
                  title="Analyst Triage Access"
                  description="Sign in with an authorized analyst account to review and verify pending reports."
                >
                  <TriageConsoleView />
                </ProtectedRoute>
              }
            />
            <Route
              path="profile"
              element={
                <ProtectedRoute
                  title="Profile & Settings"
                  description="Sign in to view your account metadata and customize your default ScamSignal preferences."
                >
                  <ProfileSettingsView />
                </ProtectedRoute>
              }
            />
            <Route path="auth" element={<AuthPage />} />
            <Route path="privacy" element={<PrivacyPolicyView />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;

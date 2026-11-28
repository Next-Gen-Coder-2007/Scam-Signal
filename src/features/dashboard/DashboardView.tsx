import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldAlert,
  Search,
  Radio,
  Network,
  Database,
  RefreshCw,
  AlertTriangle,
  ArrowRight,
  Activity,
  BarChart3,
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { EmptyState } from '../../components/common/EmptyState';
import { DashboardSkeleton } from '../../components/common/LoadingSkeleton';
import { ThreatBadge } from '../../components/common/ThreatBadge';
import { ReviewStatusBadge } from '../../components/scam/ReviewStatusBadge';
import { CampaignStatusBadge } from '../../components/campaigns/CampaignStatusBadge';
import { CategoryDistributionChart } from '../../components/dashboard/CategoryDistributionChart';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';
import { firebaseStatus } from '../../services/firebase/firebaseApp';
import {
  fetchDashboardSnapshot,
  type DashboardSnapshot,
  type DashboardTimeWindow,
} from '../../services/firestore/dashboardService';
import { formatFirestoreError } from '../../utils/firestoreErrors';

const TIME_WINDOWS: { value: DashboardTimeWindow; label: string }[] = [
  { value: '7d', label: 'Last 7 Days' },
  { value: '30d', label: 'Last 30 Days' },
  { value: 'all', label: 'All Recorded' },
];

export const DashboardView: React.FC = () => {
  const { user } = useAuth();
  const [timeWindow, setTimeWindow] = useState<DashboardTimeWindow>('30d');
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    if (!firebaseStatus.isConfigured) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchDashboardSnapshot(timeWindow);
      setSnapshot(data);
    } catch (err) {
      setError(formatFirestoreError(err, 'Unable to load dashboard intelligence.'));
    } finally {
      setLoading(false);
    }
  }, [timeWindow]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const greetingName = user?.isAnonymous
    ? 'Guest Analyst'
    : user?.displayName || user?.email || 'Threat Responder';

  return (
    <div className="space-y-6">
      {/* Concise Welcome & Time Filter Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-surface-border">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-900">
            Welcome, {greetingName}
          </h1>
          <p className="text-xs text-slate-600 mt-0.5">
            Live metrics from stored reports and correlated campaigns.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-md bg-surface border border-surface-border p-0.5">
            {TIME_WINDOWS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setTimeWindow(opt.value)}
                className={`px-2.5 py-1 rounded text-xs font-mono transition-colors ${
                  timeWindow === opt.value
                    ? 'bg-amber-50 text-amber-950 border border-amber-300'
                    : 'text-slate-600 hover:text-slate-900 border border-transparent'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {firebaseStatus.isConfigured && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void loadDashboard()}
              disabled={loading}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </Button>
          )}

          <Link to="/">
            <Button variant="primary" size="sm">
              <Search className="w-3.5 h-3.5" />
              <span>Analyze Message</span>
            </Button>
          </Link>
        </div>
      </div>

      {!firebaseStatus.isConfigured ? (
        <EmptyState
          icon={Database}
          title="Cloud Firestore Not Configured"
          description="The ScamSignal Intelligence Dashboard displays real metrics from Cloud Firestore. Configure your Firebase environment variables in .env to view live reports, campaigns, and activity."
        />
      ) : loading && !snapshot ? (
        <DashboardSkeleton />
      ) : error ? (
        <Card className="border-rose-200 bg-rose-50 space-y-3">
          <div className="flex items-center gap-2 text-rose-700 text-sm font-semibold">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Failed to Load Dashboard</span>
          </div>
          <p className="text-xs text-rose-700 break-all">{error}</p>
          <Button variant="secondary" size="sm" onClick={() => void loadDashboard()}>
            Retry
          </Button>
        </Card>
      ) : snapshot ? (
        <>
          {/* Restrained KPI Strip with Explicit Data Sources */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Card className="p-4 space-y-1">
              <p className="text-[11px] font-mono uppercase text-slate-600">Public Reports</p>
              <p className="text-2xl font-semibold font-mono text-slate-900">
                {snapshot.metrics.publicReportsCount}
              </p>
              <p className="text-[10px] font-mono text-slate-500">
                Source: pending_reports (public)
              </p>
            </Card>
            <Card className="p-4 space-y-1">
              <p className="text-[11px] font-mono uppercase text-slate-600">
                Emerging Campaigns
              </p>
              <p className="text-2xl font-semibold font-mono text-amber-800">
                {snapshot.metrics.emergingCampaignsCount}
              </p>
              <p className="text-[10px] font-mono text-slate-500">
                Source: campaigns (potential / review)
              </p>
            </Card>
            <Card className="p-4 space-y-1">
              <p className="text-[11px] font-mono uppercase text-slate-600">
                Verified Intelligence
              </p>
              <p className="text-2xl font-semibold font-mono text-emerald-700">
                {snapshot.metrics.verifiedItemsCount}
              </p>
              <p className="text-[10px] font-mono text-slate-500">
                Source: verified reports &amp; campaigns
              </p>
            </Card>
            <Card className="p-4 space-y-1">
              <p className="text-[11px] font-mono uppercase text-slate-600">
                Corroboration Records
              </p>
              <p className="text-2xl font-semibold font-mono text-amber-900">
                {snapshot.metrics.corroborationActionsCount}
              </p>
              <p className="text-[10px] font-mono text-slate-500">
                Source: confirmations &amp; disputes
              </p>
            </Card>
          </div>

          {/* Main 2-Column Intelligence Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left / Primary Column (2/3) */}
            <div className="lg:col-span-2 space-y-6">
              {/* Recent Scam Reports */}
              <Card className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Radio className="w-4 h-4 text-orange-700" />
                    <h2 className="text-sm font-semibold text-slate-900">Recent Scam Reports</h2>
                  </div>
                  <Link
                    to="/feed"
                    className="inline-flex items-center gap-1 text-xs font-mono text-orange-700 hover:text-amber-900"
                  >
                    <span>View Feed</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>

                {snapshot.recentReports.length === 0 ? (
                  <p className="text-xs text-slate-500 py-4">
                    No public reports recorded in this time window.
                  </p>
                ) : (
                  <div className="divide-y divide-surface-border">
                    {snapshot.recentReports.map((report) => (
                      <div key={report.id} className="py-3 first:pt-0 last:pb-0 space-y-1.5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <ThreatBadge level={report.riskAssessment} />
                            <ReviewStatusBadge status={report.verificationStatus} />
                            <span className="text-xs font-mono text-slate-700">
                              {report.category.replace(/_/g, ' ')}
                            </span>
                          </div>
                          <span className="text-[11px] font-mono text-slate-500">
                            {report.observedDate}
                          </span>
                        </div>
                        <p className="text-xs text-slate-700 line-clamp-2">
                          {report.redactedSummary}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </Card>

              {/* Emerging Potential Campaigns */}
              <Card className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Network className="w-4 h-4 text-accent-violet" />
                    <h2 className="text-sm font-semibold text-slate-900">
                      Emerging Potential Campaigns
                    </h2>
                  </div>
                  <Link
                    to="/campaigns"
                    className="inline-flex items-center gap-1 text-xs font-mono text-orange-700 hover:text-amber-900"
                  >
                    <span>All Campaigns</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                </div>

                {snapshot.emergingCampaigns.length === 0 ? (
                  <p className="text-xs text-slate-500 py-4">
                    No emerging potential campaigns in this time window.
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {snapshot.emergingCampaigns.map((camp) => (
                      <Link
                        key={camp.id}
                        to={`/campaigns/${camp.id}`}
                        className="block p-3 rounded-md bg-void border border-surface-border hover:border-zinc-600 transition-colors space-y-2"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-semibold text-slate-900">
                              {camp.name}
                            </span>
                            <CampaignStatusBadge stage={camp.verificationStage} />
                          </div>
                          <span className="text-[11px] font-mono text-slate-600">
                            {camp.associatedReportCount} reports
                          </span>
                        </div>
                        {camp.sharedIndicators.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {camp.sharedIndicators.slice(0, 4).map((ind) => (
                              <span
                                key={ind}
                                className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-surface border border-surface-border text-amber-900"
                              >
                                {ind}
                              </span>
                            ))}
                          </div>
                        )}
                      </Link>
                    ))}
                  </div>
                )}
              </Card>
            </div>

            {/* Right / Secondary Column (1/3) */}
            <div className="space-y-6">
              {/* Category Distribution */}
              <Card className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-orange-700" />
                    <h2 className="text-sm font-semibold text-slate-900">
                      Category Distribution
                    </h2>
                  </div>
                  <span className="text-[10px] font-mono text-slate-500">pending_reports</span>
                </div>
                <CategoryDistributionChart items={snapshot.categoryDistribution} />
              </Card>

              {/* Relevant Safety Alerts */}
              <Card className="space-y-3">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-700" />
                  <h2 className="text-sm font-semibold text-slate-900">Safety Alerts</h2>
                </div>

                {snapshot.safetyAlerts.length === 0 ? (
                  <p className="text-xs text-slate-500 py-3">
                    No verified high-severity alerts or active waves in this window.
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {snapshot.safetyAlerts.map((alert) => (
                      <Link
                        key={alert.id}
                        to={alert.href}
                        className="block p-3 rounded-md bg-rose-50 border border-rose-200 hover:border-rose-200 transition-colors space-y-1"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-rose-700 truncate">
                            {alert.title}
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 shrink-0">
                            {alert.severity}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-700 line-clamp-2">{alert.summary}</p>
                        <p className="text-[10px] font-mono text-slate-500">{alert.sourceLabel}</p>
                      </Link>
                    ))}
                  </div>
                )}
              </Card>

              {/* Recent Community Activity */}
              <Card className="space-y-3">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-emerald-600" />
                  <h2 className="text-sm font-semibold text-slate-900">
                    Recent Community Activity
                  </h2>
                </div>

                {snapshot.recentActivity.length === 0 ? (
                  <p className="text-xs text-slate-500 py-3">
                    No recent community activity recorded in this window.
                  </p>
                ) : (
                  <div className="divide-y divide-surface-border">
                    {snapshot.recentActivity.map((item) => (
                      <Link
                        key={item.id}
                        to={item.href}
                        className="block py-2.5 first:pt-0 last:pb-0 hover:text-slate-900 transition-colors"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-medium text-slate-800">{item.title}</span>
                          <span className="text-[10px] font-mono text-slate-500 shrink-0">
                            {item.timestampIso.slice(0, 10)}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 truncate mt-0.5">{item.detail}</p>
                      </Link>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
};

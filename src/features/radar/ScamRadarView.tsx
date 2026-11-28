import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Radar,
  Filter,
  ShieldAlert,
  Network,
  MapPin,
  AlertTriangle,
  Eye,
  BookOpen,
  ArrowRight,
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { CardListSkeleton } from '../../components/common/LoadingSkeleton';
import { ThreatBadge } from '../../components/common/ThreatBadge';
import { ReviewStatusBadge } from '../../components/scam/ReviewStatusBadge';
import { CampaignStatusBadge } from '../../components/campaigns/CampaignStatusBadge';
import { Button } from '../../components/ui/Button';
import { firebaseStatus } from '../../services/firebase/firebaseApp';
import {
  SCAM_CATEGORIES,
  SCAM_CATEGORY_LABELS,
  type ScamCategory,
} from '../../services/ai/analysisSchema';
import {
  fetchLiveScamRadarSnapshot,
  getSampleScamRadarSnapshot,
  type ScamRadarFilters,
  type ScamRadarSnapshot,
} from '../../services/firestore/scamRadarService';
import type { DashboardTimeWindow } from '../../services/firestore/dashboardService';

export const ScamRadarView: React.FC = () => {
  const [filters, setFilters] = useState<ScamRadarFilters>({
    category: 'ALL',
    dateWindow: '30d',
    verificationStatus: 'ALL',
  });
  const [showSamplePreview, setShowSamplePreview] = useState(false);
  const [snapshot, setSnapshot] = useState<ScamRadarSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadRadar = useCallback(async () => {
    if (showSamplePreview || !firebaseStatus.isConfigured) {
      if (showSamplePreview) {
        setSnapshot(getSampleScamRadarSnapshot(filters));
      } else {
        setSnapshot(null);
      }
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await fetchLiveScamRadarSnapshot(filters);
      setSnapshot(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to load Scam Radar data from Firestore.'
      );
    } finally {
      setLoading(false);
    }
  }, [filters, showSamplePreview]);

  useEffect(() => {
    void loadRadar();
  }, [loadRadar]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-surface-border">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-zinc-100 flex items-center gap-2">
              <Radar className="w-5 h-5 text-cyan-400" />
              <span>Scam Radar</span>
            </h1>
            {snapshot?.isSampleData ? (
              <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-amber-950/40 text-amber-300 border border-amber-500/40">
                Sample Demonstration Data
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-surface-elevated text-cyan-400 border border-surface-border">
                {firebaseStatus.isConfigured ? 'Live Firestore Discovery' : 'Setup Required'}
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Central discovery view for emerging scam categories, manipulation tactics, correlated campaigns, and community warnings.
          </p>
        </div>

        <Button
          variant={showSamplePreview ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => setShowSamplePreview((prev) => !prev)}
        >
          <Eye className="w-3.5 h-3.5" />
          <span>{showSamplePreview ? 'Exit Sample Preview' : 'Preview Sample Data'}</span>
        </Button>
      </div>

      {/* Explicit Sample Data Warning Banner */}
      {snapshot?.isSampleData && (
        <div className="p-3.5 rounded-md bg-amber-950/30 border border-amber-500/40 text-amber-200 text-xs flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-200">
              Sample Demonstration Mode — Not Live Incidents
            </p>
            <p className="text-amber-200/80 mt-0.5">
              You are viewing seeded demonstration records to preview Scam Radar. These entries
              are not real community reports and are never mixed into live Firestore counts.
            </p>
          </div>
        </div>
      )}

      {/* Filters Bar */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs font-mono text-zinc-400 shrink-0">
            <Filter className="w-3.5 h-3.5 text-cyan-400" />
            <span>Filters:</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 flex-1">
            <select
              aria-label="Filter by scam category"
              value={filters.category}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  category: e.target.value as 'ALL' | ScamCategory,
                }))
              }
              className="rounded-md bg-void border border-surface-border px-3 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-accent-violet"
            >
              <option value="ALL">All Categories</option>
              {SCAM_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {SCAM_CATEGORY_LABELS[cat]}
                </option>
              ))}
            </select>

            <select
              aria-label="Filter by date range"
              value={filters.dateWindow}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  dateWindow: e.target.value as DashboardTimeWindow,
                }))
              }
              className="rounded-md bg-void border border-surface-border px-3 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-accent-violet"
            >
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="all">All Recorded</option>
            </select>

            <select
              aria-label="Filter by verification status"
              value={filters.verificationStatus}
              onChange={(e) =>
                setFilters((f) => ({
                  ...f,
                  verificationStatus: e.target.value as 'ALL' | 'verified' | 'pending',
                }))
              }
              className="rounded-md bg-void border border-surface-border px-3 py-1.5 text-xs text-zinc-100 focus:outline-none focus:border-accent-violet"
            >
              <option value="ALL">All Verification States</option>
              <option value="verified">Verified Warnings Only</option>
              <option value="pending">Unverified / Pending Only</option>
            </select>
          </div>
        </div>
      </Card>

      {!firebaseStatus.isConfigured && !showSamplePreview ? (
        <Card className="space-y-3 border-amber-500/30 bg-amber-950/15">
          <h2 className="text-sm font-semibold text-amber-200">
            Live Firestore Discovery Unavailable
          </h2>
          <p className="text-xs text-zinc-300 leading-relaxed">
            Configure your Firebase environment variables in <code className="font-mono">.env</code>{' '}
            to query live reports and campaigns, or click <strong>Preview Sample Data</strong> above
            to explore the interface with clearly labeled demonstration data.
          </p>
        </Card>
      ) : loading ? (
        <CardListSkeleton count={3} />
      ) : error ? (
        <Card className="border-rose-500/30 bg-rose-950/20 space-y-3">
          <div className="flex items-center gap-2 text-rose-300 text-sm font-semibold">
            <AlertTriangle className="w-4 h-4" />
            <span>Unable to Load Scam Radar</span>
          </div>
          <p className="text-xs text-rose-200/80">{error}</p>
          <Button variant="secondary" size="sm" onClick={() => void loadRadar()}>
            Retry
          </Button>
        </Card>
      ) : snapshot ? (
        <div className="space-y-6">
          {/* Category Summaries & Manipulation Patterns */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-zinc-100">
                  Category Threat Summaries
                </h2>
                <span className="text-[11px] font-mono text-zinc-400">
                  {snapshot.totalMatchingReports} matching reports
                </span>
              </div>

              {snapshot.categorySummaries.length === 0 ? (
                <p className="text-xs text-zinc-500 py-4">
                  No reports match the current filters yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {snapshot.categorySummaries.map((cat) => (
                    <div
                      key={cat.category}
                      className="p-3 rounded bg-void border border-surface-border flex items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <p className="font-medium text-zinc-100">{cat.label}</p>
                        <p className="text-[11px] font-mono text-zinc-400">
                          {cat.reportCount} reports · {cat.verifiedCount} verified
                        </p>
                      </div>
                      <ThreatBadge level={cat.highestRisk} />
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card className="space-y-3">
              <h2 className="text-sm font-semibold text-zinc-100">
                Common Manipulation Patterns
              </h2>

              {snapshot.commonManipulationPatterns.length === 0 ? (
                <p className="text-xs text-zinc-500 py-4">
                  No manipulation patterns observed in the current filter window.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {snapshot.commonManipulationPatterns.map((pat) => (
                    <div key={pat.pattern} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-zinc-200">{pat.label}</span>
                        <span className="font-mono text-zinc-400">
                          {pat.count} ({pat.percentage}%)
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded bg-void border border-surface-border overflow-hidden">
                        <div
                          className="h-full bg-accent-violet/80"
                          style={{ width: `${Math.max(5, pat.percentage)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Recently Observed Campaigns & Community Warnings */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Network className="w-4 h-4 text-accent-violet-muted" />
                  <h2 className="text-sm font-semibold text-zinc-100">
                    Recently Observed Campaigns
                  </h2>
                </div>
                <Link
                  to="/campaigns"
                  className="text-xs font-mono text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-1"
                >
                  <span>Explore</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>

              {snapshot.recentCampaigns.length === 0 ? (
                <p className="text-xs text-zinc-500 py-4">
                  No correlated campaigns match these filters.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {snapshot.recentCampaigns.map((camp) => (
                    <div
                      key={camp.id}
                      className="p-3 rounded bg-void border border-surface-border space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-xs font-semibold text-zinc-100">{camp.name}</span>
                        <CampaignStatusBadge stage={camp.verificationStage} />
                      </div>
                      <p className="text-[11px] font-mono text-zinc-400">
                        {camp.associatedReportCount} associated reports ·{' '}
                        {camp.sharedIndicators.slice(0, 2).join(', ') || camp.category}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-400" />
                  <h2 className="text-sm font-semibold text-zinc-100">
                    Recent Community Warnings
                  </h2>
                </div>
                <Link
                  to="/feed"
                  className="text-xs font-mono text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-1"
                >
                  <span>Full Feed</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
              </div>

              {snapshot.recentWarnings.length === 0 ? (
                <p className="text-xs text-zinc-500 py-4">
                  No community warnings recorded in this window.
                </p>
              ) : (
                <div className="space-y-2.5">
                  {snapshot.recentWarnings.map((rep) => (
                    <div
                      key={rep.id}
                      className="p-3 rounded bg-void border border-surface-border space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <ThreatBadge level={rep.riskAssessment} />
                          <ReviewStatusBadge status={rep.verificationStatus} />
                        </div>
                        <span className="text-[10px] font-mono text-zinc-500">
                          {rep.observedDate}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-300 line-clamp-2">{rep.redactedSummary}</p>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Geographical Trends & Sparse-Data Verification Guidance */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="space-y-3">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-cyan-400" />
                <h2 className="text-sm font-semibold text-zinc-100">Geographical Trends</h2>
              </div>
              {snapshot.geographicalTrends ? (
                <div className="space-y-2">
                  {snapshot.geographicalTrends.map((geo) => (
                    <div
                      key={geo.region}
                      className="flex items-center justify-between text-xs p-2.5 rounded bg-void border border-surface-border"
                    >
                      <span className="text-zinc-200">{geo.region}</span>
                      <span className="font-mono text-cyan-300">{geo.count} reports</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-zinc-400 leading-relaxed">
                  {snapshot.geoUnavailableReason}
                </p>
              )}
            </Card>

            <Card className="space-y-2.5">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-emerald-400" />
                <h2 className="text-sm font-semibold text-zinc-100">
                  Practical Verification Baseline
                </h2>
              </div>
              <p className="text-xs text-zinc-300 leading-relaxed">
                Even when live report volume is low, verify suspicious messages independently
                before acting: never pay upfront fees to receive a job or parcel, inspect sender
                domains carefully, and use the{' '}
                <Link to="/" className="text-cyan-400 underline underline-offset-4">
                  Private Analyzer
                </Link>{' '}
                to check messages locally first.
              </p>
            </Card>
          </div>
        </div>
      ) : null}
    </div>
  );
};

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Network,
  Database,
  Calendar,
  Clock,
  ArrowRight,
  AlertTriangle,
  RefreshCw,
  Fingerprint,
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { EmptyState } from '../../components/common/EmptyState';
import { CardListSkeleton } from '../../components/common/LoadingSkeleton';
import { Button } from '../../components/ui/Button';
import { CampaignStatusBadge } from '../../components/campaigns/CampaignStatusBadge';
import { firebaseStatus } from '../../services/firebase/firebaseApp';
import {
  fetchCampaignIntelligenceList,
  type CampaignIntelligenceSummary,
  type CampaignVerificationStage,
} from '../../services/firestore/campaignIntelligenceService';
import { formatFirestoreError } from '../../utils/firestoreErrors';

function formatDateLabel(iso: string | null): string {
  if (!iso) return 'Not recorded';
  return iso.slice(0, 10);
}

function formatCategoryLabel(category: string): string {
  return category
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

export const CampaignExplorerView: React.FC = () => {
  const [campaigns, setCampaigns] = useState<CampaignIntelligenceSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stageFilter, setStageFilter] = useState<'all' | CampaignVerificationStage>('all');

  const loadCampaigns = useCallback(async () => {
    if (!firebaseStatus.isConfigured) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchCampaignIntelligenceList();
      setCampaigns(data);
    } catch (err) {
      setError(formatFirestoreError(err, 'Failed to load campaign intelligence.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCampaigns();
  }, [loadCampaigns]);

  const filteredCampaigns = useMemo(() => {
    if (stageFilter === 'all') return campaigns;
    return campaigns.filter((c) => c.verificationStage === stageFilter);
  }, [campaigns, stageFilter]);

  const stageCounts = useMemo(() => {
    return {
      all: campaigns.length,
      potential: campaigns.filter((c) => c.verificationStage === 'potential').length,
      under_review: campaigns.filter((c) => c.verificationStage === 'under_review').length,
      verified: campaigns.filter((c) => c.verificationStage === 'verified').length,
    };
  }, [campaigns]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-surface-border">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-900">
              Campaign Intelligence
            </h1>
            <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-surface-elevated text-orange-700 border border-surface-border">
              Firestore Evidence
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Evidence-based scam campaigns with deterministic report links.
          </p>
        </div>

        {firebaseStatus.isConfigured && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => void loadCampaigns()}
            disabled={loading}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
        )}
      </div>

      {/* Methodology & Status Legend */}
      <Card className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-md bg-surface-elevated text-orange-700 border border-surface-border shrink-0">
            <Fingerprint className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-800">
              Transparent Campaign Attribution
            </h2>
            <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
              Potential campaigns are never automatically marked verified. Only campaigns with
              explicit analyst review move to Under Review or Verified Campaign status.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {(
            [
              ['all', `All (${stageCounts.all})`],
              ['potential', `Potential (${stageCounts.potential})`],
              ['under_review', `Under Review (${stageCounts.under_review})`],
              ['verified', `Verified (${stageCounts.verified})`],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setStageFilter(key)}
              className={`px-2.5 py-1 rounded text-xs font-mono border transition-colors ${
                stageFilter === key
                  ? 'bg-amber-50 border-accent-violet text-slate-900'
                  : 'bg-canvas border-surface-border text-slate-600 hover:text-slate-800'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </Card>

      {/* Main Content */}
      {!firebaseStatus.isConfigured ? (
        <EmptyState
          icon={Database}
          title="Cloud Firestore Not Configured"
          description="Campaign Intelligence reads real correlated campaigns and report links from Cloud Firestore. Configure your Firebase environment variables in .env to view live campaigns."
        />
      ) : loading ? (
        <CardListSkeleton count={3} />
      ) : error ? (
        <Card className="border-rose-200 bg-rose-50 space-y-3">
          <div className="flex items-center gap-2 text-rose-700 text-sm font-semibold">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Unable to Load Campaigns</span>
          </div>
          <p className="text-xs text-rose-700 break-all">{error}</p>
          <Button variant="secondary" size="sm" onClick={() => void loadCampaigns()}>
            Retry
          </Button>
        </Card>
      ) : filteredCampaigns.length === 0 ? (
        <EmptyState
          icon={Network}
          title="No Matching Campaigns Found"
          description={
            campaigns.length === 0
              ? 'No correlated campaigns have been recorded in Firestore yet.'
              : 'No campaigns match the selected verification stage filter.'
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredCampaigns.map((camp) => (
            <Card key={camp.id} className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h3 className="text-base font-semibold text-slate-900">{camp.name}</h3>
                    <CampaignStatusBadge stage={camp.verificationStage} />
                  </div>
                  <p className="text-xs font-mono text-slate-600">
                    Category: <span className="text-slate-800">{formatCategoryLabel(camp.category)}</span>
                  </p>
                </div>

                <Link to={`/campaigns/${camp.id}`} className="shrink-0">
                  <Button variant="secondary" size="sm">
                    <span>Inspect Evidence</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </Link>
              </div>

              {/* Real Firestore Metrics */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                <div className="px-3 py-2 rounded bg-void border border-surface-border flex items-center justify-between">
                  <span className="text-slate-600">Associated Reports</span>
                  <span className="font-mono font-semibold text-slate-900">
                    {camp.associatedReportCount}
                  </span>
                </div>
                <div className="px-3 py-2 rounded bg-void border border-surface-border flex items-center justify-between">
                  <span className="text-slate-600 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-500" />
                    First Observed
                  </span>
                  <span className="font-mono text-slate-800">
                    {formatDateLabel(camp.firstObservedAt)}
                  </span>
                </div>
                <div className="px-3 py-2 rounded bg-void border border-surface-border flex items-center justify-between">
                  <span className="text-slate-600 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-500" />
                    Latest Activity
                  </span>
                  <span className="font-mono text-slate-800">
                    {formatDateLabel(camp.latestActivityAt)}
                  </span>
                </div>
              </div>

              {/* Shared Indicators */}
              <div>
                <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider block mb-1.5">
                  Shared Indicators
                </span>
                {camp.sharedIndicators.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {camp.sharedIndicators.map((indicator) => (
                      <span
                        key={indicator}
                        className="px-2 py-0.5 rounded text-[11px] font-mono bg-surface-elevated border border-surface-border text-amber-900"
                      >
                        {indicator}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">No shared indicator tags recorded.</p>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

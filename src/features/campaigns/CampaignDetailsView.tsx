import React, { useEffect, useState, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  Clock,
  Cpu,
  AlertTriangle,
  Link2,
  ShieldAlert,
  FileSearch,
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { CardListSkeleton } from '../../components/common/LoadingSkeleton';
import { Button } from '../../components/ui/Button';
import { CampaignStatusBadge } from '../../components/campaigns/CampaignStatusBadge';
import { CampaignRelationshipGraph } from '../../components/campaigns/CampaignRelationshipGraph';
import { CampaignCorroborationPanel } from '../../components/campaigns/CampaignCorroborationPanel';
import { firebaseStatus } from '../../services/firebase/firebaseApp';
import {
  fetchCampaignDetails,
  type CampaignDetailsData,
} from '../../services/firestore/campaignIntelligenceService';

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

export const CampaignDetailsView: React.FC = () => {
  const { campaignId } = useParams<{ campaignId: string }>();
  const [details, setDetails] = useState<CampaignDetailsData | null>(null);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDetails = useCallback(async () => {
    if (!campaignId || !firebaseStatus.isConfigured) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await fetchCampaignDetails(campaignId);
      setDetails(data);
      if (data && data.links.length > 0) {
        setSelectedReportId(data.links[0].reportId);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load campaign details from Firestore.'
      );
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    void loadDetails();
  }, [loadDetails]);

  if (!firebaseStatus.isConfigured) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <Link
          to="/campaigns"
          className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-800"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Campaign Intelligence</span>
        </Link>
        <Card className="border-amber-200 bg-amber-50 text-xs text-amber-800">
          Cloud Firestore is not configured in this environment. Configure <code>.env</code> to
          inspect live campaign evidence.
        </Card>
      </div>
    );
  }

  if (loading) {
    return <CardListSkeleton count={3} />;
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <Link
          to="/campaigns"
          className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-800"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Campaign Intelligence</span>
        </Link>
        <Card className="border-rose-200 bg-rose-50 space-y-3">
          <div className="flex items-center gap-2 text-rose-700 text-sm font-semibold">
            <AlertTriangle className="w-4 h-4" />
            <span>Error Loading Campaign</span>
          </div>
          <p className="text-xs text-rose-700 break-all">{error}</p>
          <Button variant="secondary" size="sm" onClick={() => void loadDetails()}>
            Retry
          </Button>
        </Card>
      </div>
    );
  }

  if (!details) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <Link
          to="/campaigns"
          className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-800"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Campaign Intelligence</span>
        </Link>
        <Card className="space-y-2 text-center py-10">
          <ShieldAlert className="w-6 h-6 text-slate-500 mx-auto" />
          <h2 className="text-sm font-semibold text-slate-800">Campaign Not Found</h2>
          <p className="text-xs text-slate-600">
            No campaign record exists in Firestore for ID{' '}
            <code className="font-mono text-slate-800">{campaignId}</code>.
          </p>
        </Card>
      </div>
    );
  }

  const { campaign, links, analysis, verificationStage } = details;
  const selectedLink = links.find((l) => l.reportId === selectedReportId) ?? links[0] ?? null;

  return (
    <div className="space-y-6">
      <div>
        <Link
          to="/campaigns"
          className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-800 mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Campaign Intelligence</span>
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-surface-border">
          <div className="space-y-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl font-semibold text-slate-900">{campaign.name}</h1>
              <CampaignStatusBadge stage={verificationStage} />
            </div>
            <p className="text-xs font-mono text-slate-600">
              Category: <span className="text-slate-800">{formatCategoryLabel(campaign.threatType)}</span>{' '}
              · ID: <span className="text-slate-700">{campaign.id}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Real Firestore Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <Card className="p-4 flex items-center justify-between">
          <span className="text-slate-600">Associated Reports</span>
          <span className="text-base font-mono font-semibold text-slate-900">
            {details.associatedReportCount}
          </span>
        </Card>
        <Card className="p-4 flex items-center justify-between">
          <span className="text-slate-600 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            First Observed
          </span>
          <span className="font-mono text-slate-800">{formatDateLabel(details.firstObservedAt)}</span>
        </Card>
        <Card className="p-4 flex items-center justify-between">
          <span className="text-slate-600 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            Latest Activity
          </span>
          <span className="font-mono text-slate-800">
            {formatDateLabel(details.latestActivityAt)}
          </span>
        </Card>
      </div>

      {/* Deterministic Relationship Graph & Evidence */}
      <Card className="space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Link2 className="w-4 h-4 text-orange-700" />
            <h2 className="text-sm font-semibold text-slate-900">
              Deterministic Report Relationships
            </h2>
          </div>
          <span className="text-[11px] font-mono text-slate-600">
            Click a node or report below to inspect supporting evidence
          </span>
        </div>

        <CampaignRelationshipGraph
          campaignName={campaign.name}
          links={links}
          selectedReportId={selectedReportId}
          onSelectReport={setSelectedReportId}
        />

        {links.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pt-2">
            <div className="lg:col-span-1 space-y-2">
              <p className="text-[11px] font-mono uppercase text-slate-600">
                Connected Reports ({links.length})
              </p>
              <div className="space-y-1.5 max-h-[280px] overflow-y-auto pr-1">
                {links.map((link) => {
                  const active = selectedLink?.reportId === link.reportId;
                  return (
                    <button
                      key={link.reportId}
                      type="button"
                      onClick={() => setSelectedReportId(link.reportId)}
                      className={`w-full text-left px-3 py-2 rounded border text-xs transition-colors ${
                        active
                          ? 'bg-amber-50 border-amber-200 text-slate-900'
                          : 'bg-void border-surface-border text-slate-700 hover:border-zinc-600'
                      }`}
                    >
                      <div className="flex items-center justify-between font-mono">
                        <span className="truncate">{link.reportId}</span>
                        <span className="text-amber-900">{link.correlationScore.toFixed(2)}</span>
                      </div>
                      <div className="text-[10px] text-slate-600 mt-0.5">
                        Link: {link.status} · {link.verificationStatus}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="lg:col-span-2 p-4 rounded-md bg-void border border-surface-border space-y-3">
              {selectedLink ? (
                <>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2">
                      <FileSearch className="w-4 h-4 text-orange-700" />
                      <h3 className="text-xs font-semibold text-slate-900 font-mono">
                        Evidence for {selectedLink.reportId}
                      </h3>
                    </div>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-surface border border-surface-border text-slate-700">
                      Score: {selectedLink.correlationScore.toFixed(2)} ({selectedLink.status})
                    </span>
                  </div>

                  <p className="text-xs text-slate-700 leading-relaxed">
                    {selectedLink.explanation}
                  </p>

                  <div>
                    <span className="text-[10px] font-mono uppercase text-slate-600 block mb-1.5">
                      Supporting Indicators
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedLink.supportingIndicators.map((ind) => (
                        <span
                          key={ind}
                          className="px-2 py-0.5 rounded text-[11px] font-mono bg-surface border border-surface-border text-amber-900"
                        >
                          {ind}
                        </span>
                      ))}
                    </div>
                  </div>
                </>
              ) : null}
            </div>
          </div>
        )}
      </Card>

      {/* Community Corroboration & Admin Moderation */}
      <CampaignCorroborationPanel
        campaignId={campaign.id}
        currentStatus={campaign.status}
        selectedReportId={selectedReportId}
        onCampaignUpdated={() => void loadDetails()}
      />

      {/* Collective AI Explanation (ONLY_IN_CLOUD, separated from deterministic links) */}
      {analysis && (
        <Card className="space-y-4 border-accent-violet/30">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-accent-violet" />
              <h2 className="text-sm font-semibold text-slate-900">
                Collective AI Explanation (Advisory)
              </h2>
            </div>
            <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-amber-50 border border-accent-violet/30 text-accent-violet">
              {analysis.modelIdentifier} · {analysis.inferenceSource}
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <h3 className="font-semibold text-slate-700 mb-1">Shared Indicators Summary</h3>
              <p className="text-slate-700 leading-relaxed">{analysis.sharedIndicatorsSummary}</p>
            </div>
            <div>
              <h3 className="font-semibold text-slate-700 mb-1">Why Reports May Be Related</h3>
              <p className="text-slate-700 leading-relaxed">{analysis.relationshipExplanation}</p>
            </div>

            {analysis.inconsistencies.length > 0 && (
              <div>
                <h3 className="font-semibold text-slate-700 mb-1">Observed Inconsistencies</h3>
                <ul className="list-disc list-inside text-slate-600 space-y-1">
                  {analysis.inconsistencies.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            {analysis.evidenceToReview.length > 0 && (
              <div>
                <h3 className="font-semibold text-slate-700 mb-1">Recommended Evidence to Review</h3>
                <ul className="list-disc list-inside text-amber-900 space-y-1">
                  {analysis.evidenceToReview.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="pt-2 border-t border-surface-border text-[11px] font-mono text-slate-600">
              Referenced Approved Reports: {analysis.referencedReportIds.join(', ')}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

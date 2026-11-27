import React, { useMemo } from 'react';
import { Fingerprint, Hash, Network, Database } from 'lucide-react';
import { Card } from '../../components/common/Card';
import { EmptyState } from '../../components/common/EmptyState';
import { useCommunityFeed } from '../../hooks/useCommunityFeed';
import { clusterThreatReports } from '../../services/campaigns/clusteringService';
import { PublicThreatDocument } from '../../services/firestore/threatConverter';
import { Timestamp } from 'firebase/firestore';

export const CampaignExplorerView: React.FC = () => {
  const { threats, isFirebaseReady } = useCommunityFeed();

  const threatDocs = useMemo<PublicThreatDocument[]>(() => {
    return threats.map((t) => ({
      id: t.id,
      reporterUid: 'community-member',
      threatLevel: t.threatLevel,
      threatCategories: [t.threatCategory],
      redactedSummary: t.redactedExcerpt,
      normalizedPatternHash: t.campaignId ? t.campaignId.replace('camp-', '') : 'unhashed',
      tacticalIndicators: [
        `Observed vector: ${t.channel.toUpperCase()}`,
        `Threat Category: ${t.threatCategory}`,
      ],
      inferenceSource: t.inferenceSource,
      channel: t.channel,
      upvotes: t.upvotes || 0,
      campaignId: t.campaignId || null,
      createdAt: Timestamp.now(),
    }));
  }, [threats]);

  const liveCampaigns = useMemo(() => {
    return clusterThreatReports(threatDocs);
  }, [threatDocs]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-surface-border">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-zinc-100">
              Correlated Campaign Clusters
            </h1>
            <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-surface-elevated text-cyan-400 border border-surface-border">
              Deterministic Matching
            </span>
          </div>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Grouping decentralized scam reports through cryptographic pattern hashes without hallucinated links.
          </p>
        </div>
      </div>

      {/* Methodology Banner */}
      <Card className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-md bg-surface-elevated text-cyan-400 border border-surface-border">
            <Fingerprint className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-zinc-200">
              Zero-Hallucination Campaign Rules
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Clusters are formed strictly from SHA-256 pattern digests of already-redacted reports, shared indicators, and verified payment handles. Hashing is used for deterministic grouping, not as guaranteed anonymization.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 text-xs font-mono text-zinc-400 shrink-0">
          <div className="px-3 py-1.5 rounded bg-canvas border border-surface-border">
            <span className="text-emerald-400">{liveCampaigns.length}</span> Clusters
          </div>
          <div className="px-3 py-1.5 rounded bg-canvas border border-surface-border">
            <span className="text-cyan-400">{threats.length}</span> Ingested Signals
          </div>
        </div>
      </Card>

      {/* Campaign Cards */}
      <div className="grid grid-cols-1 gap-4">
        {!isFirebaseReady ? (
          <EmptyState
            icon={Database}
            title="Cloud Firestore Not Configured"
            description="Campaign clustering aggregates scrubbed community reports from Cloud Firestore. Configure your Firebase environment variables in .env to view live campaign clusters."
          />
        ) : liveCampaigns.length > 0 ? (
          liveCampaigns.map((camp) => (
            <Card key={camp.id} className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-semibold text-zinc-100">{camp.name}</h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-rose-950/40 text-rose-300 border border-rose-500/30">
                      {camp.status}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 mt-0.5">{camp.threatType}</p>
                </div>

                <div className="flex items-center gap-2 text-xs font-mono">
                  <span className="px-2.5 py-1 rounded bg-canvas border border-surface-border text-zinc-300">
                    {camp.totalSignals} Signals
                  </span>
                  <span className="px-2.5 py-1 rounded bg-canvas border border-surface-border text-cyan-300 flex items-center gap-1">
                    <Hash className="w-3 h-3 text-cyan-400" />
                    <span>{camp.primaryHash.slice(0, 10)}</span>
                  </span>
                </div>
              </div>

              <div>
                <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1.5">
                  Observed Tactical Indicators (IOCs)
                </span>
                <div className="flex flex-wrap gap-2">
                  {camp.indicators.map((ioc, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded bg-canvas border border-surface-border text-xs font-mono text-zinc-300"
                    >
                      {ioc}
                    </span>
                  ))}
                </div>
              </div>
            </Card>
          ))
        ) : (
          <EmptyState
            icon={Network}
            title="No Active Campaign Clusters"
            description="Reports with matching normalized pattern hashes will cluster automatically as community signals arrive."
          />
        )}
      </div>
    </div>
  );
};

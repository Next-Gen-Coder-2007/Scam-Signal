import React, { useMemo } from 'react';
import { Fingerprint, Hash } from 'lucide-react';
import { Card } from '../../components/common/Card';
import { useCommunityFeed } from '../../hooks/useCommunityFeed';
import { clusterThreatReports } from '../../services/campaigns/clusteringService';
import { PublicThreatDocument } from '../../services/firestore/threatConverter';
import { Timestamp } from 'firebase/firestore';

export const CampaignExplorerView: React.FC = () => {
  const { threats } = useCommunityFeed();

  // Convert community feed items into PublicThreatDocuments for deterministic clustering
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

  // Execute deterministic clustering
  const liveCampaigns = useMemo(() => {
    return clusterThreatReports(threatDocs);
  }, [threatDocs]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-800/60">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-100">
              Correlated Campaign Clusters
            </h1>
            <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              Deterministic Matching
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Grouping decentralized scam reports through cryptographic pattern hashes without hallucinated links.
          </p>
        </div>
      </div>

      {/* Methodology Banner */}
      <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Fingerprint className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-200">
              Zero-Hallucination Campaign Rules
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Clusters are formed strictly through normalized SHA-256 pattern hashes, shared domains, and verified payment handles.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono text-slate-400">
          <div className="px-3 py-1.5 rounded bg-slate-950 border border-slate-800">
            <span className="text-emerald-400">{liveCampaigns.length}</span> Active Clusters
          </div>
          <div className="px-3 py-1.5 rounded bg-slate-950 border border-slate-800">
            <span className="text-cyan-400">{threats.length}</span> Total Ingested Signals
          </div>
        </div>
      </div>

      {/* Campaign Cards */}
      <div className="grid grid-cols-1 gap-4">
        {liveCampaigns.length > 0 ? (
          liveCampaigns.map((camp) => (
            <Card key={camp.id} className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-semibold text-slate-100">{camp.name}</h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-rose-950/60 text-rose-300 border border-rose-600/40">
                      {camp.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">{camp.threatType}</p>
                </div>

                <div className="flex items-center gap-2 text-xs font-mono">
                  <span className="px-2.5 py-1 rounded bg-slate-950 border border-slate-800 text-slate-300">
                    {camp.totalSignals} Signals
                  </span>
                  <span className="px-2.5 py-1 rounded bg-slate-950 border border-slate-800 text-cyan-300 flex items-center gap-1">
                    <Hash className="w-3 h-3" />
                    <span>{camp.primaryHash.slice(0, 10)}</span>
                  </span>
                </div>
              </div>

              {/* Tactical IOCs */}
              <div>
                <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Observed Tactical Indicators (IOCs)
                </span>
                <div className="flex flex-wrap gap-2">
                  {camp.indicators.map((ioc, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded bg-slate-950/80 border border-slate-800 text-xs font-mono text-slate-300"
                    >
                      {ioc}
                    </span>
                  ))}
                </div>
              </div>
            </Card>
          ))
        ) : (
          <div className="p-8 text-center border border-dashed border-slate-800 rounded-xl text-slate-500 text-xs">
            No active campaign clusters detected. Reports with matching normalized hashes will cluster automatically.
          </div>
        )}
      </div>
    </div>
  );
};

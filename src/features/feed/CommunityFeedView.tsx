import React, { useState } from 'react';
import { ThumbsUp, Hash } from 'lucide-react';
import { Card } from '../../components/common/Card';
import { ThreatBadge } from '../../components/common/ThreatBadge';
import { InferenceBadge } from '../../components/common/InferenceBadge';
import { ThreatSummaryItem } from '../../types/threat';

const DEMO_COMMUNITY_THREATS: ThreatSummaryItem[] = [
  {
    id: 'th-891',
    threatLevel: 'CRITICAL',
    confidenceScore: 96,
    threatCategory: 'BANK_IMPERSONATION',
    redactedExcerpt: 'URGENT: [REDACTED_BANK] alert. Your card [REDACTED_CARD] has been suspended. Confirm identity: http://secure-[REDACTED].xyz',
    channel: 'sms',
    inferenceSource: 'on-device',
    timestamp: '12m ago',
    upvotes: 42,
    campaignId: 'camp-axis-sms-wave-4',
  },
  {
    id: 'th-890',
    threatLevel: 'HIGH',
    confidenceScore: 89,
    threatCategory: 'JOB_TASK_FRAUD',
    redactedExcerpt: 'Part-time opportunity liking video reels. Daily payout $300. Send registration deposit to [REDACTED_UPI].',
    channel: 'whatsapp',
    inferenceSource: 'hybrid-fallback',
    timestamp: '34m ago',
    upvotes: 19,
    campaignId: 'camp-wa-task-phish',
  },
  {
    id: 'th-889',
    threatLevel: 'SUSPICIOUS',
    confidenceScore: 74,
    threatCategory: 'PARCEL_CUSTOMS_FEE',
    redactedExcerpt: 'Package tracking pending delivery fee of $1.85. Update shipping address at [REDACTED_URL]',
    channel: 'sms',
    inferenceSource: 'cloud',
    timestamp: '1h ago',
    upvotes: 11,
    campaignId: null,
  },
];

export const CommunityFeedView: React.FC = () => {
  const [filter, setFilter] = useState<'all' | 'critical' | 'sms' | 'whatsapp'>('all');

  const filteredThreats = DEMO_COMMUNITY_THREATS.filter((t) => {
    if (filter === 'critical') return t.threatLevel === 'CRITICAL';
    if (filter === 'sms') return t.channel === 'sms';
    if (filter === 'whatsapp') return t.channel === 'whatsapp';
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-800/60">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-100">
              Community Threat Intelligence
            </h1>
            <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-rose-500/10 text-rose-400 border border-rose-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
              Live Signals
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Zero-PII scrubbed scam signatures corroborated by collective user reports.
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-900 rounded-lg border border-slate-800">
          {(['all', 'critical', 'sms', 'whatsapp'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-3 py-1 text-xs rounded font-medium transition-all uppercase ${
                filter === tab
                  ? 'bg-slate-800 text-slate-100 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Threat List */}
      <div className="space-y-3">
        {filteredThreats.map((threat) => (
          <Card
            key={threat.id}
            glow={threat.threatLevel === 'CRITICAL' ? 'rose' : threat.threatLevel === 'HIGH' ? 'amber' : 'none'}
            className="hover:border-slate-700 transition-all duration-150"
          >
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <ThreatBadge level={threat.threatLevel} score={threat.confidenceScore} />
                <InferenceBadge source={threat.inferenceSource} />
                <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-slate-800 text-slate-400 border border-slate-700">
                  {threat.channel}
                </span>
                <span className="text-xs text-slate-500 font-mono">{threat.timestamp}</span>
              </div>

              {threat.campaignId && (
                <div className="flex items-center gap-1 text-[11px] font-mono text-cyan-400 bg-cyan-950/40 border border-cyan-800/40 px-2 py-0.5 rounded">
                  <Hash className="w-3 h-3" />
                  <span>{threat.campaignId}</span>
                </div>
              )}
            </div>

            {/* Sanitized Excerpt */}
            <div className="mt-3 p-3 rounded-lg bg-slate-950/80 border border-slate-800/80 font-mono text-xs text-slate-300 leading-relaxed">
              {threat.redactedExcerpt}
            </div>

            {/* Card Footer */}
            <div className="mt-3 flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800/60">
              <div className="flex items-center gap-4">
                <button className="flex items-center gap-1.5 hover:text-emerald-400 transition-colors">
                  <ThumbsUp className="w-3.5 h-3.5" />
                  <span>{threat.upvotes} Corroborations</span>
                </button>
                <span className="text-slate-600">|</span>
                <span className="text-[11px] text-slate-500">Category: {threat.threatCategory}</span>
              </div>

              <span className="text-[10px] font-mono text-slate-500">
                Hash: {threat.id.toUpperCase()}
              </span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

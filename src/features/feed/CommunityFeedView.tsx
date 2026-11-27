import React, { useState } from 'react';
import {
  Hash,
  Plus,
  AlertTriangle,
  Database,
  RefreshCw,
  Radio,
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { ThreatBadge } from '../../components/common/ThreatBadge';
import { InferenceBadge } from '../../components/common/InferenceBadge';
import { EmptyState } from '../../components/common/EmptyState';
import { Button } from '../../components/ui/Button';
import { AuthModal } from '../../components/auth/AuthModal';
import { CommunityReportModal } from '../../components/scam/CommunityReportModal';
import { useCommunityFeed } from '../../hooks/useCommunityFeed';
import { useAuth } from '../../context/AuthContext';

export const CommunityFeedView: React.FC = () => {
  const { threats, loading, error, isFirebaseReady, refresh } = useCommunityFeed();
  const { user } = useAuth();

  const [filter, setFilter] = useState<'all' | 'critical' | 'sms' | 'whatsapp'>('all');
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const filteredThreats = threats.filter((t) => {
    if (filter === 'critical') return t.threatLevel === 'CRITICAL';
    if (filter === 'sms') return t.channel === 'sms';
    if (filter === 'whatsapp') return t.channel === 'whatsapp';
    return true;
  });

  const handleOpenSubmit = () => {
    if (!isFirebaseReady || !user) {
      setIsAuthModalOpen(true);
      return;
    }
    setIsSubmitModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-surface-border">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-zinc-100">
              Community Threat Intelligence
            </h1>
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-surface-elevated text-zinc-300 border border-surface-border">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isFirebaseReady ? 'bg-emerald-400' : 'bg-amber-400'
                }`}
              />
              {isFirebaseReady ? `Firestore (${threats.length})` : 'Local Mode'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Redacted, user-consented scam reports corroborated by the community.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-1 p-1 bg-surface rounded-md border border-surface-border">
            {(['all', 'critical', 'sms', 'whatsapp'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setFilter(tab)}
                className={`px-2.5 py-1 text-[11px] rounded font-medium transition-colors uppercase ${
                  filter === tab
                    ? 'bg-surface-elevated text-zinc-100 border border-surface-subtle'
                    : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {isFirebaseReady && (
            <Button variant="secondary" size="sm" onClick={refresh} disabled={loading}>
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </Button>
          )}

          <Button variant="primary" onClick={handleOpenSubmit}>
            <Plus className="w-3.5 h-3.5" />
            <span>Submit Signal</span>
          </Button>
        </div>
      </div>

      {/* Unconfigured State */}
      {!isFirebaseReady ? (
        <EmptyState
          icon={Database}
          title="Cloud Firestore Not Configured"
          description="Community threat feed synchronization requires Firebase configuration. Add your Firebase project keys to .env (see .env.example) to read and publish scrubbed community signals."
          action={{
            label: 'View Setup Instructions',
            onClick: () => setIsAuthModalOpen(true),
          }}
        />
      ) : error ? (
        <div className="p-4 rounded-lg bg-rose-950/30 border border-rose-500/35 text-rose-200 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
          <Button variant="danger" size="sm" onClick={refresh}>
            Retry
          </Button>
        </div>
      ) : loading ? (
        <Card className="p-8 text-center text-xs text-zinc-400">
          Loading scrubbed threat signals from Cloud Firestore...
        </Card>
      ) : filteredThreats.length === 0 ? (
        <EmptyState
          icon={Radio}
          title="No Threat Signals Found"
          description="No scrubbed threat reports match the selected filter in Cloud Firestore yet. Sign in and submit the first signal to help protect the community."
          action={{
            label: 'Submit Signal',
            onClick: handleOpenSubmit,
          }}
        />
      ) : (
        <div className="space-y-3">
          {filteredThreats.map((threat) => (
            <Card
              key={threat.id}
              variant={
                threat.threatLevel === 'CRITICAL'
                  ? 'critical'
                  : threat.threatLevel === 'HIGH'
                  ? 'warning'
                  : 'default'
              }
              className="hover:border-surface-subtle transition-colors duration-150"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <ThreatBadge level={threat.threatLevel} />
                  <InferenceBadge source={threat.inferenceSource} />
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-surface-elevated text-zinc-400 border border-surface-border">
                    {threat.channel}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-950/30 text-amber-300 border border-amber-500/25">
                    Pending Review
                  </span>
                  <span className="text-xs text-zinc-500 font-mono">{threat.timestamp}</span>
                </div>

                {threat.campaignId && (
                  <div className="flex items-center gap-1 text-[11px] font-mono text-cyan-300 bg-canvas border border-surface-border px-2 py-0.5 rounded">
                    <Hash className="w-3 h-3 text-cyan-400" />
                    <span>{threat.campaignId}</span>
                  </div>
                )}
              </div>

              <div className="mt-3 p-3 rounded-md bg-canvas border border-surface-border font-mono text-xs text-zinc-300 leading-relaxed">
                {threat.redactedExcerpt}
              </div>

              <div className="mt-3 flex items-center justify-between text-xs text-zinc-400 pt-2.5 border-t border-surface-border">
                <div className="flex items-center gap-4">
                  <span className="text-[11px] text-zinc-400 font-mono">
                    Status: Pending Triage
                  </span>
                  <span className="text-surface-subtle">|</span>
                  <span className="text-[11px] text-zinc-500">
                    Category: {threat.threatCategory}
                  </span>
                </div>

                <span className="text-[10px] font-mono text-zinc-500">
                  ID: {threat.id}
                </span>
              </div>
            </Card>
          ))}
        </div>
      )}

      <CommunityReportModal
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        onSubmitted={() => {
          void refresh();
        }}
      />

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </div>
  );
};

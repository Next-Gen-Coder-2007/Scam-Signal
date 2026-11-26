import React, { useState } from 'react';
import { ThumbsUp, Hash, Plus, ShieldCheck, Lock } from 'lucide-react';
import { Card } from '../../components/common/Card';
import { ThreatBadge } from '../../components/common/ThreatBadge';
import { InferenceBadge } from '../../components/common/InferenceBadge';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import { Select, Textarea } from '../../components/ui/Input';
import { useCommunityFeed } from '../../hooks/useCommunityFeed';
import { ThreatLevel } from '../../types/threat';
import { redactPII } from '../../utils/redactor';

export const CommunityFeedView: React.FC = () => {
  const { threats, upvoteThreat, submitThreat } = useCommunityFeed();
  const [filter, setFilter] = useState<'all' | 'critical' | 'sms' | 'whatsapp'>('all');
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);

  const [newContent, setNewContent] = useState('');
  const [newChannel, setNewChannel] = useState<'sms' | 'email' | 'whatsapp' | 'call' | 'web'>('sms');
  const [newThreatLevel, setNewThreatLevel] = useState<ThreatLevel>('CRITICAL');
  const [newCategory, setNewCategory] = useState('BANK_IMPERSONATION');

  const filteredThreats = threats.filter((t) => {
    if (filter === 'critical') return t.threatLevel === 'CRITICAL';
    if (filter === 'sms') return t.channel === 'sms';
    if (filter === 'whatsapp') return t.channel === 'whatsapp';
    return true;
  });

  const handleSubmitNewReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim()) return;

    await submitThreat({
      rawContent: newContent,
      channel: newChannel,
      threatLevel: newThreatLevel,
      threatCategory: newCategory,
    });

    setNewContent('');
    setIsSubmitModalOpen(false);
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
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-surface-elevated text-rose-300 border border-surface-border">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
              Live Signals ({threats.length})
            </span>
          </div>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Zero-PII scrubbed scam signatures corroborated by collective user reports.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
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

          <Button variant="primary" onClick={() => setIsSubmitModalOpen(true)}>
            <Plus className="w-3.5 h-3.5" />
            <span>Submit Signal</span>
          </Button>
        </div>
      </div>

      {/* Threat List */}
      <div className="space-y-3">
        {filteredThreats.map((threat) => (
          <Card
            key={threat.id}
            variant={threat.threatLevel === 'CRITICAL' ? 'critical' : threat.threatLevel === 'HIGH' ? 'warning' : 'default'}
            className="hover:border-surface-subtle transition-colors duration-150"
          >
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <ThreatBadge level={threat.threatLevel} score={threat.confidenceScore} />
                <InferenceBadge source={threat.inferenceSource} />
                <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-surface-elevated text-zinc-400 border border-surface-border">
                  {threat.channel}
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
                <button
                  type="button"
                  onClick={() => upvoteThreat(threat.id)}
                  className="flex items-center gap-1.5 hover:text-cyan-300 transition-colors cursor-pointer"
                >
                  <ThumbsUp className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{threat.upvotes || 0} Corroborations</span>
                </button>
                <span className="text-surface-subtle">|</span>
                <span className="text-[11px] text-zinc-500">Category: {threat.threatCategory}</span>
              </div>

              <span className="text-[10px] font-mono text-zinc-500">
                Hash: {threat.id.toUpperCase()}
              </span>
            </div>
          </Card>
        ))}
      </div>

      {/* Submit Threat Dialog */}
      <Dialog
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        title="Submit Anonymized Scam Signal"
        description="PII is automatically scrubbed on-device before publishing."
        icon={<ShieldCheck className="w-4 h-4 text-emerald-400" />}
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsSubmitModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="submit-threat-form"
              variant="primary"
              disabled={!newContent.trim()}
            >
              Publish Scrubbed Signal
            </Button>
          </>
        }
      >
        <form id="submit-threat-form" onSubmit={handleSubmitNewReport} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Select
              label="Threat Channel"
              value={newChannel}
              onChange={(e) => setNewChannel(e.target.value as 'sms' | 'email' | 'whatsapp' | 'call' | 'web')}
            >
              <option value="sms">SMS</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="email">Email</option>
              <option value="call">Phone Call</option>
              <option value="web">Web URL</option>
            </Select>

            <Select
              label="Severity Assessment"
              value={newThreatLevel}
              onChange={(e) => setNewThreatLevel(e.target.value as ThreatLevel)}
            >
              <option value="CRITICAL">Critical Threat</option>
              <option value="HIGH">High Risk</option>
              <option value="SUSPICIOUS">Suspicious</option>
            </Select>
          </div>

          <Select
            label="Threat Category"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
          >
            <option value="BANK_IMPERSONATION">Bank Impersonation</option>
            <option value="JOB_TASK_FRAUD">Job / Task Deposit Scam</option>
            <option value="PARCEL_CUSTOMS_FEE">Parcel Customs Delivery Fee</option>
            <option value="UTILITY_DISCONNECT">Utility / Bill Threat</option>
          </Select>

          <Textarea
            label="Scam Content"
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder="Paste the scam message. PII will be scrubbed automatically before submission."
            rows={4}
            required
          />

          {newContent.trim() && (
            <div className="p-3 rounded-md bg-canvas border border-emerald-500/30 text-[11px] font-mono text-emerald-300">
              <div className="flex items-center gap-1.5 text-zinc-400 mb-1 font-sans font-semibold">
                <Lock className="w-3.5 h-3.5 text-emerald-400" />
                <span>Scrubbed preview that will be published:</span>
              </div>
              {redactPII(newContent)}
            </div>
          )}
        </form>
      </Dialog>
    </div>
  );
};

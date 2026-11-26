import React, { useState } from 'react';
import { ThumbsUp, Hash, Plus, ShieldCheck, Lock, X } from 'lucide-react';
import { Card } from '../../components/common/Card';
import { ThreatBadge } from '../../components/common/ThreatBadge';
import { InferenceBadge } from '../../components/common/InferenceBadge';
import { useCommunityFeed } from '../../hooks/useCommunityFeed';
import { ThreatLevel } from '../../types/threat';
import { redactPII } from '../../utils/redactor';

export const CommunityFeedView: React.FC = () => {
  const { threats, upvoteThreat, submitThreat } = useCommunityFeed();
  const [filter, setFilter] = useState<'all' | 'critical' | 'sms' | 'whatsapp'>('all');
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);

  // New report form state
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-800/60">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-100">
              Community Threat Intelligence
            </h1>
            <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-rose-500/10 text-rose-400 border border-rose-500/30">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
              Live Signals ({threats.length})
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Zero-PII scrubbed scam signatures corroborated by collective user reports.
          </p>
        </div>

        {/* Action Row */}
        <div className="flex items-center gap-3">
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

          <button
            onClick={() => setIsSubmitModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Submit Signal</span>
          </button>
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
                <button
                  onClick={() => upvoteThreat(threat.id)}
                  className="flex items-center gap-1.5 hover:text-emerald-400 transition-colors cursor-pointer"
                >
                  <ThumbsUp className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{threat.upvotes || 0} Corroborations</span>
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

      {/* Submit Threat Modal with Mandatory Redaction Guarantee */}
      {isSubmitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-xl rounded-xl bg-slate-900 border border-slate-800 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-slate-100">
                  Submit Anonymized Scam Signal
                </h3>
              </div>
              <button
                onClick={() => setIsSubmitModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitNewReport} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Threat Channel</label>
                  <select
                    value={newChannel}
                    onChange={(e) => setNewChannel(e.target.value as any)}
                    className="w-full rounded bg-slate-950 border border-slate-800 p-2 text-slate-200"
                  >
                    <option value="sms">SMS</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="email">Email</option>
                    <option value="call">Phone Call</option>
                    <option value="web">Web URL</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Severity Assessment</label>
                  <select
                    value={newThreatLevel}
                    onChange={(e) => setNewThreatLevel(e.target.value as any)}
                    className="w-full rounded bg-slate-950 border border-slate-800 p-2 text-slate-200"
                  >
                    <option value="CRITICAL">Critical Threat</option>
                    <option value="HIGH">High Risk</option>
                    <option value="SUSPICIOUS">Suspicious</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Threat Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full rounded bg-slate-950 border border-slate-800 p-2 text-slate-200"
                  >
                    <option value="BANK_IMPERSONATION">Bank Impersonation</option>
                    <option value="JOB_TASK_FRAUD">Job / Task Deposit Scam</option>
                    <option value="PARCEL_CUSTOMS_FEE">Parcel Customs Delivery Fee</option>
                    <option value="UTILITY_DISCONNECT">Utility / Bill Threat</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Scam Content</label>
                <textarea
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="Paste the scam message. PII will be scrubbed automatically before submission."
                  rows={4}
                  className="w-full rounded bg-slate-950 border border-slate-800 p-3 text-slate-200 font-mono resize-none focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                  required
                />
              </div>

              {/* Real-time Redacted Preview */}
              {newContent.trim() && (
                <div className="p-3 rounded bg-slate-950/80 border border-emerald-500/30 text-[11px] font-mono text-emerald-300">
                  <div className="flex items-center gap-1.5 text-slate-400 mb-1 font-sans font-semibold">
                    <Lock className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Scrubbed preview that will be published:</span>
                  </div>
                  {redactPII(newContent)}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsSubmitModalOpen(false)}
                  className="px-4 py-2 rounded bg-slate-800 text-slate-300 hover:bg-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newContent.trim()}
                  className="px-4 py-2 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold disabled:opacity-50"
                >
                  Publish Scrubbed Signal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

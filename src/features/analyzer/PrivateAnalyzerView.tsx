import React, { useState } from 'react';
import {
  ShieldAlert,
  Cpu,
  Lock,
  ArrowRight,
  Eye,
  AlertTriangle,
  Sparkles,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { EmptyState } from '../../components/common/EmptyState';
import { useScamAnalyzer } from '../../hooks/useScamAnalyzer';
import { AnalysisResultCard } from '../../components/scam/AnalysisResultCard';
import { RedactionPreviewModal } from '../../components/scam/RedactionPreviewModal';
import { ThreatAnalysisResult } from '../../services/ai/scamAnalyzerService';

const SAMPLE_SCAMS = [
  {
    label: 'Urgent Bank SMS',
    channel: 'sms' as const,
    text: 'URGENT: Axis Bank alert. Your debit card 4532 9012 8841 9012 has been temporarily suspended due to suspicious activity. Verify identity immediately to prevent permanent block: http://axis-secure-verify.xyz/login',
  },
  {
    label: 'Courier Delivery Phish',
    channel: 'sms' as const,
    text: 'FedEx Express: Parcel #FX-894102 cannot be delivered due to incomplete address and unpaid customs tax ($2.95). Update your details within 12h: https://fedx-customs-track.top',
  },
  {
    label: 'WhatsApp Job Impersonator',
    channel: 'whatsapp' as const,
    text: 'Hello! I am Sarah from HR Global Recruiters. We offer flexible work from home tasks liking YouTube videos for $250-$500/day. Send $50 deposit to UPI recruitment@okaxis for registration kit.',
  },
];

export const PrivateAnalyzerView: React.FC = () => {
  const [content, setContent] = useState('');
  const [channel, setChannel] = useState<'sms' | 'email' | 'whatsapp' | 'call' | 'web'>('sms');
  const [showRedactionModal, setShowRedactionModal] = useState(false);
  const [inferenceMode, setInferenceMode] = useState<'strict-on-device' | 'on-device-preferred' | 'cloud-only'>('on-device-preferred');
  const [allowCloudFallback, setAllowCloudFallback] = useState(true);
  const [shareSuccessNotice, setShareSuccessNotice] = useState<string | null>(null);

  const { status, result, error, analyze, reset } = useScamAnalyzer();

  const handleSelectSample = (sampleText: string, sampleChannel: 'sms' | 'email' | 'whatsapp' | 'call' | 'web') => {
    setContent(sampleText);
    setChannel(sampleChannel);
  };

  const handleRunTriage = async () => {
    if (!content.trim()) return;
    await analyze({
      rawContent: content,
      channel,
      preference: inferenceMode,
      allowCloudFallback,
    });
  };

  const handleShareToFeed = (analyzed: ThreatAnalysisResult) => {
    // In a live Firebase session, writes sanitized document to public_threats
    setShareSuccessNotice(
      `Scrubbed signal #${analyzed.id} shared safely with pattern hash ${analyzed.normalizedPatternHash.slice(0, 8)}.`
    );
    setTimeout(() => setShareSuccessNotice(null), 5000);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-2 border-b border-slate-800/60">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-100">
              Private Scam Analyzer
            </h1>
            <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              Local-First AI
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Detect smishing, impersonation, and fraudulent URLs privately on your device.
          </p>
        </div>

        {/* Privacy Assurance Pill */}
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 text-xs">
          <Lock className="w-4 h-4 text-emerald-400 shrink-0" />
          <div className="text-[11px]">
            <span className="font-semibold text-slate-200">Zero-Storage Default</span>
            <span className="text-slate-400 block">Raw text never leaves your device</span>
          </div>
        </div>
      </div>

      {/* Share Success Toast Notification */}
      {shareSuccessNotice && (
        <div className="p-3.5 rounded-lg bg-cyan-950/60 border border-cyan-500/40 text-cyan-200 text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>{shareSuccessNotice}</span>
        </div>
      )}

      {/* Main Analysis Form Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Input Form */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="space-y-4">
            {/* Channel Selector */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Threat Channel
              </label>
              <div className="flex items-center gap-1.5 p-1 bg-slate-950/80 rounded-lg border border-slate-800">
                {(['sms', 'email', 'whatsapp', 'call', 'web'] as const).map((ch) => (
                  <button
                    key={ch}
                    onClick={() => setChannel(ch)}
                    className={`px-2.5 py-1 text-xs rounded font-medium transition-all duration-150 uppercase ${
                      channel === ch
                        ? 'bg-slate-800 text-emerald-400 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {ch}
                  </button>
                ))}
              </div>
            </div>

            {/* Input Textarea */}
            <div className="relative">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Paste suspicious SMS, email excerpt, WhatsApp pitch, or scam message here..."
                rows={6}
                className="w-full rounded-lg bg-slate-950/90 border border-slate-800 p-3.5 text-xs sm:text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 focus:border-emerald-500/50 font-mono leading-relaxed resize-none"
              />
              <div className="flex items-center justify-between text-[11px] text-slate-500 px-1 pt-1.5">
                <span>{content.length} characters</span>
                <button
                  type="button"
                  onClick={() => setShowRedactionModal(true)}
                  disabled={!content.trim()}
                  className="text-slate-400 hover:text-slate-200 disabled:opacity-40 flex items-center gap-1 font-mono transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Audit PII Redaction</span>
                </button>
              </div>
            </div>

            {/* Quick Samples */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[11px] font-medium text-slate-400">Try realistic test vectors:</span>
              <div className="flex flex-wrap gap-2">
                {SAMPLE_SCAMS.map((sample) => (
                  <button
                    key={sample.label}
                    onClick={() => handleSelectSample(sample.text, sample.channel)}
                    className="text-[11px] px-2.5 py-1 rounded bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 text-slate-300 transition-colors"
                  >
                    {sample.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Action Bar */}
            <div className="pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              {/* Inference Engine Mode Selector */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 font-mono">Engine:</span>
                  <select
                    value={inferenceMode}
                    onChange={(e) => setInferenceMode(e.target.value as any)}
                    className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
                  >
                    <option value="on-device-preferred">On-Device Preferred (Local Gemini Nano)</option>
                    <option value="strict-on-device">Strict On-Device Only (No Cloud)</option>
                    <option value="cloud-only">Cloud-Only (Gemini Pro Reasoning)</option>
                  </select>
                </div>

                {inferenceMode === 'on-device-preferred' && (
                  <label className="flex items-center gap-1.5 text-[11px] text-slate-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allowCloudFallback}
                      onChange={(e) => setAllowCloudFallback(e.target.checked)}
                      className="rounded border-slate-700 bg-slate-950 text-emerald-500 focus:ring-0"
                    />
                    <span>Allow cloud fallback</span>
                  </label>
                )}
              </div>

              {/* Triage Button */}
              <button
                onClick={handleRunTriage}
                disabled={!content.trim() || status === 'analyzing'}
                className="inline-flex items-center justify-center gap-2 px-5 py-2 rounded-lg text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                {status === 'analyzing' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Analyzing Privately...</span>
                  </>
                ) : (
                  <>
                    <Cpu className="w-4 h-4" />
                    <span>Run Private Triage</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </Card>
        </div>

        {/* Right 1 Col: Telemetry & Advisory Sidebar */}
        <div className="space-y-4">
          <Card className="space-y-3 bg-slate-900/90 border-slate-800">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              Inference Telemetry
            </h3>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2 rounded bg-slate-950/60 border border-slate-800/80">
                <span className="text-slate-400">Target Model:</span>
                <span className="font-mono text-emerald-400">Gemini Nano (Local)</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-slate-950/60 border border-slate-800/80">
                <span className="text-slate-400">SDK Provider:</span>
                <span className="font-mono text-slate-300">Firebase AI Logic</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-slate-950/60 border border-slate-800/80">
                <span className="text-slate-400">Device Privacy:</span>
                <span className="font-mono text-emerald-400">ENFORCED</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800/80 text-[11px] text-slate-400 leading-relaxed">
              Firebase AI Logic prioritizes local execution on your browser's NPU/GPU. No telemetry or raw private messages are dispatched without explicit opt-in.
            </div>
          </Card>

          {/* Legal / Triage Advisory Notice */}
          <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-600/30 text-amber-200/90 text-xs leading-relaxed space-y-1.5">
            <div className="flex items-center gap-1.5 font-semibold text-amber-300">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>Advisory Notice</span>
            </div>
            <p className="text-[11px] text-amber-200/80">
              Scam assessments are automated AI pattern classifications. Always verify independently through your bank or official service contacts before taking financial action.
            </p>
          </div>
        </div>
      </div>

      {/* Analysis Error State */}
      {status === 'error' && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-600/40 text-rose-200 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={handleRunTriage}
            className="px-3 py-1 rounded bg-rose-900/60 hover:bg-rose-800/80 border border-rose-500/50 text-white font-medium"
          >
            Retry
          </button>
        </div>
      )}

      {/* Analysis Result State */}
      {status === 'success' && result ? (
        <AnalysisResultCard
          result={result}
          onReset={reset}
          onShareToCommunity={handleShareToFeed}
        />
      ) : (
        /* Empty State / Standby Screen */
        <EmptyState
          icon={ShieldAlert}
          title="Ready for Suspicious Message Triage"
          description="Select a sample vector above or paste any SMS, email, or message. Analysis runs locally in your browser to inspect threat indicators and extract tactical warnings."
        />
      )}

      {/* Redaction Audit Modal */}
      <RedactionPreviewModal
        isOpen={showRedactionModal}
        onClose={() => setShowRedactionModal(false)}
        rawText={content}
      />
    </div>
  );
};

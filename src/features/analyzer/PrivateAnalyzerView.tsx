import React, { useState } from 'react';
import {
  ShieldAlert,
  Cpu,
  Lock,
  ArrowRight,
  Eye,
  AlertTriangle,
  Sparkles,
  CheckCircle2,
  Download,
  XCircle,
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { EmptyState } from '../../components/common/EmptyState';
import { Button } from '../../components/ui/Button';
import { Textarea, Select } from '../../components/ui/Input';
import { useScamAnalyzer } from '../../hooks/useScamAnalyzer';
import { AnalysisResultCard } from '../../components/scam/AnalysisResultCard';
import { RedactionPreviewModal } from '../../components/scam/RedactionPreviewModal';
import { ThreatAnalysisResult } from '../../services/ai/scamAnalyzerService';
import { InferenceMode, CLOUD_MODEL_ID } from '../../services/ai/firebaseAILogic';
import { firebaseStatus } from '../../services/firebase/firebaseApp';

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
  const [inferenceMode, setInferenceMode] = useState<InferenceMode>(
    InferenceMode.PREFER_ON_DEVICE
  );
  const [shareSuccessNotice, setShareSuccessNotice] = useState<string | null>(null);

  const {
    status,
    downloadProgress,
    result,
    error,
    errorCode,
    analyze,
    cancel,
    reset,
  } = useScamAnalyzer();

  const handleSelectSample = (
    sampleText: string,
    sampleChannel: 'sms' | 'email' | 'whatsapp' | 'call' | 'web'
  ) => {
    setContent(sampleText);
    setChannel(sampleChannel);
  };

  const handleRunTriage = async () => {
    if (!content.trim()) return;
    await analyze({
      rawContent: content,
      channel,
      mode: inferenceMode,
    });
  };

  const handleShareToFeed = (analyzed: ThreatAnalysisResult) => {
    setShareSuccessNotice(
      `Scrubbed signal #${analyzed.id} prepared with pattern hash ${analyzed.normalizedPatternHash.slice(0, 8)}. Use Threat Feed to publish to Cloud Firestore.`
    );
    setTimeout(() => setShareSuccessNotice(null), 5000);
  };

  const isBusy = status === 'analyzing' || status === 'downloading';

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-4 border-b border-surface-border">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-zinc-100">
              Private Scam Analyzer
            </h1>
            <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-surface-elevated text-cyan-400 border border-surface-border">
              Firebase AI Logic
            </span>
          </div>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Detect smishing, impersonation, and fraudulent URLs with explicit inference-mode routing.
          </p>
        </div>

        <div className="flex items-center gap-2.5 px-3 py-2 rounded-md bg-surface border border-surface-border text-xs">
          <Lock className="w-4 h-4 text-emerald-400 shrink-0" />
          <div className="text-[11px]">
            <span className="font-semibold text-zinc-200 block">Client-Side Scrubbing</span>
            <span className="text-zinc-400">PII redacted before inference</span>
          </div>
        </div>
      </div>

      {/* Share Notice */}
      {shareSuccessNotice && (
        <div className="p-3 rounded-md bg-cyan-950/30 border border-cyan-500/35 text-cyan-200 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>{shareSuccessNotice}</span>
        </div>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Input Form */}
        <div className="lg:col-span-2">
          <Card className="space-y-4">
            {/* Channel Selector */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                Threat Channel
              </span>
              <div className="flex items-center gap-1 p-1 bg-canvas rounded-md border border-surface-border">
                {(['sms', 'email', 'whatsapp', 'call', 'web'] as const).map((ch) => (
                  <button
                    key={ch}
                    type="button"
                    onClick={() => setChannel(ch)}
                    className={`px-2.5 py-1 text-[11px] rounded font-medium transition-colors uppercase ${
                      channel === ch
                        ? 'bg-surface-elevated text-zinc-100 border border-surface-subtle'
                        : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
                    }`}
                  >
                    {ch}
                  </button>
                ))}
              </div>
            </div>

            {/* Textarea */}
            <div>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Paste suspicious SMS, email excerpt, WhatsApp pitch, or scam message here..."
                rows={6}
              />
              <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-1.5">
                <span className="font-mono">{content.length} chars</span>
                <button
                  type="button"
                  onClick={() => setShowRedactionModal(true)}
                  disabled={!content.trim()}
                  className="text-zinc-400 hover:text-cyan-300 disabled:opacity-40 flex items-center gap-1 font-mono transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Audit PII Redaction</span>
                </button>
              </div>
            </div>

            {/* Quick Samples */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-medium text-zinc-400 block">
                Sample vectors:
              </span>
              <div className="flex flex-wrap gap-2">
                {SAMPLE_SCAMS.map((sample) => (
                  <Button
                    key={sample.label}
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => handleSelectSample(sample.text, sample.channel)}
                  >
                    {sample.label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Action Bar */}
            <div className="pt-3 border-t border-surface-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="w-full sm:w-72">
                <Select
                  aria-label="Firebase AI Logic Inference Mode"
                  value={inferenceMode}
                  onChange={(e) => setInferenceMode(e.target.value as InferenceMode)}
                >
                  <option value={InferenceMode.PREFER_ON_DEVICE}>
                    PREFER_ON_DEVICE (Local + Cloud Fallback)
                  </option>
                  <option value={InferenceMode.ONLY_ON_DEVICE}>
                    ONLY_ON_DEVICE (Strict Local Only)
                  </option>
                  <option value={InferenceMode.ONLY_IN_CLOUD}>
                    ONLY_IN_CLOUD (Collective Cloud Model)
                  </option>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                {isBusy && (
                  <Button variant="secondary" size="md" onClick={cancel}>
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Cancel</span>
                  </Button>
                )}
                <Button
                  variant="primary"
                  onClick={handleRunTriage}
                  disabled={!content.trim() || isBusy}
                  isLoading={isBusy}
                >
                  {!isBusy && <Cpu className="w-3.5 h-3.5" />}
                  <span>
                    {status === 'downloading'
                      ? 'Downloading Model...'
                      : status === 'analyzing'
                      ? 'Analyzing...'
                      : 'Run Private Triage'}
                  </span>
                  {!isBusy && <ArrowRight className="w-3.5 h-3.5" />}
                </Button>
              </div>
            </div>

            {/* Model Download Progress */}
            {status === 'downloading' && (
              <div className="p-3 rounded-md bg-canvas border border-surface-border space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-zinc-300 flex items-center gap-1.5">
                    <Download className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Downloading on-device Gemini Nano model...</span>
                  </span>
                  <span className="font-mono text-cyan-400">
                    {downloadProgress ?? 0}%
                  </span>
                </div>
                <div className="w-full h-1.5 bg-surface-elevated rounded-full overflow-hidden">
                  <div
                    className="h-full bg-cyan-400 transition-all duration-150"
                    style={{ width: `${downloadProgress ?? 0}%` }}
                  />
                </div>
              </div>
            )}
          </Card>
        </div>

        {/* Telemetry & Advisory Sidebar */}
        <div className="space-y-4">
          <Card className="space-y-3">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-accent-violet-muted" />
              Inference Telemetry
            </h3>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2 rounded bg-canvas border border-surface-border">
                <span className="text-zinc-400">Selected Mode</span>
                <span className="font-mono text-cyan-300">{inferenceMode}</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-canvas border border-surface-border">
                <span className="text-zinc-400">Cloud Fallback</span>
                <span className="font-mono text-zinc-200">{CLOUD_MODEL_ID}</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-canvas border border-surface-border">
                <span className="text-zinc-400">SDK Status</span>
                <span
                  className={`font-mono ${
                    firebaseStatus.isConfigured ? 'text-emerald-400' : 'text-amber-400'
                  }`}
                >
                  {firebaseStatus.isConfigured ? 'CONFIGURED' : 'UNCONFIGURED'}
                </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-canvas border border-surface-border">
                <span className="text-zinc-400">Last Source</span>
                <span className="font-mono text-zinc-200">
                  {result ? result.inferenceSource : 'not_run'}
                </span>
              </div>
            </div>

            <p className="pt-2 border-t border-surface-border text-[11px] text-zinc-400 leading-relaxed">
              The runtime inference source is captured directly from{' '}
              <code className="font-mono text-zinc-300">result.response.inferenceSource</code>{' '}
              and is never simulated.
            </p>
          </Card>

          <div className="p-3.5 rounded-lg bg-amber-950/20 border border-amber-500/25 text-amber-200/90 text-xs leading-relaxed space-y-1.5">
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

      {/* Error State */}
      {status === 'error' && (
        <div className="p-4 rounded-lg bg-rose-950/30 border border-rose-500/35 text-rose-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              {errorCode && (
                <span className="block font-mono text-[10px] text-rose-300 uppercase">
                  Error Code: {errorCode}
                </span>
              )}
              <span>{error}</span>
            </div>
          </div>
          <Button variant="danger" size="sm" onClick={handleRunTriage} className="shrink-0">
            Retry
          </Button>
        </div>
      )}

      {/* Result or Empty State */}
      {status === 'success' && result ? (
        <AnalysisResultCard
          result={result}
          onReset={reset}
          onShareToCommunity={handleShareToFeed}
        />
      ) : (
        <EmptyState
          icon={ShieldAlert}
          title="Ready for Suspicious Message Triage"
          description="Select a sample vector above or paste any SMS, email, or message. Firebase AI Logic routes the request according to your selected InferenceMode."
        />
      )}

      <RedactionPreviewModal
        isOpen={showRedactionModal}
        onClose={() => setShowRedactionModal(false)}
        rawText={content}
      />
    </div>
  );
};

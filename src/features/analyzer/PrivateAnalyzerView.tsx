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
  Eraser,
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { EmptyState } from '../../components/common/EmptyState';
import { Button } from '../../components/ui/Button';
import { Textarea, Select } from '../../components/ui/Input';
import { useScamAnalyzer } from '../../hooks/useScamAnalyzer';
import { AnalysisResultCard } from '../../components/scam/AnalysisResultCard';
import { RedactionPreviewModal } from '../../components/scam/RedactionPreviewModal';
import { CommunityReportModal } from '../../components/scam/CommunityReportModal';
import {
  ThreatAnalysisResult,
  AnalyzerChannel,
} from '../../services/ai/scamAnalyzerService';
import { InferenceMode, CLOUD_MODEL_ID } from '../../services/ai/firebaseAILogic';
import { firebaseStatus } from '../../services/firebase/firebaseApp';
import {
  validateAnalyzerInput,
  MAX_MESSAGE_LENGTH,
} from '../../utils/validation';

const CHANNELS: Array<{ id: AnalyzerChannel; label: string }> = [
  { id: 'sms', label: 'SMS' },
  { id: 'whatsapp', label: 'WhatsApp' },
  { id: 'email', label: 'Email' },
  { id: 'job_offer', label: 'Job Offer' },
  { id: 'payment_request', label: 'Payment Request' },
];

const EXAMPLE_MESSAGES: Array<{
  label: string;
  channel: AnalyzerChannel;
  text: string;
}> = [
  {
    label: 'Bank Alert SMS (Scam)',
    channel: 'sms',
    text: 'URGENT: Axis Bank alert. Your debit card 4532 9012 8841 9012 has been temporarily suspended due to suspicious activity. Verify identity immediately to prevent permanent block: http://axis-secure-verify.xyz/login',
  },
  {
    label: 'Remote Job Offer (Scam)',
    channel: 'job_offer',
    text: 'Hello! I am Sarah from HR Global Recruiters. Earn $300/day liking YouTube videos from home. To activate your employee portal, send a refundable $50 deposit to UPI recruitment@okaxis.',
  },
  {
    label: 'Delivery Fee (Scam)',
    channel: 'payment_request',
    text: 'FedEx Express: Parcel #FX-894102 cannot be delivered due to unpaid customs tax ($2.95). Pay within 12h at https://fedx-customs-track.top or parcel returns.',
  },
  {
    label: 'Legitimate Appointment',
    channel: 'sms',
    text: 'Reminder: Your dental checkup with Dr. Patel at Oakwood Clinic is scheduled for Thursday at 10:30 AM. Reply YES to confirm or call our front desk if you need to reschedule.',
  },
  {
    label: 'Ambiguous Message',
    channel: 'whatsapp',
    text: 'Hi, did you get a chance to review the updated schedule I sent over earlier this week? Let me know when you have a minute.',
  },
];

export const PrivateAnalyzerView: React.FC = () => {
  const [content, setContent] = useState('');
  const [channel, setChannel] = useState<AnalyzerChannel>('sms');
  const [showRedactionModal, setShowRedactionModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportTarget, setReportTarget] = useState<ThreatAnalysisResult | null>(null);
  const [inferenceMode, setInferenceMode] = useState<InferenceMode>(
    InferenceMode.PREFER_ON_DEVICE
  );
  const [validationError, setValidationError] = useState<string | null>(null);
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

  const handleContentChange = (value: string) => {
    setContent(value);
    if (validationError) {
      setValidationError(null);
    }
  };

  const handleSelectExample = (example: (typeof EXAMPLE_MESSAGES)[number]) => {
    setContent(example.text);
    setChannel(example.channel);
    setValidationError(null);
  };

  const handleClear = () => {
    setContent('');
    setValidationError(null);
    reset();
  };

  const handleRunTriage = async () => {
    const check = validateAnalyzerInput(content);
    if (!check.valid) {
      setValidationError(check.error);
      return;
    }
    setValidationError(null);
    await analyze({
      rawContent: content,
      channel,
      mode: inferenceMode,
    });
  };

  const handleSwitchToPreferOnDeviceAndRetry = async () => {
    setInferenceMode(InferenceMode.PREFER_ON_DEVICE);
    const check = validateAnalyzerInput(content);
    if (!check.valid) return;
    await analyze({
      rawContent: content,
      channel,
      mode: InferenceMode.PREFER_ON_DEVICE,
    });
  };

  const handleShareToFeed = (analyzed: ThreatAnalysisResult) => {
    setReportTarget(analyzed);
    setShowReportModal(true);
  };

  const mapChannelForReport = (
    ch: AnalyzerChannel
  ): 'sms' | 'email' | 'whatsapp' | 'call' | 'web' => {
    if (ch === 'sms' || ch === 'email' || ch === 'whatsapp' || ch === 'call' || ch === 'web') {
      return ch;
    }
    return ch === 'job_offer' ? 'web' : 'sms';
  };

  const isBusy = status === 'analyzing' || status === 'downloading';
  const isOverLimit = content.length > MAX_MESSAGE_LENGTH;
  const isNearLimit = content.length >= MAX_MESSAGE_LENGTH - 300;

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
              PREFER_ON_DEVICE
            </span>
          </div>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Paste suspicious SMS, WhatsApp messages, emails, job offers, or payment requests for instant triage.
          </p>
        </div>

        <div className="flex items-center gap-2.5 px-3 py-2 rounded-md bg-surface border border-surface-border text-xs">
          <Lock className="w-4 h-4 text-emerald-400 shrink-0" />
          <div className="text-[11px]">
            <span className="font-semibold text-zinc-200 block">Client-Side Scrubbing</span>
            <span className="text-zinc-400">Personal details redacted before analysis</span>
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
                Message Type
              </span>
              <div className="flex flex-wrap items-center gap-1 p-1 bg-canvas rounded-md border border-surface-border">
                {CHANNELS.map((ch) => (
                  <button
                    key={ch.id}
                    type="button"
                    onClick={() => setChannel(ch.id)}
                    className={`px-2.5 py-1 text-[11px] rounded font-medium transition-colors ${
                      channel === ch.id
                        ? 'bg-surface-elevated text-zinc-100 border border-surface-subtle'
                        : 'text-zinc-400 hover:text-zinc-200 border border-transparent'
                    }`}
                  >
                    {ch.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Textarea & Validation */}
            <div>
              <Textarea
                aria-label="Suspicious message content"
                value={content}
                onChange={(e) => handleContentChange(e.target.value)}
                placeholder="Paste a suspicious SMS, WhatsApp message, email, job offer, or payment request here..."
                rows={6}
                error={validationError ?? undefined}
              />
              <div className="flex items-center justify-between text-[11px] pt-1.5">
                <span
                  className={`font-mono ${
                    isOverLimit
                      ? 'text-rose-400 font-semibold'
                      : isNearLimit
                      ? 'text-amber-400'
                      : 'text-zinc-500'
                  }`}
                >
                  {content.length.toLocaleString()} / {MAX_MESSAGE_LENGTH.toLocaleString()} chars
                </span>
                <div className="flex items-center gap-3">
                  {content.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClear}
                      className="text-zinc-400 hover:text-zinc-200 flex items-center gap-1 font-mono transition-colors"
                    >
                      <Eraser className="w-3.5 h-3.5" />
                      <span>Clear</span>
                    </button>
                  )}
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
            </div>

            {/* Example Messages */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-medium text-zinc-400 block">
                Load an example message:
              </span>
              <div className="flex flex-wrap gap-2">
                {EXAMPLE_MESSAGES.map((example) => (
                  <Button
                    key={example.label}
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => handleSelectExample(example)}
                  >
                    {example.label}
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
                  disabled={isBusy || isOverLimit}
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
              Scam assessments are automated AI pattern classifications. Always verify independently using official phone numbers or apps before taking financial action.
            </p>
          </div>
        </div>
      </div>

      {/* Error Recovery State */}
      {status === 'error' && (
        <div className="p-4 rounded-lg bg-rose-950/30 border border-rose-500/35 text-rose-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              {errorCode && (
                <span className="block font-mono text-[10px] text-rose-300 uppercase">
                  Error Code: {errorCode}
                </span>
              )}
              <p>{error}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {(errorCode === 'LOCAL_MODEL_UNAVAILABLE' ||
              errorCode === 'UNSUPPORTED_BROWSER') &&
              inferenceMode === InferenceMode.ONLY_ON_DEVICE && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleSwitchToPreferOnDeviceAndRetry}
                >
                  Allow Cloud Fallback
                </Button>
              )}
            <Button variant="secondary" size="sm" onClick={reset}>
              Dismiss
            </Button>
            <Button variant="danger" size="sm" onClick={handleRunTriage}>
              Retry
            </Button>
          </div>
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
          description="Select an example message above or paste any SMS, WhatsApp message, email, job offer, or payment request. Firebase AI Logic analyzes it using PREFER_ON_DEVICE."
        />
      )}

      <RedactionPreviewModal
        isOpen={showRedactionModal}
        onClose={() => setShowRedactionModal(false)}
        rawText={content}
      />

      <CommunityReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        initialRawContent={content}
        initialChannel={mapChannelForReport(channel)}
        initialThreatLevel={reportTarget?.riskLevel ?? 'SUSPICIOUS'}
        initialCategory={reportTarget?.scamCategory ?? 'phishing'}
        initialIndicators={reportTarget?.manipulationPatterns ?? []}
        initialEvidence={reportTarget?.observedEvidence ?? []}
        onSubmitted={(item) => {
          setShareSuccessNotice(
            `Pending report #${item.id} submitted with your consent (awaiting analyst verification).`
          );
          setTimeout(() => setShareSuccessNotice(null), 5000);
        }}
      />
    </div>
  );
};

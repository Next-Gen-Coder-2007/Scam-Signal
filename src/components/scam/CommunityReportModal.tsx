import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Lock,
  AlertTriangle,
  Wand2,
  Eye,
  LogIn,
} from 'lucide-react';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';
import { Input, Select, Textarea } from '../ui/Input';
import { ThreatLevel, ThreatSummaryItem } from '../../types/threat';
import {
  inspectAndRedactPII,
  containsPII,
  redactPII,
  RedactionSummaryItem,
} from '../../utils/redactor';
import {
  submitPendingReport,
  DuplicateReportError,
} from '../../services/firestore/threatService';
import { ReportVisibility } from '../../services/firestore/threatConverter';
import { firebaseStatus } from '../../services/firebase/firebaseApp';
import { useAuth } from '../../context/AuthContext';
import { AuthModal } from '../auth/AuthModal';

interface CommunityReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialRawContent?: string;
  initialChannel?: 'sms' | 'email' | 'whatsapp' | 'call' | 'web';
  initialThreatLevel?: ThreatLevel;
  initialCategory?: string;
  initialIndicators?: string[];
  initialEvidence?: string[];
  onSubmitted?: (item: ThreatSummaryItem) => void;
}

function getTodayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

export const CommunityReportModal: React.FC<CommunityReportModalProps> = ({
  isOpen,
  onClose,
  initialRawContent = '',
  initialChannel = 'sms',
  initialThreatLevel = 'SUSPICIOUS',
  initialCategory = 'phishing',
  initialIndicators = [],
  initialEvidence = [],
  onSubmitted,
}) => {
  const { user } = useAuth();
  const [channel, setChannel] = useState<'sms' | 'email' | 'whatsapp' | 'call' | 'web'>(initialChannel);
  const [threatLevel, setThreatLevel] = useState<ThreatLevel>(initialThreatLevel);
  const [category, setCategory] = useState(initialCategory);
  const [observedDate, setObservedDate] = useState(getTodayDateString());
  const [visibility, setVisibility] = useState<ReportVisibility>('community_public');
  const [editedText, setEditedText] = useState('');
  const [autoRedactions, setAutoRedactions] = useState<RedactionSummaryItem[]>([]);
  const [hasConsented, setHasConsented] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const inspection = inspectAndRedactPII(initialRawContent);
    setEditedText(inspection.redactedText);
    setAutoRedactions(inspection.redactions);
    setChannel(initialChannel);
    setThreatLevel(initialThreatLevel);
    setCategory(initialCategory);
    setObservedDate(getTodayDateString());
    setVisibility('community_public');
    setHasConsented(false);
    setSubmitError(null);
  }, [isOpen, initialRawContent, initialChannel, initialThreatLevel, initialCategory]);

  const remainingPII = containsPII(editedText);
  const scrubbedEvidence = initialEvidence.map((e) => redactPII(e)).filter(Boolean);

  const handleRerunRedactor = () => {
    const inspection = inspectAndRedactPII(editedText);
    setEditedText(inspection.redactedText);
    setAutoRedactions((prev) => {
      const merged = [...prev];
      for (const item of inspection.redactions) {
        if (!merged.some((m) => m.label === item.label)) {
          merged.push(item);
        }
      }
      return merged;
    });
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editedText.trim() || remainingPII || !hasConsented) return;
    if (!firebaseStatus.isConfigured || !user) {
      setAuthModalOpen(true);
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    try {
      const created = await submitPendingReport({
        reporterUid: user.uid,
        rawContent: editedText,
        category,
        indicators: initialIndicators,
        evidence: scrubbedEvidence,
        riskAssessment: threatLevel,
        observedDate,
        visibility,
        inferenceSource: 'on_device',
        channel,
      });

      onSubmitted?.({
        id: created.id || `rep-${Date.now()}`,
        threatLevel: created.riskAssessment,
        confidenceScore: 0,
        threatCategory: created.category,
        redactedExcerpt: created.redactedSummary,
        channel: created.channel,
        inferenceSource: created.inferenceSource,
        timestamp: created.observedDate,
        upvotes: 0,
        campaignId: null,
      });
      onClose();
    } catch (err: unknown) {
      if (err instanceof DuplicateReportError) {
        setSubmitError(err.message);
      } else {
        setSubmitError(
          err instanceof Error ? err.message : 'Failed to publish community report.'
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  const canPublish =
    Boolean(editedText.trim()) &&
    !remainingPII &&
    hasConsented &&
    Boolean(observedDate) &&
    firebaseStatus.isConfigured &&
    Boolean(user);

  return (
    <>
      <Dialog
        isOpen={isOpen}
        onClose={onClose}
        title="Submit Redacted Scam Observation"
        description="Submitted as a pending report (never auto-verified). Edit the redacted text before publishing."
        icon={<ShieldCheck className="w-4 h-4 text-emerald-400" />}
        maxWidth="2xl"
        footer={
          <>
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="community-report-form"
              variant="primary"
              disabled={!canPublish}
              isLoading={submitting}
            >
              Submit Pending Report
            </Button>
          </>
        }
      >
        <form id="community-report-form" onSubmit={handlePublish} className="space-y-4">
          {submitError && (
            <div className="p-3 rounded-md bg-rose-950/35 border border-rose-500/35 text-rose-200 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{submitError}</span>
            </div>
          )}

          {/* Auto-redaction summary */}
          {autoRedactions.length > 0 && (
            <div className="p-2.5 rounded-md bg-emerald-950/20 border border-emerald-500/25 text-xs flex flex-wrap items-center gap-2">
              <span className="text-emerald-300 font-medium flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" />
                Auto-redacted:
              </span>
              {autoRedactions.map((item) => (
                <span
                  key={item.label}
                  className="px-2 py-0.5 rounded bg-canvas border border-surface-border font-mono text-[11px] text-emerald-200"
                >
                  {item.label} ({item.count})
                </span>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Select
              label="Channel"
              value={channel}
              onChange={(e) =>
                setChannel(
                  e.target.value as 'sms' | 'email' | 'whatsapp' | 'call' | 'web'
                )
              }
            >
              <option value="sms">SMS</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="email">Email</option>
              <option value="call">Phone Call</option>
              <option value="web">Web URL</option>
            </Select>

            <Select
              label="Risk Assessment"
              value={threatLevel}
              onChange={(e) => setThreatLevel(e.target.value as ThreatLevel)}
            >
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High Risk</option>
              <option value="SUSPICIOUS">Suspicious</option>
              <option value="UNKNOWN">Ambiguous</option>
            </Select>

            <Select
              label="Category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="job_scam">Job Scam</option>
              <option value="phishing">Phishing</option>
              <option value="impersonation">Impersonation</option>
              <option value="investment_fraud">Investment Fraud</option>
              <option value="payment_fraud">Payment Fraud</option>
              <option value="delivery_scam">Delivery Scam</option>
              <option value="suspicious_links">Suspicious Links</option>
            </Select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Observed Date"
              type="date"
              value={observedDate}
              max={getTodayDateString()}
              onChange={(e) => setObservedDate(e.target.value)}
              required
            />

            <Select
              label="Visibility Preference"
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as ReportVisibility)}
            >
              <option value="community_public">Community Public Feed (Redacted)</option>
              <option value="analysts_only">Analysts Only (Private Triage)</option>
            </Select>
          </div>

          {/* Editable Redacted Preview */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-300 flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-cyan-400" />
                Editable Redacted Observation
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRerunRedactor}
              >
                <Wand2 className="w-3 h-3" />
                <span>Re-run Auto-Redaction</span>
              </Button>
            </div>
            <Textarea
              value={editedText}
              onChange={(e) => setEditedText(e.target.value)}
              placeholder="Paste or edit the redacted message text before publishing..."
              rows={4}
              error={
                remainingPII
                  ? 'Personal information (phone, email, UPI, address, ID, or OTP) is still detected. Please redact it before publishing.'
                  : undefined
              }
              required
            />
          </div>

          {/* Transparent Data-Sharing Explanation */}
          <div className="p-3 rounded-md bg-canvas border border-surface-border text-[11px] text-zinc-400 space-y-1.5 leading-relaxed">
            <p className="font-semibold text-zinc-200">
              What will be stored in Firestore (<code className="font-mono text-cyan-300">pending_reports</code>):
            </p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>
                <strong className="text-zinc-300">Stored:</strong> Your edited redacted summary, category, indicators, sanitized evidence quotes, risk assessment, observed date, visibility preference, server timestamp, and <code className="font-mono">verificationStatus: &quot;pending&quot;</code>.
              </li>
              <li>
                <strong className="text-zinc-300">Kept Private:</strong> Your original unredacted message, any personal details you removed, and your email address.
              </li>
            </ul>
          </div>

          {/* Firebase / Auth Guard */}
          {(!firebaseStatus.isConfigured || !user) && (
            <div className="p-3 rounded-md bg-amber-950/25 border border-amber-500/30 text-amber-200 text-xs flex items-center justify-between gap-3">
              <span>
                {!firebaseStatus.isConfigured
                  ? 'Cloud Firestore is not configured in .env. Community publishing is disabled.'
                  : 'Sign in with Firebase Auth to submit a pending community report.'}
              </span>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setAuthModalOpen(true)}
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>{firebaseStatus.isConfigured ? 'Sign In' : 'Setup Info'}</span>
              </Button>
            </div>
          )}

          {/* Explicit User Consent Checkbox */}
          <label className="flex items-start gap-2.5 p-3 rounded-md bg-surface-elevated border border-surface-border text-xs text-zinc-200 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={hasConsented}
              onChange={(e) => setHasConsented(e.target.checked)}
              className="mt-0.5 rounded border-surface-subtle bg-canvas text-accent-violet focus:ring-violet-500"
            />
            <span>
              I have reviewed and edited the redacted text above, understand what data will be stored under <code className="font-mono text-zinc-300">{visibility}</code> visibility, and explicitly consent to submit this pending report.
            </span>
          </label>
        </form>
      </Dialog>

      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
    </>
  );
};

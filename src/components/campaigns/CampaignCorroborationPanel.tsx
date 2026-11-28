import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle2,
  Flag,
  Shield,
  AlertTriangle,
  ThumbsUp,
  Lock,
} from 'lucide-react';
import { Card } from '../common/Card';
import { Button } from '../ui/Button';
import { useAuth } from '../../context/AuthContext';
import {
  ALLOWED_CAMPAIGN_TRANSITIONS,
  getCampaignCorroborationSummary,
  moderateCampaignDisputeAdmin,
  submitCampaignConfirmation,
  submitCampaignDispute,
  type CampaignCorroborationSummary,
} from '../../services/firestore/corroborationService';
import { callModerateCampaignStatus } from '../../services/firestore/adminModerationService';
import type { CampaignDocument } from '../../services/firestore/threatConverter';

interface CampaignCorroborationPanelProps {
  campaignId: string;
  currentStatus: CampaignDocument['status'];
  selectedReportId: string | null;
  onCampaignUpdated?: () => void;
}

export const CampaignCorroborationPanel: React.FC<CampaignCorroborationPanelProps> = ({
  campaignId,
  currentStatus,
  selectedReportId,
  onCampaignUpdated,
}) => {
  const { user } = useAuth();
  const [summary, setSummary] = useState<CampaignCorroborationSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showDisputeForm, setShowDisputeForm] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  const loadSummary = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getCampaignCorroborationSummary(campaignId, user?.uid);
      setSummary(data);
    } catch (err) {
      setFeedback({
        type: 'error',
        message:
          err instanceof Error ? err.message : 'Unable to load corroboration records.',
      });
    } finally {
      setLoading(false);
    }
  }, [campaignId, user?.uid]);

  useEffect(() => {
    void loadSummary();
  }, [loadSummary]);

  const handleConfirm = async () => {
    if (!user) return;
    setSubmitting(true);
    setFeedback(null);
    try {
      await submitCampaignConfirmation({ campaignId, userUid: user.uid });
      setFeedback({
        type: 'success',
        message: 'Your encounter confirmation has been recorded.',
      });
      await loadSummary();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to submit confirmation.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDisputeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSubmitting(true);
    setFeedback(null);
    try {
      await submitCampaignDispute({
        campaignId,
        userUid: user.uid,
        targetReportId: selectedReportId,
        reason: disputeReason,
      });
      setDisputeReason('');
      setShowDisputeForm(false);
      setFeedback({
        type: 'success',
        message: 'Your dispute has been logged for analyst moderation.',
      });
      await loadSummary();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to submit dispute.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusTransition = async (nextStatus: CampaignDocument['status']) => {
    if (!user?.isAdmin) return;
    setSubmitting(true);
    setFeedback(null);
    try {
      await callModerateCampaignStatus({
        campaignId,
        nextStatus,
        reason: `Campaign status updated from details panel (${currentStatus} -> ${nextStatus})`,
      });
      setFeedback({
        type: 'success',
        message: `Campaign status updated to ${nextStatus} and logged.`,
      });
      onCampaignUpdated?.();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Status transition failed.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleModerateDispute = async (
    disputeId: string,
    decision: 'reviewed_upheld' | 'reviewed_dismissed'
  ) => {
    if (!user?.isAdmin) return;
    setSubmitting(true);
    setFeedback(null);
    try {
      await moderateCampaignDisputeAdmin({
        disputeId,
        decision,
        isAdmin: user.isAdmin,
      });
      setFeedback({
        type: 'success',
        message: `Dispute marked as ${decision}.`,
      });
      await loadSummary();
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to moderate dispute.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const allowedTransitions = ALLOWED_CAMPAIGN_TRANSITIONS[currentStatus] ?? [];

  return (
    <Card className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Community Corroboration</h2>
          <p className="text-xs text-slate-600">
            Counts reflect only stored confirmation and dispute records (max 1 per user).
          </p>
        </div>

        {summary && !loading && (
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="px-2.5 py-1 rounded bg-emerald-50 border border-emerald-200 text-emerald-700">
              {summary.confirmationCount} Confirmations
            </span>
            <span className="px-2.5 py-1 rounded bg-amber-50 border border-amber-200 text-amber-800">
              {summary.disputeCount} Disputes ({summary.openDisputeCount} open)
            </span>
          </div>
        )}
      </div>

      {feedback && (
        <div
          className={`p-3 rounded-md text-xs flex items-start gap-2 border ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
              : 'bg-rose-50 border-rose-200 text-rose-700'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {!user ? (
        <div className="p-3.5 rounded-md bg-void border border-surface-border flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-700">
            <Lock className="w-3.5 h-3.5 text-slate-600" />
            <span>Sign in to confirm a similar encounter or dispute a connection.</span>
          </div>
          <Link to="/auth">
            <Button variant="secondary" size="sm">
              Sign In
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              variant="primary"
              size="sm"
              disabled={submitting || loading || Boolean(summary?.userHasConfirmed)}
              onClick={() => void handleConfirm()}
            >
              <ThumbsUp className="w-3.5 h-3.5" />
              <span>
                {summary?.userHasConfirmed
                  ? 'Encounter Confirmed'
                  : 'I Encountered Similar'}
              </span>
            </Button>

            <Button
              variant="secondary"
              size="sm"
              disabled={submitting || loading || Boolean(summary?.userHasDisputed)}
              onClick={() => setShowDisputeForm((prev) => !prev)}
            >
              <Flag className="w-3.5 h-3.5 text-amber-800" />
              <span>
                {summary?.userHasDisputed ? 'Dispute Submitted' : 'Dispute Connection'}
              </span>
            </Button>
          </div>

          {showDisputeForm && !summary?.userHasDisputed && (
            <form
              onSubmit={handleDisputeSubmit}
              className="p-3.5 rounded-md bg-void border border-surface-border space-y-3"
            >
              <label className="block text-xs font-medium text-slate-700">
                Explain why this campaign or report connection appears inaccurate (no PII, 10–500 chars)
              </label>
              <textarea
                value={disputeReason}
                onChange={(e) => setDisputeReason(e.target.value)}
                minLength={10}
                maxLength={500}
                required
                rows={3}
                placeholder="e.g., These two reports reference unrelated organizations..."
                className="w-full rounded-md bg-surface border border-surface-border px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-accent-violet"
              />
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDisputeForm(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" isLoading={submitting}>
                  Submit Dispute
                </Button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Trusted Admin Moderation Controls */}
      {user?.isAdmin && (
        <div className="pt-4 border-t border-surface-border space-y-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-800">
            <Shield className="w-4 h-4" />
            <span>Administrative Moderation Controls</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-600 mr-1">Transition Status:</span>
            {allowedTransitions.map((nextStatus) => (
              <Button
                key={nextStatus}
                variant="secondary"
                size="sm"
                disabled={submitting}
                onClick={() => void handleStatusTransition(nextStatus)}
              >
                Set {nextStatus}
              </Button>
            ))}
          </div>

          {summary && summary.disputes.filter((d) => d.moderationStatus === 'open').length > 0 && (
            <div className="space-y-2">
              <p className="text-[11px] font-mono uppercase text-slate-600">Open Disputes</p>
              {summary.disputes
                .filter((d) => d.moderationStatus === 'open')
                .map((d) => (
                  <div
                    key={d.id}
                    className="p-3 rounded bg-void border border-surface-border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                  >
                    <p className="text-slate-700">{d.reason}</p>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={submitting}
                        onClick={() =>
                          d.id && void handleModerateDispute(d.id, 'reviewed_upheld')
                        }
                      >
                        Uphold
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={submitting}
                        onClick={() =>
                          d.id && void handleModerateDispute(d.id, 'reviewed_dismissed')
                        }
                      >
                        Dismiss
                      </Button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}
    </Card>
  );
};

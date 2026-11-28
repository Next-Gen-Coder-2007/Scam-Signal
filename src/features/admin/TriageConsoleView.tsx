import React, { useEffect, useState, useCallback } from 'react';
import {
  CheckCircle2,
  Lock,
  RefreshCw,
  AlertTriangle,
  Shield,
  FileText,
  Link2,
  History,
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { CardListSkeleton } from '../../components/common/LoadingSkeleton';
import { ThreatBadge } from '../../components/common/ThreatBadge';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../../components/ui/Table';
import { firebaseStatus } from '../../services/firebase/firebaseApp';
import {
  callModerateCampaignLink,
  callModerateCampaignStatus,
  callModeratePendingReport,
  fetchCampaignsForModeration,
  fetchCandidateLinksForModeration,
  fetchModerationAuditLogs,
  fetchPendingReportsForModeration,
  type ModerationAuditLogEntry,
} from '../../services/firestore/adminModerationService';
import type {
  CampaignDocument,
  PendingReportDocument,
  ReportCampaignLinkDocument,
} from '../../services/firestore/threatConverter';
import { formatFirestoreError } from '../../utils/firestoreErrors';

type PendingConfirmationAction =
  | {
      kind: 'report';
      reportId: string;
      decision: 'verified' | 'rejected';
      title: string;
      description: string;
    }
  | {
      kind: 'link';
      linkId: string;
      nextStatus: 'confirmed' | 'dismissed';
      nextVerificationStatus: 'verified' | 'unverified';
      title: string;
      description: string;
    }
  | {
      kind: 'campaign';
      campaignId: string;
      nextStatus: CampaignDocument['status'];
      title: string;
      description: string;
    };

export const TriageConsoleView: React.FC = () => {
  const [reports, setReports] = useState<PendingReportDocument[]>([]);
  const [links, setLinks] = useState<ReportCampaignLinkDocument[]>([]);
  const [campaigns, setCampaigns] = useState<CampaignDocument[]>([]);
  const [auditLogs, setAuditLogs] = useState<ModerationAuditLogEntry[]>([]);

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [selectedReport, setSelectedReport] = useState<PendingReportDocument | null>(null);
  const [confirmAction, setConfirmAction] = useState<PendingConfirmationAction | null>(null);
  const [auditReason, setAuditReason] = useState('');

  const loadConsoleData = useCallback(async () => {
    if (!firebaseStatus.isConfigured) return;
    setLoading(true);
    setError(null);
    try {
      const [repData, linkData, campData, logData] = await Promise.all([
        fetchPendingReportsForModeration(),
        fetchCandidateLinksForModeration(),
        fetchCampaignsForModeration(),
        fetchModerationAuditLogs(),
      ]);
      setReports(repData);
      setLinks(linkData);
      setCampaigns(campData);
      setAuditLogs(logData);
    } catch (err) {
      setError(
        formatFirestoreError(err, 'Unable to load moderation console data. Verify admin permissions.')
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadConsoleData();
  }, [loadConsoleData]);

  const executeConfirmedAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmAction) return;

    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);
    const reason = auditReason.trim() || 'Admin triage decision';

    try {
      if (confirmAction.kind === 'report') {
        await callModeratePendingReport({
          reportId: confirmAction.reportId,
          decision: confirmAction.decision,
          reason,
        });
        setSuccessMsg(
          `Report ${confirmAction.reportId} marked as ${confirmAction.decision} and logged.`
        );
      } else if (confirmAction.kind === 'link') {
        await callModerateCampaignLink({
          linkId: confirmAction.linkId,
          nextStatus: confirmAction.nextStatus,
          nextVerificationStatus: confirmAction.nextVerificationStatus,
          reason,
        });
        setSuccessMsg(
          `Campaign link ${confirmAction.linkId} updated to ${confirmAction.nextStatus} and logged.`
        );
      } else {
        await callModerateCampaignStatus({
          campaignId: confirmAction.campaignId,
          nextStatus: confirmAction.nextStatus,
          reason,
        });
        setSuccessMsg(
          `Campaign ${confirmAction.campaignId} transitioned to ${confirmAction.nextStatus} and logged.`
        );
      }

      setConfirmAction(null);
      setAuditReason('');
      await loadConsoleData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Moderation operation failed.');
      setConfirmAction(null);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-surface-border">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-900">
              Administrative Moderation Console
            </h1>
            <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-surface-elevated text-amber-800 border border-surface-border">
              Server-Verified Admin Claims
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Review pending reports, campaign links, and audit logs.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-surface border border-surface-border text-xs font-mono text-emerald-600">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Claims Enforced</span>
          </div>
          {firebaseStatus.isConfigured && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => void loadConsoleData()}
              disabled={loading}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </Button>
          )}
        </div>
      </div>

      {/* Security Boundary Notice */}
      <Card>
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-md bg-surface-elevated text-amber-600 border border-surface-border shrink-0">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-800">
              Trusted Server-Side Authorization &amp; Audit Logging
            </h2>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              All report approvals, campaign link confirmations, and status transitions execute
              through Cloud Functions verifying <code className="text-orange-700 font-mono">request.auth.token.admin === true</code>.
              Admin privileges cannot be granted via user-editable Firestore fields, and every action writes an immutable record to <code className="text-orange-700 font-mono">moderation_audit_logs</code>.
            </p>
          </div>
        </div>
      </Card>

      {error && (
        <div className="p-3.5 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {!firebaseStatus.isConfigured ? (
        <Card className="text-xs text-amber-800 border-amber-200 bg-amber-50">
          Configure Firebase environment variables in <code className="font-mono">.env</code> to
          connect to Firestore and Cloud Functions moderation endpoints.
        </Card>
      ) : loading && reports.length === 0 && campaigns.length === 0 ? (
        <CardListSkeleton count={3} />
      ) : (
        <div className="space-y-6">
          {/* 1. Pending Reports Queue */}
          <Card className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-orange-700" />
                <h2 className="text-sm font-semibold text-slate-900">
                  Pending Reports Queue ({reports.length})
                </h2>
              </div>
            </div>

            {reports.length === 0 ? (
              <p className="text-xs text-slate-500 py-3">No pending reports awaiting review.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Report</TableHead>
                    <TableHead>Category &amp; Risk</TableHead>
                    <TableHead>Sanitized Summary</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((rep) => (
                    <TableRow key={rep.id}>
                      <TableCell className="font-mono text-xs text-slate-700">
                        <div>{rep.id?.slice(0, 14)}</div>
                        <div className="text-[10px] text-slate-500">{rep.observedDate}</div>
                      </TableCell>
                      <TableCell className="space-y-1">
                        <ThreatBadge level={rep.riskAssessment} />
                        <div className="text-[11px] font-mono text-slate-600">
                          {rep.category}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-slate-700 max-w-md">
                        <p className="line-clamp-2">{rep.redactedSummary}</p>
                        <button
                          type="button"
                          onClick={() => setSelectedReport(rep)}
                          className="text-[11px] font-mono text-orange-700 hover:underline mt-1"
                        >
                          Inspect sanitized evidence
                        </button>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="cyan"
                            size="sm"
                            onClick={() => {
                              setAuditReason('');
                              setConfirmAction({
                                kind: 'report',
                                reportId: rep.id || '',
                                decision: 'verified',
                                title: 'Approve & Verify Report',
                                description: `Mark report ${rep.id} as a verified warning visible to the community.`,
                              });
                            }}
                          >
                            Approve
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              setAuditReason('');
                              setConfirmAction({
                                kind: 'report',
                                reportId: rep.id || '',
                                decision: 'rejected',
                                title: 'Reject Pending Report',
                                description: `Reject report ${rep.id} and exclude it from verified public warnings.`,
                              });
                            }}
                          >
                            Reject
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>

          {/* 2. Candidate Campaign Connections */}
          <Card className="space-y-3">
            <div className="flex items-center gap-2">
              <Link2 className="w-4 h-4 text-accent-violet" />
              <h2 className="text-sm font-semibold text-slate-900">
                Candidate Campaign Connections ({links.length})
              </h2>
            </div>

            {links.length === 0 ? (
              <p className="text-xs text-slate-500 py-3">
                No candidate report-to-campaign links awaiting investigation.
              </p>
            ) : (
              <div className="space-y-2.5">
                {links.map((link) => (
                  <div
                    key={link.id}
                    className="p-3 rounded-md bg-void border border-surface-border flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="font-mono text-slate-800">
                        Report <span className="text-amber-900">{link.reportId}</span> → Campaign{' '}
                        <span className="text-accent-violet">{link.campaignId}</span> (Score:{' '}
                        {link.correlationScore.toFixed(2)})
                      </div>
                      <p className="text-slate-600">{link.explanation}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="cyan"
                        size="sm"
                        onClick={() => {
                          setAuditReason('');
                          setConfirmAction({
                            kind: 'link',
                            linkId: link.id || `${link.reportId}_${link.campaignId}`,
                            nextStatus: 'confirmed',
                            nextVerificationStatus: 'verified',
                            title: 'Confirm & Verify Campaign Link',
                            description: `Confirm deterministic link between ${link.reportId} and campaign ${link.campaignId}.`,
                          });
                        }}
                      >
                        Confirm Link
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setAuditReason('');
                          setConfirmAction({
                            kind: 'link',
                            linkId: link.id || `${link.reportId}_${link.campaignId}`,
                            nextStatus: 'dismissed',
                            nextVerificationStatus: 'unverified',
                            title: 'Dismiss Campaign Link',
                            description: `Dismiss candidate connection between ${link.reportId} and ${link.campaignId}.`,
                          });
                        }}
                      >
                        Dismiss
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* 3. Campaign Verification Status */}
          <Card className="space-y-3">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-600" />
              <h2 className="text-sm font-semibold text-slate-900">
                Campaign Status Controls ({campaigns.length})
              </h2>
            </div>

            {campaigns.length === 0 ? (
              <p className="text-xs text-slate-500 py-3">No campaigns recorded yet.</p>
            ) : (
              <div className="space-y-2.5">
                {campaigns.map((camp) => (
                  <div
                    key={camp.id}
                    className="p-3 rounded-md bg-void border border-surface-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <p className="font-semibold text-slate-900">{camp.name}</p>
                      <p className="text-[11px] font-mono text-slate-600">
                        Status: <span className="text-amber-900">{camp.status}</span> ·{' '}
                        {camp.totalSignals} signals
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {(['MONITORING', 'ACTIVE_WAVE', 'CONTAINED'] as const)
                        .filter((s) => s !== camp.status)
                        .map((nextStatus) => (
                          <Button
                            key={nextStatus}
                            variant="secondary"
                            size="sm"
                            onClick={() => {
                              setAuditReason('');
                              setConfirmAction({
                                kind: 'campaign',
                                campaignId: camp.id || '',
                                nextStatus,
                                title: `Set Campaign Status to ${nextStatus}`,
                                description: `Update campaign ${camp.name} (${camp.id}) from ${camp.status} to ${nextStatus}.`,
                              });
                            }}
                          >
                            Set {nextStatus}
                          </Button>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* 4. Moderation Audit Log */}
          <Card className="space-y-3">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-slate-600" />
              <h2 className="text-sm font-semibold text-slate-900">
                Moderation Audit Log ({auditLogs.length})
              </h2>
            </div>

            {auditLogs.length === 0 ? (
              <p className="text-xs text-slate-500 py-3">
                No moderation audit entries recorded yet.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Action</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead>Transition</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Actor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-mono text-xs text-amber-900">
                        {log.action}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-slate-700">
                        {log.targetType}:{log.targetId.slice(0, 12)}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-slate-600">
                        {log.previousStatus} → {log.newStatus}
                      </TableCell>
                      <TableCell className="text-xs text-slate-700">{log.reason}</TableCell>
                      <TableCell className="font-mono text-[11px] text-slate-600">
                        {log.actorEmail || log.actorUid.slice(0, 10)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </div>
      )}

      {/* Sanitized Evidence Inspection Dialog */}
      <Dialog
        isOpen={Boolean(selectedReport)}
        onClose={() => setSelectedReport(null)}
        title="Inspect Sanitized Report Evidence"
        description={`Report ${selectedReport?.id ?? ''} · ${selectedReport?.observedDate ?? ''}`}
        maxWidth="lg"
      >
        {selectedReport && (
          <div className="space-y-4 text-xs">
            <div className="p-3 rounded bg-void border border-surface-border text-slate-800 leading-relaxed">
              {selectedReport.redactedSummary}
            </div>
            <div>
              <p className="font-mono uppercase text-[10px] text-slate-600 mb-1">
                Observed Evidence
              </p>
              <ul className="list-disc list-inside text-slate-700 space-y-1">
                {selectedReport.evidence.map((ev, i) => (
                  <li key={i}>{ev}</li>
                ))}
              </ul>
            </div>
            <div className="flex justify-end">
              <Button variant="secondary" size="sm" onClick={() => setSelectedReport(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Dialog>

      {/* Moderation Confirmation Dialog */}
      <Dialog
        isOpen={Boolean(confirmAction)}
        onClose={() => !submitting && setConfirmAction(null)}
        title={confirmAction?.title || 'Confirm Moderation Action'}
        description={confirmAction?.description}
        maxWidth="md"
      >
        <form onSubmit={executeConfirmedAction} className="space-y-4 text-xs">
          <div className="space-y-1.5">
            <label className="block font-medium text-slate-700">
              Audit Log Reason (recorded permanently)
            </label>
            <textarea
              value={auditReason}
              onChange={(e) => setAuditReason(e.target.value)}
              rows={3}
              maxLength={500}
              required
              placeholder="Document the evidence or verification rationale..."
              className="w-full rounded-md bg-void border border-surface-border px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-accent-violet"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={submitting}
              onClick={() => setConfirmAction(null)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={submitting}>
              Confirm &amp; Execute
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
};

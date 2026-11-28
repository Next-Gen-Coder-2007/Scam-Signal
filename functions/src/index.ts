import { onCall, HttpsError, type CallableRequest } from 'firebase-functions/v2/https';
import { initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

initializeApp();
const db = getFirestore();

function requireAdminClaims(request: CallableRequest<unknown>): {
  uid: string;
  email: string | null;
} {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Authentication is required for moderation.');
  }
  if (request.auth.token.admin !== true) {
    throw new HttpsError(
      'permission-denied',
      'Trusted admin custom claim (admin: true) is required.'
    );
  }
  return {
    uid: request.auth.uid,
    email: request.auth.token.email ?? null,
  };
}

async function writeAuditLog(entry: {
  actorUid: string;
  actorEmail: string | null;
  action: string;
  targetType: 'pending_report' | 'campaign' | 'report_campaign_link';
  targetId: string;
  previousStatus: string;
  newStatus: string;
  reason: string;
}) {
  await db.collection('moderation_audit_logs').add({
    ...entry,
    createdAt: FieldValue.serverTimestamp(),
  });
}

/**
 * Trusted server-side approval or rejection of a pending community report.
 */
export const moderatePendingReport = onCall(async (request) => {
  const admin = requireAdminClaims(request);
  const data = (request.data ?? {}) as {
    reportId?: string;
    decision?: 'verified' | 'rejected';
    reason?: string;
  };

  if (!data.reportId || (data.decision !== 'verified' && data.decision !== 'rejected')) {
    throw new HttpsError('invalid-argument', 'Valid reportId and decision are required.');
  }

  const reason = (data.reason || '').trim().slice(0, 500) || 'Admin triage decision';
  const ref = db.collection('pending_reports').doc(data.reportId);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new HttpsError('not-found', `Pending report ${data.reportId} not found.`);
  }

  const previousStatus = String(snap.data()?.verificationStatus || 'pending');
  await ref.update({
    verificationStatus: data.decision,
    moderatedAt: FieldValue.serverTimestamp(),
    moderatedBy: admin.uid,
  });

  await writeAuditLog({
    actorUid: admin.uid,
    actorEmail: admin.email,
    action: data.decision === 'verified' ? 'APPROVE_REPORT' : 'REJECT_REPORT',
    targetType: 'pending_report',
    targetId: data.reportId,
    previousStatus,
    newStatus: data.decision,
    reason,
  });

  return { reportId: data.reportId, verificationStatus: data.decision };
});

/**
 * Trusted server-side campaign status transition.
 */
export const moderateCampaignStatus = onCall(async (request) => {
  const admin = requireAdminClaims(request);
  const data = (request.data ?? {}) as {
    campaignId?: string;
    nextStatus?: 'MONITORING' | 'ACTIVE_WAVE' | 'CONTAINED';
    reason?: string;
  };

  if (
    !data.campaignId ||
    !data.nextStatus ||
    !['MONITORING', 'ACTIVE_WAVE', 'CONTAINED'].includes(data.nextStatus)
  ) {
    throw new HttpsError('invalid-argument', 'Valid campaignId and nextStatus are required.');
  }

  const reason = (data.reason || '').trim().slice(0, 500) || 'Campaign status update';
  const ref = db.collection('campaigns').doc(data.campaignId);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new HttpsError('not-found', `Campaign ${data.campaignId} not found.`);
  }

  const previousStatus = String(snap.data()?.status || 'MONITORING');
  await ref.update({
    status: data.nextStatus,
    updatedAt: FieldValue.serverTimestamp(),
  });

  await writeAuditLog({
    actorUid: admin.uid,
    actorEmail: admin.email,
    action: 'UPDATE_CAMPAIGN_STATUS',
    targetType: 'campaign',
    targetId: data.campaignId,
    previousStatus,
    newStatus: data.nextStatus,
    reason,
  });

  return { campaignId: data.campaignId, status: data.nextStatus };
});

/**
 * Trusted server-side confirmation or dismissal of a report-to-campaign link.
 */
export const moderateCampaignLink = onCall(async (request) => {
  const admin = requireAdminClaims(request);
  const data = (request.data ?? {}) as {
    linkId?: string;
    nextStatus?: 'confirmed' | 'dismissed';
    nextVerificationStatus?: 'verified' | 'unverified';
    reason?: string;
  };

  if (
    !data.linkId ||
    (data.nextStatus !== 'confirmed' && data.nextStatus !== 'dismissed')
  ) {
    throw new HttpsError('invalid-argument', 'Valid linkId and nextStatus are required.');
  }

  const nextVerification =
    data.nextVerificationStatus === 'verified' && data.nextStatus === 'confirmed'
      ? 'verified'
      : 'unverified';
  const reason = (data.reason || '').trim().slice(0, 500) || 'Campaign link review';

  const ref = db.collection('report_campaign_links').doc(data.linkId);
  const snap = await ref.get();
  if (!snap.exists) {
    throw new HttpsError('not-found', `Campaign link ${data.linkId} not found.`);
  }

  const previousStatus = String(snap.data()?.status || 'candidate');
  await ref.update({
    status: data.nextStatus,
    verificationStatus: nextVerification,
    updatedAt: FieldValue.serverTimestamp(),
  });

  await writeAuditLog({
    actorUid: admin.uid,
    actorEmail: admin.email,
    action: data.nextStatus === 'confirmed' ? 'CONFIRM_CAMPAIGN_LINK' : 'DISMISS_CAMPAIGN_LINK',
    targetType: 'report_campaign_link',
    targetId: data.linkId,
    previousStatus,
    newStatus: `${data.nextStatus}:${nextVerification}`,
    reason,
  });

  return {
    linkId: data.linkId,
    status: data.nextStatus,
    verificationStatus: nextVerification,
  };
});

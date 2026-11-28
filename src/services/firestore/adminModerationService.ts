import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  where,
  Timestamp,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions, firebaseStatus } from '../firebase/firebaseApp';
import { FirebaseNotConfiguredError } from '../firebase/authService';
import {
  campaignConverter,
  pendingReportConverter,
  reportCampaignLinkConverter,
  type CampaignDocument,
  type PendingReportDocument,
  type ReportCampaignLinkDocument,
} from './threatConverter';

export class AdminPermissionError extends Error {
  readonly code: string;

  constructor(
    message = 'Permission denied. Server-side admin claims (admin: true) are required for moderation.',
    code = 'permission-denied'
  ) {
    super(message);
    this.name = 'AdminPermissionError';
    this.code = code;
  }
}

export interface ModerationAuditLogEntry {
  id: string;
  actorUid: string;
  actorEmail: string | null;
  action: string;
  targetType: 'pending_report' | 'campaign' | 'report_campaign_link';
  targetId: string;
  previousStatus: string;
  newStatus: string;
  reason: string;
  createdAtIso: string | null;
}

function requireDb() {
  if (!db || !firebaseStatus.isConfigured) {
    throw new FirebaseNotConfiguredError('Cloud Firestore');
  }
  return db;
}

function requireFunctions() {
  if (!functions || !firebaseStatus.isConfigured) {
    throw new FirebaseNotConfiguredError('Cloud Functions');
  }
  return functions;
}

function mapCallableError(err: unknown): Error {
  const code =
    typeof err === 'object' && err !== null && 'code' in err
      ? String((err as { code?: unknown }).code)
      : '';
  const msg = err instanceof Error ? err.message : 'Moderation operation failed.';

  if (
    code.includes('permission-denied') ||
    code.includes('unauthenticated') ||
    msg.toLowerCase().includes('permission') ||
    msg.toLowerCase().includes('admin custom claim')
  ) {
    return new AdminPermissionError(
      'Server-side authorization failed: your account does not hold verified admin custom claims.',
      code || 'permission-denied'
    );
  }
  return err instanceof Error ? err : new Error(msg);
}

function toIsoOrNull(val: unknown): string | null {
  if (val instanceof Timestamp) return val.toDate().toISOString();
  if (typeof val === 'object' && val !== null && 'toDate' in val) {
    const fn = (val as { toDate?: () => Date }).toDate;
    if (typeof fn === 'function') return fn().toISOString();
  }
  if (typeof val === 'string') return val;
  return null;
}

export async function fetchPendingReportsForModeration(
  maxResults = 30
): Promise<PendingReportDocument[]> {
  const firestore = requireDb();
  const q = query(
    collection(firestore, 'pending_reports').withConverter(pendingReportConverter),
    where('verificationStatus', '==', 'pending'),
    orderBy('createdAt', 'desc'),
    limit(maxResults)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data());
}

export async function fetchCandidateLinksForModeration(
  maxResults = 30
): Promise<ReportCampaignLinkDocument[]> {
  const firestore = requireDb();
  const q = query(
    collection(firestore, 'report_campaign_links').withConverter(
      reportCampaignLinkConverter
    ),
    where('status', '==', 'candidate'),
    limit(maxResults)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data());
}

export async function fetchCampaignsForModeration(
  maxResults = 25
): Promise<CampaignDocument[]> {
  const firestore = requireDb();
  const q = query(
    collection(firestore, 'campaigns').withConverter(campaignConverter),
    orderBy('updatedAt', 'desc'),
    limit(maxResults)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data());
}

export async function fetchModerationAuditLogs(
  maxResults = 25
): Promise<ModerationAuditLogEntry[]> {
  const firestore = requireDb();
  try {
    const q = query(
      collection(firestore, 'moderation_audit_logs'),
      orderBy('createdAt', 'desc'),
      limit(maxResults)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data();
      return {
        id: d.id,
        actorUid: String(data.actorUid || ''),
        actorEmail: data.actorEmail ? String(data.actorEmail) : null,
        action: String(data.action || ''),
        targetType: data.targetType || 'pending_report',
        targetId: String(data.targetId || ''),
        previousStatus: String(data.previousStatus || ''),
        newStatus: String(data.newStatus || ''),
        reason: String(data.reason || ''),
        createdAtIso: toIsoOrNull(data.createdAt),
      };
    });
  } catch (err) {
    throw mapCallableError(err);
  }
}

export async function callModeratePendingReport(input: {
  reportId: string;
  decision: 'verified' | 'rejected';
  reason: string;
}): Promise<{ reportId: string; verificationStatus: 'verified' | 'rejected' }> {
  const fn = httpsCallable<
    typeof input,
    { reportId: string; verificationStatus: 'verified' | 'rejected' }
  >(requireFunctions(), 'moderatePendingReport');
  try {
    const res = await fn(input);
    return res.data;
  } catch (err) {
    throw mapCallableError(err);
  }
}

export async function callModerateCampaignStatus(input: {
  campaignId: string;
  nextStatus: 'MONITORING' | 'ACTIVE_WAVE' | 'CONTAINED';
  reason: string;
}): Promise<{ campaignId: string; status: CampaignDocument['status'] }> {
  const fn = httpsCallable<
    typeof input,
    { campaignId: string; status: CampaignDocument['status'] }
  >(requireFunctions(), 'moderateCampaignStatus');
  try {
    const res = await fn(input);
    return res.data;
  } catch (err) {
    throw mapCallableError(err);
  }
}

export async function callModerateCampaignLink(input: {
  linkId: string;
  nextStatus: 'confirmed' | 'dismissed';
  nextVerificationStatus: 'verified' | 'unverified';
  reason: string;
}): Promise<{
  linkId: string;
  status: 'confirmed' | 'dismissed';
  verificationStatus: 'verified' | 'unverified';
}> {
  const fn = httpsCallable<
    typeof input,
    {
      linkId: string;
      status: 'confirmed' | 'dismissed';
      verificationStatus: 'verified' | 'unverified';
    }
  >(requireFunctions(), 'moderateCampaignLink');
  try {
    const res = await fn(input);
    return res.data;
  } catch (err) {
    throw mapCallableError(err);
  }
}

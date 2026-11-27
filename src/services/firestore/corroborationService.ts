import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { db, firebaseStatus } from '../firebase/firebaseApp';
import { FirebaseNotConfiguredError } from '../firebase/authService';
import {
  campaignConfirmationConverter,
  campaignConverter,
  campaignDisputeConverter,
  type CampaignConfirmationDocument,
  type CampaignDisputeDocument,
  type CampaignDocument,
} from './threatConverter';
import { containsPII } from '../../utils/redactor';

export class DuplicateCorroborationError extends Error {
  constructor(message = 'You have already submitted this corroboration record for this campaign.') {
    super(message);
    this.name = 'DuplicateCorroborationError';
  }
}

export class UnauthorizedModerationError extends Error {
  constructor(
    message = 'Only trusted administrators can modify campaign verification status or moderate disputes.'
  ) {
    super(message);
    this.name = 'UnauthorizedModerationError';
  }
}

export class InvalidCampaignTransitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidCampaignTransitionError';
  }
}

export const ALLOWED_CAMPAIGN_TRANSITIONS: Record<
  CampaignDocument['status'],
  readonly CampaignDocument['status'][]
> = {
  MONITORING: ['ACTIVE_WAVE', 'CONTAINED'],
  ACTIVE_WAVE: ['CONTAINED', 'MONITORING'],
  CONTAINED: ['ACTIVE_WAVE'],
};

function requireDb() {
  if (!db || !firebaseStatus.isConfigured) {
    throw new FirebaseNotConfiguredError('Cloud Firestore');
  }
  return db;
}

export function buildCorroborationDocId(campaignId: string, userUid: string): string {
  return `${campaignId}_${userUid}`;
}

/**
 * Records a single confirmation ("I encountered a similar message") per authenticated
 * user per campaign, preventing repeated submissions from inflating counts.
 */
export async function submitCampaignConfirmation(input: {
  campaignId: string;
  userUid: string;
  note?: string;
}): Promise<CampaignConfirmationDocument> {
  const firestore = requireDb();
  if (!input.userUid) {
    throw new Error('Authentication is required to confirm a campaign encounter.');
  }
  if (!input.campaignId) {
    throw new Error('Campaign ID is required.');
  }
  if (input.note && containsPII(input.note)) {
    throw new Error('Personal information is not allowed in corroboration notes.');
  }

  const docId = buildCorroborationDocId(input.campaignId, input.userUid);
  const ref = doc(firestore, 'campaign_confirmations', docId).withConverter(
    campaignConfirmationConverter
  );
  const existing = await getDoc(ref);
  if (existing.exists()) {
    throw new DuplicateCorroborationError(
      'You have already confirmed encountering a similar message for this campaign.'
    );
  }

  const record: CampaignConfirmationDocument = {
    id: docId,
    campaignId: input.campaignId,
    userUid: input.userUid,
    ...(input.note?.trim() ? { note: input.note.trim() } : {}),
    createdAt: serverTimestamp(),
  };

  await setDoc(ref, record);
  return record;
}

/**
 * Records a single dispute against a campaign or report-to-campaign link per
 * authenticated user, with moderationStatus starting as 'open'.
 */
export async function submitCampaignDispute(input: {
  campaignId: string;
  userUid: string;
  targetReportId?: string | null;
  reason: string;
}): Promise<CampaignDisputeDocument> {
  const firestore = requireDb();
  if (!input.userUid) {
    throw new Error('Authentication is required to dispute a campaign connection.');
  }
  if (!input.campaignId) {
    throw new Error('Campaign ID is required.');
  }
  const trimmedReason = input.reason.trim();
  if (trimmedReason.length < 10 || trimmedReason.length > 500) {
    throw new Error('Dispute reason must be between 10 and 500 characters.');
  }
  if (containsPII(trimmedReason)) {
    throw new Error('Personal information is not allowed in dispute reasons.');
  }

  const docId = buildCorroborationDocId(input.campaignId, input.userUid);
  const ref = doc(firestore, 'campaign_disputes', docId).withConverter(
    campaignDisputeConverter
  );
  const existing = await getDoc(ref);
  if (existing.exists()) {
    throw new DuplicateCorroborationError(
      'You have already submitted a dispute for this campaign.'
    );
  }

  const record: CampaignDisputeDocument = {
    id: docId,
    campaignId: input.campaignId,
    targetReportId: input.targetReportId ?? null,
    userUid: input.userUid,
    reason: trimmedReason,
    moderationStatus: 'open',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(ref, record);
  return record;
}

export interface CampaignCorroborationSummary {
  confirmationCount: number;
  disputeCount: number;
  openDisputeCount: number;
  userHasConfirmed: boolean;
  userHasDisputed: boolean;
  confirmations: CampaignConfirmationDocument[];
  disputes: CampaignDisputeDocument[];
}

/**
 * Fetches actual stored confirmation and dispute records for a campaign.
 * Counts are strictly derived from stored Firestore documents.
 */
export async function getCampaignCorroborationSummary(
  campaignId: string,
  currentUserUid?: string | null
): Promise<CampaignCorroborationSummary> {
  const firestore = requireDb();

  const confQuery = query(
    collection(firestore, 'campaign_confirmations').withConverter(
      campaignConfirmationConverter
    ),
    where('campaignId', '==', campaignId)
  );
  const disputeQuery = query(
    collection(firestore, 'campaign_disputes').withConverter(campaignDisputeConverter),
    where('campaignId', '==', campaignId)
  );

  const [confSnap, disputeSnap] = await Promise.all([
    getDocs(confQuery),
    getDocs(disputeQuery),
  ]);

  const confirmations = confSnap.docs.map((d) => d.data());
  const disputes = disputeSnap.docs.map((d) => d.data());

  return {
    confirmationCount: confirmations.length,
    disputeCount: disputes.length,
    openDisputeCount: disputes.filter((d) => d.moderationStatus === 'open').length,
    userHasConfirmed: Boolean(
      currentUserUid && confirmations.some((c) => c.userUid === currentUserUid)
    ),
    userHasDisputed: Boolean(
      currentUserUid && disputes.some((d) => d.userUid === currentUserUid)
    ),
    confirmations,
    disputes,
  };
}

/**
 * Trusted administrative operation to transition campaign status.
 * Enforces admin authorization and valid state transitions.
 */
export async function transitionCampaignStatusAdmin(input: {
  campaignId: string;
  nextStatus: CampaignDocument['status'];
  isAdmin: boolean;
}): Promise<{ previousStatus: CampaignDocument['status']; nextStatus: CampaignDocument['status'] }> {
  if (!input.isAdmin) {
    throw new UnauthorizedModerationError();
  }
  const firestore = requireDb();
  const campRef = doc(firestore, 'campaigns', input.campaignId).withConverter(
    campaignConverter
  );
  const snap = await getDoc(campRef);
  if (!snap.exists()) {
    throw new Error(`Campaign ${input.campaignId} not found.`);
  }

  const currentStatus = snap.data().status;
  const allowed = ALLOWED_CAMPAIGN_TRANSITIONS[currentStatus] ?? [];
  if (!allowed.includes(input.nextStatus)) {
    throw new InvalidCampaignTransitionError(
      `Invalid campaign status transition from ${currentStatus} to ${input.nextStatus}.`
    );
  }

  await updateDoc(campRef, {
    status: input.nextStatus,
    updatedAt: serverTimestamp(),
  });

  return { previousStatus: currentStatus, nextStatus: input.nextStatus };
}

/**
 * Trusted administrative operation to resolve an open community dispute.
 */
export async function moderateCampaignDisputeAdmin(input: {
  disputeId: string;
  decision: 'reviewed_upheld' | 'reviewed_dismissed';
  isAdmin: boolean;
}): Promise<void> {
  if (!input.isAdmin) {
    throw new UnauthorizedModerationError();
  }
  const firestore = requireDb();
  const disputeRef = doc(firestore, 'campaign_disputes', input.disputeId).withConverter(
    campaignDisputeConverter
  );

  await updateDoc(disputeRef, {
    moderationStatus: input.decision,
    updatedAt: serverTimestamp(),
  });
}

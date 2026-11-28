import {
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { db, firebaseStatus } from '../firebase/firebaseApp';
import { FirebaseNotConfiguredError } from '../firebase/authService';
import {
  campaignConverter,
  pendingReportConverter,
  type CampaignDocument,
  type PendingReportDocument,
} from './threatConverter';
import { toIsoTimestamp } from './dashboardService';
import { SCAM_CATEGORY_LABELS, type ScamCategory } from '../ai/analysisSchema';

export interface AlertNotificationItem {
  id: string;
  type: 'campaign_warning' | 'community_update';
  category: string;
  categoryLabel: string;
  title: string;
  summary: string;
  timestampIso: string;
  href: string;
  isRead: boolean;
  verificationLabel: string;
}

function requireDb() {
  if (!db || !firebaseStatus.isConfigured) {
    throw new FirebaseNotConfiguredError('Cloud Firestore');
  }
  return db;
}

function formatCategoryLabel(category: string): string {
  if (category in SCAM_CATEGORY_LABELS) {
    return SCAM_CATEGORY_LABELS[category as ScamCategory];
  }
  return category
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Pure builder converting real Firestore records into relevant, noise-filtered
 * in-app alerts for the user's followed scam categories.
 */
export function buildAlertsFromRecords(input: {
  followedCategories: readonly ScamCategory[];
  reports: PendingReportDocument[];
  campaigns: CampaignDocument[];
  readAlertIds: ReadonlySet<string>;
}): AlertNotificationItem[] {
  if (input.followedCategories.length === 0) {
    return [];
  }

  const followedSet = new Set<string>(input.followedCategories);
  const alerts: AlertNotificationItem[] = [];

  for (const camp of input.campaigns) {
    if (!followedSet.has(camp.threatType)) continue;
    // Avoid noisy alerts for low-signal monitoring clusters unless active wave or verified
    if (camp.status !== 'ACTIVE_WAVE' && camp.status !== 'CONTAINED') continue;
    const id = `camp_${camp.id || camp.name}`;
    const ts = toIsoTimestamp(camp.updatedAt) ?? toIsoTimestamp(camp.createdAt);
    if (!ts) continue;

    alerts.push({
      id,
      type: 'campaign_warning',
      category: camp.threatType,
      categoryLabel: formatCategoryLabel(camp.threatType),
      title: camp.name,
      summary: `${camp.totalSignals} correlated signals · ${
        camp.indicators.slice(0, 2).join(', ') || formatCategoryLabel(camp.threatType)
      }`,
      timestampIso: ts,
      href: camp.id ? `/campaigns/${camp.id}` : '/campaigns',
      isRead: input.readAlertIds.has(id),
      verificationLabel:
        camp.status === 'CONTAINED' ? 'Verified Campaign' : 'Active Wave (Under Review)',
    });
  }

  for (const rep of input.reports) {
    // Never expose analysts_only reports in public alerts
    if (rep.visibility !== 'community_public') continue;
    if (!followedSet.has(rep.category)) continue;
    if (rep.verificationStatus === 'rejected') continue;
    // Filter out benign/unknown unverified noise
    const isHighSignal =
      rep.verificationStatus === 'verified' ||
      rep.riskAssessment === 'CRITICAL' ||
      rep.riskAssessment === 'HIGH';
    if (!isHighSignal) continue;

    const id = `rep_${rep.id || rep.observedDate}`;
    const ts = toIsoTimestamp(rep.createdAt, rep.observedDate);
    if (!ts) continue;

    alerts.push({
      id,
      type: 'community_update',
      category: rep.category,
      categoryLabel: formatCategoryLabel(rep.category),
      title: `${formatCategoryLabel(rep.category)} (${rep.riskAssessment})`,
      summary: rep.redactedSummary.slice(0, 140),
      timestampIso: ts,
      href: '/feed',
      isRead: input.readAlertIds.has(id),
      verificationLabel:
        rep.verificationStatus === 'verified' ? 'Verified Warning' : 'Unverified User Report',
    });
  }

  return alerts.sort((a, b) => Date.parse(b.timestampIso) - Date.parse(a.timestampIso));
}

/**
 * Fetches relevant alerts for the authenticated user's followed categories
 * using indexed Firestore queries and owner-only read/unread state.
 */
export async function fetchUserAlerts(
  userUid: string,
  followedCategories: readonly ScamCategory[]
): Promise<AlertNotificationItem[]> {
  if (!userUid) {
    throw new Error('Authentication is required to access your ScamSignal alerts.');
  }
  if (followedCategories.length === 0) {
    return [];
  }

  const firestore = requireDb();
  const categorySlice = followedCategories.slice(0, 10);

  const reportsQuery = query(
    collection(firestore, 'pending_reports').withConverter(pendingReportConverter),
    where('visibility', '==', 'community_public'),
    where('category', 'in', categorySlice),
    orderBy('createdAt', 'desc'),
    limit(15)
  );

  const campaignsQuery = query(
    collection(firestore, 'campaigns').withConverter(campaignConverter),
    where('threatType', 'in', categorySlice),
    orderBy('updatedAt', 'desc'),
    limit(15)
  );

  const alertStatesQuery = collection(firestore, 'users', userUid, 'alert_states');

  const [reportsSnap, campaignsSnap, statesSnap] = await Promise.all([
    getDocs(reportsQuery),
    getDocs(campaignsQuery),
    getDocs(alertStatesQuery),
  ]);

  const readAlertIds = new Set<string>();
  for (const stateDoc of statesSnap.docs) {
    if (stateDoc.data()?.isRead === true) {
      readAlertIds.add(stateDoc.id);
    }
  }

  return buildAlertsFromRecords({
    followedCategories,
    reports: reportsSnap.docs.map((d) => d.data()),
    campaigns: campaignsSnap.docs.map((d) => d.data()),
    readAlertIds,
  });
}

/**
 * Marks a single alert as read in the user's private alert_states subcollection.
 */
export async function markAlertRead(userUid: string, alertId: string): Promise<void> {
  if (!userUid) {
    throw new Error('Authentication is required to update notification state.');
  }
  const firestore = requireDb();
  const ref = doc(firestore, 'users', userUid, 'alert_states', alertId);
  await setDoc(ref, { isRead: true, readAt: serverTimestamp() }, { merge: true });
}

/**
 * Marks multiple alerts as read in the user's private alert_states subcollection.
 */
export async function markAllAlertsRead(
  userUid: string,
  alertIds: readonly string[]
): Promise<void> {
  if (!userUid) {
    throw new Error('Authentication is required to update notification state.');
  }
  await Promise.all(alertIds.map((id) => markAlertRead(userUid, id)));
}

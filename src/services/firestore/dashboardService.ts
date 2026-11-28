import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  Timestamp,
} from 'firebase/firestore';
import { db, firebaseStatus } from '../firebase/firebaseApp';
import { FirebaseNotConfiguredError } from '../firebase/authService';
import { fetchCommunityReports } from './threatService';
import {
  fetchCampaignIntelligenceList,
  type CampaignIntelligenceSummary,
} from './campaignIntelligenceService';
import {
  campaignConfirmationConverter,
  campaignDisputeConverter,
  type PendingReportDocument,
} from './threatConverter';
import { SCAM_CATEGORY_LABELS, type ScamCategory } from '../ai/analysisSchema';

export type DashboardTimeWindow = '7d' | '30d' | 'all';

export interface CategoryDistributionItem {
  category: string;
  label: string;
  count: number;
  percentage: number;
}

export interface CommunityActivityItem {
  id: string;
  type: 'report_submitted' | 'encounter_confirmed' | 'connection_disputed';
  title: string;
  detail: string;
  timestampIso: string;
  href: string;
}

export interface SafetyAlertItem {
  id: string;
  severity: 'CRITICAL' | 'HIGH';
  title: string;
  sourceLabel: string;
  summary: string;
  dateIso: string;
  href: string;
}

export interface DashboardSnapshot {
  timeWindow: DashboardTimeWindow;
  metrics: {
    publicReportsCount: number;
    emergingCampaignsCount: number;
    verifiedItemsCount: number;
    corroborationActionsCount: number;
  };
  recentReports: PendingReportDocument[];
  emergingCampaigns: CampaignIntelligenceSummary[];
  categoryDistribution: CategoryDistributionItem[];
  recentActivity: CommunityActivityItem[];
  safetyAlerts: SafetyAlertItem[];
}

function requireDb() {
  if (!db || !firebaseStatus.isConfigured) {
    throw new FirebaseNotConfiguredError('Cloud Firestore');
  }
  return db;
}

export function toIsoTimestamp(value: unknown, fallbackDateStr?: string): string | null {
  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }
  if (typeof value === 'object' && value !== null && 'toDate' in value) {
    const fn = (value as { toDate?: () => Date }).toDate;
    if (typeof fn === 'function') {
      return fn().toISOString();
    }
  }
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed)) return new Date(parsed).toISOString();
  }
  if (fallbackDateStr) {
    const parsed = Date.parse(fallbackDateStr);
    if (!Number.isNaN(parsed)) return new Date(parsed).toISOString();
  }
  return null;
}

export function isWithinTimeWindow(
  isoTimestamp: string | null,
  window: DashboardTimeWindow,
  nowMs = Date.now()
): boolean {
  if (window === 'all') return true;
  if (!isoTimestamp) return false;
  const tsMs = Date.parse(isoTimestamp);
  if (Number.isNaN(tsMs)) return false;
  const days = window === '7d' ? 7 : 30;
  return nowMs - tsMs <= days * 24 * 60 * 60 * 1000;
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

export interface RawDashboardInputs {
  reports: PendingReportDocument[];
  campaigns: CampaignIntelligenceSummary[];
  confirmations: Array<{ id?: string; campaignId: string; createdAt: unknown }>;
  disputes: Array<{
    id?: string;
    campaignId: string;
    reason: string;
    moderationStatus: string;
    createdAt: unknown;
  }>;
}

/**
 * Pure deterministic aggregator turning real Firestore records into a
 * DashboardSnapshot without inventing any statistics or alerts.
 */
export function buildDashboardSnapshot(
  inputs: RawDashboardInputs,
  timeWindow: DashboardTimeWindow,
  nowMs = Date.now()
): DashboardSnapshot {
  const filteredReports = inputs.reports.filter((r) =>
    isWithinTimeWindow(toIsoTimestamp(r.createdAt, r.observedDate), timeWindow, nowMs)
  );

  const filteredCampaigns = inputs.campaigns.filter((c) => {
    if (timeWindow === 'all') return true;
    return isWithinTimeWindow(c.latestActivityAt ?? c.firstObservedAt, timeWindow, nowMs);
  });

  const filteredConfirmations = inputs.confirmations.filter((c) =>
    isWithinTimeWindow(toIsoTimestamp(c.createdAt), timeWindow, nowMs)
  );
  const filteredDisputes = inputs.disputes.filter((d) =>
    isWithinTimeWindow(toIsoTimestamp(d.createdAt), timeWindow, nowMs)
  );

  // Category distribution from filtered public reports
  const categoryCounts = new Map<string, number>();
  for (const report of filteredReports) {
    categoryCounts.set(report.category, (categoryCounts.get(report.category) ?? 0) + 1);
  }
  const totalReports = filteredReports.length;
  const categoryDistribution: CategoryDistributionItem[] = Array.from(
    categoryCounts.entries()
  )
    .map(([category, count]) => ({
      category,
      label: formatCategoryLabel(category),
      count,
      percentage: totalReports > 0 ? Math.round((count / totalReports) * 100) : 0,
    }))
    .sort((a, b) => b.count - a.count);

  const emergingCampaigns = filteredCampaigns.filter(
    (c) => c.verificationStage === 'potential' || c.verificationStage === 'under_review'
  );

  const verifiedReportsCount = filteredReports.filter(
    (r) => r.verificationStatus === 'verified'
  ).length;
  const verifiedCampaignsCount = filteredCampaigns.filter(
    (c) => c.verificationStage === 'verified'
  ).length;

  // Safety alerts strictly derived from verified high/critical reports or active/verified campaigns
  const safetyAlerts: SafetyAlertItem[] = [];
  for (const report of filteredReports) {
    if (
      report.verificationStatus === 'verified' &&
      (report.riskAssessment === 'CRITICAL' || report.riskAssessment === 'HIGH')
    ) {
      safetyAlerts.push({
        id: `alert-rep-${report.id ?? report.observedDate}`,
        severity: report.riskAssessment,
        title: `Verified ${formatCategoryLabel(report.category)} Warning`,
        sourceLabel: 'Verified Report (pending_reports)',
        summary: report.redactedSummary.slice(0, 140),
        dateIso: toIsoTimestamp(report.createdAt, report.observedDate) ?? report.observedDate,
        href: '/feed',
      });
    }
  }
  for (const camp of filteredCampaigns) {
    if (camp.verificationStage === 'verified' || camp.rawStatus === 'ACTIVE_WAVE') {
      safetyAlerts.push({
        id: `alert-camp-${camp.id}`,
        severity: camp.verificationStage === 'verified' ? 'CRITICAL' : 'HIGH',
        title: camp.name,
        sourceLabel:
          camp.verificationStage === 'verified'
            ? 'Verified Campaign (campaigns)'
            : 'Active Wave Campaign (campaigns)',
        summary: `${camp.associatedReportCount} linked reports · ${
          camp.sharedIndicators.slice(0, 2).join(', ') || formatCategoryLabel(camp.category)
        }`,
        dateIso: camp.latestActivityAt ?? camp.firstObservedAt ?? new Date(nowMs).toISOString(),
        href: `/campaigns/${camp.id}`,
      });
    }
  }
  safetyAlerts.sort((a, b) => Date.parse(b.dateIso) - Date.parse(a.dateIso));

  // Recent community activity merged chronologically from real stored records
  const activity: CommunityActivityItem[] = [];
  for (const r of filteredReports.slice(0, 8)) {
    const ts = toIsoTimestamp(r.createdAt, r.observedDate);
    if (!ts) continue;
    activity.push({
      id: `act-rep-${r.id ?? ts}`,
      type: 'report_submitted',
      title: `Submitted ${formatCategoryLabel(r.category)} report`,
      detail: r.redactedSummary.slice(0, 90),
      timestampIso: ts,
      href: '/feed',
    });
  }
  for (const c of filteredConfirmations.slice(0, 6)) {
    const ts = toIsoTimestamp(c.createdAt);
    if (!ts) continue;
    activity.push({
      id: `act-conf-${c.id ?? ts}`,
      type: 'encounter_confirmed',
      title: `Confirmed similar encounter`,
      detail: `Campaign ${c.campaignId}`,
      timestampIso: ts,
      href: `/campaigns/${c.campaignId}`,
    });
  }
  for (const d of filteredDisputes.slice(0, 6)) {
    const ts = toIsoTimestamp(d.createdAt);
    if (!ts) continue;
    activity.push({
      id: `act-disp-${d.id ?? ts}`,
      type: 'connection_disputed',
      title: `Disputed campaign link (${d.moderationStatus})`,
      detail: d.reason.slice(0, 90),
      timestampIso: ts,
      href: `/campaigns/${d.campaignId}`,
    });
  }
  activity.sort((a, b) => Date.parse(b.timestampIso) - Date.parse(a.timestampIso));

  return {
    timeWindow,
    metrics: {
      publicReportsCount: filteredReports.length,
      emergingCampaignsCount: emergingCampaigns.length,
      verifiedItemsCount: verifiedReportsCount + verifiedCampaignsCount,
      corroborationActionsCount: filteredConfirmations.length + filteredDisputes.length,
    },
    recentReports: filteredReports.slice(0, 6),
    emergingCampaigns: emergingCampaigns.slice(0, 5),
    categoryDistribution,
    recentActivity: activity.slice(0, 8),
    safetyAlerts: safetyAlerts.slice(0, 5),
  };
}

/**
 * Fetches real Firestore collections in parallel and builds the dashboard snapshot.
 */
export async function fetchDashboardSnapshot(
  timeWindow: DashboardTimeWindow = '30d'
): Promise<DashboardSnapshot> {
  const firestore = requireDb();

  const confQuery = query(
    collection(firestore, 'campaign_confirmations').withConverter(
      campaignConfirmationConverter
    ),
    orderBy('createdAt', 'desc'),
    limit(20)
  );
  const disputeQuery = query(
    collection(firestore, 'campaign_disputes').withConverter(campaignDisputeConverter),
    orderBy('createdAt', 'desc'),
    limit(20)
  );

  const [reports, campaigns, confSnap, disputeSnap] = await Promise.all([
    fetchCommunityReports(50),
    fetchCampaignIntelligenceList(30),
    getDocs(confQuery),
    getDocs(disputeQuery),
  ]);

  return buildDashboardSnapshot(
    {
      reports,
      campaigns,
      confirmations: confSnap.docs.map((d) => d.data()),
      disputes: disputeSnap.docs.map((d) => d.data()),
    },
    timeWindow
  );
}

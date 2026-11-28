import { firebaseStatus } from '../firebase/firebaseApp';
import { FirebaseNotConfiguredError } from '../firebase/authService';
import { fetchCommunityReports } from './threatService';
import {
  fetchCampaignIntelligenceList,
  type CampaignIntelligenceSummary,
} from './campaignIntelligenceService';
import {
  isWithinTimeWindow,
  toIsoTimestamp,
  type DashboardTimeWindow,
} from './dashboardService';
import type { PendingReportDocument, VerificationStatus } from './threatConverter';
import {
  MANIPULATION_PATTERN_LABELS,
  SCAM_CATEGORY_LABELS,
  type ManipulationPattern,
  type ScamCategory,
} from '../ai/analysisSchema';
import type { ThreatLevel } from '../../types/threat';

export interface ScamRadarFilters {
  category: 'ALL' | ScamCategory;
  dateWindow: DashboardTimeWindow;
  verificationStatus: 'ALL' | 'verified' | 'pending';
}

export interface CategoryThreatSummary {
  category: string;
  label: string;
  reportCount: number;
  verifiedCount: number;
  highestRisk: ThreatLevel;
}

export interface ManipulationPatternFrequency {
  pattern: string;
  label: string;
  count: number;
  percentage: number;
}

export interface CoarseRegionTrend {
  region: string;
  count: number;
}

export interface ScamRadarSnapshot {
  filters: ScamRadarFilters;
  isSampleData: boolean;
  totalMatchingReports: number;
  categorySummaries: CategoryThreatSummary[];
  recentCampaigns: CampaignIntelligenceSummary[];
  commonManipulationPatterns: ManipulationPatternFrequency[];
  recentWarnings: PendingReportDocument[];
  geographicalTrends: CoarseRegionTrend[] | null;
  geoUnavailableReason: string | null;
}

const RISK_ORDER: Record<ThreatLevel, number> = {
  CRITICAL: 4,
  HIGH: 3,
  SUSPICIOUS: 2,
  UNKNOWN: 1,
  SAFE: 0,
};

function formatCategoryLabel(category: string): string {
  if (category in SCAM_CATEGORY_LABELS) {
    return SCAM_CATEGORY_LABELS[category as ScamCategory];
  }
  return category
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

function formatPatternLabel(pattern: string): string {
  if (pattern in MANIPULATION_PATTERN_LABELS) {
    return MANIPULATION_PATTERN_LABELS[pattern as ManipulationPattern];
  }
  return pattern
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

export type RadarReportInput = PendingReportDocument & {
  /** Optional safe coarse-grained region (e.g., country/state) if explicitly provided. */
  coarseRegion?: string;
};

/**
 * Pure aggregation builder for Scam Radar from real Firestore records.
 * Computes geographical trends only when >= 3 reports include safe coarse-grained region data.
 */
export function buildScamRadarSnapshot(
  reports: RadarReportInput[],
  campaigns: CampaignIntelligenceSummary[],
  filters: ScamRadarFilters,
  options: { isSampleData?: boolean; nowMs?: number } = {}
): ScamRadarSnapshot {
  const nowMs = options.nowMs ?? Date.now();
  const isSampleData = Boolean(options.isSampleData);

  const filteredReports = reports.filter((r) => {
    if (filters.category !== 'ALL' && r.category !== filters.category) return false;
    if (
      filters.verificationStatus !== 'ALL' &&
      r.verificationStatus !== filters.verificationStatus
    ) {
      return false;
    }
    const ts = toIsoTimestamp(r.createdAt, r.observedDate);
    return isWithinTimeWindow(ts, filters.dateWindow, nowMs);
  });

  const filteredCampaigns = campaigns.filter((c) => {
    if (filters.category !== 'ALL' && c.category !== filters.category) return false;
    if (filters.verificationStatus === 'verified' && c.verificationStage !== 'verified') {
      return false;
    }
    if (filters.verificationStatus === 'pending' && c.verificationStage === 'verified') {
      return false;
    }
    if (filters.dateWindow === 'all') return true;
    return isWithinTimeWindow(
      c.latestActivityAt ?? c.firstObservedAt,
      filters.dateWindow,
      nowMs
    );
  });

  // Category-based threat summaries
  const catMap = new Map<
    string,
    { reportCount: number; verifiedCount: number; highestRisk: ThreatLevel }
  >();
  for (const r of filteredReports) {
    const existing = catMap.get(r.category);
    if (!existing) {
      catMap.set(r.category, {
        reportCount: 1,
        verifiedCount: r.verificationStatus === 'verified' ? 1 : 0,
        highestRisk: r.riskAssessment,
      });
    } else {
      existing.reportCount++;
      if (r.verificationStatus === 'verified') existing.verifiedCount++;
      if (RISK_ORDER[r.riskAssessment] > RISK_ORDER[existing.highestRisk]) {
        existing.highestRisk = r.riskAssessment;
      }
    }
  }

  const categorySummaries: CategoryThreatSummary[] = Array.from(catMap.entries())
    .map(([category, stats]) => ({
      category,
      label: formatCategoryLabel(category),
      ...stats,
    }))
    .sort((a, b) => b.reportCount - a.reportCount);

  // Common manipulation patterns
  const patternMap = new Map<string, number>();
  for (const r of filteredReports) {
    for (const ind of r.indicators) {
      patternMap.set(ind, (patternMap.get(ind) ?? 0) + 1);
    }
  }
  const totalPatternMentions = filteredReports.length || 1;
  const commonManipulationPatterns: ManipulationPatternFrequency[] = Array.from(
    patternMap.entries()
  )
    .map(([pattern, count]) => ({
      pattern,
      label: formatPatternLabel(pattern),
      count,
      percentage: Math.round((count / totalPatternMentions) * 100),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  // Geographical trends: only if >= 3 reports carry safe coarse-grained region tags
  const regionMap = new Map<string, number>();
  let geoReportCount = 0;
  for (const r of filteredReports) {
    const region = r.coarseRegion?.trim();
    if (region && region.length >= 2 && region.length <= 40) {
      geoReportCount++;
      regionMap.set(region, (regionMap.get(region) ?? 0) + 1);
    }
  }

  const hasSufficientGeo = geoReportCount >= 3;
  const geographicalTrends: CoarseRegionTrend[] | null = hasSufficientGeo
    ? Array.from(regionMap.entries())
        .map(([region, count]) => ({ region, count }))
        .sort((a, b) => b.count - a.count)
    : null;

  const geoUnavailableReason = hasSufficientGeo
    ? null
    : 'Coarse-grained regional trends are hidden because current reports do not contain sufficient safe regional metadata.';

  return {
    filters,
    isSampleData,
    totalMatchingReports: filteredReports.length,
    categorySummaries,
    recentCampaigns: filteredCampaigns.slice(0, 6),
    commonManipulationPatterns,
    recentWarnings: filteredReports.slice(0, 8),
    geographicalTrends,
    geoUnavailableReason,
  };
}

/**
 * Fetches real Firestore reports and campaigns for Scam Radar.
 */
export async function fetchLiveScamRadarSnapshot(
  filters: ScamRadarFilters
): Promise<ScamRadarSnapshot> {
  if (!firebaseStatus.isConfigured) {
    throw new FirebaseNotConfiguredError('Cloud Firestore');
  }

  const [reports, campaigns] = await Promise.all([
    fetchCommunityReports(60),
    fetchCampaignIntelligenceList(30),
  ]);

  return buildScamRadarSnapshot(reports, campaigns, filters, { isSampleData: false });
}

/**
 * Clearly isolated demonstration dataset for previewing Scam Radar layout when
 * live Firestore has few or no reports. Never mixed into live counts.
 */
export function getSampleScamRadarSnapshot(
  filters: ScamRadarFilters,
  nowMs = Date.now()
): ScamRadarSnapshot {
  const today = new Date(nowMs).toISOString().slice(0, 10);
  const yesterday = new Date(nowMs - 86400000).toISOString().slice(0, 10);

  const sampleReports: RadarReportInput[] = [
    {
      id: 'sample-rep-1',
      reporterUid: 'sample-demo',
      redactedSummary:
        '[SAMPLE] Bank KYC suspension SMS directing users to [REDACTED_URL] within 24 hours.',
      category: 'phishing',
      indicators: ['urgency', 'impersonation', 'credential_request'],
      evidence: ['Urgency deadline', 'Lookalike domain'],
      riskAssessment: 'HIGH',
      observedDate: today,
      visibility: 'community_public',
      channel: 'sms',
      inferenceSource: 'on_device',
      normalizedPatternHash: 'sample1',
      verificationStatus: 'verified' as VerificationStatus,
      campaignId: null,
      createdAt: new Date(nowMs).toISOString() as unknown as import('firebase/firestore').FieldValue,
    },
    {
      id: 'sample-rep-2',
      reporterUid: 'sample-demo',
      redactedSummary:
        '[SAMPLE] Part-time remote task offer requesting upfront registration fee via [REDACTED_UPI].',
      category: 'job_scam',
      indicators: ['upfront_payment', 'unrealistic_rewards'],
      evidence: ['Registration fee requested'],
      riskAssessment: 'HIGH',
      observedDate: yesterday,
      visibility: 'community_public',
      channel: 'whatsapp',
      inferenceSource: 'in_cloud',
      normalizedPatternHash: 'sample2',
      verificationStatus: 'pending' as VerificationStatus,
      campaignId: null,
      createdAt: new Date(nowMs - 86400000).toISOString() as unknown as import('firebase/firestore').FieldValue,
    },
    {
      id: 'sample-rep-3',
      reporterUid: 'sample-demo',
      redactedSummary:
        '[SAMPLE] Parcel delivery hold notice asking for customs clearance card payment at [REDACTED_URL].',
      category: 'delivery_scam',
      indicators: ['urgency', 'upfront_payment'],
      evidence: ['Customs fee lure'],
      riskAssessment: 'SUSPICIOUS',
      observedDate: yesterday,
      visibility: 'community_public',
      channel: 'sms',
      inferenceSource: 'on_device',
      normalizedPatternHash: 'sample3',
      verificationStatus: 'pending' as VerificationStatus,
      campaignId: null,
      createdAt: new Date(nowMs - 86400000).toISOString() as unknown as import('firebase/firestore').FieldValue,
    },
  ];

  const sampleCampaigns: CampaignIntelligenceSummary[] = [
    {
      id: 'sample-camp-1',
      name: '[SAMPLE] Bank KYC Lookalike Cluster',
      category: 'phishing',
      associatedReportCount: 3,
      firstObservedAt: new Date(nowMs - 2 * 86400000).toISOString(),
      latestActivityAt: new Date(nowMs).toISOString(),
      sharedIndicators: ['shared_domain:sample-kyc.example'],
      verificationStage: 'potential',
      rawStatus: 'MONITORING',
    },
  ];

  return buildScamRadarSnapshot(sampleReports, sampleCampaigns, filters, {
    isSampleData: true,
    nowMs,
  });
}

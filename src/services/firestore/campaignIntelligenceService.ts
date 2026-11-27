import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  Timestamp,
} from 'firebase/firestore';
import { db, firebaseStatus } from '../firebase/firebaseApp';
import { FirebaseNotConfiguredError } from '../firebase/authService';
import {
  campaignConverter,
  type CampaignAnalysisDocument,
  type CampaignDocument,
  type ReportCampaignLinkDocument,
} from './threatConverter';
import { getCampaignLinksForCampaign } from './campaignLinkService';
import { getCollectiveCampaignAnalysis } from './campaignAnalysisService';

export type CampaignVerificationStage = 'potential' | 'under_review' | 'verified';

export interface CampaignIntelligenceSummary {
  id: string;
  name: string;
  category: string;
  associatedReportCount: number;
  firstObservedAt: string | null;
  latestActivityAt: string | null;
  sharedIndicators: string[];
  verificationStage: CampaignVerificationStage;
  rawStatus: CampaignDocument['status'];
}

export interface CampaignDetailsData {
  campaign: CampaignDocument & { id: string };
  links: ReportCampaignLinkDocument[];
  analysis: CampaignAnalysisDocument | null;
  verificationStage: CampaignVerificationStage;
  firstObservedAt: string | null;
  latestActivityAt: string | null;
  associatedReportCount: number;
}

function requireDb() {
  if (!db || !firebaseStatus.isConfigured) {
    throw new FirebaseNotConfiguredError('Cloud Firestore');
  }
  return db;
}

function toIsoStringOrNull(value: unknown): string | null {
  if (!value) return null;
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
    return Number.isNaN(parsed) ? null : new Date(parsed).toISOString();
  }
  return null;
}

/**
 * Derives an explicit, non-fabricated verification stage from Firestore campaign
 * and report-to-campaign link metadata.
 */
export function deriveCampaignVerificationStage(
  campaign: Pick<CampaignDocument, 'status'>,
  links: readonly Pick<ReportCampaignLinkDocument, 'status' | 'verificationStatus'>[] = []
): CampaignVerificationStage {
  if (
    campaign.status === 'CONTAINED' ||
    links.some((l) => l.verificationStatus === 'verified')
  ) {
    return 'verified';
  }
  if (
    campaign.status === 'ACTIVE_WAVE' ||
    links.some((l) => l.status === 'confirmed')
  ) {
    return 'under_review';
  }
  return 'potential';
}

/**
 * Fetches real correlated campaigns from Firestore without fabricating statistics.
 */
export async function fetchCampaignIntelligenceList(
  maxResults = 30
): Promise<CampaignIntelligenceSummary[]> {
  const firestore = requireDb();
  const q = query(
    collection(firestore, 'campaigns').withConverter(campaignConverter),
    orderBy('updatedAt', 'desc'),
    limit(Math.min(50, Math.max(1, maxResults)))
  );

  const snap = await getDocs(q);
  const campaigns = snap.docs.map((d) => d.data());

  const summaries = await Promise.all(
    campaigns.map(async (camp) => {
      const id = camp.id || '';
      const links = id ? await getCampaignLinksForCampaign(id) : [];

      const linkDates = links
        .map((l) => toIsoStringOrNull(l.createdAt))
        .filter((d): d is string => Boolean(d))
        .sort();

      const campCreated = toIsoStringOrNull(camp.createdAt);
      const campUpdated = toIsoStringOrNull(camp.updatedAt);

      const firstObservedAt = linkDates[0] ?? campCreated;
      const latestActivityAt =
        linkDates[linkDates.length - 1] ?? campUpdated ?? campCreated;

      return {
        id,
        name: camp.name,
        category: camp.threatType,
        associatedReportCount: links.length > 0 ? links.length : camp.totalSignals,
        firstObservedAt,
        latestActivityAt,
        sharedIndicators: camp.indicators,
        verificationStage: deriveCampaignVerificationStage(camp, links),
        rawStatus: camp.status,
      };
    })
  );

  return summaries;
}

/**
 * Fetches full campaign details, report-to-campaign evidence links, and any
 * stored collective AI analysis from Firestore.
 */
export async function fetchCampaignDetails(
  campaignId: string
): Promise<CampaignDetailsData | null> {
  const firestore = requireDb();
  const campRef = doc(firestore, 'campaigns', campaignId).withConverter(
    campaignConverter
  );
  const campSnap = await getDoc(campRef);
  if (!campSnap.exists()) {
    return null;
  }

  const campaign = { ...campSnap.data(), id: campSnap.id };
  const [links, analysis] = await Promise.all([
    getCampaignLinksForCampaign(campaignId),
    getCollectiveCampaignAnalysis(campaignId),
  ]);

  const linkDates = links
    .map((l) => toIsoStringOrNull(l.createdAt))
    .filter((d): d is string => Boolean(d))
    .sort();

  const campCreated = toIsoStringOrNull(campaign.createdAt);
  const campUpdated = toIsoStringOrNull(campaign.updatedAt);

  return {
    campaign,
    links,
    analysis,
    verificationStage: deriveCampaignVerificationStage(campaign, links),
    firstObservedAt: linkDates[0] ?? campCreated,
    latestActivityAt: linkDates[linkDates.length - 1] ?? campUpdated ?? campCreated,
    associatedReportCount: links.length > 0 ? links.length : campaign.totalSignals,
  };
}

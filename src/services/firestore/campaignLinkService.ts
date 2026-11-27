import {
  collection,
  doc,
  getDocs,
  query,
  setDoc,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { db, firebaseStatus } from '../firebase/firebaseApp';
import { FirebaseNotConfiguredError } from '../firebase/authService';
import {
  campaignConverter,
  reportCampaignLinkConverter,
  type ReportCampaignLinkDocument,
} from './threatConverter';
import type { CorrelatedCampaignCluster } from '../campaigns/correlationRules';

function requireDb() {
  if (!db || !firebaseStatus.isConfigured) {
    throw new FirebaseNotConfiguredError('Cloud Firestore');
  }
  return db;
}

export function buildReportCampaignLinkId(reportId: string, campaignId: string): string {
  const safeReport = reportId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40);
  const safeCampaign = campaignId.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40);
  return `${safeReport}_${safeCampaign}`;
}

/**
 * Persists candidate campaign clusters and report-to-campaign relationship links
 * in Firestore. Never automatically marks any campaign or link as verified.
 */
export async function saveCampaignCorrelationResults(
  clusters: CorrelatedCampaignCluster[]
): Promise<{ campaignsSaved: number; linksSaved: number }> {
  const firestore = requireDb();
  let campaignsSaved = 0;
  let linksSaved = 0;

  for (const cluster of clusters) {
    const campaignRef = doc(firestore, 'campaigns', cluster.campaignId).withConverter(
      campaignConverter
    );
    await setDoc(
      campaignRef,
      {
        name: cluster.name,
        threatType: cluster.primaryCategory,
        totalSignals: cluster.totalReports,
        corroboratedHashes: [],
        // Candidate campaigns always start in MONITORING (never auto-verified)
        status: 'MONITORING',
        indicators: cluster.supportingIndicators.map((i) => `${i.type}:${i.value}`),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
    campaignsSaved++;

    for (const reportId of cluster.reportIds) {
      const relevantLinks = cluster.links.filter(
        (l) => l.reportAId === reportId || l.reportBId === reportId
      );
      const bestScore =
        relevantLinks.length > 0
          ? Math.max(...relevantLinks.map((l) => l.score))
          : 0;
      const explanations = relevantLinks.map((l) => l.explanation).join(' | ');
      const indicatorLabels = Array.from(
        new Set(
          relevantLinks.flatMap((l) =>
            l.supportingIndicators.map((ind) => `${ind.type}:${ind.value}`)
          )
        )
      );

      const linkId = buildReportCampaignLinkId(reportId, cluster.campaignId);
      const linkRef = doc(firestore, 'report_campaign_links', linkId).withConverter(
        reportCampaignLinkConverter
      );

      await setDoc(
        linkRef,
        {
          reportId,
          campaignId: cluster.campaignId,
          correlationScore: bestScore,
          status: 'candidate',
          verificationStatus: 'unverified',
          supportingIndicators: indicatorLabels,
          explanation:
            explanations ||
            `Correlated into unverified candidate campaign ${cluster.campaignId}.`,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      linksSaved++;
    }
  }

  return { campaignsSaved, linksSaved };
}

/**
 * Fetches all campaign correlation links associated with a given report ID.
 */
export async function getCampaignLinksForReport(
  reportId: string
): Promise<ReportCampaignLinkDocument[]> {
  const firestore = requireDb();
  const q = query(
    collection(firestore, 'report_campaign_links').withConverter(reportCampaignLinkConverter),
    where('reportId', '==', reportId)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data());
}

/**
 * Fetches all report correlation links associated with a given campaign ID.
 */
export async function getCampaignLinksForCampaign(
  campaignId: string
): Promise<ReportCampaignLinkDocument[]> {
  const firestore = requireDb();
  const q = query(
    collection(firestore, 'report_campaign_links').withConverter(reportCampaignLinkConverter),
    where('campaignId', '==', campaignId)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => d.data());
}

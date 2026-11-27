import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, firebaseStatus } from '../firebase/firebaseApp';
import { FirebaseNotConfiguredError } from '../firebase/authService';
import {
  campaignAnalysisConverter,
  type CampaignAnalysisDocument,
} from './threatConverter';
import type { CollectiveCampaignAnalysisRecord } from '../campaigns/collectiveAnalysisSchema';

function requireDb() {
  if (!db || !firebaseStatus.isConfigured) {
    throw new FirebaseNotConfiguredError('Cloud Firestore');
  }
  return db;
}

/**
 * Persists a collective AI campaign explanation alongside its separated deterministic
 * summary, inference source, and referenced report IDs in campaign_analyses/{campaignId}.
 */
export async function saveCollectiveCampaignAnalysis(
  record: CollectiveCampaignAnalysisRecord
): Promise<void> {
  const firestore = requireDb();
  const ref = doc(firestore, 'campaign_analyses', record.campaignId).withConverter(
    campaignAnalysisConverter
  );

  await setDoc(
    ref,
    {
      campaignId: record.campaignId,
      deterministicSummary: {
        status: record.deterministic.status,
        verificationStatus: record.deterministic.verificationStatus,
        totalReports: record.deterministic.totalReports,
        supportingIndicators: record.deterministic.supportingIndicators.map(
          (i) => `${i.type}:${i.value}`
        ),
        linkCount: record.deterministic.links.length,
      },
      sharedIndicatorsSummary: record.aiExplanation.sharedIndicatorsSummary,
      relationshipExplanation: record.aiExplanation.relationshipExplanation,
      inconsistencies: record.aiExplanation.inconsistencies,
      evidenceToReview: record.aiExplanation.evidenceToReview,
      referencedReportIds: record.aiExplanation.referencedReportIds,
      inferenceSource: record.aiExplanation.inferenceSource,
      modelIdentifier: record.aiExplanation.modelIdentifier,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

/**
 * Retrieves the stored collective campaign analysis for a given campaign ID.
 */
export async function getCollectiveCampaignAnalysis(
  campaignId: string
): Promise<CampaignAnalysisDocument | null> {
  const firestore = requireDb();
  const ref = doc(firestore, 'campaign_analyses', campaignId).withConverter(
    campaignAnalysisConverter
  );
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() : null;
}

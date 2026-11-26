import {
  collection,
  getDocs,
  addDoc,
  query,
  orderBy,
  limit,
  serverTimestamp,
} from 'firebase/firestore';
import { db, firebaseStatus } from '../firebase/firebaseApp';
import { FirebaseNotConfiguredError } from '../firebase/authService';
import {
  publicThreatConverter,
  campaignConverter,
  PublicThreatDocument,
  CampaignDocument,
} from './threatConverter';
import { redactPII, containsPII, computePatternHash } from '../../utils/redactor';
import { ThreatLevel, InferenceSource } from '../../types/threat';

export interface SubmitPublicThreatInput {
  reporterUid: string;
  rawContent: string;
  threatLevel: ThreatLevel;
  threatCategories: string[];
  tacticalIndicators: string[];
  inferenceSource: InferenceSource;
  channel: 'sms' | 'email' | 'whatsapp' | 'call' | 'web';
}

function requireDb() {
  if (!db || !firebaseStatus.isConfigured) {
    throw new FirebaseNotConfiguredError('Cloud Firestore');
  }
  return db;
}

/**
 * Fetches recent scrubbed community threat signals from Cloud Firestore.
 */
export async function fetchPublicThreats(
  maxResults = 50
): Promise<PublicThreatDocument[]> {
  const firestore = requireDb();
  const threatsRef = collection(firestore, 'public_threats').withConverter(
    publicThreatConverter
  );
  const q = query(threatsRef, orderBy('createdAt', 'desc'), limit(maxResults));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => doc.data());
}

/**
 * Scrubs PII client-side, computes a deterministic pattern hash,
 * and submits an anonymized threat signal to Cloud Firestore.
 * Enforces upvotes = 0 and campaignId = null per security rules.
 */
export async function submitPublicThreat(
  input: SubmitPublicThreatInput
): Promise<PublicThreatDocument> {
  const firestore = requireDb();

  if (!input.reporterUid) {
    throw new Error('Authentication is required before submitting community signals.');
  }

  const scrubbed = redactPII(input.rawContent).trim();
  if (!scrubbed) {
    throw new Error('Cannot submit an empty threat signal.');
  }
  if (containsPII(scrubbed)) {
    throw new Error(
      'Personal information was still detected after redaction. Submission blocked for privacy.'
    );
  }

  const patternHash = await computePatternHash(scrubbed);

  const payload: PublicThreatDocument = {
    reporterUid: input.reporterUid,
    threatLevel: input.threatLevel,
    threatCategories: input.threatCategories,
    redactedSummary: scrubbed.slice(0, 2000),
    normalizedPatternHash: patternHash,
    tacticalIndicators: input.tacticalIndicators,
    inferenceSource: input.inferenceSource,
    channel: input.channel,
    upvotes: 0,
    campaignId: null,
    createdAt: serverTimestamp(),
  };

  const threatsRef = collection(firestore, 'public_threats').withConverter(
    publicThreatConverter
  );
  const docRef = await addDoc(threatsRef, payload);
  return {
    ...payload,
    id: docRef.id,
  };
}

/**
 * Fetches correlated campaign documents from Cloud Firestore.
 */
export async function fetchCampaigns(
  maxResults = 25
): Promise<CampaignDocument[]> {
  const firestore = requireDb();
  const campaignsRef = collection(firestore, 'campaigns').withConverter(
    campaignConverter
  );
  const q = query(campaignsRef, orderBy('totalSignals', 'desc'), limit(maxResults));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => doc.data());
}

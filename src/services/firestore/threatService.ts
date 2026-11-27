import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
} from 'firebase/firestore';
import { db, firebaseStatus } from '../firebase/firebaseApp';
import { FirebaseNotConfiguredError } from '../firebase/authService';
import {
  publicThreatConverter,
  pendingReportConverter,
  campaignConverter,
  PublicThreatDocument,
  PendingReportDocument,
  CampaignDocument,
  ReportVisibility,
} from './threatConverter';
import { redactPII, containsPII, computePatternHash } from '../../utils/redactor';
import { ThreatLevel, InferenceSource } from '../../types/threat';

export class DuplicateReportError extends Error {
  constructor(message = 'You have already submitted a report for this scam pattern on this date.') {
    super(message);
    this.name = 'DuplicateReportError';
  }
}

export interface SubmitPendingReportInput {
  reporterUid: string;
  rawContent: string;
  category: string;
  indicators: string[];
  evidence: string[];
  riskAssessment: ThreatLevel;
  observedDate: string; // YYYY-MM-DD
  visibility: ReportVisibility;
  inferenceSource: InferenceSource;
  channel: 'sms' | 'email' | 'whatsapp' | 'call' | 'web';
}

export interface SubmitPublicThreatInput {
  reporterUid: string;
  rawContent: string;
  threatLevel: ThreatLevel;
  threatCategories: string[];
  tacticalIndicators: string[];
  inferenceSource: InferenceSource;
  channel: 'sms' | 'email' | 'whatsapp' | 'call' | 'web';
}

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function requireDb() {
  if (!db || !firebaseStatus.isConfigured) {
    throw new FirebaseNotConfiguredError('Cloud Firestore');
  }
  return db;
}

export function buildReportDedupeId(
  reporterUid: string,
  patternHash: string,
  observedDate: string
): string {
  const safeUid = reporterUid.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 24);
  return `${safeUid}_${patternHash.slice(0, 16)}_${observedDate}`;
}

/**
 * Submits a redacted, user-consented scam observation to the pending_reports collection.
 * Prevents duplicate submissions per user/pattern/date and enforces pending verificationStatus.
 */
export async function submitPendingReport(
  input: SubmitPendingReportInput
): Promise<PendingReportDocument> {
  const firestore = requireDb();

  if (!input.reporterUid) {
    throw new Error('Authentication is required before submitting community reports.');
  }
  if (!DATE_REGEX.test(input.observedDate)) {
    throw new Error('Observed date must be in YYYY-MM-DD format.');
  }

  const scrubbedSummary = redactPII(input.rawContent).trim();
  if (!scrubbedSummary) {
    throw new Error('Cannot submit an empty scam report.');
  }
  if (containsPII(scrubbedSummary)) {
    throw new Error(
      'Personal information was still detected in the summary after redaction. Please review and remove it.'
    );
  }

  const scrubbedEvidence = (input.evidence || [])
    .slice(0, 10)
    .map((item) => redactPII(item).trim())
    .filter(Boolean);

  if (scrubbedEvidence.some((item) => containsPII(item))) {
    throw new Error(
      'Personal information was still detected in supporting evidence. Please review and remove it.'
    );
  }

  const patternHash = await computePatternHash(scrubbedSummary);
  const dedupeId = buildReportDedupeId(
    input.reporterUid,
    patternHash,
    input.observedDate
  );

  const reportRef = doc(firestore, 'pending_reports', dedupeId).withConverter(
    pendingReportConverter
  );

  const existing = await getDoc(reportRef);
  if (existing.exists()) {
    throw new DuplicateReportError();
  }

  const payload: PendingReportDocument = {
    reporterUid: input.reporterUid,
    redactedSummary: scrubbedSummary.slice(0, 2000),
    category: input.category,
    indicators: (input.indicators || []).slice(0, 10),
    evidence: scrubbedEvidence,
    riskAssessment: input.riskAssessment,
    observedDate: input.observedDate,
    visibility: input.visibility,
    channel: input.channel,
    inferenceSource: input.inferenceSource,
    normalizedPatternHash: patternHash,
    verificationStatus: 'pending',
    campaignId: null,
    createdAt: serverTimestamp(),
  };

  try {
    await setDoc(reportRef, payload);
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'code' in err) {
      const code = String((err as { code: string }).code);
      if (code === 'already-exists') {
        throw new DuplicateReportError();
      }
      if (code === 'permission-denied') {
        throw new Error(
          'Submission rejected by Firestore security rules. Ensure you are signed in and no duplicate report exists.'
        );
      }
    }
    throw err;
  }

  return {
    ...payload,
    id: dedupeId,
  };
}

/**
 * Fetches publicly visible pending community reports from Cloud Firestore.
 */
export async function fetchCommunityReports(
  maxResults = 50
): Promise<PendingReportDocument[]> {
  const firestore = requireDb();
  const reportsRef = collection(firestore, 'pending_reports').withConverter(
    pendingReportConverter
  );
  const q = query(
    reportsRef,
    where('visibility', '==', 'community_public'),
    orderBy('createdAt', 'desc'),
    limit(maxResults)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => d.data());
}

/**
 * Fetches recent scrubbed community threat signals from legacy public_threats collection.
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
  return snapshot.docs.map((d) => d.data());
}

/**
 * Scrubs PII client-side, computes a deterministic pattern hash,
 * and submits an anonymized threat signal to Cloud Firestore.
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
 * Fetches verified correlated campaign documents from Cloud Firestore.
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
  return snapshot.docs.map((d) => d.data());
}

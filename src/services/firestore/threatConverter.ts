import {
  FirestoreDataConverter,
  QueryDocumentSnapshot,
  SnapshotOptions,
  serverTimestamp,
  Timestamp,
  FieldValue,
} from 'firebase/firestore';
import { ThreatLevel, InferenceSource } from '../../types/threat';

export interface PublicThreatDocument {
  id?: string;
  reporterUid: string;
  threatLevel: ThreatLevel;
  threatCategories: string[];
  redactedSummary: string;
  normalizedPatternHash: string;
  tacticalIndicators: string[];
  inferenceSource: InferenceSource;
  channel: 'sms' | 'email' | 'whatsapp' | 'call' | 'web';
  upvotes: number;
  campaignId: string | null;
  createdAt: Timestamp | FieldValue;
}

export interface CampaignDocument {
  id?: string;
  name: string;
  threatType: string;
  totalSignals: number;
  corroboratedHashes: string[];
  status: 'ACTIVE_WAVE' | 'MONITORING' | 'CONTAINED';
  indicators: string[];
  createdAt: Timestamp | FieldValue;
  updatedAt: Timestamp | FieldValue;
}

/**
 * Typed Firestore Data Converter for Public Threat Signals
 * Guarantees schema consistency and prevents untrusted client fields
 */
export const publicThreatConverter: FirestoreDataConverter<PublicThreatDocument> = {
  toFirestore(threat: PublicThreatDocument) {
    if (!threat.redactedSummary || threat.redactedSummary.trim().length === 0) {
      throw new Error('Public threat must contain non-empty redactedSummary.');
    }
    if (threat.redactedSummary.length > 2000) {
      throw new Error('Public threat redactedSummary exceeds maximum length of 2000 chars.');
    }

    return {
      reporterUid: threat.reporterUid || 'anonymous-reporter',
      threatLevel: threat.threatLevel,
      threatCategories: Array.isArray(threat.threatCategories) ? threat.threatCategories : [],
      redactedSummary: threat.redactedSummary.trim(),
      normalizedPatternHash: threat.normalizedPatternHash || 'unhashed',
      tacticalIndicators: Array.isArray(threat.tacticalIndicators) ? threat.tacticalIndicators : [],
      inferenceSource: threat.inferenceSource,
      channel: threat.channel || 'sms',
      upvotes: typeof threat.upvotes === 'number' ? Math.max(0, threat.upvotes) : 0,
      campaignId: threat.campaignId || null,
      createdAt: threat.createdAt || serverTimestamp(),
    };
  },

  fromFirestore(
    snapshot: QueryDocumentSnapshot,
    options: SnapshotOptions
  ): PublicThreatDocument {
    const data = snapshot.data(options);
    return {
      id: snapshot.id,
      reporterUid: data.reporterUid || 'anonymous-reporter',
      threatLevel: data.threatLevel || 'UNKNOWN',
      threatCategories: data.threatCategories || [],
      redactedSummary: data.redactedSummary || '',
      normalizedPatternHash: data.normalizedPatternHash || '',
      tacticalIndicators: data.tacticalIndicators || [],
      inferenceSource: data.inferenceSource || 'on-device',
      channel: data.channel || 'sms',
      upvotes: typeof data.upvotes === 'number' ? data.upvotes : 0,
      campaignId: data.campaignId || null,
      createdAt: data.createdAt,
    };
  },
};

export const campaignConverter: FirestoreDataConverter<CampaignDocument> = {
  toFirestore(campaign: CampaignDocument) {
    return {
      name: campaign.name,
      threatType: campaign.threatType,
      totalSignals: Math.max(0, campaign.totalSignals || 0),
      corroboratedHashes: Array.isArray(campaign.corroboratedHashes)
        ? campaign.corroboratedHashes
        : [],
      status: campaign.status || 'MONITORING',
      indicators: Array.isArray(campaign.indicators) ? campaign.indicators : [],
      createdAt: campaign.createdAt || serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
  },

  fromFirestore(
    snapshot: QueryDocumentSnapshot,
    options: SnapshotOptions
  ): CampaignDocument {
    const data = snapshot.data(options);
    return {
      id: snapshot.id,
      name: data.name || 'Unnamed Campaign',
      threatType: data.threatType || 'UNKNOWN',
      totalSignals: typeof data.totalSignals === 'number' ? data.totalSignals : 0,
      corroboratedHashes: Array.isArray(data.corroboratedHashes)
        ? data.corroboratedHashes
        : [],
      status: data.status || 'MONITORING',
      indicators: Array.isArray(data.indicators) ? data.indicators : [],
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  },
};

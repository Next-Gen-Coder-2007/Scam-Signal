import {
  FirestoreDataConverter,
  QueryDocumentSnapshot,
  SnapshotOptions,
  serverTimestamp,
  Timestamp,
  FieldValue,
} from 'firebase/firestore';
import { ThreatLevel, InferenceSource } from '../../types/threat';

export type ReportVisibility = 'community_public' | 'analysts_only';
export type VerificationStatus = 'pending' | 'verified' | 'rejected';

export interface PendingReportDocument {
  id?: string;
  reporterUid: string;
  redactedSummary: string;
  category: string;
  indicators: string[];
  evidence: string[];
  riskAssessment: ThreatLevel;
  observedDate: string; // YYYY-MM-DD
  visibility: ReportVisibility;
  channel: 'sms' | 'email' | 'whatsapp' | 'call' | 'web';
  inferenceSource: InferenceSource;
  normalizedPatternHash: string;
  verificationStatus: VerificationStatus;
  campaignId: string | null;
  createdAt: Timestamp | FieldValue;
}

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

export type ReportCampaignLinkStatus = 'candidate' | 'confirmed' | 'dismissed';

export interface ReportCampaignLinkDocument {
  id?: string;
  reportId: string;
  campaignId: string;
  correlationScore: number;
  status: ReportCampaignLinkStatus;
  verificationStatus: 'unverified' | 'verified';
  supportingIndicators: string[];
  explanation: string;
  createdAt: Timestamp | FieldValue;
  updatedAt: Timestamp | FieldValue;
}

export interface CampaignAnalysisDocument {
  id?: string;
  campaignId: string;
  deterministicSummary: {
    status: 'CANDIDATE' | 'ACTIVE_WAVE';
    verificationStatus: 'unverified';
    totalReports: number;
    supportingIndicators: string[];
    linkCount: number;
  };
  sharedIndicatorsSummary: string;
  relationshipExplanation: string;
  inconsistencies: string[];
  evidenceToReview: string[];
  referencedReportIds: string[];
  inferenceSource: InferenceSource;
  modelIdentifier: string;
  createdAt: Timestamp | FieldValue;
  updatedAt: Timestamp | FieldValue;
}

export interface CampaignConfirmationDocument {
  id?: string;
  campaignId: string;
  userUid: string;
  note?: string;
  createdAt: Timestamp | FieldValue;
}

export type DisputeModerationStatus = 'open' | 'reviewed_upheld' | 'reviewed_dismissed';

export interface CampaignDisputeDocument {
  id?: string;
  campaignId: string;
  targetReportId: string | null;
  userUid: string;
  reason: string;
  moderationStatus: DisputeModerationStatus;
  createdAt: Timestamp | FieldValue;
  updatedAt: Timestamp | FieldValue;
}

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Typed Firestore Data Converter for Pending Community Reports.
 * Stores only sanitized fields and enforces pending verificationStatus on creation.
 */
export const pendingReportConverter: FirestoreDataConverter<PendingReportDocument> = {
  toFirestore(report: PendingReportDocument) {
    if (!report.redactedSummary || report.redactedSummary.trim().length === 0) {
      throw new Error('Pending report must contain a non-empty redactedSummary.');
    }
    if (report.redactedSummary.length > 2000) {
      throw new Error('Pending report redactedSummary exceeds maximum length of 2000 chars.');
    }
    if (!DATE_REGEX.test(report.observedDate)) {
      throw new Error('Pending report observedDate must use YYYY-MM-DD format.');
    }
    if (report.visibility !== 'community_public' && report.visibility !== 'analysts_only') {
      throw new Error('Invalid visibility preference.');
    }

    return {
      reporterUid: report.reporterUid,
      redactedSummary: report.redactedSummary.trim(),
      category: report.category,
      indicators: Array.isArray(report.indicators) ? report.indicators.slice(0, 10) : [],
      evidence: Array.isArray(report.evidence) ? report.evidence.slice(0, 10) : [],
      riskAssessment: report.riskAssessment,
      observedDate: report.observedDate,
      visibility: report.visibility,
      channel: report.channel || 'sms',
      inferenceSource: report.inferenceSource || 'unknown',
      normalizedPatternHash: report.normalizedPatternHash || 'unhashed',
      verificationStatus: 'pending' as const,
      campaignId: null,
      createdAt: report.createdAt || serverTimestamp(),
    };
  },

  fromFirestore(
    snapshot: QueryDocumentSnapshot,
    options: SnapshotOptions
  ): PendingReportDocument {
    const data = snapshot.data(options);
    return {
      id: snapshot.id,
      reporterUid: data.reporterUid || '',
      redactedSummary: data.redactedSummary || '',
      category: data.category || 'ambiguous_unclear',
      indicators: Array.isArray(data.indicators) ? data.indicators : [],
      evidence: Array.isArray(data.evidence) ? data.evidence : [],
      riskAssessment: data.riskAssessment || 'UNKNOWN',
      observedDate: data.observedDate || '',
      visibility: data.visibility === 'analysts_only' ? 'analysts_only' : 'community_public',
      channel: data.channel || 'sms',
      inferenceSource: data.inferenceSource || 'unknown',
      normalizedPatternHash: data.normalizedPatternHash || '',
      verificationStatus: data.verificationStatus || 'pending',
      campaignId: data.campaignId ?? null,
      createdAt: data.createdAt,
    };
  },
};

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
      inferenceSource: data.inferenceSource || 'unknown',
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

export const reportCampaignLinkConverter: FirestoreDataConverter<ReportCampaignLinkDocument> = {
  toFirestore(link: ReportCampaignLinkDocument) {
    if (!link.reportId || !link.campaignId) {
      throw new Error('Report-to-campaign link requires both reportId and campaignId.');
    }
    return {
      reportId: link.reportId,
      campaignId: link.campaignId,
      correlationScore: Number(Math.max(0, Math.min(1, link.correlationScore)).toFixed(3)),
      status: link.status || 'candidate',
      // Never automatically mark any correlated campaign link as verified
      verificationStatus: 'unverified' as const,
      supportingIndicators: Array.isArray(link.supportingIndicators)
        ? link.supportingIndicators.slice(0, 20)
        : [],
      explanation: link.explanation || '',
      createdAt: link.createdAt || serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
  },

  fromFirestore(
    snapshot: QueryDocumentSnapshot,
    options: SnapshotOptions
  ): ReportCampaignLinkDocument {
    const data = snapshot.data(options);
    return {
      id: snapshot.id,
      reportId: data.reportId || '',
      campaignId: data.campaignId || '',
      correlationScore: typeof data.correlationScore === 'number' ? data.correlationScore : 0,
      status: data.status || 'candidate',
      verificationStatus: data.verificationStatus === 'verified' ? 'verified' : 'unverified',
      supportingIndicators: Array.isArray(data.supportingIndicators)
        ? data.supportingIndicators
        : [],
      explanation: data.explanation || '',
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  },
};

export const campaignAnalysisConverter: FirestoreDataConverter<CampaignAnalysisDocument> = {
  toFirestore(analysis: CampaignAnalysisDocument) {
    if (!analysis.campaignId) {
      throw new Error('Campaign analysis requires a campaignId.');
    }
    return {
      campaignId: analysis.campaignId,
      deterministicSummary: {
        status: analysis.deterministicSummary.status,
        verificationStatus: 'unverified' as const,
        totalReports: Math.max(0, analysis.deterministicSummary.totalReports),
        supportingIndicators: analysis.deterministicSummary.supportingIndicators.slice(0, 30),
        linkCount: Math.max(0, analysis.deterministicSummary.linkCount),
      },
      sharedIndicatorsSummary: analysis.sharedIndicatorsSummary,
      relationshipExplanation: analysis.relationshipExplanation,
      inconsistencies: analysis.inconsistencies.slice(0, 10),
      evidenceToReview: analysis.evidenceToReview.slice(0, 10),
      referencedReportIds: Array.from(new Set(analysis.referencedReportIds)).slice(0, 15),
      inferenceSource: analysis.inferenceSource || 'unknown',
      modelIdentifier: analysis.modelIdentifier || 'Firebase AI Logic',
      createdAt: analysis.createdAt || serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
  },

  fromFirestore(
    snapshot: QueryDocumentSnapshot,
    options: SnapshotOptions
  ): CampaignAnalysisDocument {
    const data = snapshot.data(options);
    return {
      id: snapshot.id,
      campaignId: data.campaignId || snapshot.id,
      deterministicSummary: {
        status: data.deterministicSummary?.status || 'CANDIDATE',
        verificationStatus: 'unverified',
        totalReports: Number(data.deterministicSummary?.totalReports || 0),
        supportingIndicators: Array.isArray(data.deterministicSummary?.supportingIndicators)
          ? data.deterministicSummary.supportingIndicators
          : [],
        linkCount: Number(data.deterministicSummary?.linkCount || 0),
      },
      sharedIndicatorsSummary: data.sharedIndicatorsSummary || '',
      relationshipExplanation: data.relationshipExplanation || '',
      inconsistencies: Array.isArray(data.inconsistencies) ? data.inconsistencies : [],
      evidenceToReview: Array.isArray(data.evidenceToReview) ? data.evidenceToReview : [],
      referencedReportIds: Array.isArray(data.referencedReportIds)
        ? data.referencedReportIds
        : [],
      inferenceSource: data.inferenceSource || 'unknown',
      modelIdentifier: data.modelIdentifier || 'Firebase AI Logic',
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  },
};

export const campaignConfirmationConverter: FirestoreDataConverter<CampaignConfirmationDocument> = {
  toFirestore(conf: CampaignConfirmationDocument) {
    if (!conf.campaignId || !conf.userUid) {
      throw new Error('Campaign confirmation requires campaignId and userUid.');
    }
    return {
      campaignId: conf.campaignId,
      userUid: conf.userUid,
      ...(conf.note ? { note: conf.note.trim().slice(0, 300) } : {}),
      createdAt: conf.createdAt || serverTimestamp(),
    };
  },

  fromFirestore(
    snapshot: QueryDocumentSnapshot,
    options: SnapshotOptions
  ): CampaignConfirmationDocument {
    const data = snapshot.data(options);
    return {
      id: snapshot.id,
      campaignId: data.campaignId || '',
      userUid: data.userUid || '',
      note: data.note,
      createdAt: data.createdAt,
    };
  },
};

export const campaignDisputeConverter: FirestoreDataConverter<CampaignDisputeDocument> = {
  toFirestore(dispute: CampaignDisputeDocument) {
    if (!dispute.campaignId || !dispute.userUid) {
      throw new Error('Campaign dispute requires campaignId and userUid.');
    }
    if (!dispute.reason || dispute.reason.trim().length < 10) {
      throw new Error('Dispute reason must be at least 10 characters.');
    }
    return {
      campaignId: dispute.campaignId,
      targetReportId: dispute.targetReportId ?? null,
      userUid: dispute.userUid,
      reason: dispute.reason.trim().slice(0, 500),
      moderationStatus: 'open' as const,
      createdAt: dispute.createdAt || serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
  },

  fromFirestore(
    snapshot: QueryDocumentSnapshot,
    options: SnapshotOptions
  ): CampaignDisputeDocument {
    const data = snapshot.data(options);
    return {
      id: snapshot.id,
      campaignId: data.campaignId || '',
      targetReportId: data.targetReportId ?? null,
      userUid: data.userUid || '',
      reason: data.reason || '',
      moderationStatus: data.moderationStatus || 'open',
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
  },
};

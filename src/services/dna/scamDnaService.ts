import { InferenceMode } from 'firebase/ai';
import { firebaseStatus } from '../firebase/firebaseApp';
import { executeScamDnaInference } from '../ai/firebaseAILogic';
import type { PendingReportDocument } from '../firestore/threatConverter';
import { SCAM_CATEGORIES, type ScamCategory } from '../ai/analysisSchema';
import {
  ScamDnaInput,
  ScamDnaInputSchema,
  ScamDnaSignature,
  ScamDnaSignatureSchema,
  type ImpersonationIndicator,
  type UrgencyPattern,
} from './scamDnaSchema';
import {
  buildCanonicalDnaSignature,
  computeSha256Hex,
  dedupeSorted,
} from './scamDnaNormalizer';
import { extractDeterministicDna } from './deterministicDnaExtractor';

export interface ExtractScamDnaOptions {
  /** Whether to invoke Firebase AI Logic for additional structured interpretation (default: true when configured). */
  useAi?: boolean;
  /** If true, throws if AI interpretation fails or Firebase is unconfigured. */
  requireAi?: boolean;
  /** Inference mode for sanitized Scam DNA interpretation (defaults to ONLY_IN_CLOUD). */
  inferenceMode?: InferenceMode;
  signal?: AbortSignal;
}

export interface ScamDnaComparisonResult {
  exactHashMatch: boolean;
  similarityScore: number;
  sameCategory: boolean;
  sameOrganizationType: boolean;
  sameRequestedAction: boolean;
  samePaymentMechanism: boolean;
  sharedDomains: string[];
  sharedPhrases: string[];
  sharedUrgencyPatterns: UrgencyPattern[];
  sharedImpersonationIndicators: ImpersonationIndicator[];
}

/**
 * Extracts a validated, normalized Scam DNA signature from a sanitized report.
 * Strictly separates deterministically observed indicators from AI-inferred attributes.
 */
export async function extractScamDna(
  rawInput: ScamDnaInput,
  options: ExtractScamDnaOptions = {}
): Promise<ScamDnaSignature> {
  const input = ScamDnaInputSchema.parse(rawInput);
  const deterministic = extractDeterministicDna(input);
  const { observed } = deterministic;

  let inferred: ScamDnaSignature['inferred'] = {
    scamCategory: deterministic.fallbackCategory,
    primaryClaimedOrganizationType: deterministic.primaryClaimedOrganizationType,
    primaryRequestedAction: deterministic.primaryRequestedAction,
    primaryPaymentMechanism: deterministic.primaryPaymentMechanism,
    additionalUrgencyPatterns: [],
    additionalImpersonationIndicators: [],
    rationale:
      'Derived deterministically from directly observed indicators in the sanitized report.',
    inferenceSource: 'unknown',
    isAiAssisted: false,
  };

  const shouldRunAi =
    options.useAi !== false && (Boolean(options.requireAi) || firebaseStatus.isConfigured);

  if (shouldRunAi) {
    try {
      const aiResult = await executeScamDnaInference({
        sanitizedText: input.sanitizedText,
        channel: input.channel,
        mode: options.inferenceMode ?? InferenceMode.ONLY_IN_CLOUD,
        signal: options.signal,
      });

      const observedUrgencySet = new Set(observed.urgencyPatterns);
      const observedImpSet = new Set(observed.impersonationIndicators);

      inferred = {
        scamCategory: aiResult.scamCategory,
        primaryClaimedOrganizationType: aiResult.claimedOrganizationType,
        primaryRequestedAction: aiResult.requestedAction,
        primaryPaymentMechanism: aiResult.paymentMechanism,
        additionalUrgencyPatterns: dedupeSorted(
          aiResult.urgencyPatterns.filter((p) => !observedUrgencySet.has(p))
        ),
        additionalImpersonationIndicators: dedupeSorted(
          aiResult.impersonationIndicators.filter((p) => !observedImpSet.has(p))
        ),
        rationale: aiResult.rationale.trim(),
        inferenceSource: aiResult.source,
        isAiAssisted: true,
      };
    } catch (err) {
      if (options.requireAi) {
        throw err;
      }
      // Graceful fallback to deterministic-only DNA when AI is unavailable or invalid
    }
  }

  // Normalized signature gives precedence to directly observed attributes
  const normalizedCategory = inferred.scamCategory;
  const normalizedOrgType =
    deterministic.primaryClaimedOrganizationType !== 'unknown_unspecified'
      ? deterministic.primaryClaimedOrganizationType
      : inferred.primaryClaimedOrganizationType;
  const normalizedAction =
    deterministic.primaryRequestedAction !== 'none_detected'
      ? deterministic.primaryRequestedAction
      : inferred.primaryRequestedAction;
  const normalizedPayment =
    deterministic.primaryPaymentMechanism !== 'none_detected'
      ? deterministic.primaryPaymentMechanism
      : inferred.primaryPaymentMechanism;

  const normalizedUrgency = dedupeSorted([
    ...observed.urgencyPatterns,
    ...inferred.additionalUrgencyPatterns,
  ]);
  const normalizedImpersonation = dedupeSorted([
    ...observed.impersonationIndicators,
    ...inferred.additionalImpersonationIndicators,
  ]);

  const canonicalSignature = buildCanonicalDnaSignature({
    scamCategory: normalizedCategory,
    claimedOrganizationType: normalizedOrgType,
    requestedAction: normalizedAction,
    paymentMechanism: normalizedPayment,
    urgencyPatterns: normalizedUrgency,
    impersonationIndicators: normalizedImpersonation,
    suspiciousDomains: observed.suspiciousDomains,
    recurringPhrases: observed.recurringPhrases,
  });

  const dnaHash = await computeSha256Hex(canonicalSignature);

  return ScamDnaSignatureSchema.parse({
    version: '1.0',
    observed,
    inferred,
    normalized: {
      scamCategory: normalizedCategory,
      claimedOrganizationType: normalizedOrgType,
      requestedAction: normalizedAction,
      paymentMechanism: normalizedPayment,
      urgencyPatterns: normalizedUrgency,
      impersonationIndicators: normalizedImpersonation,
      suspiciousDomains: observed.suspiciousDomains,
      recurringPhrases: observed.recurringPhrases,
      canonicalSignature,
      dnaHash,
    },
    extractedAt: new Date().toISOString(),
  });
}

function toScamCategoryHint(category: string): ScamCategory | undefined {
  return (SCAM_CATEGORIES as readonly string[]).includes(category)
    ? (category as ScamCategory)
    : undefined;
}

/**
 * Converts a PendingReportDocument into a validated ScamDnaSignature.
 */
export async function extractScamDnaFromPendingReport(
  report: Pick<PendingReportDocument, 'redactedSummary' | 'category' | 'evidence' | 'channel'>,
  options: ExtractScamDnaOptions = {}
): Promise<ScamDnaSignature> {
  return extractScamDna(
    {
      sanitizedText: report.redactedSummary,
      categoryHint: toScamCategoryHint(report.category),
      observedEvidence: report.evidence,
      channel: report.channel,
    },
    options
  );
}

function jaccard<T extends string>(a: readonly T[], b: readonly T[]): number {
  if (a.length === 0 && b.length === 0) return 0;
  const setA = new Set(a);
  const setB = new Set(b);
  let intersection = 0;
  for (const item of setA) {
    if (setB.has(item)) intersection++;
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Compares two normalized Scam DNA signatures deterministically to detect
 * potential campaign overlap.
 */
export function compareScamDna(
  a: ScamDnaSignature,
  b: ScamDnaSignature
): ScamDnaComparisonResult {
  const na = a.normalized;
  const nb = b.normalized;

  const exactHashMatch = na.dnaHash === nb.dnaHash;
  const sameCategory = na.scamCategory === nb.scamCategory;
  const sameOrganizationType =
    na.claimedOrganizationType !== 'unknown_unspecified' &&
    na.claimedOrganizationType === nb.claimedOrganizationType;
  const sameRequestedAction =
    na.requestedAction !== 'none_detected' && na.requestedAction === nb.requestedAction;
  const samePaymentMechanism =
    na.paymentMechanism !== 'none_detected' && na.paymentMechanism === nb.paymentMechanism;

  const sharedDomains = na.suspiciousDomains.filter((d) => nb.suspiciousDomains.includes(d));
  const sharedPhrases = na.recurringPhrases.filter((p) => nb.recurringPhrases.includes(p));
  const sharedUrgencyPatterns = na.urgencyPatterns.filter((u) =>
    nb.urgencyPatterns.includes(u)
  );
  const sharedImpersonationIndicators = na.impersonationIndicators.filter((i) =>
    nb.impersonationIndicators.includes(i)
  );

  let weighted = 0;
  let totalWeight = 0;

  // Categorical / structural weights
  totalWeight += 0.2;
  if (sameCategory) weighted += 0.2;

  totalWeight += 0.15;
  if (sameOrganizationType) weighted += 0.15;

  totalWeight += 0.15;
  if (sameRequestedAction) weighted += 0.15;

  if (na.paymentMechanism !== 'none_detected' || nb.paymentMechanism !== 'none_detected') {
    totalWeight += 0.1;
    if (samePaymentMechanism) weighted += 0.1;
  }

  // Indicator set similarities
  if (na.suspiciousDomains.length > 0 || nb.suspiciousDomains.length > 0) {
    totalWeight += 0.2;
    weighted += 0.2 * jaccard(na.suspiciousDomains, nb.suspiciousDomains);
  }
  if (na.recurringPhrases.length > 0 || nb.recurringPhrases.length > 0) {
    totalWeight += 0.15;
    weighted += 0.15 * jaccard(na.recurringPhrases, nb.recurringPhrases);
  }
  if (na.urgencyPatterns.length > 0 || nb.urgencyPatterns.length > 0) {
    totalWeight += 0.1;
    weighted += 0.1 * jaccard(na.urgencyPatterns, nb.urgencyPatterns);
  }
  if (na.impersonationIndicators.length > 0 || nb.impersonationIndicators.length > 0) {
    totalWeight += 0.1;
    weighted += 0.1 * jaccard(na.impersonationIndicators, nb.impersonationIndicators);
  }

  const similarityScore = exactHashMatch
    ? 1
    : totalWeight > 0
    ? Number((weighted / totalWeight).toFixed(3))
    : 0;

  return {
    exactHashMatch,
    similarityScore,
    sameCategory,
    sameOrganizationType,
    sameRequestedAction,
    samePaymentMechanism,
    sharedDomains,
    sharedPhrases,
    sharedUrgencyPatterns,
    sharedImpersonationIndicators,
  };
}

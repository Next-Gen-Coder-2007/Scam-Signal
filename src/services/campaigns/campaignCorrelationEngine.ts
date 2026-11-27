import {
  CORRELATION_WEIGHTS,
  MIN_CORRELATION_SCORE,
  isSpecificRecurringPhrase,
  type CorrelatedCampaignCluster,
  type CorrelationEvidenceItem,
  type PairwiseCorrelationResult,
  type ReportCorrelationInput,
} from './correlationRules';

function normalizeSafeTokens(tokens?: string[]): string[] {
  if (!tokens || tokens.length === 0) return [];
  const set = new Set<string>();
  for (const token of tokens) {
    const cleaned = token.trim().toLowerCase();
    if (!cleaned || cleaned.includes('[redacted')) continue;
    if (cleaned.length >= 4) {
      set.add(cleaned);
    }
  }
  return Array.from(set).sort();
}

function intersectSorted(a: readonly string[], b: readonly string[]): string[] {
  const setB = new Set(b);
  return a.filter((item) => setB.has(item));
}

function hasStrongAnchor(items: readonly CorrelationEvidenceItem[]): boolean {
  return items.some(
    (item) =>
      item.type === 'shared_domain' ||
      item.type === 'matching_payment_identifier' ||
      item.type === 'repeated_contact_detail'
  );
}

/**
 * Compares two report signatures deterministically using transparent evidence weights.
 * Prevents grouping based solely on generic words or weak single-signal overlaps.
 */
export function correlateReportPair(
  a: ReportCorrelationInput,
  b: ReportCorrelationInput
): PairwiseCorrelationResult {
  const supportingIndicators: CorrelationEvidenceItem[] = [];

  // 1. Shared suspicious domains (directly observed)
  const sharedDomains = intersectSorted(
    a.dna.observed.suspiciousDomains,
    b.dna.observed.suspiciousDomains
  );
  for (const domain of sharedDomains) {
    supportingIndicators.push({
      type: 'shared_domain',
      value: domain,
      weight: CORRELATION_WEIGHTS.shared_domain,
      explanation: `Both reports reference the suspicious domain "${domain}".`,
    });
  }

  // 2. Matching safely tokenized payment identifiers
  const sharedPayments = intersectSorted(
    normalizeSafeTokens(a.paymentIdentifiers),
    normalizeSafeTokens(b.paymentIdentifiers)
  );
  for (const payId of sharedPayments) {
    supportingIndicators.push({
      type: 'matching_payment_identifier',
      value: payId,
      weight: CORRELATION_WEIGHTS.matching_payment_identifier,
      explanation: `Both reports share the tokenized payment identifier "${payId}".`,
    });
  }

  // 3. Repeated safely tokenized contact details
  const sharedContacts = intersectSorted(
    normalizeSafeTokens(a.contactTokens),
    normalizeSafeTokens(b.contactTokens)
  );
  for (const contact of sharedContacts) {
    supportingIndicators.push({
      type: 'repeated_contact_detail',
      value: contact,
      weight: CORRELATION_WEIGHTS.repeated_contact_detail,
      explanation: `Both reports share the tokenized contact detail "${contact}".`,
    });
  }

  // 4. Shared specific recurring phrases (excluding generic single words like "urgent"/"payment")
  const specificPhrasesA = a.dna.observed.recurringPhrases.filter(isSpecificRecurringPhrase);
  const specificPhrasesB = b.dna.observed.recurringPhrases.filter(isSpecificRecurringPhrase);
  const sharedPhrases = intersectSorted(specificPhrasesA, specificPhrasesB);
  for (const phrase of sharedPhrases) {
    supportingIndicators.push({
      type: 'recurring_phrase',
      value: phrase,
      weight: CORRELATION_WEIGHTS.recurring_phrase,
      explanation: `Both reports contain the recurring phrase "${phrase}".`,
    });
  }

  // 5. Matching impersonated organization type (excluding unknown_unspecified)
  const orgA = a.dna.normalized.claimedOrganizationType;
  const orgB = b.dna.normalized.claimedOrganizationType;
  if (orgA !== 'unknown_unspecified' && orgA === orgB) {
    supportingIndicators.push({
      type: 'matching_impersonated_org',
      value: orgA,
      weight: CORRELATION_WEIGHTS.matching_impersonated_org,
      explanation: `Both reports impersonate organization type "${orgA}".`,
    });
  }

  // 6. Similar requested action (excluding none_detected)
  const actA = a.dna.normalized.requestedAction;
  const actB = b.dna.normalized.requestedAction;
  if (actA !== 'none_detected' && actA === actB) {
    supportingIndicators.push({
      type: 'similar_requested_action',
      value: actA,
      weight: CORRELATION_WEIGHTS.similar_requested_action,
      explanation: `Both reports request the same action "${actA}".`,
    });
  }

  const rawScore = supportingIndicators.reduce((sum, item) => sum + item.weight, 0);
  const score = Number(Math.min(1, rawScore).toFixed(3));
  const distinctTypes = new Set(supportingIndicators.map((item) => item.type)).size;
  const strongAnchorPresent = hasStrongAnchor(supportingIndicators);

  if (supportingIndicators.length === 0) {
    return {
      reportAId: a.reportId,
      reportBId: b.reportId,
      matched: false,
      score: 0,
      supportingIndicators: [],
      explanation: 'No deterministic campaign indicators overlap between these reports.',
      rejectionReason: 'NO_SHARED_INDICATORS',
    };
  }

  if (score < MIN_CORRELATION_SCORE || (!strongAnchorPresent && distinctTypes < 2)) {
    return {
      reportAId: a.reportId,
      reportBId: b.reportId,
      matched: false,
      score,
      supportingIndicators,
      explanation: `Insufficient deterministic evidence (score ${score}, requires >= ${MIN_CORRELATION_SCORE} with a strong anchor or >= 2 distinct indicator types).`,
      rejectionReason: 'BELOW_CORRELATION_THRESHOLD',
    };
  }

  const summaryParts = supportingIndicators.map((item) => `${item.type}:${item.value}`);
  return {
    reportAId: a.reportId,
    reportBId: b.reportId,
    matched: true,
    score,
    supportingIndicators,
    explanation: `Matched on ${supportingIndicators.length} deterministic indicator(s) [${summaryParts.join(', ')}] with score ${score}.`,
  };
}

function formatCategoryName(category: string): string {
  return category
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

function buildDeterministicCampaignId(reportIds: string[]): string {
  const sorted = [...reportIds].sort();
  const seed = sorted.join('|');
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const hex = (hash >>> 0).toString(16).padStart(8, '0');
  return `camp-${hex}`;
}

/**
 * Correlates a set of sanitized reports into unverified candidate campaigns
 * using deterministic connected-component graph clustering.
 * Never automatically marks any campaign as verified.
 */
export function correlateReportsIntoCampaigns(
  reports: ReportCorrelationInput[]
): CorrelatedCampaignCluster[] {
  if (reports.length < 2) return [];

  const adjacency = new Map<string, Set<string>>();
  const matchedLinks: PairwiseCorrelationResult[] = [];

  for (const report of reports) {
    adjacency.set(report.reportId, new Set());
  }

  for (let i = 0; i < reports.length; i++) {
    for (let j = i + 1; j < reports.length; j++) {
      const pairResult = correlateReportPair(reports[i], reports[j]);
      if (pairResult.matched) {
        matchedLinks.push(pairResult);
        adjacency.get(reports[i].reportId)?.add(reports[j].reportId);
        adjacency.get(reports[j].reportId)?.add(reports[i].reportId);
      }
    }
  }

  const visited = new Set<string>();
  const reportById = new Map(reports.map((r) => [r.reportId, r]));
  const clusters: CorrelatedCampaignCluster[] = [];

  for (const report of reports) {
    if (visited.has(report.reportId)) continue;

    const component: string[] = [];
    const queue: string[] = [report.reportId];
    visited.add(report.reportId);

    while (queue.length > 0) {
      const current = queue.shift()!;
      component.push(current);
      for (const neighbor of adjacency.get(current) ?? []) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);
        }
      }
    }

    if (component.length < 2) continue;

    const sortedReportIds = [...component].sort();
    const componentSet = new Set(sortedReportIds);
    const componentLinks = matchedLinks.filter(
      (link) => componentSet.has(link.reportAId) && componentSet.has(link.reportBId)
    );

    const indicatorMap = new Map<string, CorrelationEvidenceItem>();
    for (const link of componentLinks) {
      for (const item of link.supportingIndicators) {
        const key = `${item.type}:${item.value}`;
        if (!indicatorMap.has(key)) {
          indicatorMap.set(key, item);
        }
      }
    }

    const firstReport = reportById.get(sortedReportIds[0]);
    const primaryCategory = firstReport?.dna.normalized.scamCategory ?? 'ambiguous_unclear';
    const campaignId = buildDeterministicCampaignId(sortedReportIds);

    clusters.push({
      campaignId,
      name: `${formatCategoryName(primaryCategory)} Cluster #${campaignId.slice(5).toUpperCase()}`,
      primaryCategory,
      status: sortedReportIds.length >= 3 ? 'ACTIVE_WAVE' : 'CANDIDATE',
      verificationStatus: 'unverified',
      reportIds: sortedReportIds,
      totalReports: sortedReportIds.length,
      supportingIndicators: Array.from(indicatorMap.values()),
      links: componentLinks,
      createdAt: new Date().toISOString(),
    });
  }

  return clusters.sort((a, b) => b.totalReports - a.totalReports);
}

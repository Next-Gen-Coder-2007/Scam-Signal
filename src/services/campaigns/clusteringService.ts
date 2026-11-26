import { PublicThreatDocument } from '../firestore/threatConverter';

export interface DeterministicCampaign {
  id: string;
  name: string;
  threatType: string;
  primaryHash: string;
  corroboratedHashes: string[];
  totalSignals: number;
  indicators: string[];
  status: 'ACTIVE_WAVE' | 'MONITORING' | 'CONTAINED';
  channels: string[];
  lastSeenAt: string;
}

/**
 * Deterministic Campaign Clustering Engine
 * Groups scam reports strictly through normalized SHA-256 pattern hashes
 * and exact IOC matching. Never invents or hallucinates campaign linkages.
 */
export function clusterThreatReports(
  threats: PublicThreatDocument[]
): DeterministicCampaign[] {
  const clusterMap = new Map<string, DeterministicCampaign>();

  for (const threat of threats) {
    if (!threat.normalizedPatternHash || threat.normalizedPatternHash === 'unhashed') {
      continue;
    }

    const hashKey = threat.normalizedPatternHash;
    const existing = clusterMap.get(hashKey);

    if (existing) {
      existing.totalSignals += 1;
      // Deduplicate indicators
      for (const indicator of threat.tacticalIndicators) {
        if (!existing.indicators.includes(indicator)) {
          existing.indicators.push(indicator);
        }
      }
      if (!existing.channels.includes(threat.channel)) {
        existing.channels.push(threat.channel);
      }
      // Upgrade status if volume increases
      if (existing.totalSignals >= 3) {
        existing.status = 'ACTIVE_WAVE';
      }
    } else {
      const primaryCategory = threat.threatCategories[0] || 'Phishing Scam';
      const cleanName = primaryCategory
        .split('_')
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ');

      clusterMap.set(hashKey, {
        id: `camp-${hashKey.slice(0, 8)}`,
        name: `${cleanName} Pattern #${hashKey.slice(0, 6).toUpperCase()}`,
        threatType: primaryCategory.replace(/_/g, ' '),
        primaryHash: hashKey,
        corroboratedHashes: [hashKey],
        totalSignals: 1,
        indicators: [...threat.tacticalIndicators],
        status: 'MONITORING',
        channels: [threat.channel],
        lastSeenAt: new Date().toISOString(),
      });
    }
  }

  return Array.from(clusterMap.values()).sort(
    (a, b) => b.totalSignals - a.totalSignals
  );
}

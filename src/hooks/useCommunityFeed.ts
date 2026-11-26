import { useState, useCallback, useEffect } from 'react';
import { ThreatSummaryItem, ThreatLevel } from '../types/threat';
import { redactPII, computePatternHash } from '../utils/redactor';

const INITIAL_THREATS: ThreatSummaryItem[] = [
  {
    id: 'th-891',
    threatLevel: 'CRITICAL',
    confidenceScore: 96,
    threatCategory: 'BANK_IMPERSONATION',
    redactedExcerpt: 'URGENT: [REDACTED_BANK] alert. Your card [REDACTED_CARD] has been suspended. Confirm identity: http://secure-[REDACTED].xyz',
    channel: 'sms',
    inferenceSource: 'on-device',
    timestamp: '12m ago',
    upvotes: 42,
    campaignId: 'camp-axis-sms-wave-4',
  },
  {
    id: 'th-890',
    threatLevel: 'HIGH',
    confidenceScore: 89,
    threatCategory: 'JOB_TASK_FRAUD',
    redactedExcerpt: 'Part-time opportunity liking video reels. Daily payout $300. Send registration deposit to [REDACTED_UPI].',
    channel: 'whatsapp',
    inferenceSource: 'hybrid-fallback',
    timestamp: '34m ago',
    upvotes: 19,
    campaignId: 'camp-wa-task-phish',
  },
  {
    id: 'th-889',
    threatLevel: 'SUSPICIOUS',
    confidenceScore: 74,
    threatCategory: 'PARCEL_CUSTOMS_FEE',
    redactedExcerpt: 'Package tracking pending delivery fee of $1.85. Update shipping address at [REDACTED_URL]',
    channel: 'sms',
    inferenceSource: 'cloud',
    timestamp: '1h ago',
    upvotes: 11,
    campaignId: null,
  },
];

export interface SubmitThreatPayload {
  rawContent: string;
  channel: 'sms' | 'email' | 'whatsapp' | 'call' | 'web';
  threatLevel: ThreatLevel;
  threatCategory: string;
}

export function useCommunityFeed() {
  const [threats, setThreats] = useState<ThreatSummaryItem[]>(() => {
    const saved = localStorage.getItem('scamsignal_community_feed');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // Fallback to default
      }
    }
    return INITIAL_THREATS;
  });

  useEffect(() => {
    localStorage.setItem('scamsignal_community_feed', JSON.stringify(threats));
  }, [threats]);

  const upvoteThreat = useCallback((threatId: string) => {
    setThreats((prev) =>
      prev.map((t) => (t.id === threatId ? { ...t, upvotes: (t.upvotes || 0) + 1 } : t))
    );
  }, []);

  const submitThreat = useCallback(
    async (payload: SubmitThreatPayload): Promise<ThreatSummaryItem> => {
      const scrubbed = redactPII(payload.rawContent);
      const hash = await computePatternHash(scrubbed);

      const newItem: ThreatSummaryItem = {
        id: `th-${Date.now().toString().slice(-4)}`,
        threatLevel: payload.threatLevel,
        confidenceScore: 90,
        threatCategory: payload.threatCategory,
        redactedExcerpt: scrubbed,
        channel: payload.channel,
        inferenceSource: 'on-device',
        timestamp: 'Just now',
        upvotes: 1,
        campaignId: `camp-${hash.slice(0, 8)}`,
      };

      setThreats((prev) => [newItem, ...prev]);
      return newItem;
    },
    []
  );

  return {
    threats,
    upvoteThreat,
    submitThreat,
  };
}

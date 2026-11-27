import { useState, useCallback, useEffect } from 'react';
import { ThreatSummaryItem } from '../types/threat';
import { firebaseStatus } from '../services/firebase/firebaseApp';
import { fetchCommunityReports } from '../services/firestore/threatService';

export function useCommunityFeed() {
  const [threats, setThreats] = useState<ThreatSummaryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(firebaseStatus.isConfigured);
  const [error, setError] = useState<string | null>(null);

  const loadThreats = useCallback(async () => {
    if (!firebaseStatus.isConfigured) {
      setThreats([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const docs = await fetchCommunityReports();
      const mapped: ThreatSummaryItem[] = docs.map((d) => ({
        id: d.id || 'unknown',
        threatLevel: d.riskAssessment,
        confidenceScore: 0,
        threatCategory: d.category,
        redactedExcerpt: d.redactedSummary,
        channel: d.channel,
        inferenceSource: d.inferenceSource,
        timestamp: d.observedDate || 'Synced',
        upvotes: 0,
        campaignId: d.campaignId,
      }));
      setThreats(mapped);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to load pending community reports from Firestore.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadThreats();
  }, [loadThreats]);

  return {
    threats,
    loading,
    error,
    isFirebaseReady: firebaseStatus.isConfigured,
    refresh: loadThreats,
  };
}

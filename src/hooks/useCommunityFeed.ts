import { useState, useCallback, useEffect } from 'react';
import { ThreatSummaryItem, ThreatLevel } from '../types/threat';
import { firebaseStatus } from '../services/firebase/firebaseApp';
import { FirebaseNotConfiguredError } from '../services/firebase/authService';
import {
  fetchPublicThreats,
  submitPublicThreat,
} from '../services/firestore/threatService';
import { useAuth } from '../context/AuthContext';

export interface SubmitThreatPayload {
  rawContent: string;
  channel: 'sms' | 'email' | 'whatsapp' | 'call' | 'web';
  threatLevel: ThreatLevel;
  threatCategory: string;
}

export function useCommunityFeed() {
  const { user } = useAuth();
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
      const docs = await fetchPublicThreats();
      const mapped: ThreatSummaryItem[] = docs.map((d) => ({
        id: d.id || 'unknown',
        threatLevel: d.threatLevel,
        confidenceScore: 90,
        threatCategory: d.threatCategories[0] || 'SUSPICIOUS_SIGNAL',
        redactedExcerpt: d.redactedSummary,
        channel: d.channel,
        inferenceSource: d.inferenceSource,
        timestamp: 'Synced',
        upvotes: d.upvotes,
        campaignId: d.campaignId,
      }));
      setThreats(mapped);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to load community threats from Firestore.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadThreats();
  }, [loadThreats]);

  const submitThreat = useCallback(
    async (payload: SubmitThreatPayload): Promise<ThreatSummaryItem> => {
      if (!firebaseStatus.isConfigured) {
        throw new FirebaseNotConfiguredError('Cloud Firestore');
      }
      if (!user) {
        throw new Error('You must sign in before submitting a community threat signal.');
      }

      const created = await submitPublicThreat({
        reporterUid: user.uid,
        rawContent: payload.rawContent,
        threatLevel: payload.threatLevel,
        threatCategories: [payload.threatCategory],
        tacticalIndicators: [`Channel: ${payload.channel.toUpperCase()}`],
        inferenceSource: 'on_device',
        channel: payload.channel,
      });

      const newItem: ThreatSummaryItem = {
        id: created.id || `th-${Date.now()}`,
        threatLevel: created.threatLevel,
        confidenceScore: 90,
        threatCategory: payload.threatCategory,
        redactedExcerpt: created.redactedSummary,
        channel: created.channel,
        inferenceSource: created.inferenceSource,
        timestamp: 'Just now',
        upvotes: 0,
        campaignId: created.campaignId,
      };

      setThreats((prev) => [newItem, ...prev]);
      return newItem;
    },
    [user]
  );

  return {
    threats,
    loading,
    error,
    isFirebaseReady: firebaseStatus.isConfigured,
    refresh: loadThreats,
    submitThreat,
  };
}

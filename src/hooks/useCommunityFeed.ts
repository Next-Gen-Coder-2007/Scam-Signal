import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { QueryDocumentSnapshot } from 'firebase/firestore';
import { ThreatLevel, ThreatSummaryItem } from '../types/threat';
import { firebaseStatus } from '../services/firebase/firebaseApp';
import { fetchCommunityReportsPage } from '../services/firestore/threatService';
import { PendingReportDocument } from '../services/firestore/threatConverter';
import { formatFirestoreError } from '../utils/firestoreErrors';

const PAGE_SIZE = 10;

export function useCommunityFeed() {
  const [reports, setReports] = useState<PendingReportDocument[]>([]);
  const [loading, setLoading] = useState<boolean>(firebaseStatus.isConfigured);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState<boolean>(false);

  const [category, setCategory] = useState<string>('ALL');
  const [riskLevel, setRiskLevel] = useState<ThreatLevel | 'ALL'>('ALL');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const cursorRef = useRef<QueryDocumentSnapshot<PendingReportDocument> | null>(null);

  const loadFirstPage = useCallback(async () => {
    if (!firebaseStatus.isConfigured) {
      setReports([]);
      cursorRef.current = null;
      setHasMore(false);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    cursorRef.current = null;
    try {
      const page = await fetchCommunityReportsPage({
        pageSize: PAGE_SIZE,
        category,
        riskLevel,
        sortOrder,
      });
      setReports(page.items);
      cursorRef.current = page.nextCursor;
      setHasMore(page.hasMore);
    } catch (err: unknown) {
      setError(
        formatFirestoreError(
          err,
          'Failed to load community reports from Firestore.'
        )
      );
    } finally {
      setLoading(false);
    }
  }, [category, riskLevel, sortOrder]);

  const loadMore = useCallback(async () => {
    if (!firebaseStatus.isConfigured || !hasMore || loadingMore || !cursorRef.current) {
      return;
    }

    setLoadingMore(true);
    setError(null);
    try {
      const page = await fetchCommunityReportsPage({
        pageSize: PAGE_SIZE,
        cursor: cursorRef.current,
        category,
        riskLevel,
        sortOrder,
      });
      setReports((prev) => [...prev, ...page.items]);
      cursorRef.current = page.nextCursor;
      setHasMore(page.hasMore);
    } catch (err: unknown) {
      setError(
        formatFirestoreError(
          err,
          'Failed to load additional community reports.'
        )
      );
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, loadingMore, category, riskLevel, sortOrder]);

  useEffect(() => {
    void loadFirstPage();
  }, [loadFirstPage]);

  const filteredReports = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return reports;
    return reports.filter((r) => {
      const inSummary = r.redactedSummary.toLowerCase().includes(q);
      const inCategory = r.category.toLowerCase().includes(q);
      const inIndicators = r.indicators.some((ind) => ind.toLowerCase().includes(q));
      const inEvidence = r.evidence.some((ev) => ev.toLowerCase().includes(q));
      return inSummary || inCategory || inIndicators || inEvidence;
    });
  }, [reports, searchQuery]);

  // Mapped ThreatSummaryItem[] for CampaignExplorerView compatibility
  const threats = useMemo<ThreatSummaryItem[]>(() => {
    return filteredReports.map((d) => ({
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
  }, [filteredReports]);

  return {
    reports: filteredReports,
    threats,
    loading,
    loadingMore,
    error,
    hasMore,
    category,
    riskLevel,
    sortOrder,
    searchQuery,
    setCategory,
    setRiskLevel,
    setSortOrder,
    setSearchQuery,
    loadMore,
    refresh: loadFirstPage,
    isFirebaseReady: firebaseStatus.isConfigured,
  };
}

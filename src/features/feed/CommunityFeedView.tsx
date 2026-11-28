import React, { useState } from 'react';
import {
  Hash,
  Plus,
  AlertTriangle,
  Database,
  RefreshCw,
  Radio,
  Search,
  Eye,
  Calendar,
  ShieldCheck,
  Clock,
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { ThreatBadge } from '../../components/common/ThreatBadge';
import { EmptyState } from '../../components/common/EmptyState';
import { Button } from '../../components/ui/Button';
import { Input, Select } from '../../components/ui/Input';
import { AuthModal } from '../../components/auth/AuthModal';
import { CommunityReportModal } from '../../components/scam/CommunityReportModal';
import { ReviewStatusBadge } from '../../components/scam/ReviewStatusBadge';
import { ReportDetailModal } from '../../components/scam/ReportDetailModal';
import { useCommunityFeed } from '../../hooks/useCommunityFeed';
import { useAuth } from '../../context/AuthContext';
import { PendingReportDocument } from '../../services/firestore/threatConverter';
import {
  SCAM_CATEGORY_LABELS,
  ScamCategory,
} from '../../services/ai/analysisSchema';
import { ThreatLevel } from '../../types/threat';
import { redactPII } from '../../utils/redactor';

export const CommunityFeedView: React.FC = () => {
  const {
    reports,
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
    refresh,
    isFirebaseReady,
  } = useCommunityFeed();
  const { user } = useAuth();

  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<PendingReportDocument | null>(null);

  const handleOpenSubmit = () => {
    if (!isFirebaseReady || !user) {
      setIsAuthModalOpen(true);
      return;
    }
    setIsSubmitModalOpen(true);
  };

  const handleResetFilters = () => {
    setCategory('ALL');
    setRiskLevel('ALL');
    setSortOrder('newest');
    setSearchQuery('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-surface-border">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-900">
              Community Reports
            </h1>
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-surface-elevated text-slate-700 border border-surface-border">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isFirebaseReady ? 'bg-emerald-400' : 'bg-amber-400'
                }`}
              />
              {isFirebaseReady ? `${reports.length} Loaded` : 'Local Mode'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Searchable, redacted scam observations. Verified warnings are clearly separated from unverified user reports.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {isFirebaseReady && (
            <Button variant="secondary" size="sm" onClick={refresh} disabled={loading}>
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </Button>
          )}

          <Button variant="primary" onClick={handleOpenSubmit}>
            <Plus className="w-3.5 h-3.5" />
            <span>Submit Report</span>
          </Button>
        </div>
      </div>

      {/* Visual Distinction Legend */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
        <div className="p-3 rounded-md bg-emerald-50 border border-emerald-200 flex items-center gap-2.5">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <div>
            <span className="font-semibold text-emerald-700 block">Verified Warning</span>
            <span className="text-[11px] text-slate-600">
              Reviewed and corroborated by an analyst.
            </span>
          </div>
        </div>
        <div className="p-3 rounded-md bg-amber-50 border border-amber-200 flex items-center gap-2.5">
          <Clock className="w-4 h-4 text-amber-600 shrink-0" />
          <div>
            <span className="font-semibold text-amber-800 block">Unverified User Report</span>
            <span className="text-[11px] text-slate-600">
              Voluntarily submitted by a user; awaiting analyst review.
            </span>
          </div>
        </div>
      </div>

      {/* Search & Filter Controls */}
      <Card padding="sm" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="relative">
          <Input
            aria-label="Search community reports"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search evidence, category, indicators..."
            className="pl-8"
          />
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-2.5 pointer-events-none" />
        </div>

        <Select
          aria-label="Filter by scam category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="ALL">All Categories</option>
          <option value="job_scam">Job Scam</option>
          <option value="phishing">Phishing</option>
          <option value="impersonation">Impersonation</option>
          <option value="investment_fraud">Investment Fraud</option>
          <option value="payment_fraud">Payment Fraud</option>
          <option value="delivery_scam">Delivery Scam</option>
          <option value="suspicious_links">Suspicious Links</option>
        </Select>

        <Select
          aria-label="Filter by risk level"
          value={riskLevel}
          onChange={(e) => setRiskLevel(e.target.value as ThreatLevel | 'ALL')}
        >
          <option value="ALL">All Risk Levels</option>
          <option value="CRITICAL">Critical Threat</option>
          <option value="HIGH">High Risk</option>
          <option value="SUSPICIOUS">Suspicious</option>
          <option value="UNKNOWN">Ambiguous</option>
        </Select>

        <Select
          aria-label="Sort by recency"
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value as 'newest' | 'oldest')}
        >
          <option value="newest">Sort: Newest First</option>
          <option value="oldest">Sort: Oldest First</option>
        </Select>
      </Card>

      {/* States: Unconfigured / Error / Loading / Empty / List */}
      {!isFirebaseReady ? (
        <EmptyState
          icon={Database}
          title="Cloud Firestore Not Configured"
          description="Community reports require Firebase configuration. Add your Firebase project keys to .env (see .env.example) to query paginated public reports."
          action={{
            label: 'View Setup Instructions',
            onClick: () => setIsAuthModalOpen(true),
          }}
        />
      ) : error ? (
        <div className="p-4 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-700 shrink-0" />
            <span>{error}</span>
          </div>
          <Button variant="danger" size="sm" onClick={refresh}>
            Retry
          </Button>
        </div>
      ) : loading ? (
        <Card className="p-8 text-center text-xs text-slate-600">
          Loading community reports from Cloud Firestore...
        </Card>
      ) : reports.length === 0 ? (
        <EmptyState
          icon={Radio}
          title="No Matching Community Reports"
          description="No redacted reports match your current search or filter criteria."
          action={{
            label: 'Reset Filters',
            onClick: handleResetFilters,
          }}
        />
      ) : (
        <div className="space-y-3">
          {reports.map((report) => {
            const isVerified = report.verificationStatus === 'verified';
            const categoryLabel =
              SCAM_CATEGORY_LABELS[report.category as ScamCategory] ??
              report.category.replace(/_/g, ' ');
            const safeSummary = redactPII(report.redactedSummary);

            return (
              <Card
                key={report.id}
                variant={
                  isVerified
                    ? 'default'
                    : report.riskAssessment === 'CRITICAL'
                    ? 'critical'
                    : report.riskAssessment === 'HIGH'
                    ? 'warning'
                    : 'default'
                }
                className="hover:border-surface-subtle transition-colors duration-150"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <ReviewStatusBadge status={report.verificationStatus} />
                    <ThreatBadge level={report.riskAssessment} size="sm" />
                    <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-surface-elevated text-slate-800 border border-surface-border">
                      {categoryLabel}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-canvas text-slate-600 border border-surface-border">
                      {report.channel}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-[11px] font-mono text-slate-600 shrink-0">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{report.observedDate || 'Recent'}</span>
                  </div>
                </div>

                {/* Redacted Evidence Summary */}
                <div className="mt-3 p-3 rounded-md bg-canvas border border-surface-border font-mono text-xs text-slate-700 leading-relaxed line-clamp-3">
                  {safeSummary}
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 pt-2.5 border-t border-surface-border">
                  <div className="flex items-center gap-3 text-[11px] font-mono text-slate-500">
                    <span className="flex items-center gap-1">
                      <Hash className="w-3 h-3 text-orange-700" />
                      {report.normalizedPatternHash.slice(0, 10)}
                    </span>
                    <span>•</span>
                    <span>{report.indicators.length} indicators</span>
                  </div>

                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setSelectedReport(report)}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>View Details</span>
                  </Button>
                </div>
              </Card>
            );
          })}

          {/* Cursor Pagination Controls */}
          {hasMore && (
            <div className="pt-2 flex justify-center">
              <Button
                variant="secondary"
                onClick={loadMore}
                isLoading={loadingMore}
              >
                {loadingMore ? 'Loading More...' : 'Load More Reports'}
              </Button>
            </div>
          )}
        </div>
      )}

      <ReportDetailModal
        report={selectedReport}
        onClose={() => setSelectedReport(null)}
      />

      <CommunityReportModal
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        onSubmitted={() => {
          void refresh();
        }}
      />

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </div>
  );
};

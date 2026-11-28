import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Bell,
  Check,
  CheckCheck,
  ArrowRight,
  AlertTriangle,
  SlidersHorizontal,
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { CardListSkeleton } from '../../components/common/LoadingSkeleton';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';
import {
  SCAM_CATEGORIES,
  SCAM_CATEGORY_LABELS,
  type ScamCategory,
} from '../../services/ai/analysisSchema';
import {
  fetchUserAlerts,
  markAlertRead,
  markAllAlertsRead,
  type AlertNotificationItem,
} from '../../services/firestore/alertsService';

const FOLLOWABLE_CATEGORIES = SCAM_CATEGORIES.filter(
  (c) => c !== 'legitimate_or_benign' && c !== 'ambiguous_unclear'
);

export const AlertsView: React.FC = () => {
  const { user, profile, updateProfileSettings } = useAuth();
  const followedCategories = useMemo(
    () => profile?.preferences.followedCategories ?? [],
    [profile?.preferences.followedCategories]
  );

  const [alerts, setAlerts] = useState<AlertNotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAlerts = useCallback(async () => {
    if (!user) return;
    if (followedCategories.length === 0) {
      setAlerts([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const items = await fetchUserAlerts(user.uid, followedCategories);
      setAlerts(items);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unable to load alerts from Firestore.'
      );
    } finally {
      setLoading(false);
    }
  }, [user, followedCategories]);

  useEffect(() => {
    void loadAlerts();
  }, [loadAlerts]);

  const toggleCategory = async (category: ScamCategory) => {
    setSavingPrefs(true);
    const exists = followedCategories.includes(category);
    const next = exists
      ? followedCategories.filter((c) => c !== category)
      : [...followedCategories, category];

    await updateProfileSettings({
      preferences: { followedCategories: next },
    });
    setSavingPrefs(false);
  };

  const handleMarkRead = async (alertId: string) => {
    if (!user) return;
    await markAlertRead(user.uid, alertId);
    setAlerts((prev) =>
      prev.map((item) => (item.id === alertId ? { ...item, isRead: true } : item))
    );
  };

  const handleMarkAllRead = async () => {
    if (!user) return;
    const unreadIds = alerts.filter((a) => !a.isRead).map((a) => a.id);
    if (unreadIds.length === 0) return;
    await markAllAlertsRead(user.uid, unreadIds);
    setAlerts((prev) => prev.map((item) => ({ ...item, isRead: true })));
  };

  const unreadCount = alerts.filter((a) => !a.isRead).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-surface-border">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-900 flex items-center gap-2">
              <Bell className="w-5 h-5 text-orange-700" />
              <span>Alerts &amp; Notification Center</span>
            </h1>
            <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-surface-elevated text-amber-900 border border-surface-border">
              {unreadCount} Unread
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            High-signal warnings for your followed categories.
          </p>
        </div>

        {unreadCount > 0 && (
          <Button variant="secondary" size="sm" onClick={() => void handleMarkAllRead()}>
            <CheckCheck className="w-3.5 h-3.5" />
            <span>Mark All Read</span>
          </Button>
        )}
      </div>

      {/* Followed Scam Categories */}
      <Card className="space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 text-slate-900">
            <SlidersHorizontal className="w-4 h-4 text-accent-violet" />
            <h2 className="text-sm font-semibold">Followed Scam Categories</h2>
          </div>
          <span className="text-[11px] font-mono text-slate-600">
            {savingPrefs
              ? 'Saving preferences...'
              : `${followedCategories.length} selected`}
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          {FOLLOWABLE_CATEGORIES.map((category) => {
            const active = followedCategories.includes(category);
            return (
              <button
                key={category}
                type="button"
                disabled={savingPrefs}
                onClick={() => void toggleCategory(category)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                  active
                    ? 'bg-amber-50 border-accent-violet text-slate-900'
                    : 'bg-void border-surface-border text-slate-600 hover:text-slate-800'
                }`}
              >
                {SCAM_CATEGORY_LABELS[category]}
              </button>
            );
          })}
        </div>
      </Card>

      {/* Notification List */}
      {followedCategories.length === 0 ? (
        <Card className="py-10 text-center space-y-2">
          <Bell className="w-6 h-6 text-slate-500 mx-auto" />
          <h2 className="text-sm font-semibold text-slate-800">No Categories Followed Yet</h2>
          <p className="text-xs text-slate-600 max-w-md mx-auto">
            Select one or more scam categories above to track emerging campaign warnings and
            high-risk community updates relevant to you.
          </p>
        </Card>
      ) : loading ? (
        <CardListSkeleton count={3} />
      ) : error ? (
        <Card className="border-rose-200 bg-rose-50 space-y-3">
          <div className="flex items-center gap-2 text-rose-700 text-sm font-semibold">
            <AlertTriangle className="w-4 h-4" />
            <span>Unable to Load Alerts</span>
          </div>
          <p className="text-xs text-rose-700 break-all">{error}</p>
          <Button variant="secondary" size="sm" onClick={() => void loadAlerts()}>
            Retry
          </Button>
        </Card>
      ) : alerts.length === 0 ? (
        <Card className="py-10 text-center space-y-2">
          <Bell className="w-6 h-6 text-slate-500 mx-auto" />
          <h2 className="text-sm font-semibold text-slate-800">You&apos;re All Caught Up</h2>
          <p className="text-xs text-slate-600">
            No new high-signal warnings or verified updates match your followed categories right now.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {alerts.map((alert) => (
            <Card
              key={alert.id}
              className={`space-y-2.5 transition-colors ${
                alert.isRead ? 'opacity-80' : 'border-amber-200 bg-amber-50'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  {!alert.isRead && (
                    <span
                      className="w-2 h-2 rounded-full bg-cyan-400 shrink-0"
                      aria-label="Unread alert"
                    />
                  )}
                  <span className="text-sm font-semibold text-slate-900">{alert.title}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-void border border-surface-border text-slate-700">
                    {alert.verificationLabel}
                  </span>
                </div>

                <span className="text-[11px] font-mono text-slate-500">
                  {alert.timestampIso.slice(0, 10)}
                </span>
              </div>

              <p className="text-xs text-slate-700 leading-relaxed">{alert.summary}</p>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <Link
                  to={alert.href}
                  className="inline-flex items-center gap-1 text-xs font-mono text-orange-700 hover:text-amber-900"
                >
                  <span>
                    {alert.type === 'campaign_warning' ? 'Inspect Campaign' : 'View in Feed'}
                  </span>
                  <ArrowRight className="w-3 h-3" />
                </Link>

                {!alert.isRead ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => void handleMarkRead(alert.id)}
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Mark Read</span>
                  </Button>
                ) : (
                  <span className="text-[11px] font-mono text-slate-500">Read</span>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

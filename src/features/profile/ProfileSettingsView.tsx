import React, { useState, useEffect } from 'react';
import { User, Shield, Save, LogOut, CheckCircle2, AlertTriangle, Sliders } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import type { UserPreferences } from '../../services/firestore/userProfileService';

/**
 * Minimal user profile & preferences view (/profile).
 * Intentionally avoids social networking features and stores only display name,
 * AI/reporting defaults, and read-only Firebase account metadata.
 */
export const ProfileSettingsView: React.FC = () => {
  const { user, profile, updateProfileSettings, signOut, loading, error } = useAuth();

  const [displayName, setDisplayName] = useState(
    profile?.displayName ?? user?.displayName ?? '',
  );
  const [defaultInferenceMode, setDefaultInferenceMode] = useState<
    UserPreferences['defaultInferenceMode']
  >(profile?.preferences.defaultInferenceMode ?? 'prefer_on_device');
  const [defaultReportVisibility, setDefaultReportVisibility] = useState<
    UserPreferences['defaultReportVisibility']
  >(profile?.preferences.defaultReportVisibility ?? 'community_public');

  const [saving, setSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);

  useEffect(() => {
    setDisplayName(profile?.displayName ?? user?.displayName ?? '');
    if (profile?.preferences) {
      setDefaultInferenceMode(profile.preferences.defaultInferenceMode);
      setDefaultReportVisibility(profile.preferences.defaultReportVisibility);
    }
  }, [profile, user?.displayName]);

  if (!user) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedNotice(false);
    const updated = await updateProfileSettings({
      displayName: displayName.trim(),
      preferences: {
        defaultInferenceMode,
        defaultReportVisibility,
      },
    });
    setSaving(false);
    if (updated) {
      setSavedNotice(true);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Profile &amp; Preferences</h1>
          <p className="text-xs text-slate-600">
            Manage your ScamSignal display name, default analysis privacy mode, and session.
          </p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => void signOut()} disabled={loading}>
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out</span>
        </Button>
      </div>

      {error && (
        <div className="p-3 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-700 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {savedNotice && (
        <div className="p-3 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Profile and preferences saved to your account.</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Account Metadata */}
        <div className="md:col-span-1 p-5 rounded-lg bg-surface border border-surface-border space-y-4">
          <div className="flex items-center gap-2 text-slate-900">
            <Shield className="w-4 h-4 text-accent-violet" />
            <h2 className="text-sm font-semibold">Account Metadata</h2>
          </div>

          <dl className="space-y-3 text-xs">
            <div>
              <dt className="text-slate-500 font-mono text-[10px] uppercase">Email</dt>
              <dd className="text-slate-800 font-mono break-all mt-0.5">
                {user.email ?? 'Anonymous Session'}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500 font-mono text-[10px] uppercase">User ID</dt>
              <dd className="text-slate-700 font-mono break-all text-[11px] mt-0.5">{user.uid}</dd>
            </div>
            <div>
              <dt className="text-slate-500 font-mono text-[10px] uppercase">Provider</dt>
              <dd className="text-slate-800 font-mono mt-0.5">{user.providerId}</dd>
            </div>
            <div>
              <dt className="text-slate-500 font-mono text-[10px] uppercase">Role</dt>
              <dd className="text-slate-800 font-mono mt-0.5">
                {user.isAdmin ? 'Analyst (Admin)' : user.isAnonymous ? 'Guest' : 'Member'}
              </dd>
            </div>
            {user.createdAt && (
              <div>
                <dt className="text-slate-500 font-mono text-[10px] uppercase">Created</dt>
                <dd className="text-slate-600 text-[11px] mt-0.5">{user.createdAt}</dd>
              </div>
            )}
            {user.lastSignInAt && (
              <div>
                <dt className="text-slate-500 font-mono text-[10px] uppercase">Last Sign-In</dt>
                <dd className="text-slate-600 text-[11px] mt-0.5">{user.lastSignInAt}</dd>
              </div>
            )}
          </dl>
        </div>

        {/* Editable Profile & Privacy Preferences */}
        <form
          onSubmit={handleSave}
          className="md:col-span-2 p-5 rounded-lg bg-surface border border-surface-border space-y-5"
        >
          <div className="flex items-center gap-2 text-slate-900">
            <User className="w-4 h-4 text-accent-violet" />
            <h2 className="text-sm font-semibold">Identity &amp; Privacy Defaults</h2>
          </div>

          <Input
            label="Display Name"
            type="text"
            value={displayName}
            onChange={(e) => {
              setSavedNotice(false);
              setDisplayName(e.target.value);
            }}
            placeholder="e.g. Security Researcher"
            maxLength={60}
          />

          <div className="space-y-3 pt-2 border-t border-surface-border">
            <div className="flex items-center gap-2 text-slate-800">
              <Sliders className="w-3.5 h-3.5 text-orange-700" />
              <span className="text-xs font-medium">Analysis &amp; Reporting Preferences</span>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-700">
                Default Hybrid AI Inference Mode
              </label>
              <select
                value={defaultInferenceMode}
                onChange={(e) => {
                  setSavedNotice(false);
                  setDefaultInferenceMode(
                    e.target.value as UserPreferences['defaultInferenceMode'],
                  );
                }}
                className="w-full rounded-md bg-void border border-surface-border px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-accent-violet"
              >
                <option value="prefer_on_device">
                  Prefer On-Device (Local-first with cloud fallback)
                </option>
                <option value="only_on_device">
                  Only On-Device (Strict local Gemini Nano processing)
                </option>
                <option value="only_in_cloud">
                  Only In Cloud (Cloud Gemini analysis)
                </option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-700">
                Default Community Report Visibility
              </label>
              <select
                value={defaultReportVisibility}
                onChange={(e) => {
                  setSavedNotice(false);
                  setDefaultReportVisibility(
                    e.target.value as UserPreferences['defaultReportVisibility'],
                  );
                }}
                className="w-full rounded-md bg-void border border-surface-border px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-accent-violet"
              >
                <option value="community_public">
                  Community Public (Eligible for public feed after review)
                </option>
                <option value="analysts_only">
                  Analysts Only (Restricted to security triage)
                </option>
              </select>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button type="submit" variant="primary" size="sm" isLoading={saving}>
              <Save className="w-3.5 h-3.5" />
              <span>Save Changes</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

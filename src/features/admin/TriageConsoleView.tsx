import React from 'react';
import { CheckCircle2, Lock } from 'lucide-react';
import { Card } from '../../components/common/Card';

export const TriageConsoleView: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-800/60">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-100">
              Analyst Triage & Verification Desk
            </h1>
            <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-amber-500/10 text-amber-400 border border-amber-500/30">
              Role: Security Analyst
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Audit unverified community signals, confirm campaign IOCs, and enforce verification integrity.
          </p>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-emerald-400">
          <CheckCircle2 className="w-4 h-4" />
          <span>App Check Authenticated</span>
        </div>
      </div>

      {/* Security Rule Guard Card */}
      <Card className="bg-slate-900/60 border-slate-800">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-200">
              Role-Based Verification Protection
            </h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Standard users cannot elevate threat verification flags or link campaigns. Changes to threat severity or campaign links are gated behind verified Firebase Auth custom claims (<code className="text-cyan-400 font-mono">admin: true</code>) and validated Cloud Functions.
            </p>
          </div>
        </div>
      </Card>

      {/* Triage Queue Table */}
      <Card className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
          Pending Signal Verification Queue
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-800 text-slate-400 uppercase font-mono text-[10px]">
              <tr>
                <th className="py-2.5 px-3">Report ID</th>
                <th className="py-2.5 px-3">Channel</th>
                <th className="py-2.5 px-3">Reported Vector</th>
                <th className="py-2.5 px-3">Model Source</th>
                <th className="py-2.5 px-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              <tr className="hover:bg-slate-800/40 transition-colors">
                <td className="py-3 px-3 text-slate-300">#SIG-4019</td>
                <td className="py-3 px-3 uppercase text-slate-400">SMS</td>
                <td className="py-3 px-3 text-slate-200 font-sans">
                  Impersonation bank message with typo-squatted domain link
                </td>
                <td className="py-3 px-3 text-emerald-400">Gemini Nano</td>
                <td className="py-3 px-3">
                  <div className="flex items-center gap-2">
                    <button className="px-2.5 py-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 font-sans text-[11px] transition-colors">
                      Verify
                    </button>
                    <button className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-sans text-[11px] transition-colors">
                      Reject
                    </button>
                  </div>
                </td>
              </tr>
              <tr className="hover:bg-slate-800/40 transition-colors">
                <td className="py-3 px-3 text-slate-300">#SIG-4018</td>
                <td className="py-3 px-3 uppercase text-slate-400">WhatsApp</td>
                <td className="py-3 px-3 text-slate-200 font-sans">
                  Fake task deposit scheme with suspicious UPI ID
                </td>
                <td className="py-3 px-3 text-cyan-400">Hybrid Fallback</td>
                <td className="py-3 px-3">
                  <div className="flex items-center gap-2">
                    <button className="px-2.5 py-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 font-sans text-[11px] transition-colors">
                      Verify
                    </button>
                    <button className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-sans text-[11px] transition-colors">
                      Reject
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

import React from 'react';
import { Fingerprint } from 'lucide-react';
import { Card } from '../../components/common/Card';

interface CampaignCluster {
  id: string;
  name: string;
  threatType: string;
  totalSignals: number;
  corroboratedHashes: number;
  status: 'ACTIVE_WAVE' | 'MONITORING' | 'CONTAINED';
  indicators: string[];
}

const DEMO_CAMPAIGNS: CampaignCluster[] = [
  {
    id: 'camp-axis-sms-wave-4',
    name: 'Axis Bank Impersonation Wave IV',
    threatType: 'Smishing & Credential Phishing',
    totalSignals: 148,
    corroboratedHashes: 12,
    status: 'ACTIVE_WAVE',
    indicators: ['axis-secure-verify.xyz', 'axis-login-kyc.top', 'Regex: +91-98[0-9]{8}'],
  },
  {
    id: 'camp-wa-task-phish',
    name: 'Social Media Video Like Job Trap',
    threatType: 'Advance Fee & Wire Fraud',
    totalSignals: 86,
    corroboratedHashes: 7,
    status: 'ACTIVE_WAVE',
    indicators: ['recruitment@okaxis', 'UPI deposit request $50', 'WhatsApp business accounts'],
  },
  {
    id: 'camp-utility-bill-fake',
    name: 'Electricity Disconnection Imposter',
    threatType: 'Urgency Toll Fraud',
    totalSignals: 41,
    corroboratedHashes: 4,
    status: 'MONITORING',
    indicators: ['Call officer 9821xxxxxx', 'Disconnection at 9:30 PM warning'],
  },
];

export const CampaignExplorerView: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-800/60">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-100">
              Correlated Campaign Clusters
            </h1>
            <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
              Deterministic Matching
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Grouping decentralized scam reports through cryptographic pattern hashes without hallucinated links.
          </p>
        </div>
      </div>

      {/* Methodology Banner */}
      <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Fingerprint className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-200">
              Zero-Hallucination Campaign Rules
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Clusters are formed strictly through normalized SHA-256 pattern hashes, shared domains, and verified payment handles.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs font-mono text-slate-400">
          <div className="px-3 py-1.5 rounded bg-slate-950 border border-slate-800">
            <span className="text-emerald-400">3</span> Active Clusters
          </div>
          <div className="px-3 py-1.5 rounded bg-slate-950 border border-slate-800">
            <span className="text-cyan-400">275</span> Total Reports
          </div>
        </div>
      </div>

      {/* Campaign Cards */}
      <div className="grid grid-cols-1 gap-4">
        {DEMO_CAMPAIGNS.map((camp) => (
          <Card key={camp.id} className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold text-slate-100">{camp.name}</h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-rose-950/60 text-rose-300 border border-rose-600/40">
                    {camp.status}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">{camp.threatType}</p>
              </div>

              <div className="flex items-center gap-2 text-xs font-mono">
                <span className="px-2.5 py-1 rounded bg-slate-950 border border-slate-800 text-slate-300">
                  {camp.totalSignals} Signals
                </span>
                <span className="px-2.5 py-1 rounded bg-slate-950 border border-slate-800 text-cyan-300">
                  {camp.corroboratedHashes} Matching Hashes
                </span>
              </div>
            </div>

            {/* Tactical IOCs */}
            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-1.5">
                Observed Tactical Indicators (IOCs)
              </span>
              <div className="flex flex-wrap gap-2">
                {camp.indicators.map((ioc, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded bg-slate-950/80 border border-slate-800 text-xs font-mono text-slate-300"
                  >
                    {ioc}
                  </span>
                ))}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};

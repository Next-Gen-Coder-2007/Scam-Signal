import React from 'react';
import { Shield, Eye, Database, Cpu } from 'lucide-react';
import { Card } from '../../components/common/Card';

export const PrivacyPolicyView: React.FC = () => {
  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="pb-2 border-b border-slate-800/60">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-100">
          Privacy Architecture & Safeguards
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          How ScamSignal guarantees zero leakage of personal communications while powering collective defense.
        </p>
      </div>

      {/* Core Safeguards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="space-y-2">
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 w-fit">
            <Cpu className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-semibold text-slate-200">Local-First Execution</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            By integrating Firebase AI Logic with on-device Chrome Built-in AI (Gemini Nano), sensitive text remains within your browser's execution sandbox.
          </p>
        </Card>

        <Card className="space-y-2">
          <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 w-fit">
            <Eye className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-semibold text-slate-200">Automated PII Redaction</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Phone numbers, banking account sequences, card numbers, UPI IDs, and OTP credentials are systematically scrubbed prior to any community signal dispatch.
          </p>
        </Card>

        <Card className="space-y-2">
          <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 w-fit">
            <Database className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-semibold text-slate-200">Zero Raw Storage</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Public Firestore collections accept only sanitized, anonymized pattern digests. Personal scans are never uploaded to public collections.
          </p>
        </Card>

        <Card className="space-y-2">
          <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/30 w-fit">
            <Shield className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-semibold text-slate-200">Cryptographic Correlation</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Campaign grouping utilizes deterministic SHA-256 normalized text hashing, ensuring zero arbitrary or hallucinated campaign links.
          </p>
        </Card>
      </div>

      {/* Advisory Statement */}
      <Card className="bg-slate-900/60 border-slate-800">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
          Advisory Disclaimer
        </h3>
        <p className="text-xs text-slate-400 leading-relaxed">
          ScamSignal is an intelligence assistive tool designed to identify common patterns of cyber fraud, smishing, and phishing attacks. Risk indicators and scores are advisory assessments generated via machine intelligence and should not substitute official verification from banking institutions or law enforcement agencies.
        </p>
      </Card>
    </div>
  );
};

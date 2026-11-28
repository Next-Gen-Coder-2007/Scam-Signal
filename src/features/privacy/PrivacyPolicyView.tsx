import React from 'react';
import { Shield, Eye, Database, Cpu } from 'lucide-react';
import { Card } from '../../components/common/Card';

export const PrivacyPolicyView: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-4 border-b border-surface-border">
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-900">
          Privacy Architecture & Safeguards
        </h1>
        <p className="text-xs sm:text-sm text-slate-600 mt-1">
          How ScamSignal guarantees zero leakage of personal communications while powering collective defense.
        </p>
      </div>

      {/* Core Safeguards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="space-y-2.5">
          <div className="p-2 rounded-md bg-surface-elevated text-emerald-600 border border-surface-border w-fit">
            <Cpu className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-semibold text-slate-800">Local-First Execution</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            By integrating Firebase AI Logic with on-device Chrome Built-in AI (Gemini Nano), sensitive text remains within your browser's execution sandbox.
          </p>
        </Card>

        <Card className="space-y-2.5">
          <div className="p-2 rounded-md bg-surface-elevated text-orange-700 border border-surface-border w-fit">
            <Eye className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-semibold text-slate-800">Automated PII Redaction</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Phone numbers, banking account sequences, card numbers, UPI IDs, and OTP credentials are systematically scrubbed prior to any community signal dispatch.
          </p>
        </Card>

        <Card className="space-y-2.5">
          <div className="p-2 rounded-md bg-surface-elevated text-accent-violet border border-surface-border w-fit">
            <Database className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-semibold text-slate-800">Zero Raw Storage</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Public Firestore collections accept only sanitized, anonymized pattern digests. Personal scans are never uploaded to public collections.
          </p>
        </Card>

        <Card className="space-y-2.5">
          <div className="p-2 rounded-md bg-surface-elevated text-rose-700 border border-surface-border w-fit">
            <Shield className="w-4 h-4" />
          </div>
          <h3 className="text-sm font-semibold text-slate-800">Deterministic Pattern Grouping</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Campaign grouping uses SHA-256 digests of already-redacted text templates to cluster matching scam waves. Hashing alone is not guaranteed anonymization—automated and user-reviewed PII redaction always happens first.
          </p>
        </Card>
      </div>

      {/* Advisory Statement */}
      <Card>
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-700 mb-2">
          Advisory Disclaimer
        </h3>
        <p className="text-xs text-slate-600 leading-relaxed">
          ScamSignal is an intelligence assistive tool designed to identify common patterns of cyber fraud, smishing, and phishing attacks. Risk indicators and scores are advisory assessments generated via machine intelligence and should not substitute official verification from banking institutions or law enforcement agencies.
        </p>
      </Card>
    </div>
  );
};

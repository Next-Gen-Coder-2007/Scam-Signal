import React from 'react';
import { X, Lock, CheckCircle, ShieldCheck } from 'lucide-react';
import { redactPII } from '../../utils/redactor';

interface RedactionPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  rawText: string;
}

export const RedactionPreviewModal: React.FC<RedactionPreviewModalProps> = ({
  isOpen,
  onClose,
  rawText,
}) => {
  if (!isOpen) return null;

  const scrubbed = redactPII(rawText);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="relative w-full max-w-2xl rounded-xl bg-slate-900 border border-slate-800 shadow-2xl p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">
                Automated PII Redaction Audit
              </h3>
              <p className="text-xs text-slate-400">
                Review how personal information is scrubbed before processing.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Comparison */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
          {/* Raw Input */}
          <div className="space-y-1.5">
            <span className="text-slate-400 font-sans font-semibold uppercase tracking-wider block text-[11px]">
              Original Message (Local Memory Only)
            </span>
            <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 h-48 overflow-y-auto whitespace-pre-wrap leading-relaxed">
              {rawText || '<empty message>'}
            </div>
          </div>

          {/* Sanitized Version */}
          <div className="space-y-1.5">
            <span className="text-emerald-400 font-sans font-semibold uppercase tracking-wider flex items-center gap-1.5 text-[11px]">
              <Lock className="w-3.5 h-3.5" />
              Scrubbed / Safe Preview
            </span>
            <div className="p-3.5 rounded-lg bg-slate-950 border border-emerald-500/30 text-emerald-200 h-48 overflow-y-auto whitespace-pre-wrap leading-relaxed">
              {scrubbed || '<empty message>'}
            </div>
          </div>
        </div>

        {/* Policy Pill */}
        <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-950/20 border border-emerald-500/20 text-xs text-emerald-300">
          <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>
            Phone numbers, banking accounts, cards, UPI handles, and OTPs are replaced with secure placeholders.
          </span>
        </div>

        {/* Modal Close Button */}
        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
          >
            Close Audit Preview
          </button>
        </div>
      </div>
    </div>
  );
};

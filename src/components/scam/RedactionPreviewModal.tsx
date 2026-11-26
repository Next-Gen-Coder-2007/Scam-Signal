import React from 'react';
import { Lock, CheckCircle, ShieldCheck } from 'lucide-react';
import { redactPII } from '../../utils/redactor';
import { Dialog } from '../ui/Dialog';
import { Button } from '../ui/Button';

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
  const scrubbed = redactPII(rawText);

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Automated PII Redaction Audit"
      description="Review how personal information is scrubbed before processing."
      icon={<ShieldCheck className="w-4 h-4 text-emerald-400" />}
      maxWidth="2xl"
      footer={
        <Button variant="secondary" onClick={onClose}>
          Close Audit Preview
        </Button>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
          {/* Raw Input */}
          <div className="space-y-1.5">
            <span className="text-zinc-400 font-sans font-semibold uppercase tracking-wider block text-[10px]">
              Original Message (Local Memory Only)
            </span>
            <div className="p-3 rounded-md bg-canvas border border-surface-border text-zinc-300 h-44 overflow-y-auto whitespace-pre-wrap leading-relaxed">
              {rawText || '<empty message>'}
            </div>
          </div>

          {/* Sanitized Version */}
          <div className="space-y-1.5">
            <span className="text-emerald-400 font-sans font-semibold uppercase tracking-wider flex items-center gap-1.5 text-[10px]">
              <Lock className="w-3 h-3" />
              Scrubbed / Safe Preview
            </span>
            <div className="p-3 rounded-md bg-canvas border border-emerald-500/30 text-emerald-200 h-44 overflow-y-auto whitespace-pre-wrap leading-relaxed">
              {scrubbed || '<empty message>'}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 p-3 rounded-md bg-emerald-950/20 border border-emerald-500/25 text-xs text-emerald-300">
          <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>
            Phone numbers, banking accounts, cards, UPI handles, and OTPs are replaced with secure placeholders.
          </span>
        </div>
      </div>
    </Dialog>
  );
};

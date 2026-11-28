import React, { useState } from 'react';
import { AlertTriangle, X, Terminal } from 'lucide-react';
import { firebaseStatus } from '../../services/firebase/firebaseApp';

export const FirebaseSetupBanner: React.FC = () => {
  const [dismissed, setDismissed] = useState(false);

  if (firebaseStatus.isConfigured || dismissed) {
    return null;
  }

  return (
    <div
      role="status"
      className="bg-amber-50 border-b border-amber-200 px-4 sm:px-6 lg:px-8 py-3"
    >
      <div className="max-w-7xl mx-auto flex items-start justify-between gap-4 text-xs">
        <div className="flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-medium text-amber-800">
              Firebase is not configured — running in local-only mode.
            </p>
            <p className="text-amber-800 leading-relaxed">
              Authentication and Cloud Firestore sync are disabled until you copy{' '}
              <code className="px-1 py-0.5 rounded bg-canvas border border-surface-border font-mono text-[11px] text-slate-800">
                .env.example
              </code>{' '}
              to{' '}
              <code className="px-1 py-0.5 rounded bg-canvas border border-surface-border font-mono text-[11px] text-slate-800">
                .env
              </code>{' '}
              and set:{' '}
              <span className="font-mono text-[11px] text-amber-800">
                {firebaseStatus.missingKeys.join(', ')}
              </span>
              .
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="hidden md:inline-flex items-center gap-1 px-2 py-1 rounded bg-canvas border border-surface-border font-mono text-[10px] text-slate-600">
            <Terminal className="w-3 h-3" />
            cp .env.example .env
          </span>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            aria-label="Dismiss Firebase setup notice"
            className="p-1 rounded text-amber-800 hover:text-amber-800 hover:bg-amber-900/30 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

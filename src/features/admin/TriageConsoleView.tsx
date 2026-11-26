import React from 'react';
import { CheckCircle2, Lock } from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/ui/Button';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../../components/ui/Table';

export const TriageConsoleView: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-surface-border">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-zinc-100">
              Analyst Triage & Verification Desk
            </h1>
            <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-surface-elevated text-amber-300 border border-surface-border">
              Role: Security Analyst
            </span>
          </div>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Audit unverified community signals, confirm campaign IOCs, and enforce verification integrity.
          </p>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-surface border border-surface-border text-xs font-mono text-emerald-400">
          <CheckCircle2 className="w-4 h-4" />
          <span>App Check Authenticated</span>
        </div>
      </div>

      {/* Security Rule Guard Card */}
      <Card>
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-md bg-surface-elevated text-amber-400 border border-surface-border">
            <Lock className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-zinc-200">
              Role-Based Verification Protection
            </h3>
            <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
              Standard users cannot elevate threat verification flags or link campaigns. Changes to threat severity or campaign links are gated behind verified Firebase Auth custom claims (<code className="text-cyan-400 font-mono">admin: true</code>) and validated Cloud Functions.
            </p>
          </div>
        </div>
      </Card>

      {/* Triage Queue Table */}
      <Card className="space-y-3">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
          Pending Signal Verification Queue
        </h3>

        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Report ID</TableHead>
              <TableHead>Channel</TableHead>
              <TableHead>Reported Vector</TableHead>
              <TableHead>Model Source</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell className="font-mono text-zinc-200">#SIG-4019</TableCell>
              <TableCell className="font-mono uppercase text-zinc-400">SMS</TableCell>
              <TableCell className="text-zinc-200">
                Impersonation bank message with typo-squatted domain link
              </TableCell>
              <TableCell className="font-mono text-emerald-400">Gemini Nano</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Button variant="cyan" size="sm">
                    Verify
                  </Button>
                  <Button variant="secondary" size="sm">
                    Reject
                  </Button>
                </div>
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-mono text-zinc-200">#SIG-4018</TableCell>
              <TableCell className="font-mono uppercase text-zinc-400">WhatsApp</TableCell>
              <TableCell className="text-zinc-200">
                Fake task deposit scheme with suspicious UPI ID
              </TableCell>
              <TableCell className="font-mono text-cyan-400">Hybrid Fallback</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Button variant="cyan" size="sm">
                    Verify
                  </Button>
                  <Button variant="secondary" size="sm">
                    Reject
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Card>
    </div>
  );
};

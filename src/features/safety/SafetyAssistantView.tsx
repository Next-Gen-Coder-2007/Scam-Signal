import React, { useState, useEffect, useCallback } from 'react';
import {
  LifeBuoy,
  ShieldCheck,
  AlertTriangle,
  ExternalLink,
  Phone,
  CheckSquare,
  Ban,
  Cpu,
  Send,
} from 'lucide-react';
import { Card } from '../../components/common/Card';
import { Button } from '../../components/ui/Button';
import {
  SAFETY_SCENARIOS,
  SAFETY_SCENARIO_LABELS,
  type SafetyActionResult,
  type SafetyRegion,
  type SafetyScenario,
} from '../../services/safety/safetyActionSchema';
import { getSafetyActionGuidance } from '../../services/safety/safetyActionService';

export const SafetyAssistantView: React.FC = () => {
  const [scenario, setScenario] = useState<SafetyScenario>('verify_job_offer');
  const [region, setRegion] = useState<SafetyRegion>('IN');
  const [userQuestion, setUserQuestion] = useState('');
  const [result, setResult] = useState<SafetyActionResult | null>(null);
  const [loading, setLoading] = useState(false);

  const loadGuidance = useCallback(
    async (customQuestion?: string) => {
      setLoading(true);
      try {
        const res = await getSafetyActionGuidance({
          scenario,
          region,
          userQuestion: customQuestion ?? (userQuestion.trim() || undefined),
        });
        setResult(res);
      } finally {
        setLoading(false);
      }
    },
    [scenario, region, userQuestion]
  );

  useEffect(() => {
    void loadGuidance('');
  }, [scenario, region]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void loadGuidance();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-surface-border">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-900 flex items-center gap-2">
              <LifeBuoy className="w-5 h-5 text-cyan-700" />
              <span>Safety Action Assistant</span>
            </h1>
            {result && (
              <span className="px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-surface-elevated text-cyan-700 border border-surface-border flex items-center gap-1">
                <Cpu className="w-3 h-3" />
                <span>
                  {result.isAiAssisted
                    ? `Firebase AI (${result.inferenceSource})`
                    : 'Grounded Safety Playbook'}
                </span>
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Practical verification and incident response guidance.
          </p>
        </div>

        {/* Region Selector */}
        <div className="inline-flex rounded-md bg-surface border border-surface-border p-0.5 shrink-0">
          {(
            [
              ['IN', 'India (IN)'],
              ['GLOBAL', 'Global'],
            ] as const
          ).map(([code, label]) => (
            <button
              key={code}
              type="button"
              onClick={() => setRegion(code)}
              className={`px-3 py-1 rounded text-xs font-mono transition-colors ${
                region === code
                  ? 'bg-violet-50 text-slate-900 border border-accent-violet/40'
                  : 'text-slate-600 hover:text-slate-800 border border-transparent'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Scenario Selector */}
      <div className="flex flex-wrap gap-2">
        {SAFETY_SCENARIOS.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setScenario(item)}
            className={`px-3 py-2 rounded-md text-xs font-medium border transition-colors ${
              scenario === item
                ? 'bg-cyan-50 border-cyan-200 text-slate-900'
                : 'bg-surface border-surface-border text-slate-600 hover:text-slate-800'
            }`}
          >
            {SAFETY_SCENARIO_LABELS[item]}
          </button>
        ))}
      </div>

      {/* Optional Situational Question */}
      <Card className="p-4">
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2.5">
          <input
            type="text"
            value={userQuestion}
            onChange={(e) => setUserQuestion(e.target.value)}
            maxLength={400}
            placeholder="Optional: ask a specific question about this scenario (do not include personal info)..."
            className="flex-1 rounded-md bg-void border border-surface-border px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-accent-violet"
          />
          <Button type="submit" variant="primary" size="sm" isLoading={loading}>
            <Send className="w-3.5 h-3.5" />
            <span>Get Action Steps</span>
          </Button>
        </form>
      </Card>

      {result && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* General Guidance (2/3) */}
          <div className="lg:col-span-2 space-y-4">
            <Card className="space-y-4">
              <div className="flex items-center justify-between border-b border-surface-border pb-2.5">
                <h2 className="text-sm font-semibold text-slate-900">
                  General Guidance — {SAFETY_SCENARIO_LABELS[result.scenario]}
                </h2>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-void border border-surface-border text-slate-600">
                  Advisory Steps
                </span>
              </div>

              <div className="space-y-2">
                <h3 className="text-xs font-semibold text-cyan-800 uppercase tracking-wider">
                  Immediate Steps
                </h3>
                <ol className="list-decimal list-inside space-y-1.5 text-xs text-slate-800 leading-relaxed">
                  {result.generalGuidance.immediateSteps.map((step, idx) => (
                    <li key={idx}>{step}</li>
                  ))}
                </ol>
              </div>

              <div className="space-y-2 pt-2 border-t border-surface-border">
                <h3 className="text-xs font-semibold text-emerald-700 uppercase tracking-wider flex items-center gap-1.5">
                  <CheckSquare className="w-3.5 h-3.5" />
                  <span>Verification Checklist</span>
                </h3>
                <ul className="list-disc list-inside space-y-1.5 text-xs text-slate-700 leading-relaxed">
                  {result.generalGuidance.verificationChecklist.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>

              <div className="space-y-2 pt-2 border-t border-surface-border">
                <h3 className="text-xs font-semibold text-rose-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Ban className="w-3.5 h-3.5" />
                  <span>What Not To Do</span>
                </h3>
                <ul className="list-disc list-inside space-y-1.5 text-xs text-slate-700 leading-relaxed">
                  {result.generalGuidance.whatNotToDo.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>
            </Card>
          </div>

          {/* Verified Official Resources & Boundary Notice (1/3) */}
          <div className="space-y-4">
            <Card className="space-y-3 border-emerald-200">
              <div className="flex items-center gap-2 text-emerald-700">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <h2 className="text-sm font-semibold">Verified Official Resources</h2>
              </div>
              <p className="text-[11px] text-slate-600">
                Curated official channels—separate from AI-generated general guidance.
              </p>

              <div className="space-y-2.5">
                {result.verifiedOfficialResources.map((res) => (
                  <div
                    key={res.id}
                    className="p-3 rounded-md bg-void border border-surface-border space-y-1.5 text-xs"
                  >
                    <p className="font-semibold text-slate-900">{res.title}</p>
                    <p className="text-slate-600 text-[11px] leading-relaxed">
                      {res.description}
                    </p>
                    {res.helpline && (
                      <p className="font-mono text-emerald-700 flex items-center gap-1.5">
                        <Phone className="w-3 h-3" />
                        <span>Helpline: {res.helpline}</span>
                      </p>
                    )}
                    {res.url && (
                      <a
                        href={res.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-mono text-cyan-700 hover:text-cyan-800"
                      >
                        <span>{res.url}</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </Card>

            <Card className="border-amber-200 bg-amber-50 space-y-2">
              <div className="flex items-center gap-2 text-amber-800 text-xs font-semibold">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Platform Boundary Notice</span>
              </div>
              <p className="text-xs text-amber-800 leading-relaxed">
                {result.boundaryNotice}
              </p>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

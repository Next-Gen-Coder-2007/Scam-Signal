---
name: frontend-design
description: Design standards and UI patterns for ScamSignal's cybersecurity SaaS interface, focusing on visual hierarchy, threat indicators, and responsive layouts.
---

# Frontend Design Standards for ScamSignal

ScamSignal requires a dark, high-contrast, security-focused SaaS design language that communicates urgency, credibility, and precision without feeling cartoonish or like generic AI dashboard templates.

---

## 1. Design Principles

1. **Cybersecurity Professionalism**: Use a deep dark palette with tactical accents (emerald for verified/safe, amber for suspicious/review, rose for verified threat/malicious, cyan for hybrid AI telemetry).
2. **High Information Density with Visual Breathing Room**: Security analysts and end users both need immediate triage metrics. Don't hide critical threat indicators behind gratuitous clicks or excessive padding.
3. **Restrained Animation**: Motion must indicate state changes or threat triage updates only. No continuous distracting animations, looping glows, or bouncy UI elements. Transitions must be `<= 200ms` with ease-out curves.
4. **Authentic Content & Context**: Never render placeholder text like "Lorem ipsum" or dummy counters like "1234 Threat Score". Use realistic scam vectors (smishing, urgent imposter bank transfers, AI voice clone alerts, WhatsApp job traps).
5. **Clear Threat Hierarchy**: Immediate visual recognition of threat severity levels (`CRITICAL`, `HIGH`, `ELEVATED`, `LOW`, `BENIGN`).

---

## 2. Color System & Tokens (Tailwind CSS)

```css
/* Color System Tokens */
:root {
  /* Surfaces */
  --surface-canvas: #090d16;      /* Deep obsidian navy canvas */
  --surface-card: #0f172a;        /* Elevated container / card */
  --surface-card-hover: #1e293b;  /* Interactive card hover */
  --surface-border: #1e293b;      /* Subtle structural dividing lines */
  --surface-border-subtle: #334155;

  /* Typography */
  --text-primary: #f8fafc;        /* Main headings & primary labels */
  --text-secondary: #94a3b8;      /* Supporting descriptions, timestamps */
  --text-muted: #64748b;          /* Metadata tags, helper copy */

  /* Threat Indicators */
  --threat-critical: #f43f5e;     /* Rose 500: Confirmed malicious campaign */
  --threat-high: #fb7185;         /* Rose 400: High confidence threat */
  --threat-medium: #f59e0b;       /* Amber 500: Elevated suspicion / triage */
  --threat-low: #38bdf8;          /* Sky 400: Low risk anomaly */
  --threat-safe: #10b981;         /* Emerald 500: Verified legitimate */

  /* AI Telemetry Badges */
  --ai-local: #10b981;            /* Emerald 500: Processed on-device (Nano) */
  --ai-cloud: #6366f1;            /* Indigo 500: Cloud AI reasoning */
  --ai-hybrid: #06b6d4;           /* Cyan 500: Hybrid verification pipeline */
}
```

### Threat Badge Implementation

```tsx
import React from 'react';
import { ShieldAlert, ShieldCheck, AlertTriangle, Cpu, Cloud } from 'lucide-react';

export type ThreatLevel = 'CRITICAL' | 'HIGH' | 'SUSPICIOUS' | 'SAFE' | 'UNKNOWN';

interface ThreatBadgeProps {
  level: ThreatLevel;
  score?: number;
}

export const ThreatBadge: React.FC<ThreatBadgeProps> = ({ level, score }) => {
  const config = {
    CRITICAL: {
      bg: 'bg-rose-950/60 border-rose-600/40 text-rose-300',
      icon: ShieldAlert,
      label: 'Critical Threat',
    },
    HIGH: {
      bg: 'bg-rose-900/40 border-rose-500/30 text-rose-300',
      icon: ShieldAlert,
      label: 'High Risk',
    },
    SUSPICIOUS: {
      bg: 'bg-amber-950/60 border-amber-600/40 text-amber-300',
      icon: AlertTriangle,
      label: 'Suspicious',
    },
    SAFE: {
      bg: 'bg-emerald-950/60 border-emerald-600/40 text-emerald-300',
      icon: ShieldCheck,
      label: 'Clean / Safe',
    },
    UNKNOWN: {
      bg: 'bg-slate-900 border-slate-700 text-slate-400',
      icon: AlertTriangle,
      label: 'Analyzing',
    },
  }[level];

  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold tracking-wide border ${config.bg}`}>
      <Icon className="w-3.5 h-3.5" />
      <span>{config.label}</span>
      {typeof score === 'number' && (
        <span className="ml-1 pl-1.5 border-l border-current/20 font-mono">
          {score}/100
        </span>
      )}
    </span>
  );
};
```

---

## 3. UI Component Patterns

### A. Inference Source Indicator
Every AI result must clearly communicate to the user where the computation occurred:
- **On-Device Badge**: `Gemini Nano (Local / Private)`
- **Cloud AI Badge**: `Gemini Pro (Cloud Intelligence)`
- **Hybrid Badge**: `Hybrid Pipeline (Local triage + Cloud consensus)`

### B. Scam Triage Card Layout
- **Header**: Threat Level Badge + Inference Source Badge + Relative Timestamp.
- **Body**: Redacted Threat Excerpt (monospaced font for SMS/emails) + Detected Tactical Indicators (e.g. `Urgency Trigger`, `Bank Impersonation`, `Malicious Domain`).
- **Footer**: Threat Score Bar + Action Row (Share to Community Redacted, Dismiss, Export Advisory).

---

## 4. Layout & Spacing Rules

- **Base Grid**: Strict 4px/8px multiples (`p-2`, `p-4`, `p-6`, `gap-4`, `gap-6`).
- **Containers**: Max container width `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`.
- **Card Styling**: `bg-slate-900/80 border border-slate-800 rounded-xl p-5 shadow-sm hover:border-slate-700 transition-colors duration-150`.
- **Typography Scale**:
  - H1: `text-2xl sm:text-3xl font-bold tracking-tight text-slate-100`
  - H2: `text-lg sm:text-xl font-semibold text-slate-200`
  - Body: `text-sm text-slate-300 leading-relaxed`
  - Metadata / Monospace: `text-xs font-mono text-slate-400`

---

## 5. Frontend Design Checklist

- [ ] Does the page use the standardized dark theme palette with no jarring bright white surfaces?
- [ ] Are threat severity levels and AI inference badges instantly distinguishable?
- [ ] Are animations functional (`<= 200ms`) and free of distracting constant motion?
- [ ] Does the layout gracefully adapt across mobile (`375px`), tablet (`768px`), and desktop (`1280px+`)?
- [ ] Are all empty states informative, providing actionable next steps instead of blank slates?
- [ ] Is raw user data masked or redacted in preview cards?

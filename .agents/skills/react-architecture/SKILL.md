---
name: react-architecture
description: Architecture standards, directory layout, state management, and component patterns for ScamSignal using React 19, TypeScript, and Vite.
---

# React & TypeScript Architecture for ScamSignal

ScamSignal is built with React 19, TypeScript (Strict Mode), and Vite. Maintain clean service boundaries, explicit typing, and modular state management to ensure long-term stability and rapid hackathon iteration.

---

## 1. Directory Structure

```
src/
├── assets/                 # Static media and brand assets
├── components/             # Reusable UI components
│   ├── common/             # Buttons, Modals, Badges, Loaders, EmptyState
│   ├── layout/             # Header, Navigation, Sidebar, Footer
│   └── scam/               # ThreatCard, InferenceBadge, RedactionPreview, CampaignGraph
├── features/               # Feature-based domain modules
│   ├── analyzer/           # Private Scam Analyzer (Local/Hybrid)
│   ├── feed/               # Community Threat Intelligence Feed
│   ├── campaigns/          # Correlated Threat Campaigns
│   └── admin/              # Threat Triage & Verification Console
├── hooks/                  # Custom React hooks (useAuth, useScamAnalysis, useThreats)
├── services/               # Isolated external boundary services
│   ├── firebase/           # Firebase initialization & SDK clients
│   ├── firestore/          # Typed Firestore collection handlers
│   └── ai/                 # Firebase AI Logic service wrapper
├── types/                  # Shared TypeScript interfaces and domain schemas
├── utils/                  # Sanitization, hashing, date formatting, regex helpers
├── App.tsx                 # Root application routing and providers
└── main.tsx                # Entry point
```

---

## 2. Core Architectural Rules

1. **Clear Service Boundaries**:
   - Components MUST NOT invoke raw Firestore or Firebase SDK calls directly.
   - All backend queries and mutations belong in `services/firestore/` or custom hooks in `hooks/`.
   - All AI inference calls belong in `services/ai/`.
2. **Explicit Strict Typing**:
   - Never use `any`. Always declare explicit interfaces or types.
   - Use union types for status states: `'idle' | 'loading' | 'success' | 'error'`.
3. **Component Size & Responsibility**:
   - Limit components to `< 150 lines`.
   - Separate container/page logic (data fetching, state coordination) from presentational components (displaying data, capturing clicks).
4. **Resilient UI States**:
   - Every view handling asynchronous operations must explicitly implement:
     - `LoadingState`: Skeleton or spinner with context.
     - `ErrorState`: Clear error description with retry trigger.
     - `EmptyState`: Actionable fallback when zero records exist.

---

## 3. Service Pattern Example

### Typed Scam Intelligence Service

```typescript
// src/types/scam.ts
export type ThreatLevel = 'CRITICAL' | 'HIGH' | 'SUSPICIOUS' | 'SAFE' | 'UNKNOWN';
export type InferenceSource = 'on-device' | 'cloud' | 'hybrid-fallback';

export interface ThreatAnalysisResult {
  id: string;
  threatLevel: ThreatLevel;
  confidenceScore: number; // 0 - 100
  threatCategories: string[];
  redactedSummary: string;
  tacticalIndicators: string[];
  advisoryAdvice: string[];
  inferenceSource: InferenceSource;
  analyzedAt: string; // ISO string
}

export interface ScamSubmissionInput {
  rawContent: string;
  channel: 'sms' | 'email' | 'whatsapp' | 'call' | 'web';
  userConsentCloud: boolean;
}
```

```typescript
// src/services/ai/scamAnalyzerService.ts
import { ThreatAnalysisResult, ScamSubmissionInput } from '../../types/scam';
import { runFirebaseAILogic } from './firebaseAILogic';
import { redactPII } from '../../utils/redactor';

export async function analyzeScamContent(
  input: ScamSubmissionInput
): Promise<ThreatAnalysisResult> {
  // 1. Mandatory client-side pre-redaction
  const sanitizedContent = redactPII(input.rawContent);

  // 2. Delegate to Firebase AI Logic with mode preference
  const response = await runFirebaseAILogic({
    prompt: sanitizedContent,
    channel: input.channel,
    allowCloudFallback: input.userConsentCloud,
    preference: 'on-device-preferred',
  });

  return {
    id: crypto.randomUUID(),
    threatLevel: response.threatLevel,
    confidenceScore: response.confidenceScore,
    threatCategories: response.threatCategories,
    redactedSummary: response.summary,
    tacticalIndicators: response.indicators,
    advisoryAdvice: response.recommendedActions,
    inferenceSource: response.source,
    analyzedAt: new Date().toISOString(),
  };
}
```

---

## 4. Custom Hook & UI State Pattern

```tsx
// src/features/analyzer/useScamAnalyzer.ts
import { useState, useCallback } from 'react';
import { ThreatAnalysisResult, ScamSubmissionInput } from '../../types/scam';
import { analyzeScamContent } from '../../services/ai/scamAnalyzerService';

export function useScamAnalyzer() {
  const [status, setStatus] = useState<'idle' | 'analyzing' | 'success' | 'error'>('idle');
  const [result, setResult] = useState<ThreatAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const analyze = useCallback(async (input: ScamSubmissionInput) => {
    setStatus('analyzing');
    setError(null);
    try {
      const data = await analyzeScamContent(input);
      setResult(data);
      setStatus('success');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Analysis failed unexpectedly.';
      setError(message);
      setStatus('error');
    }
  }, []);

  const reset = useCallback(() => {
    setStatus('idle');
    setResult(null);
    setError(null);
  }, []);

  return { status, result, error, analyze, reset };
}
```

---

## 5. React Architecture Checklist

- [ ] Are services strictly isolated from React rendering components?
- [ ] Is TypeScript configured in strict mode without `any` or loose casts?
- [ ] Are custom hooks used to encapsulate asynchronous flows and business logic?
- [ ] Does every async UI view cover loading, error, empty, and populated states?
- [ ] Are props passed via explicit typed interfaces rather than destructured untyped blobs?
- [ ] Are shared constants, utility functions, and regex matchers centralized in `src/utils/`?

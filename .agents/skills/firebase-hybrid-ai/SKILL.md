---
name: firebase-hybrid-ai
description: Standards and patterns for Firebase AI Logic integration in ScamSignal, orchestrating on-device Gemini Nano and cloud models with truthful inference source attribution.
---

# Firebase Hybrid AI Architecture for ScamSignal

ScamSignal utilizes **Firebase AI Logic** to deliver privacy-first, on-device scam detection with transparent, user-consented cloud intelligence fallback. Truthful telemetry regarding where inference occurs is a core product tenet.

---

## 1. Core Tenets

1. **Firebase AI Logic Exclusively**: All generative and predictive AI tasks (threat triage, tactical extraction, PII redaction verification, campaign correlation) must run through Firebase AI Logic.
2. **Three Inference Modes**:
   - `strict-on-device`: Runs exclusively on the client (e.g., Chrome Built-in AI / Gemini Nano via Firebase AI Logic). Fails cleanly if the local model is unavailable; **never** falls back to cloud automatically without explicit consent.
   - `on-device-preferred`: Attempts on-device execution first for immediate privacy and zero latency. If local hardware or models are unsupported, seamlessly falls back to cloud inference *only* if the user enabled cloud fallback.
   - `cloud-only`: Used for resource-intensive, aggregate threat intelligence tasks across verified community corpora.
3. **Truthful Telemetry**:
   - Always expose the actual runtime inference source returned by the Firebase AI Logic SDK (`'on-device'` vs `'cloud'` vs `'hybrid-fallback'`).
   - **Never mock, fake, or hardcode `'on-device'`** when running in environments without actual local model execution.
4. **Structured & Validated Output**: Every inference prompt must mandate structured JSON schema output, rigorously validated before reaching application state.

---

## 2. Structured Output Schema

All scam analysis inferences must conform to this JSON schema:

```json
{
  "threatLevel": "CRITICAL" | "HIGH" | "SUSPICIOUS" | "SAFE",
  "confidenceScore": 85,
  "threatCategories": ["IMPERSONATION", "URGENCY_TRIGGER", "MALICIOUS_LINK"],
  "tacticalIndicators": [
    "Sender claims to be fraud department of Axis Bank",
    "Pressure to click link within 15 minutes",
    "Link directs to typo-squatted domain: axis-secure-login.xyz"
  ],
  "summary": "Urgent SMS claiming unauthorized banking transaction requiring immediate credential verification.",
  "recommendedActions": [
    "Do not click the provided URL",
    "Block the sender number immediately",
    "Contact your bank directly using the official number on your bank card"
  ]
}
```

---

## 3. Implementation Pattern (`src/services/ai/firebaseAILogic.ts`)

```typescript
import { z } from 'zod';

// Strict validation schema for AI output
export const ThreatResponseSchema = z.object({
  threatLevel: z.enum(['CRITICAL', 'HIGH', 'SUSPICIOUS', 'SAFE']),
  confidenceScore: z.number().min(0).max(100),
  threatCategories: z.array(z.string()),
  tacticalIndicators: z.array(z.string()),
  summary: z.string(),
  recommendedActions: z.array(z.string()),
});

export type ThreatAnalysisData = z.infer<typeof ThreatResponseSchema>;

export type InferenceExecutionSource = 'on-device' | 'cloud' | 'hybrid-fallback';

export interface RunAILogicOptions {
  prompt: string;
  channel: string;
  preference: 'strict-on-device' | 'on-device-preferred' | 'cloud-only';
  allowCloudFallback: boolean;
}

export interface AILogicResult extends ThreatAnalysisData {
  source: InferenceExecutionSource;
  modelIdentifier: string;
  latencyMs: number;
}

/**
 * Executes scam analysis through Firebase AI Logic.
 * Respects strict device constraints and records genuine runtime execution metrics.
 */
export async function runFirebaseAILogic(options: RunAILogicOptions): Promise<AILogicResult> {
  const startTime = performance.now();

  const systemInstructions = `
You are ScamSignal, a cybersecurity scam intelligence assistant.
Analyze the provided communication excerpt for scam and fraud indicators.
Respond strictly in valid JSON matching this structure:
{
  "threatLevel": "CRITICAL" | "HIGH" | "SUSPICIOUS" | "SAFE",
  "confidenceScore": number (0-100),
  "threatCategories": string[],
  "tacticalIndicators": string[],
  "summary": string,
  "recommendedActions": string[]
}
Never include markdown code blocks, backticks, or preamble. Return raw parseable JSON only.
`;

  try {
    // Check local capability via Firebase AI Logic / Window AI availability
    const hasLocalCapability = typeof window !== 'undefined' && 
      'ai' in window && 
      // @ts-expect-error chrome window.ai check
      Boolean(window.ai?.languageModel);

    let executionSource: InferenceExecutionSource;
    let rawTextResponse = '';
    let modelName = '';

    if (options.preference === 'strict-on-device') {
      if (!hasLocalCapability) {
        throw new Error('On-device AI model is not available or unsupported in this browser.');
      }
      executionSource = 'on-device';
      modelName = 'Gemini Nano (Local)';
      // Call local model via Firebase AI Logic local adapter
      rawTextResponse = await executeLocalFirebaseAI(systemInstructions, options.prompt);
    } else if (options.preference === 'on-device-preferred') {
      if (hasLocalCapability) {
        try {
          executionSource = 'on-device';
          modelName = 'Gemini Nano (Local)';
          rawTextResponse = await executeLocalFirebaseAI(systemInstructions, options.prompt);
        } catch (localErr) {
          if (!options.allowCloudFallback) {
            throw new Error(`Local inference failed and cloud fallback was not permitted: ${localErr}`);
          }
          executionSource = 'hybrid-fallback';
          modelName = 'Gemini 1.5 Flash (Cloud Fallback)';
          rawTextResponse = await executeCloudFirebaseAI(systemInstructions, options.prompt);
        }
      } else {
        if (!options.allowCloudFallback) {
          throw new Error('Local inference is unavailable and user did not authorize cloud analysis.');
        }
        executionSource = 'cloud';
        modelName = 'Gemini 1.5 Flash (Cloud)';
        rawTextResponse = await executeCloudFirebaseAI(systemInstructions, options.prompt);
      }
    } else {
      // cloud-only
      executionSource = 'cloud';
      modelName = 'Gemini 1.5 Pro (Cloud Intelligence)';
      rawTextResponse = await executeCloudFirebaseAI(systemInstructions, options.prompt);
    }

    // Parse and validate structured output
    const cleanedJson = rawTextResponse.replace(/```json\n?|```/g, '').trim();
    const parsed = JSON.parse(cleanedJson);
    const validated = ThreatResponseSchema.parse(parsed);

    const latencyMs = Math.round(performance.now() - startTime);

    return {
      ...validated,
      source: executionSource,
      modelIdentifier: modelName,
      latencyMs,
    };
  } catch (error: unknown) {
    console.error('[Firebase AI Logic] Execution error:', error);
    throw error;
  }
}

// Low-level adapters encapsulating Firebase AI Logic APIs
async function executeLocalFirebaseAI(instruction: string, prompt: string): Promise<string> {
  // @ts-expect-error Chrome built-in / Firebase AI Logic local runner
  const session = await window.ai.languageModel.create({
    systemPrompt: instruction,
  });
  return await session.prompt(prompt);
}

async function executeCloudFirebaseAI(instruction: string, prompt: string): Promise<string> {
  // Dispatches request via Firebase AI Logic Cloud Vertex / Firebase Functions endpoint
  const response = await fetch('/api/ai/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ instruction, prompt }),
  });
  if (!response.ok) {
    throw new Error(`Cloud AI inference failed with HTTP ${response.status}`);
  }
  const data = await response.json();
  return data.output;
}
```

---

## 4. Error Handling & Fallback Protocol

| Failure Scenario | Action Required | User-Facing Feedback |
|---|---|---|
| Local model not downloaded/ready | Prompt user or offer 1-click cloud fallback if consented | "Local Gemini Nano model is downloading or not ready. Switch to cloud analysis?" |
| Hardware acceleration disabled | Log warning, switch mode according to user preference | "On-device processing requires browser WebGPU/NPU support." |
| User declined cloud fallback | Cease processing immediately; do not send payload across network | "Analysis aborted: Private local model unavailable and cloud transfer declined." |
| Malformed AI output / JSON failure | Attempt 1 automatic re-prompt or fallback to rule-based regex parsing | "AI response validation failed. Flagged for manual review." |

---

## 5. Firebase Hybrid AI Checklist

- [ ] Is every AI inference powered exclusively by Firebase AI Logic?
- [ ] Is on-device inference attempted first for personal threat analysis?
- [ ] Is the true inference source (`on-device`, `cloud`, `hybrid-fallback`) preserved and displayed in the UI?
- [ ] Does strict on-device mode never contact the cloud when local models fail?
- [ ] Are AI responses strictly parsed with runtime schema validation (e.g. Zod)?
- [ ] Are all prompts accompanied by system instructions forbidding markdown wrappers?

import {
  getGenerativeModel,
  InferenceMode,
  InferenceSource as SDKInferenceSource,
  Schema,
  AIError,
  AIErrorCode,
  HybridParams,
  LanguageModelDownloadMonitor,
} from 'firebase/ai';
import { z } from 'zod';
import { ai, firebaseStatus } from '../firebase/firebaseApp';
import { InferenceSource } from '../../types/threat';
import {
  SCAM_CATEGORIES,
  MANIPULATION_PATTERNS,
  ThreatResponseSchema,
  ThreatResponseData,
  parseAndValidateModelResponse,
} from './analysisSchema';
import {
  CLAIMED_ORG_TYPES,
  IMPERSONATION_INDICATORS,
  PAYMENT_MECHANISMS,
  REQUESTED_ACTIONS,
  URGENCY_PATTERNS,
  parseAndValidateScamDnaAiResponse,
  type ScamDnaAiOutput,
} from '../dna/scamDnaSchema';

export { InferenceMode, ThreatResponseSchema };
export type { ThreatResponseData };

export const CLOUD_MODEL_ID = 'gemini-2.5-flash';

export type HybridAIErrorCode =
  | 'FIREBASE_NOT_CONFIGURED'
  | 'UNSUPPORTED_BROWSER'
  | 'LOCAL_MODEL_UNAVAILABLE'
  | 'MODEL_DOWNLOADING'
  | 'NETWORK_ERROR'
  | 'API_NOT_ENABLED'
  | 'INVALID_RESPONSE'
  | 'ABORTED'
  | 'UNKNOWN';

export class HybridAIError extends Error {
  readonly code: HybridAIErrorCode;
  readonly causeError?: unknown;

  constructor(code: HybridAIErrorCode, message: string, causeError?: unknown) {
    super(message);
    this.name = 'HybridAIError';
    this.code = code;
    this.causeError = causeError;
  }
}

export interface HybridInferenceOptions {
  prompt: string;
  channel: string;
  mode: InferenceMode;
  onDownloadProgress?: (loadedRatio: number) => void;
  signal?: AbortSignal;
}

export interface AILogicExecutionResult extends ThreatResponseData {
  source: InferenceSource;
  modelIdentifier: string;
  latencyMs: number;
}

const SYSTEM_INSTRUCTION = `You are ScamSignal, a balanced, advisory scam analysis engine for non-technical users.
Analyze the provided sanitized message objectively.

Critical rules:
1. Do NOT treat every unfamiliar or brief message as fraudulent. If the message lacks clear manipulation patterns or malicious intent, classify it as "SAFE" ("legitimate_or_benign") or "UNKNOWN" ("ambiguous_unclear").
2. Never invent percentage confidence scores or claim absolute certainty.
3. Strictly separate factual "observedEvidence" (exact quoted phrases or elements present in the message) from "aiInterpretation" (your plain-language assessment of what those facts mean).
4. Use one of these scamCategory values: ${SCAM_CATEGORIES.join(', ')}.
5. Identify any matching manipulationPatterns from: ${MANIPULATION_PATTERNS.join(', ')}.
6. For EVERY identified indicator in "indicators", provide:
   - pattern (from manipulationPatterns)
   - observedEvidence (exact quote from the message)
   - explanation (why this indicator matters in plain English)
   - verificationStep (a practical, concrete step the user can take to verify safely)
7. Respond strictly in raw, valid JSON (no markdown fences or preamble) matching:
{
  "riskLevel": "CRITICAL" | "HIGH" | "SUSPICIOUS" | "SAFE" | "UNKNOWN",
  "scamCategory": string,
  "manipulationPatterns": string[],
  "observedEvidence": string[],
  "indicators": [
    {
      "pattern": string,
      "observedEvidence": string,
      "explanation": string,
      "verificationStep": string
    }
  ],
  "aiInterpretation": string,
  "recommendedActions": string[]
}`;

const RESPONSE_SCHEMA = Schema.object({
  properties: {
    riskLevel: Schema.enumString({
      enum: ['CRITICAL', 'HIGH', 'SUSPICIOUS', 'SAFE', 'UNKNOWN'],
    }),
    scamCategory: Schema.enumString({ enum: [...SCAM_CATEGORIES] }),
    manipulationPatterns: Schema.array({
      items: Schema.enumString({ enum: [...MANIPULATION_PATTERNS] }),
    }),
    observedEvidence: Schema.array({ items: Schema.string() }),
    indicators: Schema.array({
      items: Schema.object({
        properties: {
          pattern: Schema.enumString({ enum: [...MANIPULATION_PATTERNS] }),
          observedEvidence: Schema.string(),
          explanation: Schema.string(),
          verificationStep: Schema.string(),
        },
      }),
    }),
    aiInterpretation: Schema.string(),
    recommendedActions: Schema.array({ items: Schema.string() }),
  },
});

function buildDownloadMonitor(
  onDownloadProgress?: (loadedRatio: number) => void
): ((monitor: LanguageModelDownloadMonitor) => void) | undefined {
  if (!onDownloadProgress) return undefined;
  return (monitor: LanguageModelDownloadMonitor) => {
    monitor.addEventListener('downloadprogress', (event) => {
      onDownloadProgress(event.loaded);
    });
  };
}

/**
 * Configuration 1: PREFER_ON_DEVICE
 * Attempts local on-device execution first, with permitted cloud fallback to gemini-2.5-flash.
 */
export function createPreferOnDeviceParams(
  onDownloadProgress?: (loadedRatio: number) => void,
  signal?: AbortSignal
): HybridParams {
  return {
    mode: InferenceMode.PREFER_ON_DEVICE,
    onDeviceParams: {
      createOptions: {
        signal,
        monitor: buildDownloadMonitor(onDownloadProgress),
      },
    },
    inCloudParams: {
      model: CLOUD_MODEL_ID,
      systemInstruction: SYSTEM_INSTRUCTION,
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: RESPONSE_SCHEMA,
        temperature: 0.2,
      },
    },
  };
}

/**
 * Configuration 2: ONLY_ON_DEVICE
 * Strictly local-only execution for sensitive content that must never leave the device.
 */
export function createOnlyOnDeviceParams(
  onDownloadProgress?: (loadedRatio: number) => void,
  signal?: AbortSignal
): HybridParams {
  return {
    mode: InferenceMode.ONLY_ON_DEVICE,
    onDeviceParams: {
      createOptions: {
        signal,
        monitor: buildDownloadMonitor(onDownloadProgress),
      },
    },
  };
}

/**
 * Configuration 3: ONLY_IN_CLOUD
 * Cloud-only execution for approved collective/sanitized analysis.
 */
export function createOnlyInCloudParams(): HybridParams {
  return {
    mode: InferenceMode.ONLY_IN_CLOUD,
    inCloudParams: {
      model: CLOUD_MODEL_ID,
      systemInstruction: SYSTEM_INSTRUCTION,
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: RESPONSE_SCHEMA,
        temperature: 0.2,
      },
    },
  };
}

function mapSDKInferenceSource(sdkSource?: SDKInferenceSource): InferenceSource {
  if (sdkSource === SDKInferenceSource.ON_DEVICE) return 'on_device';
  if (sdkSource === SDKInferenceSource.IN_CLOUD) return 'in_cloud';
  return 'unknown';
}

function mapHybridError(err: unknown, mode: InferenceMode): HybridAIError {
  if (err instanceof HybridAIError) return err;

  if (err instanceof DOMException && err.name === 'AbortError') {
    return new HybridAIError('ABORTED', 'Analysis was cancelled.', err);
  }

  if (err instanceof z.ZodError || err instanceof SyntaxError) {
    return new HybridAIError(
      'INVALID_RESPONSE',
      'AI response was incomplete or did not match the required structured threat schema.',
      err
    );
  }

  if (err instanceof AIError) {
    if (err.code === AIErrorCode.FETCH_ERROR) {
      return new HybridAIError(
        'NETWORK_ERROR',
        'Network error while contacting Firebase AI Logic cloud backend.',
        err
      );
    }
    if (err.code === AIErrorCode.API_NOT_ENABLED) {
      return new HybridAIError(
        'API_NOT_ENABLED',
        'Firebase AI Logic API is not enabled in the Firebase Console.',
        err
      );
    }
  }

  const msg = err instanceof Error ? err.message : String(err);
  const lower = msg.toLowerCase();

  if (lower.includes('download') || lower.includes('downloading')) {
    return new HybridAIError(
      'MODEL_DOWNLOADING',
      'On-device Gemini Nano model is still downloading. Please wait and retry.',
      err
    );
  }

  if (
    mode === InferenceMode.ONLY_ON_DEVICE &&
    (lower.includes('unavailable') ||
      lower.includes('not available') ||
      lower.includes('unsupported') ||
      lower.includes('not supported') ||
      lower.includes('languagemodel'))
  ) {
    const isUnsupported = lower.includes('unsupported') || lower.includes('not supported');
    return new HybridAIError(
      isUnsupported ? 'UNSUPPORTED_BROWSER' : 'LOCAL_MODEL_UNAVAILABLE',
      isUnsupported
        ? 'This browser does not support on-device Gemini Nano inference.'
        : 'On-device Gemini Nano model is unavailable or not yet downloaded.',
      err
    );
  }

  return new HybridAIError('UNKNOWN', msg || 'Firebase AI Logic inference failed.', err);
}

function selectHybridParams(options: HybridInferenceOptions): HybridParams {
  switch (options.mode) {
    case InferenceMode.ONLY_ON_DEVICE:
      return createOnlyOnDeviceParams(options.onDownloadProgress, options.signal);
    case InferenceMode.ONLY_IN_CLOUD:
      return createOnlyInCloudParams();
    case InferenceMode.PREFER_ON_DEVICE:
    default:
      return createPreferOnDeviceParams(options.onDownloadProgress, options.signal);
  }
}

/**
 * Executes scam analysis using the official Firebase AI Logic Web SDK.
 * Captures and exposes the actual inferenceSource returned by the SDK.
 */
export async function executeHybridInference(
  options: HybridInferenceOptions
): Promise<AILogicExecutionResult> {
  if (!ai || !firebaseStatus.isConfigured) {
    throw new HybridAIError(
      'FIREBASE_NOT_CONFIGURED',
      `Firebase AI Logic cannot run: missing environment variables (${firebaseStatus.missingKeys.join(', ')}).`
    );
  }

  const startTime = performance.now();
  const hybridParams = selectHybridParams(options);

  try {
    const model = getGenerativeModel(ai, hybridParams);
    const userPrompt =
      options.mode === InferenceMode.ONLY_ON_DEVICE
        ? `${SYSTEM_INSTRUCTION}\n\nChannel: ${options.channel}\nMessage:\n${options.prompt}`
        : `Channel: ${options.channel}\nMessage:\n${options.prompt}`;

    const result = await model.generateContent(userPrompt, {
      signal: options.signal,
    });

    const sdkSource = result.response.inferenceSource;
    const mappedSource = mapSDKInferenceSource(sdkSource);

    const rawText = result.response.text();
    const validated = parseAndValidateModelResponse(rawText);

    const latencyMs = Math.round(performance.now() - startTime);
    const modelIdentifier =
      mappedSource === 'on_device'
        ? 'Gemini Nano (On-Device)'
        : mappedSource === 'in_cloud'
        ? `${CLOUD_MODEL_ID} (Cloud)`
        : 'Firebase AI Logic';

    return {
      ...validated,
      source: mappedSource,
      modelIdentifier,
      latencyMs,
    };
  } catch (err: unknown) {
    throw mapHybridError(err, options.mode);
  }
}

const DNA_SYSTEM_INSTRUCTION = `You are ScamSignal DNA, a structured threat-signature classifier for sanitized scam reports.
Rules:
1. Classify ONLY based on the sanitized text provided. Never invent missing domains, organizations, payment methods, or evidence.
2. If an organization type, requested action, or payment mechanism is not clearly supported by the text, use "unknown_unspecified" or "none_detected".
3. Choose values strictly from the allowed enum lists.
4. Keep "rationale" concise (1-2 sentences) explaining your classification as an interpretation, not a confirmed fact.
5. Respond strictly in raw valid JSON.`;

const DNA_RESPONSE_SCHEMA = Schema.object({
  properties: {
    scamCategory: Schema.enumString({ enum: [...SCAM_CATEGORIES] }),
    claimedOrganizationType: Schema.enumString({ enum: [...CLAIMED_ORG_TYPES] }),
    requestedAction: Schema.enumString({ enum: [...REQUESTED_ACTIONS] }),
    paymentMechanism: Schema.enumString({ enum: [...PAYMENT_MECHANISMS] }),
    urgencyPatterns: Schema.array({
      items: Schema.enumString({ enum: [...URGENCY_PATTERNS] }),
    }),
    impersonationIndicators: Schema.array({
      items: Schema.enumString({ enum: [...IMPERSONATION_INDICATORS] }),
    }),
    rationale: Schema.string(),
  },
});

export interface ScamDnaAiInferenceResult extends ScamDnaAiOutput {
  source: InferenceSource;
}

/**
 * Runs structured Scam DNA interpretation on already-sanitized report text
 * using Firebase AI Logic (defaults to ONLY_IN_CLOUD for sanitized reports).
 */
export async function executeScamDnaInference(options: {
  sanitizedText: string;
  channel?: string;
  mode?: InferenceMode;
  signal?: AbortSignal;
}): Promise<ScamDnaAiInferenceResult> {
  if (!ai || !firebaseStatus.isConfigured) {
    throw new HybridAIError(
      'FIREBASE_NOT_CONFIGURED',
      `Firebase AI Logic cannot run: missing environment variables (${firebaseStatus.missingKeys.join(', ')}).`
    );
  }

  const mode = options.mode ?? InferenceMode.ONLY_IN_CLOUD;
  const hybridParams: HybridParams =
    mode === InferenceMode.ONLY_ON_DEVICE
      ? {
          mode: InferenceMode.ONLY_ON_DEVICE,
          onDeviceParams: { createOptions: { signal: options.signal } },
        }
      : {
          mode,
          inCloudParams: {
            model: CLOUD_MODEL_ID,
            systemInstruction: DNA_SYSTEM_INSTRUCTION,
            generationConfig: {
              responseMimeType: 'application/json',
              responseSchema: DNA_RESPONSE_SCHEMA,
              temperature: 0.1,
            },
          },
        };

  try {
    const model = getGenerativeModel(ai, hybridParams);
    const prompt = `Channel: ${options.channel ?? 'unknown'}\nSanitized Report:\n${options.sanitizedText}`;
    const result = await model.generateContent(prompt, { signal: options.signal });
    const mappedSource = mapSDKInferenceSource(result.response.inferenceSource);
    const validated = parseAndValidateScamDnaAiResponse(result.response.text());

    return {
      ...validated,
      source: mappedSource,
    };
  } catch (err: unknown) {
    throw mapHybridError(err, mode);
  }
}

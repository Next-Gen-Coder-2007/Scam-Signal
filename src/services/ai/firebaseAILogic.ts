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

export { InferenceMode };

export const CLOUD_MODEL_ID = 'gemini-2.5-flash';

export const ThreatResponseSchema = z.object({
  threatLevel: z.enum(['CRITICAL', 'HIGH', 'SUSPICIOUS', 'SAFE']),
  confidenceScore: z.number().min(0).max(100),
  threatCategories: z.array(z.string()).min(1),
  tacticalIndicators: z.array(z.string()).min(1),
  summary: z.string().min(5),
  recommendedActions: z.array(z.string()).min(1),
});

export type ThreatResponseData = z.infer<typeof ThreatResponseSchema>;

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

const SYSTEM_INSTRUCTION = `You are ScamSignal, a cybersecurity scam intelligence triage engine.
Analyze the provided sanitized excerpt for scam vectors, imposter fraud, and suspicious triggers.
Respond strictly in valid, parseable JSON matching this schema:
{
  "threatLevel": "CRITICAL" | "HIGH" | "SUSPICIOUS" | "SAFE",
  "confidenceScore": number (0-100),
  "threatCategories": string[],
  "tacticalIndicators": string[],
  "summary": string,
  "recommendedActions": string[]
}
Never include markdown code fences, backticks, or explanatory preamble. Output raw JSON only.`;

const RESPONSE_SCHEMA = Schema.object({
  properties: {
    threatLevel: Schema.enumString({ enum: ['CRITICAL', 'HIGH', 'SUSPICIOUS', 'SAFE'] }),
    confidenceScore: Schema.integer(),
    threatCategories: Schema.array({ items: Schema.string() }),
    tacticalIndicators: Schema.array({ items: Schema.string() }),
    summary: Schema.string(),
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
      'AI response did not match the required structured threat schema.',
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
    const cleaned = rawText.replace(/```json\n?|```/g, '').trim();
    const parsed = JSON.parse(cleaned);
    const validated = ThreatResponseSchema.parse(parsed);

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

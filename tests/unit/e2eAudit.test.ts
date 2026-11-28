import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InferenceMode, InferenceSource as SDKInferenceSource } from 'firebase/ai';

const mockGenerateContent = vi.fn();

vi.mock('firebase/ai', async (importOriginal) => {
  const actual = await importOriginal<typeof import('firebase/ai')>();
  return {
    ...actual,
    getGenerativeModel: vi.fn(() => ({
      generateContent: (...args: unknown[]) => mockGenerateContent(...args),
    })),
  };
});

vi.mock('../../src/services/firebase/firebaseApp', () => ({
  ai: {},
  db: {},
  auth: {},
  functions: {},
  firebaseStatus: {
    isConfigured: true,
    missingKeys: [],
    appCheckStatus: 'unconfigured',
    appCheckError: null,
  },
}));

import {
  executeHybridInference,
  executeCollectiveCampaignInference,
  HybridAIError,
} from '../../src/services/ai/firebaseAILogic';
import { redactPII, containsPII } from '../../src/utils/redactor';
import { validateAnalyzerInput } from '../../src/utils/validation';
import { formatFirestoreError } from '../../src/utils/firestoreErrors';
import { extractScamDna } from '../../src/services/dna/scamDnaService';
import { correlateReportPair } from '../../src/services/campaigns/campaignCorrelationEngine';

describe('End-to-End Audit: Failure Modes, Inference Sources & Pipeline Integrity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects invalid analyzer inputs before calling AI', () => {
    expect(validateAnalyzerInput('').valid).toBe(false);
    expect(validateAnalyzerInput('hi').valid).toBe(false);
    expect(validateAnalyzerInput('a'.repeat(5001)).valid).toBe(false);
  });

  it('reports actual SDK inferenceSource for on_device and in_cloud modes', async () => {
    const validPayload = JSON.stringify({
      riskLevel: 'HIGH',
      scamCategory: 'phishing',
      manipulationPatterns: ['urgency'],
      observedEvidence: ['Click within 24 hours'],
      indicators: [
        {
          pattern: 'urgency',
          observedEvidence: 'within 24 hours',
          explanation: 'Artificial deadline pressures the recipient.',
          verificationStep: 'Check official bank app directly.',
        },
      ],
      aiInterpretation: 'Likely phishing attempt using artificial urgency.',
      recommendedActions: ['Do not click the link.'],
    });

    mockGenerateContent.mockResolvedValueOnce({
      response: {
        inferenceSource: SDKInferenceSource.ON_DEVICE,
        text: () => validPayload,
      },
    });
    const onDeviceRes = await executeHybridInference({
      prompt: 'Verify within 24 hours',
      channel: 'sms',
      mode: InferenceMode.ONLY_ON_DEVICE,
    });
    expect(onDeviceRes.source).toBe('on_device');

    mockGenerateContent.mockResolvedValueOnce({
      response: {
        inferenceSource: SDKInferenceSource.IN_CLOUD,
        text: () => validPayload,
      },
    });
    const cloudRes = await executeHybridInference({
      prompt: 'Verify within 24 hours',
      channel: 'sms',
      mode: InferenceMode.ONLY_IN_CLOUD,
    });
    expect(cloudRes.source).toBe('in_cloud');
  });

  it('handles unavailable local models, network disconnections, and malformed AI responses cleanly', async () => {
    // 1. Unavailable local model in ONLY_ON_DEVICE
    mockGenerateContent.mockRejectedValueOnce(new Error('LanguageModel is not available'));
    await expect(
      executeHybridInference({
        prompt: 'Test message',
        channel: 'sms',
        mode: InferenceMode.ONLY_ON_DEVICE,
      })
    ).rejects.toMatchObject({ code: 'LOCAL_MODEL_UNAVAILABLE' } satisfies Partial<HybridAIError>);

    // 2. Network disconnection (native fetch TypeError)
    mockGenerateContent.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    await expect(
      executeHybridInference({
        prompt: 'Test message',
        channel: 'sms',
        mode: InferenceMode.ONLY_IN_CLOUD,
      })
    ).rejects.toMatchObject({ code: 'NETWORK_ERROR' } satisfies Partial<HybridAIError>);

    // 3. Malformed AI JSON response
    mockGenerateContent.mockResolvedValueOnce({
      response: {
        inferenceSource: SDKInferenceSource.IN_CLOUD,
        text: () => '{broken-json',
      },
    });
    await expect(
      executeHybridInference({
        prompt: 'Test message',
        channel: 'sms',
        mode: InferenceMode.PREFER_ON_DEVICE,
      })
    ).rejects.toMatchObject({ code: 'INVALID_RESPONSE' } satisfies Partial<HybridAIError>);

    // 4. Collective campaign AI inventing unsupported report IDs
    mockGenerateContent.mockResolvedValueOnce({
      response: {
        inferenceSource: SDKInferenceSource.IN_CLOUD,
        text: () =>
          JSON.stringify({
            sharedIndicatorsSummary: 'Shared phishing domain.',
            relationshipExplanation: 'Connected via domain.',
            inconsistencies: [],
            evidenceToReview: ['Check DNS records.'],
            referencedReportIds: ['rep-1', 'rep-hallucinated'],
          }),
      },
    });
    await expect(
      executeCollectiveCampaignInference({
        compactPayload: '{}',
        allowedReportIds: ['rep-1', 'rep-2'],
      })
    ).rejects.toMatchObject({ code: 'INVALID_RESPONSE' } satisfies Partial<HybridAIError>);
  });

  it('runs redaction -> Scam DNA extraction -> campaign correlation end-to-end without PII leakage', async () => {
    const raw1 =
      'Dear Customer, call 9876543210 or pay test@okaxis at https://verify-kyc-bank.xyz/login within 24 hours.';
    const raw2 =
      'Bank alert: send OTP to user@example.com or visit http://verify-kyc-bank.xyz/step2 within 24 hours.';

    const scrubbed1 = redactPII(raw1);
    const scrubbed2 = redactPII(raw2);
    expect(containsPII(scrubbed1)).toBe(false);
    expect(containsPII(scrubbed2)).toBe(false);

    const dna1 = await extractScamDna(
      { sanitizedText: scrubbed1, channel: 'sms' },
      { useAi: false }
    );
    const dna2 = await extractScamDna(
      { sanitizedText: scrubbed2, channel: 'sms' },
      { useAi: false }
    );

    const pair = correlateReportPair(
      { reportId: 'rep-e2e-1', dna: dna1 },
      { reportId: 'rep-e2e-2', dna: dna2 }
    );
    expect(pair.matched).toBe(true);
    expect(pair.supportingIndicators.some((i) => i.value === 'verify-kyc-bank.xyz')).toBe(
      true
    );
  });

  it('sanitizes Firestore index/console URLs so project IDs never leak in UI errors', () => {
    const rawIndexErr = new Error(
      'The query requires an index. That index is currently building and cannot be used yet. See its status here: https://console.firebase.google.com/v1/r/project/scamsignal-373bc/firestore/indexes?create_composite=abc'
    );
    const formatted = formatFirestoreError(rawIndexErr);
    expect(formatted).not.toContain('scamsignal-373bc');
    expect(formatted).not.toContain('console.firebase.google.com');
    expect(formatted).toContain('Database index is still building');
  });
});

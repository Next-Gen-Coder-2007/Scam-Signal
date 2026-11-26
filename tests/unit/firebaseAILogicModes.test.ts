import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  executeHybridInference,
  InferenceMode,
} from '../../src/services/ai/firebaseAILogic';
import { AIError, AIErrorCode, getGenerativeModel, InferenceSource } from 'firebase/ai';

const mockGenerateContent = vi.fn();

vi.mock('../../src/services/firebase/firebaseApp', () => ({
  ai: { mockAiInstance: true },
  firebaseStatus: {
    isConfigured: true,
    missingKeys: [],
    error: null,
    appCheckStatus: 'unconfigured',
    appCheckError: null,
  },
}));

vi.mock('firebase/ai', async (importOriginal) => {
  const actual = await importOriginal<typeof import('firebase/ai')>();
  return {
    ...actual,
    getGenerativeModel: vi.fn(() => ({
      generateContent: mockGenerateContent,
    })),
  };
});

const VALID_PAYLOAD = JSON.stringify({
  threatLevel: 'CRITICAL',
  confidenceScore: 95,
  threatCategories: ['IMPERSONATION_FRAUD'],
  tacticalIndicators: ['Urgent account block threat', 'Typo-squatted domain'],
  summary: 'Bank impersonation SMS demanding immediate credential verification.',
  recommendedActions: ['Do not click link', 'Contact official bank support'],
});

describe('Firebase AI Logic Inference Modes & Error Mapping', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('captures ON_DEVICE inferenceSource when PREFER_ON_DEVICE executes locally', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      response: {
        inferenceSource: InferenceSource.ON_DEVICE,
        text: () => VALID_PAYLOAD,
      },
    });

    const result = await executeHybridInference({
      prompt: 'URGENT bank alert',
      channel: 'sms',
      mode: InferenceMode.PREFER_ON_DEVICE,
    });

    expect(getGenerativeModel).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ mode: InferenceMode.PREFER_ON_DEVICE })
    );
    expect(result.source).toBe('on_device');
    expect(result.modelIdentifier).toContain('Gemini Nano');
    expect(result.threatLevel).toBe('CRITICAL');
  });

  it('captures IN_CLOUD inferenceSource when PREFER_ON_DEVICE falls back to cloud', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      response: {
        inferenceSource: InferenceSource.IN_CLOUD,
        text: () => VALID_PAYLOAD,
      },
    });

    const result = await executeHybridInference({
      prompt: 'URGENT bank alert',
      channel: 'sms',
      mode: InferenceMode.PREFER_ON_DEVICE,
    });

    expect(result.source).toBe('in_cloud');
    expect(result.modelIdentifier).toContain('gemini-2.5-flash');
  });

  it('maps ONLY_ON_DEVICE unavailability to LOCAL_MODEL_UNAVAILABLE', async () => {
    mockGenerateContent.mockRejectedValueOnce(
      new Error('On-device model is unavailable on this device.')
    );

    await expect(
      executeHybridInference({
        prompt: 'Private message',
        channel: 'sms',
        mode: InferenceMode.ONLY_ON_DEVICE,
      })
    ).rejects.toMatchObject({
      name: 'HybridAIError',
      code: 'LOCAL_MODEL_UNAVAILABLE',
    });
  });

  it('maps ONLY_ON_DEVICE unsupported browser to UNSUPPORTED_BROWSER', async () => {
    mockGenerateContent.mockRejectedValueOnce(
      new Error('Prompt API is not supported in this browser.')
    );

    await expect(
      executeHybridInference({
        prompt: 'Private message',
        channel: 'sms',
        mode: InferenceMode.ONLY_ON_DEVICE,
      })
    ).rejects.toMatchObject({
      name: 'HybridAIError',
      code: 'UNSUPPORTED_BROWSER',
    });
  });

  it('routes ONLY_IN_CLOUD with inCloudParams only', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      response: {
        inferenceSource: InferenceSource.IN_CLOUD,
        text: () => VALID_PAYLOAD,
      },
    });

    const result = await executeHybridInference({
      prompt: 'Collective sanitized pattern',
      channel: 'email',
      mode: InferenceMode.ONLY_IN_CLOUD,
    });

    expect(getGenerativeModel).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        mode: InferenceMode.ONLY_IN_CLOUD,
        inCloudParams: expect.objectContaining({ model: 'gemini-2.5-flash' }),
      })
    );
    expect(result.source).toBe('in_cloud');
  });

  it('maps AIError(FETCH_ERROR) to NETWORK_ERROR and API_NOT_ENABLED to API_NOT_ENABLED', async () => {
    mockGenerateContent.mockRejectedValueOnce(
      new AIError(AIErrorCode.FETCH_ERROR, 'Failed to fetch')
    );
    await expect(
      executeHybridInference({
        prompt: 'Test',
        channel: 'sms',
        mode: InferenceMode.ONLY_IN_CLOUD,
      })
    ).rejects.toMatchObject({ code: 'NETWORK_ERROR' });

    mockGenerateContent.mockRejectedValueOnce(
      new AIError(AIErrorCode.API_NOT_ENABLED, 'API disabled')
    );
    await expect(
      executeHybridInference({
        prompt: 'Test',
        channel: 'sms',
        mode: InferenceMode.ONLY_IN_CLOUD,
      })
    ).rejects.toMatchObject({ code: 'API_NOT_ENABLED' });
  });

  it('throws INVALID_RESPONSE when model output fails JSON or Zod validation', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      response: {
        inferenceSource: InferenceSource.IN_CLOUD,
        text: () => 'not valid json',
      },
    });

    await expect(
      executeHybridInference({
        prompt: 'Test',
        channel: 'sms',
        mode: InferenceMode.ONLY_IN_CLOUD,
      })
    ).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
  });
});

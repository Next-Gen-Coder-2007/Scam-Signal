import { describe, it, expect } from 'vitest';
import {
  executeHybridInference,
  ThreatResponseSchema,
  HybridAIError,
  InferenceMode,
  createPreferOnDeviceParams,
  createOnlyOnDeviceParams,
  createOnlyInCloudParams,
} from '../../src/services/ai/firebaseAILogic';

describe('Firebase AI Logic Hybrid Inference', () => {
  it('validates compliant structured AI responses via ThreatResponseSchema', () => {
    const validJson = {
      threatLevel: 'CRITICAL',
      confidenceScore: 94,
      threatCategories: ['IMPERSONATION', 'URGENCY'],
      tacticalIndicators: ['Unverified domain', 'Immediate threat of card suspension'],
      summary: 'SMS impersonating a banking institution to capture debit credentials.',
      recommendedActions: ['Block sender', 'Contact bank helpline'],
    };

    const validated = ThreatResponseSchema.parse(validJson);
    expect(validated.threatLevel).toBe('CRITICAL');
    expect(validated.confidenceScore).toBe(94);
  });

  it('rejects malformed threat responses missing required fields or invalid ranges', () => {
    const invalidJson = {
      threatLevel: 'INVALID_LEVEL',
      confidenceScore: 150,
      threatCategories: [],
      summary: 'Too short',
    };

    expect(() => ThreatResponseSchema.parse(invalidJson)).toThrow();
  });

  it('builds three distinct InferenceMode configurations', () => {
    const prefer = createPreferOnDeviceParams();
    expect(prefer.mode).toBe(InferenceMode.PREFER_ON_DEVICE);
    expect(prefer.inCloudParams).toBeDefined();
    expect(prefer.onDeviceParams).toBeDefined();

    const onlyDevice = createOnlyOnDeviceParams();
    expect(onlyDevice.mode).toBe(InferenceMode.ONLY_ON_DEVICE);
    expect(onlyDevice.onDeviceParams).toBeDefined();
    expect(onlyDevice.inCloudParams).toBeUndefined();

    const onlyCloud = createOnlyInCloudParams();
    expect(onlyCloud.mode).toBe(InferenceMode.ONLY_IN_CLOUD);
    expect(onlyCloud.inCloudParams).toBeDefined();
    expect(onlyCloud.onDeviceParams).toBeUndefined();
  });

  it('throws HybridAIError(FIREBASE_NOT_CONFIGURED) when Firebase is unconfigured', async () => {
    await expect(
      executeHybridInference({
        prompt: 'Your card is blocked. Click here.',
        channel: 'sms',
        mode: InferenceMode.PREFER_ON_DEVICE,
      })
    ).rejects.toMatchObject({
      name: 'HybridAIError',
      code: 'FIREBASE_NOT_CONFIGURED',
    } satisfies Partial<HybridAIError>);
  });
});

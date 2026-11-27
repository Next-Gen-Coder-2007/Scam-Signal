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
      riskLevel: 'CRITICAL',
      scamCategory: 'impersonation',
      manipulationPatterns: ['urgency', 'impersonation'],
      observedEvidence: ['"debit card has been temporarily suspended"', '"http://axis-secure-verify.xyz"'],
      indicators: [
        {
          pattern: 'urgency',
          observedEvidence: 'Verify identity immediately to prevent permanent block',
          explanation: 'Scammers create artificial time pressure so you act before checking with your bank.',
          verificationStep: 'Call the official customer care number printed on the back of your bank card.',
        },
      ],
      aiInterpretation: 'This message pretends to be your bank and pressures you to click a suspicious link.',
      recommendedActions: ['Do not click the link', 'Call the official number on your card'],
    };

    const validated = ThreatResponseSchema.parse(validJson);
    expect(validated.riskLevel).toBe('CRITICAL');
    expect(validated.scamCategory).toBe('impersonation');
    expect(validated.observedEvidence).toHaveLength(2);
    expect(validated.indicators[0].verificationStep).toContain('bank card');
  });

  it('rejects malformed threat responses missing required fields', () => {
    const invalidJson = {
      riskLevel: 'INVALID_LEVEL',
      scamCategory: 'unknown_category',
      manipulationPatterns: [],
      observedEvidence: [],
      indicators: [],
      aiInterpretation: 'Short',
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

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  runFirebaseAILogic,
  ThreatResponseSchema,
  hasOnDeviceAICapability,
} from '../../src/services/ai/firebaseAILogic';

describe('Firebase AI Logic Hybrid Inference', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('correctly validates compliant structured AI responses via ThreatResponseSchema', () => {
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
      confidenceScore: 150, // Out of range
      threatCategories: [], // Must have at least 1
      summary: 'Too short',
    };

    expect(() => ThreatResponseSchema.parse(invalidJson)).toThrow();
  });

  it('throws error when strict-on-device is requested without on-device AI capability', async () => {
    // Ensure window.ai is not available
    vi.stubGlobal('window', {});

    expect(hasOnDeviceAICapability()).toBe(false);

    await expect(
      runFirebaseAILogic({
        prompt: 'Your card is blocked. Click here.',
        channel: 'sms',
        preference: 'strict-on-device',
        allowCloudFallback: false,
      })
    ).rejects.toThrow(/Strict on-device inference requested, but local AI model/);
  });

  it('refuses execution when local AI is unavailable and cloud fallback is declined by user', async () => {
    vi.stubGlobal('window', {});

    await expect(
      runFirebaseAILogic({
        prompt: 'Claim your lottery prize.',
        channel: 'email',
        preference: 'on-device-preferred',
        allowCloudFallback: false,
      })
    ).rejects.toThrow(/On-device AI is not available in this browser and user declined/);
  });
});

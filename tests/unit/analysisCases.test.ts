import { describe, it, expect, vi, beforeEach } from 'vitest';
import { analyzeScamMessage } from '../../src/services/ai/scamAnalyzerService';
import { InferenceMode } from '../../src/services/ai/firebaseAILogic';
import { InferenceSource } from 'firebase/ai';

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

describe('ScamSignal Realistic Fictional Analysis Cases', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('handles legitimate messages as SAFE without false-positive fraud classification', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      response: {
        inferenceSource: InferenceSource.ON_DEVICE,
        text: () =>
          JSON.stringify({
            riskLevel: 'SAFE',
            scamCategory: 'legitimate_or_benign',
            manipulationPatterns: [],
            observedEvidence: [
              'dental checkup with Dr. Patel at Oakwood Clinic is scheduled for Thursday at 10:30 AM',
            ],
            indicators: [],
            aiInterpretation:
              'Routine clinic appointment reminder with no links, no credential requests, and no payment pressure.',
            recommendedActions: [
              'Confirm against your personal calendar or call Oakwood Clinic using their listed phone number.',
            ],
          }),
      },
    });

    const result = await analyzeScamMessage({
      rawContent:
        'Reminder: Your dental checkup with Dr. Patel at Oakwood Clinic is scheduled for Thursday at 10:30 AM.',
      channel: 'sms',
      mode: InferenceMode.PREFER_ON_DEVICE,
    });

    expect(result.riskLevel).toBe('SAFE');
    expect(result.scamCategory).toBe('legitimate_or_benign');
    expect(result.manipulationPatterns).toHaveLength(0);
    expect(result.indicators).toHaveLength(0);
    expect(result.inferenceSource).toBe('on_device');
  });

  it('detects obvious job scam with upfront payment, scrubs UPI PII, and returns verification steps', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      response: {
        inferenceSource: InferenceSource.IN_CLOUD,
        text: () =>
          JSON.stringify({
            riskLevel: 'CRITICAL',
            scamCategory: 'job_scam',
            manipulationPatterns: ['unrealistic_rewards', 'upfront_payment'],
            observedEvidence: [
              'Earn $300/day liking YouTube videos',
              'send a refundable $50 deposit',
            ],
            indicators: [
              {
                pattern: 'unrealistic_rewards',
                observedEvidence: 'Earn $300/day liking YouTube videos',
                explanation:
                  'Paying high daily wages for trivial video likes is a hallmark of task-scam recruitment.',
                verificationStep:
                  'Verify the recruiting company on LinkedIn or its official corporate website.',
              },
              {
                pattern: 'upfront_payment',
                observedEvidence: 'send a refundable $50 deposit',
                explanation:
                  'Legitimate employers never ask candidates to pay a deposit to unlock work portals.',
                verificationStep:
                  'Refuse any upfront fee request; do not transfer funds via UPI or wire.',
              },
            ],
            aiInterpretation:
              'Combines unrealistic income promises with an advance-fee payment demand.',
            recommendedActions: [
              'Do not send the $50 deposit.',
              'Block and report the sender.',
            ],
          }),
      },
    });

    const result = await analyzeScamMessage({
      rawContent:
        'Earn $300/day liking YouTube videos. Send a refundable $50 deposit to recruitment@okaxis.',
      channel: 'job_offer',
      mode: InferenceMode.PREFER_ON_DEVICE,
    });

    // Ensure PII was scrubbed before calling the model
    const sentPrompt = mockGenerateContent.mock.calls[0][0] as string;
    expect(sentPrompt).not.toContain('recruitment@okaxis');
    expect(sentPrompt).toContain('[REDACTED_UPI]');

    expect(result.riskLevel).toBe('CRITICAL');
    expect(result.scamCategory).toBe('job_scam');
    expect(result.indicators).toHaveLength(2);
    expect(result.indicators[1].verificationStep).toContain('Refuse any upfront fee');
  });

  it('treats ambiguous unfamiliar messages as UNKNOWN without assuming fraud', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      response: {
        inferenceSource: InferenceSource.ON_DEVICE,
        text: () =>
          JSON.stringify({
            riskLevel: 'UNKNOWN',
            scamCategory: 'ambiguous_unclear',
            manipulationPatterns: [],
            observedEvidence: ['review the updated schedule I sent over earlier this week'],
            indicators: [],
            aiInterpretation:
              'This message is brief and lacks context, but contains no links, payment requests, or manipulation tactics.',
            recommendedActions: [
              'Confirm who the sender is through a known phone number or email before replying.',
            ],
          }),
      },
    });

    const result = await analyzeScamMessage({
      rawContent:
        'Hi, did you get a chance to review the updated schedule I sent over earlier this week?',
      channel: 'whatsapp',
      mode: InferenceMode.PREFER_ON_DEVICE,
    });

    expect(result.riskLevel).toBe('UNKNOWN');
    expect(result.scamCategory).toBe('ambiguous_unclear');
    expect(result.recommendedActions[0]).toContain('Confirm who the sender is');
  });

  it('gracefully rejects incomplete or invalid JSON model responses', async () => {
    mockGenerateContent.mockResolvedValueOnce({
      response: {
        inferenceSource: InferenceSource.IN_CLOUD,
        text: () => '{"riskLevel": "HIGH", "scamCategory": "delivery_scam"',
      },
    });

    await expect(
      analyzeScamMessage({
        rawContent: 'Pay $2.95 customs fee at http://fake-track.top',
        channel: 'payment_request',
        mode: InferenceMode.PREFER_ON_DEVICE,
      })
    ).rejects.toMatchObject({
      name: 'HybridAIError',
      code: 'INVALID_RESPONSE',
    });
  });
});

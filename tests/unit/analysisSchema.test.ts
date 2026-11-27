import { describe, it, expect } from 'vitest';
import {
  parseAndValidateModelResponse,
  SCAM_CATEGORIES,
  MANIPULATION_PATTERNS,
} from '../../src/services/ai/analysisSchema';

describe('Structured Analysis Schema & Parser', () => {
  it('parses a complete obvious scam response wrapped in markdown fences', () => {
    const raw = `\`\`\`json
    {
      "riskLevel": "CRITICAL",
      "scamCategory": "job_scam",
      "manipulationPatterns": ["upfront_payment", "unrealistic_rewards"],
      "observedEvidence": [
        "Earn $300/day liking videos",
        "send a refundable $50 deposit to UPI"
      ],
      "indicators": [
        {
          "pattern": "unrealistic_rewards",
          "observedEvidence": "Earn $300/day liking videos",
          "explanation": "Legitimate employers do not pay high daily wages for simple social media clicks.",
          "verificationStep": "Search the company name independently on official job boards and verify their domain."
        },
        {
          "pattern": "upfront_payment",
          "observedEvidence": "send a refundable $50 deposit to UPI",
          "explanation": "Requiring an upfront fee to unlock a job portal is a classic advance-fee scam tactic.",
          "verificationStep": "Never send money to start a job; legitimate onboarding does not require deposits."
        }
      ],
      "aiInterpretation": "This message combines unrealistic pay promises with an upfront deposit demand, which strongly indicates a task-based job scam.",
      "recommendedActions": [
        "Do not send any money or UPI transfer.",
        "Stop replying and block the sender."
      ]
    }
    \`\`\``;

    const result = parseAndValidateModelResponse(raw);
    expect(result.riskLevel).toBe('CRITICAL');
    expect(result.scamCategory).toBe('job_scam');
    expect(result.indicators).toHaveLength(2);
    expect(SCAM_CATEGORIES).toContain(result.scamCategory);
    expect(MANIPULATION_PATTERNS).toContain(result.indicators[0].pattern);
  });

  it('accepts legitimate messages with SAFE riskLevel and empty indicators', () => {
    const raw = JSON.stringify({
      riskLevel: 'SAFE',
      scamCategory: 'legitimate_or_benign',
      manipulationPatterns: [],
      observedEvidence: ['Your dental appointment is confirmed for Tuesday at 10:00 AM.'],
      indicators: [],
      aiInterpretation:
        'This appears to be a routine appointment reminder with no links, no credential requests, and no urgency or payment pressure.',
      recommendedActions: [
        'No urgent action needed; verify against your personal calendar if unsure.',
      ],
    });

    const result = parseAndValidateModelResponse(raw);
    expect(result.riskLevel).toBe('SAFE');
    expect(result.scamCategory).toBe('legitimate_or_benign');
    expect(result.indicators).toHaveLength(0);
  });

  it('accepts ambiguous unfamiliar messages with UNKNOWN riskLevel', () => {
    const raw = JSON.stringify({
      riskLevel: 'UNKNOWN',
      scamCategory: 'ambiguous_unclear',
      manipulationPatterns: [],
      observedEvidence: ['Hey, did you get the file I sent earlier?'],
      indicators: [],
      aiInterpretation:
        'The message is brief and lacks context, but it does not contain links, payment demands, or manipulation tactics.',
      recommendedActions: [
        'Verify the sender through a known contact method before sharing any information.',
      ],
    });

    const result = parseAndValidateModelResponse(raw);
    expect(result.riskLevel).toBe('UNKNOWN');
    expect(result.scamCategory).toBe('ambiguous_unclear');
  });

  it('rejects CRITICAL/HIGH responses that lack explained indicators', () => {
    const incomplete = JSON.stringify({
      riskLevel: 'HIGH',
      scamCategory: 'phishing',
      manipulationPatterns: ['urgency'],
      observedEvidence: ['Click now'],
      indicators: [],
      aiInterpretation: 'Looks suspicious.',
      recommendedActions: ['Ignore it.'],
    });

    expect(() => parseAndValidateModelResponse(incomplete)).toThrow();
  });

  it('throws SyntaxError on empty or invalid JSON output', () => {
    expect(() => parseAndValidateModelResponse('')).toThrow(SyntaxError);
    expect(() => parseAndValidateModelResponse('{ "riskLevel": "HIGH", ')).toThrow(SyntaxError);
  });
});

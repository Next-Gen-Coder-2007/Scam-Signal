import { describe, it, expect } from 'vitest';
import { redactPII, containsPII, computePatternHash } from '../../src/utils/redactor';

describe('PII Redactor and Pattern Hasher', () => {
  it('scrubs international and standard phone numbers', () => {
    const raw = 'Urgent: call +1 (555) 234-5678 immediately or reach 9876543210.';
    const scrubbed = redactPII(raw);
    expect(scrubbed).not.toContain('+1 (555) 234-5678');
    expect(scrubbed).not.toContain('9876543210');
    expect(scrubbed).toContain('[REDACTED_PHONE]');
  });

  it('scrubs Indian mobile numbers and UPI handles', () => {
    const raw = 'Send 500 Rs deposit to recruitment@okaxis or call 9820112233.';
    const scrubbed = redactPII(raw);
    expect(scrubbed).not.toContain('recruitment@okaxis');
    expect(scrubbed).not.toContain('9820112233');
    expect(scrubbed).toContain('[REDACTED_UPI]');
    expect(scrubbed).toContain('[REDACTED_PHONE]');
  });

  it('scrubs credit card numbers and bank account numbers', () => {
    const raw = 'Card 4111 2222 3333 4444 on account no 1029384756 is suspended.';
    const scrubbed = redactPII(raw);
    expect(scrubbed).not.toContain('4111 2222 3333 4444');
    expect(scrubbed).not.toContain('1029384756');
    expect(scrubbed).toContain('[REDACTED_CARD]');
    expect(scrubbed).toContain('Account [REDACTED_ACCOUNT]');
  });

  it('scrubs sensitive OTP passcodes', () => {
    const raw = 'Your one-time passcode is: 482910. Do not share this OTP.';
    const scrubbed = redactPII(raw);
    expect(scrubbed).not.toContain('482910');
    expect(scrubbed).toContain('OTP [REDACTED_SECRET]');
  });

  it('correctly detects presence of PII via containsPII', () => {
    expect(containsPII('Reach me at support@bankfraud.xyz')).toBe(true);
    expect(containsPII('Your OTP is 9182')).toBe(true);
    expect(containsPII('Generic notification with clean content')).toBe(false);
  });

  it('computes identical deterministic hashes for structurally equivalent scams', async () => {
    const textA = 'URGENT: Your Axis card [REDACTED_CARD] is blocked. Click here to unlock.';
    const textB = 'urgent: your axis card [REDACTED_CARD] is blocked! click here to unlock...';
    const hashA = await computePatternHash(textA);
    const hashB = await computePatternHash(textB);
    expect(hashA).toEqual(hashB);
    expect(hashA.length).toBeGreaterThanOrEqual(16);
  });
});

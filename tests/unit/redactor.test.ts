import { describe, it, expect } from 'vitest';
import {
  redactPII,
  inspectAndRedactPII,
  containsPII,
  computePatternHash,
} from '../../src/utils/redactor';

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

  it('scrubs street and apartment physical addresses', () => {
    const raw =
      'Courier delivery failed at 742 Evergreen Terrace, Apt 4B and Flat 12, Oakwood Plaza. Update now.';
    const scrubbed = redactPII(raw);
    expect(scrubbed).not.toContain('Flat 12');
    expect(scrubbed).toContain('[REDACTED_ADDRESS]');

    const streetRaw = 'Package waiting at 125 Market Street, Suite 200.';
    const streetScrubbed = redactPII(streetRaw);
    expect(streetScrubbed).not.toContain('125 Market Street');
    expect(streetScrubbed).toContain('[REDACTED_ADDRESS]');
  });

  it('scrubs contextual personal names without over-redacting generic words', () => {
    const raw = 'Dear John Smith, I am Sarah Jenkins from HR. Regards, Priya.';
    const scrubbed = redactPII(raw);
    expect(scrubbed).not.toContain('John Smith');
    expect(scrubbed).not.toContain('Sarah Jenkins');
    expect(scrubbed).not.toContain('Priya');
    expect(scrubbed).toContain('Dear [REDACTED_NAME]');
    expect(scrubbed).toContain('I am [REDACTED_NAME]');
    expect(scrubbed).toContain('Regards, [REDACTED_NAME]');
  });

  it('scrubs sensitive URL query parameters like tokens and OTPs', () => {
    const raw = 'Verify at https://example-login.top/auth?token=abc123secret&otp=991822';
    const scrubbed = redactPII(raw);
    expect(scrubbed).not.toContain('abc123secret');
    expect(scrubbed).not.toContain('991822');
    expect(scrubbed).toContain('token=[REDACTED_TOKEN]');
    expect(scrubbed).toContain('otp=[REDACTED_TOKEN]');
  });

  it('provides accurate redaction counts via inspectAndRedactPII', () => {
    const raw =
      'Hi Alex Rivera, send $50 to pay@okaxis or email scammer@fraud.xyz from 100 Pine Road.';
    const inspection = inspectAndRedactPII(raw);
    expect(inspection.hasRemainingPII).toBe(false);
    expect(inspection.redactions.length).toBeGreaterThanOrEqual(4);
    expect(inspection.redactedText).not.toContain('Alex Rivera');
    expect(inspection.redactedText).not.toContain('pay@okaxis');
    expect(inspection.redactedText).not.toContain('scammer@fraud.xyz');
    expect(inspection.redactedText).not.toContain('100 Pine Road');
  });

  it('correctly detects presence of PII via containsPII', () => {
    expect(containsPII('Reach me at support@bankfraud.xyz')).toBe(true);
    expect(containsPII('Your OTP is 9182')).toBe(true);
    expect(containsPII('Deliver to 450 Oak Avenue')).toBe(true);
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

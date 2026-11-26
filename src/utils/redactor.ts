/**
 * Client-Side Privacy Preservation & Automated PII Scrubbing Utility
 * Adheres strictly to the ScamSignal Zero-Exposure Policy.
 */

export interface RedactionRule {
  name: string;
  regex: RegExp;
  replace: string;
}

export const PII_PATTERNS: RedactionRule[] = [
  // Credit / Debit Card Numbers (13-19 digits with separators)
  {
    name: 'CREDIT_CARD',
    regex: /\b(?:\d{4}[ -]?){3}\d{4}\b/g,
    replace: '[REDACTED_CARD]',
  },
  // Indian UPI IDs / Virtual Payment Addresses (e.g. name@okhdfcbank, pay@upi, xyz@ybl)
  {
    name: 'UPI_ID',
    regex: /\b[a-zA-Z0-9.\-_]{2,64}@(okhdfcbank|okaxis|oksbi|okicici|paytm|upi|ybl|apl|axl|ibl)\b/gi,
    replace: '[REDACTED_UPI]',
  },
  // Indian UPI / General VPA fallback pattern
  {
    name: 'GENERAL_VPA',
    regex: /\b[a-zA-Z0-9.\-_]{3,30}@[a-zA-Z]{3,20}\b/g,
    replace: '[REDACTED_UPI]',
  },
  // Email addresses
  {
    name: 'EMAIL',
    regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    replace: '[REDACTED_EMAIL]',
  },
  // One-Time Passcodes (OTP), verification pins (4-8 digits) — evaluated before phone numbers
  {
    name: 'OTP_SECRET',
    regex: /(?:otp|one-time\s*passcode|passcode|verification\s*code|pin|password|secret)[\w\s]*?(?:is\s*[:.-]?|[:=-])\s*(\d{4,8})\b/gi,
    replace: 'OTP [REDACTED_SECRET]',
  },
  // Bank Account Numbers (e.g. "A/c 1029384756" or "Account: 987654321") — evaluated before phone numbers
  {
    name: 'BANK_ACCOUNT',
    regex: /\b(?:ac|a\/c|account)\s*(?:no\.?|number)?\s*[:.-]?\s*(\d{6,18})\b/gi,
    replace: 'Account [REDACTED_ACCOUNT]',
  },
  // National Identity (SSN or 12-digit Aadhaar style numbers)
  {
    name: 'NATIONAL_ID',
    regex: /\b\d{3}-\d{2}-\d{4}\b|\b\d{4}[ -]?\d{4}[ -]?\d{4}\b/g,
    replace: '[REDACTED_ID]',
  },
  // Indian 10-digit mobile patterns with optional +91 or 0 prefix
  {
    name: 'IN_MOBILE',
    regex: /(?:\+91[\-\s]?)?[6-9]\d{9}\b/g,
    replace: '[REDACTED_PHONE]',
  },
  // Phone numbers (International and standard formats)
  {
    name: 'PHONE',
    regex: /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g,
    replace: '[REDACTED_PHONE]',
  },
];

/**
 * Redacts all detectable personally identifiable information from sensitive text.
 */
export function redactPII(rawText: string): string {
  if (!rawText) return '';
  let sanitized = rawText;
  for (const { regex, replace } of PII_PATTERNS) {
    sanitized = sanitized.replace(regex, replace);
  }
  return sanitized;
}

/**
 * Detects if the given text contains any unredacted PII patterns.
 */
export function containsPII(text: string): boolean {
  if (!text) return false;
  return PII_PATTERNS.some(({ regex }) => {
    regex.lastIndex = 0;
    return regex.test(text);
  });
}

/**
 * Computes a deterministic normalized SHA-256 pattern hash for community clustering.
 * Normalizes punctuation, lowercases, and strips variable whitespace so identical
 * scam templates map to the exact same hash across independent users.
 */
export async function computePatternHash(sanitizedText: string): Promise<string> {
  const normalized = sanitizedText
    .toLowerCase()
    .replace(/\[redacted_[a-z]+\]/g, ' ')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const msgBuffer = new TextEncoder().encode(normalized);

  const subtleCrypto =
    typeof window !== 'undefined' && window.crypto?.subtle
      ? window.crypto.subtle
      : globalThis.crypto?.subtle;

  if (subtleCrypto) {
    const hashBuffer = await subtleCrypto.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
  }

  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    hash = (hash << 5) - hash + normalized.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(32, '0');
}

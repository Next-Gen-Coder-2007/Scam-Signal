/**
 * Client-Side Privacy Preservation & Automated PII Scrubbing Service
 * Identifies and redacts sensitive personal details before any community submission.
 * Note: Client-side regex redaction is a best-effort safeguard; users must always
 * review and manually edit the redacted text before sharing.
 */

export interface RedactionRule {
  name: string;
  label: string;
  regex: RegExp;
  replace: string;
}

export interface RedactionSummaryItem {
  name: string;
  label: string;
  count: number;
}

export interface RedactionInspectionResult {
  redactedText: string;
  redactions: RedactionSummaryItem[];
  hasRemainingPII: boolean;
}

export const PII_PATTERNS: RedactionRule[] = [
  // Sensitive URL query parameters (tokens, OTPs, session IDs, keys)
  {
    name: 'SENSITIVE_QUERY_PARAM',
    label: 'Sensitive URL Parameter',
    regex: /([?&](?:token|auth|session|sid|key|otp|code|password|pwd)=)[^&\s]+/gi,
    replace: '$1[REDACTED_TOKEN]',
  },
  // Credit / Debit Card Numbers (13-19 digits with spaces or dashes)
  {
    name: 'CREDIT_CARD',
    label: 'Card Number',
    regex: /\b(?:\d{4}[ -]?){3}\d{4}\b/g,
    replace: '[REDACTED_CARD]',
  },
  // Indian UPI IDs / Virtual Payment Addresses (e.g. name@okhdfcbank, pay@upi, xyz@ybl)
  {
    name: 'UPI_ID',
    label: 'UPI Identifier',
    regex: /\b[a-zA-Z0-9.\-_]{2,64}@(okhdfcbank|okaxis|oksbi|okicici|paytm|upi|ybl|apl|axl|ibl|sbi|hdfcbank|icici)\b/gi,
    replace: '[REDACTED_UPI]',
  },
  // Email addresses (evaluated before general VPA so .com/.org domains are tagged as EMAIL)
  {
    name: 'EMAIL',
    label: 'Email Address',
    regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    replace: '[REDACTED_EMAIL]',
  },
  // General VPA fallback (no dot in handle)
  {
    name: 'GENERAL_VPA',
    label: 'UPI / Payment Handle',
    regex: /\b[a-zA-Z0-9.\-_]{3,30}@[a-zA-Z]{3,20}\b/g,
    replace: '[REDACTED_UPI]',
  },
  // One-Time Passcodes (OTP), verification pins (4-8 digits) — evaluated before phone numbers
  {
    name: 'OTP_SECRET',
    label: 'OTP / Passcode',
    regex: /(?:otp|one-time\s*passcode|passcode|verification\s*code|pin|password|secret)[\w\s]*?(?:is\s*[:.-]?|[:=-])\s*(\d{4,8})\b/gi,
    replace: 'OTP [REDACTED_SECRET]',
  },
  // Bank Account Numbers / IBAN / IFSC
  {
    name: 'BANK_ACCOUNT',
    label: 'Account Number',
    regex: /\b(?:ac|a\/c|account)\s*(?:no\.?|number)?\s*[:.-]?\s*(\d{6,18})\b|\b[A-Z]{2}\d{2}[A-Z0-9]{11,30}\b/gi,
    replace: 'Account [REDACTED_ACCOUNT]',
  },
  // National Identity (SSN or 12-digit Aadhaar style numbers)
  {
    name: 'NATIONAL_ID',
    label: 'National ID',
    regex: /\b\d{3}-\d{2}-\d{4}\b|\b\d{4}[ -]?\d{4}[ -]?\d{4}\b/g,
    replace: '[REDACTED_ID]',
  },
  // Physical / Street Addresses (e.g. "123 Main Street", "45B Oakwood Ave, Apt 4", "Flat 12,MG Road")
  {
    name: 'PHYSICAL_ADDRESS',
    label: 'Street / Physical Address',
    regex: /\b\d{1,5}[A-Za-z]?\s+[A-Z][A-Za-z0-9.\-']+(?:\s+[A-Z]?[A-Za-z0-9.\-']+){0,3}\s+(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Lane|Ln|Drive|Dr|Court|Ct|Way|Parkway|Pkwy|Circle|Cir|Square|Sq)\b(?:\s*,?\s*(?:Apt|Apartment|Suite|Ste|Unit|Flat|Floor|Fl)\s*#?[A-Za-z0-9\-]+)?/gi,
    replace: '[REDACTED_ADDRESS]',
  },
  // Apartment / Flat / House prefix addresses
  {
    name: 'UNIT_ADDRESS',
    label: 'Apartment / Unit Address',
    regex: /\b(?:Flat|Apt|Apartment|House|Plot|Door)\s*(?:No\.?|#)?\s*\d+[A-Za-z]?(?:\s*,\s*[A-Za-z0-9\s.\-]{3,40})?\b/gi,
    replace: '[REDACTED_ADDRESS]',
  },
  // Contextual Personal Names (greetings, self-introductions, sign-offs)
  {
    name: 'PERSONAL_NAME',
    label: 'Personal Name',
    regex: /\b((?:Dear|Hi|Hello|Attn|Regards|Sincerely|Thanks|From|Mr\.|Ms\.|Mrs\.|Dr\.)(?:,\s*|\s+))([A-Z][a-z]{1,20}(?:\s+[A-Z][a-z]{1,20})?)\b/g,
    replace: '$1[REDACTED_NAME]',
  },
  {
    name: 'SELF_INTRO_NAME',
    label: 'Personal Name',
    regex: /\b(I\s+am\s+|My\s+name\s+is\s+|This\s+is\s+)([A-Z][a-z]{1,20}(?:\s+[A-Z][a-z]{1,20})?)\b/g,
    replace: '$1[REDACTED_NAME]',
  },
  // Indian 10-digit mobile patterns with optional +91 prefix
  {
    name: 'IN_MOBILE',
    label: 'Phone Number',
    regex: /(?:\+91[\-\s]?)?[6-9]\d{9}\b/g,
    replace: '[REDACTED_PHONE]',
  },
  // Phone numbers (International and standard formats)
  {
    name: 'PHONE',
    label: 'Phone Number',
    regex: /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g,
    replace: '[REDACTED_PHONE]',
  },
];

/**
 * Redacts detectable personally identifiable information from sensitive text.
 */
export function redactPII(rawText: string): string {
  if (!rawText) return '';
  let sanitized = rawText;
  for (const { regex, replace } of PII_PATTERNS) {
    regex.lastIndex = 0;
    sanitized = sanitized.replace(regex, replace);
  }
  return sanitized;
}

/**
 * Runs redaction and returns a breakdown of what sensitive categories were scrubbed.
 */
export function inspectAndRedactPII(rawText: string): RedactionInspectionResult {
  if (!rawText) {
    return {
      redactedText: '',
      redactions: [],
      hasRemainingPII: false,
    };
  }

  let sanitized = rawText;
  const counts = new Map<string, RedactionSummaryItem>();

  for (const rule of PII_PATTERNS) {
    rule.regex.lastIndex = 0;
    const matches = sanitized.match(rule.regex);
    if (matches && matches.length > 0) {
      const existing = counts.get(rule.label);
      if (existing) {
        existing.count += matches.length;
      } else {
        counts.set(rule.label, {
          name: rule.name,
          label: rule.label,
          count: matches.length,
        });
      }
      rule.regex.lastIndex = 0;
      sanitized = sanitized.replace(rule.regex, rule.replace);
    }
  }

  return {
    redactedText: sanitized,
    redactions: Array.from(counts.values()),
    hasRemainingPII: containsPII(sanitized),
  };
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
 * Computes a deterministic normalized SHA-256 pattern digest for grouping
 * structurally similar *already-redacted* scam templates.
 * Note: Hashing is used strictly for deterministic pattern grouping, NOT as a
 * substitute for PII removal or guaranteed anonymization.
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

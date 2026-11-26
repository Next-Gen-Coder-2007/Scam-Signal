---
name: privacy-security
description: Privacy preservation, automated PII scrubbing, input validation, role security, and ethical AI safeguards for ScamSignal.
---

# Privacy & Security Standards for ScamSignal

ScamSignal operates on sensitive, adversarial, and intimate user communications (SMS, phishing emails, banking alerts, call transcripts). Privacy preservation and robust threat modeling are non-negotiable foundations of the platform.

---

## 1. Zero-Exposure Policy for Private Data

1. **No Raw Messages in Public Collections**:
   - The `public_threats` collection must NEVER contain raw user input, actual phone numbers, email addresses, recipient names, bank account numbers, credit card sequences, OTP codes, or unredacted screenshot media.
2. **Client-Side Redaction Pipeline**:
   - Before any text leaves the user's device or is shared to the community feed, it must pass through an automated PII redactor.
   - The user must be shown a side-by-side diff preview of what is being shared vs what is stripped.
3. **Advisory Warning Notice**:
   - Every AI assessment is an automated estimate, not legal or financial truth. The UI must always display:
     > *"Advisory Notice: ScamSignal AI evaluations provide risk intelligence and pattern matching. Verify independently with official institutions before taking financial or legal action."*

---

## 2. PII Redaction Implementation

```typescript
// src/utils/redactor.ts

const PII_PATTERNS = [
  // Phone numbers (international and local formats)
  { regex: /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g, replace: '[REDACTED_PHONE]' },
  // Email addresses
  { regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, replace: '[REDACTED_EMAIL]' },
  // Credit / Debit Card Numbers (13-19 digits with separators)
  { regex: /\b(?:\d{4}[ -]?){3}\d{4}\b/g, replace: '[REDACTED_CARD]' },
  // Indian UPI IDs / VPA (e.g. name@okhdfcbank)
  { regex: /[a-zA-Z0-9.\-_]{2,256}@[a-zA-Z]{2,64}/g, replace: '[REDACTED_UPI]' },
  // SSN / Aadhaar / National Identity Numbers (e.g., 4-digit groups)
  { regex: /\b\d{4}[ -]?\d{4}[ -]?\d{4}\b/g, replace: '[REDACTED_ID]' },
  // One-time passcodes / OTPs (e.g., "OTP is 482910")
  { regex: /\b(?:otp|code|pin|password|passcode)\s*(?:is|:)?\s*(\d{4,8})\b/gi, replace: 'OTP [REDACTED_SECRET]' },
  // Monetary Account numbers (e.g. "A/c ending in 4920")
  { regex: /\b(?:ac|a\/c|account)\s*(?:no|number)?\s*[:.]?\s*(\d{6,18})\b/gi, replace: 'Account [REDACTED_ACCOUNT]' },
];

/**
 * Strips identifiable personally identifiable information from scam communication.
 */
export function redactPII(text: string): string {
  let sanitized = text;
  for (const { regex, replace } of PII_PATTERNS) {
    sanitized = sanitized.replace(regex, replace);
  }
  return sanitized;
}

/**
 * Computes deterministic normalized hash for safe community campaign grouping.
 */
export async function computePatternHash(sanitizedText: string): Promise<string> {
  const normalized = sanitizedText
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s]/g, '')
    .trim();

  const msgBuffer = new TextEncoder().encode(normalized);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
}
```

---

## 3. Threat Modeling & Access Control

| Threat Vector | Mitigation Strategy | Enforcement Layer |
|---|---|---|
| Malicious user posts fake verified threat | User input validated via Zod; verification flag cannot be set by user | Firestore Security Rules & Server Validation |
| Leaked personal phone number in report | Automated client-side regex scrubber + user review screen | `src/utils/redactor.ts` & React Redaction Modal |
| Adversarial prompt injection in scam text | Strict JSON output schema; sanitize prompt inputs; isolate model context | Firebase AI Logic System Prompts |
| Tampering with community upvotes or flags | Server-side increment rules; rate-limited user claims | Firestore Security Rules & App Check |
| Automated bot submissions | Firebase App Check token verification on submission API | App Check Client & Backend Handler |

---

## 4. Privacy & Security Checklist

- [ ] Does `public_threats` contain only sanitized, redacted text?
- [ ] Is raw user input scrubbed on-device prior to any cloud transmission?
- [ ] Is deterministic hashing (`computePatternHash`) used for campaign grouping rather than raw content matching?
- [ ] Are all admin routes and operations guarded by verified claims in Firebase Auth tokens?
- [ ] Are all user inputs constrained by strict size limits and Zod schemas?
- [ ] Is an advisory disclaimer displayed prominently alongside all AI scam scores?

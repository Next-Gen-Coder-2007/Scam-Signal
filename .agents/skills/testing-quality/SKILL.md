---
name: testing-quality
description: Verification protocols, automated testing standards, TypeScript typechecks, linting, and build validation for ScamSignal.
---

# Testing & Quality Assurance for ScamSignal

Every feature, service, and data pipeline in ScamSignal must be validated through rigorous type safety, unit tests, integration scenarios, and failure-mode checks before considered done.

---

## 1. Testing Philosophy

1. **No Untested Claims**: Never declare that a feature or service is functional without executing its test suite or verifying its output directly.
2. **Failure-First Verification**: Every critical flow (e.g. AI fallback, offline mode, PII scrubbing, network failure) must have test coverage for its unhappy path.
3. **Continuous Verification Chain**:
   ```bash
   npm run typecheck && npm run lint && npm test && npm run build
   ```

---

## 2. Test Pyramid & Tooling

- **Unit & Logic Testing**: Vitest + React Testing Library (fast execution, ESM native).
- **Type Checking**: TypeScript Compiler (`tsc --noEmit`).
- **Linter & Style**: ESLint (Flat config) + Prettier.
- **Mocking**: Mock Firebase Auth & Firestore using lightweight in-memory fixtures or Vitest mocks.

---

## 3. High-Priority Test Suites

### A. PII Redaction Unit Test (`tests/unit/redactor.test.ts`)
```typescript
import { describe, it, expect } from 'vitest';
import { redactPII, computePatternHash } from '../../src/utils/redactor';

describe('redactPII utility', () => {
  it('scrubs international phone numbers', () => {
    const input = 'Call our fraud line immediately at +1 (555) 234-5678 or 9876543210.';
    const result = redactPII(input);
    expect(result).not.toContain('+1 (555) 234-5678');
    expect(result).not.toContain('9876543210');
    expect(result).toContain('[REDACTED_PHONE]');
  });

  it('scrubs credit card sequences and bank account numbers', () => {
    const input = 'Your card 4111 2222 3333 4444 and account 1029384756 have been locked.';
    const result = redactPII(input);
    expect(result).not.toContain('4111 2222 3333 4444');
    expect(result).toContain('[REDACTED_CARD]');
    expect(result).toContain('Account [REDACTED_ACCOUNT]');
  });

  it('produces identical pattern hashes for matching text structures', async () => {
    const text1 = 'URGENT: Your account was suspended! Click here http://scam.me';
    const text2 = 'urgent: your account was suspended! click here http://scam.me';
    const hash1 = await computePatternHash(text1);
    const hash2 = await computePatternHash(text2);
    expect(hash1).toEqual(hash2);
  });
});
```

### B. AI Logic Fallback Scenario Test (`tests/unit/firebaseAILogic.test.ts`)
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runFirebaseAILogic } from '../../src/services/ai/firebaseAILogic';

describe('runFirebaseAILogic execution modes', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('throws an error if strict-on-device is requested but local AI is unavailable', async () => {
    // Ensure window.ai is undefined
    vi.stubGlobal('window', {});

    await expect(
      runFirebaseAILogic({
        prompt: 'You won 1,000,000 dollars! Claim now.',
        channel: 'sms',
        preference: 'strict-on-device',
        allowCloudFallback: false,
      })
    ).rejects.toThrow(/On-device AI model is not available/);
  });
});
```

---

## 4. Quality Verification Commands

Before concluding any major milestone, execute and verify:

1. **Type Check**:
   ```powershell
   npx tsc --noEmit
   ```
2. **Unit Tests**:
   ```powershell
   npx vitest run
   ```
3. **Production Build**:
   ```powershell
   npm run build
   ```

---

## 5. Testing & Quality Checklist

- [ ] Do TypeScript typechecks pass without errors or suppressions?
- [ ] Are PII redactor patterns verified against realistic scam text samples?
- [ ] Are Firebase AI Logic fallbacks verified for both on-device and cloud paths?
- [ ] Are empty, loading, and error states visually or programmatically tested?
- [ ] Does the production build succeed with clean bundle outputs?

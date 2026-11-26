import { describe, it, expect } from 'vitest';
import {
  validateAnalyzerInput,
  MIN_MESSAGE_LENGTH,
  MAX_MESSAGE_LENGTH,
} from '../../src/utils/validation';

describe('Analyzer Input Validation', () => {
  it('rejects empty or whitespace-only input', () => {
    const res = validateAnalyzerInput('   \n  ');
    expect(res.valid).toBe(false);
    expect(res.error).toContain('Please paste');
  });

  it('rejects input shorter than MIN_MESSAGE_LENGTH', () => {
    const res = validateAnalyzerInput('Hi there');
    expect(res.valid).toBe(false);
    expect(res.error).toContain(`${MIN_MESSAGE_LENGTH} characters`);
  });

  it('rejects input exceeding MAX_MESSAGE_LENGTH', () => {
    const oversized = 'A'.repeat(MAX_MESSAGE_LENGTH + 1);
    const res = validateAnalyzerInput(oversized);
    expect(res.valid).toBe(false);
    expect(res.error).toContain('character limit');
  });

  it('accepts valid message within character limits', () => {
    const res = validateAnalyzerInput(
      'URGENT: Your bank account has been locked. Verify at http://fake-bank.xyz'
    );
    expect(res.valid).toBe(true);
    expect(res.error).toBeNull();
  });
});

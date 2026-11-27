import { describe, it, expect } from 'vitest';
import {
  normalizeDomain,
  extractNormalizedDomains,
  normalizePhrase,
  buildCanonicalDnaSignature,
} from '../../src/services/dna/scamDnaNormalizer';
import { extractDeterministicDna } from '../../src/services/dna/deterministicDnaExtractor';
import { parseAndValidateScamDnaAiResponse } from '../../src/services/dna/scamDnaSchema';

describe('Scam DNA Normalizer', () => {
  it('normalizes URLs and domains consistently while ignoring redaction placeholders', () => {
    expect(normalizeDomain('HTTPS://WWW.Verify-Bank-Login.XYZ/kyc?id=123')).toBe(
      'verify-bank-login.xyz'
    );
    expect(normalizeDomain('http://secure-pay.top:8443/login')).toBe('secure-pay.top');
    expect(normalizeDomain('[REDACTED_URL]')).toBeNull();
    expect(normalizeDomain('abc')).toBeNull();

    const domains = extractNormalizedDomains(
      'Visit https://www.Verify-Bank.xyz/login or http://verify-bank.xyz:8080/home and [REDACTED_URL]'
    );
    expect(domains).toEqual(['verify-bank.xyz']);
  });

  it('normalizes phrases and builds identical canonical signatures regardless of input order', () => {
    expect(normalizePhrase('  Verify   Your Account!! ')).toBe('verify your account');

    const sigA = buildCanonicalDnaSignature({
      scamCategory: 'phishing',
      claimedOrganizationType: 'bank_financial',
      requestedAction: 'click_external_link',
      paymentMechanism: 'none_detected',
      urgencyPatterns: ['countdown_deadline', 'account_suspension_threat'],
      impersonationIndicators: ['generic_greeting', 'official_brand_claim'],
      suspiciousDomains: ['b.xyz', 'a.xyz'],
      recurringPhrases: ['within 24 hours', 'verify your account'],
    });

    const sigB = buildCanonicalDnaSignature({
      scamCategory: 'phishing',
      claimedOrganizationType: 'bank_financial',
      requestedAction: 'click_external_link',
      paymentMechanism: 'none_detected',
      urgencyPatterns: ['account_suspension_threat', 'countdown_deadline'],
      impersonationIndicators: ['official_brand_claim', 'generic_greeting'],
      suspiciousDomains: ['a.xyz', 'b.xyz'],
      recurringPhrases: ['verify your account', 'within 24 hours'],
    });

    expect(sigA).toBe(sigB);
  });
});

describe('Deterministic Scam DNA Extractor', () => {
  it('extracts bank phishing indicators and lookalike domains', () => {
    const result = extractDeterministicDna({
      sanitizedText:
        'Dear Customer, your bank KYC expired and your account will be suspended within 24 hours. Click the link below to verify your account at https://www.secure-kyc-update.xyz/portal',
      channel: 'sms',
    });

    expect(result.observed.claimedOrganizationTypes).toContain('bank_financial');
    expect(result.observed.requestedActions).toContain('share_otp_or_credentials');
    expect(result.observed.requestedActions).toContain('click_external_link');
    expect(result.observed.urgencyPatterns).toEqual([
      'account_suspension_threat',
      'countdown_deadline',
    ]);
    expect(result.observed.impersonationIndicators).toContain('generic_greeting');
    expect(result.observed.impersonationIndicators).toContain('domain_lookalike_or_mismatch');
    expect(result.observed.suspiciousDomains).toEqual(['secure-kyc-update.xyz']);
    expect(result.observed.recurringPhrases).toContain('verify your account');
    expect(result.observed.recurringPhrases).toContain('within 24 hours');
    expect(result.fallbackCategory).toBe('phishing');
  });

  it('extracts UPI and job scam indicators without inventing missing domains', () => {
    const upiScam = extractDeterministicDna({
      sanitizedText:
        'Part-time remote job offer! Pay processing fee of 500 via UPI [REDACTED_UPI] or scan the QR code now.',
      channel: 'whatsapp',
    });

    expect(upiScam.observed.claimedOrganizationTypes).toContain('employer_recruiter');
    expect(upiScam.observed.paymentMechanisms).toContain('upi');
    expect(upiScam.observed.requestedActions).toContain('scan_qr_or_upi');
    expect(upiScam.observed.requestedActions).toContain('send_money_or_fee');
    expect(upiScam.observed.suspiciousDomains).toEqual([]);
    expect(upiScam.fallbackCategory).toBe('job_scam');
  });

  it('validates input and rejects malformed AI JSON responses', () => {
    expect(() => extractDeterministicDna({ sanitizedText: 'hi' })).toThrow();
    expect(() => parseAndValidateScamDnaAiResponse('')).toThrow(SyntaxError);
    expect(() => parseAndValidateScamDnaAiResponse('{"scamCategory":"not_real"}')).toThrow();
  });
});

import { describe, it, expect } from 'vitest';
import { extractScamDna } from '../../src/services/dna/scamDnaService';
import {
  correlateReportPair,
  correlateReportsIntoCampaigns,
} from '../../src/services/campaigns/campaignCorrelationEngine';
import { isSpecificRecurringPhrase } from '../../src/services/campaigns/correlationRules';

describe('Campaign Correlation Engine (True Matches, False Matches, Ambiguous Reports)', () => {
  it('TRUE MATCH: correlates reports sharing a suspicious domain and bank phishing indicators', async () => {
    const dna1 = await extractScamDna(
      {
        sanitizedText:
          'Dear Customer, your bank KYC expired. Click https://www.verify-bank-kyc.xyz/login within 24 hours to verify your account.',
        channel: 'sms',
      },
      { useAi: false }
    );
    const dna2 = await extractScamDna(
      {
        sanitizedText:
          'Alert from Bank: your account will be suspended! Visit http://verify-bank-kyc.xyz/step1 to verify your account.',
        channel: 'whatsapp',
      },
      { useAi: false }
    );

    const pair = correlateReportPair(
      { reportId: 'rep-1', dna: dna1 },
      { reportId: 'rep-2', dna: dna2 }
    );

    expect(pair.matched).toBe(true);
    expect(pair.score).toBeGreaterThanOrEqual(0.4);
    expect(pair.supportingIndicators.some((i) => i.type === 'shared_domain')).toBe(true);
    expect(pair.explanation).toContain('verify-bank-kyc.xyz');

    const clusters = correlateReportsIntoCampaigns([
      { reportId: 'rep-1', dna: dna1 },
      { reportId: 'rep-2', dna: dna2 },
    ]);

    expect(clusters).toHaveLength(1);
    expect(clusters[0].verificationStatus).toBe('unverified');
    expect(clusters[0].status).toBe('CANDIDATE');
    expect(clusters[0].reportIds).toEqual(['rep-1', 'rep-2']);
    expect(clusters[0].links).toHaveLength(1);
  });

  it('TRUE MATCH: correlates reports via tokenized payment identifiers and contact tokens', async () => {
    const dna1 = await extractScamDna(
      { sanitizedText: 'Pay registration fee via UPI [REDACTED_UPI] today.', channel: 'whatsapp' },
      { useAi: false }
    );
    const dna2 = await extractScamDna(
      { sanitizedText: 'Send handling fee to [REDACTED_UPI] to unlock bonus.', channel: 'sms' },
      { useAi: false }
    );

    const pair = correlateReportPair(
      {
        reportId: 'rep-pay-1',
        dna: dna1,
        paymentIdentifiers: ['upi_hash_9a8b7c'],
        contactTokens: ['phone_hash_112233'],
      },
      {
        reportId: 'rep-pay-2',
        dna: dna2,
        paymentIdentifiers: ['upi_hash_9a8b7c'],
        contactTokens: ['phone_hash_112233'],
      }
    );

    expect(pair.matched).toBe(true);
    expect(pair.supportingIndicators.map((i) => i.type)).toContain(
      'matching_payment_identifier'
    );
    expect(pair.supportingIndicators.map((i) => i.type)).toContain('repeated_contact_detail');
  });

  it('FALSE MATCH: does NOT group reports based only on generic words like "urgent" or "payment"', async () => {
    expect(isSpecificRecurringPhrase('urgent')).toBe(false);
    expect(isSpecificRecurringPhrase('payment')).toBe(false);
    expect(isSpecificRecurringPhrase('urgent payment')).toBe(false);

    const dna1 = await extractScamDna(
      {
        sanitizedText: 'Urgent notice: please make your electricity bill payment soon.',
        channel: 'sms',
      },
      { useAi: false }
    );
    const dna2 = await extractScamDna(
      {
        sanitizedText: 'Urgent: complete payment for your online marketplace order.',
        channel: 'email',
      },
      { useAi: false }
    );

    const pair = correlateReportPair(
      { reportId: 'rep-false-1', dna: dna1 },
      { reportId: 'rep-false-2', dna: dna2 }
    );

    expect(pair.matched).toBe(false);
    expect(
      correlateReportsIntoCampaigns([
        { reportId: 'rep-false-1', dna: dna1 },
        { reportId: 'rep-false-2', dna: dna2 },
      ])
    ).toEqual([]);
  });

  it('AMBIGUOUS REPORTS: rejects single weak indicator overlaps below correlation threshold', async () => {
    const ambig1 = await extractScamDna(
      { sanitizedText: 'Please check this message and click the link.', channel: 'sms' },
      { useAi: false }
    );
    const ambig2 = await extractScamDna(
      { sanitizedText: 'Click the link for more details.', channel: 'email' },
      { useAi: false }
    );

    const pair = correlateReportPair(
      { reportId: 'rep-amb-1', dna: ambig1 },
      { reportId: 'rep-amb-2', dna: ambig2 }
    );

    expect(pair.matched).toBe(false);
    expect(pair.score).toBeLessThan(0.4);
    expect(pair.rejectionReason).toBe('BELOW_CORRELATION_THRESHOLD');
  });

  it('never automatically marks any correlated campaign as verified even for 3+ reports', async () => {
    const makeReport = async (id: string, text: string) => ({
      reportId: id,
      dna: await extractScamDna({ sanitizedText: text, channel: 'sms' }, { useAi: false }),
    });

    const reports = await Promise.all([
      makeReport('r1', 'Bank alert: verify your account at https://bad-bank-login.xyz'),
      makeReport('r2', 'Bank warning: verify your account at https://bad-bank-login.xyz'),
      makeReport('r3', 'Bank notice: verify your account at https://bad-bank-login.xyz'),
    ]);

    const clusters = correlateReportsIntoCampaigns(reports);
    expect(clusters).toHaveLength(1);
    expect(clusters[0].totalReports).toBe(3);
    expect(clusters[0].status).toBe('ACTIVE_WAVE');
    expect(clusters[0].verificationStatus).toBe('unverified');
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockExecuteSafetyActionInference = vi.fn();
let mockIsConfigured = true;

vi.mock('../../src/services/firebase/firebaseApp', () => ({
  get firebaseStatus() {
    return { isConfigured: mockIsConfigured, missingKeys: [], appCheckEnabled: false };
  },
  ai: {},
  db: {},
  auth: {},
}));

vi.mock('../../src/services/ai/firebaseAILogic', () => ({
  executeSafetyActionInference: (...args: unknown[]) =>
    mockExecuteSafetyActionInference(...args),
}));

import { getSafetyActionGuidance } from '../../src/services/safety/safetyActionService';
import {
  MANDATORY_BOUNDARY_NOTICE,
  SAFETY_SCENARIOS,
  resolveOfficialResources,
} from '../../src/services/safety/safetyActionSchema';

describe('Safety Action Assistant Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsConfigured = true;
  });

  it('provides grounded deterministic playbooks for all 5 scenarios without promising recovery', async () => {
    for (const scenario of SAFETY_SCENARIOS) {
      const res = await getSafetyActionGuidance(
        { scenario, region: 'IN' },
        { useAi: false }
      );
      expect(res.generalGuidance.immediateSteps.length).toBeGreaterThanOrEqual(2);
      expect(res.generalGuidance.verificationChecklist.length).toBeGreaterThanOrEqual(1);
      expect(res.generalGuidance.whatNotToDo.length).toBeGreaterThanOrEqual(1);
      expect(res.verifiedOfficialResources.length).toBeGreaterThanOrEqual(1);
      expect(
        res.verifiedOfficialResources.every((r) => r.isVerifiedOfficialResource === true)
      ).toBe(true);
      expect(res.boundaryNotice).toBe(MANDATORY_BOUNDARY_NOTICE);
      expect(res.boundaryNotice).toContain('cannot promise payment recovery');
      expect(res.boundaryNotice).toContain('investigate or reverse transactions');
    }
  });

  it('includes India bank/payment contact, cybercrime.gov.in, and helpline 1930 for financial cyber fraud', async () => {
    const res = await getSafetyActionGuidance(
      { scenario: 'transferred_money', region: 'IN' },
      { useAi: false }
    );

    const combinedSteps = res.generalGuidance.immediateSteps.join(' ').toLowerCase();
    expect(combinedSteps).toContain('bank or payment provider');
    expect(combinedSteps).toContain('cybercrime.gov.in');
    expect(combinedSteps).toContain('1930');

    const resourceUrlsAndHelplines = res.verifiedOfficialResources.map(
      (r) => r.url || r.helpline || r.id
    );
    expect(resourceUrlsAndHelplines).toContain('https://cybercrime.gov.in');
    expect(resourceUrlsAndHelplines).toContain('1930');
    expect(resourceUrlsAndHelplines).toContain('official-bank-channels');
  });

  it('uses Firebase AI Logic when configured, resolves only verified resources, and falls back safely on error', async () => {
    mockExecuteSafetyActionInference.mockResolvedValueOnce({
      immediateSteps: [
        'Contact your bank immediately via the official app or card helpline.',
        'File a financial cyber fraud report at cybercrime.gov.in or call 1930.',
      ],
      verificationChecklist: ['Keep UTR/transaction ID ready for the bank and portal.'],
      whatNotToDo: ['Do not pay any recovery agent promising guaranteed refunds.'],
      officialResourceIds: ['in-helpline-1930', 'in-cybercrime-portal', 'unverified-fake-id'],
      source: 'on_device',
    });

    const aiRes = await getSafetyActionGuidance({
      scenario: 'transferred_money',
      region: 'IN',
      userQuestion: 'I sent money via UPI 10 minutes ago',
    });

    expect(aiRes.isAiAssisted).toBe(true);
    expect(aiRes.inferenceSource).toBe('on_device');
    expect(aiRes.verifiedOfficialResources.map((r) => r.id)).toEqual([
      'in-helpline-1930',
      'in-cybercrime-portal',
    ]);
    expect(aiRes.boundaryNotice).toBe(MANDATORY_BOUNDARY_NOTICE);

    // Fallback when AI throws
    mockExecuteSafetyActionInference.mockRejectedValueOnce(new Error('Model unavailable'));
    const fallbackRes = await getSafetyActionGuidance({
      scenario: 'verify_job_offer',
      region: 'GLOBAL',
    });
    expect(fallbackRes.isAiAssisted).toBe(false);
    expect(fallbackRes.inferenceSource).toBe('unknown');
    expect(resolveOfficialResources(['unknown'], 'GLOBAL').length).toBeGreaterThan(0);
  });
});

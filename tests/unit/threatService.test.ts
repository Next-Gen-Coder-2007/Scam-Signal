import { describe, it, expect } from 'vitest';
import {
  fetchPublicThreats,
  fetchCommunityReports,
  submitPublicThreat,
  submitPendingReport,
  fetchCampaigns,
} from '../../src/services/firestore/threatService';
import { FirebaseNotConfiguredError } from '../../src/services/firebase/authService';

describe('Firestore Threat & Report Services (Unconfigured Safety)', () => {
  it('throws FirebaseNotConfiguredError on read and write operations when Firebase is unconfigured', async () => {
    await expect(fetchPublicThreats()).rejects.toThrow(FirebaseNotConfiguredError);
    await expect(fetchCommunityReports()).rejects.toThrow(FirebaseNotConfiguredError);
    await expect(fetchCampaigns()).rejects.toThrow(FirebaseNotConfiguredError);
    await expect(
      submitPublicThreat({
        reporterUid: 'user-1',
        rawContent: 'Suspicious SMS test',
        threatLevel: 'HIGH',
        threatCategories: ['IMPERSONATION'],
        tacticalIndicators: ['Urgent link'],
        inferenceSource: 'on_device',
        channel: 'sms',
      })
    ).rejects.toThrow(FirebaseNotConfiguredError);
    await expect(
      submitPendingReport({
        reporterUid: 'user-1',
        rawContent: 'Suspicious SMS test',
        category: 'phishing',
        indicators: ['urgency'],
        evidence: ['"Click now"'],
        riskAssessment: 'HIGH',
        observedDate: '2026-11-27',
        visibility: 'community_public',
        inferenceSource: 'on_device',
        channel: 'sms',
      })
    ).rejects.toThrow(FirebaseNotConfiguredError);
  });
});

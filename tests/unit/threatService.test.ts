import { describe, it, expect } from 'vitest';
import {
  fetchPublicThreats,
  submitPublicThreat,
  fetchCampaigns,
} from '../../src/services/firestore/threatService';
import { FirebaseNotConfiguredError } from '../../src/services/firebase/authService';

describe('Firestore Threat Service (Unconfigured Safety)', () => {
  it('throws FirebaseNotConfiguredError on read and write operations when Firebase is unconfigured', async () => {
    await expect(fetchPublicThreats()).rejects.toThrow(FirebaseNotConfiguredError);
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
  });
});

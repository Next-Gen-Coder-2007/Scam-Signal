import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Firestore Security Rules Invariants', () => {
  const rulesPath = path.resolve(process.cwd(), 'firestore.rules');
  const rules = fs.readFileSync(rulesPath, 'utf-8');

  it('separates pending_reports from verified campaigns', () => {
    expect(rules).toContain('match /pending_reports/{reportId}');
    expect(rules).toContain('match /campaigns/{campaignId}');
  });

  it('prevents users from assigning verified status or linking campaigns on create', () => {
    expect(rules).toContain("request.resource.data.verificationStatus == 'pending'");
    expect(rules).toContain('request.resource.data.campaignId == null');
  });

  it('enforces server timestamp, ownership, and admin-only updates on pending_reports', () => {
    expect(rules).toContain('request.resource.data.reporterUid == request.auth.uid');
    expect(rules).toContain('request.resource.data.createdAt == request.time');
    expect(rules).toContain('allow update: if isAdmin();');
  });

  it('restricts analysts_only reports from public reading', () => {
    expect(rules).toContain("resource.data.visibility == 'community_public'");
    expect(rules).toContain('isOwner(resource.data.reporterUid)');
  });
});

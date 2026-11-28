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

  it('enforces single-per-user corroboration IDs and admin-only dispute moderation', () => {
    expect(rules).toContain('match /campaign_confirmations/{confirmationId}');
    expect(rules).toContain('match /campaign_disputes/{disputeId}');
    expect(rules).toContain("confirmationId == (request.resource.data.campaignId + '_' + request.auth.uid)");
    expect(rules).toContain("request.resource.data.moderationStatus == 'open'");
    expect(rules).toContain('allow update: if false;');
  });

  it('protects user alert_states subcollection with owner-only read/write rules', () => {
    expect(rules).toContain('match /alert_states/{alertId}');
    expect(rules).toContain('allow read, write: if isOwner(userId);');
  });

  it('prevents admin escalation via user profile fields and locks audit logs to admin read-only', () => {
    expect(rules).toContain("!request.resource.data.keys().hasAny(['isAdmin', 'role', 'admin'])");
    expect(rules).toContain('match /moderation_audit_logs/{logId}');
    expect(rules).toContain('allow read: if isAdmin();');
    expect(rules).toContain('match /{document=**}');
  });
});

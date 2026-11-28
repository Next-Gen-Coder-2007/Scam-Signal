/**
 * Seed realistic, PII-scrubbed threat intelligence data into Cloud Firestore
 * for ScamSignal demos, screenshots, and video walkthroughs.
 *
 * Usage:
 *   1. Download a Firebase Service Account JSON from:
 *      Firebase Console -> Project Settings -> Service accounts -> Generate new private key
 *   2. Save it in the project root as `service-account.json` (gitignored)
 *      OR set GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json
 *   3. Run: node scripts/seedFirestore.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(path.resolve(process.cwd(), 'functions', 'package.json'));
const adminApp = require('firebase-admin/app');
const adminFirestore = require('firebase-admin/firestore');

const { initializeApp, cert, applicationDefault } = adminApp;
const { getFirestore, FieldValue } = adminFirestore;

const PROJECT_ID = 'scamsignal-373bc';

function initAdmin() {
  const candidatePaths = [
    process.env.GOOGLE_APPLICATION_CREDENTIALS,
    path.resolve(process.cwd(), 'service-account.json'),
    path.resolve(process.cwd(), 'scripts', 'service-account.json'),
  ].filter(Boolean);

  for (const keyPath of candidatePaths) {
    if (fs.existsSync(keyPath)) {
      const key = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
      initializeApp({ credential: cert(key), projectId: key.project_id || PROJECT_ID });
      return;
    }
  }

  console.error('\n[Seed Error] No Firebase Service Account key found.');
  console.error('Download one from Firebase Console -> Project Settings -> Service accounts -> Generate new private key');
  console.error('Save it as `service-account.json` in the project root (it is gitignored), then re-run:\n');
  console.error('  node scripts/seedFirestore.mjs\n');
  process.exit(1);
}

function daysAgoDateString(daysAgo) {
  const d = new Date(Date.now() - daysAgo * 86400 * 1000);
  return d.toISOString().slice(0, 10);
}

async function seed() {
  initAdmin();
  const db = getFirestore();
  const now = FieldValue.serverTimestamp();

  const campaigns = [
    {
      id: 'camp_bank_kyc_wave',
      name: 'Bank KYC Suspension SMS Wave',
      threatType: 'BANK_IMPERSONATION',
      totalSignals: 14,
      corroboratedHashes: ['hash_kyc_sms_01', 'hash_kyc_sms_02'],
      status: 'ACTIVE_WAVE',
      indicators: [
        'urgent-kyc-deadline',
        'masked-short-url',
        'account-freeze-threat',
        'spoofed-sender-header',
      ],
    },
    {
      id: 'camp_parcel_customs',
      name: 'Customs & Parcel Redelivery Fee Phishing',
      threatType: 'DELIVERY_SCAM',
      totalSignals: 9,
      corroboratedHashes: ['hash_parcel_01', 'hash_parcel_02'],
      status: 'ACTIVE_WAVE',
      indicators: [
        'customs-clearance-fee',
        'shortened-tracking-url',
        '24h-return-threat',
      ],
    },
    {
      id: 'camp_hr_task_fraud',
      name: 'Telegram Prepaid Task & Crypto Job Lure',
      threatType: 'JOB_OFFER_FRAUD',
      totalSignals: 7,
      corroboratedHashes: ['hash_job_01'],
      status: 'MONITORING',
      indicators: [
        'telegram-recruiter-handoff',
        'guaranteed-daily-payout',
        'prepaid-merchant-task',
      ],
    },
    {
      id: 'camp_upi_refund',
      name: 'Fake Support UPI Collect PIN Trap',
      threatType: 'PAYMENT_FRAUD',
      totalSignals: 5,
      corroboratedHashes: ['hash_upi_01'],
      status: 'CONTAINED',
      indicators: [
        'upi-collect-pin-trap',
        'qr-refund-lure',
        'impersonated-support-agent',
      ],
    },
  ];

  console.log('Seeding campaigns...');
  for (const camp of campaigns) {
    const { id, ...data } = camp;
    await db.collection('campaigns').doc(id).set({
      ...data,
      createdAt: now,
      updatedAt: now,
    }, { merge: true });
  }

  const reports = [
    {
      id: 'rep_demo_kyc_01',
      reporterUid: 'seed_analyst_01',
      redactedSummary:
        'Dear customer, your [REDACTED_BANK] account will be suspended within 24 hours due to incomplete KYC. Update immediately at [REDACTED_URL] to avoid permanent block.',
      category: 'BANK_IMPERSONATION',
      indicators: ['urgent-kyc-deadline', 'masked-short-url', 'account-freeze-threat'],
      evidence: ['24-hour account suspension ultimatum', 'Unofficial shortened verification URL'],
      riskAssessment: 'HIGH',
      observedDate: daysAgoDateString(0),
      visibility: 'community_public',
      channel: 'sms',
      inferenceSource: 'on_device',
      normalizedPatternHash: 'hash_kyc_sms_01',
      verificationStatus: 'verified',
      campaignId: 'camp_bank_kyc_wave',
    },
    {
      id: 'rep_demo_kyc_02',
      reporterUid: 'seed_analyst_02',
      redactedSummary:
        'ALERT: Your netbanking PAN verification expired today. Click [REDACTED_URL] and enter OTP [REDACTED_OTP] to keep [REDACTED_ACCOUNT] active.',
      category: 'BANK_IMPERSONATION',
      indicators: ['urgent-kyc-deadline', 'otp-harvesting', 'spoofed-sender-header'],
      evidence: ['Requests OTP via external web link', 'Artificial same-day deadline pressure'],
      riskAssessment: 'CRITICAL',
      observedDate: daysAgoDateString(1),
      visibility: 'community_public',
      channel: 'sms',
      inferenceSource: 'in_cloud',
      normalizedPatternHash: 'hash_kyc_sms_02',
      verificationStatus: 'verified',
      campaignId: 'camp_bank_kyc_wave',
    },
    {
      id: 'rep_demo_parcel_01',
      reporterUid: 'seed_analyst_03',
      redactedSummary:
        'Your international parcel [REDACTED_ID] is held at customs. Pay a clearance fee of $2.99 at [REDACTED_URL] within 12 hours or it will be returned to sender.',
      category: 'DELIVERY_SCAM',
      indicators: ['customs-clearance-fee', 'shortened-tracking-url', '24h-return-threat'],
      evidence: ['Small upfront fee lure to harvest card details', 'Non-carrier domain link'],
      riskAssessment: 'HIGH',
      observedDate: daysAgoDateString(1),
      visibility: 'community_public',
      channel: 'sms',
      inferenceSource: 'on_device',
      normalizedPatternHash: 'hash_parcel_01',
      verificationStatus: 'verified',
      campaignId: 'camp_parcel_customs',
    },
    {
      id: 'rep_demo_job_01',
      reporterUid: 'seed_analyst_04',
      redactedSummary:
        'Hi! I am [REDACTED_NAME] from [REDACTED_COMPANY] HR. Earn $150-$400/day liking videos and completing merchant ratings. Message [REDACTED_HANDLE] on Telegram to start.',
      category: 'JOB_OFFER_FRAUD',
      indicators: ['telegram-recruiter-handoff', 'guaranteed-daily-payout', 'prepaid-merchant-task'],
      evidence: ['Unsolicited WhatsApp outreach moving to Telegram', 'Unrealistic daily payout claim'],
      riskAssessment: 'HIGH',
      observedDate: daysAgoDateString(2),
      visibility: 'community_public',
      channel: 'whatsapp',
      inferenceSource: 'in_cloud',
      normalizedPatternHash: 'hash_job_01',
      verificationStatus: 'verified',
      campaignId: 'camp_hr_task_fraud',
    },
    {
      id: 'rep_demo_upi_01',
      reporterUid: 'seed_analyst_05',
      redactedSummary:
        'Customer care agent asked me to approve a $199 collect request and enter my PIN to receive a failed order refund for [REDACTED_ORDER].',
      category: 'PAYMENT_FRAUD',
      indicators: ['upi-collect-pin-trap', 'impersonated-support-agent'],
      evidence: ['Claims PIN entry is required to receive money', 'Inbound collect request'],
      riskAssessment: 'CRITICAL',
      observedDate: daysAgoDateString(3),
      visibility: 'community_public',
      channel: 'call',
      inferenceSource: 'on_device',
      normalizedPatternHash: 'hash_upi_01',
      verificationStatus: 'verified',
      campaignId: 'camp_upi_refund',
    },
    {
      id: 'rep_demo_pending_01',
      reporterUid: 'seed_analyst_06',
      redactedSummary:
        'Security notice from [REDACTED_EMAIL]: Unusual sign-in detected on your cloud wallet. Verify recovery phrase at [REDACTED_URL] immediately.',
      category: 'PHISHING_CREDENTIAL',
      indicators: ['seed-phrase-harvesting', 'account-takeover-urgency'],
      evidence: ['Asks for wallet recovery phrase', 'Sender domain mismatch'],
      riskAssessment: 'CRITICAL',
      observedDate: daysAgoDateString(0),
      visibility: 'community_public',
      channel: 'email',
      inferenceSource: 'in_cloud',
      normalizedPatternHash: 'hash_wallet_pending_01',
      verificationStatus: 'pending',
      campaignId: null,
    },
  ];

  console.log('Seeding pending_reports...');
  for (const rep of reports) {
    const { id, ...data } = rep;
    await db.collection('pending_reports').doc(id).set({
      ...data,
      createdAt: now,
    }, { merge: true });
  }

  const links = [
    {
      id: 'link_kyc_01',
      reportId: 'rep_demo_kyc_01',
      campaignId: 'camp_bank_kyc_wave',
      correlationScore: 0.94,
      status: 'confirmed',
      verificationStatus: 'verified',
      supportingIndicators: ['urgent-kyc-deadline', 'masked-short-url', 'account-freeze-threat'],
      explanation: 'Shares identical 24h KYC freeze urgency and masked short-URL lure.',
    },
    {
      id: 'link_kyc_02',
      reportId: 'rep_demo_kyc_02',
      correlationScore: 0.91,
      status: 'confirmed',
      verificationStatus: 'verified',
      supportingIndicators: ['urgent-kyc-deadline', 'spoofed-sender-header'],
      explanation: 'Matches bank KYC expiration template with OTP harvesting redirect.',
    },
    {
      id: 'link_parcel_01',
      reportId: 'rep_demo_parcel_01',
      correlationScore: 0.89,
      status: 'confirmed',
      verificationStatus: 'verified',
      supportingIndicators: ['customs-clearance-fee', 'shortened-tracking-url'],
      explanation: 'Uses micro-fee customs lure and shortened tracking link.',
    },
  ];

  console.log('Seeding report_campaign_links...');
  for (const link of links) {
    const { id, ...data } = link;
    await db.collection('report_campaign_links').doc(id).set({
      ...data,
      createdAt: now,
      updatedAt: now,
    }, { merge: true });
  }

  const analyses = [
    {
      id: 'camp_bank_kyc_wave',
      campaignId: 'camp_bank_kyc_wave',
      deterministicSummary: {
        status: 'ACTIVE_WAVE',
        verificationStatus: 'unverified',
        totalReports: 14,
        supportingIndicators: ['urgent-kyc-deadline', 'masked-short-url', 'account-freeze-threat'],
        linkCount: 2,
      },
      sharedIndicatorsSummary:
        'Reports consistently combine artificial 24-hour KYC suspension deadlines with masked URL shorteners to harvest banking credentials and OTPs.',
      relationshipExplanation:
        'Cross-report clustering shows identical urgency framing and credential-capture landing flow across SMS submissions.',
      inconsistencies: ['Impersonated bank names vary across regional waves.'],
      evidenceToReview: [
        'Verify whether landing domains share registrar or hosting ASN.',
        'Confirm sender header spoofing patterns across telecom reports.',
      ],
      referencedReportIds: ['rep_demo_kyc_01', 'rep_demo_kyc_02'],
      inferenceSource: 'in_cloud',
      modelIdentifier: 'gemini-2.5-flash',
    },
    {
      id: 'camp_parcel_customs',
      campaignId: 'camp_parcel_customs',
      deterministicSummary: {
        status: 'ACTIVE_WAVE',
        verificationStatus: 'unverified',
        totalReports: 9,
        supportingIndicators: ['customs-clearance-fee', 'shortened-tracking-url', '24h-return-threat'],
        linkCount: 1,
      },
      sharedIndicatorsSummary:
        'Targets recipients with low-dollar ($2-$4) customs redelivery fee prompts designed to capture payment card details.',
      relationshipExplanation:
        'Correlated via recurring customs-hold pretext, 12-24h return ultimatum, and non-carrier tracking links.',
      inconsistencies: [],
      evidenceToReview: ['Check shortened URL redirect targets for shared phishing kit templates.'],
      referencedReportIds: ['rep_demo_parcel_01'],
      inferenceSource: 'in_cloud',
      modelIdentifier: 'gemini-2.5-flash',
    },
  ];

  console.log('Seeding campaign_analyses...');
  for (const analysis of analyses) {
    const { id, ...data } = analysis;
    await db.collection('campaign_analyses').doc(id).set({
      ...data,
      createdAt: now,
      updatedAt: now,
    }, { merge: true });
  }

  console.log('\nSeed complete! Added 4 campaigns, 6 reports, 3 campaign links, and 2 campaign analyses.');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});

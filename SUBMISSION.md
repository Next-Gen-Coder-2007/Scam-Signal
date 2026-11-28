# ScamSignal — #BuildHybridAI 2026 Submission Package

## Project Description

### The Problem
Everyday users are targeted by increasingly convincing scams over SMS, WhatsApp, email, job offers, and payment requests. These messages routinely contain sensitive personal information—phone numbers, email addresses, bank/UPI identifiers, one-time passwords (OTPs), and home addresses. Existing cloud-only scam checkers force users to upload private messages to remote servers, while informal community groups spread unverified accusations, expose victims' personal data, or invent false links between unrelated incidents.

### What ScamSignal Delivers
**ScamSignal** ("Detect individually. Protect collectively.") is a privacy-first, hybrid-AI scam triage and collective threat intelligence platform built with React 19, TypeScript, Vite, Tailwind CSS, Firebase, and **Firebase AI Logic**.

- **Privacy-First Triage (`/`)**: Every pasted message is scrubbed client-side (`redactPII`) before any AI inference runs. No raw personal messages are automatically saved to Firestore or sent to cloud models.
- **Real On-Device Inference & Transparent Cloud Fallback**: Uses the official `firebase/ai` Web SDK (`InferenceMode.PREFER_ON_DEVICE`, `ONLY_ON_DEVICE`, and `ONLY_IN_CLOUD`) and captures `response.inferenceSource` truthfully at runtime (`on_device`, `in_cloud`, or `unknown`) so users always know where analysis ran.
- **Explicit Consent & Human-Reviewed Community Reporting (`/feed`)**: Users can preview and edit the redacted summary before voluntarily submitting an observation. Unverified user reports are strictly separated from verified warnings and campaigns.
- **Scam DNA & Evidence-Based Campaign Matching (`/campaigns`, `/campaigns/:campaignId`)**: Converts sanitized reports into normalized Scam DNA signatures and correlates reports using transparent deterministic weights (shared domains, tokenized payment/contact handles, impersonated organization types, requested actions, and specific recurring phrases—never grouping on generic words like `"urgent"` or `"payment"`).
- **Collective Campaign Analysis (`ONLY_IN_CLOUD`)**: Summarizes shared indicators, inconsistencies, and next-step review items across approved, sanitized signatures without inventing unsupported relationships.
- **Dashboard, Scam Radar, Safety Action Assistant, Alerts & Server-Verified Admin Console**: Complete cybersecurity intelligence workflow including `/dashboard`, `/radar`, `/safety` (with India `cybercrime.gov.in` & helpline `1930` guidance), `/alerts`, and `/admin` backed by Firebase Cloud Functions v2 checking `request.auth.token.admin === true` with immutable `moderation_audit_logs`.

---

## YouTube Demo Script (Under 3 Minutes — Target: 2:45)

> **Setup Note**: Use a real configured Firebase project in `.env` and a Chrome browser with Gemini Nano enabled (or show the real `in_cloud` fallback honestly if local model download is unavailable). Use only fictional test data.

- **[0:00 – 0:25] Hook & Privacy-First Architecture**
  - *Visual*: Open ScamSignal `/` (`Private Analyzer`), highlight the `Zero-PII` and `InferenceBadge` indicators.
  - *Narration*: "Every day, people receive suspicious internship and payment messages packed with personal details. ScamSignal is a hybrid-AI scam intelligence platform built on Firebase AI Logic: it analyzes messages locally first, scrubs PII before anything leaves the device, and connects verified patterns into community protection."

- **[0:25 – 1:10] Fictional Suspicious Internship Message & Real Local-First Analysis**
  - *Visual*: Select channel `job_offer` and paste a fictional suspicious internship message:
    `"Congratulations! You are shortlisted for a remote Data Analyst internship at Apex Tech. Pay a refundable Rs. 1,500 onboarding & laptop verification fee via UPI intern-desk@okaxis or visit https://apextech-intern-verify.xyz within 24 hours. Contact HR at +91 9876543210."`
  - Click **Analyze**.
  - *Visual*: Point to the live runtime `InferenceSource` badge (`On-Device` via Gemini Nano, or `Cloud Fallback` if `in_cloud` was returned by the SDK), qualitative risk level (`HIGH`), `job_scam` category, separated `Observed Evidence` vs. `AI Interpretation`, and practical verification steps.
  - *Narration*: "Notice ScamSignal never fabricates percentage confidence or hides where inference ran—this badge reflects the exact `inferenceSource` returned by Firebase AI Logic."

- **[1:10 – 1:50] Redaction Preview & Explicitly Approved Community Report**
  - *Visual*: Click **Share Redacted Signal with Community**. Show `RedactionPreviewModal` with `+91 9876543210` and `intern-desk@okaxis` scrubbed to `[REDACTED_PHONE]` and `[REDACTED_UPI]`. Review visibility (`community_public`), check the explicit consent checkbox, and submit.
  - *Visual*: Navigate to `/feed` (`Community Reports`), showing the newly submitted report clearly labeled **Unverified User Report** (never auto-verified).
  - *Narration*: "Nothing is ever auto-published. Users inspect the scrubbed text and give explicit consent, and new reports remain marked unverified until reviewed."

- **[1:50 – 2:30] Evidence-Based Campaign Matching & Community Protection**
  - *Visual*: Open `/campaigns` (`Campaign Intelligence`) and click into a correlated campaign (`/campaigns/:campaignId`).
  - *Visual*: Show the responsive `CampaignRelationshipGraph`, click a connected report node to inspect `supportingIndicators` (`shared_domain`, `matching_impersonated_org`, `similar_requested_action`) and deterministic score, then scroll to **Community Corroboration** and **Collective AI Explanation (`ONLY_IN_CLOUD`)**.
  - *Visual*: Briefly show `/safety` (`Safety Action Assistant` with `Verify a Suspicious Job Offer` + India `1930` / `cybercrime.gov.in` resources) and `/admin` (`Administrative Moderation Console` gated by server-side `admin: true` claims and audit logs).
  - *Narration*: "Campaigns are linked strictly by deterministic evidence—never generic words—and protected by server-verified moderation. Detect individually, protect collectively."

- **[2:30 – 2:45] Closing**
  - *Visual*: Return to `/dashboard` (`Intelligence Dashboard`) showing real Firestore metrics.
  - *Narration*: "ScamSignal is open-source under Apache 2.0. Check out the repository and live deployment in the description."

---

## Final Verification Checklist

### Verified Locally in This Workspace
- [x] **Open-Source License**: Apache 2.0 [LICENSE](./LICENSE) present in repository root.
- [x] **Comprehensive Documentation**: [README.md](./README.md) with problem statement, features, Mermaid architecture diagram, hybrid inference table, setup, and limitations.
- [x] **Secret Hygiene**: `.env` is excluded in `.gitignore`; `.env.example` contains zero secrets.
- [x] **Firebase AI Logic Integration**: Official `firebase/ai` SDK (`PREFER_ON_DEVICE`, `ONLY_ON_DEVICE`, `ONLY_IN_CLOUD`) capturing runtime `response.inferenceSource`.
- [x] **TypeScript Check (`npm run typecheck`)**: Passed (`tsc --noEmit`, 0 errors).
- [x] **Automated Tests (`npm run test`)**: Passed (31 test files, 120 tests with mocked Firebase SDKs).
- [x] **Production Build (`npm run build`)**: Passed (`tsc && vite build`).

### Remaining Manual Submission Steps (Requires User Credentials / Accounts)
- [ ] **Push Public Repository**: Push local `main` commits to your public GitHub repository (`git push origin main`) and verify public visibility.
- [ ] **Populate Real `.env` & Enable Firebase Services**: Copy `.env.example` to `.env` with your Firebase project credentials; enable Authentication, Cloud Firestore, App Check (reCAPTCHA v3), and Firebase AI Logic in the Firebase Console.
- [ ] **Deploy Rules, Hosting & Functions**: Run `npm run build`, `firebase deploy --only firestore:rules,hosting`, and (for `/admin`) deploy `functions/` and assign `{ admin: true }` custom claims via Admin SDK.
- [ ] **Verify Live Hosted URL**: Test the live hosted URL end-to-end (authentication, real on-device/cloud inference source, redaction preview, report submission, and campaign inspection).
- [ ] **Record & Upload Demo Video**: Record the <= 3-minute YouTube walkthrough using the script above and attach the public repository URL, hosted URL, and video link to the `#BuildHybridAI 2026` submission form.

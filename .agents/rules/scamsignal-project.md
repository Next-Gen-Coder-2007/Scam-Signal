# ScamSignal — Project Constraints & Permanent Rules

## 1. Identity & Purpose
- **Product Name**: ScamSignal
- **Tagline**: Detect individually. Protect collectively.
- **Mission**: Privacy-first, community-powered scam intelligence platform for the #BuildHybridAI 2026 hackathon.

## 2. Core Tech Stack
- **Frontend Framework**: React 19 + TypeScript (Strict Mode) + Vite.
- **Styling**: Tailwind CSS (clean utility-first styling with dark/cyber-threat visual palette).
- **Icons**: Lucide React.
- **Backend Services**: Firebase (Auth, Cloud Firestore, Cloud Functions, App Check).
- **AI Engine**: Firebase AI Logic exclusively.
- **Primary Database**: Cloud Firestore with typed data converters and defensive schema validations.

## 3. Hybrid AI & Privacy Architecture
- **Local-First Analysis**: Private scam message/call/URL/screenshot evaluation occurs on-device first via Firebase AI Logic whenever on-device models (e.g. Gemini Nano) are available.
- **Cloud AI Restrictions**: Cloud AI models receive only data that is appropriate for cloud processing and explicitly opted-in / consented to by the user, or pre-redacted/sanitized and safely aggregated.
- **No Raw Message Storage**: Never store raw user private messages, phone numbers, email addresses, personal names, banking details, or unredacted screenshots in public collections or default cloud logs.
- **Inference Transparency**: The UI and data layers must expose the actual runtime inference source returned by Firebase AI Logic (`on-device` vs `cloud` vs `hybrid-fallback`). Never simulate or fake local inference.
- **Advisory Status**: All AI outputs, risk scores, and tactical warnings are advisory intelligence, never certified judicial or legal facts.

## 4. Community Intelligence & Campaigns
- **Deterministic Evidence Matching**: Never invent or hallucinate scam statistics, reports, campaign clusters, or verification status. Cluster potential scam campaigns strictly using deterministic matching rules (e.g., normalized cryptographic hashes of sanitized scam patterns, matching payment addresses/UPI IDs, exact phone number regex patterns, verified domain WHOIS/TLD heuristics) prior to linking.
- **Verified Status Integrity**: Prevent regular users from assigning themselves or their submissions "verified campaign" or "confirmed threat" status. Such status is reserved for multi-evidence corroboration or administrator validation.

## 5. Engineering Pragmatism (Solo Developer & Hackathon Scope)
- **Lean Architecture**: Keep the implementation straightforward, robust, and manageable for a solo developer within tight hackathon deadlines.
- **Minimal Dependencies**: Strictly avoid bloated libraries, redundant state management frameworks, unnecessary microservices, or complex external infrastructure.
- **Feature Preservation**: When fixing issues or adding features, preserve existing working functionality and verified tests.
- **Real Implementations Only**: Never replace real Firebase AI Logic calls with mocked responses or hardcoded timeouts in the final deliverable.

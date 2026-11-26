---
name: product-engineering
description: Product thinking, user journeys, responsive UX, tactical feedback, and operational clarity guidelines for ScamSignal.
---

# Product Engineering Guidelines for ScamSignal

A great security tool must be intuitive, compassionate, and actionable. Users reporting scams are frequently anxious, frustrated, or in the middle of an urgent threat. Product engineering in ScamSignal means designing every screen to build user confidence and immediate safety.

---

## 1. User Journey & Core Personas

### Persona 1: The Threatened User (Urgent Triage)
- **State of mind**: Anxious, unsure if an incoming message/call is real, afraid of losing money.
- **Goal**: Rapidly paste or upload a suspicious message, get a definitive answer in seconds, and know exactly what to do next.
- **Product Requirement**:
  - Instant paste input with 1-click triage.
  - Giant clear threat badge (`CRITICAL`, `SUSPICIOUS`, `SAFE`).
  - Actionable immediate advice ("Do NOT tap the link", "Hang up now").
  - Clear reassurance that their input stayed private on their device.

### Persona 2: The Community Guardian (Threat Reporting)
- **State of mind**: Has identified a scam, wants to protect others, values privacy.
- **Goal**: Redact personal data and contribute the scam signature to the community network.
- **Product Requirement**:
  - Transparent redaction preview.
  - 1-click submission to public threat database.
  - Feedback showing community impact (e.g. "3 other users in your region reported this pattern").

### Persona 3: The Security Analyst / Hackathon Evaluator
- **State of mind**: Technical, assessing system architecture, hybrid AI capabilities, and data fidelity.
- **Goal**: Inspect campaign clusters, examine the AI inference source badge, verify on-device Gemini Nano execution, and review deterministic correlation.
- **Product Requirement**:
  - Transparent telemetry toggles.
  - Campaign correlation explorer.
  - Verifiable evidence badges.

---

## 2. Screen & Workflow Standards

| Screen | Primary Action | Secondary Action | Empty State |
|---|---|---|---|
| **Private Analyzer** | Paste scam text / upload screenshot | Toggle On-Device vs Cloud Fallback | "Ready to inspect suspicious messages. All scans run privately on your device." |
| **Community Feed** | Filter by threat category / channel | Upvote confirmed scam pattern | "No active threats matching your filter. Submit a report to protect others." |
| **Campaigns Map** | Inspect linked threat clusters | View campaign IOCs (domains, numbers) | "No correlated campaigns detected yet. Community reports are continuously clustered." |
| **User Profile / Safety Log** | Review past private scans | Export personal safety report | "No previous scans found. Analyze a suspicious message to begin your log." |

---

## 3. Feedback, Accessibility & Empathy

1. **Clear Feedback**:
   - Provide toast notifications for all async operations ("Analysis complete", "Threat reported to community").
   - Highlight the inference source visibly ("⚡ Analyzed locally in 180ms via Gemini Nano").
2. **Accessibility**:
   - High contrast ratios (WCAG AAA for threat text).
   - Keyboard navigable forms and triage actions (`Tab`, `Enter`, `Escape` to close modals).
   - Descriptive `aria-label` tags on icons and severity indicators.
3. **Calm, Reassuring Tone**:
   - Avoid panic-inducing clickbait text. Use clear, objective, and authoritative security terminology.
   - Example: Instead of *"YOU ARE BEING HACKED!!!"*, write *"High Risk: This message exhibits high-confidence imposter fraud indicators."*

---

## 4. Product Engineering Checklist

- [ ] Does every screen have a single clear primary call-to-action?
- [ ] Are empty states helpful, friendly, and instructive?
- [ ] Can a panicked user complete an analysis in under 5 seconds?
- [ ] Does the UI explicitly reassure the user about data privacy before they paste anything?
- [ ] Are all error messages friendly and actionable (e.g., provide solutions rather than stack traces)?
- [ ] Does the product clearly showcase the hybrid AI differentiator (Local Nano vs Cloud Flash)?

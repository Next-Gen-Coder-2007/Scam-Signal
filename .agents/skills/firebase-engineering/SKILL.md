---
name: firebase-engineering
description: Firebase SDK implementation standards, Firestore schemas, security rules, Authentication, App Check, and configuration practices for ScamSignal.
---

# Firebase Engineering for ScamSignal

ScamSignal relies on Firebase modular SDK (v11+) for Authentication, Cloud Firestore, App Check, and Cloud Functions. All database operations must enforce least-privilege access, typed converters, and zero exposure of private raw data.

---

## 1. Firebase Configuration & Environment Variables

All Firebase configuration parameters must be supplied via Vite environment variables prefixed with `VITE_FIREBASE_`. Never hardcode API keys, project IDs, or measurement credentials.

### `.env.example`
```env
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
VITE_FIREBASE_APP_CHECK_KEY=your-recaptcha-enterprise-or-debug-token
```

### SDK Initialization (`src/services/firebase/firebaseApp.ts`)
```typescript
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { initializeAppCheck, ReCaptchaV3Provider, CustomProvider } from 'firebase/app-check';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Use modern persistent local caching for local-first reliability
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager(),
  }),
});

// App Check initialization (with debug provider support for local development)
if (typeof window !== 'undefined' && import.meta.env.VITE_FIREBASE_APP_CHECK_KEY) {
  if (import.meta.env.DEV) {
    // @ts-expect-error window debug token for dev
    self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
  }
  initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider(import.meta.env.VITE_FIREBASE_APP_CHECK_KEY),
    isTokenAutoRefreshEnabled: true,
  });
}
```

---

## 2. Firestore Data Model & Typed Converters

### Collections Schema:
1. `users/{userId}`: User profile, role (`user` | `analyst` | `admin`), reputation score.
2. `public_threats/{threatId}`: Sanitized, redacted community scam reports. **Zero PII allowed**.
3. `campaigns/{campaignId}`: Correlated scam clusters identified through deterministic indicators.
4. `user_scans/{scanId}`: Private scans owned strictly by the submitting user (or retained in IndexedDB only).

### Firestore Typed Converter Pattern:
```typescript
import { FirestoreDataConverter, QueryDocumentSnapshot, SnapshotOptions, serverTimestamp, Timestamp } from 'firebase/firestore';

export interface PublicThreatDocument {
  id?: string;
  reporterUid: string;
  threatLevel: 'CRITICAL' | 'HIGH' | 'SUSPICIOUS' | 'SAFE';
  threatCategories: string[];
  redactedSummary: string;
  normalizedPatternHash: string; // SHA-256 of normalized text for correlation
  tacticalIndicators: string[];
  inferenceSource: 'on-device' | 'cloud' | 'hybrid-fallback';
  upvotes: number;
  campaignId: string | null;
  createdAt: Timestamp;
}

export const threatConverter: FirestoreDataConverter<PublicThreatDocument> = {
  toFirestore(threat: PublicThreatDocument) {
    return {
      reporterUid: threat.reporterUid,
      threatLevel: threat.threatLevel,
      threatCategories: threat.threatCategories,
      redactedSummary: threat.redactedSummary,
      normalizedPatternHash: threat.normalizedPatternHash,
      tacticalIndicators: threat.tacticalIndicators,
      inferenceSource: threat.inferenceSource,
      upvotes: threat.upvotes || 0,
      campaignId: threat.campaignId || null,
      createdAt: threat.createdAt || serverTimestamp(),
    };
  },
  fromFirestore(snapshot: QueryDocumentSnapshot, options: SnapshotOptions): PublicThreatDocument {
    const data = snapshot.data(options);
    return {
      id: snapshot.id,
      reporterUid: data.reporterUid,
      threatLevel: data.threatLevel,
      threatCategories: data.threatCategories,
      redactedSummary: data.redactedSummary,
      normalizedPatternHash: data.normalizedPatternHash,
      tacticalIndicators: data.tacticalIndicators,
      inferenceSource: data.inferenceSource,
      upvotes: data.upvotes ?? 0,
      campaignId: data.campaignId ?? null,
      createdAt: data.createdAt,
    };
  },
};
```

---

## 3. Secure Firestore Security Rules (`firestore.rules`)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }
    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }
    function isAdmin() {
      return isAuthenticated() && 
        request.auth.token.admin == true;
    }

    // Public community threat feed
    match /public_threats/{threatId} {
      // Anyone authenticated can read verified community threat signals
      allow read: if isAuthenticated();

      // Users can submit reports, but cannot forge verification or upvotes
      allow create: if isAuthenticated()
        && request.resource.data.reporterUid == request.auth.uid
        && request.resource.data.upvotes == 0
        && request.resource.data.campaignId == null
        && request.resource.data.redactedSummary is string
        && request.resource.data.redactedSummary.size() <= 2000;

      // Only admins or Cloud Functions can update campaigns or verification
      allow update: if isAdmin();
      allow delete: if isAdmin();
    }

    // Campaigns (Correlated threat networks)
    match /campaigns/{campaignId} {
      allow read: if isAuthenticated();
      // Users CANNOT create or manipulate campaigns directly
      allow write: if isAdmin();
    }

    // User Private Scans (if cloud-synced with user consent)
    match /user_scans/{scanId} {
      allow read, delete: if isOwner(resource.data.userId);
      allow create: if isOwner(request.resource.data.userId);
      allow update: if false; // Scans are immutable records
    }
  }
}
```

---

## 4. Firebase Engineering Checklist

- [ ] Are all credentials sourced strictly from `.env` via `import.meta.env.VITE_FIREBASE_*`?
- [ ] Is Firestore configured with modular imports and persistent local cache enabled?
- [ ] Are all read/write operations bound to typed `FirestoreDataConverter` implementations?
- [ ] Do Firestore rules prevent users from modifying upvotes, campaigns, or verified flags?
- [ ] Are private user scans isolated to user-owned paths and never published in `public_threats` without PII scrubbing?
- [ ] Is App Check configured to verify app authenticity in production and dev debug modes?

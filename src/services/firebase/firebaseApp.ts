import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  Auth,
  setPersistence,
  browserLocalPersistence,
} from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  Firestore,
} from 'firebase/firestore';
import {
  initializeAppCheck,
  ReCaptchaEnterpriseProvider,
  ReCaptchaV3Provider,
  AppCheck,
} from 'firebase/app-check';
import { getAI, GoogleAIBackend, AI } from 'firebase/ai';
import { getFunctions, Functions } from 'firebase/functions';

export interface FirebaseEnvConfig {
  apiKey?: string;
  authDomain?: string;
  projectId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
  appCheckSiteKey?: string;
  appCheckDebugToken?: string;
}

export interface FirebaseInitializationStatus {
  isConfigured: boolean;
  missingKeys: string[];
  error: string | null;
  appCheckStatus: 'active' | 'unconfigured' | 'error';
  appCheckError: string | null;
}

const REQUIRED_ENV_KEYS: Array<{ envKey: string; configKey: keyof FirebaseEnvConfig }> = [
  { envKey: 'VITE_FIREBASE_API_KEY', configKey: 'apiKey' },
  { envKey: 'VITE_FIREBASE_AUTH_DOMAIN', configKey: 'authDomain' },
  { envKey: 'VITE_FIREBASE_PROJECT_ID', configKey: 'projectId' },
  { envKey: 'VITE_FIREBASE_APP_ID', configKey: 'appId' },
];

export function readFirebaseEnv(): FirebaseEnvConfig {
  return {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY?.trim() || undefined,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN?.trim() || undefined,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID?.trim() || undefined,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET?.trim() || undefined,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID?.trim() || undefined,
    appId: import.meta.env.VITE_FIREBASE_APP_ID?.trim() || undefined,
    appCheckSiteKey: import.meta.env.VITE_FIREBASE_APP_CHECK_SITE_KEY?.trim() || undefined,
    appCheckDebugToken: import.meta.env.VITE_FIREBASE_APP_CHECK_DEBUG_TOKEN?.trim() || undefined,
  };
}

export function validateFirebaseConfig(config: FirebaseEnvConfig): {
  isValid: boolean;
  missingKeys: string[];
} {
  const missingKeys = REQUIRED_ENV_KEYS.filter(
    ({ configKey }) => !config[configKey]
  ).map(({ envKey }) => envKey);

  return {
    isValid: missingKeys.length === 0,
    missingKeys,
  };
}

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let appCheck: AppCheck | null = null;
let ai: AI | null = null;
let functions: Functions | null = null;

const envConfig = readFirebaseEnv();
const validation = validateFirebaseConfig(envConfig);

const firebaseStatus: FirebaseInitializationStatus = {
  isConfigured: false,
  missingKeys: validation.missingKeys,
  error: null,
  appCheckStatus: 'unconfigured',
  appCheckError: null,
};

if (!validation.isValid) {
  firebaseStatus.error = `Firebase configuration is incomplete. Missing environment variables: ${validation.missingKeys.join(', ')}`;
} else {
  try {
    const sdkConfig = {
      apiKey: envConfig.apiKey!,
      authDomain: envConfig.authDomain!,
      projectId: envConfig.projectId!,
      storageBucket: envConfig.storageBucket,
      messagingSenderId: envConfig.messagingSenderId,
      appId: envConfig.appId!,
    };

    app = getApps().length > 0 ? getApp() : initializeApp(sdkConfig);
    auth = getAuth(app);
    if (typeof window !== 'undefined') {
      void setPersistence(auth, browserLocalPersistence).catch(() => {
        // Fallback silently if browser storage is restricted
      });
    }
    db = initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
    });
    firebaseStatus.isConfigured = true;

    // Initialize App Check in browser environments when a site key is provided
    if (typeof window !== 'undefined' && envConfig.appCheckSiteKey) {
      try {
        if (import.meta.env.DEV && envConfig.appCheckDebugToken) {
          // @ts-expect-error Firebase App Check debug token global
          self.FIREBASE_APPCHECK_DEBUG_TOKEN =
            envConfig.appCheckDebugToken === 'true'
              ? true
              : envConfig.appCheckDebugToken;
        }
        const useV3Classic =
          import.meta.env.VITE_FIREBASE_APP_CHECK_PROVIDER?.trim().toLowerCase() === 'v3';
        appCheck = initializeAppCheck(app, {
          provider: useV3Classic
            ? new ReCaptchaV3Provider(envConfig.appCheckSiteKey)
            : new ReCaptchaEnterpriseProvider(envConfig.appCheckSiteKey),
          isTokenAutoRefreshEnabled: true,
        });
        firebaseStatus.appCheckStatus = 'active';
      } catch (acError: unknown) {
        firebaseStatus.appCheckStatus = 'error';
        firebaseStatus.appCheckError =
          acError instanceof Error ? acError.message : 'App Check initialization failed.';
      }
    }

    ai = getAI(app, {
      backend: new GoogleAIBackend(),
      useLimitedUseAppCheckTokens: Boolean(appCheck),
    });
    functions = getFunctions(app);
  } catch (initError: unknown) {
    app = null;
    auth = null;
    db = null;
    ai = null;
    functions = null;
    firebaseStatus.isConfigured = false;
    firebaseStatus.error =
      initError instanceof Error
        ? initError.message
        : 'Failed to initialize Firebase SDK.';
  }
}

export { app, auth, db, appCheck, ai, functions, firebaseStatus };

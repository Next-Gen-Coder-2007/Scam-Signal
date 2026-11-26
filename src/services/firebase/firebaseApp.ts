import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  Firestore,
} from 'firebase/firestore';
import {
  initializeAppCheck,
  ReCaptchaV3Provider,
  AppCheck,
} from 'firebase/app-check';

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
        appCheck = initializeAppCheck(app, {
          provider: new ReCaptchaV3Provider(envConfig.appCheckSiteKey),
          isTokenAutoRefreshEnabled: true,
        });
        firebaseStatus.appCheckStatus = 'active';
      } catch (acError: unknown) {
        firebaseStatus.appCheckStatus = 'error';
        firebaseStatus.appCheckError =
          acError instanceof Error ? acError.message : 'App Check initialization failed.';
      }
    }
  } catch (initError: unknown) {
    app = null;
    auth = null;
    db = null;
    firebaseStatus.isConfigured = false;
    firebaseStatus.error =
      initError instanceof Error
        ? initError.message
        : 'Failed to initialize Firebase SDK.';
  }
}

export { app, auth, db, appCheck, firebaseStatus };

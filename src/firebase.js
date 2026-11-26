import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, connectAuthEmulator } from "firebase/auth";
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  connectFirestoreEmulator,
} from "firebase/firestore";
import { getStorage, connectStorageEmulator } from "firebase/storage";
import {
  initializeAppCheck,
  ReCaptchaV3Provider,
  ReCaptchaEnterpriseProvider,
} from "firebase/app-check";

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "AIzaSyDVp02Ili_bgUUCK-RsB5knIj8qFdP7QFQ",
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "househelper-12050.firebaseapp.com",
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "househelper-12050",
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "househelper-12050.firebasestorage.app",
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "652774481170",
  appId: process.env.REACT_APP_FIREBASE_APP_ID || "1:652774481170:web:931656c27c3088f1a127cb",
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID || "G-JC1XHY6KJ3"
};

const app = initializeApp(firebaseConfig);

// Initialize Firebase App Check BEFORE Auth/Firestore/Storage so the first request carries an attestation token.
// Supports either reCAPTCHA Enterprise (REACT_APP_RECAPTCHA_ENTERPRISE_SITE_KEY) or reCAPTCHA v3 (REACT_APP_RECAPTCHA_V3_SITE_KEY).
// Note: Frontend attestation alone does not reject unattested traffic until Enforcement is enabled in Firebase Console.
export let appCheck = null;
const recaptchaEnterpriseKey = process.env.REACT_APP_RECAPTCHA_ENTERPRISE_SITE_KEY;
// Public reCAPTCHA v3 site key (secret key lives exclusively in Firebase Console -> App Check).
const DEFAULT_PROD_RECAPTCHA_V3_SITE_KEY = "6LeNyzMuAAAAAP9QAemPcko-fFj95b4YzoAdY2-S";
const recaptchaV3Key =
  process.env.REACT_APP_RECAPTCHA_V3_SITE_KEY ||
  (process.env.NODE_ENV === "production" ? DEFAULT_PROD_RECAPTCHA_V3_SITE_KEY : "");
if (
  process.env.NODE_ENV !== "test" &&
  process.env.REACT_APP_USE_FIREBASE_EMULATOR !== "true" &&
  typeof window !== "undefined" &&
  (recaptchaEnterpriseKey || recaptchaV3Key)
) {
  try {
    if (process.env.REACT_APP_APPCHECK_DEBUG_TOKEN) {
      // eslint-disable-next-line no-restricted-globals
      self.FIREBASE_APPCHECK_DEBUG_TOKEN =
        process.env.REACT_APP_APPCHECK_DEBUG_TOKEN === "true"
          ? true
          : process.env.REACT_APP_APPCHECK_DEBUG_TOKEN;
    }
    const provider = recaptchaEnterpriseKey
      ? new ReCaptchaEnterpriseProvider(recaptchaEnterpriseKey)
      : new ReCaptchaV3Provider(recaptchaV3Key);
    appCheck = initializeAppCheck(app, {
      provider,
      isTokenAutoRefreshEnabled: true,
    });
  } catch (_err) {
    // Already initialized during HMR
  }
}

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

function createFirestoreInstance(firebaseApp) {
  if (
    process.env.NODE_ENV !== "test" &&
    typeof window !== "undefined" &&
    typeof window.indexedDB !== "undefined" &&
    typeof initializeFirestore === "function" &&
    typeof persistentLocalCache === "function"
  ) {
    try {
      return initializeFirestore(firebaseApp, {
        localCache: persistentLocalCache({
          tabManager:
            typeof persistentMultipleTabManager === "function"
              ? persistentMultipleTabManager()
              : undefined,
        }),
      });
    } catch (_err) {
      // Fallback if Firestore was already initialized or IndexedDB is restricted
    }
  }
  return getFirestore(firebaseApp);
}

export const db = createFirestoreInstance(app);
export const storage = getStorage(app);

if (
  process.env.NODE_ENV !== "test" &&
  process.env.REACT_APP_USE_FIREBASE_EMULATOR === "true" &&
  typeof window !== "undefined"
) {
  try {
    connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
    connectFirestoreEmulator(db, "127.0.0.1", 8080);
    connectStorageEmulator(storage, "127.0.0.1", 9199);
  } catch (_err) {
    // Emulators already connected during HMR
  }
}

export default app;

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

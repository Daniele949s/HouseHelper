import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

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
export const db = getFirestore(app);
export const storage = getStorage(app);
export default app;

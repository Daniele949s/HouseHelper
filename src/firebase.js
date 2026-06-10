import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDVp02Ili_bgUUCK-RsB5knIj8qFdP7QFQ",
  authDomain: "househelper-12050.firebaseapp.com",
  projectId: "househelper-12050",
  storageBucket: "househelper-12050.firebasestorage.app",
  messagingSenderId: "652774481170",
  appId: "1:652774481170:web:931656c27c3088f1a127cb",
  measurementId: "G-JC1XHY6KJ3"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
export default app;

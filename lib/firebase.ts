// src/lib/firebase.ts
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// ====== GANTI dengan config dari Firebase Console kamu ======
const firebaseConfig = {
  apiKey: "AIzaSyBpx4sclezHqpcfs1QECejlpJf2XZRBY30",
  authDomain: "finance-freca.firebaseapp.com",
  projectId: "finance-freca",
  storageBucket: "finance-freca.firebasestorage.app",
  messagingSenderId: "358376345070",
  appId: "1:358376345070:web:f1e765f33546cabdea12ff"
};
// ============================================================

export const app = initializeApp(firebaseConfig);

// Auth & Firestore instances
export const auth = getAuth(app);
export const db = getFirestore(app);

// 👉 Provider Google untuk sign-in
export const googleProvider = new GoogleAuthProvider();
// (opsional) force pilih akun setiap login:
// googleProvider.setCustomParameters({ prompt: "select_account" });

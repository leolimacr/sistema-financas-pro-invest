import { getStorage } from "firebase/storage";
import firebase from "firebase/compat/app";
import "firebase/compat/auth";
import "firebase/compat/database";
import "firebase/compat/functions";
import { initializeApp, getApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// 1. Inicialização MODULAR (Obrigatória para useFirebase.ts e o erro da tela quebrada)
const appModular = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const firestore = getFirestore(appModular); // Firestore Moderno
export const dbModular = getDatabase(appModular);  // Realtime Moderno
export const storage = getStorage(appModular);

// 2. Inicialização COMPAT (Obrigatória para o sistema de Login atual)
const appCompat = !firebase.apps.length ? firebase.initializeApp(firebaseConfig) : firebase.app();
export const auth = appCompat.auth();
export const db = appCompat.database(); // Realtime Legado (Mantido para compatibilidade)
export const database = db;
export const functions = appCompat.functions('southamerica-east1');

export const authReadyPromise = new Promise((resolve) => {
  const unsubscribe = auth.onAuthStateChanged((user) => {
    unsubscribe();
    resolve(user);
  });
});

export default appCompat;
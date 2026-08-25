import { initializeApp } from 'firebase/app';
import {
  getAuth, connectAuthEmulator, onAuthStateChanged, signInWithPopup, signOut,
  GoogleAuthProvider, User,
} from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';

const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'demo-key',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'demo.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'demo-project',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'demo-project.appspot.com',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '0',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || 'demo-app',
};

export const app = initializeApp(config);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app, import.meta.env.VITE_FUNCTIONS_REGION || 'europe-west1');

if (import.meta.env.VITE_USE_EMULATORS === 'true') {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
  connectStorageEmulator(storage, '127.0.0.1', 9199);
  connectFunctionsEmulator(functions, '127.0.0.1', 5001);
}

// Dev-console handle for debugging (harmless in production builds).
if (typeof window !== 'undefined') {
  (window as unknown as Record<string, unknown>).__fb = { app, auth, db, storage };
}

/**
 * Auth — Google only, no anonymous fallback.
 *
 * This studio spends real money per click, so there is no such thing as a
 * casual visitor. The allowlist is enforced server-side in requireAdmin(); what
 * happens here only decides which screen you look at.
 */
const googleProvider = new GoogleAuthProvider();
// Always show the chooser: this machine may be signed into several accounts and
// only one of them is on the allowlist.
googleProvider.setCustomParameters({ prompt: 'select_account' });

/** Subscribe to auth state. Returns the unsubscribe function. */
export function watchAuth(onChange: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, onChange);
}

/** Open the Google sign-in popup. Rejects if the popup is closed or blocked. */
export async function signInWithGoogle(): Promise<User> {
  const cred = await signInWithPopup(auth, googleProvider);
  return cred.user;
}

export function signOutStudio(): Promise<void> {
  return signOut(auth);
}

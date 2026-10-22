// Reads Firebase settings from Vite env. No SDK imports, so it can be checked before Firebase loads.
import type { FirebaseOptions } from 'firebase/app';

const env = import.meta.env;

export const useEmulators = env.VITE_USE_EMULATORS === 'true';

const fromEnv: FirebaseOptions = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
};

const hasRealConfig = Boolean(fromEnv.apiKey && fromEnv.projectId && fromEnv.appId && fromEnv.authDomain);

/**
 * Emulators always use the "demo-" project the emulator, seed and set-admin scripts share;
 * it needs no real Firebase project or credentials.
 */
const emulatorDemo: FirebaseOptions = {
  apiKey: 'demo-api-key',
  authDomain: 'demo-mess-tracker.firebaseapp.com',
  projectId: 'demo-mess-tracker',
  appId: 'demo-app',
};

export const firebaseConfigured = hasRealConfig || useEmulators;
export const firebaseOptions: FirebaseOptions = useEmulators ? emulatorDemo : fromEnv;

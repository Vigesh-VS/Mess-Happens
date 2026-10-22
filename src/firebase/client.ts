// Firebase client singletons. Import only after `firebaseConfigured` is true (see main.tsx).
import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import {
  connectFirestoreEmulator,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';
import { firebaseOptions, useEmulators } from './config';

export const app = initializeApp(firebaseOptions);

export const auth = getAuth(app);

/**
 * Persistent cache shared across tabs: reads work offline from previously loaded data,
 * and writes made offline are queued and replayed on reconnect (no custom queue needed).
 */
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
});

if (useEmulators) {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  connectFirestoreEmulator(db, '127.0.0.1', 8080);
}

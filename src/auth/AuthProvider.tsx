import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { FirebaseError } from 'firebase/app';
import { onIdTokenChanged, signOut as fbSignOut, type User } from 'firebase/auth';
import { onSnapshot } from 'firebase/firestore';
import { auth } from '../firebase/client';
import type { UserProfile } from '../models';
import { AuthContext, type AuthContextValue, type AuthState } from './AuthContext';
import { ensureUserProfile, setPendingSignupName, userDoc } from './profile';

const RETRYABLE = new Set(['permission-denied', 'unauthenticated', 'unavailable', 'aborted']);

/**
 * Right after sign-up, Firestore can briefly still send requests without the new user's token,
 * so the first profile write may be denied. Retry a few times with backoff.
 */
async function ensureWithRetry(user: User, isCancelled: () => boolean): Promise<void> {
  for (let attempt = 0; ; attempt++) {
    try {
      await ensureUserProfile(user);
      return;
    } catch (err) {
      const retryable = err instanceof FirebaseError && RETRYABLE.has(err.code);
      if (!retryable || attempt >= 4 || isCancelled()) throw err;
      await new Promise((r) => setTimeout(r, 300 * 2 ** attempt));
      await user.getIdToken(attempt >= 2);
    }
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [isAdmin, setIsAdmin] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  // Fires on sign-in, sign-out and every token refresh (so claim changes are picked up).
  useEffect(
    () =>
      onIdTokenChanged(auth, async (next) => {
        if (!next) {
          setIsAdmin(false);
          setUser(null);
          return;
        }
        try {
          const token = await next.getIdTokenResult();
          setIsAdmin(token.claims.admin === true);
        } catch {
          setIsAdmin(false);
        }
        setUser(next);
      }),
    [],
  );

  const uid = user?.uid;
  useEffect(() => {
    if (!uid || !auth.currentUser) {
      setProfile(null);
      return;
    }
    let cancelled = false;
    const ensure = () => {
      const current = auth.currentUser;
      if (!current || current.uid !== uid) return;
      ensureWithRetry(current, () => cancelled)
        .then(() => setPendingSignupName(null))
        // Offline this may fail; the snapshot below retries once the server says it's missing.
        .catch((err) => console.warn('Could not ensure user profile', err));
    };
    ensure();
    const unsubscribe = onSnapshot(
      userDoc(uid),
      { includeMetadataChanges: true },
      (snap) => {
        setProfile(snap.exists() ? (snap.data() as UserProfile) : null);
        // Self-heal: the server confirms there's no profile (e.g. the first attempt raced sign-up).
        if (!snap.exists() && !snap.metadata.fromCache) ensure();
      },
      (err) => console.warn('Could not read user profile', err),
    );
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [uid]);

  const refreshClaims = useCallback(async () => {
    await auth.currentUser?.getIdToken(true);
  }, []);

  const signOut = useCallback(() => fbSignOut(auth), []);

  const value = useMemo<AuthContextValue>(() => {
    let state: AuthState;
    if (user === undefined) state = { status: 'loading' };
    else if (user === null) state = { status: 'signedOut' };
    else state = { status: 'signedIn', user, isAdmin, profile };
    return { state, refreshClaims, signOut };
  }, [user, isAdmin, profile, refreshClaims, signOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

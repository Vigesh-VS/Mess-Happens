import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { onIdTokenChanged, signOut as fbSignOut, type User } from 'firebase/auth';
import { onSnapshot } from 'firebase/firestore';
import { auth } from '../firebase/client';
import type { UserProfile } from '../models';
import { AuthContext, type AuthContextValue, type AuthState } from './AuthContext';
import { ensureUserProfile, setPendingSignupName, userDoc } from './profile';

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
    // Offline this may fail; the profile then already exists or is created next time online.
    ensureUserProfile(auth.currentUser)
      .then(() => setPendingSignupName(null))
      .catch((err) => console.warn('Could not ensure user profile', err));
    return onSnapshot(
      userDoc(uid),
      (snap) => setProfile(snap.exists() ? (snap.data() as UserProfile) : null),
      (err) => console.warn('Could not read user profile', err),
    );
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

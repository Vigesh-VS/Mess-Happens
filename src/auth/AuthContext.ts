import { createContext, useContext } from 'react';
import type { User } from 'firebase/auth';
import type { UserProfile } from '../models';

export type AuthState =
  | { status: 'loading' }
  | { status: 'signedOut' }
  | {
      status: 'signedIn';
      user: User;
      /** From the `admin` custom claim — UI hint only; Security Rules enforce it. */
      isAdmin: boolean;
      /** null while loading or if it could not be read. */
      profile: UserProfile | null;
    };

export interface AuthContextValue {
  state: AuthState;
  /** Force-refreshes the ID token so a newly granted/removed admin claim takes effect. */
  refreshClaims: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

/** For screens behind <RequireAuth>, where a user is guaranteed. */
export function useSignedIn() {
  const { state, ...rest } = useAuth();
  if (state.status !== 'signedIn') throw new Error('useSignedIn used outside <RequireAuth>');
  return { ...state, ...rest };
}

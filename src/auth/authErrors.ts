import { FirebaseError } from 'firebase/app';

const messages: Record<string, string> = {
  'auth/invalid-credential': 'Email or password is incorrect.',
  'auth/invalid-login-credentials': 'Email or password is incorrect.',
  'auth/wrong-password': 'Email or password is incorrect.',
  'auth/user-not-found': 'Email or password is incorrect.',
  'auth/invalid-email': 'That email address is not valid.',
  'auth/email-already-in-use': 'An account with this email already exists. Sign in instead.',
  'auth/weak-password': 'Use at least 8 characters.',
  'auth/too-many-requests': 'Too many attempts. Wait a minute and try again.',
  'auth/network-request-failed': 'No connection. Check your network and try again.',
  'auth/popup-closed-by-user': 'Google sign-in was closed before finishing.',
  'auth/cancelled-popup-request': 'Google sign-in was closed before finishing.',
  'auth/popup-blocked': 'The browser blocked the Google sign-in window. Allow pop-ups and try again.',
  'auth/account-exists-with-different-credential': 'This email is registered with a password. Sign in with your password.',
  'auth/operation-not-allowed': 'This sign-in method is not enabled in Firebase yet.',
  'auth/user-disabled': 'This account has been disabled.',
};

export function authErrorMessage(err: unknown): string {
  if (err instanceof FirebaseError) return messages[err.code] ?? `Something went wrong (${err.code}).`;
  return 'Something went wrong. Please try again.';
}

/** Errors that mean the user simply backed out — no need to show anything. */
export function isUserCancel(err: unknown): boolean {
  return err instanceof FirebaseError && (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request');
}

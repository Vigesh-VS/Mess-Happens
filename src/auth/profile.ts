import type { User } from 'firebase/auth';
import { doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/client';

export const userDoc = (uid: string) => doc(db, 'users', uid);

function fallbackName(user: User): string {
  return (user.displayName || user.email?.split('@')[0] || 'Student').slice(0, 80);
}

/**
 * Creates `users/{uid}` on first sign-in; if `preferredName` is given (sign-up form), keeps it.
 * A transaction so the sign-up form and the auth listener can't both "create" the profile.
 */
export async function ensureUserProfile(user: User, preferredName?: string): Promise<void> {
  const ref = userDoc(user.uid);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) {
      tx.set(ref, {
        displayName: preferredName?.trim().slice(0, 80) || fallbackName(user),
        email: user.email ?? null,
        targets: null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else if (preferredName && snap.data().displayName !== preferredName.trim()) {
      tx.update(ref, { displayName: preferredName.trim().slice(0, 80), updatedAt: serverTimestamp() });
    }
  });
}

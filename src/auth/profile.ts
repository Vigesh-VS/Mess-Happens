import type { User } from 'firebase/auth';
import { doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase/client';

export const userDoc = (uid: string) => doc(db, 'users', uid);

/** Name typed on the sign-up form, picked up by the auth listener when it creates the profile. */
let pendingSignupName: string | null = null;
export function setPendingSignupName(name: string | null): void {
  pendingSignupName = name;
}

function fallbackName(user: User): string {
  return (user.displayName || user.email?.split('@')[0] || 'Student').slice(0, 80);
}

/**
 * Creates `users/{uid}` on first sign-in, named from the sign-up form if there was one.
 * Only the auth listener calls this, so there's a single writer per sign-in.
 */
const inFlight = new Map<string, Promise<void>>();

export function ensureUserProfile(user: User, preferredName: string | undefined = pendingSignupName ?? undefined): Promise<void> {
  const running = inFlight.get(user.uid);
  if (running) return running;
  const promise = createOrRename(user, preferredName).finally(() => inFlight.delete(user.uid));
  inFlight.set(user.uid, promise);
  return promise;
}

async function createOrRename(user: User, preferredName: string | undefined): Promise<void> {
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

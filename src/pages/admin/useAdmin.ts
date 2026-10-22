import { useCallback, useState } from 'react';
import { FirebaseError } from 'firebase/app';
import { useSignedIn } from '../../auth/AuthContext';
import type { Actor } from '../../data/adminWrites';

export function useActor(): Actor {
  const { user } = useSignedIn();
  return { uid: user.uid, email: user.email };
}

export function adminErrorMessage(err: unknown): string {
  if (err instanceof FirebaseError && err.code === 'permission-denied') {
    return 'Permission denied. Your admin access may have been removed, or the data failed validation.';
  }
  return err instanceof Error ? err.message : String(err);
}

export type SaveStatus = { kind: 'idle' } | { kind: 'saving' } | { kind: 'saved'; message: string } | { kind: 'error'; message: string };

/** Runs an admin write and reports progress. While offline the write waits until reconnect. */
export function useSave() {
  const [status, setStatus] = useState<SaveStatus>({ kind: 'idle' });
  const run = useCallback(async (fn: () => Promise<unknown>, savedMessage: string): Promise<boolean> => {
    setStatus({ kind: 'saving' });
    try {
      await fn();
      setStatus({ kind: 'saved', message: savedMessage });
      return true;
    } catch (err) {
      console.error(err);
      setStatus({ kind: 'error', message: adminErrorMessage(err) });
      return false;
    }
  }, []);
  const reset = useCallback(() => setStatus({ kind: 'idle' }), []);
  return { status, run, reset };
}

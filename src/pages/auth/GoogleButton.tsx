import { useState } from 'react';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth } from '../../firebase/client';
import { Button } from '../../components/ui/Button';
import { authErrorMessage, isUserCancel } from '../../auth/authErrors';

export function GoogleButton({ onError }: { onError: (message: string | null) => void }) {
  const [busy, setBusy] = useState(false);

  async function handleClick() {
    onError(null);
    setBusy(true);
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
      // The auth listener creates the profile and the router redirects.
    } catch (err) {
      if (!isUserCancel(err)) onError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button variant="secondary" block busy={busy} onClick={handleClick}>
      Continue with Google
    </Button>
  );
}

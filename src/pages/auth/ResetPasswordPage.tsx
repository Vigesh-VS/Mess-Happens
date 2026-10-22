import { useState, type FormEvent } from 'react';
import { Link } from 'react-router';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../../firebase/client';
import { authErrorMessage } from '../../auth/authErrors';
import { Button } from '../../components/ui/Button';
import { Notice } from '../../components/ui/Notice';
import { TextField } from '../../components/ui/TextField';
import { AuthLayout } from './AuthLayout';

export function ResetPasswordPage() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setSent(true);
    } catch (err) {
      setError(authErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout
      title="Reset"
      footer={
        <Link to="/login" className="font-semibold text-ink underline underline-offset-4">
          Back to sign in
        </Link>
      }
    >
      {sent ? (
        <Notice title="Check your inbox">If an account exists for {email.trim()}, a reset link is on its way.</Notice>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-6" noValidate>
          <TextField label="Email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          {error ? <Notice tone="error">{error}</Notice> : null}
          <Button type="submit" block busy={busy} disabled={!email}>
            Send reset link
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}

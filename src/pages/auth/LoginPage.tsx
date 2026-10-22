import { useState, type FormEvent } from 'react';
import { Link, useLocation } from 'react-router';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../firebase/client';
import { authErrorMessage } from '../../auth/authErrors';
import { Button } from '../../components/ui/Button';
import { Notice } from '../../components/ui/Notice';
import { TextField } from '../../components/ui/TextField';
import { AuthLayout } from './AuthLayout';
import { GoogleButton } from './GoogleButton';

export function LoginPage() {
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (err) {
      setError(authErrorMessage(err));
      setBusy(false);
    }
  }

  return (
    <AuthLayout
      title="Sign in"
      footer={
        <>
          New here?{' '}
          <Link to="/signup" state={location.state} className="font-semibold text-ink underline underline-offset-4">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-6" noValidate>
        <TextField label="Email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <TextField label="Password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        {error ? <Notice tone="error">{error}</Notice> : null}
        <Button type="submit" block busy={busy} disabled={!email || !password}>
          Sign in
        </Button>
      </form>
      <div className="mt-4">
        <GoogleButton onError={setError} />
      </div>
      <p className="mt-6 text-sm">
        <Link to="/reset-password" className="text-muted underline-offset-4 hover:text-ink hover:underline">
          Forgot password?
        </Link>
      </p>
    </AuthLayout>
  );
}

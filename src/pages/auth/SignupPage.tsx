import { useState, type FormEvent } from 'react';
import { Link, useLocation } from 'react-router';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth } from '../../firebase/client';
import { authErrorMessage } from '../../auth/authErrors';
import { ensureUserProfile } from '../../auth/profile';
import { Button } from '../../components/ui/Button';
import { Notice } from '../../components/ui/Notice';
import { TextField } from '../../components/ui/TextField';
import { AuthLayout } from './AuthLayout';
import { GoogleButton } from './GoogleButton';

const MIN_PASSWORD = 8;

export function SignupPage() {
  const location = useLocation();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const passwordTooShort = password.length > 0 && password.length < MIN_PASSWORD;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (password.length < MIN_PASSWORD) return;
    setError(null);
    setBusy(true);
    try {
      const { user } = await createUserWithEmailAndPassword(auth, email.trim(), password);
      await updateProfile(user, { displayName: name.trim() });
      await ensureUserProfile(user, name);
    } catch (err) {
      setError(authErrorMessage(err));
      setBusy(false);
    }
  }

  return (
    <AuthLayout
      title="Sign up"
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" state={location.state} className="font-semibold text-ink underline underline-offset-4">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-6" noValidate>
        <TextField label="Name" autoComplete="name" required maxLength={80} value={name} onChange={(e) => setName(e.target.value)} />
        <TextField label="Email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <TextField
          label="Password"
          type="password"
          autoComplete="new-password"
          required
          minLength={MIN_PASSWORD}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          hint={`At least ${MIN_PASSWORD} characters.`}
          error={passwordTooShort ? `At least ${MIN_PASSWORD} characters.` : undefined}
        />
        {error ? <Notice tone="error">{error}</Notice> : null}
        <Button type="submit" block busy={busy} disabled={!name.trim() || !email || password.length < MIN_PASSWORD}>
          Create account
        </Button>
      </form>
      <div className="mt-4">
        <GoogleButton onError={setError} />
      </div>
    </AuthLayout>
  );
}

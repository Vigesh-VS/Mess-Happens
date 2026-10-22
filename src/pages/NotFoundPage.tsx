import { Link } from 'react-router';

export function NotFoundPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center px-4">
      <p className="label">404</p>
      <h1 className="text-display mt-3">Not here.</h1>
      <Link to="/" className="mt-8 font-semibold underline underline-offset-4">
        Go to today’s menu
      </Link>
    </main>
  );
}

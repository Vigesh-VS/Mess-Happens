/** Shown when .env.local is missing — no Firebase code is loaded. */
export function SetupRequired() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center px-4 py-12">
      <p className="label">Setup</p>
      <h1 className="text-display mt-3">Firebase is not configured.</h1>
      <div className="mt-8 space-y-4 text-lg text-muted">
        <p>
          Copy <code className="text-ink">.env.example</code> to <code className="text-ink">.env.local</code> and fill in your
          Firebase web-app settings, then restart <code className="text-ink">npm run dev</code>.
        </p>
        <p>
          To try it locally without a Firebase project, set <code className="text-ink">VITE_USE_EMULATORS=true</code> and run{' '}
          <code className="text-ink">npm run emulators</code>.
        </p>
      </div>
    </main>
  );
}

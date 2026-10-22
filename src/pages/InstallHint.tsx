import { Download } from 'lucide-react';
import { isIos, isStandalone, useInstallPrompt } from '../pwa/install';
import { Button } from '../components/ui/Button';

/** Install guidance: a button where the browser supports it, instructions on iPhone/iPad. */
export function InstallHint() {
  const install = useInstallPrompt();
  if (isStandalone()) return null;

  return (
    <section className="mt-10 border-t border-ink pt-4">
      <h2 className="label text-ink">Install</h2>
      {install ? (
        <div className="mt-3">
          <p className="mb-3 max-w-prose text-sm text-muted">Add Mess to your home screen — it opens like an app and keeps working offline.</p>
          <Button variant="secondary" icon={<Download aria-hidden className="size-4" />} onClick={() => void install()}>
            Install app
          </Button>
        </div>
      ) : isIos() ? (
        <p className="mt-3 max-w-prose text-sm text-muted">In Safari, tap Share, then “Add to Home Screen”.</p>
      ) : (
        <p className="mt-3 max-w-prose text-sm text-muted">
          Use your browser’s menu → “Install app” or “Add to Home screen”. On a laptop, look for the install icon in the address bar.
        </p>
      )}
    </section>
  );
}

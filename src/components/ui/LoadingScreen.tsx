import { LoaderCircle } from 'lucide-react';

export function LoadingScreen({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center" role="status" aria-live="polite">
      <LoaderCircle aria-hidden className="size-5 animate-spin text-muted" />
      <span className="sr-only">{label}</span>
    </div>
  );
}

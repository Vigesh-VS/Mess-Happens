import { WifiOff } from 'lucide-react';
import { useOnline } from '../../hooks/useOnline';

export function OfflineBadge({ className = '' }: { className?: string }) {
  const online = useOnline();
  if (online) return null;
  return (
    <p role="status" className={`flex items-center gap-2 text-sm text-muted ${className}`}>
      <WifiOff aria-hidden className="size-4" />
      Offline — changes will sync
    </p>
  );
}

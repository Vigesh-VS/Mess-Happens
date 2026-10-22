import { useOnline } from '../../hooks/useOnline';
import type { SaveStatus } from './useAdmin';

export function SaveStatusLine({ status }: { status: SaveStatus }) {
  const online = useOnline();
  if (status.kind === 'idle') return null;
  if (status.kind === 'saving') {
    return (
      <p role="status" className="text-sm text-muted">
        {online ? 'Publishing…' : 'Offline — will publish when the connection returns.'}
      </p>
    );
  }
  if (status.kind === 'error') {
    return (
      <p role="alert" className="text-sm text-danger">
        {status.message}
      </p>
    );
  }
  return (
    <p role="status" className="text-sm font-semibold">
      {status.message}
    </p>
  );
}

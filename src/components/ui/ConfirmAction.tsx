import { useState, type ReactNode } from 'react';
import { Button } from './Button';

interface ConfirmActionProps {
  /** Label of the first button. */
  children: ReactNode;
  /** What will happen — shown before the user confirms. */
  message: ReactNode;
  confirmLabel?: string;
  onConfirm: () => Promise<void> | void;
  variant?: 'primary' | 'secondary';
  danger?: boolean;
  disabled?: boolean;
  icon?: ReactNode;
}

/** Two-step button for consequential actions: click → explain → confirm. */
export function ConfirmAction({ children, message, confirmLabel = 'Confirm', onConfirm, variant = 'secondary', danger = false, disabled, icon }: ConfirmActionProps) {
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!asking) {
    return (
      <Button variant={variant} icon={icon} disabled={disabled} onClick={() => setAsking(true)}>
        {children}
      </Button>
    );
  }

  return (
    <div role="alertdialog" aria-label="Confirm" className={['border-l-2 py-1 pl-4', danger ? 'border-danger' : 'border-ink'].join(' ')}>
      <div className={danger ? 'text-danger' : ''}>{message}</div>
      <div className="mt-3 flex flex-wrap gap-3">
        <Button
          busy={busy}
          className={danger ? '!bg-danger hover:!bg-danger/85' : ''}
          onClick={async () => {
            setBusy(true);
            try {
              await onConfirm();
            } finally {
              setBusy(false);
              setAsking(false);
            }
          }}
          autoFocus
        >
          {confirmLabel}
        </Button>
        <Button variant="secondary" disabled={busy} onClick={() => setAsking(false)}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

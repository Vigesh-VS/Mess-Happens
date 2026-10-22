import { Link } from 'react-router';
import { useAuth } from '../../auth/AuthContext';
import { Notice } from '../ui/Notice';

/** The week can't be guessed — ask an admin to configure it. */
export function CalendarMissing() {
  const { state } = useAuth();
  const isAdmin = state.status === 'signedIn' && state.isAdmin;
  return (
    <Notice title="Menu week not configured">
      The mess hasn’t set which week is odd or even yet, so the regular menu can’t be shown.{' '}
      {isAdmin ? (
        <Link to="/admin/menus" className="text-ink underline underline-offset-4">
          Set it now
        </Link>
      ) : (
        'Please check back later.'
      )}
    </Notice>
  );
}

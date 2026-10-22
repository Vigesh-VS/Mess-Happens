import { useEffect, useState } from 'react';
import type { DateId } from '../models';
import { messDateOf } from '../lib/messDate';

/** Today's mess date in the mess timezone; rolls over at midnight there, even if the tab stays open. */
export function useMessToday(timeZone: string): DateId {
  const [today, setToday] = useState(() => messDateOf(new Date(), timeZone));

  useEffect(() => {
    const update = () => setToday(messDateOf(new Date(), timeZone));
    update();
    const id = window.setInterval(update, 30_000);
    document.addEventListener('visibilitychange', update);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', update);
    };
  }, [timeZone]);

  return today;
}

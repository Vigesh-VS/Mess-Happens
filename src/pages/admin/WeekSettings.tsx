import { useState, type FormEvent } from 'react';
import { ArrowLeftRight } from 'lucide-react';
import { DEFAULT_TIMEZONE, isDateId, type AcademicCalendar, type Parity } from '../../models';
import { useMessData } from '../../data/MessDataContext';
import { saveCalendar, switchParity, type CalendarInput } from '../../data/adminWrites';
import { useMessToday } from '../../hooks/useMessToday';
import { addDays, flipParity, formatDateId, parityOf, weekStart } from '../../lib/messDate';
import { Button } from '../../components/ui/Button';
import { ConfirmAction } from '../../components/ui/ConfirmAction';
import { Segmented } from '../../components/ui/Segmented';
import { TextField } from '../../components/ui/TextField';
import { SaveStatusLine } from './SaveStatusLine';
import { useActor, useSave } from './useAdmin';

/** What the mess confirmed on 22 Oct 2026: weeks start Sunday; the week of 18 Oct 2026 is EVEN. */
const CONFIRMED_START: CalendarInput = {
  referenceDate: '2026-10-18',
  referenceParity: 'even',
  weekStartsOn: 'sunday',
  timezone: DEFAULT_TIMEZONE,
};

function weekRange(start: string): string {
  const fmt = (d: string) => formatDateId(d, { day: 'numeric', month: 'short' });
  return `${fmt(start)} – ${fmt(addDays(start, 6))}`;
}

/**
 * The odd/even switch + the full calendar setting. Changes apply to everyone immediately.
 * `compact` shows just the switch (used on the admin overview).
 */
export function WeekSettings({ compact = false }: { compact?: boolean }) {
  const { calendar, timezone } = useMessData();
  const today = useMessToday(timezone);
  const actor = useActor();
  const { status, run } = useSave();

  if (!calendar) return <CalendarForm initial={CONFIRMED_START} before={null} firstTime />;

  const current = parityOf(today, calendar);
  const next = flipParity(current);
  const start = weekStart(today, calendar.weekStartsOn);

  return (
    <div>
      <p className="label">This week · {weekRange(start)}</p>
      <p className="mt-2 text-display uppercase">{current}</p>
      <p className="mt-2 max-w-prose text-muted">
        Students now see the <strong className="text-ink">{current}-week</strong> menu. Next week is {next}.
      </p>

      <div className="mt-6">
        <ConfirmAction
          variant="primary"
          icon={<ArrowLeftRight aria-hidden className="size-4" />}
          confirmLabel={`Yes, switch to ${next}`}
          message={
            <p>
              Make this week <strong>{next.toUpperCase()}</strong> for everyone? Every week flips with it — next week becomes {current}. You can
              switch back at any time.
            </p>
          }
          onConfirm={async () => {
            await run(() => switchParity(actor, calendar, today), `Switched — this week is now ${next.toUpperCase()} for everyone.`);
          }}
        >
          Switch to {next} week
        </ConfirmAction>
        <div className="mt-3">
          <SaveStatusLine status={status} />
        </div>
      </div>

      {compact ? null : (
        <details className="mt-8 border-t border-line pt-4">
          <summary className="min-h-11 cursor-pointer text-sm font-semibold">Advanced calendar settings</summary>
          <CalendarForm initial={calendar} before={calendar} />
        </details>
      )}
    </div>
  );
}

function CalendarForm({ initial, before, firstTime = false }: { initial: CalendarInput; before: AcademicCalendar | null; firstTime?: boolean }) {
  const actor = useActor();
  const { status, run } = useSave();
  const [referenceDate, setReferenceDate] = useState(initial.referenceDate);
  const [referenceParity, setReferenceParity] = useState<Parity>(initial.referenceParity);
  const [weekStartsOn, setWeekStartsOn] = useState(initial.weekStartsOn);
  const [timezone, setTimezone] = useState(initial.timezone);

  const tzValid = (() => {
    try {
      new Intl.DateTimeFormat('en', { timeZone: timezone });
      return true;
    } catch {
      return false;
    }
  })();
  const valid = isDateId(referenceDate) && tzValid;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!valid) return;
    void run(() => saveCalendar(actor, { referenceDate, referenceParity, weekStartsOn, timezone }, before), 'Calendar saved. Everyone now sees the matching menu.');
  }

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-6">
      {firstTime ? (
        <div>
          <p className="label">Menu week not configured</p>
          <p className="mt-2 max-w-prose text-muted">
            Students can’t see the regular menu until this is saved. Prefilled with what the mess confirmed: weeks start on Sunday and the week of 18
            October 2026 is an even week.
          </p>
        </div>
      ) : null}
      <TextField
        label="A date in a known week"
        type="date"
        value={referenceDate}
        onChange={(e) => setReferenceDate(e.target.value)}
        error={isDateId(referenceDate) ? undefined : 'Pick a date.'}
      />
      <div>
        <p className="label mb-2">That week is</p>
        <Segmented label="That week is" value={referenceParity} onChange={setReferenceParity} options={[{ value: 'odd', label: 'Odd' }, { value: 'even', label: 'Even' }]} />
      </div>
      <div>
        <p className="label mb-2">Weeks start on</p>
        <Segmented label="Weeks start on" value={weekStartsOn} onChange={setWeekStartsOn} options={[{ value: 'sunday', label: 'Sunday' }, { value: 'monday', label: 'Monday' }]} />
      </div>
      <TextField label="Mess timezone" value={timezone} onChange={(e) => setTimezone(e.target.value)} error={tzValid ? undefined : 'Not a valid IANA timezone, e.g. Asia/Kolkata.'} />
      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" disabled={!valid} busy={status.kind === 'saving'}>
          {firstTime ? 'Save and publish' : 'Save calendar'}
        </Button>
        <SaveStatusLine status={status} />
      </div>
    </form>
  );
}

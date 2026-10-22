import { ComingInPhase } from '../components/ui/ComingInPhase';
import { PageHeader } from '../components/ui/PageHeader';
import { formatMessDate } from '../lib/messDate';

export function TodayPage() {
  const { weekday, date } = formatMessDate(new Date());
  return (
    <>
      <PageHeader eyebrow={date} title={weekday} />
      <ComingInPhase phase={2}>
        Today’s menu — breakfast, lunch, snacks and dinner — for the current odd/even week. Quantity controls arrive in
        Phase 4.
      </ComingInPhase>
    </>
  );
}

import { ComingInPhase } from '../components/ui/ComingInPhase';
import { PageHeader } from '../components/ui/PageHeader';

export function HistoryPage() {
  return (
    <>
      <PageHeader eyebrow="Past days" title="History" />
      <ComingInPhase phase={4}>Your previous days, with totals frozen at the nutrition values you logged.</ComingInPhase>
    </>
  );
}

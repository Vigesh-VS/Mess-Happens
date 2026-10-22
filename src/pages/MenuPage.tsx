import { ComingInPhase } from '../components/ui/ComingInPhase';
import { PageHeader } from '../components/ui/PageHeader';

export function MenuPage() {
  return (
    <>
      <PageHeader eyebrow="Odd and even weeks" title="Menu" />
      <ComingInPhase phase={2}>Browse any day of the odd and even week menus, and date-specific changes.</ComingInPhase>
    </>
  );
}

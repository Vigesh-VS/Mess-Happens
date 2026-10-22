import { ComingInPhase } from '../components/ui/ComingInPhase';
import { PageHeader } from '../components/ui/PageHeader';

export function SummaryPage() {
  return (
    <>
      <PageHeader eyebrow="Today’s intake" title="Summary" />
      <ComingInPhase phase={4}>Calories, protein, carbohydrates, fat and fiber against your targets, meal by meal.</ComingInPhase>
    </>
  );
}

import { ComingInPhase } from '../../components/ui/ComingInPhase';
import { PageHeader } from '../../components/ui/PageHeader';

export default function FoodEditorPage() {
  return (
    <>
      <PageHeader eyebrow="Admin" title="Foods" />
      <ComingInPhase phase={3}>
        Search, add and edit foods and their nutrition. Every edit is versioned so logged history never changes.
      </ComingInPhase>
    </>
  );
}

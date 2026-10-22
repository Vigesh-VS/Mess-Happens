import { ComingInPhase } from '../../components/ui/ComingInPhase';
import { PageHeader } from '../../components/ui/PageHeader';

export default function MenuEditorPage() {
  return (
    <>
      <PageHeader eyebrow="Admin" title="Menus" />
      <ComingInPhase phase={2}>
        Academic-week reference date, odd/even weekly menus, and date-specific overrides — with preview and an audit trail.
      </ComingInPhase>
    </>
  );
}

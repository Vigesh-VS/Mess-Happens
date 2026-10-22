import { useSearchParams } from 'react-router';
import { useMessData } from '../../data/MessDataContext';
import { LoadingScreen } from '../../components/ui/LoadingScreen';
import { PageHeader } from '../../components/ui/PageHeader';
import { Segmented } from '../../components/ui/Segmented';
import { OverridesEditor } from './OverridesEditor';
import { WeekSettings } from './WeekSettings';
import { WeeklyMenuEditor } from './WeeklyMenuEditor';

type Tab = 'week' | 'weekly' | 'dates';

export default function MenuEditorPage() {
  const data = useMessData();
  const [params, setParams] = useSearchParams();
  const tab = (['week', 'weekly', 'dates'] as const).find((t) => t === params.get('tab')) ?? 'week';

  return (
    <>
      <PageHeader eyebrow="Admin" title="Menus" />
      <div className="mt-8">
        <Segmented<Tab>
          label="Section"
          value={tab}
          onChange={(t) => setParams({ tab: t }, { replace: true })}
          options={[
            { value: 'week', label: 'Odd / even week' },
            { value: 'weekly', label: 'Weekly menu' },
            { value: 'dates', label: 'Date changes' },
          ]}
        />
      </div>
      <div className="mt-10">
        {!data.ready ? (
          <LoadingScreen />
        ) : tab === 'week' ? (
          <WeekSettings />
        ) : tab === 'weekly' ? (
          <WeeklyMenuEditor />
        ) : (
          <OverridesEditor />
        )}
      </div>
    </>
  );
}

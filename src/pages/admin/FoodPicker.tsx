import { useId, useMemo, useState } from 'react';
import type { CatalogFood } from '../../models';

interface FoodPickerProps {
  foods: Record<string, CatalogFood>;
  label: string;
  onPick: (foodId: string) => void;
  onCancel?: () => void;
  exclude?: Set<string>;
}

/** Search-as-you-type list of catalog foods. */
export function FoodPicker({ foods, label, onPick, onCancel, exclude }: FoodPickerProps) {
  const [query, setQuery] = useState('');
  const inputId = useId();
  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return Object.values(foods)
      .filter((f) => !exclude?.has(f.id))
      .filter((f) => !q || f.name.toLowerCase().includes(q) || f.id.includes(q))
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, 8);
  }, [foods, query, exclude]);

  return (
    <div className="border border-ink p-3">
      <label htmlFor={inputId} className="label block">
        {label}
      </label>
      <input
        id={inputId}
        autoFocus
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onCancel?.();
          if (e.key === 'Enter' && matches[0]) onPick(matches[0].id);
        }}
        placeholder="Type to search foods"
        className="mt-2 block min-h-11 w-full border-0 border-b border-line bg-transparent px-0 outline-none focus:border-ink"
      />
      <ul className="mt-2 divide-y divide-line">
        {matches.map((f) => (
          <li key={f.id}>
            <button type="button" onClick={() => onPick(f.id)} className="flex min-h-11 w-full items-center justify-between gap-3 text-left hover:bg-hover">
              <span className="font-semibold">{f.name}</span>
              <span className="text-xs text-muted">{f.category}</span>
            </button>
          </li>
        ))}
        {matches.length === 0 ? <li className="py-3 text-sm text-muted">No foods match. Add it in Foods first.</li> : null}
      </ul>
      {onCancel ? (
        <button type="button" onClick={onCancel} className="mt-2 min-h-11 text-sm text-muted underline-offset-4 hover:text-ink hover:underline">
          Cancel
        </button>
      ) : null}
    </div>
  );
}

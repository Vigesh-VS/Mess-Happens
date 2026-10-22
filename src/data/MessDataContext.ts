import { createContext, useContext } from 'react';
import type {
  AcademicCalendar,
  CatalogFood,
  DateId,
  DayMenu,
  MenuConfig,
  MenuOverride,
  SpecialMenu,
} from '../models';

export interface MessData {
  /** True once every listener has delivered its first snapshot (cache or server). */
  ready: boolean;
  /** First listener error, e.g. rules not deployed or signed out. */
  error: string | null;
  foods: Record<string, CatalogFood>;
  menus: Record<string, DayMenu>;
  specials: Record<string, SpecialMenu>;
  overrides: Record<DateId, MenuOverride>;
  /** null = not configured yet (the app must not guess the week). */
  calendar: AcademicCalendar | null;
  menuConfig: MenuConfig | null;
  /** The mess timezone (from the calendar, else the default). */
  timezone: string;
}

export const MessDataContext = createContext<MessData | null>(null);

export function useMessData(): MessData {
  const ctx = useContext(MessDataContext);
  if (!ctx) throw new Error('useMessData must be used inside <MessDataProvider>');
  return ctx;
}

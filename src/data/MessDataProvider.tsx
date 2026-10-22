import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { FirebaseError } from 'firebase/app';
import { collection, doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/client';
import {
  DEFAULT_TIMEZONE,
  type AcademicCalendar,
  type CatalogFood,
  type DayMenu,
  type FoodCatalog,
  type MenuConfig,
  type MenuOverride,
  type SpecialMenu,
} from '../models';
import { MessDataContext, type MessData } from './MessDataContext';

type Slice = 'foods' | 'menus' | 'specials' | 'overrides' | 'calendar' | 'menuConfig';
const SLICES: Slice[] = ['foods', 'menus', 'specials', 'overrides', 'calendar', 'menuConfig'];

function describeError(err: unknown): string {
  if (err instanceof FirebaseError && err.code === 'permission-denied') {
    return 'Permission denied while loading the menu. If this is a new Firebase project, deploy the Security Rules.';
  }
  return err instanceof Error ? err.message : String(err);
}

/**
 * Live listeners for everything the menu screens need. Admin edits reach every open
 * device within seconds; offline devices show the cached copy and catch up on reconnect.
 * Cost per cold start ≈ 1 (catalog) + 14 (menus) + specials + overrides + 2 (config) reads.
 */
export function MessDataProvider({ children }: { children: ReactNode }) {
  const [foods, setFoods] = useState<Record<string, CatalogFood>>({});
  const [menus, setMenus] = useState<Record<string, DayMenu>>({});
  const [specials, setSpecials] = useState<Record<string, SpecialMenu>>({});
  const [overrides, setOverrides] = useState<Record<string, MenuOverride>>({});
  const [calendar, setCalendar] = useState<AcademicCalendar | null>(null);
  const [menuConfig, setMenuConfig] = useState<MenuConfig | null>(null);
  const [received, setReceived] = useState<ReadonlySet<Slice>>(new Set());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const got = (slice: Slice) => setReceived((prev) => (prev.has(slice) ? prev : new Set(prev).add(slice)));
    const fail = (slice: Slice) => (err: unknown) => {
      console.error(`Listener ${slice} failed`, err);
      setError((prev) => prev ?? describeError(err));
      got(slice);
    };

    const unsubs = [
      onSnapshot(
        doc(db, 'catalog', 'foods'),
        (snap) => {
          const data = snap.data() as FoodCatalog | undefined;
          setFoods(Object.fromEntries(Object.entries(data?.foods ?? {}).map(([id, f]) => [id, { ...f, id }])));
          got('foods');
        },
        fail('foods'),
      ),
      onSnapshot(
        collection(db, 'menus'),
        (snap) => {
          setMenus(Object.fromEntries(snap.docs.map((d) => [d.id, d.data() as DayMenu])));
          got('menus');
        },
        fail('menus'),
      ),
      onSnapshot(
        collection(db, 'specialMenus'),
        (snap) => {
          setSpecials(Object.fromEntries(snap.docs.map((d) => [d.id, d.data() as SpecialMenu])));
          got('specials');
        },
        fail('specials'),
      ),
      onSnapshot(
        collection(db, 'menuOverrides'),
        (snap) => {
          setOverrides(Object.fromEntries(snap.docs.map((d) => [d.id, d.data() as MenuOverride])));
          got('overrides');
        },
        fail('overrides'),
      ),
      onSnapshot(
        doc(db, 'config', 'academicCalendar'),
        (snap) => {
          setCalendar(snap.exists() ? (snap.data() as AcademicCalendar) : null);
          got('calendar');
        },
        fail('calendar'),
      ),
      onSnapshot(
        doc(db, 'config', 'menu'),
        (snap) => {
          setMenuConfig(snap.exists() ? (snap.data() as MenuConfig) : null);
          got('menuConfig');
        },
        fail('menuConfig'),
      ),
    ];
    return () => unsubs.forEach((u) => u());
  }, []);

  const value = useMemo<MessData>(
    () => ({
      ready: SLICES.every((s) => received.has(s)),
      error,
      foods,
      menus,
      specials,
      overrides,
      calendar,
      menuConfig,
      timezone: calendar?.timezone || DEFAULT_TIMEZONE,
    }),
    [received, error, foods, menus, specials, overrides, calendar, menuConfig],
  );

  return <MessDataContext.Provider value={value}>{children}</MessDataContext.Provider>;
}

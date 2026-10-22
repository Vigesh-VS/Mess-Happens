// Every admin change is one atomic batch: the change itself + an adminAuditLogs entry.
// Security Rules re-check the admin claim and the data shape on the server.
import {
  FieldPath,
  collection,
  deleteField,
  doc,
  runTransaction,
  serverTimestamp,
  writeBatch,
  type WriteBatch,
} from 'firebase/firestore';
import { db } from '../firebase/client';
import {
  menuDocId,
  toCatalogEntry,
  type AcademicCalendar,
  type DateId,
  type Food,
  type Meal,
  type MealMenu,
  type MenuOverride,
  type Parity,
  type Weekday,
} from '../models';
import { flipParity, parityOf, weekStart } from '../lib/messDate';

export interface Actor {
  uid: string;
  email: string | null;
}

/** JSON round-trip: drops undefined and turns Timestamps into plain objects for the audit log. */
function plain(value: unknown): unknown {
  return value === undefined ? null : (JSON.parse(JSON.stringify(value)) as unknown);
}

function audit(batch: WriteBatch, actor: Actor, action: string, target: { collection: string; id: string }, before: unknown, after: unknown) {
  batch.set(doc(collection(db, 'adminAuditLogs')), {
    actorUid: actor.uid,
    actorEmail: actor.email,
    action,
    target,
    before: plain(before),
    after: plain(after),
    at: serverTimestamp(),
  });
}

// ---------- academic calendar ----------

export type CalendarInput = Pick<AcademicCalendar, 'referenceDate' | 'referenceParity' | 'weekStartsOn' | 'timezone'>;

export async function saveCalendar(actor: Actor, input: CalendarInput, before: AcademicCalendar | null): Promise<void> {
  const batch = writeBatch(db);
  const after = { ...input, updatedAt: serverTimestamp(), updatedBy: actor.uid };
  batch.set(doc(db, 'config', 'academicCalendar'), after);
  audit(batch, actor, 'calendar.update', { collection: 'config', id: 'academicCalendar' }, before, input);
  await batch.commit();
}

/**
 * The "switch" button: make the current week the other parity. Re-anchors the reference to
 * this week so the meaning is obvious in the audit log ("week of X is now odd").
 */
export async function switchParity(actor: Actor, calendar: AcademicCalendar, today: DateId): Promise<Parity> {
  const next = flipParity(parityOf(today, calendar));
  await saveCalendar(
    actor,
    {
      referenceDate: weekStart(today, calendar.weekStartsOn),
      referenceParity: next,
      weekStartsOn: calendar.weekStartsOn,
      timezone: calendar.timezone,
    },
    calendar,
  );
  return next;
}

// ---------- weekly menus ----------

export async function publishDayMenu(
  actor: Actor,
  parity: Parity,
  weekday: Weekday,
  meals: Partial<Record<Meal, MealMenu>>,
  before: unknown,
): Promise<void> {
  const id = menuDocId(parity, weekday);
  const batch = writeBatch(db);
  batch.set(doc(db, 'menus', id), { parity, weekday, meals, updatedAt: serverTimestamp(), updatedBy: actor.uid });
  audit(batch, actor, 'menu.update', { collection: 'menus', id }, before, meals);
  await batch.commit();
}

// ---------- date overrides ----------

export type OverrideInput = Pick<MenuOverride, 'reason' | 'meals' | 'varieties'>;

export async function saveOverride(actor: Actor, date: DateId, input: OverrideInput, before: MenuOverride | null): Promise<void> {
  const batch = writeBatch(db);
  batch.set(doc(db, 'menuOverrides', date), {
    reason: input.reason.trim(),
    meals: input.meals,
    varieties: input.varieties ?? {},
    updatedAt: serverTimestamp(),
    updatedBy: actor.uid,
  });
  audit(batch, actor, before ? 'override.update' : 'override.create', { collection: 'menuOverrides', id: date }, before, input);
  await batch.commit();
}

export async function deleteOverride(actor: Actor, date: DateId, before: MenuOverride): Promise<void> {
  const batch = writeBatch(db);
  batch.delete(doc(db, 'menuOverrides', date));
  audit(batch, actor, 'override.delete', { collection: 'menuOverrides', id: date }, before, null);
  await batch.commit();
}

// ---------- foods ----------

/** Editable food fields (server fields like version/timestamps are handled here). */
export type FoodInput = Omit<Food, 'id' | 'nameLower' | 'version' | 'createdAt' | 'updatedAt' | 'updatedBy'>;

export class FoodConflictError extends Error {}

/**
 * Creates or edits a food. An edit archives the previous version to foods/{id}/history/{v},
 * bumps `version`, updates the catalog and writes the audit log — all in one transaction,
 * so a concurrent edit by another admin fails cleanly instead of being lost.
 */
export async function saveFood(actor: Actor, id: string, input: FoodInput, mode: 'create' | 'update', expectedVersion?: number): Promise<void> {
  const foodRef = doc(db, 'foods', id);
  const catalogRef = doc(db, 'catalog', 'foods');

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(foodRef);
    const base = { ...input, nameLower: input.name.toLowerCase(), updatedAt: serverTimestamp(), updatedBy: actor.uid };
    const auditRef = doc(collection(db, 'adminAuditLogs'));
    const auditBase = { actorUid: actor.uid, actorEmail: actor.email, target: { collection: 'foods', id }, at: serverTimestamp() };

    if (mode === 'create') {
      if (snap.exists()) throw new FoodConflictError(`A food with id "${id}" already exists.`);
      const created = { ...base, version: 1, createdAt: serverTimestamp() };
      tx.set(foodRef, created);
      tx.update(catalogRef, new FieldPath('foods', id), { ...input, version: 1 }, 'updatedAt', serverTimestamp(), 'updatedBy', actor.uid);
      tx.set(auditRef, { ...auditBase, action: 'food.create', before: null, after: plain(input) });
      return;
    }

    if (!snap.exists()) throw new FoodConflictError('This food was deleted by someone else.');
    const current = snap.data() as Omit<Food, 'id'>;
    if (expectedVersion !== undefined && current.version !== expectedVersion) {
      throw new FoodConflictError('Someone else edited this food while you were editing. Reload it and try again.');
    }
    const version = current.version + 1;
    tx.set(doc(db, 'foods', id, 'history', String(current.version)), { ...current, archivedAt: serverTimestamp(), archivedBy: actor.uid });
    tx.set(foodRef, { ...base, version, createdAt: current.createdAt });
    tx.update(catalogRef, new FieldPath('foods', id), { ...input, version }, 'updatedAt', serverTimestamp(), 'updatedBy', actor.uid);
    tx.set(auditRef, { ...auditBase, action: 'food.update', before: plain(toCatalogEntry(current)), after: plain(input) });
  });
}

export async function deleteFood(actor: Actor, id: string, before: unknown): Promise<void> {
  const batch = writeBatch(db);
  batch.delete(doc(db, 'foods', id));
  batch.update(doc(db, 'catalog', 'foods'), new FieldPath('foods', id), deleteField(), 'updatedAt', serverTimestamp(), 'updatedBy', actor.uid);
  audit(batch, actor, 'food.delete', { collection: 'foods', id }, before, null);
  await batch.commit();
}

/** "Paneer Butter Masala" → "paneer-butter-masala" */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

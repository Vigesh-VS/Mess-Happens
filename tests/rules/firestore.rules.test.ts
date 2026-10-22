// Security Rules tests. Run with `npm run test:rules` (starts the Firestore emulator).
import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
  addDoc,
  collection,
  FieldPath,
  deleteDoc,
  doc,
  getCountFromServer,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
  type Firestore,
} from 'firebase/firestore';

let env: RulesTestEnvironment;

// The test library returns a compat instance; the modular API accepts it.
const asUser = (uid: string) => env.authenticatedContext(uid, { email: `${uid}@example.com` }).firestore() as unknown as Firestore;
const asAdmin = () => env.authenticatedContext('admin1', { email: 'admin@example.com', admin: true }).firestore() as unknown as Firestore;
const asGuest = () => env.unauthenticatedContext().firestore() as unknown as Firestore;

const nutrition = {
  basis: { quantity: 100, unit: 'g' },
  calories_kcal: 130,
  protein_g: 2.5,
  carbohydrates_g: 28,
  fat_g: 0.3,
  fiber_g: 0.4,
  sugar_g: null,
};

function foodData(uid: string, version: number, overrides: Record<string, unknown> = {}) {
  return {
    name: 'Plain Rice',
    nameLower: 'plain rice',
    category: 'rice',
    servingSize: 150,
    servingUnit: 'g',
    quantityStep: 50,
    trackable: true,
    nutrition,
    verificationStatus: 'estimated',
    dataSource: 'Estimate',
    version,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    updatedBy: uid,
    ...overrides,
  };
}

function profile(overrides: Record<string, unknown> = {}) {
  return {
    displayName: 'Alice',
    email: 'alice@example.com',
    targets: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    ...overrides,
  };
}

const zeroTotals = { kcal: 0, protein_g: 0, carbohydrates_g: 0, fat_g: 0, fiber_g: 0 };

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-mess-tracker',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  });
});

afterAll(async () => {
  await env?.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore() as unknown as Firestore;
    await setDoc(doc(db, 'foods/plain-rice'), { ...foodData('seed', 1), createdAt: new Date(), updatedAt: new Date() });
    await setDoc(doc(db, 'menus/odd_monday'), { parity: 'odd', weekday: 'monday', meals: {}, updatedAt: new Date(), updatedBy: 'seed' });
    await setDoc(doc(db, 'config/menu'), { mealOrder: [], choiceGroups: {}, updatedAt: new Date(), updatedBy: 'seed' });
    await setDoc(doc(db, 'users/alice'), { ...profile(), createdAt: new Date(), updatedAt: new Date() });
    await setDoc(doc(db, 'adminAuditLogs/log1'), { actorUid: 'admin1', actorEmail: null, action: 'x', target: {}, before: null, after: null, at: new Date() });
  });
});

describe('signed-out visitors', () => {
  it('can read the published menu: menus, catalog, special menus, date changes, config', async () => {
    const db = asGuest();
    await assertSucceeds(getDoc(doc(db, 'menus/odd_monday')));
    await assertSucceeds(getDoc(doc(db, 'catalog/foods')));
    await assertSucceeds(getDoc(doc(db, 'specialMenus/special-dinner')));
    await assertSucceeds(getDoc(doc(db, 'menuOverrides/2026-10-22')));
    await assertSucceeds(getDoc(doc(db, 'config/menu')));
    await assertSucceeds(getDoc(doc(db, 'config/academicCalendar')));
  });

  it('cannot change anything or see private data', async () => {
    const db = asGuest();
    await assertFails(setDoc(doc(db, 'menus/odd_monday'), { parity: 'odd', weekday: 'monday', meals: {}, updatedAt: serverTimestamp(), updatedBy: 'x' }));
    await assertFails(setDoc(doc(db, 'catalog/foods'), { foods: {}, updatedAt: serverTimestamp(), updatedBy: 'x' }));
    await assertFails(getDoc(doc(db, 'foods/plain-rice')));
    await assertFails(getDoc(doc(db, 'users/alice')));
    await assertFails(getDoc(doc(db, 'users/alice/days/2026-10-22')));
    await assertFails(setDoc(doc(db, 'users/alice/days/2026-10-22'), { entries: {}, totals: zeroTotals, updatedAt: serverTimestamp() }));
    await assertFails(getDoc(doc(db, 'adminAuditLogs/log1')));
  });
});

describe('shared menu data', () => {
  it('signed-in users can read foods, menus, overrides and config', async () => {
    const db = asUser('alice');
    await assertSucceeds(getDoc(doc(db, 'foods/plain-rice')));
    await assertSucceeds(getCountFromServer(collection(db, 'foods')));
    await assertSucceeds(getDoc(doc(db, 'menus/odd_monday')));
    await assertSucceeds(getDoc(doc(db, 'menuOverrides/2026-10-22')));
    await assertSucceeds(getDoc(doc(db, 'config/academicCalendar')));
  });

  it('normal users cannot write foods, menus, overrides or config', async () => {
    const db = asUser('alice');
    await assertFails(setDoc(doc(db, 'foods/new-food'), foodData('alice', 1)));
    await assertFails(updateDoc(doc(db, 'foods/plain-rice'), { name: 'Hacked' }));
    await assertFails(deleteDoc(doc(db, 'foods/plain-rice')));
    await assertFails(setDoc(doc(db, 'menus/odd_monday'), { parity: 'odd', weekday: 'monday', meals: {}, updatedAt: serverTimestamp(), updatedBy: 'alice' }));
    await assertFails(setDoc(doc(db, 'menuOverrides/2026-10-22'), { reason: 'x', meals: {}, updatedAt: serverTimestamp(), updatedBy: 'alice' }));
    await assertFails(setDoc(doc(db, 'config/academicCalendar'), {
      referenceDate: '2026-10-19', referenceParity: 'odd', weekStartsOn: 'monday', timezone: 'Asia/Kolkata',
      updatedAt: serverTimestamp(), updatedBy: 'alice',
    }));
  });

  it('a self-made "admin" field in the token payload is not enough without the claim', async () => {
    const db = env.authenticatedContext('mallory', { admin: false }).firestore() as unknown as Firestore;
    await assertFails(setDoc(doc(db, 'foods/new-food'), foodData('mallory', 1)));
  });
});

describe('admin: academic calendar and menus', () => {
  it('can configure the academic calendar with valid values', async () => {
    await assertSucceeds(setDoc(doc(asAdmin(), 'config/academicCalendar'), {
      referenceDate: '2026-10-19', referenceParity: 'odd', weekStartsOn: 'sunday', timezone: 'Asia/Kolkata',
      updatedAt: serverTimestamp(), updatedBy: 'admin1',
    }));
  });

  it('rejects an invalid calendar', async () => {
    await assertFails(setDoc(doc(asAdmin(), 'config/academicCalendar'), {
      referenceDate: '19/10/2026', referenceParity: 'third', weekStartsOn: 'monday', timezone: 'Asia/Kolkata',
      updatedAt: serverTimestamp(), updatedBy: 'admin1',
    }));
  });

  it('can edit a weekly menu, but the id must match parity and weekday', async () => {
    const db = asAdmin();
    await assertSucceeds(setDoc(doc(db, 'menus/odd_monday'), {
      parity: 'odd', weekday: 'monday', meals: { lunch: { items: [{ foodId: 'plain-rice' }] } },
      updatedAt: serverTimestamp(), updatedBy: 'admin1',
    }));
    await assertFails(setDoc(doc(db, 'menus/odd_monday'), {
      parity: 'even', weekday: 'monday', meals: {}, updatedAt: serverTimestamp(), updatedBy: 'admin1',
    }));
    await assertFails(setDoc(doc(db, 'menus/odd_funday'), {
      parity: 'odd', weekday: 'funday', meals: {}, updatedAt: serverTimestamp(), updatedBy: 'admin1',
    }));
  });

  it('can create and delete a date override; ids must be dates', async () => {
    const db = asAdmin();
    const override = { reason: 'Diwali', meals: { dinner: { special: 'special-dinner', combination: 'A' } }, updatedAt: serverTimestamp(), updatedBy: 'admin1' };
    await assertSucceeds(setDoc(doc(db, 'menuOverrides/2026-11-08'), override));
    await assertSucceeds(deleteDoc(doc(db, 'menuOverrides/2026-11-08')));
    await assertFails(setDoc(doc(db, 'menuOverrides/next-friday'), override));
  });

  it('must stamp writes with its own uid', async () => {
    await assertFails(setDoc(doc(asAdmin(), 'config/menu'), { mealOrder: [], choiceGroups: {}, updatedAt: serverTimestamp(), updatedBy: 'someone-else' }));
  });
});

describe('admin: foods and versioning', () => {
  it('can create a valid food at version 1', async () => {
    await assertSucceeds(setDoc(doc(asAdmin(), 'foods/jeera-rice'), foodData('admin1', 1, { name: 'Jeera Rice', nameLower: 'jeera rice' })));
  });

  it('rejects invalid foods (negative nutrition, bad unit, unknown field)', async () => {
    const db = asAdmin();
    await assertFails(setDoc(doc(db, 'foods/bad-1'), foodData('admin1', 1, { nutrition: { ...nutrition, protein_g: -1 } })));
    await assertFails(setDoc(doc(db, 'foods/bad-2'), foodData('admin1', 1, { servingUnit: 'bucket' })));
    await assertFails(setDoc(doc(db, 'foods/bad-3'), foodData('admin1', 1, { secret: true })));
    await assertFails(setDoc(doc(db, 'foods/bad-4'), foodData('admin1', 1, { nameLower: 'not matching' })));
  });

  it('an edit must archive the previous version in the same batch', async () => {
    const db = asAdmin();
    const ref = doc(db, 'foods/plain-rice');
    const current = (await getDoc(ref)).data()!;

    // Without history → denied.
    await assertFails(updateDoc(ref, { version: 2, updatedAt: serverTimestamp(), updatedBy: 'admin1' }));

    // With history/1 in the same batch → allowed.
    const batch = writeBatch(db);
    batch.set(doc(db, 'foods/plain-rice/history/1'), { ...current, archivedAt: serverTimestamp(), archivedBy: 'admin1' });
    batch.update(ref, { 'nutrition.calories_kcal': 140, version: 2, updatedAt: serverTimestamp(), updatedBy: 'admin1' });
    await assertSucceeds(batch.commit());
  });

  it('accepts the Food Editor’s full batch: history + food + catalog + audit log', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore() as unknown as Firestore, 'catalog/foods'), { foods: {}, updatedAt: new Date(), updatedBy: 'seed' });
    });
    const db = asAdmin();
    const current = (await getDoc(doc(db, 'foods/plain-rice'))).data()!;
    const batch = writeBatch(db);
    batch.set(doc(db, 'foods/plain-rice/history/1'), { ...current, archivedAt: serverTimestamp(), archivedBy: 'admin1' });
    batch.set(doc(db, 'foods/plain-rice'), { ...foodData('admin1', 2, { verificationStatus: 'verified' }), createdAt: current.createdAt });
    batch.update(doc(db, 'catalog/foods'), new FieldPath('foods', 'plain-rice'), { name: 'Plain Rice', version: 2 }, 'updatedAt', serverTimestamp(), 'updatedBy', 'admin1');
    batch.set(doc(collection(db, 'adminAuditLogs')), {
      actorUid: 'admin1', actorEmail: 'admin@example.com', action: 'food.update',
      target: { collection: 'foods', id: 'plain-rice' }, before: null, after: null, at: serverTimestamp(),
    });
    await assertSucceeds(batch.commit());
  });

  it('a second edit of the same version is rejected (history/1 already exists)', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore() as unknown as Firestore, 'foods/plain-rice/history/1'), { name: 'old' });
    });
    const db = asAdmin();
    const batch = writeBatch(db);
    batch.set(doc(db, 'foods/plain-rice/history/1'), { name: 'stale', archivedAt: serverTimestamp(), archivedBy: 'admin1' });
    batch.update(doc(db, 'foods/plain-rice'), { version: 2, updatedAt: serverTimestamp(), updatedBy: 'admin1' });
    await assertFails(batch.commit());
  });

  it('history is immutable and hidden from normal users', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore() as unknown as Firestore, 'foods/plain-rice/history/1'), { name: 'old' });
    });
    await assertFails(getDoc(doc(asUser('alice'), 'foods/plain-rice/history/1')));
    await assertSucceeds(getDoc(doc(asAdmin(), 'foods/plain-rice/history/1')));
    await assertFails(updateDoc(doc(asAdmin(), 'foods/plain-rice/history/1'), { name: 'rewritten' }));
    await assertFails(deleteDoc(doc(asAdmin(), 'foods/plain-rice/history/1')));
  });
});

describe('food catalog', () => {
  const catalog = (uid: string) => ({ foods: { rice: { name: 'Plain Rice' } }, updatedAt: serverTimestamp(), updatedBy: uid });

  it('anyone can read it; only admins can write it', async () => {
    await assertSucceeds(getDoc(doc(asUser('alice'), 'catalog/foods')));
    await assertSucceeds(getDoc(doc(asGuest(), 'catalog/foods')));
    await assertFails(setDoc(doc(asUser('alice'), 'catalog/foods'), catalog('alice')));
    await assertSucceeds(setDoc(doc(asAdmin(), 'catalog/foods'), catalog('admin1')));
    await assertFails(setDoc(doc(asAdmin(), 'catalog/foods'), { ...catalog('admin1'), extra: 1 }));
  });

  it('other catalog documents are denied', async () => {
    await assertFails(setDoc(doc(asAdmin(), 'catalog/other'), catalog('admin1')));
  });
});

describe('user profiles', () => {
  it('a user can create and read only their own profile', async () => {
    await assertSucceeds(setDoc(doc(asUser('bob'), 'users/bob'), profile({ displayName: 'Bob', email: 'bob@example.com' })));
    await assertSucceeds(getDoc(doc(asUser('alice'), 'users/alice')));
    await assertFails(getDoc(doc(asUser('bob'), 'users/alice')));
    await assertFails(setDoc(doc(asUser('bob'), 'users/carol'), profile()));
  });

  it('admins cannot read user profiles', async () => {
    await assertFails(getDoc(doc(asAdmin(), 'users/alice')));
  });

  it('a user cannot give themselves a role or extra fields', async () => {
    const ref = doc(asUser('alice'), 'users/alice');
    await assertFails(updateDoc(ref, { role: 'admin', updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(ref, { admin: true, updatedAt: serverTimestamp() }));
  });

  it('targets must be complete and in range', async () => {
    const ref = doc(asUser('alice'), 'users/alice');
    const good = { kcal: 2200, protein_g: 90, carbohydrates_g: 280, fat_g: 70, fiber_g: 30 };
    await assertSucceeds(updateDoc(ref, { targets: good, updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(ref, { targets: { ...good, kcal: -5 }, updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(ref, { targets: { kcal: 2000 }, updatedAt: serverTimestamp() }));
  });

  it('body details are optional and validated', async () => {
    const ref = doc(asUser('alice'), 'users/alice');
    const body = { heightCm: 165, age: 21, sex: 'female', activity: 'light', goal: 'gain' };
    await assertSucceeds(updateDoc(ref, { body, updatedAt: serverTimestamp() }));
    await assertSucceeds(updateDoc(ref, { body: null, updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(ref, { body: { ...body, heightCm: 20 }, updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(ref, { body: { ...body, sex: 'x' }, updatedAt: serverTimestamp() }));
    await assertFails(updateDoc(ref, { body: { ...body, extra: 1 }, updatedAt: serverTimestamp() }));
  });

  it('createdAt cannot be changed and profiles cannot be deleted', async () => {
    const ref = doc(asUser('alice'), 'users/alice');
    await assertFails(updateDoc(ref, { createdAt: serverTimestamp(), updatedAt: serverTimestamp() }));
    await assertFails(deleteDoc(ref));
  });
});

describe('consumption days', () => {
  const entry = {
    meal: 'lunch', foodId: 'plain-rice', quantity: 150, unit: 'g',
    snapshot: { kcal: 195, protein_g: 3.75, carbohydrates_g: 42, fat_g: 0.45, fiber_g: 0.6, basisQuantity: 100, basisUnit: 'g', foodVersion: 1 },
  };
  const day = () => ({
    entries: { 'lunch__plain-rice': entry },
    totals: { kcal: 195, protein_g: 3.75, carbohydrates_g: 42, fat_g: 0.45, fiber_g: 0.6 },
    updatedAt: serverTimestamp(),
  });

  it('owner can write, read and delete their day', async () => {
    const ref = doc(asUser('alice'), 'users/alice/days/2026-10-22');
    await assertSucceeds(setDoc(ref, day()));
    await assertSucceeds(getDoc(ref));
    await assertSucceeds(updateDoc(ref, { 'entries.lunch__plain-rice.quantity': 200, totals: zeroTotals, updatedAt: serverTimestamp() }));
    await assertSucceeds(deleteDoc(ref));
  });

  it("nobody else can read or write someone's days — not even admins", async () => {
    await assertFails(setDoc(doc(asUser('bob'), 'users/alice/days/2026-10-22'), day()));
    await assertFails(getDoc(doc(asUser('bob'), 'users/alice/days/2026-10-22')));
    await assertFails(getDoc(doc(asAdmin(), 'users/alice/days/2026-10-22')));
  });

  it('rejects bad day ids, negative totals and extra fields', async () => {
    const db = asUser('alice');
    await assertFails(setDoc(doc(db, 'users/alice/days/today'), day()));
    await assertFails(setDoc(doc(db, 'users/alice/days/2026-10-22'), { ...day(), totals: { ...zeroTotals, kcal: -1 } }));
    await assertFails(setDoc(doc(db, 'users/alice/days/2026-10-22'), { ...day(), note: 'x' }));
  });
});

describe('weights', () => {
  it('owner can log, read and delete weigh-ins; values must be sensible', async () => {
    const ref = doc(asUser('alice'), 'users/alice/weights/2026-10-22');
    await assertSucceeds(setDoc(ref, { kg: 68.4, updatedAt: serverTimestamp() }));
    await assertSucceeds(getDoc(ref));
    await assertFails(setDoc(ref, { kg: 5, updatedAt: serverTimestamp() }));
    await assertFails(setDoc(ref, { kg: 'heavy', updatedAt: serverTimestamp() }));
    await assertFails(setDoc(ref, { kg: 70, note: 'x', updatedAt: serverTimestamp() }));
    await assertFails(setDoc(doc(asUser('alice'), 'users/alice/weights/today'), { kg: 70, updatedAt: serverTimestamp() }));
    await assertSucceeds(deleteDoc(ref));
  });

  it('nobody else can see them — not even admins', async () => {
    await assertFails(getDoc(doc(asUser('bob'), 'users/alice/weights/2026-10-22')));
    await assertFails(getDoc(doc(asAdmin(), 'users/alice/weights/2026-10-22')));
    await assertFails(setDoc(doc(asUser('bob'), 'users/alice/weights/2026-10-22'), { kg: 70, updatedAt: serverTimestamp() }));
  });
});

describe('admin audit log', () => {
  const log = (actorUid: string) => ({
    actorUid, actorEmail: 'admin@example.com', action: 'food.update',
    target: { collection: 'foods', id: 'plain-rice' }, before: null, after: null, at: serverTimestamp(),
  });

  it('admins can append entries as themselves; users cannot', async () => {
    await assertSucceeds(addDoc(collection(asAdmin(), 'adminAuditLogs'), log('admin1')));
    await assertFails(addDoc(collection(asAdmin(), 'adminAuditLogs'), log('someone-else')));
    await assertFails(addDoc(collection(asUser('alice'), 'adminAuditLogs'), log('alice')));
  });

  it('entries are append-only and admin-readable only', async () => {
    await assertSucceeds(getDoc(doc(asAdmin(), 'adminAuditLogs/log1')));
    await assertFails(getDoc(doc(asUser('alice'), 'adminAuditLogs/log1')));
    await assertFails(updateDoc(doc(asAdmin(), 'adminAuditLogs/log1'), { action: 'edited' }));
    await assertFails(deleteDoc(doc(asAdmin(), 'adminAuditLogs/log1')));
  });
});

describe('unknown collections', () => {
  it('are denied', async () => {
    await assertFails(setDoc(doc(asAdmin(), 'anything/else'), { a: 1 }));
    await assertFails(getDoc(doc(asUser('alice'), 'consumptionLogs/x')));
  });
});

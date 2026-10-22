/**
 * One-time (re-runnable) seed of foods, weekly menus, special dinner and menu config from kit/data.
 *
 *   npm run seed:emulator               → local emulators
 *   npm run seed                        → real project (service-account key, asks to confirm)
 *   npm run seed -- --dry-run           → show what would change, write nothing
 *   npm run seed -- --overwrite         → also replace docs that differ from the kit
 *                                         (foods are versioned + archived, never silently replaced)
 *
 * Idempotent: document ids are fixed, so re-running never duplicates. By default existing
 * documents are left alone, so admin edits made in the app are never clobbered.
 * Does NOT create config/academicCalendar — an admin sets that in the app.
 */
import { FieldValue, getFirestore, type DocumentReference, type Firestore, type WriteBatch } from 'firebase-admin/firestore';
import { buildSeed, stableStringify } from './lib/buildSeed';
import { loadKit } from './lib/kit';
import { confirm, initAdmin, parseArgs } from './lib/adminApp';

const ACTOR = 'seed-script';
const BATCH_LIMIT = 400;

type Plan = { created: string[]; updated: string[]; unchanged: string[]; differs: string[] };

class BatchWriter {
  private batch: WriteBatch;
  private ops = 0;
  private pending: Promise<unknown>[] = [];
  constructor(private db: Firestore) {
    this.batch = db.batch();
  }
  add(fn: (b: WriteBatch) => void, count = 1) {
    if (this.ops + count > BATCH_LIMIT) this.flush();
    fn(this.batch);
    this.ops += count;
  }
  private flush() {
    if (this.ops === 0) return;
    this.pending.push(this.batch.commit());
    this.batch = this.db.batch();
    this.ops = 0;
  }
  async done() {
    this.flush();
    await Promise.all(this.pending);
  }
}

async function main() {
  const args = parseArgs();
  const dryRun = args.flags.has('dry-run');
  const overwrite = args.flags.has('overwrite');

  const { docs, errors, warnings } = buildSeed(loadKit());
  warnings.forEach((w) => console.warn(`warn: ${w}`));
  if (errors.length) {
    errors.forEach((e) => console.error(`error: ${e}`));
    throw new Error('Kit data has errors; nothing was written.');
  }

  const { projectId, emulator } = initAdmin(args);
  const db = getFirestore();
  console.log(`Target: ${emulator ? 'EMULATOR' : 'REAL PROJECT'} ${projectId}${dryRun ? ' (dry run)' : ''}`);
  if (!emulator && !dryRun && !args.flags.has('yes') && !(await confirm(`Write seed data to "${projectId}"?`))) {
    console.log('Cancelled.');
    return;
  }

  const plan: Plan = { created: [], updated: [], unchanged: [], differs: [] };
  const writer = new BatchWriter(db);
  const now = FieldValue.serverTimestamp();

  const audit = (b: WriteBatch, action: string, ref: DocumentReference, before: unknown, after: unknown) =>
    b.set(db.collection('adminAuditLogs').doc(), {
      actorUid: ACTOR, actorEmail: null, action,
      target: { collection: ref.parent.path, id: ref.id }, before, after, at: now,
    });

  // ---- foods: versioned ----
  const foodRefs = Object.keys(docs.foods).map((id) => db.doc(`foods/${id}`));
  const foodSnaps = await db.getAll(...foodRefs);
  for (const snap of foodSnaps) {
    const seed = docs.foods[snap.id]!;
    if (!snap.exists) {
      plan.created.push(snap.ref.path);
      if (!dryRun) writer.add((b) => b.set(snap.ref, { ...seed, version: 1, createdAt: now, updatedAt: now, updatedBy: ACTOR }));
      continue;
    }
    const current = snap.data()!;
    const { version: _v, createdAt: _c, updatedAt: _u, updatedBy: _b, ...currentContent } = current;
    if (stableStringify(currentContent) === stableStringify(seed)) {
      plan.unchanged.push(snap.ref.path);
      continue;
    }
    if (!overwrite) {
      plan.differs.push(snap.ref.path);
      continue;
    }
    plan.updated.push(snap.ref.path);
    if (dryRun) continue;
    const version = Number(current.version ?? 1);
    writer.add((b) => {
      b.set(snap.ref.collection('history').doc(String(version)), { ...current, archivedAt: now, archivedBy: ACTOR });
      b.set(snap.ref, { ...seed, version: version + 1, createdAt: current.createdAt ?? now, updatedAt: now, updatedBy: ACTOR });
      audit(b, 'food.seed-overwrite', snap.ref, current, seed);
    }, 3);
  }

  // ---- menus, special menus, menu config: replaced (with audit) ----
  const plainDocs: [string, Record<string, unknown>][] = [
    ...Object.entries(docs.menus).map(([id, d]) => [`menus/${id}`, d] as [string, Record<string, unknown>]),
    ...Object.entries(docs.specialMenus).map(([id, d]) => [`specialMenus/${id}`, d] as [string, Record<string, unknown>]),
    ['config/menu', docs.menuConfig],
  ];
  const plainSnaps = await db.getAll(...plainDocs.map(([path]) => db.doc(path)));
  plainSnaps.forEach((snap, i) => {
    const seed = plainDocs[i]![1];
    if (!snap.exists) {
      plan.created.push(snap.ref.path);
      if (!dryRun) writer.add((b) => b.set(snap.ref, { ...seed, updatedAt: now, updatedBy: ACTOR }));
      return;
    }
    const current = snap.data()!;
    const { updatedAt: _a, updatedBy: _b, ...currentContent } = current;
    if (stableStringify(currentContent) === stableStringify(seed)) {
      plan.unchanged.push(snap.ref.path);
      return;
    }
    if (!overwrite) {
      plan.differs.push(snap.ref.path);
      return;
    }
    plan.updated.push(snap.ref.path);
    if (!dryRun) {
      writer.add((b) => {
        b.set(snap.ref, { ...seed, updatedAt: now, updatedBy: ACTOR });
        audit(b, 'menu.seed-overwrite', snap.ref, currentContent, seed);
      }, 2);
    }
  });

  await writer.done();

  const verb = dryRun ? 'would be ' : '';
  console.log(`\n${plan.created.length} ${verb}created, ${plan.updated.length} ${verb}updated, ${plan.unchanged.length} unchanged.`);
  if (plan.differs.length) {
    console.log(`${plan.differs.length} existing docs differ from the kit and were left alone (use --overwrite to replace):`);
    plan.differs.forEach((p) => console.log(`  ${p}`));
  }
  if (!dryRun) console.log('Done. Note: config/academicCalendar is not seeded — set it in the admin Menu Editor.');
}

main().then(
  () => process.exit(0),
  (err: unknown) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  },
);

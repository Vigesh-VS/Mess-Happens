/**
 * Grants or revokes the `admin` custom claim. This is the ONLY way to become admin.
 *
 *   npm run set-admin -- you@example.com              → real project (service-account key)
 *   npm run set-admin -- you@example.com --remove
 *   npm run set-admin:emulator -- you@example.com     → local Auth emulator
 *
 * The user must already have signed up. They pick up the change after signing out and in,
 * or by pressing "Refresh access" on the Profile screen.
 */
import { getAuth } from 'firebase-admin/auth';
import { initAdmin, parseArgs } from './lib/adminApp';

async function main() {
  const args = parseArgs();
  const email = args.positional[0];
  if (!email) throw new Error('Usage: npm run set-admin -- <email> [--remove] [--emulator] [--key <path>]');
  const remove = args.flags.has('remove');

  const { projectId, emulator } = initAdmin(args);
  const auth = getAuth();
  const user = await auth.getUserByEmail(email).catch(() => {
    throw new Error(`No user with email ${email} in ${emulator ? 'the emulator' : projectId}. Sign up in the app first.`);
  });

  const claims = { ...(user.customClaims ?? {}) };
  if (remove) delete claims.admin;
  else claims.admin = true;
  await auth.setCustomUserClaims(user.uid, claims);

  console.log(`${remove ? 'Removed admin from' : 'Granted admin to'} ${email} (uid ${user.uid}) in ${emulator ? 'emulator ' : ''}${projectId}.`);
  console.log('They must sign out and back in, or press "Refresh access" in Profile.');
}

main().then(
  () => process.exit(0),
  (err: unknown) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  },
);

// Runs the Security Rules tests inside a throwaway Firestore emulator: `npm run test:rules`.
import { spawnSync } from 'node:child_process';
import { EMULATOR_PROJECT_ID } from './lib/adminApp';
import { stopLeakedFirestoreEmulator } from './lib/emulatorCleanup';

stopLeakedFirestoreEmulator();
const result = spawnSync(
  `firebase emulators:exec --only firestore --project ${EMULATOR_PROJECT_ID} "vitest run --config vitest.rules.config.ts"`,
  { stdio: 'inherit', shell: true },
);
stopLeakedFirestoreEmulator();
process.exit(result.status ?? 1);

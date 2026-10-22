// Starts the Auth + Firestore emulators, persisting their data in .emulator-data/ between runs.
// Stop with Ctrl+C — data is exported on exit.
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { EMULATOR_PROJECT_ID } from './lib/adminApp';
import { stopLeakedFirestoreEmulator } from './lib/emulatorCleanup';

const DATA_DIR = '.emulator-data';
const args = [
  'emulators:start',
  '--only', 'auth,firestore',
  '--project', EMULATOR_PROJECT_ID,
  `--export-on-exit=${DATA_DIR}`,
];
if (existsSync(`${DATA_DIR}/firebase-export-metadata.json`)) args.push(`--import=${DATA_DIR}`);

stopLeakedFirestoreEmulator();
const child = spawn('firebase', args, { stdio: 'inherit', shell: true });

// Ctrl+C reaches the Firebase CLI directly; wait for it to finish exporting before cleaning up.
process.on('SIGINT', () => {});
child.on('exit', (code) => {
  stopLeakedFirestoreEmulator();
  process.exit(code ?? 0);
});

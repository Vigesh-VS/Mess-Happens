// Admin SDK setup shared by the local scripts. Never imported by the web app.
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { cert, initializeApp, type App } from 'firebase-admin/app';

export const EMULATOR_PROJECT_ID = 'demo-mess-tracker';
const DEFAULT_KEY_PATH = 'service-account.json';

export interface ScriptArgs {
  positional: string[];
  flags: Set<string>;
  options: Map<string, string>;
}

/** Parses `a b --flag --key value`. */
export function parseArgs(argv = process.argv.slice(2)): ScriptArgs {
  const positional: string[] = [];
  const flags = new Set<string>();
  const options = new Map<string, string>();
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    if (arg === '--key') {
      const value = argv[++i];
      if (!value) throw new Error('--key needs a path');
      options.set('key', value);
    } else if (arg.startsWith('--')) {
      flags.add(arg.slice(2));
    } else {
      positional.push(arg);
    }
  }
  return { positional, flags, options };
}

/**
 * Emulator: talks to the local Auth/Firestore emulators (no credentials needed).
 * Real project: uses a service-account key from `--key <path>`, GOOGLE_APPLICATION_CREDENTIALS,
 * or ./service-account.json. The key must stay on this machine (it is gitignored).
 */
export function initAdmin(args: ScriptArgs): { app: App; projectId: string; emulator: boolean } {
  if (args.flags.has('emulator')) {
    process.env.FIRESTORE_EMULATOR_HOST ??= '127.0.0.1:8080';
    process.env.FIREBASE_AUTH_EMULATOR_HOST ??= '127.0.0.1:9099';
    return { app: initializeApp({ projectId: EMULATOR_PROJECT_ID }), projectId: EMULATOR_PROJECT_ID, emulator: true };
  }

  const keyPath = resolve(args.options.get('key') ?? process.env.GOOGLE_APPLICATION_CREDENTIALS ?? DEFAULT_KEY_PATH);
  if (!existsSync(keyPath)) {
    throw new Error(
      `Service-account key not found at ${keyPath}.\n` +
        'Download it from Firebase console → Project settings → Service accounts → Generate new private key,\n' +
        `save it as ${DEFAULT_KEY_PATH} in the project root (gitignored), or pass --key <path>.\n` +
        'To use the local emulators instead, add --emulator.',
    );
  }
  const key = JSON.parse(readFileSync(keyPath, 'utf8')) as { project_id: string };
  return { app: initializeApp({ credential: cert(keyPath), projectId: key.project_id }), projectId: key.project_id, emulator: false };
}

export async function confirm(question: string): Promise<boolean> {
  const { createInterface } = await import('node:readline/promises');
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = await rl.question(`${question} (y/N) `);
    return answer.trim().toLowerCase() === 'y';
  } finally {
    rl.close();
  }
}

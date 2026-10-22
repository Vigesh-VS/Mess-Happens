import { spawnSync } from 'node:child_process';
import { EMULATOR_PROJECT_ID } from './adminApp';

/**
 * On Windows the Firebase CLI's shutdown leaves the Firestore emulator's java.exe running,
 * which blocks port 8080 on the next start. Stop only this project's emulator process.
 */
export function stopLeakedFirestoreEmulator(): void {
  if (process.platform !== 'win32') return;
  const ps =
    "Get-CimInstance Win32_Process -Filter \"Name='java.exe'\" | " +
    `Where-Object { $_.CommandLine -like '*cloud-firestore-emulator*' -and $_.CommandLine -like '*${EMULATOR_PROJECT_ID}*' } | ` +
    'ForEach-Object { Stop-Process -Id $_.ProcessId -Force }';
  spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', ps], { stdio: 'ignore' });
}

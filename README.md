# Mess Nutrition Tracker

Daily mess menu + personal nutrition tracking. React + TypeScript + Vite + Tailwind, Firebase Auth + Firestore (Spark plan, no Cloud Functions).

## Requirements

- Node 20+
- Java 11+ (only for the local Firestore emulator and rules tests)

```bash
npm install
```

## Run locally without a Firebase project (emulators)

```bash
# terminal 1
npm run emulators            # Auth :9099, Firestore :8080, UI http://127.0.0.1:4000

# terminal 2
npm run seed:emulator        # loads kit/data into the emulator
npm run dev                  # http://localhost:5173
```

with a `.env.local` file containing just `VITE_USE_EMULATORS=true`.

Sign up in the app, then make yourself admin and press **Profile → Refresh access**:

```bash
npm run set-admin:emulator -- you@example.com
```

Emulator data is saved to `.emulator-data/` when you stop the emulators with Ctrl+C.

## Run against your Firebase project

1. Create a Firebase project. In the console:
   - **Authentication → Sign-in method:** enable **Email/Password** and **Google**.
   - **Firestore Database → Create database:** production mode, location **asia-south1 (Mumbai)** (permanent).
   - **Project settings → Your apps → Add web app** and copy its config.
2. `cp .env.example .env.local` and fill in the `VITE_FIREBASE_*` values (`VITE_USE_EMULATORS=false`).
3. Deploy the Security Rules: `npx firebase login`, then `npm run deploy:rules -- --project <project-id>`.
4. **Project settings → Service accounts → Generate new private key.** Save it as `service-account.json` in the project root. It is gitignored — never commit or share it.
5. `npm run seed` (asks for confirmation; `--dry-run` previews).
6. `npm run dev`, sign up, then `npm run set-admin -- you@example.com` and **Refresh access** in Profile.

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` / `build` / `preview` | Vite dev server / type-check + production build / serve the build |
| `npm test` | Unit tests (Vitest) |
| `npm run test:rules` | Security Rules tests in a throwaway Firestore emulator |
| `npm run emulators` | Local Auth + Firestore emulators with persisted data |
| `npm run seed` / `seed:emulator` | Load `kit/data` into Firestore. Idempotent; existing docs are left alone unless `--overwrite` (foods are then versioned and archived) |
| `npm run set-admin -- <email> [--remove]` | Grant/revoke the `admin` custom claim (the only way to become admin) |
| `npm run deploy:rules` | Deploy `firestore.rules` and indexes |

## Security model

- Admin = custom claim `admin: true`, set only by `scripts/set-admin.ts` with a local service-account key. There is no role field a user could write.
- Signed-in users can read foods, menus, overrides and config; only admins can write them (validated by `firestore.rules`).
- `users/{uid}` and `users/{uid}/days/*` are readable and writable only by that user — not even admins can read them.
- Food edits must bump `version` and archive the previous values to `foods/{id}/history/{version}` in the same batch.
- `adminAuditLogs` is append-only.

## Layout

```
src/
  firebase/        client init (offline persistent cache), env config
  models/          Firestore document types (shared with scripts)
  auth/            AuthProvider, route guards, profile bootstrap
  components/      ui/ primitives, layout/ shell + navigation
  pages/           screens (admin/ is lazy-loaded)
  lib/             pure logic
scripts/           seed, set-admin, emulator helpers (Node only, never bundled)
tests/rules/       Security Rules tests
kit/data/          menu + food seed data
```

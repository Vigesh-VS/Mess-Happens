# Mess Nutrition Tracker

Today's mess menu (odd/even academic weeks), personal food tracking with +/−, nutrition totals against targets, and an admin panel — as an installable web app.

React + TypeScript + Vite + Tailwind · Firebase Auth + Firestore + Hosting · free Spark plan (no Cloud Functions).

## What's in it

**Students** — Today's menu by meal with +/− logging · pick-one pairs, limited items, special dinner A/B · Summary against targets with meal breakdown · History · Menu browser (odd/even × 7 days) · personal targets · works offline and syncs later · installable (PWA).

**Admins** — one-tap **odd/even week switch** · weekly menu editor (add, remove, replace, reorder; draft → preview → publish) · date changes (festivals, one-off swaps, pin special-dinner combination, set the day's pickle/fruit variety) · **Food Editor** (names, servings, +/− step, nutrition, verification status) · audit trail of every change.

**Every admin change reaches everyone live** — all screens listen to Firestore, so open phones update within seconds; offline phones update when they reconnect. Logged meals keep the nutrition values they were logged with, so past totals never change when a food is edited.

## Requirements

- Node 20+
- Java 11+ (only for the local emulators and the rules tests)

```bash
npm install
```

## Try it locally — no Firebase project needed

Create `.env.local` containing just `VITE_USE_EMULATORS=true`, then:

```bash
npm run emulators          # terminal 1 — Auth :9099, Firestore :8080, UI http://127.0.0.1:4000
npm run seed:emulator      # terminal 2 — loads the real menu + 162 foods
npm run dev                # http://localhost:5173
```

Sign up in the app, then `npm run set-admin:emulator -- you@example.com` and press **Profile → Refresh access**. Go to **Admin → Menus → Odd / even week** and press **Save and publish** (prefilled: weeks start Sunday; the week of 18 Oct 2026 is even).

## Go live (Firebase project + Hosting)

### 1. Create the Firebase project (console.firebase.google.com)

1. **Add project** → any name. Google Analytics is not needed.
2. **Build → Authentication → Get started → Sign-in method:** enable **Email/Password** and **Google** (pick a support email).
3. **Build → Firestore Database → Create database:** **Production mode**, location **asia-south1 (Mumbai)**. The location can't be changed later.
4. **Project settings (gear) → General → Your apps → Web (`</>`):** register an app (no need to tick Hosting here). Copy the `firebaseConfig` values.
5. **Project settings → Service accounts → Generate new private key.** Save the file as `service-account.json` in this folder. It is gitignored — never commit, email or upload it.

### 2. Point the app at it

Copy `.env.example` to `.env.local` and fill it in from step 4:

```
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project
VITE_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=1234567890
VITE_FIREBASE_APP_ID=1:1234567890:web:abc123
VITE_USE_EMULATORS=false
```

### 3. Rules, data, first admin

```bash
npx firebase login
npx firebase use --add                 # pick your project, alias "default"
npm run deploy:rules                   # Security Rules + indexes
npm run seed                           # loads menus + foods (asks to confirm)
npm run dev                            # sign up with your own email in the app
npm run set-admin -- you@example.com   # then Profile → Refresh access
```

In the app: **Admin → Menus → Odd / even week → Save and publish**.

### 4. Deploy to Hosting

```bash
npm run build
npx firebase deploy --only hosting
```

The site is live at `https://<project-id>.web.app`. Then, in **Authentication → Settings → Authorized domains**, make sure `<project-id>.web.app` and `<project-id>.firebaseapp.com` are listed (they usually are), plus any custom domain you add later.

To ship updates later: `npm run build && npx firebase deploy --only hosting` (and `npm run deploy:rules` if `firestore.rules` changed). Installed apps pick up the new version on their next launch.

## Scripts

| Script | What it does |
|---|---|
| `npm run dev` / `build` / `preview` | Dev server / type-check + production build / serve the build |
| `npm test` | Unit tests — week parity, dates & timezones, overrides, nutrition maths, tracking, food form |
| `npm run test:rules` | Security Rules tests in a throwaway Firestore emulator |
| `npm run emulators` | Local Auth + Firestore emulators, data kept in `.emulator-data/` |
| `npm run seed` / `seed:emulator` | Load `kit/data` into Firestore. Idempotent; leaves admin edits alone unless `--overwrite` (foods are then versioned). `--dry-run` previews |
| `npm run set-admin -- <email> [--remove]` | Grant/revoke admin (the only way to become admin) |
| `npm run deploy:rules` | Deploy `firestore.rules` and indexes |
| `npx tsx scripts/make-icons.ts` | Re-render the app icons (uses installed Edge/Chrome) |

## How it works

- **Week parity** — `config/academicCalendar` holds one known week and its parity; every other week alternates from it (across year boundaries). Mess dates use Asia/Kolkata, never the phone's timezone. If it's missing, students see "Menu week not configured" instead of a guess. The admin switch re-anchors it to the current week with the other parity.
- **Menus** — 14 weekly templates (`menus/{odd|even}_{weekday}`); `menuOverrides/{date}` replaces only the meals it lists, only on that date.
- **Foods** — `foods/{id}` is the versioned source of truth (old versions in `foods/{id}/history`); `catalog/foods` holds all foods in one document so a phone loads the food list with a single read. Admin edits update both atomically.
- **Tracking** — one document per user per day (`users/{uid}/days/{date}`), entries keyed `meal__food` (no duplicates), each with a frozen nutrition snapshot. Offline taps are queued by Firestore and synced on reconnect.
- **Cost** — about 20 reads per app open, well within the free 50k/day.

## Security model

- Admin = custom claim `admin: true`, set only by `scripts/set-admin.ts` with your local service-account key. Users can't grant it to themselves; admin screens are hidden *and* every admin write is checked by the rules.
- Everyone signed in can read menus and foods; only admins can change them (validated by `firestore.rules`).
- A user's profile and food logs are readable and writable only by that user — admins can't see them.
- Food edits must archive the previous version in the same write. `adminAuditLogs` is append-only.

## Layout

```
src/
  data/            live Firestore listeners, admin writes, day-log hook
  lib/             pure logic: dates/parity, menu resolution, nutrition maths (unit-tested)
  models/          Firestore document types (shared with scripts)
  auth/            auth state, route guards, profile bootstrap
  components/      ui/ primitives, menu/ (food rows, stepper, meals), layout/
  pages/           screens; admin/ is lazy-loaded
  pwa/             install prompt
scripts/           seed, set-admin, emulators, icons (Node only, never bundled)
tests/rules/       Security Rules tests
kit/data/          the menu + food seed data
```

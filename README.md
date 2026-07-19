# The Textbook

A personal operating-system app built on Kamden's ethical framework — love of people, community, longevity, action. It holds the living Textbook, tracks connection with people on a ~2-week cadence, runs daily structures, guides the four-step Repair Protocol, and runs the review cadence.

The quiet background to something more important.

## Principles (from the framework, non-negotiable)

- **No guilt mechanics.** Missed days are simply blank. No streaks, no red X walls, no punitive copy.
- **Rules are the floor, not a score.** No points, levels, or grades — only gentle continuity.
- **No files on people.** Connection logs store interactions (date, type, short note), never profiles or dossiers. Person records are name + cadence only, by design.
- **Local-first & private.** All data on-device (IndexedDB). No accounts, no cloud, no analytics.

## Stack

Vite · React 18 · TypeScript · Tailwind CSS · Dexie (IndexedDB) · vite-plugin-pwa · date-fns. No backend, no auth, single user.

## Run it

```sh
npm install
npm run dev        # local dev server
npm run build      # type-check + production build (dist/)
npm run preview    # serve the production build
```

Installable as a PWA (Add to Home Screen) and fully usable offline.

## Smoke test

With `npm run preview` running on port 4173:

```sh
node scripts/smoke.mjs ./shots
```

Drives the real app in Chromium through all five tabs — routines, water, grace, quick-logging a connection, Textbook search, the full Repair flow, and reload persistence — and saves screenshots.

## Layout

- `src/db.ts` — Dexie schema (§5 data model) and settings helpers
- `src/seed.ts` — first-run seed: people, routines, focus categories, and the Textbook verbatim
- `src/tabs/` — the five tabs: Today, People, Textbook, Repair, Review
- `src/components/` — routine checklists, focus timer
- `src/lib/` — day boundary (4 AM rollover), connection status selectors, daily-line rotation, markdown-lite, notifications
- `scripts/gen-icons.mjs` — regenerates the PWA PNG icons (no image deps)

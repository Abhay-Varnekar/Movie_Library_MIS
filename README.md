# Movie Library MIS

Next.js 14 + TypeScript + Tailwind + Supabase (PostgreSQL + Auth + RLS).
A modern movie library MIS with browse / search / reviews / watchlist /
admin moderation, all backed by Supabase RLS.

## Stack

- **Frontend**: Next.js 14 App Router, TypeScript, Tailwind CSS
- **Backend**: Next.js Route Handlers + Supabase
- **Database**: Supabase Postgres with Row Level Security
- **Auth**: Supabase Auth (email/password) via `@supabase/ssr`
- **Deploy target**: Vercel + Supabase cloud

## Phase status

- [x] **Phase 1 — Foundation**: schema, seed, smoke-test home
- [x] **Phase 2 — Explore page, filters, movie detail, related movies, actor pages**
- [x] **Phase 3 — Auth, reviews CRUD, watchlist, profile**
- [x] **Phase 4 — Admin dashboard, Vercel deploy guide**

Design spec for each phase under `docs/superpowers/specs/`.

## First-time setup

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
Copy `.env.example` to `.env.local` and fill in your Supabase credentials:
```bash
cp .env.example .env.local
```
Required values (Supabase Dashboard → Settings → API):
- `NEXT_PUBLIC_SUPABASE_URL` — project URL (without `/rest/v1/` suffix)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — public anon key (browser-safe; RLS protects)
- `SUPABASE_SERVICE_ROLE_KEY` — admin key, **never commit, never expose to browser**

### 3. Apply database schema
1. Open Supabase Dashboard → SQL Editor → New query
2. Paste the entire contents of `supabase/migrations/001_initial_schema.sql`
3. Click **Run**

This creates all 8 tables, indexes, RLS policies, and the auth trigger.

### 4. Seed synthetic data
```bash
npm run db:seed
```
Generates 15 genres, 150 actors, 250 movies, ~625 movie-genre links, ~2500
movie-actor links, 100 demo auth users (`demo_1@demo.movielib.local` …
`demo_100@…`), and 300 reviews. Takes about 30 seconds (most of it
creating auth users sequentially).

Already seeded? Re-run with `npm run db:seed:force` to wipe and reseed.

### 5. Run dev server
```bash
npm run dev
```
Open http://localhost:3000.

### 6. Promote yourself to admin

Register a normal account through the UI (`/register`), then run this in
Supabase Dashboard → SQL Editor:

```sql
UPDATE public.users
SET is_admin = true
WHERE email = 'YOUR_EMAIL@example.com';
```

Reload the site — the **Admin** link appears in the header.

### 7. Production build (sanity check)
```bash
npm run build
```

## Deploying to Vercel

See **[`VERCEL_DEPLOY.md`](./VERCEL_DEPLOY.md)** for the full step-by-step
deployment guide (env vars, Supabase redirect URLs, smoke test, admin
promotion).

## Test accounts

- **Recommended**: register your own account through `/register`. Email
  confirmation is disabled, so you can sign in immediately. Then promote to
  admin with the SQL above.
- **Seeded demo accounts**: `scripts/seed.ts` creates 100 demo auth users
  (`demo_1@demo.movielib.local` … `demo_100@demo.movielib.local`). The
  password format is `Demo<N>!Secret#<random4digits>` — but the
  random suffix isn't recorded anywhere (it's regenerated each seed run),
  so these accounts are useful for populating reviews + watchlist data,
  not for logging in. Register a fresh account instead.

## Project structure

```
src/
  app/
    (auth)/         login, register, auth-only layout
    api/            route handlers (reviews, watchlist, profile, admin)
    admin/          admin pages (overview, movies, users, reviews, analytics)
    movies/         explore + detail + actor pages
    profile/        own-profile editor
    watchlist/      own watchlist with tabs/sort
  components/       Tailwind-only React components
  context/          AuthContext + ToastContext (no external state lib)
  lib/              supabase clients (anon, browser-ssr, server-ssr, admin),
                    types, queries, filters
  middleware.ts     protects /profile and /watchlist
supabase/
  migrations/       SQL schema
scripts/
  seed.ts           Synthetic data generator
docs/
  superpowers/specs/   Phase design specs
legacy/           Old Flask + MySQL + vanilla-JS stack preserved for reference
```

## Security notes

- `.env.local` is gitignored. Never commit it.
- The **service-role key bypasses Row Level Security entirely**. It is used
  *only* by:
  - `scripts/seed.ts` (server-side)
  - `/api/admin/*` route handlers (cookie auth + `is_admin` check first)
  - `/api/reviews/[id]/like` (anonymous likes; no per-user dedupe)
- The anon key is intentionally public; RLS enforces what anonymous browser
  sessions can do.
- After deploying for the first time, **rotate the service-role key** in
  Supabase if it has ever been pasted into a chat, screenshot, or
  screen-share. Update the value in Vercel Environment Variables and
  redeploy.

## Repo

GitHub: https://github.com/Abhay-Varnekar/Movie_Library_MIS

# FinTrack

FinTrack is a personal investment and portfolio tracker built with React, TypeScript, Vite, Supabase, and Vercel Serverless Functions. Asset prices are entered manually; the application does not fetch live market prices.

## Local setup

1. Install dependencies with `npm install`.
2. Copy `.env.example` to `.env.local` and set your Supabase project URL, publishable key, and server-only service-role key. `.env.local` is gitignored. Never prefix the service-role key with `VITE_` or expose it to browser code.
3. Use `npx vercel dev --local` to run the application and its `/api` serverless functions without logging in, linking a Vercel project, or pulling environment variables from Vercel. The plain `npm run dev` command starts Vite only and does not execute files in `api/`.
4. Configure Supabase Auth email templates and the local redirect URL (`http://localhost:3000/reset-password`) in the project's Auth URL settings before testing invitation, email-change, or password-recovery links.

## Checks

- `npm run typecheck` — TypeScript check
- `npm run build` — TypeScript check and production Vite build

There is no configured lint script. `npm test` runs the focused admin API response tests using Node's built-in test runner.

## Database setup

Supabase PostgreSQL is the only database. Review and apply the ordered files in `supabase/migrations/` manually to the intended Supabase project before using database-backed features. Migrations are not run by the application or its build. Verify the migration history and effective database grants/RLS in Supabase before release.

## Admin API

`/api/admin/users` requires a Supabase bearer token and an active administrator profile. The server-only `SUPABASE_SERVICE_ROLE_KEY` is used exclusively by the Vercel function. For local API work, run the Vercel CLI in `--local` mode as described above; do not link a project just to run functions locally.

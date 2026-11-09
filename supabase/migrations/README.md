# Supabase Migrations

The timestamped SQL files define FinTrack's PostgreSQL schema, triggers, RPCs, grants, and Row Level Security policies. Supabase PostgreSQL is the application's only database.

Review and apply these migrations in timestamp order to the intended Supabase project before using authentication-backed features. They are not executed automatically. The latest admin investment-management migration is still pending review/application; deployment is not release-ready until the effective database state is verified.

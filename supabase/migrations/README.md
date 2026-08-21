# Migrations

Numbered SQL migration files, applied oldest-first in the Supabase SQL Editor.

- `supabase/schema.sql` remains the full canonical schema for fresh installs.
- When changing the schema, edit `schema.sql` AND add a new numbered migration
  file here (e.g. `0002_...sql`) so existing databases can be brought up to date.

All migrations should be idempotent (`if exists` / `if not exists`) so they can
be safely re-run against any environment.

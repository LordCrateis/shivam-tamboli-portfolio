# portfolio

## Environment variables

- Keep your real values only in a local `.env` file (already gitignored).
- Never commit `.env` to the repository.
- Copy `.env.example` to `.env` and fill in your values:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`

## Supabase setup

Run the SQL in `supabase/blogs.sql` inside the Supabase SQL Editor to create/update:

- `public.blogs` (with `published_at` and admin-only write policy)
- `public.projects` (with public read + admin-only write policy)

## Admin auth route

- Secret admin auth path: `#/admin` (or `/admin` on hosts with SPA rewrite support).
- Visiting this route triggers Supabase Google OAuth directly.
- OAuth redirect URL in code: `${window.location.origin}/#/blog`.
- Ensure this redirect URL is added in Supabase Auth provider settings.

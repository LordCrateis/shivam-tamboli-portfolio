# portfolio

## Environment variables

- Keep your real values only in a local `.env` file (already gitignored).
- Never commit `.env` to the repository.
- Copy `.env.example` to `.env` and fill in your values:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`

## Supabase blog setup

Run the SQL in `supabase/blogs.sql` inside the Supabase SQL Editor to create the `public.blogs` table, enable RLS, and add public-read/authenticated-write policies.

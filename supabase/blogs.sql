-- ADMIN ACCESS CODE: update this email here only if your single allowed admin Gmail changes.
-- Current admin Gmail: shivamtamboli62@gmail.com

create table if not exists public.blogs (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  slug text unique not null,
  excerpt text,
  content text,
  category text,
  published boolean default false,
  published_at date,
  created_at timestamp with time zone default timezone('utc', now()),
  updated_at timestamp with time zone default timezone('utc', now())
);

alter table public.blogs
  add column if not exists published_at date;

alter table public.blogs enable row level security;

drop policy if exists "Public can read published blogs" on public.blogs;
drop policy if exists "Authenticated user can do everything" on public.blogs;
drop policy if exists "Admin Gmail can manage blogs" on public.blogs;

create policy "Public can read published blogs"
on public.blogs for select
using (published = true);

create policy "Admin Gmail can manage blogs"
on public.blogs for all
using (lower((auth.jwt() ->> 'email')) = 'shivamtamboli62@gmail.com')
with check (lower((auth.jwt() ->> 'email')) = 'shivamtamboli62@gmail.com');

create table if not exists public.projects (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  category text,
  year integer,
  description text,
  tech_stack text[] default '{}',
  live_url text,
  status text check (status in ('Deployed', 'In Progress', 'Archived')),
  order_index integer,
  visible boolean default true
);

alter table public.projects enable row level security;

drop policy if exists "Public can read projects" on public.projects;
drop policy if exists "Admin Gmail can manage projects" on public.projects;

create policy "Public can read projects"
on public.projects for select
using (true);

create policy "Admin Gmail can manage projects"
on public.projects for all
using (lower((auth.jwt() ->> 'email')) = 'shivamtamboli62@gmail.com')
with check (lower((auth.jwt() ->> 'email')) = 'shivamtamboli62@gmail.com');

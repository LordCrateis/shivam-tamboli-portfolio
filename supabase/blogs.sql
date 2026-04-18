create table public.blogs (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  slug text unique not null,
  excerpt text,
  content text,
  category text,
  published boolean default false,
  created_at timestamp with time zone default timezone('utc', now()),
  updated_at timestamp with time zone default timezone('utc', now())
);

alter table public.blogs enable row level security;

create policy "Public can read published blogs"
on public.blogs for select
using (published = true);

create policy "Authenticated user can do everything"
on public.blogs for all
using (auth.role() = 'authenticated');

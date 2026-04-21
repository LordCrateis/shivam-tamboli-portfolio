-- ADMIN ACCESS CODE: update this email here only if your single allowed admin Gmail changes.
-- Current admin Gmail: shivamtamboli62@gmail.com

create table if not exists public.blogs (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  slug text unique not null,
  excerpt text,
  content text,
  category text,
  like_count integer not null default 0,
  published boolean default false,
  published_at date,
  created_at timestamp with time zone default timezone('utc', now()),
  updated_at timestamp with time zone default timezone('utc', now())
);

alter table public.blogs
  add column if not exists published_at date,
  add column if not exists like_count integer not null default 0;

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

create or replace function public.increment_blog_like(blog_uuid uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  next_like_count integer;
begin
  update public.blogs
  set like_count = coalesce(like_count, 0) + 1
  where id = blog_uuid
  returning like_count into next_like_count;

  return coalesce(next_like_count, 0);
end;
$$;

grant execute on function public.increment_blog_like(uuid) to anon, authenticated;

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

create table if not exists public.blog_comments (
  id uuid default gen_random_uuid() primary key,
  blog_id uuid not null references public.blogs(id) on delete cascade,
  alias text not null,
  text text not null,
  pinned boolean not null default false,
  created_at timestamp with time zone not null default timezone('utc', now())
);

create index if not exists blog_comments_blog_id_created_at_idx on public.blog_comments(blog_id, created_at desc);
create index if not exists blog_comments_blog_id_pinned_idx on public.blog_comments(blog_id, pinned desc);

alter table public.blog_comments enable row level security;

drop policy if exists "Public can read comments" on public.blog_comments;
drop policy if exists "Public can insert comments" on public.blog_comments;
drop policy if exists "Admin can pin comments" on public.blog_comments;

create policy "Public can read comments"
on public.blog_comments for select
using (true);

create policy "Public can insert comments"
on public.blog_comments for insert
with check (true);

create policy "Admin can pin comments"
on public.blog_comments for update
using (lower((auth.jwt() ->> 'email')) = 'shivamtamboli62@gmail.com')
with check (lower((auth.jwt() ->> 'email')) = 'shivamtamboli62@gmail.com');

create table if not exists public.blog_comment_replies (
  id uuid default gen_random_uuid() primary key,
  comment_id uuid not null references public.blog_comments(id) on delete cascade,
  alias text not null,
  text text not null,
  is_admin boolean not null default false,
  admin_avatar_url text,
  created_at timestamp with time zone not null default timezone('utc', now())
);

create index if not exists blog_comment_replies_comment_id_created_at_idx
on public.blog_comment_replies(comment_id, created_at asc);

alter table public.blog_comment_replies enable row level security;

drop policy if exists "Public can read replies" on public.blog_comment_replies;
drop policy if exists "Public can insert replies" on public.blog_comment_replies;

create policy "Public can read replies"
on public.blog_comment_replies for select
using (true);

create policy "Public can insert replies"
on public.blog_comment_replies for insert
with check (true);

create table if not exists public.project_ratings (
  id uuid default gen_random_uuid() primary key,
  project_id uuid not null references public.projects(id) on delete cascade,
  value integer not null check (value between 1 and 5),
  created_at timestamp with time zone not null default timezone('utc', now())
);

create index if not exists project_ratings_project_id_created_at_idx
on public.project_ratings(project_id, created_at desc);

alter table public.project_ratings enable row level security;

drop policy if exists "Public can read project ratings" on public.project_ratings;
drop policy if exists "Public can insert project ratings" on public.project_ratings;

create policy "Public can read project ratings"
on public.project_ratings for select
using (true);

create policy "Public can insert project ratings"
on public.project_ratings for insert
with check (true);

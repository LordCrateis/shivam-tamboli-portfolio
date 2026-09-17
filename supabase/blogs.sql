-- ADMIN ACCESS CODE: update this email here only if your single allowed admin Gmail changes.
-- Current admin Gmail: shivamrtamboli62@gmail.com

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
using (lower((auth.jwt() ->> 'email')) = 'shivamrtamboli62@gmail.com')
with check (lower((auth.jwt() ->> 'email')) = 'shivamrtamboli62@gmail.com');

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
  set like_count = like_count + 1
  where id = blog_uuid
  returning like_count into next_like_count;

  return coalesce(next_like_count, 0);
end;
$$;

grant execute on function public.increment_blog_like(uuid) to anon, authenticated;

create table if not exists public.projects (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  slug text,
  category text,
  year integer,
  project_date date,
  description text,
  tech_stack text[] default '{}',
  live_url text,
  github_url text,
  live_cta_label text,
  case_study text,
  status text check (status in ('Deployed', 'In Progress', 'Archived')),
  order_index integer,
  visible boolean default true
);

alter table public.projects add column if not exists slug text;
alter table public.projects add column if not exists project_date date;
alter table public.projects add column if not exists github_url text;
alter table public.projects add column if not exists live_cta_label text;
alter table public.projects add column if not exists case_study text;
alter table public.projects add column if not exists include_in_resume boolean not null default false;
alter table public.projects add column if not exists resume_title text;
alter table public.projects add column if not exists resume_bullets text[] not null default '{}';
alter table public.projects add column if not exists resume_tech_stack text[] not null default '{}';
alter table public.projects add column if not exists resume_order integer not null default 0;

update public.projects
set
  slug = case lower(title)
    when 'nutricore ai' then 'nutricore-ai'
    when 'titanic prediction game' then 'titanic-prediction-game'
    when 'olist ecommerce analytics' then 'olist-ecommerce-analytics'
    when 'flamolina chatbot' then 'flamolina-chatbot'
    when 'flight control tower' then 'flight-control-tower'
    when 'nagarik' then 'nagarik'
    else lower(trim(both '-' from regexp_replace(title, '[^a-zA-Z0-9]+', '-', 'g')))
  end
where slug is null or btrim(slug) = '';

update public.projects
set github_url = case lower(title)
  when 'nutricore ai' then 'https://github.com/LordCrateis/nutricore-ai'
  when 'titanic prediction game' then 'https://github.com/LordCrateis/titanic-prediction-game'
  when 'olist ecommerce analytics' then 'https://github.com/LordCrateis/olist-ecommerce-analytics'
  when 'flamolina chatbot' then 'https://github.com/LordCrateis/flamolina-chatbot'
  when 'flight control tower' then 'https://github.com/LordCrateis/flight-delay-control-tower'
  when 'nagarik' then 'https://github.com/LordCrateis/nagarik'
  else github_url
end
where github_url is null or btrim(github_url) = '';

update public.projects
set live_cta_label = case lower(title)
  when 'nutricore ai' then 'Generate a Nutrition Plan'
  when 'titanic prediction game' then 'Board the Simulation'
  when 'olist ecommerce analytics' then 'Explore the Dashboard'
  when 'flamolina chatbot' then 'Ask Flamolina'
  when 'flight control tower' then 'Run a Delay Forecast'
  when 'nagarik' then 'Find Eligible Schemes'
  else 'Open the Project'
end
where live_cta_label is null or btrim(live_cta_label) = '';

create unique index if not exists projects_slug_unique_idx
on public.projects(lower(slug))
where slug is not null;

alter table public.projects enable row level security;

drop policy if exists "Public can read projects" on public.projects;
drop policy if exists "Admin Gmail can manage projects" on public.projects;
drop policy if exists "Admin can add projects" on public.projects;
drop policy if exists "Admin can edit projects" on public.projects;
drop policy if exists "Admin can delete projects" on public.projects;

create policy "Public can read projects"
on public.projects for select
to anon, authenticated
using (true);

create policy "Admin can add projects"
on public.projects for insert
to authenticated
with check (lower(((select auth.jwt()) ->> 'email')) = 'shivamrtamboli62@gmail.com');

create policy "Admin can edit projects"
on public.projects for update
to authenticated
using (lower(((select auth.jwt()) ->> 'email')) = 'shivamrtamboli62@gmail.com')
with check (lower(((select auth.jwt()) ->> 'email')) = 'shivamrtamboli62@gmail.com');

create policy "Admin can delete projects"
on public.projects for delete
to authenticated
using (lower(((select auth.jwt()) ->> 'email')) = 'shivamrtamboli62@gmail.com');

grant select on table public.projects to anon, authenticated;
grant insert, update, delete on table public.projects to authenticated;

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
using (lower((auth.jwt() ->> 'email')) = 'shivamrtamboli62@gmail.com')
with check (lower((auth.jwt() ->> 'email')) = 'shivamrtamboli62@gmail.com');

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

create table if not exists public.blog_comment_reports (
  id uuid default gen_random_uuid() primary key,
  comment_id uuid not null references public.blog_comments(id) on delete cascade,
  alias text not null,
  comment_text text not null,
  created_at timestamp with time zone not null default timezone('utc', now())
);

create index if not exists blog_comment_reports_created_at_idx
on public.blog_comment_reports(created_at desc);

create index if not exists blog_comment_reports_comment_id_idx
on public.blog_comment_reports(comment_id);

alter table public.blog_comment_reports enable row level security;

drop policy if exists "Admin can read comment reports" on public.blog_comment_reports;
drop policy if exists "Public can insert comment reports" on public.blog_comment_reports;
drop policy if exists "Admin can delete comment reports" on public.blog_comment_reports;

create policy "Admin can read comment reports"
on public.blog_comment_reports for select
using (lower((auth.jwt() ->> 'email')) = 'shivamrtamboli62@gmail.com');

create policy "Public can insert comment reports"
on public.blog_comment_reports for insert
with check (true);

create policy "Admin can delete comment reports"
on public.blog_comment_reports for delete
using (lower((auth.jwt() ->> 'email')) = 'shivamrtamboli62@gmail.com');

create table if not exists public.project_media (
  id uuid default gen_random_uuid() primary key,
  project_id uuid not null references public.projects(id) on delete cascade,
  media_type text not null check (media_type in ('photo', 'video')),
  source_type text not null check (source_type in ('upload', 'embed')),
  url text not null,
  caption text,
  alt_text text,
  order_index integer not null default 0,
  created_at timestamp with time zone not null default timezone('utc', now())
);

alter table public.project_media add column if not exists caption text;
alter table public.project_media add column if not exists alt_text text;

create index if not exists project_media_project_id_order_idx
on public.project_media(project_id, order_index asc);

alter table public.project_media enable row level security;

drop policy if exists "Public can read project media" on public.project_media;
drop policy if exists "Admin can manage project media" on public.project_media;

create policy "Public can read project media"
on public.project_media for select
to anon, authenticated
using (true);

create policy "Admin can manage project media"
on public.project_media for all
to authenticated
using (lower((auth.jwt() ->> 'email')) = 'shivamrtamboli62@gmail.com')
with check (lower((auth.jwt() ->> 'email')) = 'shivamrtamboli62@gmail.com');

grant select on table public.project_media to anon, authenticated;
grant insert, update, delete on table public.project_media to authenticated;

create table if not exists public.project_collaborators (
  id uuid default gen_random_uuid() primary key,
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 100),
  github_url text not null check (github_url ~ '^https://(www\.)?github\.com/[A-Za-z0-9-]+/?$'),
  order_index integer not null default 0,
  created_at timestamp with time zone not null default timezone('utc', now())
);

create index if not exists project_collaborators_project_id_order_idx
on public.project_collaborators(project_id, order_index asc);

alter table public.project_collaborators enable row level security;

drop policy if exists "Public can read project collaborators" on public.project_collaborators;
drop policy if exists "Admin can manage project collaborators" on public.project_collaborators;
drop policy if exists "Admin can add project collaborators" on public.project_collaborators;
drop policy if exists "Admin can edit project collaborators" on public.project_collaborators;
drop policy if exists "Admin can delete project collaborators" on public.project_collaborators;

create policy "Public can read project collaborators"
on public.project_collaborators for select
to anon, authenticated
using (true);

create policy "Admin can add project collaborators"
on public.project_collaborators for insert
to authenticated
with check (lower(((select auth.jwt()) ->> 'email')) = 'shivamrtamboli62@gmail.com');

create policy "Admin can edit project collaborators"
on public.project_collaborators for update
to authenticated
using (lower(((select auth.jwt()) ->> 'email')) = 'shivamrtamboli62@gmail.com')
with check (lower(((select auth.jwt()) ->> 'email')) = 'shivamrtamboli62@gmail.com');

create policy "Admin can delete project collaborators"
on public.project_collaborators for delete
to authenticated
using (lower(((select auth.jwt()) ->> 'email')) = 'shivamrtamboli62@gmail.com');

grant select on table public.project_collaborators to anon, authenticated;
grant insert, update, delete on table public.project_collaborators to authenticated;

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

grant select on table public.project_ratings to anon, authenticated;
grant insert on table public.project_ratings to anon, authenticated;

-- Auto-generated resume schema.
-- The PDF is compiled from selected projects and a singleton set of static sections.

alter table public.projects
  add column if not exists include_in_resume boolean not null default false,
  add column if not exists resume_title text,
  add column if not exists resume_bullets text[] not null default '{}',
  add column if not exists resume_tech_stack text[] not null default '{}',
  add column if not exists resume_order integer not null default 0;

create index if not exists projects_resume_selection_idx
on public.projects(include_in_resume, resume_order, order_index)
where include_in_resume = true;

create table if not exists public.resume_settings (
  id uuid primary key,
  full_name text not null,
  email text,
  phone text,
  location text,
  linkedin_url text,
  github_url text,
  education jsonb not null default '[]'::jsonb check (jsonb_typeof(education) = 'array'),
  experience jsonb not null default '[]'::jsonb check (jsonb_typeof(experience) = 'array'),
  skills jsonb not null default '[]'::jsonb check (jsonb_typeof(skills) = 'array'),
  generation_status text not null default 'never' check (generation_status in ('never', 'generating', 'ready', 'failed')),
  generation_error text,
  generated_at timestamp with time zone,
  updated_at timestamp with time zone not null default timezone('utc', now())
);

insert into public.resume_settings (
  id,
  full_name,
  email,
  github_url
)
values (
  'b0000000-0000-0000-0000-000000000001',
  'Shivam Tamboli',
  'shivamrtamboli62@gmail.com',
  'https://github.com/LordCrateis'
)
on conflict (id) do nothing;

alter table public.resume_settings enable row level security;

drop policy if exists "Admin can read resume settings" on public.resume_settings;
drop policy if exists "Admin can add resume settings" on public.resume_settings;
drop policy if exists "Admin can edit resume settings" on public.resume_settings;

create policy "Admin can read resume settings"
on public.resume_settings for select
to authenticated
using (lower(((select auth.jwt()) ->> 'email')) = 'shivamrtamboli62@gmail.com');

create policy "Admin can add resume settings"
on public.resume_settings for insert
to authenticated
with check (lower(((select auth.jwt()) ->> 'email')) = 'shivamrtamboli62@gmail.com');

create policy "Admin can edit resume settings"
on public.resume_settings for update
to authenticated
using (lower(((select auth.jwt()) ->> 'email')) = 'shivamrtamboli62@gmail.com')
with check (lower(((select auth.jwt()) ->> 'email')) = 'shivamrtamboli62@gmail.com');

grant select, insert, update on table public.resume_settings to authenticated;

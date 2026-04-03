create extension if not exists pgcrypto;

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'published', 'failed')),
  type text not null default 'post' check (type in ('post', 'carousel')),
  topic text,
  caption text,
  tags text[] default '{}',
  image_url text,
  slides jsonb default '[]'::jsonb,
  error_message text,
  published_post_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_posts_updated_at on public.posts;
create trigger trg_posts_updated_at
before update on public.posts
for each row
execute function public.set_updated_at();

alter table public.posts enable row level security;

-- Panel webowy moze odczytywac pending i aktualizowac status po zalogowaniu anon key + policy.
create policy if not exists "public_select_pending_posts"
on public.posts
for select
to anon
using (status = 'pending');

create policy if not exists "public_update_pending_posts"
on public.posts
for update
to anon
using (status = 'pending')
with check (status in ('approved', 'rejected', 'pending'));

create policy if not exists "service_role_all_posts"
on public.posts
for all
to service_role
using (true)
with check (true);


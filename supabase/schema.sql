-- ── Migracja: dodanie typu 'story' (uruchom jeśli tabela już istnieje) ──────
-- ALTER TABLE public.posts DROP CONSTRAINT IF EXISTS posts_type_check;
-- ALTER TABLE public.posts ADD CONSTRAINT posts_type_check
--   CHECK (type IN ('post', 'carousel', 'story'));

create extension if not exists pgcrypto;

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'published', 'failed')),
  type text not null default 'post' check (type in ('post', 'carousel', 'story')),
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
drop policy if exists "public_select_pending_posts" on public.posts;
create policy "public_select_pending_posts"
on public.posts
for select
to anon
using (status = 'pending');

drop policy if exists "public_update_pending_posts" on public.posts;
create policy "public_update_pending_posts"
on public.posts
for update
to anon
using (status = 'pending')
with check (status in ('approved', 'rejected', 'pending'));

drop policy if exists "service_role_all_posts" on public.posts;
create policy "service_role_all_posts"
on public.posts
for all
to service_role
using (true)
with check (true);

-- ── Storage: bucket instagram-posts ────────────────────────────
-- Utwórz bucket jeśli nie istnieje (public = obrazki dostępne publicznie dla Meta API)
insert into storage.buckets (id, name, public)
values ('instagram-posts', 'instagram-posts', true)
on conflict (id) do update set public = true;

-- Publiczny odczyt (wymagany przez Meta Graph API do pobrania obrazka)
drop policy if exists "storage_public_read" on storage.objects;
create policy "storage_public_read"
on storage.objects for select
to public
using (bucket_id = 'instagram-posts');

-- Zapis tylko przez service_role (generator w GitHub Actions)
drop policy if exists "storage_service_role_insert" on storage.objects;
create policy "storage_service_role_insert"
on storage.objects for insert
to service_role
with check (bucket_id = 'instagram-posts');

drop policy if exists "storage_service_role_update" on storage.objects;
create policy "storage_service_role_update"
on storage.objects for update
to service_role
using (bucket_id = 'instagram-posts')
with check (bucket_id = 'instagram-posts');

drop policy if exists "storage_service_role_delete" on storage.objects;
create policy "storage_service_role_delete"
on storage.objects for delete
to service_role
using (bucket_id = 'instagram-posts');


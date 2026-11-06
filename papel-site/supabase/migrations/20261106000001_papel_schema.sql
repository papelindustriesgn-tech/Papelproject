-- =====================================================================
-- Papel Industries — schéma du site officiel
-- Contenus publics (produits, gammes, actualités, réglages) lisibles par tous
-- lorsqu'ils sont publiés ; données commerciales (prospects, messages,
-- événements) accessibles uniquement aux administrateurs.
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------
create type public.publication_status as enum ('draft', 'published', 'archived');
create type public.availability as enum ('available', 'limited', 'coming_soon', 'unavailable');
create type public.lead_status as enum ('nouveau', 'a_contacter', 'en_discussion', 'converti', 'cloture');
create type public.message_status as enum ('nouveau', 'traite', 'archive');
create type public.admin_role as enum ('admin', 'editor');

-- ---------------------------------------------------------------------
-- Utilitaires
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------------------------------------------------------------------
-- Administrateurs
-- ---------------------------------------------------------------------
create table public.admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role public.admin_role not null default 'admin',
  display_name text,
  created_at timestamptz not null default now()
);
alter table public.admin_users enable row level security;

-- SECURITY DEFINER : évite la récursion RLS ; search_path figé.
create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.admin_users a where a.user_id = (select auth.uid()));
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

create policy "admins lisent la liste des admins" on public.admin_users
  for select to authenticated using ((select public.is_admin()));

-- ---------------------------------------------------------------------
-- Réglages du site (une ligne par clé, valeur JSON)
--   company : coordonnées, réseaux sociaux, WhatsApp, usine
--   home    : textes de la page d'accueil
-- ---------------------------------------------------------------------
create table public.site_settings (
  key text primary key check (key ~ '^[a-z_]{2,40}$'),
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);
alter table public.site_settings enable row level security;
create trigger site_settings_updated before update on public.site_settings
  for each row execute function public.set_updated_at();

create policy "réglages publics en lecture" on public.site_settings
  for select to anon, authenticated using (true);
create policy "admins modifient les réglages" on public.site_settings
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- ---------------------------------------------------------------------
-- Gammes de produits
-- ---------------------------------------------------------------------
create table public.product_ranges (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (char_length(name) between 2 and 80),
  tagline text check (char_length(tagline) <= 160),
  description text check (char_length(description) <= 2000),
  image_url text,
  -- « commercialisée » : seules ces gammes peuvent être présentées comme disponibles
  is_commercialized boolean not null default false,
  status public.publication_status not null default 'draft',
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.product_ranges enable row level security;
create trigger product_ranges_updated before update on public.product_ranges
  for each row execute function public.set_updated_at();

create policy "gammes publiées lisibles" on public.product_ranges
  for select to anon, authenticated using (status = 'published' or (select public.is_admin()));
create policy "admins gèrent les gammes" on public.product_ranges
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- ---------------------------------------------------------------------
-- Produits (références)
-- Les caractéristiques techniques sont facultatives : un champ vide est
-- affiché « en cours de validation », jamais complété automatiquement.
-- ---------------------------------------------------------------------
create table public.products (
  id uuid primary key default gen_random_uuid(),
  range_id uuid not null references public.product_ranges (id) on delete restrict,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (char_length(name) between 2 and 120),
  short_description text check (char_length(short_description) <= 240),
  description text check (char_length(description) <= 5000),
  images text[] not null default '{}' check (cardinality(images) <= 8),
  format text check (char_length(format) <= 120),
  dimensions text check (char_length(dimensions) <= 120),
  sheet_count text check (char_length(sheet_count) <= 60),
  ply_count text check (char_length(ply_count) <= 60),
  packaging text check (char_length(packaging) <= 240),
  recommended_uses text[] not null default '{}',
  technical_info text check (char_length(technical_info) <= 3000),
  availability public.availability not null default 'coming_soon',
  status public.publication_status not null default 'draft',
  is_featured boolean not null default false,
  seo_title text check (char_length(seo_title) <= 70),
  seo_description text check (char_length(seo_description) <= 170),
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index products_range_idx on public.products (range_id, sort_order);
alter table public.products enable row level security;
create trigger products_updated before update on public.products
  for each row execute function public.set_updated_at();

-- Un produit n'est public que si lui ET sa gamme sont publiés.
create policy "produits publiés lisibles" on public.products
  for select to anon, authenticated using (
    (status = 'published' and exists (
      select 1 from public.product_ranges r where r.id = range_id and r.status = 'published'))
    or (select public.is_admin())
  );
create policy "admins gèrent les produits" on public.products
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- ---------------------------------------------------------------------
-- Actualités
-- ---------------------------------------------------------------------
create table public.news_posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (char_length(title) between 4 and 140),
  excerpt text check (char_length(excerpt) <= 300),
  content text not null default '' check (char_length(content) <= 30000),
  cover_image text,
  category text not null default 'nouveautes'
    check (category in ('nouveautes', 'lancements', 'industrie', 'partenariats', 'evenements')),
  status public.publication_status not null default 'draft',
  published_at timestamptz,
  seo_title text check (char_length(seo_title) <= 70),
  seo_description text check (char_length(seo_description) <= 170),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index news_posts_pub_idx on public.news_posts (status, published_at desc);
alter table public.news_posts enable row level security;
create trigger news_posts_updated before update on public.news_posts
  for each row execute function public.set_updated_at();

create policy "actualités publiées lisibles" on public.news_posts
  for select to anon, authenticated using (
    (status = 'published' and published_at is not null and published_at <= now()) or (select public.is_admin()));
create policy "admins gèrent les actualités" on public.news_posts
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- ---------------------------------------------------------------------
-- Prospects (demandes professionnelles)
-- Aucune politique pour anon : l'insertion passe par le serveur (service role)
-- après validation, anti-spam et limitation de débit.
-- ---------------------------------------------------------------------
create table public.leads (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (char_length(full_name) between 2 and 120),
  company text check (char_length(company) <= 160),
  city text not null check (char_length(city) between 2 and 120),
  whatsapp text not null check (whatsapp ~ '^\+?[0-9 ]{8,20}$'),
  email text check (email is null or email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  activity_type text not null check (activity_type in (
    'grossiste', 'distributeur', 'revendeur', 'hotel', 'restaurant', 'entreprise', 'administration', 'autre')),
  products_wanted text[] not null default '{}',
  estimated_volume text check (char_length(estimated_volume) <= 120),
  message text check (char_length(message) <= 3000),
  request_type text not null default 'partenariat'
    check (request_type in ('partenariat', 'devis', 'information')),
  status public.lead_status not null default 'nouveau',
  internal_notes text check (char_length(internal_notes) <= 5000),
  source_path text check (char_length(source_path) <= 200),
  ip_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index leads_status_idx on public.leads (status, created_at desc);
create index leads_ip_idx on public.leads (ip_hash, created_at desc);
alter table public.leads enable row level security;
create trigger leads_updated before update on public.leads
  for each row execute function public.set_updated_at();

create policy "admins lisent les prospects" on public.leads
  for select to authenticated using ((select public.is_admin()));
create policy "admins mettent à jour les prospects" on public.leads
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admins suppriment les prospects" on public.leads
  for delete to authenticated using ((select public.is_admin()));

-- ---------------------------------------------------------------------
-- Messages de contact
-- ---------------------------------------------------------------------
create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  full_name text not null check (char_length(full_name) between 2 and 120),
  phone text check (phone is null or phone ~ '^\+?[0-9 ]{8,20}$'),
  email text check (email is null or email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  subject text not null check (char_length(subject) between 2 and 160),
  message text not null check (char_length(message) between 10 and 3000),
  status public.message_status not null default 'nouveau',
  ip_hash text,
  created_at timestamptz not null default now(),
  constraint contact_reachable check (phone is not null or email is not null)
);
create index contact_messages_idx on public.contact_messages (status, created_at desc);
create index contact_messages_ip_idx on public.contact_messages (ip_hash, created_at desc);
alter table public.contact_messages enable row level security;

create policy "admins lisent les messages" on public.contact_messages
  for select to authenticated using ((select public.is_admin()));
create policy "admins mettent à jour les messages" on public.contact_messages
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admins suppriment les messages" on public.contact_messages
  for delete to authenticated using ((select public.is_admin()));

-- ---------------------------------------------------------------------
-- Événements de conversion (clics WhatsApp, CTA…) — anonymes, sans cookie
-- ---------------------------------------------------------------------
create table public.conversion_events (
  id bigint generated always as identity primary key,
  event_type text not null check (event_type in ('whatsapp_click', 'cta_click', 'phone_click', 'email_click')),
  label text check (char_length(label) <= 80),
  path text check (char_length(path) <= 200),
  created_at timestamptz not null default now()
);
create index conversion_events_idx on public.conversion_events (created_at desc, event_type);
alter table public.conversion_events enable row level security;
create policy "admins lisent les événements" on public.conversion_events
  for select to authenticated using ((select public.is_admin()));

-- ---------------------------------------------------------------------
-- Stockage des médias (lecture publique, écriture admin)
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
on conflict (id) do nothing;

create policy "admins déposent des médias" on storage.objects
  for insert to authenticated with check (bucket_id = 'media' and (select public.is_admin()));
create policy "admins modifient des médias" on storage.objects
  for update to authenticated using (bucket_id = 'media' and (select public.is_admin()));
create policy "admins suppriment des médias" on storage.objects
  for delete to authenticated using (bucket_id = 'media' and (select public.is_admin()));

-- ---------------------------------------------------------------------
-- Droits explicites : anon ne voit que les contenus publics
-- ---------------------------------------------------------------------
revoke all on public.leads, public.contact_messages, public.conversion_events, public.admin_users from anon;

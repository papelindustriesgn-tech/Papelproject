-- =============================================================================
-- UNY — modération de la marketplace
--   • Signalement d'une annonce par un utilisateur (motif, précisions), un seul signalement ouvert par personne.
--   • 3 signalements ouverts de personnes différentes : l'annonce est masquée en attendant la décision.
--   • Blocage d'un utilisateur : ses annonces disparaissent pour celui qui bloque (et inversement),
--     son téléphone n'est plus affiché.
--   • File de traitement admin : décision (classer / retirer l'annonce), note, responsable, date.
-- =============================================================================

create table public.content_reports (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.marketplace_items(id) on delete cascade,
  reporter_id uuid references public.profiles(id) on delete set null,
  reason text not null check (reason in ('scam', 'prohibited', 'offensive', 'spam', 'wrong_info', 'other')),
  details text check (char_length(details) <= 500),
  status text not null default 'open' check (status in ('open', 'dismissed', 'actioned')),
  decision_note text check (char_length(decision_note) <= 500),
  decided_by uuid references public.profiles(id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now()
);
create index content_reports_status_idx on public.content_reports(status, created_at desc);
create index content_reports_item_idx on public.content_reports(item_id);
create unique index content_reports_one_open on public.content_reports(item_id, reporter_id) where status = 'open';

alter table public.content_reports enable row level security;
create policy "reports_read" on public.content_reports for select to authenticated
  using (reporter_id = (select auth.uid()) or public.is_admin());
create policy "reports_admin_update" on public.content_reports for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
revoke all on public.content_reports from anon;
revoke insert, delete on public.content_reports from authenticated;

create table public.user_blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
create index user_blocks_blocked_idx on public.user_blocks(blocked_id);
alter table public.user_blocks enable row level security;
create policy "blocks_own" on public.user_blocks for select to authenticated
  using (blocker_id = (select auth.uid()));
create policy "blocks_insert_own" on public.user_blocks for insert to authenticated
  with check (blocker_id = (select auth.uid()));
create policy "blocks_delete_own" on public.user_blocks for delete to authenticated
  using (blocker_id = (select auth.uid()));
revoke all on public.user_blocks from anon;

-- Vendeurs à masquer pour l'utilisateur connecté : ceux qu'il a bloqués et ceux qui l'ont bloqué
create or replace function public.my_hidden_sellers()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select blocked_id from public.user_blocks where blocker_id = auth.uid()
  union
  select blocker_id from public.user_blocks where blocked_id = auth.uid();
$$;
revoke all on function public.my_hidden_sellers() from public, anon;
grant execute on function public.my_hidden_sellers() to authenticated;

-- Signaler une annonce
create or replace function public.report_listing(p_item uuid, p_reason text, p_details text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_seller uuid;
  v_open integer;
begin
  if v_uid is null then
    raise exception 'Connexion requise.' using errcode = '42501';
  end if;
  select seller_id into v_seller from public.marketplace_items where id = p_item and status in ('active', 'hidden');
  if not found then
    raise exception 'Annonce introuvable.' using errcode = 'P0001';
  end if;
  if v_seller = v_uid then
    raise exception 'Tu ne peux pas signaler ta propre annonce.' using errcode = 'P0001';
  end if;
  if (select count(*) from public.content_reports where reporter_id = v_uid and created_at > now() - interval '1 day') >= 10 then
    raise exception 'Trop de signalements aujourd''hui. Réessaie demain.' using errcode = 'P0001';
  end if;
  insert into public.content_reports (item_id, reporter_id, reason, details)
  values (p_item, v_uid, p_reason, nullif(left(trim(coalesce(p_details, '')), 500), ''))
  on conflict (item_id, reporter_id) where status = 'open' do nothing;

  select count(distinct reporter_id) into v_open from public.content_reports where item_id = p_item and status = 'open';
  if v_open >= 3 then
    update public.marketplace_items set status = 'hidden' where id = p_item and status = 'active';
  end if;
  return jsonb_build_object('open_reports', v_open);
end;
$$;
revoke all on function public.report_listing(uuid, text, text) from public, anon;
grant execute on function public.report_listing(uuid, text, text) to authenticated;

-- Décision de l'équipe Uny sur les signalements d'une annonce
create or replace function public.moderate_listing(p_item uuid, p_decision text, p_note text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_title text;
  v_seller uuid;
  v_note text := nullif(left(trim(coalesce(p_note, '')), 500), '');
begin
  if not public.is_admin() then
    raise exception 'Accès refusé' using errcode = '42501';
  end if;
  if p_decision not in ('dismiss', 'remove') then
    raise exception 'Décision inconnue.' using errcode = 'P0001';
  end if;
  if p_decision = 'remove' and v_note is null then
    raise exception 'Indique le motif du retrait (visible par le vendeur).' using errcode = 'P0001';
  end if;
  select title, seller_id into v_title, v_seller from public.marketplace_items where id = p_item;
  if not found then
    raise exception 'Annonce introuvable.' using errcode = 'P0001';
  end if;

  update public.content_reports
     set status = case when p_decision = 'remove' then 'actioned' else 'dismissed' end,
         decision_note = v_note, decided_by = auth.uid(), decided_at = now()
   where item_id = p_item and status = 'open';

  if p_decision = 'remove' then
    update public.marketplace_items set status = 'removed', moderation_note = v_note where id = p_item;
    if v_seller is not null then
      insert into public.notifications (user_id, type, title, body, link)
      values (v_seller, 'listing_removed', 'Annonce retirée',
              left(format('Ton annonce « %s » a été retirée par l''équipe Uny. Motif : %s', v_title, v_note), 300),
              '/regles-marketplace');
    end if;
  else
    -- Annonce masquée automatiquement puis jugée conforme : elle redevient visible
    update public.marketplace_items set status = 'active' where id = p_item and status = 'hidden';
  end if;
end;
$$;
revoke all on function public.moderate_listing(uuid, text, text) from public, anon;
grant execute on function public.moderate_listing(uuid, text, text) to authenticated;

-- =============================================================================
-- UNY — intégrité des cartes, codes promo et offres ; rôles des commerçants
--   • Création d'un code : demandes simultanées sérialisées par offre (quota flash exact,
--     un seul code actif par étudiant et par offre).
--   • Utilisation d'un code : verrou sur le code (pas de double utilisation) et nouveaux
--     contrôles au moment de l'utilisation : partenaire actif, offre active et dans sa période,
--     compte actif, statut étudiant et carte valides si l'offre l'exige. Sinon : état « blocked ».
--   • Vérification d'une carte pour une offre : l'offre doit être valable aujourd'hui.
--   • Commerçants : rôle « manager » (offres, fiche, fidélité, équipe) ou « cashier » (caisse :
--     scanner, vérifier, valider). Les membres existants deviennent « manager ».
-- =============================================================================

create or replace function public.claim_promo_code(p_deal uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_deal record;
  v_status public.verification_status;
  v_card_ok boolean;
  v_existing record;
  v_expires timestamptz;
  v_code text;
begin
  if v_user is null then
    raise exception 'Connexion requise.' using errcode = '42501';
  end if;

  select d.id, d.partner_id, d.is_active, d.valid_from, d.valid_until, d.requires_verification, p.is_active as partner_active,
         d.flash_ends_at, d.flash_started_at, d.flash_quantity
    into v_deal
    from public.deals d join public.partners p on p.id = d.partner_id
   where d.id = p_deal;
  if not found or not v_deal.is_active or not v_deal.partner_active then
    raise exception 'Offre indisponible.' using errcode = 'P0001';
  end if;
  if v_deal.valid_from > (now() at time zone 'Africa/Conakry')::date or (v_deal.valid_until is not null and v_deal.valid_until < (now() at time zone 'Africa/Conakry')::date) then
    raise exception 'Cette offre n''est pas valable aujourd''hui.' using errcode = 'P0001';
  end if;
  if v_deal.flash_started_at is not null and v_deal.flash_started_at > now() then
    raise exception 'Cette offre flash n''a pas encore commencé.' using errcode = 'P0001';
  end if;
  if v_deal.flash_ends_at is not null and v_deal.flash_ends_at <= now() then
    raise exception 'Cette offre flash est terminée.' using errcode = 'P0001';
  end if;

  -- Une demande à la fois par offre : le quota flash et le « un code actif par étudiant »
  -- restent exacts même avec des demandes simultanées.
  perform pg_advisory_xact_lock(hashtextextended('uny.claim:' || p_deal::text, 0));

  select verification_status into v_status from public.profiles where id = v_user;
  select exists (
    select 1 from public.student_cards c
     where c.user_id = v_user and c.status = 'active' and c.expires_at >= current_date
  ) into v_card_ok;
  if v_deal.requires_verification and (v_status is distinct from 'verified' or not v_card_ok) then
    raise exception 'Cette offre est réservée aux étudiants vérifiés avec une carte valide.' using errcode = 'P0001';
  end if;

  select code, expires_at into v_existing
    from public.promo_codes
   where deal_id = p_deal and student_id = v_user and status = 'active' and expires_at > now()
   order by created_at desc limit 1;
  if found then
    return jsonb_build_object('code', v_existing.code, 'expires_at', v_existing.expires_at, 'created', false);
  end if;

  if v_deal.flash_ends_at is not null and v_deal.flash_quantity is not null
     and (select count(*) from public.promo_codes
           where deal_id = p_deal and created_at >= v_deal.flash_started_at and status <> 'cancelled') >= v_deal.flash_quantity then
    raise exception 'Offre flash épuisée : toutes les places sont parties.' using errcode = 'P0001';
  end if;

  if (select count(*) from public.promo_codes where student_id = v_user and created_at > now() - interval '1 day') >= 20 then
    raise exception 'Trop de codes demandés aujourd''hui. Réessaie demain.' using errcode = 'P0001';
  end if;

  v_expires := now() + interval '7 days';
  if v_deal.valid_until is not null then
    v_expires := least(v_expires, (v_deal.valid_until + 1)::timestamp at time zone 'Africa/Conakry');
  end if;
  -- Offre flash : le code reste utilisable 24 h après la fin de l'offre
  if v_deal.flash_ends_at is not null then
    v_expires := least(v_expires, v_deal.flash_ends_at + interval '24 hours');
  end if;
  v_code := public.new_promo_code();
  insert into public.promo_codes (code, deal_id, partner_id, student_id, expires_at)
  values (v_code, p_deal, v_deal.partner_id, v_user, v_expires);
  return jsonb_build_object('code', v_code, 'expires_at', v_expires, 'created', true);
end;
$$;

revoke all on function public.claim_promo_code(uuid) from public, anon;
grant execute on function public.claim_promo_code(uuid) to authenticated;

create or replace function public.partner_validate_card(
  p_partner uuid,
  p_token text default null,
  p_uny_id text default null,
  p_deal uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid;
  v_uny_id text;
  v_year text;
  v_card_status public.card_status;
  v_expires date;
  v_first text;
  v_last text;
  v_avatar text;
  v_university text;
  v_field text;
  v_status public.verification_status;
  v_outcome text;
  v_eligible boolean;
  v_deal_title text;
  v_deal_requires boolean := true;
  v_uses integer := 0;
  v_partner_name text;
  v_loyalty jsonb;
begin
  if not (public.is_partner_member(p_partner) or public.is_admin()) then
    raise exception 'Accès refusé' using errcode = '42501';
  end if;
  if (select count(*) from public.card_validations
       where partner_id = p_partner and created_at > now() - interval '1 hour') >= 300 then
    raise exception 'Trop de vérifications en une heure. Réessaie plus tard.' using errcode = 'P0001';
  end if;

  if p_deal is not null then
    select d.title, d.requires_verification into v_deal_title, v_deal_requires
      from public.deals d where d.id = p_deal and d.partner_id = p_partner;
    if not found then
      raise exception 'Offre inconnue.' using errcode = 'P0001';
    end if;
    if not exists (
      select 1 from public.deals d
       where d.id = p_deal and d.is_active
         and d.valid_from <= (now() at time zone 'Africa/Conakry')::date
         and (d.valid_until is null or d.valid_until >= (now() at time zone 'Africa/Conakry')::date)
         and (d.flash_ends_at is null or d.flash_ends_at > now())
    ) then
      raise exception 'Cette offre n''est plus valable aujourd''hui.' using errcode = 'P0001';
    end if;
  end if;

  select c.user_id, c.uny_id, c.academic_year, c.status, c.expires_at,
         p.first_name, p.last_name, p.avatar_url, coalesce(b.official_name, u.name, p.university_other),
         coalesce(e.program, p.field_of_study), p.verification_status
    into v_user, v_uny_id, v_year, v_card_status, v_expires,
         v_first, v_last, v_avatar, v_university, v_field, v_status
    from public.student_cards c
    join public.profiles p on p.id = c.user_id
    left join public.universities u on u.id = p.university_id
    left join public.university_branding b on b.university_id = u.id
    left join public.student_enrollments e on e.id = c.enrollment_id
   where (p_token is not null and c.qr_token = p_token)
      or (p_token is null and p_uny_id is not null and c.uny_id = upper(trim(p_uny_id)))
   limit 1;

  if v_user is null then
    return jsonb_build_object('found', false);
  end if;

  v_outcome := case
    when v_card_status = 'revoked' then 'revoked'
    when v_card_status = 'expired' or v_expires < current_date then 'expired'
    when v_status is distinct from 'verified' then 'unverified'
    else 'valid'
  end;
  v_eligible := v_outcome = 'valid' or (v_outcome = 'unverified' and p_deal is not null and not v_deal_requires);

  if p_deal is not null then
    select count(*) into v_uses from public.card_validations
     where deal_id = p_deal and student_id = v_user and eligible
       and created_at >= date_trunc('day', now());
  end if;

  insert into public.card_validations
    (partner_id, deal_id, student_id, scanned_by, student_name, student_uny_id, outcome, eligible)
  values (p_partner, p_deal, v_user, auth.uid(), v_first || ' ' || v_last, v_uny_id, v_outcome, v_eligible);

  if v_eligible then
    select name into v_partner_name from public.partners where id = p_partner;
    insert into public.notifications (user_id, type, title, body, link)
    values (v_user, 'card_validated', 'Carte Uny validée ✅',
            'Chez ' || v_partner_name || coalesce(' · ' || v_deal_title, '') || '. Bon plan !', '/carte');
    v_loyalty := public.loyalty_add_visit(p_partner, v_user, null);
  else
    v_loyalty := public.loyalty_status(p_partner, v_user);
  end if;

  return jsonb_build_object(
    'found', true,
    'outcome', v_outcome,
    'eligible', v_eligible,
    'uny_id', v_uny_id,
    'first_name', v_first,
    'last_name', v_last,
    'avatar_url', v_avatar,
    'university', v_university,
    'field_of_study', v_field,
    'academic_year', v_year,
    'expires_at', v_expires,
    'deal_title', v_deal_title,
    'deal_requires_verification', v_deal_requires,
    'uses_today', v_uses,
    'loyalty', v_loyalty
  );
end;
$$;

create or replace function public.partner_redeem_promo_code(
  p_partner uuid,
  p_code text,
  p_redeem boolean default false,
  p_payment_method text default null,
  p_reference text default null,
  p_amount bigint default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row record;
  v_state text;
  v_loyalty jsonb;
  v_reason text;
  v_today date := (now() at time zone 'Africa/Conakry')::date;
begin
  if not (public.is_partner_member(p_partner) or public.is_admin()) then
    raise exception 'Accès refusé' using errcode = '42501';
  end if;
  if p_payment_method is not null and p_payment_method not in ('orange_money', 'cash', 'other') then
    raise exception 'Mode de paiement inconnu.' using errcode = 'P0001';
  end if;
  if p_amount is not null and (p_amount < 0 or p_amount > 1000000000) then
    raise exception 'Montant invalide.' using errcode = 'P0001';
  end if;

  select pc.*, d.title as deal_title, d.discount_label, d.price_gnf, d.promo_price_gnf,
         d.is_active as deal_active, d.valid_from, d.valid_until, d.requires_verification,
         pa.is_active as partner_active,
         pr.first_name, pr.last_name, pr.avatar_url, pr.uny_id, pr.verification_status, pr.account_status,
         c.status as card_status, c.expires_at as card_expires_at
    into v_row
    from public.promo_codes pc
    join public.deals d on d.id = pc.deal_id
    join public.partners pa on pa.id = pc.partner_id
    join public.profiles pr on pr.id = pc.student_id
    left join public.student_cards c on c.user_id = pc.student_id
   where pc.code = upper(trim(p_code)) and pc.partner_id = p_partner
   for update of pc;
  if not found then
    return jsonb_build_object('found', false);
  end if;

  v_state := case
    when v_row.status = 'used' then 'used'
    when v_row.status = 'cancelled' then 'cancelled'
    when v_row.expires_at <= now() then 'expired'
    else 'active' end;

  -- Contrôles au moment de l'utilisation (et pas seulement à la création du code)
  if v_state = 'active' then
    v_reason := case
      when not v_row.partner_active then 'Ton établissement est désactivé sur Uny.'
      when not v_row.deal_active then 'Cette offre a été retirée.'
      when v_row.valid_from > v_today then 'Cette offre n''a pas encore commencé.'
      when v_row.valid_until is not null and v_row.valid_until < v_today then 'Cette offre a expiré.'
      when v_row.account_status is distinct from 'approved' then 'Le compte de cet étudiant n''est pas actif.'
      when v_row.requires_verification and v_row.verification_status is distinct from 'verified'
        then 'Cet étudiant n''est plus vérifié : la réduction ne s''applique pas.'
      when v_row.requires_verification and (v_row.card_status is distinct from 'active' or v_row.card_expires_at < v_today)
        then 'La carte Uny de cet étudiant est expirée ou révoquée.'
    end;
    if v_reason is not null then
      v_state := 'blocked';
    end if;
  end if;

  if p_redeem and v_state = 'active' then
    update public.promo_codes
       set status = 'used', used_at = now(), used_by = auth.uid(),
           payment_method = coalesce(p_payment_method, payment_method),
           payment_reference = coalesce(nullif(trim(p_reference), ''), payment_reference),
           amount_gnf = coalesce(p_amount, v_row.promo_price_gnf)
     where id = v_row.id;
    insert into public.notifications (user_id, type, title, body, link)
    values (v_row.student_id, 'promo_used', 'Code promo utilisé ✅',
            format('Ton code %s a été validé : %s.', v_row.code, v_row.deal_title), '/avantages/mes-codes');
    v_loyalty := public.loyalty_add_visit(p_partner, v_row.student_id, coalesce(p_amount, v_row.promo_price_gnf));
    v_state := 'redeemed';
  end if;
  if v_loyalty is null then
    v_loyalty := public.loyalty_status(p_partner, v_row.student_id);
  end if;

  return jsonb_build_object(
    'found', true,
    'state', v_state,
    'code', v_row.code,
    'deal_title', v_row.deal_title,
    'discount_label', v_row.discount_label,
    'price_gnf', v_row.price_gnf,
    'promo_price_gnf', v_row.promo_price_gnf,
    'first_name', v_row.first_name,
    'last_name', v_row.last_name,
    'avatar_url', v_row.avatar_url,
    'uny_id', v_row.uny_id,
    'expires_at', v_row.expires_at,
    'used_at', case when v_state = 'redeemed' then now() else v_row.used_at end,
    'payment_reference', coalesce(nullif(trim(p_reference), ''), v_row.payment_reference),
    'reason', v_reason,
    'loyalty', v_loyalty
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- Rôles des commerçants
-- -----------------------------------------------------------------------------
alter table public.partner_members
  add column if not exists role text not null default 'manager' check (role in ('manager', 'cashier'));

create or replace function public.is_partner_manager(p_partner uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_partner is not null and exists (
    select 1 from public.partner_members m
     where m.partner_id = p_partner and m.user_id = auth.uid() and m.role = 'manager'
  );
$$;
revoke all on function public.is_partner_manager(uuid) from public, anon;
grant execute on function public.is_partner_manager(uuid) to authenticated;

-- Écritures (fiche, offres, emplois, logements, annonces, fidélité) : responsable uniquement
drop policy if exists "partners_member_update" on public.partners;
create policy "partners_member_update" on public.partners for update to authenticated
  using (public.is_partner_manager(id)) with check (public.is_partner_manager(id));

do $$
declare
  t text;
begin
  foreach t in array array['deals', 'jobs', 'housing'] loop
    execute format('drop policy if exists "%1$s_member_insert" on public.%1$s', t);
    execute format('drop policy if exists "%1$s_member_update" on public.%1$s', t);
    execute format('drop policy if exists "%1$s_member_delete" on public.%1$s', t);
    execute format('create policy "%1$s_member_insert" on public.%1$s for insert to authenticated
                      with check (public.is_partner_manager(partner_id))', t);
    execute format('create policy "%1$s_member_update" on public.%1$s for update to authenticated
                      using (public.is_partner_manager(partner_id)) with check (public.is_partner_manager(partner_id))', t);
    execute format('create policy "%1$s_member_delete" on public.%1$s for delete to authenticated
                      using (public.is_partner_manager(partner_id))', t);
  end loop;
end $$;

drop policy if exists "market_member_update" on public.marketplace_items;
create policy "market_member_update" on public.marketplace_items for update to authenticated
  using (public.is_partner_manager(partner_id)) with check (public.is_partner_manager(partner_id));
drop policy if exists "market_member_delete" on public.marketplace_items;
create policy "market_member_delete" on public.marketplace_items for delete to authenticated
  using (public.is_partner_manager(partner_id));

drop policy if exists "loyalty_programs_insert" on public.loyalty_programs;
create policy "loyalty_programs_insert" on public.loyalty_programs for insert to authenticated
  with check (public.is_partner_manager(partner_id) or public.is_admin());
drop policy if exists "loyalty_programs_update" on public.loyalty_programs;
create policy "loyalty_programs_update" on public.loyalty_programs for update to authenticated
  using (public.is_partner_manager(partner_id) or public.is_admin())
  with check (public.is_partner_manager(partner_id) or public.is_admin());

-- Cadeaux de fidélité et liste des clients : responsable uniquement
alter function public.partner_gift_loyalty(uuid, uuid, text) rename to partner_gift_loyalty_impl;
revoke all on function public.partner_gift_loyalty_impl(uuid, uuid, text) from public, anon, authenticated;
create or replace function public.partner_gift_loyalty(p_partner uuid, p_card uuid, p_kind text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (public.is_partner_manager(p_partner) or public.is_admin()) then
    raise exception 'Réservé au responsable du commerce.' using errcode = '42501';
  end if;
  return public.partner_gift_loyalty_impl(p_partner, p_card, p_kind);
end;
$$;
revoke all on function public.partner_gift_loyalty(uuid, uuid, text) from public, anon;
grant execute on function public.partner_gift_loyalty(uuid, uuid, text) to authenticated;

alter function public.partner_top_customers(uuid, integer) rename to partner_top_customers_impl;
revoke all on function public.partner_top_customers_impl(uuid, integer) from public, anon, authenticated;
create or replace function public.partner_top_customers(p_partner uuid, p_limit integer default 50)
returns table (
  card_id uuid, first_name text, last_initial text, avatar_url text, uny_id text,
  total_visits integer, total_spent_gnf bigint, stamps smallint, rewards_available smallint,
  rewards_used integer, last_visit_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (public.is_partner_manager(p_partner) or public.is_admin()) then
    raise exception 'Réservé au responsable du commerce.' using errcode = '42501';
  end if;
  return query select * from public.partner_top_customers_impl(p_partner, p_limit);
end;
$$;
revoke all on function public.partner_top_customers(uuid, integer) from public, anon;
grant execute on function public.partner_top_customers(uuid, integer) to authenticated;

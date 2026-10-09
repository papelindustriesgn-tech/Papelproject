-- =============================================================================
-- UNY — codes promo et paiement Orange Money chez les partenaires
--   • chaque partenaire peut renseigner son code marchand Orange Money
--   • offres : prix normal / prix étudiant (facultatifs)
--   • marketplace : prix avant promo (articles en promotion)
--   • codes promo personnels : l'étudiant obtient un code dans l'app, le partenaire
--     le valide (et note le paiement). Uny n'encaisse aucun fonds : le paiement va
--     directement du compte Orange Money de l'étudiant au code marchand du partenaire.
-- =============================================================================

alter table public.partners
  add column orange_money_merchant_code text
    check (orange_money_merchant_code is null or orange_money_merchant_code ~ '^[0-9]{4,12}$');

alter table public.deals
  add column price_gnf bigint check (price_gnf is null or (price_gnf > 0 and price_gnf <= 1000000000)),
  add column promo_price_gnf bigint check (promo_price_gnf is null or (promo_price_gnf >= 0 and promo_price_gnf <= 1000000000)),
  add constraint deals_promo_price_lower check (promo_price_gnf is null or price_gnf is null or promo_price_gnf < price_gnf);

alter table public.marketplace_items
  add column original_price_gnf bigint check (original_price_gnf is null or original_price_gnf <= 1000000000),
  add constraint marketplace_promo_price_higher check (original_price_gnf is null or original_price_gnf > price_gnf);
grant select (original_price_gnf, partner_id) on public.marketplace_items to anon;
create index marketplace_promo_idx on public.marketplace_items(status, created_at desc) where original_price_gnf is not null;

-- -----------------------------------------------------------------------------
-- Codes promo
-- -----------------------------------------------------------------------------
create table public.promo_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  deal_id uuid not null references public.deals(id) on delete cascade,
  partner_id uuid not null references public.partners(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'used', 'cancelled')),
  expires_at timestamptz not null,
  -- Paiement déclaré (Uny ne détient jamais les fonds)
  payment_method text check (payment_method in ('orange_money', 'cash', 'other')),
  payment_reference text check (char_length(payment_reference) <= 60),
  amount_gnf bigint check (amount_gnf is null or (amount_gnf >= 0 and amount_gnf <= 1000000000)),
  used_at timestamptz,
  used_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index promo_codes_student_idx on public.promo_codes(student_id, created_at desc);
create index promo_codes_partner_idx on public.promo_codes(partner_id, created_at desc);
create index promo_codes_deal_student_idx on public.promo_codes(deal_id, student_id, status);

alter table public.promo_codes enable row level security;
create policy "promo_codes_read" on public.promo_codes for select to authenticated
  using (student_id = (select auth.uid()) or public.is_partner_member(partner_id) or public.is_admin());
revoke all on public.promo_codes from anon;
revoke insert, update, delete on public.promo_codes from authenticated;

-- Code lisible au comptoir : UNY-XXXX-XX (alphabet sans 0/O, 1/I/L, U)
create or replace function public.new_promo_code()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_alphabet constant text := '23456789ABCDEFGHJKMNPQRSTVWXYZ';
  v_bytes bytea;
  v_body text;
  v_code text;
begin
  loop
    v_bytes := extensions.gen_random_bytes(6);
    v_body := '';
    for i in 1..6 loop
      v_body := v_body || substr(v_alphabet, (get_byte(v_bytes, i - 1) % 30) + 1, 1);
    end loop;
    v_code := format('UNY-%s-%s', substr(v_body, 1, 4), substr(v_body, 5, 2));
    exit when not exists (select 1 from public.promo_codes where code = v_code);
  end loop;
  return v_code;
end;
$$;
revoke all on function public.new_promo_code() from public, anon, authenticated;

-- L'étudiant obtient (ou retrouve) son code pour une offre. Valable 7 jours, sans dépasser la fin de l'offre.
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

  select d.id, d.partner_id, d.is_active, d.valid_from, d.valid_until, d.requires_verification, p.is_active as partner_active
    into v_deal
    from public.deals d join public.partners p on p.id = d.partner_id
   where d.id = p_deal;
  if not found or not v_deal.is_active or not v_deal.partner_active then
    raise exception 'Offre indisponible.' using errcode = 'P0001';
  end if;
  if v_deal.valid_from > current_date or (v_deal.valid_until is not null and v_deal.valid_until < current_date) then
    raise exception 'Cette offre n''est pas valable aujourd''hui.' using errcode = 'P0001';
  end if;

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

  if (select count(*) from public.promo_codes where student_id = v_user and created_at > now() - interval '1 day') >= 20 then
    raise exception 'Trop de codes demandés aujourd''hui. Réessaie demain.' using errcode = 'P0001';
  end if;

  v_expires := now() + interval '7 days';
  if v_deal.valid_until is not null then
    v_expires := least(v_expires, (v_deal.valid_until + 1)::timestamp at time zone 'Africa/Conakry');
  end if;
  v_code := public.new_promo_code();
  insert into public.promo_codes (code, deal_id, partner_id, student_id, expires_at)
  values (v_code, p_deal, v_deal.partner_id, v_user, v_expires);
  return jsonb_build_object('code', v_code, 'expires_at', v_expires, 'created', true);
end;
$$;
revoke all on function public.claim_promo_code(uuid) from public, anon;
grant execute on function public.claim_promo_code(uuid) to authenticated;

-- L'étudiant note la référence de son paiement Orange Money (aide le partenaire à retrouver le paiement).
create or replace function public.declare_promo_payment(p_code text, p_reference text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_ref text := nullif(upper(regexp_replace(coalesce(p_reference, ''), '[^0-9A-Za-z.\-]', '', 'g')), '');
begin
  if v_ref is null or char_length(v_ref) < 4 or char_length(v_ref) > 60 then
    raise exception 'Référence de transaction invalide.' using errcode = 'P0001';
  end if;
  update public.promo_codes
     set payment_method = 'orange_money', payment_reference = v_ref
   where code = upper(trim(p_code)) and student_id = auth.uid() and status = 'active' and expires_at > now();
  if not found then
    raise exception 'Code introuvable ou expiré.' using errcode = 'P0001';
  end if;
end;
$$;
revoke all on function public.declare_promo_payment(text, text) from public, anon;
grant execute on function public.declare_promo_payment(text, text) to authenticated;

-- Le partenaire consulte un code (p_redeem = false) ou le valide (p_redeem = true).
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
         pr.first_name, pr.last_name, pr.avatar_url, pr.uny_id
    into v_row
    from public.promo_codes pc
    join public.deals d on d.id = pc.deal_id
    join public.profiles pr on pr.id = pc.student_id
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
    v_state := 'redeemed';
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
    'payment_reference', coalesce(nullif(trim(p_reference), ''), v_row.payment_reference)
  );
end;
$$;
revoke all on function public.partner_redeem_promo_code(uuid, text, boolean, text, text, bigint) from public, anon;
grant execute on function public.partner_redeem_promo_code(uuid, text, boolean, text, text, bigint) to authenticated;

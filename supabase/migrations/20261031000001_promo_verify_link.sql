-- =============================================================================
-- Lien de vérification d'un code promo (commande à distance) : l'étudiant transmet un lien Uny
-- (https://www.unyafrica.com/p/<jeton>) par WhatsApp ou SMS ; le commerçant l'ouvre dans son espace Uny et voit
-- immédiatement si l'étudiant est vérifié et si le code est valable, puis confirme l'utilisation.
--   • Jeton aléatoire (128 bits) par code, distinct du code : impossible à deviner.
--   • promo_link_lookup : réservé aux membres de la marque du code (ou administrateurs) ; toute autre personne
--     connectée ne voit que le nom de la marque, jamais l'étudiant ni le code.
-- Non destructif.
-- =============================================================================
alter table public.promo_codes add column if not exists verify_token text;
update public.promo_codes set verify_token = encode(extensions.gen_random_bytes(16), 'hex') where verify_token is null;
alter table public.promo_codes alter column verify_token set default encode(extensions.gen_random_bytes(16), 'hex');
alter table public.promo_codes alter column verify_token set not null;
create unique index if not exists promo_codes_verify_token_key on public.promo_codes (verify_token);

create or replace function public.promo_link_lookup(p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  r record;
begin
  if auth.uid() is null then
    raise exception 'Connexion requise.' using errcode = '42501';
  end if;
  if p_token is null or p_token !~ '^[0-9a-f]{32}$' then
    return jsonb_build_object('found', false);
  end if;
  select pc.code, pc.partner_id, p.name as partner_name
    into r
    from public.promo_codes pc join public.partners p on p.id = pc.partner_id
   where pc.verify_token = p_token;
  if not found then
    return jsonb_build_object('found', false);
  end if;
  if (public.is_partner_member(r.partner_id) or public.is_admin()) is not true then
    return jsonb_build_object('found', true, 'allowed', false, 'partner_name', r.partner_name);
  end if;
  return jsonb_build_object('found', true, 'allowed', true, 'partner_id', r.partner_id,
                            'partner_name', r.partner_name, 'code', r.code);
end;
$$;
revoke all on function public.promo_link_lookup(text) from public, anon;
grant execute on function public.promo_link_lookup(text) to authenticated;

-- Offre à distance : renvoie aussi le jeton du lien de vérification (redéfinition ; le reste est inchangé)
create or replace function public.open_online_offer(p_deal uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  d record;
  v_status public.verification_status;
  v_card_ok boolean;
  v_code text;
  v_expires timestamptz;
  v_claim jsonb;
  v_token text;
begin
  if v_user is null then
    raise exception 'Connexion requise.' using errcode = '42501';
  end if;
  select x.id, x.partner_id, x.is_active, x.valid_from, x.valid_until, x.flash_started_at, x.flash_ends_at,
         x.channel, x.online_code_mode, x.is_demo, p.is_active as partner_active,
         a.contact_kind, a.contact, a.code as shared_code
    into d
    from public.deals x join public.partners p on p.id = x.partner_id
    left join public.deal_online_access a on a.deal_id = x.id
   where x.id = p_deal;
  if found and d.is_demo then
    raise exception 'Offre de démonstration : aucune commande possible.' using errcode = 'P0001';
  end if;
  if not found or not d.is_active or not d.partner_active or d.channel = 'in_store' or d.contact is null then
    raise exception 'Offre à distance indisponible.' using errcode = 'P0001';
  end if;

  if d.online_code_mode = 'unique' then
    v_claim := public.claim_promo_code(p_deal);
    v_code := v_claim ->> 'code';
    v_expires := (v_claim ->> 'expires_at')::timestamptz;
  else
    if d.valid_from > (now() at time zone 'Africa/Conakry')::date
       or (d.valid_until is not null and d.valid_until < (now() at time zone 'Africa/Conakry')::date) then
      raise exception 'Cette offre n''est pas valable aujourd''hui.' using errcode = 'P0001';
    end if;
    if (d.flash_started_at is not null and d.flash_started_at > now()) or (d.flash_ends_at is not null and d.flash_ends_at <= now()) then
      raise exception 'Cette offre flash n''est pas en cours.' using errcode = 'P0001';
    end if;
    select verification_status into v_status from public.profiles where id = v_user;
    select exists (
      select 1 from public.student_cards c where c.user_id = v_user and c.status = 'active' and c.expires_at >= current_date
    ) into v_card_ok;
    if v_status is distinct from 'verified' or not v_card_ok then
      raise exception 'Cette offre est réservée aux étudiants vérifiés avec une carte valide.' using errcode = 'P0001';
    end if;
    if d.online_code_mode = 'shared' then
      v_code := d.shared_code;
      if v_code is null then
        raise exception 'Le code de cette offre n''est pas encore disponible.' using errcode = 'P0001';
      end if;
    end if;
  end if;

  insert into public.deal_clicks (deal_id, student_id) values (p_deal, v_user);
  -- Code personnel : lien de vérification à transmettre à la marque (ouvert dans son espace Uny)
  if d.online_code_mode = 'unique' then
    select verify_token into v_token from public.promo_codes where code = v_code and student_id = v_user;
  end if;
  return jsonb_build_object('contact_kind', d.contact_kind, 'contact', d.contact, 'mode', d.online_code_mode, 'code', v_code,
                            'expires_at', v_expires, 'verify_token', v_token);
end;
$$;

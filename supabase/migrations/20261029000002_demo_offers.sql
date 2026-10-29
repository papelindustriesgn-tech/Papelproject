-- =============================================================================
-- Démos de la vitrine (façon UNiDAYS) : contenus FICTIFS, tous marqués is_demo (badge « Démo » + avertissement).
--   • Exclusivités Uny sur quelques offres de démonstration existantes.
--   • Offres « à distance » de démonstration (commande WhatsApp / appel) : AUCUN contact réel n'est enregistré
--     (pas de ligne dans deal_online_access) et open_online_offer refuse les offres de démonstration.
--   • Deux marques fictives supplémentaires (couture, livraison de repas).
-- Idempotent ; ne touche que des lignes is_demo.
-- =============================================================================

-- Exclusivités de démonstration
update public.deals set is_exclusive = true
 where is_demo and not is_exclusive
   and title in ('Petit-déjeuner étudiant à -40 %', 'Formation développement web à -40 %', 'Abonnement mensuel à -30 %',
                 'Place de cinéma à -30 %', 'Cours d''anglais intensif à -40 %', '-20 % sur tes courses taxi-moto');

-- Offres de démonstration existantes passées « à distance » (code personnel Uny)
update public.deals set channel = 'online', online_code_mode = 'unique'
 where is_demo and channel = 'in_store' and title in ('Forfait internet 30 Go à -30 %', '-20 % sur tes courses taxi-moto');
update public.deals set channel = 'both', online_code_mode = 'unique'
 where is_demo and channel = 'in_store' and title in ('Bootcamp développement web à -35 %', 'Préparation TOEFL / IELTS à -30 %');

-- Marques fictives supplémentaires
insert into public.partners (id, name, category, logo_url, description, city_id, district, is_demo)
select v.id, v.name, v.category::public.deal_category, v.logo, v.description, c.id, v.district, true
  from (values
    ('d0000000-0000-4000-8000-000000000017'::uuid, 'Wax & Style Couture', 'shopping',
     'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=900&q=70&auto=format&fit=crop',
     'Couture sur mesure en wax et bazin. Commande sur WhatsApp, livraison à Conakry.', 'Matoto'),
    ('d0000000-0000-4000-8000-000000000018'::uuid, 'Délices Livraison', 'restauration',
     'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=900&q=70&auto=format&fit=crop',
     'Plats guinéens livrés à domicile et sur les campus. Commande par WhatsApp ou par appel.', 'Ratoma')
  ) as v(id, name, category, logo, description, district)
  cross join lateral (select id from public.cities where slug = 'conakry') c
on conflict (id) do nothing;

insert into public.deals (partner_id, title, discount_label, category, description, conditions, city_id, district,
                          image_url, valid_until, is_featured, is_exclusive, is_demo, channel, online_code_mode)
select v.partner_id, v.title, v.label, v.category::public.deal_category, v.description, v.conditions, c.id, v.district,
       v.image, '2027-06-30', v.featured, v.exclusive, true, v.channel, v.mode
  from (values
    ('d0000000-0000-4000-8000-000000000017'::uuid, 'Tenue en wax sur mesure à -20 %', '-20 %', 'shopping',
     'Choisis ton modèle sur WhatsApp, on prend tes mesures et on livre en 7 jours.',
     'Code Uny à donner lors de la commande. Tissu fourni ou au choix en boutique.', 'Matoto',
     'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=900&q=70&auto=format&fit=crop', true, true, 'online', 'unique'),
    ('d0000000-0000-4000-8000-000000000017'::uuid, 'Retouches à -30 %', '-30 %', 'shopping',
     'Ourlets, ajustements, fermetures : retouches rapides en atelier.',
     'Sur présentation de la carte Uny vérifiée.', 'Matoto',
     'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=900&q=70&auto=format&fit=crop', false, false, 'in_store', null),
    ('d0000000-0000-4000-8000-000000000018'::uuid, 'Livraison de repas à -25 %', '-25 %', 'restauration',
     'Riz gras, sauce feuille, poulet braisé… livrés sur ton campus.',
     'Commande sur WhatsApp avec ton code Uny. Livraison de 11 h à 21 h.', 'Ratoma',
     'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=900&q=70&auto=format&fit=crop', true, true, 'online', 'unique'),
    ('d0000000-0000-4000-8000-000000000018'::uuid, 'Livraison offerte dès 2 plats', 'Livraison offerte', 'restauration',
     'Commande à plusieurs et la livraison est offerte.',
     'À partir de 2 plats, dans Ratoma et Dixinn.', 'Ratoma',
     'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=900&q=70&auto=format&fit=crop', false, false, 'online', 'unique'),
    ('d0000000-0000-4000-8000-000000000016'::uuid, 'Coques et chargeurs livrés à -15 %', '-15 %', 'tech',
     'Accessoires pour ton téléphone, en boutique ou livrés après commande par appel.',
     'Code Uny à donner à la commande ou en caisse.', 'Madina',
     'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=900&q=70&auto=format&fit=crop', false, false, 'both', 'unique')
  ) as v(partner_id, title, label, category, description, conditions, district, image, featured, exclusive, channel, mode)
  cross join lateral (select id from public.cities where slug = 'conakry') c
 where exists (select 1 from public.partners p where p.id = v.partner_id and p.is_demo)
   and not exists (select 1 from public.deals d where d.partner_id = v.partner_id and d.title = v.title);

-- Une offre de démonstration ne révèle jamais de contact (redéfinition : seul le contrôle is_demo est ajouté)
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
  return jsonb_build_object('contact_kind', d.contact_kind, 'contact', d.contact, 'mode', d.online_code_mode, 'code', v_code, 'expires_at', v_expires);
end;
$$;

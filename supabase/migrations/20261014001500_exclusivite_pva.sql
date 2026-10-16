-- =============================================================================
-- Un point de vente = un seul commercial (efficacité : deux commerciaux ne visitent pas la même boutique).
-- 1) La base refuse un PVA en double chez un autre commercial : même téléphone, ou même nom à moins de N mètres.
-- 2) Le téléphone reçoit la liste légère des PVA des collègues pour prévenir dès la saisie, même hors ligne.
-- 3) Le responsable commercial réattribue un PVA (et son client) d'un commercial à un autre.
-- =============================================================================

insert into public.parametres (cle, valeur, libelle, description, categorie, type_valeur, unite) values
  ('gps_rayon_doublon_m', '30', 'Rayon de détection des doublons', 'Deux points de vente de même nom à moins de cette distance sont considérés comme la même boutique', 'terrain', 'entier', 'm')
on conflict (cle) do nothing;

-- Téléphone comparable : les 9 derniers chiffres (numéros guinéens, avec ou sans +224).
create or replace function public.telephone_normalise(p text)
returns text language sql immutable set search_path = '' as $$
  select nullif(right(regexp_replace(coalesce(p, ''), '\D', '', 'g'), 9), '');
$$;

-- Nom comparable : minuscules, sans accents ni ponctuation.
create or replace function public.nom_normalise(p text)
returns text language sql immutable set search_path = '' as $$
  select regexp_replace(lower(translate(coalesce(p, ''), 'àâäéèêëîïôöùûüçÀÂÄÉÈÊËÎÏÔÖÙÛÜÇ', 'aaaeeeeiioouuucAAAEEEEIIOOUUUC')), '[^a-z0-9]', '', 'g');
$$;

create or replace function public.controler_doublon_pva()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_rayon numeric := public.parametre_num('gps_rayon_doublon_m', 30);
  v_autre record;
begin
  if not new.actif then return new; end if;
  select p.nom, pr.prenom || ' ' || pr.nom as commercial into v_autre
  from public.pva p join public.profils pr on pr.id = p.commercial_id
  where p.actif and p.id <> new.id and p.commercial_id <> new.commercial_id
    and (
      (public.telephone_normalise(new.telephone) is not null and public.telephone_normalise(p.telephone) = public.telephone_normalise(new.telephone))
      or (new.position is not null and p.position is not null
          and extensions.st_dwithin(p.position, new.position, v_rayon)
          and public.nom_normalise(p.nom) <> ''
          and (public.nom_normalise(p.nom) like '%' || public.nom_normalise(new.nom) || '%'
               or public.nom_normalise(new.nom) like '%' || public.nom_normalise(p.nom) || '%'))
    )
  limit 1;
  if found then
    raise exception 'Ce point de vente est déjà suivi par % (« % ») : un point de vente n''a qu''un seul commercial. Voyez votre responsable.', v_autre.commercial, v_autre.nom
      using errcode = '23505';
  end if;
  return new;
end $$;
create trigger pva_doublon before insert or update of telephone, position, nom, commercial_id, actif on public.pva
  for each row execute function public.controler_doublon_pva();
revoke execute on function public.controler_doublon_pva() from public, anon, authenticated;

-- Liste légère des PVA des collègues (nom, position, téléphone normalisé, commercial) : avertissement hors ligne sur le téléphone.
create or replace function public.pva_des_collegues()
returns table (nom text, latitude float8, longitude float8, telephone text, commercial text)
language sql stable security definer set search_path = '' as $$
  select p.nom, extensions.st_y(p.position::extensions.geometry), extensions.st_x(p.position::extensions.geometry),
         public.telephone_normalise(p.telephone), pr.prenom || ' ' || left(pr.nom, 1) || '.'
  from public.pva p join public.profils pr on pr.id = p.commercial_id
  where p.actif and p.commercial_id <> (select auth.uid()) and public.a_un_role('commercial_terrain', 'responsable_commercial');
$$;
revoke execute on function public.pva_des_collegues() from public, anon;
grant execute on function public.pva_des_collegues() to authenticated;

-- Réattribution par le responsable : le PVA et son client passent au nouveau commercial
-- (l'ancien ne le voit plus, même s'il figurait dans une de ses tournées).
create or replace function public.reattribuer_pva(p_pva uuid, p_commercial uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_client uuid;
begin
  if not public.a_un_role('responsable_commercial') then
    raise exception 'Seul le responsable commercial réattribue un point de vente.' using errcode = '42501';
  end if;
  if not exists (select 1 from public.utilisateur_roles where utilisateur_id = p_commercial and role = 'commercial_terrain') then
    raise exception 'La personne choisie n''est pas un commercial terrain.' using errcode = '22023';
  end if;
  update public.pva set commercial_id = p_commercial where id = p_pva returning client_id into v_client;
  if not found then raise exception 'Point de vente introuvable.' using errcode = '22023'; end if;
  if v_client is not null then
    update public.clients set commercial_id = p_commercial where id = v_client;
  end if;
end $$;
revoke execute on function public.reattribuer_pva(uuid, uuid) from public, anon;
grant execute on function public.reattribuer_pva(uuid, uuid) to authenticated;

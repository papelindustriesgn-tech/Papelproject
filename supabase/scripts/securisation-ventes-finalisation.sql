-- =============================================================================
-- Papel ERP — Finalisation de la migration 25 (sécurisation des ventes) sur la base réelle.
-- À exécuter UNE fois dans Supabase → SQL Editor (projet shnwwgbcrmfswzaecmeo).
-- Les parties 0 à 9 sont déjà appliquées ; ces 3 remplacements contiennent un « drop » que l'outil
-- automatique ne peut pas faire valider. Aucune donnée n'est supprimée. Tout ou rien (transaction).
-- =============================================================================
begin;
set local lock_timeout = '15s';

-- 1. Verrouillage des pièces aussi à la création (pièce « déjà validée » impossible par l'API).
drop trigger if exists piece_figee on public.pieces_vente;
create trigger piece_figee before insert or update or delete on public.pieces_vente
  for each row execute function public.piece_figee();

-- 2. Insertion directe des paiements : ancienne règle retirée (seule la fonction enregistrer_paiement écrit).
drop policy if exists paiements_ajout on public.paiements;

-- 3. enregistrer_paiement avec clé d'idempotence (double clic = un seul paiement).
drop function if exists public.enregistrer_paiement(uuid, bigint, uuid, date, text, text);
create function public.enregistrer_paiement(
  p_facture uuid, p_montant bigint, p_mode uuid, p_date date default public.aujourdhui_conakry(),
  p_reference text default '', p_notes text default '', p_cle uuid default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_existant public.paiements%rowtype;
  v_id uuid;
begin
  if not public.a_un_role('finance') then
    raise exception 'Seule la comptabilité (ou la direction) enregistre les paiements.' using errcode = '42501';
  end if;
  if p_montant is null or p_montant <= 0 then raise exception 'Le montant doit être strictement positif.' using errcode = '22023'; end if;
  if not exists (select 1 from public.modes_paiement where id = p_mode and actif) then
    raise exception 'Mode de paiement inconnu ou archivé.' using errcode = '22023';
  end if;
  perform public.montants_facture(p_facture);
  if p_cle is not null then
    select * into v_existant from public.paiements where cle_idempotence = p_cle;
    if v_existant.id is not null then
      if v_existant.facture_id <> p_facture or v_existant.montant_gnf <> p_montant then
        raise exception 'Cette saisie a déjà servi pour un autre paiement : rechargez la page.' using errcode = '22023';
      end if;
      return v_existant.id;
    end if;
  end if;
  insert into public.paiements (facture_id, montant_gnf, mode_id, date_paiement, reference, notes, cle_idempotence, saisi_par)
  values (p_facture, p_montant, p_mode, coalesce(p_date, public.aujourdhui_conakry()), coalesce(p_reference, ''), coalesce(p_notes, ''), p_cle, auth.uid())
  returning id into v_id;
  perform public.calculer_dotation_facture(p_facture);
  return v_id;
end $$;
revoke execute on function public.enregistrer_paiement(uuid, bigint, uuid, date, text, text, uuid) from public, anon;
grant execute on function public.enregistrer_paiement(uuid, bigint, uuid, date, text, text, uuid) to authenticated;

-- PostgREST recharge son cache de fonctions (sinon la nouvelle signature peut rester invisible quelques minutes).
notify pgrst, 'reload schema';

commit;

-- Vérification (doit afficher : INSERT OR UPDATE OR DELETE / la signature avec p_cle / 0).
select (select pg_get_triggerdef(oid) from pg_trigger where tgname = 'piece_figee') as verrou_pieces,
       (select string_agg(pg_get_function_identity_arguments(oid), ' | ') from pg_proc where proname = 'enregistrer_paiement') as enregistrer_paiement,
       (select count(*) from pg_policies where policyname = 'paiements_ajout') as ancienne_regle_restante;

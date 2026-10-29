-- Retour arrière des offres façon UNiDAYS (20261029000001), à n'utiliser qu'après avoir redéployé le code précédent.
-- Retire les fonctions ajoutées. Les colonnes (channel, online_code_mode, is_exclusive) et les tables
-- (deal_online_access, deal_clicks) sont conservées : sans effet sur l'ancien code, aucune donnée perdue.
begin;
drop function if exists public.open_online_offer(uuid);
drop function if exists public.deals_trending(integer);
drop function if exists public.partner_deal_stats(uuid);
-- Les offres à distance redeviennent invisibles pour l'ancien code : les désactiver évite une offre sans contact
update public.deals set is_active = false where channel = 'online' and is_active;
commit;

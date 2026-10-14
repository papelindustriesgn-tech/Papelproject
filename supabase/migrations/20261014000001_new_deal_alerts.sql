-- =============================================================================
-- UNY — rétention : prévenir les étudiants à chaque nouvelle offre réelle
--   • une notification par offre (colonne announced_at), envoyée quand l'offre devient active
--   • étudiants validés de la ville de l'offre (offre nationale : tous)
--   • au plus une alerte « nouvelle offre » par étudiant toutes les 6 heures (anti-spam)
--   • jamais pour les contenus de démonstration ni les comptes de test
-- =============================================================================

alter table public.deals add column announced_at timestamptz;
-- Les offres existantes ne déclenchent pas d'alerte rétroactive
update public.deals set announced_at = now() where is_active;

create or replace function public.announce_new_deal()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_partner record;
begin
  if not new.is_active or new.is_demo or new.announced_at is not null
     or new.valid_from > current_date
     or (new.valid_until is not null and new.valid_until < current_date) then
    return new;
  end if;
  select name, is_active, is_demo into v_partner from public.partners where id = new.partner_id;
  if not found or not v_partner.is_active or v_partner.is_demo then
    return new;
  end if;

  update public.deals set announced_at = now() where id = new.id;

  insert into public.notifications (user_id, type, title, body, link)
  select p.id, 'new_deal',
         format('Nouvelle offre : %s 🔥', left(v_partner.name, 60)),
         left(format('%s — %s', new.title, new.discount_label), 200),
         format('/avantages/%s', new.id)
    from public.profiles p
   where p.role = 'student'
     and p.account_status = 'approved'
     and not p.is_test_account
     and (new.city_id is null or p.city_id is null or p.city_id = new.city_id)
     and not exists (select 1 from public.notifications n
                      where n.user_id = p.id and n.type = 'new_deal' and n.created_at > now() - interval '6 hours');
  return new;
end;
$$;
revoke execute on function public.announce_new_deal() from public, anon, authenticated;

create trigger deals_announce after insert or update of is_active on public.deals
  for each row execute function public.announce_new_deal();

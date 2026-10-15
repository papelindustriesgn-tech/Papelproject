-- =============================================================================
-- UNY — interrupteur des alertes d'offres (nouvelles offres et offres flash)
--   platform_settings « deal_alerts » = {"enabled": false} : aucune notification aux étudiants
--   (période de démo et de tests). Sans réglage, les alertes sont actives.
-- =============================================================================

alter table public.platform_settings drop constraint platform_settings_key_check;
alter table public.platform_settings add constraint platform_settings_key_check check (key in ('student_email', 'deal_alerts'));

create or replace function public.announce_new_deal()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_partner record;
  v_flash_new boolean;
begin
  -- Alertes en pause (période de démo et de tests) : rien n'est envoyé, l'offre est marquée annoncée
  if not coalesce((select (value ->> 'enabled')::boolean from public.platform_settings where key = 'deal_alerts'), true) then
    if new.announced_at is null then
      update public.deals set announced_at = now() where id = new.id;
    end if;
    return new;
  end if;
  if not new.is_active or new.is_demo
     or new.valid_from > current_date
     or (new.valid_until is not null and new.valid_until < current_date) then
    return new;
  end if;
  v_flash_new := new.flash_ends_at is not null and new.flash_ends_at > now()
    and (tg_op = 'INSERT' or old.flash_ends_at is distinct from new.flash_ends_at or not old.is_active);
  if not v_flash_new and new.announced_at is not null then
    return new;
  end if;
  select name, is_active, is_demo into v_partner from public.partners where id = new.partner_id;
  if not found or not v_partner.is_active or v_partner.is_demo then
    return new;
  end if;

  update public.deals set announced_at = coalesce(announced_at, now()) where id = new.id;

  if v_flash_new then
    -- Au plus une alerte flash par partenaire toutes les 20 heures
    if exists (select 1 from public.notifications n
                join public.deals d on n.link = '/avantages/' || d.id::text
               where n.type = 'flash_deal' and d.partner_id = new.partner_id
                 and n.created_at > now() - interval '20 hours') then
      return new;
    end if;
    insert into public.notifications (user_id, type, title, body, link)
    select p.id, 'flash_deal',
           format('⚡ Offre flash : %s', left(v_partner.name, 60)),
           left(format('%s — %s. Jusqu''à %s%s', new.title, new.discount_label,
                       replace(to_char(new.flash_ends_at at time zone 'Africa/Conakry', 'HH24:MI'), ':', 'h'),
                       case when new.flash_quantity is not null then format(', %s places', new.flash_quantity) else '' end), 200),
           format('/avantages/%s', new.id)
      from public.profiles p
     where p.role = 'student' and p.account_status = 'approved' and not p.is_test_account;
    return new;
  end if;

  insert into public.notifications (user_id, type, title, body, link)
  select p.id, 'new_deal',
         format('Nouvelle offre : %s 🔥', left(v_partner.name, 60)),
         left(format('%s — %s', new.title, new.discount_label), 200),
         format('/avantages/%s', new.id)
    from public.profiles p
   where p.role = 'student'
     and p.account_status = 'approved'
     and not p.is_test_account
     and not exists (select 1 from public.notifications n
                      where n.user_id = p.id and n.type = 'new_deal' and n.created_at > now() - interval '6 hours');
  return new;
end;
$$;

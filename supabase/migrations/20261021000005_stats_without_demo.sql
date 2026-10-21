-- Statistiques d'administration : les contenus de démonstration (is_demo) et l'activité chez les partenaires
-- de démonstration ne comptent plus dans les chiffres réels. Les autres indicateurs sont inchangés.
alter function public.admin_stats() rename to admin_stats_impl;
revoke all on function public.admin_stats_impl() from public, anon, authenticated;

create or replace function public.admin_stats()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Accès refusé' using errcode = '42501';
  end if;
  return public.admin_stats_impl() || jsonb_build_object(
    'deals_active', (select count(*) from public.deals d join public.partners p on p.id = d.partner_id
                      where d.is_active and not d.is_demo and not p.is_demo),
    'deals_demo', (select count(*) from public.deals d join public.partners p on p.id = d.partner_id
                    where d.is_active and (d.is_demo or p.is_demo)),
    'partners_total', (select count(*) from public.partners where not is_demo),
    'jobs_active', (select count(*) from public.jobs where is_active and not is_demo),
    'housing_active', (select count(*) from public.housing where is_active and not is_demo),
    'marketplace_active', (select count(*) from public.marketplace_items where status = 'active' and not is_demo),
    'marketplace_total', (select count(*) from public.marketplace_items where not is_demo),
    'card_validations_week', (select count(*) from public.card_validations v join public.partners p on p.id = v.partner_id
                               where v.eligible and not p.is_demo and v.created_at >= now() - interval '7 days')
  );
end;
$$;
revoke all on function public.admin_stats() from public, anon;
grant execute on function public.admin_stats() to authenticated;

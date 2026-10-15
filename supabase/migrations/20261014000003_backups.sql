-- =============================================================================
-- UNY — sauvegardes quotidiennes
--   • backup_snapshot() : export JSON de toutes les tables publiques + comptes (auth.users,
--     auth.identities), réservé à la clé de service
--   • bucket privé « backups » : une copie par jour (Vercel Cron), téléchargeable depuis l'admin
--   • restauration : scripts/backup-to-sql.mts (voir docs/SAUVEGARDE.md)
-- =============================================================================

create or replace function public.backup_snapshot()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tables jsonb := '{}'::jsonb;
  v_rows jsonb;
  t record;
begin
  for t in
    select schemaname, tablename from pg_tables where schemaname = 'public'
    union all select 'auth', 'users'
    union all select 'auth', 'identities'
    order by 1, 2
  loop
    execute format('select coalesce(jsonb_agg(to_jsonb(x)), ''[]''::jsonb) from %I.%I x', t.schemaname, t.tablename)
      into v_rows;
    v_tables := v_tables || jsonb_build_object(t.schemaname || '.' || t.tablename, v_rows);
  end loop;
  return jsonb_build_object(
    'format', 'uny-backup-1',
    'created_at', now(),
    'migration', (select max(version) from supabase_migrations.schema_migrations),
    'tables', v_tables
  );
end;
$$;
revoke all on function public.backup_snapshot() from public, anon, authenticated;
grant execute on function public.backup_snapshot() to service_role;

insert into storage.buckets (id, name, public, file_size_limit)
values ('backups', 'backups', false, 52428800)
on conflict (id) do nothing;
-- Aucune politique sur ce bucket : seule la clé de service (serveur) y accède.

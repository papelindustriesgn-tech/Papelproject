-- =============================================================================
-- UNY — surveillance et pilotage (non destructif : nouvelles tables et fonctions uniquement)
--   • ops_job_runs : exécutions des tâches (clé d'idempotence, tentatives limitées, échec définitif)
--   • ops_alerts   : alertes issues de règles déterministes (gravité, déduplication, responsable, état)
--   • ops_run_checks() : évaluation des règles (clé de service ou administrateur)
--   • ops_metrics(p_days) : indicateurs calculés par requêtes contrôlées (démos et comptes de test exclus)
-- Aucune donnée personnelle n'est stockée dans les alertes : uniquement des totaux et des identifiants techniques.
-- =============================================================================

create table if not exists public.ops_job_runs (
  id uuid primary key default gen_random_uuid(),
  job text not null check (job ~ '^[a-z0-9_.-]{2,60}$'),
  idempotency_key text not null unique check (length(idempotency_key) between 3 and 200),
  status text not null default 'running' check (status in ('running', 'succeeded', 'failed', 'dead', 'skipped')),
  attempts integer not null default 0,
  max_attempts integer not null default 3 check (max_attempts between 1 and 10),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  error text check (error is null or length(error) <= 2000),
  result jsonb
);
create index if not exists ops_job_runs_job_idx on public.ops_job_runs (job, started_at desc);
alter table public.ops_job_runs enable row level security;
drop policy if exists "ops_job_runs_admin_read" on public.ops_job_runs;
create policy "ops_job_runs_admin_read" on public.ops_job_runs for select to authenticated using (public.is_admin());

create table if not exists public.ops_alerts (
  id uuid primary key default gen_random_uuid(),
  rule text not null,
  fingerprint text not null,
  severity text not null check (severity in ('critical', 'high', 'medium', 'low')),
  title text not null,
  details jsonb not null default '{}'::jsonb,
  status text not null default 'open' check (status in ('open', 'acknowledged', 'resolved')),
  owner_id uuid references public.profiles (id) on delete set null,
  occurrences integer not null default 1,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  resolved_at timestamptz,
  resolution text check (resolution is null or length(resolution) <= 500)
);
-- Déduplication : une seule alerte non résolue par empreinte
create unique index if not exists ops_alerts_open_fingerprint on public.ops_alerts (fingerprint) where status <> 'resolved';
create index if not exists ops_alerts_status_idx on public.ops_alerts (status, severity, last_seen desc);
alter table public.ops_alerts enable row level security;
drop policy if exists "ops_alerts_admin_read" on public.ops_alerts;
create policy "ops_alerts_admin_read" on public.ops_alerts for select to authenticated using (public.is_admin());

-- -----------------------------------------------------------------------------
-- Tâches : début (atomique, idempotent) et fin
-- -----------------------------------------------------------------------------
create or replace function public.ops_job_begin(p_job text, p_key text, p_max integer default 3)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.ops_job_runs;
begin
  insert into public.ops_job_runs (job, idempotency_key, max_attempts, attempts, status)
  values (p_job, p_key, p_max, 0, 'running')
  on conflict (idempotency_key) do nothing;
  select * into r from public.ops_job_runs where idempotency_key = p_key for update;

  if r.status = 'succeeded' then
    return jsonb_build_object('run', r.id, 'proceed', false, 'reason', 'déjà effectuée');
  end if;
  if r.status = 'dead' then
    return jsonb_build_object('run', r.id, 'proceed', false, 'reason', 'échec définitif');
  end if;
  -- Exécution en cours depuis moins de 15 minutes : pas de second passage simultané
  if r.status = 'running' and r.attempts > 0 and r.started_at > now() - interval '15 minutes' then
    return jsonb_build_object('run', r.id, 'proceed', false, 'reason', 'en cours');
  end if;
  if r.attempts >= r.max_attempts then
    update public.ops_job_runs set status = 'dead', finished_at = now() where id = r.id;
    return jsonb_build_object('run', r.id, 'proceed', false, 'reason', 'échec définitif');
  end if;
  update public.ops_job_runs
     set status = 'running', attempts = attempts + 1, started_at = now(), finished_at = null
   where id = r.id;
  return jsonb_build_object('run', r.id, 'proceed', true, 'attempt', r.attempts + 1);
end;
$$;

create or replace function public.ops_job_finish(p_run uuid, p_ok boolean, p_error text default null, p_result jsonb default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.ops_job_runs
     set status = case when p_ok then 'succeeded' when attempts >= max_attempts then 'dead' else 'failed' end,
         finished_at = now(),
         error = case when p_ok then null else left(p_error, 2000) end,
         result = p_result
   where id = p_run;
end;
$$;
revoke all on function public.ops_job_begin(text, text, integer) from public, anon, authenticated;
revoke all on function public.ops_job_finish(uuid, boolean, text, jsonb) from public, anon, authenticated;
grant execute on function public.ops_job_begin(text, text, integer) to service_role;
grant execute on function public.ops_job_finish(uuid, boolean, text, jsonb) to service_role;

-- -----------------------------------------------------------------------------
-- Alertes : enregistrement dédupliqué
-- -----------------------------------------------------------------------------
create or replace function public.ops_raise(p_rule text, p_fingerprint text, p_severity text, p_title text, p_details jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.ops_alerts
     set occurrences = occurrences + 1, last_seen = now(), details = p_details, title = p_title,
         severity = p_severity
   where fingerprint = p_fingerprint and status <> 'resolved';
  if not found then
    insert into public.ops_alerts (rule, fingerprint, severity, title, details)
    values (p_rule, p_fingerprint, p_severity, p_title, p_details);
  end if;
end;
$$;
revoke all on function public.ops_raise(text, text, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.ops_raise(text, text, text, text, jsonb) to service_role;

-- -----------------------------------------------------------------------------
-- Règles déterministes. Chaque règle produit des empreintes ; une alerte ouverte dont l'empreinte
-- n'est plus produite est résolue automatiquement (« condition disparue »).
-- -----------------------------------------------------------------------------
create or replace function public.ops_run_checks()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_seen text[] := '{}';
  r record;
  v_last_backup timestamptz;
  v_count bigint;
  v_resolved integer;
begin
  if not (coalesce(auth.role(), '') = 'service_role' or public.is_admin()) then
    raise exception 'Accès refusé' using errcode = '42501';
  end if;

  -- R1. Tâches automatiques en échec (24 h) ; échec définitif = critique
  for r in
    select job, bool_or(status = 'dead') as dead, count(*) as n
      from public.ops_job_runs
     where status in ('failed', 'dead') and coalesce(finished_at, started_at) > now() - interval '26 hours'
     group by job
  loop
    perform public.ops_raise('job_failed', 'job_failed:' || r.job, case when r.dead then 'critical' else 'high' end,
      'Tâche « ' || r.job || ' » en échec', jsonb_build_object('job', r.job, 'failures', r.n, 'definitive', r.dead));
    v_seen := v_seen || ('job_failed:' || r.job);
  end loop;

  -- R2. Sauvegarde absente depuis plus de 30 h
  select max(created_at) into v_last_backup from storage.objects where bucket_id = 'backups';
  if v_last_backup is null or v_last_backup < now() - interval '30 hours' then
    perform public.ops_raise('backup_missing', 'backup_missing', 'critical', 'Aucune sauvegarde récente',
      jsonb_build_object('last_backup', v_last_backup));
    v_seen := v_seen || 'backup_missing'::text;
  end if;

  -- R3. Cartes : présentations répétées de cartes non valables chez un commerçant (24 h)
  for r in
    select v.partner_id, p.name, count(*) as n
      from public.card_validations v join public.partners p on p.id = v.partner_id
     where not p.is_demo and v.outcome in ('revoked', 'expired') and v.created_at > now() - interval '24 hours'
     group by v.partner_id, p.name having count(*) >= 5
  loop
    perform public.ops_raise('card_invalid_burst', 'card_invalid_burst:' || r.partner_id, 'medium',
      'Cartes non valables présentées à répétition', jsonb_build_object('partner', r.name, 'count', r.n));
    v_seen := v_seen || ('card_invalid_burst:' || r.partner_id);
  end loop;

  -- R3 bis. Une même carte présentée chez 4 commerçants ou plus en 1 h (partage possible)
  select count(*) into v_count from (
    select v.student_id from public.card_validations v join public.partners p on p.id = v.partner_id
     where not p.is_demo and v.created_at > now() - interval '1 hour' and v.student_id is not null
     group by v.student_id having count(distinct v.partner_id) >= 4
  ) s;
  if v_count > 0 then
    perform public.ops_raise('card_sharing', 'card_sharing', 'medium', 'Cartes présentées chez plusieurs commerçants en 1 h',
      jsonb_build_object('cards', v_count));
    v_seen := v_seen || 'card_sharing'::text;
  end if;

  -- R4. Coupons : volume inhabituel d'utilisations chez un commerçant (1 h)
  for r in
    select c.partner_id, p.name, count(*) as n
      from public.promo_codes c join public.partners p on p.id = c.partner_id
     where not p.is_demo and c.status = 'used' and c.used_at > now() - interval '1 hour'
     group by c.partner_id, p.name having count(*) >= 30
  loop
    perform public.ops_raise('coupon_burst', 'coupon_burst:' || r.partner_id, 'medium',
      'Volume inhabituel de coupons utilisés', jsonb_build_object('partner', r.name, 'count_1h', r.n));
    v_seen := v_seen || ('coupon_burst:' || r.partner_id);
  end loop;

  -- R5. Files de traitement bloquées
  select count(*) into v_count from public.student_enrollments
   where status in ('pending', 'manual_review') and created_at < now() - interval '7 days';
  if v_count > 0 then
    perform public.ops_raise('queue_enrollments', 'queue_enrollments', 'medium', 'Demandes d''inscription en attente depuis plus de 7 jours',
      jsonb_build_object('count', v_count));
    v_seen := v_seen || 'queue_enrollments'::text;
  end if;
  select count(*) into v_count from public.student_verifications where status = 'pending' and created_at < now() - interval '72 hours';
  if v_count > 0 then
    perform public.ops_raise('queue_verifications', 'queue_verifications', 'medium', 'Justificatifs en attente depuis plus de 72 h',
      jsonb_build_object('count', v_count));
    v_seen := v_seen || 'queue_verifications'::text;
  end if;
  select count(*) into v_count from public.profiles p
   where p.role = 'student' and p.account_status = 'pending' and not p.is_test_account and p.created_at < now() - interval '72 hours';
  if v_count > 0 then
    perform public.ops_raise('queue_signups', 'queue_signups', 'medium', 'Comptes en attente de validation depuis plus de 72 h',
      jsonb_build_object('count', v_count));
    v_seen := v_seen || 'queue_signups'::text;
  end if;
  select count(*) into v_count from public.content_reports where status = 'open' and created_at < now() - interval '48 hours';
  if v_count > 0 then
    perform public.ops_raise('queue_reports', 'queue_reports', 'high', 'Signalements marketplace non traités depuis plus de 48 h',
      jsonb_build_object('count', v_count));
    v_seen := v_seen || 'queue_reports'::text;
  end if;

  -- R6. IA : budget mensuel consommé à 80 % ou plus, agent en échec répété (24 h)
  for r in
    select a.id, a.monthly_budget_usd as budget,
           coalesce(sum(coalesce(x.cost_usd, x.estimated_cost_usd)) filter (where x.status <> 'refused'), 0) as spent
      from public.ai_agents a
      left join public.ai_runs x on x.agent_id = a.id and x.created_at >= date_trunc('month', now())
     where a.monthly_budget_usd > 0
     group by a.id, a.monthly_budget_usd
    having coalesce(sum(coalesce(x.cost_usd, x.estimated_cost_usd)) filter (where x.status <> 'refused'), 0) >= 0.8 * a.monthly_budget_usd
  loop
    perform public.ops_raise('ai_budget', 'ai_budget:' || r.id, case when r.spent >= r.budget then 'high' else 'medium' end,
      'Budget IA de l''agent « ' || r.id || ' » consommé à ' || round(100 * r.spent / r.budget) || ' %',
      jsonb_build_object('agent', r.id, 'spent_usd', round(r.spent, 2), 'budget_usd', r.budget));
    v_seen := v_seen || ('ai_budget:' || r.id);
  end loop;
  for r in
    select agent_id, count(*) as n from public.ai_runs
     where status = 'failed' and created_at > now() - interval '24 hours'
     group by agent_id having count(*) >= 3
  loop
    perform public.ops_raise('ai_failures', 'ai_failures:' || r.agent_id, 'high',
      'Agent IA « ' || r.agent_id || ' » en échec répété', jsonb_build_object('agent', r.agent_id, 'failures', r.n));
    v_seen := v_seen || ('ai_failures:' || r.agent_id);
  end loop;

  -- Résolution automatique des alertes dont la condition a disparu
  update public.ops_alerts
     set status = 'resolved', resolved_at = now(), resolution = coalesce(resolution, 'Condition disparue (automatique)')
   where status <> 'resolved' and not (fingerprint = any (v_seen)) and rule <> 'manual';
  get diagnostics v_resolved = row_count;

  return jsonb_build_object('checked_at', now(), 'active', coalesce(array_length(v_seen, 1), 0), 'resolved', v_resolved);
end;
$$;
revoke all on function public.ops_run_checks() from public, anon;
grant execute on function public.ops_run_checks() to authenticated, service_role;

-- Prise en charge / résolution manuelle par un administrateur (responsable = auteur)
create or replace function public.ops_alert_update(p_alert uuid, p_status text, p_note text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Accès refusé' using errcode = '42501';
  end if;
  if p_status not in ('acknowledged', 'resolved') then
    raise exception 'État invalide' using errcode = '22023';
  end if;
  update public.ops_alerts
     set status = p_status, owner_id = auth.uid(),
         resolved_at = case when p_status = 'resolved' then now() end,
         resolution = case when p_status = 'resolved' then left(nullif(trim(p_note), ''), 500) else resolution end
   where id = p_alert and status <> 'resolved';
  if not found then
    raise exception 'Alerte introuvable ou déjà résolue' using errcode = 'P0002';
  end if;
end;
$$;
revoke all on function public.ops_alert_update(uuid, text, text) from public, anon;
grant execute on function public.ops_alert_update(uuid, text, text) to authenticated;

-- -----------------------------------------------------------------------------
-- Indicateurs (dictionnaire : src/lib/metrics.ts). Période glissante de p_days jours, fuseau Africa/Conakry (UTC+0).
-- Exclusions : comptes de test, contenus et commerçants de démonstration.
-- -----------------------------------------------------------------------------
create or replace function public.ops_metrics(p_days integer default 7)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_from timestamptz;
  v_to timestamptz := now();
  v_days integer := least(greatest(coalesce(p_days, 7), 1), 90);
begin
  if not (coalesce(auth.role(), '') = 'service_role' or public.is_admin()) then
    raise exception 'Accès refusé' using errcode = '42501';
  end if;
  v_from := v_to - make_interval(days => v_days);
  return jsonb_build_object(
    'computed_at', v_to,
    'period_start', v_from,
    'period_end', v_to,
    'days', v_days,
    'timezone', 'Africa/Conakry',
    'signups', (select count(*) from public.profiles
                 where role = 'student' and not is_test_account and created_at >= v_from),
    'active_students', (select count(*) from public.profiles
                         where role = 'student' and not is_test_account and last_seen_at >= v_from),
    'verified_students_total', (select count(*) from public.profiles
                                 where role = 'student' and not is_test_account and verification_status = 'verified'),
    'enrollments_submitted', (select count(*) from public.student_enrollments e join public.universities u on u.id = e.university_id
                               where e.created_at >= v_from and u.partner_status = 'partner'),
    'enrollments_decided', (select count(*) from public.student_enrollments
                             where decided_at >= v_from and status in ('verified', 'rejected', 'incomplete')),
    'enrollments_pending', (select count(*) from public.student_enrollments where status in ('pending', 'manual_review')),
    'decision_hours_median', (select round((percentile_cont(0.5) within group (
                                  order by extract(epoch from (decided_at - created_at)) / 3600))::numeric, 1)
                                from public.student_enrollments where decided_at >= v_from),
    'deal_views', (select count(*) from public.content_views v
                    join public.deals d on d.id = v.entity_id join public.partners p on p.id = d.partner_id
                   where v.entity_type = 'deal' and v.created_at >= v_from and not d.is_demo and not p.is_demo),
    'coupons_generated', (select count(*) from public.promo_codes c join public.partners p on p.id = c.partner_id
                           join public.profiles s on s.id = c.student_id
                          where c.created_at >= v_from and not p.is_demo and not s.is_test_account),
    'coupons_used', (select count(*) from public.promo_codes c join public.partners p on p.id = c.partner_id
                      join public.profiles s on s.id = c.student_id
                     where c.status = 'used' and c.used_at >= v_from and not p.is_demo and not s.is_test_account),
    'purchases_confirmed', (select count(*) from public.promo_codes c join public.partners p on p.id = c.partner_id
                             join public.profiles s on s.id = c.student_id
                            where c.status = 'used' and c.payment_method is not null and c.used_at >= v_from
                              and not p.is_demo and not s.is_test_account),
    'declared_amount_gnf', (select coalesce(sum(c.amount_gnf), 0) from public.promo_codes c
                             join public.partners p on p.id = c.partner_id join public.profiles s on s.id = c.student_id
                            where c.status = 'used' and c.payment_method is not null and c.used_at >= v_from
                              and not p.is_demo and not s.is_test_account),
    'card_scans', (select count(*) from public.card_validations v join public.partners p on p.id = v.partner_id
                    where v.created_at >= v_from and not p.is_demo),
    'card_scans_refused', (select count(*) from public.card_validations v join public.partners p on p.id = v.partner_id
                            where v.created_at >= v_from and not p.is_demo and not v.eligible),
    'reports_open', (select count(*) from public.content_reports where status = 'open'),
    'alerts_open', (select count(*) from public.ops_alerts where status <> 'resolved'),
    'ai_cost_usd_month', (select round(coalesce(sum(coalesce(cost_usd, estimated_cost_usd)), 0), 4) from public.ai_runs
                           where created_at >= date_trunc('month', now()) and status <> 'refused')
  );
end;
$$;
revoke all on function public.ops_metrics(integer) from public, anon;
grant execute on function public.ops_metrics(integer) to authenticated, service_role;

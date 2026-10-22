-- =============================================================================
-- IA : contrôle des coûts fiabilisé (non destructif). Tarifs vérifiés le 22/10/2026 sur
-- https://platform.claude.com/docs/en/about-claude/pricing (voir src/lib/ai/pricing.ts).
--   • Modèles limités à une liste dont le coût est connu ; aucun modèle de remplacement automatique.
--   • ai_close : clôture unique (pas de double comptabilisation) ; « to_reconcile » quand la facturation est
--     incertaine (délai dépassé, coupure réseau, échec d'écriture) : le coût estimé reste compté.
--   • ai_mark_stale : un appel resté « en cours » est passé « à rapprocher » ; ai_reconcile : saisie du coût réel.
--   • Tableau de bord : estimé, réservé, enregistré, à rapprocher. Le plafond est applicatif : il ne remplace pas
--     la limite de dépense configurée chez le fournisseur.
-- =============================================================================

alter table public.ai_runs drop constraint if exists ai_runs_status_check;
alter table public.ai_runs add constraint ai_runs_status_check
  check (status in ('running', 'succeeded', 'failed', 'refused', 'to_reconcile'));
alter table public.ai_runs
  add column if not exists reconciled_at timestamptz,
  add column if not exists reconcile_note text check (reconcile_note is null or length(reconcile_note) <= 300);

alter table public.ai_agents add constraint ai_agents_model_allowed
  check (model in ('claude-opus-5-5', 'claude-sonnet-5-5', 'claude-haiku-5-5')) not valid;
alter table public.ai_agents validate constraint ai_agents_model_allowed;

-- Clôture unique d'un appel : seul un appel « en cours » peut être clôturé (une reprise ne recompte rien)
create or replace function public.ai_close(p_run uuid, p_outcome text, p_model text, p_input integer, p_output integer,
                                            p_cost numeric, p_error text default null)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_outcome not in ('succeeded', 'failed', 'to_reconcile') then
    raise exception 'Issue invalide' using errcode = '22023';
  end if;
  update public.ai_runs
     set status = p_outcome,
         model = coalesce(p_model, model), input_tokens = p_input, output_tokens = p_output,
         -- À rapprocher : coût réel inconnu, l'estimation reste comptée dans le budget
         cost_usd = case when p_outcome = 'to_reconcile' then null else greatest(coalesce(p_cost, 0), 0) end,
         error = left(p_error, 2000), finished_at = now()
   where id = p_run and status = 'running';
  return found;
end;
$$;
revoke all on function public.ai_close(uuid, text, text, integer, integer, numeric, text) from public, anon, authenticated;
grant execute on function public.ai_close(uuid, text, text, integer, integer, numeric, text) to service_role;
-- L'ancienne clôture n'est plus utilisée par l'application
revoke all on function public.ai_finish(uuid, boolean, text, integer, integer, numeric, text) from service_role;

create or replace function public.ai_mark_stale(p_minutes integer default 15)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare n integer;
begin
  update public.ai_runs
     set status = 'to_reconcile', finished_at = now(), error = coalesce(error, 'Clôture non enregistrée (délai dépassé)')
   where status = 'running' and created_at < now() - make_interval(mins => greatest(coalesce(p_minutes, 15), 0));
  get diagnostics n = row_count;
  return n;
end;
$$;
revoke all on function public.ai_mark_stale(integer) from public, anon, authenticated;
grant execute on function public.ai_mark_stale(integer) to service_role;

-- Rapprochement par un administrateur (coût relevé dans la console du fournisseur)
create or replace function public.ai_reconcile(p_run uuid, p_cost numeric, p_note text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Accès refusé' using errcode = '42501';
  end if;
  if p_cost is null or p_cost < 0 or char_length(coalesce(trim(p_note), '')) < 3 then
    raise exception 'Indique le coût relevé (0 ou plus) et sa source.' using errcode = 'P0001';
  end if;
  update public.ai_runs
     set status = case when p_cost > 0 then 'succeeded' else 'failed' end, cost_usd = p_cost,
         reconciled_at = now(), reconcile_note = left(trim(p_note), 300)
   where id = p_run and status = 'to_reconcile';
  if not found then
    raise exception 'Appel introuvable ou déjà rapproché' using errcode = 'P0002';
  end if;
  insert into public.audit_log (actor_id, action, details)
  values (auth.uid(), 'ai.reconciled', jsonb_build_object('run', p_run, 'cost', p_cost, 'note', left(trim(p_note), 300)));
end;
$$;
revoke all on function public.ai_reconcile(uuid, numeric, text) from public, anon;
grant execute on function public.ai_reconcile(uuid, numeric, text) to authenticated;

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
  if (coalesce(auth.role(), '') = 'service_role' or public.is_admin()) is not true then
    raise exception 'Accès refusé' using errcode = '42501';
  end if;
  -- Appels IA restés « en cours » plus de 15 min : à rapprocher (coût estimé conservé)
  perform public.ai_mark_stale(15);

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

  -- R8. Autres files de traitement (mêmes seuils que la file de traitement ops_queues)
  select count(*) into v_count from public.bac_verifications
   where status in ('pending', 'manual_review') and created_at < now() - interval '72 hours';
  if v_count > 0 then
    perform public.ops_raise('queue_bac', 'queue_bac', 'medium', 'BAC à vérifier depuis plus de 72 h', jsonb_build_object('count', v_count));
    v_seen := v_seen || 'queue_bac'::text;
  end if;
  select count(*) into v_count from public.university_vetting v join public.universities u on u.id = v.university_id
   where v.submitted_at < now() - interval '7 days' and v.decided_at is null and u.partner_status = 'pending';
  if v_count > 0 then
    perform public.ops_raise('queue_universities', 'queue_universities', 'medium', 'Dossiers d''établissement à contrôler depuis plus de 7 jours',
      jsonb_build_object('count', v_count));
    v_seen := v_seen || 'queue_universities'::text;
  end if;
  select count(*) into v_count from public.ai_conversations where status = 'handed_off' and updated_at < now() - interval '48 hours';
  if v_count > 0 then
    perform public.ops_raise('queue_support', 'queue_support', 'medium', 'Demandes de support sans réponse depuis plus de 48 h',
      jsonb_build_object('count', v_count));
    v_seen := v_seen || 'queue_support'::text;
  end if;

  -- R7. IA : appels à rapprocher (coût incertain, estimation conservée dans le budget)
  select count(*) into v_count from public.ai_runs where status = 'to_reconcile';
  if v_count > 0 then
    perform public.ops_raise('ai_reconcile', 'ai_reconcile', 'medium', 'Appels IA à rapprocher avec la facture du fournisseur',
      jsonb_build_object('runs', v_count));
    v_seen := v_seen || 'ai_reconcile'::text;
  end if;

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
  if (coalesce(auth.role(), '') = 'service_role' or public.is_admin()) is not true then
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
                           where created_at >= date_trunc('month', now()) and status <> 'refused'),
    'ai_recorded_usd_month', (select round(coalesce(sum(cost_usd), 0), 4) from public.ai_runs
                               where created_at >= date_trunc('month', now()) and status in ('succeeded', 'failed')),
    'ai_reserved_usd', (select round(coalesce(sum(estimated_cost_usd), 0), 4) from public.ai_runs where status = 'running'),
    'ai_to_reconcile_usd', (select round(coalesce(sum(estimated_cost_usd), 0), 4) from public.ai_runs where status = 'to_reconcile'),
    'ai_estimated_usd_month', (select round(coalesce(sum(estimated_cost_usd), 0), 4) from public.ai_runs
                                where created_at >= date_trunc('month', now()) and status <> 'refused')
  );
end;
$$;
revoke all on function public.ops_metrics(integer) from public, anon;
grant execute on function public.ops_metrics(integer) to authenticated, service_role;

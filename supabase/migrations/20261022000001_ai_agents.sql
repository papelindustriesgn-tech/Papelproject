-- =============================================================================
-- UNY — centre de pilotage IA (non destructif : nouvelles tables et fonctions uniquement)
--   • ai_agents      : registre des agents (identité technique, outils autorisés, périmètre, limites)
--   • ai_runs        : exécutions et coûts ; réservation atomique du budget avant chaque appel payant
--   • ai_reports     : rapports de l'analyste et diagnostics de l'agent développeur (administrateurs uniquement)
--   • ai_conversations / ai_messages : support, visible par son seul auteur (et l'équipe après transfert)
--   • ai_approvals   : approbation liée à une action ET à ses paramètres exacts (empreinte SHA-256)
-- Par défaut : tout est désactivé et le budget est nul → aucun appel payant tant qu'un administrateur
-- n'a pas fixé de budget. Les agents ne peuvent pas modifier leurs propres outils ni leurs limites.
-- =============================================================================

create table if not exists public.ai_agents (
  id text primary key check (id ~ '^[a-z_]{2,30}$'),
  name text not null,
  description text not null,
  tools text[] not null default '{}',
  data_scope text not null,
  enabled boolean not null default false,
  model text not null default 'claude-opus-5-5',
  effort text not null default 'medium' check (effort in ('low', 'medium', 'high')),
  max_runs_per_day integer not null default 20 check (max_runs_per_day between 0 and 10000),
  max_runs_per_user_day integer not null default 10 check (max_runs_per_user_day between 0 and 1000),
  monthly_budget_usd numeric(10, 2) not null default 0 check (monthly_budget_usd >= 0),
  updated_by uuid references public.profiles (id) on delete set null,
  updated_at timestamptz not null default now()
);
alter table public.ai_agents enable row level security;
drop policy if exists "ai_agents_admin_read" on public.ai_agents;
create policy "ai_agents_admin_read" on public.ai_agents for select to authenticated using (public.is_admin());

insert into public.ai_agents (id, name, description, tools, data_scope, effort, max_runs_per_day, max_runs_per_user_day)
values
  ('analyst', 'Analyste', 'Rapport à la demande sur les indicateurs vérifiés : variations, anomalies, hypothèses, limites. Lecture seule.',
   array['metrics.read', 'alerts.read'], 'Indicateurs agrégés de la plateforme et alertes, sans donnée nominative', 'medium', 20, 10),
  ('support', 'Support', 'Répond aux questions sur les fonctionnalités à partir de la documentation validée et du statut de l''utilisateur connecté ; transfère à un humain.',
   array['docs.search', 'me.status', 'handoff.create'], 'Utilisateur authentifié uniquement (déterminé par le serveur)', 'low', 500, 30),
  ('developer', 'Développeur (diagnostic)', 'Analyse une alerte dédupliquée et propose une piste de correction. Aucun accès au code, aux secrets ni à la base de production.',
   array['alerts.read', 'diagnosis.write'], 'Alertes nettoyées, sans donnée personnelle', 'medium', 10, 10)
on conflict (id) do nothing;

create table if not exists public.ai_runs (
  id uuid primary key default gen_random_uuid(),
  agent_id text not null references public.ai_agents (id),
  requested_by uuid references public.profiles (id) on delete set null,
  status text not null check (status in ('running', 'succeeded', 'failed', 'refused')),
  refusal text,
  model text,
  input_tokens integer,
  output_tokens integer,
  estimated_cost_usd numeric(12, 6) not null default 0,
  cost_usd numeric(12, 6),
  error text check (error is null or length(error) <= 2000),
  created_at timestamptz not null default now(),
  finished_at timestamptz
);
create index if not exists ai_runs_agent_idx on public.ai_runs (agent_id, created_at desc);
create index if not exists ai_runs_user_idx on public.ai_runs (requested_by, created_at desc);
alter table public.ai_runs enable row level security;
drop policy if exists "ai_runs_admin_read" on public.ai_runs;
create policy "ai_runs_admin_read" on public.ai_runs for select to authenticated using (public.is_admin());

create table if not exists public.ai_reports (
  id uuid primary key default gen_random_uuid(),
  agent_id text not null references public.ai_agents (id),
  requested_by uuid references public.profiles (id) on delete set null,
  run_id uuid references public.ai_runs (id) on delete set null,
  alert_id uuid,
  period_days integer,
  metrics jsonb not null default '{}'::jsonb,
  content text not null check (length(content) <= 20000),
  created_at timestamptz not null default now()
);
create index if not exists ai_reports_agent_idx on public.ai_reports (agent_id, created_at desc);
alter table public.ai_reports enable row level security;
drop policy if exists "ai_reports_admin_read" on public.ai_reports;
create policy "ai_reports_admin_read" on public.ai_reports for select to authenticated using (public.is_admin());

create table if not exists public.ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'open' check (status in ('open', 'handed_off', 'closed')),
  handoff_reason text check (handoff_reason is null or length(handoff_reason) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists ai_conversations_user_idx on public.ai_conversations (user_id, updated_at desc);
alter table public.ai_conversations enable row level security;
drop policy if exists "ai_conversations_read" on public.ai_conversations;
create policy "ai_conversations_read" on public.ai_conversations for select to authenticated
  using (user_id = (select auth.uid()) or (status = 'handed_off' and public.is_admin()));

create table if not exists public.ai_messages (
  id bigint generated always as identity primary key,
  conversation_id uuid not null references public.ai_conversations (id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'notice')),
  content text not null check (length(content) between 1 and 4000),
  created_at timestamptz not null default now()
);
create index if not exists ai_messages_conversation_idx on public.ai_messages (conversation_id, id);
alter table public.ai_messages enable row level security;
drop policy if exists "ai_messages_read" on public.ai_messages;
create policy "ai_messages_read" on public.ai_messages for select to authenticated
  using (exists (
    select 1 from public.ai_conversations c
     where c.id = conversation_id
       and (c.user_id = (select auth.uid()) or (c.status = 'handed_off' and public.is_admin()))
  ));
-- Aucune écriture directe : le serveur écrit après avoir déterminé lui-même l'identité (clé de service).

create table if not exists public.ai_approvals (
  id uuid primary key default gen_random_uuid(),
  agent_id text not null references public.ai_agents (id),
  action text not null check (action ~ '^[a-z_.]{3,60}$'),
  params jsonb not null,
  params_hash text not null,
  requested_by uuid references public.profiles (id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'consumed')),
  decided_by uuid references public.profiles (id) on delete set null,
  decided_at timestamptz,
  consumed_at timestamptz,
  expires_at timestamptz not null default now() + interval '1 hour',
  created_at timestamptz not null default now()
);
alter table public.ai_approvals enable row level security;
drop policy if exists "ai_approvals_admin_read" on public.ai_approvals;
create policy "ai_approvals_admin_read" on public.ai_approvals for select to authenticated using (public.is_admin());

-- -----------------------------------------------------------------------------
-- Réglage global (interrupteur + plafond mensuel), désactivé par défaut
-- -----------------------------------------------------------------------------
alter table public.platform_settings drop constraint if exists platform_settings_key_check;
alter table public.platform_settings add constraint platform_settings_key_check
  check (key in ('student_email', 'deal_alerts', 'survey_reminders', 'ai'));
insert into public.platform_settings (key, value)
values ('ai', '{"enabled": false, "monthly_budget_usd": 0}'::jsonb)
on conflict (key) do nothing;

-- -----------------------------------------------------------------------------
-- Réservation atomique : interrupteurs, plafonds mensuels (agent et global), fréquence par jour et par personne.
-- Une exécution « running » compte pour son coût estimé jusqu'à sa fin (pas de dépassement en parallèle).
-- -----------------------------------------------------------------------------
create or replace function public.ai_reserve(p_agent text, p_user uuid, p_estimated_cost numeric)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  a public.ai_agents;
  v_global jsonb;
  v_month_start timestamptz := date_trunc('month', now());
  v_agent_spent numeric;
  v_all_spent numeric;
  v_today integer;
  v_user_today integer;
  v_reason text;
  v_run uuid;
begin
  perform pg_advisory_xact_lock(hashtext('ai_budget'));
  select * into a from public.ai_agents where id = p_agent;
  if not found then
    raise exception 'Agent inconnu' using errcode = '22023';
  end if;
  select value into v_global from public.platform_settings where key = 'ai';

  select coalesce(sum(coalesce(cost_usd, estimated_cost_usd)), 0) into v_agent_spent
    from public.ai_runs where agent_id = p_agent and created_at >= v_month_start and status <> 'refused';
  select coalesce(sum(coalesce(cost_usd, estimated_cost_usd)), 0) into v_all_spent
    from public.ai_runs where created_at >= v_month_start and status <> 'refused';
  select count(*) into v_today from public.ai_runs
   where agent_id = p_agent and created_at >= date_trunc('day', now()) and status <> 'refused';
  select count(*) into v_user_today from public.ai_runs
   where agent_id = p_agent and requested_by = p_user and created_at >= date_trunc('day', now()) and status <> 'refused';

  v_reason := case
    when coalesce((v_global ->> 'enabled')::boolean, false) is not true then 'IA désactivée'
    when not a.enabled then 'Agent suspendu'
    when a.monthly_budget_usd <= 0 or coalesce((v_global ->> 'monthly_budget_usd')::numeric, 0) <= 0 then 'Aucun budget configuré'
    when v_agent_spent + p_estimated_cost > a.monthly_budget_usd then 'Budget mensuel de l''agent atteint'
    when v_all_spent + p_estimated_cost > (v_global ->> 'monthly_budget_usd')::numeric then 'Budget mensuel global atteint'
    when v_today >= a.max_runs_per_day then 'Limite quotidienne de l''agent atteinte'
    when p_user is not null and v_user_today >= a.max_runs_per_user_day then 'Limite quotidienne par personne atteinte'
  end;

  if v_reason is not null then
    insert into public.ai_runs (agent_id, requested_by, status, refusal, finished_at)
    values (p_agent, p_user, 'refused', v_reason, now());
    return jsonb_build_object('ok', false, 'reason', v_reason);
  end if;
  insert into public.ai_runs (agent_id, requested_by, status, model, estimated_cost_usd)
  values (p_agent, p_user, 'running', a.model, p_estimated_cost)
  returning id into v_run;
  return jsonb_build_object('ok', true, 'run', v_run, 'model', a.model, 'effort', a.effort, 'tools', to_jsonb(a.tools));
end;
$$;

create or replace function public.ai_finish(p_run uuid, p_ok boolean, p_model text, p_input integer, p_output integer,
                                             p_cost numeric, p_error text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.ai_runs
     set status = case when p_ok then 'succeeded' else 'failed' end,
         model = coalesce(p_model, model), input_tokens = p_input, output_tokens = p_output,
         -- Sans réponse du fournisseur, le coût estimé reste compté (prudence budgétaire)
         cost_usd = coalesce(p_cost, estimated_cost_usd),
         error = left(p_error, 2000), finished_at = now()
   where id = p_run and status = 'running';
end;
$$;
revoke all on function public.ai_reserve(text, uuid, numeric) from public, anon, authenticated;
revoke all on function public.ai_finish(uuid, boolean, text, integer, integer, numeric, text) from public, anon, authenticated;
grant execute on function public.ai_reserve(text, uuid, numeric) to service_role;
grant execute on function public.ai_finish(uuid, boolean, text, integer, integer, numeric, text) to service_role;

-- -----------------------------------------------------------------------------
-- Réglages par un administrateur (journalisés). Les outils et le périmètre ne sont pas modifiables ici.
-- -----------------------------------------------------------------------------
create or replace function public.ai_configure(p_agent text, p_enabled boolean, p_budget numeric,
                                                p_max_day integer, p_max_user_day integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Accès refusé' using errcode = '42501';
  end if;
  if p_agent = '*' then
    update public.platform_settings
       set value = jsonb_build_object('enabled', p_enabled, 'monthly_budget_usd', greatest(coalesce(p_budget, 0), 0)),
           updated_by = auth.uid(), updated_at = now()
     where key = 'ai';
  else
    update public.ai_agents
       set enabled = p_enabled, monthly_budget_usd = greatest(coalesce(p_budget, 0), 0),
           max_runs_per_day = coalesce(p_max_day, max_runs_per_day),
           max_runs_per_user_day = coalesce(p_max_user_day, max_runs_per_user_day),
           updated_by = auth.uid(), updated_at = now()
     where id = p_agent;
    if not found then
      raise exception 'Agent inconnu' using errcode = '22023';
    end if;
  end if;
  insert into public.audit_log (actor_id, action, details)
  values (auth.uid(), 'ai.configured',
          jsonb_build_object('agent', p_agent, 'enabled', p_enabled, 'budget', p_budget,
                             'max_day', p_max_day, 'max_user_day', p_max_user_day));
end;
$$;
revoke all on function public.ai_configure(text, boolean, numeric, integer, integer) from public, anon;
grant execute on function public.ai_configure(text, boolean, numeric, integer, integer) to authenticated;

-- -----------------------------------------------------------------------------
-- Approbations liées à l'action exacte : toute modification de l'action ou des paramètres l'invalide.
-- -----------------------------------------------------------------------------
create or replace function public.ai_action_hash(p_action text, p_params jsonb)
returns text
language sql
immutable
set search_path = ''
as $$
  select encode(extensions.digest(convert_to(p_action || ':' || p_params::text, 'UTF8'), 'sha256'), 'hex');
$$;

create or replace function public.ai_approval_request(p_agent text, p_action text, p_params jsonb, p_user uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
begin
  if not exists (select 1 from public.ai_agents where id = p_agent) then
    raise exception 'Agent inconnu' using errcode = '22023';
  end if;
  insert into public.ai_approvals (agent_id, action, params, params_hash, requested_by)
  values (p_agent, p_action, p_params, public.ai_action_hash(p_action, p_params), p_user)
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.ai_approval_decide(p_approval uuid, p_approve boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Accès refusé' using errcode = '42501';
  end if;
  update public.ai_approvals
     set status = case when p_approve then 'approved' else 'rejected' end, decided_by = auth.uid(), decided_at = now()
   where id = p_approval and status = 'pending' and expires_at > now()
     and requested_by is distinct from auth.uid();
  if not found then
    raise exception 'Approbation introuvable, expirée ou demandée par vous-même' using errcode = 'P0002';
  end if;
  insert into public.audit_log (actor_id, action, details)
  values (auth.uid(), case when p_approve then 'ai.approved' else 'ai.rejected' end, jsonb_build_object('approval', p_approval));
end;
$$;

-- Consommation juste avant l'exécution : même action, mêmes paramètres, non expirée, une seule fois.
create or replace function public.ai_approval_consume(p_approval uuid, p_action text, p_params jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  r public.ai_approvals;
begin
  select * into r from public.ai_approvals where id = p_approval for update;
  if not found or r.status <> 'approved' then
    raise exception 'Approbation absente ou non accordée' using errcode = '42501';
  end if;
  if r.expires_at <= now() then
    raise exception 'Approbation expirée' using errcode = '42501';
  end if;
  if r.params_hash <> public.ai_action_hash(p_action, p_params) then
    raise exception 'Approbation invalide : l''action ou ses paramètres ont changé' using errcode = '42501';
  end if;
  update public.ai_approvals set status = 'consumed', consumed_at = now() where id = p_approval;
end;
$$;
revoke all on function public.ai_approval_request(text, text, jsonb, uuid) from public, anon, authenticated;
revoke all on function public.ai_approval_consume(uuid, text, jsonb) from public, anon, authenticated;
revoke all on function public.ai_approval_decide(uuid, boolean) from public, anon;
grant execute on function public.ai_approval_request(text, text, jsonb, uuid) to service_role;
grant execute on function public.ai_approval_consume(uuid, text, jsonb) to service_role;
grant execute on function public.ai_approval_decide(uuid, boolean) to authenticated;

-- =============================================================================
-- Validation des établissements renforcée (non destructif ; les établissements déjà partenaires le restent).
--   • L'établissement dépose un dossier : nom légal, n° d'agrément / arrêté, signataire habilité, standard
--     officiel, lettre officielle signée et cachetée (document privé).
--   • L'équipe Uny contrôle : agrément vérifié sur une source officielle, rappel au numéro OFFICIEL trouvé par
--     Uny (pas celui fourni), signataire habilité. Tout est journalisé.
--   • Seule approve_university() fait passer un établissement en « partenaire » (un déclencheur bloque toute
--     autre voie depuis l'application).
-- =============================================================================

create table if not exists public.university_vetting (
  university_id integer primary key references public.universities (id) on delete cascade,
  -- Dossier fourni par l'établissement
  legal_name text check (legal_name is null or char_length(legal_name) between 3 and 200),
  accreditation_ref text check (accreditation_ref is null or char_length(accreditation_ref) between 3 and 120),
  accreditation_date date,
  signatory_name text check (signatory_name is null or char_length(signatory_name) between 3 and 120),
  signatory_title text check (signatory_title is null or char_length(signatory_title) between 2 and 120),
  official_phone text check (official_phone is null or char_length(official_phone) between 6 and 30),
  official_email text check (official_email is null or char_length(official_email) between 5 and 200),
  document_path text check (document_path is null or document_path like 'universities/%'),
  submitted_by uuid references public.profiles (id) on delete set null,
  submitted_at timestamptz,
  -- Contrôles de l'équipe Uny
  accreditation_source text check (accreditation_source is null or char_length(accreditation_source) between 3 and 300),
  callback_phone text check (callback_phone is null or char_length(callback_phone) between 6 and 30),
  callback_source text check (callback_source is null or char_length(callback_source) between 3 and 300),
  callback_person text check (callback_person is null or char_length(callback_person) between 3 and 200),
  mandate_checked boolean not null default false,
  decided_by uuid references public.profiles (id) on delete set null,
  decided_at timestamptz,
  decision_note text check (decision_note is null or char_length(decision_note) <= 1000)
);
alter table public.university_vetting enable row level security;
create policy "university_vetting_read" on public.university_vetting for select to authenticated
  using (public.is_admin() or public.university_workspace_role(university_id) = 'admin');
-- Aucune écriture directe : fonctions ci-dessous uniquement.

-- Dossier déposé par un administrateur de l'espace établissement (en attente ou partenaire)
create or replace function public.university_submit_vetting(
  p_university integer, p_legal_name text, p_accreditation_ref text, p_accreditation_date date,
  p_signatory_name text, p_signatory_title text, p_official_phone text, p_official_email text, p_document_path text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if public.university_workspace_role(p_university) is distinct from 'admin' and not public.is_admin() then
    raise exception 'Accès refusé' using errcode = '42501';
  end if;
  if p_document_path is not null and p_document_path not like 'universities/' || p_university || '/%' then
    raise exception 'Document invalide' using errcode = '22023';
  end if;
  insert into public.university_vetting as v (university_id, legal_name, accreditation_ref, accreditation_date,
    signatory_name, signatory_title, official_phone, official_email, document_path, submitted_by, submitted_at)
  values (p_university, nullif(trim(p_legal_name), ''), nullif(trim(p_accreditation_ref), ''), p_accreditation_date,
    nullif(trim(p_signatory_name), ''), nullif(trim(p_signatory_title), ''), nullif(trim(p_official_phone), ''),
    nullif(lower(trim(p_official_email)), ''), p_document_path, auth.uid(), now())
  on conflict (university_id) do update set
    legal_name = excluded.legal_name, accreditation_ref = excluded.accreditation_ref,
    accreditation_date = excluded.accreditation_date, signatory_name = excluded.signatory_name,
    signatory_title = excluded.signatory_title, official_phone = excluded.official_phone,
    official_email = excluded.official_email, document_path = coalesce(excluded.document_path, v.document_path),
    submitted_by = excluded.submitted_by, submitted_at = excluded.submitted_at;
  insert into public.audit_log (actor_id, university_id, action, details)
  values (auth.uid(), p_university, 'university.vetting_submitted', jsonb_build_object('document', p_document_path is not null));
end;
$$;
revoke all on function public.university_submit_vetting(integer, text, text, date, text, text, text, text, text) from public, anon;
grant execute on function public.university_submit_vetting(integer, text, text, date, text, text, text, text, text) to authenticated;

-- Approbation : seule voie vers « partenaire », après dossier complet et contrôles de l'équipe Uny
create or replace function public.approve_university(
  p_university integer, p_accreditation_source text, p_callback_phone text, p_callback_source text,
  p_callback_person text, p_mandate_checked boolean, p_note text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.university_vetting;
begin
  if not public.is_admin() then
    raise exception 'Accès refusé' using errcode = '42501';
  end if;
  select * into v from public.university_vetting where university_id = p_university for update;
  if v.university_id is null or v.legal_name is null or v.accreditation_ref is null or v.signatory_name is null
     or v.signatory_title is null or v.official_phone is null or v.document_path is null then
    raise exception 'Dossier incomplet : nom légal, agrément, signataire, standard officiel et lettre officielle sont requis.'
      using errcode = 'P0001';
  end if;
  if char_length(coalesce(trim(p_accreditation_source), '')) < 3 then
    raise exception 'Indique où l''agrément a été vérifié (source officielle).' using errcode = 'P0001';
  end if;
  if char_length(regexp_replace(coalesce(p_callback_phone, ''), '\D', '', 'g')) < 8
     or char_length(coalesce(trim(p_callback_source), '')) < 3 or char_length(coalesce(trim(p_callback_person), '')) < 3 then
    raise exception 'Rappel obligatoire : numéro officiel appelé, où il a été trouvé et personne jointe.' using errcode = 'P0001';
  end if;
  if p_mandate_checked is not true then
    raise exception 'Confirme que le signataire est habilité (lettre signée et cachetée).' using errcode = 'P0001';
  end if;

  update public.university_vetting set
    accreditation_source = trim(p_accreditation_source), callback_phone = trim(p_callback_phone),
    callback_source = trim(p_callback_source), callback_person = trim(p_callback_person),
    mandate_checked = true, decided_by = auth.uid(), decided_at = now(), decision_note = nullif(trim(p_note), '')
   where university_id = p_university;

  perform set_config('uny.university_approval', 'on', true);
  update public.universities set partner_status = 'partner', approved_at = now() where id = p_university;
  perform set_config('uny.university_approval', 'off', true);

  insert into public.audit_log (actor_id, university_id, action, details)
  values (auth.uid(), p_university, 'university.approved',
          jsonb_build_object('accreditation_ref', v.accreditation_ref, 'accreditation_source', trim(p_accreditation_source),
                             'callback_source', trim(p_callback_source), 'callback_person', trim(p_callback_person)));
end;
$$;
revoke all on function public.approve_university(integer, text, text, text, text, boolean, text) from public, anon;
grant execute on function public.approve_university(integer, text, text, text, text, boolean, text) to authenticated;

-- Garde-fou : aucun passage en « partenaire » hors approve_university (la clé de service, côté serveur, reste libre)
create or replace function public.universities_partner_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.partner_status = 'partner'
     and (tg_op = 'INSERT' or old.partner_status is distinct from 'partner')
     and coalesce(current_setting('uny.university_approval', true), '') <> 'on'
     and coalesce(auth.role(), '') <> 'service_role'
     and current_user not in ('postgres', 'supabase_admin') then
    raise exception 'Un établissement devient partenaire uniquement après contrôle de son dossier.' using errcode = 'P0001';
  end if;
  return new;
end;
$$;
drop trigger if exists universities_partner_guard on public.universities;
create trigger universities_partner_guard
  before insert or update of partner_status on public.universities
  for each row execute function public.universities_partner_guard();

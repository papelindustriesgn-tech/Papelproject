-- =============================================================================
-- UNY — enquête d'avis des inscrits (une réponse par étudiant, modifiable)
-- =============================================================================

create table public.survey_responses (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  source text not null check (source in ('whatsapp', 'ami', 'reseaux', 'universite', 'affiche', 'autre')),
  rating smallint not null check (rating between 1 and 5),
  modules text[] not null default '{}'
    check (modules <@ array['carte', 'avantages', 'jobs', 'logement', 'marketplace']::text[]),
  nps smallint not null check (nps between 0 and 10),
  missing text check (char_length(missing) <= 1000),
  partners text check (char_length(partners) <= 500),
  would_pay text not null default 'non' check (would_pay in ('oui', 'peut-etre', 'non')),
  contact_ok boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.survey_responses enable row level security;

create policy "survey_select_own_or_admin" on public.survey_responses for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy "survey_insert_own" on public.survey_responses for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "survey_update_own" on public.survey_responses for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

revoke all on public.survey_responses from anon;
revoke update, delete, truncate on public.survey_responses from authenticated;
grant select, insert on public.survey_responses to authenticated;
-- user_id figure dans l'upsert ; la politique RLS empêche de le changer.
grant update (user_id, source, rating, modules, nps, missing, partners, would_pay, contact_ok, updated_at)
  on public.survey_responses to authenticated;

-- Invite les inscrits actuels (hors comptes de test) à répondre.
insert into public.notifications (user_id, type, title, body, link)
select id, 'survey', 'Donne ton avis sur Uny 🙏', '2 minutes pour nous aider à construire l''app dont tu as besoin.', '/avis'
from public.profiles
where not is_test_account;

-- Et chaque nouvel inscrit, en même temps que la notification de bienvenue.
create or replace function public.invite_to_survey()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not new.is_test_account then
    insert into public.notifications (user_id, type, title, body, link)
    values (new.id, 'survey', 'Donne ton avis sur Uny 🙏',
            '2 minutes pour nous aider à construire l''app dont tu as besoin.', '/avis');
  end if;
  return new;
end;
$$;
revoke execute on function public.invite_to_survey() from public, anon, authenticated;

create trigger on_profile_created_invite_survey
  after insert on public.profiles
  for each row execute function public.invite_to_survey();

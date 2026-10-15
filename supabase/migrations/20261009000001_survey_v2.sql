-- =============================================================================
-- UNY — enquêtes v2 : attentes en matière d'avantages
--   • étudiants : domaines, types d'avantages, réduction attendue, budget, paiement
--   • partenaires (nouvelle table) : avantages proposés, attentes envers Uny
--   Les réponses v1 des étudiants restent lisibles (colonnes v1 devenues facultatives).
-- =============================================================================

alter table public.survey_responses
  alter column source drop not null,
  alter column rating drop not null,
  alter column nps drop not null,
  alter column would_pay drop not null,
  alter column would_pay drop default,
  add column version smallint not null default 1,
  add column categories text[] not null default '{}'
    check (categories <@ array['restauration', 'shopping', 'sport', 'tech', 'formation', 'loisirs', 'transport', 'sante']::text[]),
  add column benefit_types text[] not null default '{}'
    check (benefit_types <@ array['pourcentage', 'prix_fixe', 'offert', 'fidelite', 'livraison', 'heures_creuses']::text[]),
  add column min_discount text check (min_discount in ('10', '20', '30', '50')),
  add column monthly_budget text check (monthly_budget in ('moins_100k', '100_300k', '300_600k', 'plus_600k')),
  add column payment_pref text check (payment_pref in ('orange_money', 'autre_mobile', 'especes'));

grant update (version, categories, benefit_types, min_discount, monthly_budget, payment_pref)
  on public.survey_responses to authenticated;

-- -----------------------------------------------------------------------------
-- Enquête partenaires (une réponse par établissement, modifiable par ses membres)
-- -----------------------------------------------------------------------------
create table public.partner_survey_responses (
  partner_id uuid primary key references public.partners(id) on delete cascade,
  answered_by uuid references public.profiles(id) on delete set null,
  offer_types text[] not null default '{}'
    check (offer_types <@ array['pourcentage', 'prix_fixe', 'offert', 'fidelite', 'livraison', 'heures_creuses']::text[]),
  discount_range text not null check (discount_range in ('5_10', '10_20', '20_30', 'plus_30')),
  expectations text[] not null default '{}'
    check (expectations <@ array['clients', 'heures_creuses', 'visibilite', 'fidelisation', 'zero_fraude', 'paiement', 'statistiques']::text[]),
  expected_students text not null check (expected_students in ('moins_20', '20_50', '50_100', 'plus_100')),
  payment_methods text[] not null default '{}'
    check (payment_methods <@ array['orange_money', 'autre_mobile', 'especes', 'carte']::text[]),
  would_pay text not null check (would_pay in ('oui', 'peut-etre', 'non')),
  comments text check (char_length(comments) <= 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.partner_survey_responses enable row level security;
create policy "partner_survey_read" on public.partner_survey_responses for select to authenticated
  using (public.is_partner_member(partner_id) or public.is_admin());
create policy "partner_survey_insert" on public.partner_survey_responses for insert to authenticated
  with check (public.is_partner_member(partner_id) and answered_by = (select auth.uid()));
create policy "partner_survey_update" on public.partner_survey_responses for update to authenticated
  using (public.is_partner_member(partner_id))
  with check (public.is_partner_member(partner_id) and answered_by = (select auth.uid()));
revoke all on public.partner_survey_responses from anon;
revoke update, delete, truncate on public.partner_survey_responses from authenticated;
grant select, insert on public.partner_survey_responses to authenticated;
grant update (partner_id, answered_by, offer_types, discount_range, expectations, expected_students, payment_methods,
              would_pay, comments, updated_at)
  on public.partner_survey_responses to authenticated;

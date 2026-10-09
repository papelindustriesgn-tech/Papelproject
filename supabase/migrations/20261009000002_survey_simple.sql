-- =============================================================================
-- UNY — questionnaires courts : comprendre le projet et aider à l'améliorer
--   Étudiants : compréhension, domaines, intention d'utiliser, paiement, idée.
--   Partenaires : compréhension, avantages offerts, réduction, attentes, idée.
--   Les colonnes des versions précédentes deviennent facultatives (export conservé).
-- =============================================================================

alter table public.survey_responses
  add column understood text check (understood in ('oui', 'un_peu', 'non')),
  add column would_use text check (would_use in ('oui', 'peut-etre', 'non'));
grant update (understood, would_use) on public.survey_responses to authenticated;

alter table public.partner_survey_responses
  add column understood text check (understood in ('oui', 'un_peu', 'non')),
  alter column expected_students drop not null,
  alter column would_pay drop not null;
grant update (understood) on public.partner_survey_responses to authenticated;

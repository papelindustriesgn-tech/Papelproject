-- =============================================================================
-- UNY — données de démonstration (production uniquement, rejouable)
-- Toutes les offres et partenaires ci-dessous sont marqués is_demo : badge « Démo », jamais de
-- notification aux étudiants, masqués automatiquement dès qu'il existe des offres réelles.
--   • cartes de fidélité sur 5 partenaires de démo
--   • 2 offres flash de démo, renouvelées chaque nuit (tâche uny-demo-flash)
--   • « Université Démo Uny » (non listée à l'inscription) + annonces d'exemple
--   • les admins Uny sont membres du partenaire de démo « Burger Corner Kipé » et de
--     l'université de démo : Profil → Espace partenaire / Portail université
-- =============================================================================

insert into public.loyalty_programs (partner_id, is_active, stamps_required, reward) values
  ('d0000000-0000-4000-8000-000000000003', true, 5, '1 menu burger offert'),
  ('d0000000-0000-4000-8000-000000000002', true, 6, '1 café + viennoiserie offerts'),
  ('d0000000-0000-4000-8000-000000000001', true, 5, '1 plat du jour offert'),
  ('d0000000-0000-4000-8000-000000000004', true, 8, '1 semaine d''abonnement offerte'),
  ('d0000000-0000-4000-8000-000000000007', true, 4, '1 atelier de code offert')
on conflict (partner_id) do update set is_active = true, stamps_required = excluded.stamps_required, reward = excluded.reward;

insert into public.deals (id, partner_id, title, discount_label, category, description, conditions, city_id, district,
                          image_url, price_gnf, promo_price_gnf, valid_from, is_active, requires_verification, is_demo,
                          flash_hours, flash_quantity)
values
  ('d1000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000003',
   'Menu étudiant à -30 % ce midi', '-30 %', 'restauration',
   'Burger, frites et boisson à prix étudiant pendant l''offre flash.', 'Sur présentation de la carte Uny ou du code promo.',
   1, 'Kipé', 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=900&q=70&auto=format&fit=crop',
   60000, 42000, current_date, true, true, true, 48, 30),
  ('d1000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000002',
   'Petit-déjeuner étudiant à -40 %', '-40 %', 'restauration',
   'Café, jus et viennoiserie : le petit-déjeuner pour réviser.', 'Du lundi au vendredi, sur place.',
   1, 'Taouyah', 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=900&q=70&auto=format&fit=crop',
   35000, 21000, current_date, true, true, true, 48, 20)
on conflict (id) do update set is_active = true, flash_hours = excluded.flash_hours, flash_quantity = excluded.flash_quantity;

-- Les offres flash de démo restent toujours en cours (fenêtre renouvelée chaque nuit)
update public.deals set flash_started_at = now(), flash_ends_at = now() + interval '48 hours'
 where is_demo and flash_hours is not null;
select cron.schedule('uny-demo-flash', '0 4 * * *',
  $$update public.deals set flash_started_at = now(), flash_ends_at = now() + interval '48 hours' where is_demo and flash_hours is not null$$);

-- Université de démonstration (non proposée aux étudiants à l'inscription)
insert into public.universities (country_code, city_id, name, short_name, slug, partner_status, approved_at, is_active, faculties)
select 'GN', 1, 'Université Démo Uny', 'Démo Uny', 'universite-demo-uny', 'partner', now(), false,
       array['Faculté des Sciences', 'Faculté de Droit', 'Faculté des Lettres', 'École de Commerce']
 where not exists (select 1 from public.universities where slug = 'universite-demo-uny');

insert into public.university_members (university_id, user_id)
select u.id, p.id from public.universities u cross join public.profiles p
 where u.slug = 'universite-demo-uny' and p.role = 'admin'
on conflict do nothing;

insert into public.university_announcements (university_id, title, body, audience, study_level, faculty, recipients, created_by, created_at)
select u.id, a.title, a.body, a.audience, a.lvl, a.fac, a.n, null, now() - a.ago
  from public.universities u,
       (values
         ('Examens du 1er semestre', 'Les examens commencent le lundi 3 novembre. Le planning est affiché au rectorat et sur Uny.', 'verified', null, null, 412, interval '2 days'),
         ('Réinscriptions Licence 2', 'Les réinscriptions en Licence 2 sont ouvertes jusqu''au 30 octobre au service de la scolarité.', 'all', 'Licence 2', null, 168, interval '5 days'),
         ('Journée portes ouvertes', 'Samedi de 9 h à 14 h : rencontrez les enseignants et les associations étudiantes.', 'all', null, 'École de Commerce', 95, interval '9 days')
       ) as a(title, body, audience, lvl, fac, n, ago)
 where u.slug = 'universite-demo-uny'
   and not exists (select 1 from public.university_announcements x where x.university_id = u.id);

-- Espace partenaire de démonstration pour les admins
insert into public.partner_members (partner_id, user_id)
select 'd0000000-0000-4000-8000-000000000003', p.id from public.profiles p where p.role = 'admin'
on conflict do nothing;

-- =============================================================================
-- UNY — offres de démonstration supplémentaires (production uniquement, rejouable)
-- Partenaires et offres marqués is_demo : badge « Démo », aucune notification, masqués
-- automatiquement dès qu'un partenaire réel publie une offre.
-- =============================================================================

insert into public.partners (id, name, category, logo_url, description, city_id, district, is_demo) values
  ('d0000000-0000-4000-8000-000000000013', 'Institut Langues Plus', 'formation',
   'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=900&q=70&auto=format&fit=crop',
   'Cours d''anglais, de chinois et préparation TOEFL / IELTS.', 1, 'Dixinn', true),
  ('d0000000-0000-4000-8000-000000000014', 'Digital Skills Conakry', 'formation',
   'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=900&q=70&auto=format&fit=crop',
   'Formations courtes : bureautique, design, marketing digital, développement web.', 1, 'Kaloum', true),
  ('d0000000-0000-4000-8000-000000000015', 'Chez Tantie Fanta', 'restauration',
   'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=900&q=70&auto=format&fit=crop',
   'Riz gras, sauce feuille, poulet yassa : la cuisine de maison à petit prix.', 1, 'Hamdallaye', true),
  ('d0000000-0000-4000-8000-000000000016', 'Mobile Store Madina', 'tech',
   'https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=900&q=70&auto=format&fit=crop',
   'Smartphones, ordinateurs portables, accessoires et réparation.', 1, 'Madina', true)
on conflict (id) do nothing;

insert into public.deals (id, partner_id, title, discount_label, category, description, conditions, city_id, district,
                          image_url, price_gnf, promo_price_gnf, valid_from, valid_until, is_active, is_featured,
                          requires_verification, is_demo)
values
  -- Formation
  ('d1000000-0000-4000-8000-000000000003', 'd0000000-0000-4000-8000-000000000013', 'Cours d''anglais intensif à -40 %', '-40 %', 'formation',
   '2 mois de cours d''anglais, 3 séances par semaine, test de niveau offert.', 'Inscription avec la carte Uny vérifiée.',
   1, 'Dixinn', 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=900&q=70&auto=format&fit=crop',
   500000, 300000, current_date, current_date + 120, true, true, true, true),
  ('d1000000-0000-4000-8000-000000000004', 'd0000000-0000-4000-8000-000000000013', 'Préparation TOEFL / IELTS à -30 %', '-30 %', 'formation',
   'Préparation complète aux tests d''anglais pour les bourses et études à l''étranger.', 'Places limitées par session.',
   1, 'Dixinn', 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=900&q=70&auto=format&fit=crop',
   800000, 560000, current_date, current_date + 120, true, false, true, true),
  ('d1000000-0000-4000-8000-000000000005', 'd0000000-0000-4000-8000-000000000014', 'Formation Excel & Word à -50 %', '-50 %', 'formation',
   'Maîtrisez Excel, Word et PowerPoint en 4 week-ends. Attestation délivrée.', 'Ordinateur fourni sur place.',
   1, 'Kaloum', 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=900&q=70&auto=format&fit=crop',
   400000, 200000, current_date, current_date + 90, true, true, true, true),
  ('d1000000-0000-4000-8000-000000000006', 'd0000000-0000-4000-8000-000000000014', 'Bootcamp développement web à -35 %', '-35 %', 'formation',
   'HTML, CSS, JavaScript : créez votre premier site en 6 semaines.', 'Sur présentation de la carte Uny.',
   1, 'Kaloum', 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=900&q=70&auto=format&fit=crop',
   1500000, 975000, current_date, current_date + 90, true, false, true, true),
  ('d1000000-0000-4000-8000-000000000007', 'd0000000-0000-4000-8000-000000000011', 'Manuels universitaires à -20 %', '-20 %', 'formation',
   'Droit, médecine, économie, informatique : les manuels du programme moins chers.', 'Hors promotions en cours.',
   1, 'Kaloum', 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=900&q=70&auto=format&fit=crop',
   150000, 120000, current_date, current_date + 150, true, false, false, true),
  -- Restauration
  ('d1000000-0000-4000-8000-000000000008', 'd0000000-0000-4000-8000-000000000015', 'Plat du jour étudiant à 20 000 GNF', '-33 %', 'restauration',
   'Riz gras, sauce feuille ou poulet yassa, avec boisson.', 'Du lundi au samedi, de 12 h à 15 h.',
   1, 'Hamdallaye', 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=900&q=70&auto=format&fit=crop',
   30000, 20000, current_date, null, true, true, true, true),
  ('d1000000-0000-4000-8000-000000000009', 'd0000000-0000-4000-8000-000000000015', 'Formule révisions : plat + jus à -25 %', '-25 %', 'restauration',
   'Pendant les examens : un plat et un jus naturel pour tenir jusqu''au soir.', 'Sur place ou à emporter.',
   1, 'Hamdallaye', 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=900&q=70&auto=format&fit=crop',
   40000, 30000, current_date, current_date + 60, true, false, true, true),
  ('d1000000-0000-4000-8000-000000000010', 'd0000000-0000-4000-8000-000000000001', 'Grillades du vendredi à -20 %', '-20 %', 'restauration',
   'Brochettes, poisson braisé et alloco tous les vendredis soir.', 'À partir de 18 h.',
   1, 'Kaloum', 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=900&q=70&auto=format&fit=crop',
   75000, 60000, current_date, null, true, false, true, true),
  ('d1000000-0000-4000-8000-000000000011', 'd0000000-0000-4000-8000-000000000002', 'Wi-Fi + boisson chaude : 15 000 GNF', '-40 %', 'restauration',
   'Réviser au calme : Wi-Fi illimité et une boisson chaude pour l''après-midi.', 'De 14 h à 19 h.',
   1, 'Taouyah', 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=900&q=70&auto=format&fit=crop',
   25000, 15000, current_date, null, true, false, true, true),
  -- Tech
  ('d1000000-0000-4000-8000-000000000012', 'd0000000-0000-4000-8000-000000000016', 'Ordinateur portable reconditionné à -15 %', '-15 %', 'tech',
   'PC portables reconditionnés et garantis 6 mois, parfaits pour les cours.', 'Garantie 6 mois, facture fournie.',
   1, 'Madina', 'https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=900&q=70&auto=format&fit=crop',
   3500000, 2975000, current_date, current_date + 120, true, true, true, true),
  ('d1000000-0000-4000-8000-000000000013', 'd0000000-0000-4000-8000-000000000016', 'Réparation d''écran de téléphone à -25 %', '-25 %', 'tech',
   'Remplacement d''écran en 1 heure pour les modèles courants.', 'Pièces garanties 3 mois.',
   1, 'Madina', 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=900&q=70&auto=format&fit=crop',
   400000, 300000, current_date, null, true, false, true, true),
  ('d1000000-0000-4000-8000-000000000014', 'd0000000-0000-4000-8000-000000000012', 'Forfait internet 30 Go à -30 %', '-30 %', 'tech',
   '30 Go valables 30 jours pour les cours en ligne et les recherches.', 'Un forfait par mois et par étudiant.',
   1, null, 'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=900&q=70&auto=format&fit=crop',
   100000, 70000, current_date, null, true, false, true, true),
  -- Loisirs, santé
  ('d1000000-0000-4000-8000-000000000015', 'd0000000-0000-4000-8000-000000000008', 'Séance de cinéma à 25 000 GNF', '-50 %', 'loisirs',
   'Tous les films, toutes les séances du lundi au jeudi.', 'Sur présentation de la carte Uny.',
   1, 'Kaloum', 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=900&q=70&auto=format&fit=crop',
   50000, 25000, current_date, null, true, false, true, true),
  ('d1000000-0000-4000-8000-000000000016', 'd0000000-0000-4000-8000-000000000010', 'Bilan de santé étudiant à -30 %', '-30 %', 'sante',
   'Tension, glycémie, conseils nutrition : un bilan rapide avant les examens.', 'Sur rendez-vous.',
   1, 'Camayenne', 'https://images.unsplash.com/photo-1585435557343-3b092031a831?w=900&q=70&auto=format&fit=crop',
   100000, 70000, current_date, current_date + 90, true, false, true, true)
on conflict (id) do nothing;

-- Programme de fidélité sur les nouveaux partenaires de démo
insert into public.loyalty_programs (partner_id, is_active, stamps_required, reward) values
  ('d0000000-0000-4000-8000-000000000015', true, 6, '1 plat du jour offert'),
  ('d0000000-0000-4000-8000-000000000014', true, 3, '1 atelier de 2 heures offert')
on conflict (partner_id) do nothing;

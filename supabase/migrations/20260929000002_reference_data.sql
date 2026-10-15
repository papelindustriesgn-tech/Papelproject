-- =============================================================================
-- UNY — données de référence (pays, villes, établissements)
-- Seule la Guinée est active pour le pilote ; les autres pays sont prêts.
-- =============================================================================

insert into public.countries (code, name, currency, phone_prefix, is_active) values
  ('GN', 'Guinée', 'GNF', '+224', true),
  ('SN', 'Sénégal', 'XOF', '+221', false),
  ('CI', 'Côte d''Ivoire', 'XOF', '+225', false),
  ('ML', 'Mali', 'XOF', '+223', false),
  ('BF', 'Burkina Faso', 'XOF', '+226', false),
  ('BJ', 'Bénin', 'XOF', '+229', false),
  ('TG', 'Togo', 'XOF', '+228', false),
  ('CM', 'Cameroun', 'XAF', '+237', false)
on conflict (code) do nothing;

insert into public.cities (country_code, name, slug, is_active, districts) values
  ('GN', 'Conakry', 'conakry', true, array[
    'Kaloum', 'Dixinn', 'Matam', 'Matoto', 'Ratoma', 'Kipé', 'Taouyah', 'Nongo', 'Lambanyi',
    'Kaporo', 'Hamdallaye', 'Bambeto', 'Cosa', 'Koloma', 'Sonfonia', 'Gbessia', 'Camayenne',
    'Belle-Vue', 'Landréah', 'Madina', 'Enta', 'Yimbaya', 'Kagbélen', 'Simbaya'
  ]),
  ('GN', 'Kindia', 'kindia', false, '{}'),
  ('GN', 'Labé', 'labe', false, '{}'),
  ('GN', 'Kankan', 'kankan', false, '{}'),
  ('GN', 'N''Zérékoré', 'nzerekore', false, '{}'),
  ('GN', 'Boké', 'boke', false, '{}'),
  ('GN', 'Mamou', 'mamou', false, '{}'),
  ('SN', 'Dakar', 'dakar', false, '{}'),
  ('CI', 'Abidjan', 'abidjan', false, '{}'),
  ('ML', 'Bamako', 'bamako', false, '{}')
on conflict (slug) do nothing;

insert into public.universities (country_code, city_id, name, short_name)
select 'GN', c.id, u.name, u.short_name
from (values
  ('conakry', 'Université Gamal Abdel Nasser de Conakry', 'UGANC'),
  ('conakry', 'Université Général Lansana Conté de Sonfonia-Conakry', 'UGLC-SC'),
  ('conakry', 'Université Kofi Annan de Guinée', 'UKAG'),
  ('conakry', 'Université Nongo Conakry', 'UNC'),
  ('conakry', 'Université Barack Obama', 'UBO'),
  ('conakry', 'Université Mercure Internationale', 'UMI'),
  ('conakry', 'Université La Source', 'ULS'),
  ('conakry', 'Institut Supérieur des Arts de Guinée', 'ISAG'),
  ('conakry', 'Institut Supérieur de l''Information et de la Communication', 'ISIC Kountia'),
  ('conakry', 'École Nationale d''Administration', 'ENA'),
  ('kankan', 'Université Julius Nyerere de Kankan', 'UJNK'),
  ('labe', 'Université de Labé', 'UL'),
  ('nzerekore', 'Université de N''Zérékoré', 'UZ'),
  ('kindia', 'Université de Kindia', 'UK'),
  ('boke', 'Institut Supérieur des Mines et Géologie de Boké', 'ISMGB'),
  ('mamou', 'Institut Supérieur de Technologie de Mamou', 'IST Mamou')
) as u(city_slug, name, short_name)
join public.cities c on c.slug = u.city_slug
on conflict (country_code, name) do nothing;

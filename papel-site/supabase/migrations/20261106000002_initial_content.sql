-- =====================================================================
-- Contenu initial (identique à src/content/defaults.ts).
-- Champs non validés laissés vides : ils s'affichent « en cours de validation ».
-- Rejouable sans écraser les modifications faites depuis l'administration.
-- =====================================================================

insert into public.site_settings (key, value) values
('company', jsonb_build_object(
  'brandName', 'Papel Industries',
  'legalName', 'Société Papel Industrie',
  'legalForm', 'Société à responsabilité limitée (SARL)',
  'signature', 'Papel — L''hygiène au quotidien.',
  'rccm', 'GC.TCC.2024.B.08451',
  'nif', '600460612',
  'headOffice', 'Simbaya Gare, Ratoma — Conakry',
  'factoryName', 'Site industriel de Coyah',
  'factoryArea', 'Toguiron Kondéyah',
  'factoryCity', 'Coyah',
  'country', 'République de Guinée',
  'factoryLat', null, 'factoryLng', null,
  'phone', '', 'whatsapp', '', 'email', '',
  'facebookUrl', '', 'instagramUrl', '', 'linkedinUrl', '',
  'openingHours', ''
)),
('home', jsonb_build_object(
  'heroEyebrow', 'Papel Doux · Mouchoirs',
  'heroTitle', 'Papel, l''hygiène au quotidien.',
  'heroSubtitle', 'Des produits pensés pour accompagner chaque instant de votre quotidien.',
  'heroImage', '/images/papel-doux-lifestyle-main.jpg',
  'heroImageMobile', '/images/papel-doux-table.jpg',
  'heroImageAlt', 'Paquets de mouchoirs Papel Doux posés sur une table',
  'commitmentsTitle', 'Ce qui guide chacun de nos produits',
  'commitments', jsonb_build_array(
    jsonb_build_object('title', 'Qualité au quotidien', 'text', 'Des produits agréables au toucher, pratiques et fiables, pensés pour les gestes de tous les jours.'),
    jsonb_build_object('title', 'Accessibilité', 'text', 'Des formats adaptés aux besoins et aux budgets de chacun, pour les familles comme pour les professionnels.'),
    jsonb_build_object('title', 'Confiance et régularité', 'text', 'Une marque identifiable et un approvisionnement suivi, pour retrouver Papel là où vous en avez besoin.')
  ),
  'companyTitle', 'Une industrie guinéenne de l''hygiène',
  'companyText', 'Papel Industries est une entreprise guinéenne de transformation du papier et de produits d''hygiène, implantée à Coyah. Notre ambition : construire une marque de référence, capable de proposer durablement des produits de qualité constante et accessibles, d''abord en Guinée puis en Afrique de l''Ouest.',
  'closingTitle', 'Construisons ensemble l''hygiène de demain.',
  'closingText', 'Distributeurs, commerçants, hôtels, restaurants ou entreprises : parlons de vos besoins et des conditions de distribution Papel.'
))
on conflict (key) do nothing;

insert into public.product_ranges (id, slug, name, tagline, description, image_url, is_commercialized, status, sort_order) values
('6a1f3e1e-0001-4c3a-9a10-000000000001', 'mouchoirs', 'Mouchoirs Papel Doux',
  'La douceur au quotidien, à la maison comme en déplacement.',
  'Papel Doux est la première gamme de Papel Industries : des mouchoirs en paquet souple, faciles à ranger et à emporter, reconnaissables à leur emballage aux motifs tropicaux.',
  '/images/papel-doux-pack.jpg', true, 'published', 10),
('6a1f3e1e-0001-4c3a-9a10-000000000002', 'papier-toilette', 'Papier toilette', null, null, null, false, 'draft', 20),
('6a1f3e1e-0001-4c3a-9a10-000000000003', 'essuie-tout', 'Essuie-tout', null, null, null, false, 'draft', 30),
('6a1f3e1e-0001-4c3a-9a10-000000000004', 'serviettes-papier', 'Serviettes en papier', null, null, null, false, 'draft', 40),
('6a1f3e1e-0001-4c3a-9a10-000000000005', 'autres-produits-hygiene', 'Autres produits d''hygiène', null, null, null, false, 'draft', 50)
on conflict (id) do nothing;

insert into public.products (id, range_id, slug, name, short_description, description, images, format, dimensions, sheet_count, ply_count, packaging, recommended_uses, technical_info, availability, status, is_featured, seo_title, seo_description, sort_order) values
('7b2e4f2f-0002-4d4b-8b20-000000000001', '6a1f3e1e-0001-4c3a-9a10-000000000001', 'papel-doux-soft-pack', 'Papel Doux — Soft Pack',
  'Mouchoirs en paquet souple, au format pratique pour la maison, le bureau et la voiture.',
  E'Le paquet souple Papel Doux se range facilement et trouve sa place partout : sur la table du salon, dans un tiroir de bureau ou dans la boîte à gants.\n\nSon emballage aux motifs tropicaux, vert, rouge et jaune, le rend immédiatement reconnaissable en rayon. Un produit du quotidien, pensé pour toute la famille.',
  array['/images/papel-doux-pack.jpg', '/images/papel-doux-table.jpg', '/images/papel-doux-en-rayon.jpg'],
  'Paquet souple (soft pack)', null, '300 feuilles', null, null,
  array['À la maison', 'Au bureau', 'En voiture', 'Hôtels et restaurants'], null,
  'available', 'published', true,
  'Mouchoirs Papel Doux Soft Pack',
  'Mouchoirs Papel Doux en paquet souple : un format pratique pour la maison, le bureau et la voiture. Demandez un devis ou trouvez un distributeur.',
  10),
('7b2e4f2f-0002-4d4b-8b20-000000000002', '6a1f3e1e-0001-4c3a-9a10-000000000001', 'papel-doux-petit-format', 'Papel Doux — Petit format',
  'Fiche à compléter : format de poche.', null, '{}', null, null, null, null, null, '{}', null,
  'coming_soon', 'draft', false, null, null, 20)
on conflict (id) do nothing;

insert into public.news_posts (id, slug, title, excerpt, content, cover_image, category, status, published_at, seo_title, seo_description) values
('8c3f5a3a-0003-4e5c-9c30-000000000001', 'papel-doux-en-rayon', 'Papel Doux arrive en rayon',
  'Les mouchoirs Papel Doux sont désormais proposés en grande distribution.',
  E'Les mouchoirs Papel Doux, première gamme de Papel Industries, sont désormais présents dans les rayons de la grande distribution.\n\n## Une marque pensée pour le quotidien\n\nAvec son emballage aux motifs tropicaux, Papel Doux se repère facilement en magasin. Le paquet souple s''adapte à tous les usages : maison, bureau, voiture.\n\n## Vous êtes commerçant ou distributeur ?\n\nPapel Industries développe son réseau de distribution. Contactez notre équipe commerciale depuis la page Professionnels pour connaître les conditions.',
  '/images/papel-doux-en-rayon.jpg', 'lancements', 'published', '2026-11-05T09:00:00Z',
  'Papel Doux arrive en rayon', 'Les mouchoirs Papel Doux sont désormais proposés en grande distribution.')
on conflict (id) do nothing;

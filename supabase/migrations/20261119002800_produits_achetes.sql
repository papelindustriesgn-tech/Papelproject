-- =============================================================================
-- Produits achetés prêts à vendre (importés) à côté des produits fabriqués à l'usine.
-- Papel peut vendre des produits importés avant de fabriquer : un produit « acheté » se vend et se
-- livre depuis le stock (réception de marchandise), sans production ni alerte de production.
-- =============================================================================

alter table public.produits add column fabrique boolean not null default true;
comment on column public.produits.fabrique is
  'Vrai : fabriqué à l''usine (saisies de production, ordres de production). Faux : acheté prêt à vendre (stock alimenté par les réceptions).';

-- =============================================================================
-- Papel ERP — Nature de charge « investissement » (immobilisations : terrain, construction, machines)
-- Une facture d'investissement est une dette et passe en trésorerie, mais n'entre pas dans le résultat
-- de gestion (comme les achats stockés). Comptes SYSCOHADA de classe 2.
-- =============================================================================
alter table public.categories_charges drop constraint if exists categories_charges_nature_check;
alter table public.categories_charges
  add constraint categories_charges_nature_check check (nature in ('stock', 'variable', 'fixe', 'investissement'));

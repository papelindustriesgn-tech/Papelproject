-- Objectifs : le chiffre d'affaires du business plan est TTC (montant du fichier, tel quel) ;
-- il est comparé au chiffre d'affaires TTC réel des factures.
alter table public.objectifs_mensuels rename column ca_ht_gnf to ca_ttc_gnf;

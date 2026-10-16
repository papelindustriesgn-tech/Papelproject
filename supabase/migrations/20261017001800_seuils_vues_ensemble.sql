-- Derniers seuils des vues d'ensemble qui étaient écrits dans le code : désormais des paramètres (réglés par l'administrateur).
insert into public.parametres (cle, valeur, libelle, description, categorie, type_valeur, unite) values
  ('alerte_livraisons_reussies_min', '0.95', 'Alerte livraisons réussies', 'En dessous de cette part de livraisons réussies (livrées ÷ remises), l''indicateur passe « à surveiller »', 'logistique', 'pourcentage', null),
  ('alerte_disponibilite_min', '0.95', 'Alerte disponibilité des machines', 'En dessous de cette disponibilité, l''indicateur de maintenance passe « à surveiller »', 'maintenance', 'pourcentage', null),
  ('alerte_ecart_cout_achat', '0.05', 'Alerte écart de coût d''achat', 'Au-delà de cet écart entre coût réel et coût prévu d''un conteneur, l''indicateur passe « à surveiller »', 'achats', 'pourcentage', null)
on conflict (cle) do nothing;

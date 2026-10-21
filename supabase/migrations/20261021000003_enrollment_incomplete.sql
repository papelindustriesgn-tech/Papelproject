-- Statut « À compléter » : l'établissement renvoie la demande à l'étudiant avec un motif
-- (matricule erroné, information manquante). L'étudiant corrige et renvoie : la demande repasse « pending ».
-- Correspondance des statuts affichés : pending = Soumise · manual_review = À vérifier · incomplete = À compléter
-- · verified = Validée · rejected = Refusée · expired = Expirée (« brouillon » = étudiant déclaré sans demande).
alter type public.enrollment_status add value if not exists 'incomplete' after 'manual_review';

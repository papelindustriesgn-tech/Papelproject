-- Personnalisation de la carte par l'étudiant : modèle et thème de couleurs.
-- Les repères Uny (logo, identifiant, QR code, statut) restent toujours affichés ; une carte
-- publiée par l'université garde ses couleurs officielles (l'étudiant choisit alors le modèle).
alter table public.profiles
  add column card_layout text check (card_layout in ('uny', 'classic', 'band', 'minimal')),
  add column card_theme text check (card_theme in ('uny', 'ocean', 'forest', 'sunset', 'night', 'gold', 'rose', 'sky'));

grant update (card_layout, card_theme) on public.profiles to authenticated;

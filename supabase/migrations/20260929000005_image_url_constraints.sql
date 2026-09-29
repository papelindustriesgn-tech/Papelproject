-- Les URL d'images écrites par les utilisateurs doivent pointer vers le stockage Supabase
-- (dans leur propre dossier pour les avatars). Le rendu applique aussi une liste blanche d'hôtes.
alter table public.profiles
  add constraint profiles_avatar_url_storage
  check (avatar_url is null or avatar_url like '%/storage/v1/object/public/avatars/' || id::text || '/%');

alter table public.marketplace_images
  add constraint marketplace_images_url_allowed
  check (url ~ '^https?://[^/]+/storage/v1/object/public/marketplace/' or url ~ '^https://images\.unsplash\.com/');

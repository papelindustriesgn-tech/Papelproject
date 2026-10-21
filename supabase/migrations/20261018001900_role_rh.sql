-- Nouveau rôle « Ressources humaines » (dans sa propre migration : une valeur d'enum ajoutée
-- ne peut pas être utilisée dans la même transaction).
alter type public.role_code add value if not exists 'rh';

-- Fige le search_path de la fonction de trigger (recommandation du linter Supabase).
alter function public.set_updated_at() set search_path = '';

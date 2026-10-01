-- GoTrue enregistre app_metadata après l'insertion de l'utilisateur :
-- on synchronise aussi le drapeau « compte de test » lors des mises à jour.
create or replace function public.handle_user_app_metadata_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.profiles
     set is_test_account = coalesce((new.raw_app_meta_data->>'is_test_account')::boolean, false)
   where id = new.id;
  return new;
end;
$$;

create trigger on_auth_user_app_metadata_changed
  after update of raw_app_meta_data on auth.users
  for each row when (old.raw_app_meta_data is distinct from new.raw_app_meta_data)
  execute function public.handle_user_app_metadata_change();

-- Rattrapage des comptes existants
update public.profiles p
   set is_test_account = true
  from auth.users u
 where u.id = p.id and (u.raw_app_meta_data->>'is_test_account')::boolean is true;

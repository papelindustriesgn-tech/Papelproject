-- =============================================================================
-- Gestion des comptes sans clé secrète : création, mot de passe et blocage d'un compte
-- par des fonctions SQL réservées à l'administrateur et à la Direction.
-- L'application n'a donc plus besoin de SUPABASE_SECRET_KEY pour gérer les utilisateurs.
-- =============================================================================

-- Vrai si l'appelant peut gérer des comptes portant ces rôles (seule la Direction gère le rôle Direction).
create or replace function public.peut_gerer_comptes(p_roles public.role_code[] default '{}')
returns boolean language sql stable security definer set search_path = '' as $$
  select (public.a_role('admin') or public.a_role('direction'))
     and (not ('direction' = any (p_roles)) or public.a_role('direction'));
$$;

create or replace function public.creer_compte(
  p_identifiant text, p_nom text, p_prenom text, p_telephone text, p_mot_de_passe text, p_roles public.role_code[]
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  v_id uuid := gen_random_uuid();
  v_identifiant text := lower(trim(p_identifiant));
  v_email text;
begin
  if not public.peut_gerer_comptes(coalesce(p_roles, '{}')) then
    raise exception 'Droits insuffisants pour créer ce compte.' using errcode = '42501';
  end if;
  if v_identifiant !~ '^[a-z0-9._-]{3,40}$' then
    raise exception 'Identifiant invalide.' using errcode = '22023';
  end if;
  if length(coalesce(p_mot_de_passe, '')) < 8 then
    raise exception 'Le mot de passe doit contenir au moins 8 caractères.' using errcode = '22023';
  end if;
  if coalesce(array_length(p_roles, 1), 0) = 0 then
    raise exception 'Choisissez au moins un rôle.' using errcode = '22023';
  end if;
  v_email := v_identifiant || '@papel.local';
  if exists (select 1 from auth.users where email = v_email) then
    raise exception 'Cet identifiant est déjà utilisé.' using errcode = '23505';
  end if;

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  ) values (
    '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated', v_email,
    extensions.crypt(p_mot_de_passe, extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object('identifiant', v_identifiant, 'nom', trim(p_nom), 'prenom', coalesce(trim(p_prenom), ''),
                       'telephone', nullif(trim(coalesce(p_telephone, '')), '')),
    now(), now(), '', '', '', ''
  );
  insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
  values (gen_random_uuid(), v_id, v_id::text, 'email',
          jsonb_build_object('sub', v_id::text, 'email', v_email, 'email_verified', true), now(), now(), now());
  -- Le profil est créé par le trigger auth_utilisateur_cree.
  insert into public.utilisateur_roles (utilisateur_id, role) select v_id, r from unnest(p_roles) r;
  return v_id;
end $$;

create or replace function public.changer_mot_de_passe_compte(p_utilisateur uuid, p_mot_de_passe text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.peut_gerer_comptes(coalesce((select array_agg(role) from public.utilisateur_roles where utilisateur_id = p_utilisateur), '{}')) then
    raise exception 'Seule la Direction peut changer le mot de passe d''un membre de la Direction.' using errcode = '42501';
  end if;
  if length(coalesce(p_mot_de_passe, '')) < 8 then
    raise exception 'Le mot de passe doit contenir au moins 8 caractères.' using errcode = '22023';
  end if;
  update auth.users set encrypted_password = extensions.crypt(p_mot_de_passe, extensions.gen_salt('bf')), updated_at = now()
   where id = p_utilisateur;
  if not found then raise exception 'Compte introuvable.' using errcode = '22023'; end if;
end $$;

-- Désactivation : profil inactif (plus aucun droit) et connexion bloquée côté Auth.
create or replace function public.activer_compte(p_utilisateur uuid, p_actif boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.peut_gerer_comptes() then
    raise exception 'Droits insuffisants.' using errcode = '42501';
  end if;
  if p_utilisateur = auth.uid() and not p_actif then
    raise exception 'Vous ne pouvez pas désactiver votre propre compte.' using errcode = '22023';
  end if;
  update public.profils set actif = p_actif where id = p_utilisateur;
  update auth.users set banned_until = case when p_actif then null else now() + interval '100 years' end where id = p_utilisateur;
end $$;

revoke execute on function public.creer_compte(text, text, text, text, text, public.role_code[]) from public, anon;
revoke execute on function public.changer_mot_de_passe_compte(uuid, text) from public, anon;
revoke execute on function public.activer_compte(uuid, boolean) from public, anon;
revoke execute on function public.peut_gerer_comptes(public.role_code[]) from public, anon;
grant execute on function public.creer_compte(text, text, text, text, text, public.role_code[]) to authenticated;
grant execute on function public.changer_mot_de_passe_compte(uuid, text) to authenticated;
grant execute on function public.activer_compte(uuid, boolean) to authenticated;
grant execute on function public.peut_gerer_comptes(public.role_code[]) to authenticated;

-- Inscription publique interdite : le service Auth (rôle supabase_auth_admin) ne crée plus de compte lui-même.
-- Les comptes naissent uniquement par creer_compte (exécutée en tant que propriétaire) ou par les scripts d'initialisation.
create or replace function public.refuser_inscription_publique()
returns trigger language plpgsql set search_path = '' as $$
begin
  if current_user = 'supabase_auth_admin' then
    raise exception 'Inscription publique désactivée : les comptes sont créés par l''administrateur.' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger auth_inscription_publique before insert on auth.users
  for each row execute function public.refuser_inscription_publique();
revoke execute on function public.refuser_inscription_publique() from public, anon, authenticated;

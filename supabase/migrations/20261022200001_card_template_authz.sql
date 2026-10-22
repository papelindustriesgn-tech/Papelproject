-- =============================================================================
-- Correctif d'autorisation (non destructif) — publish_card_template.
-- Défaut : « if not (university_workspace_role(...) = 'admin' or is_admin()) » laissait passer un utilisateur
-- extérieur, car university_workspace_role renvoie NULL pour lui : NULL = 'admin' → NULL, NULL or false → NULL,
-- not NULL → NULL, et « if NULL » n'exécute pas le refus. Désormais : refus tant que l'autorisation n'est pas
-- strictement vraie. Règles inchangées : administrateur Uny, ou rôle « admin » de l'espace de l'établissement
-- concerné (en attente ou partenaire). Les autres fonctions ont été passées en revue : leurs contrôles reposent
-- sur des fonctions booléennes qui ne renvoient jamais NULL.
-- Durcissement complémentaire : TRUNCATE retiré aux rôles web (non exposé par l'API, ignoré par la RLS).
-- =============================================================================

create or replace function public.publish_card_template(
  p_university integer,
  p_layout text,
  p_fields text[],
  p_labels jsonb default '{}'::jsonb
)
returns public.university_card_templates
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_version integer;
  v_key text;
  r public.university_card_templates;
begin
  if auth.uid() is null
     or (coalesce(public.university_workspace_role(p_university), '') = 'admin' or public.is_admin()) is not true then
    raise exception 'Accès refusé' using errcode = '42501';
  end if;
  for v_key in select jsonb_object_keys(coalesce(p_labels, '{}'::jsonb)) loop
    if not (v_key = any (public.card_template_fields()))
       or jsonb_typeof(p_labels -> v_key) <> 'string'
       or char_length(p_labels ->> v_key) > 30 then
      raise exception 'Libellé invalide : %', v_key using errcode = 'P0001';
    end if;
  end loop;

  select coalesce(max(version), 0) + 1 into v_version
    from public.university_card_templates where university_id = p_university;
  update public.university_card_templates set is_active = false
   where university_id = p_university and is_active;
  insert into public.university_card_templates (university_id, version, layout, fields, labels, is_active, created_by)
  values (p_university, v_version, p_layout, coalesce(p_fields, '{}'), coalesce(p_labels, '{}'::jsonb), true, auth.uid())
  returning * into r;

  insert into public.audit_log (actor_id, university_id, action, details)
  values (auth.uid(), p_university, 'card_template.published', jsonb_build_object('version', v_version));
  return r;
end;
$$;
revoke all on function public.publish_card_template(integer, text, text[], jsonb) from public, anon;
grant execute on function public.publish_card_template(integer, text, text[], jsonb) to authenticated;

do $$
declare t record;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('revoke truncate on table public.%I from anon, authenticated', t.tablename);
  end loop;
end $$;

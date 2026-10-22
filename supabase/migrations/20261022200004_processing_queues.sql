-- =============================================================================
-- File de traitement des dossiers (lecture seule, administrateurs). Réutilise les seuils de suivi des alertes
-- (ops_run_checks) : comptes 72 h, justificatifs 72 h, BAC 72 h, établissements 7 j, inscriptions 7 j,
-- signalements 48 h, support 48 h. Aucune notification externe : les relances restent internes (alertes dédupliquées).
-- =============================================================================
create or replace function public.ops_queues()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if (coalesce(auth.role(), '') = 'service_role' or public.is_admin()) is not true then
    raise exception 'Accès refusé' using errcode = '42501';
  end if;
  return jsonb_build_array(
    (select jsonb_build_object('key', 'signups', 'label', 'Comptes étudiants à valider', 'link', '/admin/inscriptions',
       'next', 'Valider ou refuser le compte', 'threshold_hours', 72, 'count', count(*), 'oldest', min(created_at),
       'overdue', count(*) filter (where created_at < now() - interval '72 hours'))
       from public.profiles where role = 'student' and account_status = 'pending' and not is_test_account),
    (select jsonb_build_object('key', 'documents', 'label', 'Justificatifs à contrôler', 'link', '/admin/verifications',
       'next', 'Contrôler le document (4 contrôles, matricule, année)', 'threshold_hours', 72, 'count', count(*),
       'oldest', min(created_at), 'overdue', count(*) filter (where created_at < now() - interval '72 hours'))
       from public.student_verifications where status = 'pending'),
    (select jsonb_build_object('key', 'bac', 'label', 'BAC à vérifier', 'link', '/admin/verifications?type=bac',
       'next', 'Contrôler le numéro de PV dans les résultats officiels', 'threshold_hours', 72, 'count', count(*),
       'oldest', min(created_at), 'overdue', count(*) filter (where created_at < now() - interval '72 hours'))
       from public.bac_verifications where status in ('pending', 'manual_review')),
    (select jsonb_build_object('key', 'universities', 'label', 'Établissements : dossiers à contrôler', 'link', '/admin/universites?statut=pending',
       'next', 'Contrôler l''agrément, rappeler le standard officiel, approuver', 'threshold_hours', 168, 'count', count(*),
       'oldest', min(v.submitted_at), 'overdue', count(*) filter (where v.submitted_at < now() - interval '7 days'))
       from public.university_vetting v join public.universities u on u.id = v.university_id
      where v.submitted_at is not null and v.decided_at is null and u.partner_status = 'pending'),
    (select jsonb_build_object('key', 'universities_waiting', 'label', 'Établissements sans dossier déposé', 'link', '/admin/universites?statut=pending',
       'next', 'Relancer l''établissement pour son dossier', 'threshold_hours', 168, 'count', count(*),
       'oldest', min(u.created_at), 'overdue', count(*) filter (where u.created_at < now() - interval '7 days'))
       from public.universities u
      where u.partner_status = 'pending'
        and not exists (select 1 from public.university_vetting v where v.university_id = u.id and v.submitted_at is not null)),
    (select jsonb_build_object('key', 'enrollments', 'label', 'Inscriptions en attente chez les établissements', 'link', '/admin/universites',
       'next', 'Relancer l''établissement concerné', 'threshold_hours', 168, 'count', count(*), 'oldest', min(created_at),
       'overdue', count(*) filter (where created_at < now() - interval '7 days'),
       'incomplete', (select count(*) from public.student_enrollments where status = 'incomplete'))
       from public.student_enrollments where status in ('pending', 'manual_review')),
    (select jsonb_build_object('key', 'reports', 'label', 'Signalements marketplace', 'link', '/admin/signalements',
       'next', 'Classer ou retirer l''annonce', 'threshold_hours', 48, 'count', count(*), 'oldest', min(created_at),
       'overdue', count(*) filter (where created_at < now() - interval '48 hours'))
       from public.content_reports where status = 'open'),
    (select jsonb_build_object('key', 'support', 'label', 'Support : demandes transférées', 'link', '/admin/ia',
       'next', 'Répondre à l''utilisateur', 'threshold_hours', 48, 'count', count(*), 'oldest', min(updated_at),
       'overdue', count(*) filter (where updated_at < now() - interval '48 hours'))
       from public.ai_conversations where status = 'handed_off')
  );
end;
$$;
revoke all on function public.ops_queues() from public, anon;
grant execute on function public.ops_queues() to authenticated, service_role;

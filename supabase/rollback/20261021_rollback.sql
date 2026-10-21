-- =============================================================================
-- Retour arrière des migrations 20261021000001 → 20261021000006 (à n'utiliser qu'en cas de problème grave).
-- En général inutile : l'ancien code fonctionne avec la nouvelle base (membres existants = admin / manager).
-- Ne supprime aucune donnée : colonnes « role », tables de signalement et de blocage, statut « incomplete »
-- sont conservés (les demandes « incomplete » repassent en « pending »).
-- Exécuter dans le SQL Editor de Supabase, en une seule fois.
-- =============================================================================

-- 1. Fonctions enveloppes → implémentations d'origine
drop function if exists public.set_enrollment_status(uuid, public.enrollment_status, public.verification_method, text, jsonb, text);
alter function public.set_enrollment_status_impl(uuid, public.enrollment_status, public.verification_method, text, jsonb, text)
  rename to set_enrollment_status;
grant execute on function public.set_enrollment_status(uuid, public.enrollment_status, public.verification_method, text, jsonb, text) to authenticated;

drop function if exists public.university_enrollments(integer, public.enrollment_status[], text, integer, integer);
alter function public.university_enrollments_impl(integer, public.enrollment_status[], text, integer, integer)
  rename to university_enrollments;
grant execute on function public.university_enrollments(integer, public.enrollment_status[], text, integer, integer) to authenticated;

drop function if exists public.university_declared_students(integer);
alter function public.university_declared_students_impl(integer) rename to university_declared_students;
grant execute on function public.university_declared_students(integer) to authenticated;

drop function if exists public.university_send_announcement(integer, text, text, text, text, text);
alter function public.university_send_announcement_impl(integer, text, text, text, text, text) rename to university_send_announcement;
grant execute on function public.university_send_announcement(integer, text, text, text, text, text) to authenticated;

drop function if exists public.university_invite_declared(integer);
alter function public.university_invite_declared_impl(integer) rename to university_invite_declared;
grant execute on function public.university_invite_declared(integer) to authenticated;

drop function if exists public.partner_gift_loyalty(uuid, uuid, text);
alter function public.partner_gift_loyalty_impl(uuid, uuid, text) rename to partner_gift_loyalty;
grant execute on function public.partner_gift_loyalty(uuid, uuid, text) to authenticated;

drop function if exists public.partner_top_customers(uuid, integer);
alter function public.partner_top_customers_impl(uuid, integer) rename to partner_top_customers;
grant execute on function public.partner_top_customers(uuid, integer) to authenticated;

drop function if exists public.admin_stats();
alter function public.admin_stats_impl() rename to admin_stats;
grant execute on function public.admin_stats() to authenticated;

-- 2. Membre d'établissement : sémantique d'origine (en attente ou partenaire)
create or replace function public.is_university_member(p_university integer)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_university is not null and exists (
    select 1 from public.university_members m
      join public.universities u on u.id = m.university_id
     where m.university_id = p_university and m.user_id = auth.uid()
       and u.partner_status in ('pending', 'partner')
  );
$$;

-- 3. Règles d'accès d'origine
drop policy if exists "enrollments_read" on public.student_enrollments;
create policy "enrollments_read" on public.student_enrollments for select to authenticated
  using (user_id = (select auth.uid()) or public.is_university_member(university_id) or public.is_admin());
drop policy if exists "audit_read" on public.audit_log;
create policy "audit_read" on public.audit_log for select to authenticated
  using (public.is_admin() or public.is_university_member(university_id));
drop policy if exists "universities_member_update" on public.universities;
create policy "universities_member_update" on public.universities for update to authenticated
  using (public.is_university_member(id)) with check (public.is_university_member(id));
drop policy if exists "branding_write" on public.university_branding;
create policy "branding_write" on public.university_branding for all to authenticated
  using (public.is_university_member(university_id) or public.is_admin())
  with check (public.is_university_member(university_id) or public.is_admin());
drop policy if exists "integrations_read" on public.university_integrations;
create policy "integrations_read" on public.university_integrations for select to authenticated
  using (public.is_university_member(university_id) or public.is_admin());
drop policy if exists "university_members_read" on public.university_members;
create policy "university_members_read" on public.university_members for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());

drop policy if exists "partners_member_update" on public.partners;
create policy "partners_member_update" on public.partners for update to authenticated
  using (public.is_partner_member(id)) with check (public.is_partner_member(id));
do $$
declare
  t text;
begin
  foreach t in array array['deals', 'jobs', 'housing'] loop
    execute format('drop policy if exists "%1$s_member_insert" on public.%1$s', t);
    execute format('drop policy if exists "%1$s_member_update" on public.%1$s', t);
    execute format('drop policy if exists "%1$s_member_delete" on public.%1$s', t);
    execute format('create policy "%1$s_member_insert" on public.%1$s for insert to authenticated
                      with check (public.is_partner_member(partner_id))', t);
    execute format('create policy "%1$s_member_update" on public.%1$s for update to authenticated
                      using (public.is_partner_member(partner_id)) with check (public.is_partner_member(partner_id))', t);
    execute format('create policy "%1$s_member_delete" on public.%1$s for delete to authenticated
                      using (public.is_partner_member(partner_id))', t);
  end loop;
end $$;
drop policy if exists "market_member_update" on public.marketplace_items;
create policy "market_member_update" on public.marketplace_items for update to authenticated
  using (public.is_partner_member(partner_id)) with check (public.is_partner_member(partner_id));
drop policy if exists "market_member_delete" on public.marketplace_items;
create policy "market_member_delete" on public.marketplace_items for delete to authenticated
  using (public.is_partner_member(partner_id));
drop policy if exists "loyalty_programs_insert" on public.loyalty_programs;
create policy "loyalty_programs_insert" on public.loyalty_programs for insert to authenticated
  with check (public.is_partner_member(partner_id) or public.is_admin());
drop policy if exists "loyalty_programs_update" on public.loyalty_programs;
create policy "loyalty_programs_update" on public.loyalty_programs for update to authenticated
  using (public.is_partner_member(partner_id) or public.is_admin())
  with check (public.is_partner_member(partner_id) or public.is_admin());

-- 4. Demandes « À compléter » : remises en attente (l'ancien code ne connaît pas ce statut)
update public.student_enrollments set status = 'pending' where status = 'incomplete';

-- Les fonctions claim_promo_code / partner_redeem_promo_code / partner_validate_card renforcées sont
-- compatibles avec l'ancien code et sont volontairement conservées (sécurité).

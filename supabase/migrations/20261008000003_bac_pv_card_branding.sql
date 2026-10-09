-- =============================================================================
-- BAC : vérification par le numéro de PV (procès-verbal) du candidat, sans document.
-- Le numéro complet n'est conservé que le temps du contrôle, puis effacé à la décision
-- (reste : numéro masqué + empreinte HMAC pour détecter les doublons).
-- Carte : le logo de l'université s'affiche sur la page de vérification dès qu'une
-- carte personnalisée a été publiée (et que l'établissement n'est pas suspendu).
-- =============================================================================

alter table public.bac_verifications
  add column candidate_number text check (candidate_number is null or char_length(candidate_number) between 4 and 30);

create or replace function public.verify_card_details(p_token text)
returns table (
  uny_id text, first_name text, last_name text, avatar_url text, university text, field_of_study text,
  academic_year text, verification_status public.verification_status, card_status public.card_status,
  expires_at date, university_logo text, university_color text
)
language sql
stable
security definer
set search_path = ''
as $$
  select c.uny_id, p.first_name, p.last_name, p.avatar_url,
         coalesce(case when t.id is not null then b.official_name end, u.name, p.university_other),
         coalesce(e.program, p.field_of_study),
         c.academic_year, p.verification_status, c.status, c.expires_at,
         case when t.id is not null and u.partner_status <> 'suspended' then b.logo_url end,
         case when t.id is not null and u.partner_status <> 'suspended' then b.primary_color end
    from public.student_cards c
    join public.profiles p on p.id = c.user_id
    left join public.universities u on u.id = p.university_id
    left join public.university_branding b on b.university_id = u.id
    left join public.university_card_templates t on t.university_id = u.id and t.is_active
    left join public.student_enrollments e on e.id = c.enrollment_id
   where c.qr_token = p_token
   limit 1;
$$;
grant execute on function public.verify_card_details(text) to anon, authenticated;

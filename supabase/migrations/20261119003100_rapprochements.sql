-- Vérification de la caisse et de la banque (« rapprochement ») : la comptabilité compte l'argent réel
-- (caisse) ou lit le relevé (banque, mobile money) à une date, l'ERP calcule son propre solde à la même date,
-- l'écart est gardé. Le tableau de bord du PDG affiche la date de la dernière vérification de chaque compte.
-- Journal inaltérable : on ajoute une nouvelle vérification, on ne modifie jamais une ancienne.

create table public.rapprochements_tresorerie (
  id           uuid primary key default gen_random_uuid(),
  compte_id    uuid not null references public.comptes_tresorerie (id),
  date_releve  date not null,
  -- Montants dans la devise du compte (GNF en unités, USD en centimes), comme mouvements_tresorerie.montant.
  solde_releve bigint not null,
  solde_erp    bigint not null,
  ecart        bigint generated always as (solde_releve - solde_erp) stored,
  note         text not null default '' check (length(note) <= 300),
  fait_par     uuid references public.profils (id) default auth.uid(),
  created_at   timestamptz not null default now()
);
create index rapprochements_compte_idx on public.rapprochements_tresorerie (compte_id, date_releve desc, created_at desc);
comment on table public.rapprochements_tresorerie is 'Vérifications des soldes réels de caisse / banque comparés au solde de l''ERP à la même date (ajout seul, par enregistrer_rapprochement).';

alter table public.rapprochements_tresorerie enable row level security;
-- Lecture : comptabilité (et Direction, incluse dans a_un_role). Aucune écriture directe : fonction seulement.
create policy rapprochements_lecture on public.rapprochements_tresorerie for select to authenticated using (public.a_un_role('finance'));
select public.activer_audit('public.rapprochements_tresorerie');

/** Solde de l'ERP d'un compte à la fin d'une date (devise du compte). */
create or replace function public.solde_compte_au(p_compte uuid, p_date date)
returns bigint language sql stable security invoker set search_path = public as $$
  select (c.solde_initial + coalesce((
           select sum(case when m.sens = 'entree' then m.montant else -m.montant end)
             from public.mouvements_tresorerie m
            where m.compte_id = c.id and m.date_operation >= c.date_solde_initial and m.date_operation <= p_date), 0))::bigint
    from public.comptes_tresorerie c where c.id = p_compte;
$$;

create or replace function public.enregistrer_rapprochement(p_compte uuid, p_date date, p_solde_releve bigint, p_note text default '')
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
  v_ouverture date;
begin
  if not public.est_actif() or not public.a_un_role('finance') then
    raise exception 'Seule la comptabilité vérifie la caisse et la banque.' using errcode = '42501';
  end if;
  select date_solde_initial into v_ouverture from public.comptes_tresorerie where id = p_compte and actif;
  if not found then
    raise exception 'Compte introuvable ou archivé.' using errcode = '22023';
  end if;
  if p_date is null or p_date > public.aujourdhui_conakry() then
    raise exception 'La date de vérification ne peut pas être dans le futur.' using errcode = '22023';
  end if;
  if p_date < v_ouverture then
    raise exception 'La date est avant l''ouverture du compte dans l''ERP (%).', to_char(v_ouverture, 'DD/MM/YYYY') using errcode = '22023';
  end if;
  if p_solde_releve is null then
    raise exception 'Indiquez le solde réel compté ou lu sur le relevé.' using errcode = '22023';
  end if;
  insert into public.rapprochements_tresorerie (compte_id, date_releve, solde_releve, solde_erp, note, fait_par)
  values (p_compte, p_date, p_solde_releve, public.solde_compte_au(p_compte, p_date), coalesce(trim(p_note), ''), auth.uid())
  returning id into v_id;
  return v_id;
end $$;
revoke all on function public.enregistrer_rapprochement(uuid, date, bigint, text) from public, anon;
grant execute on function public.enregistrer_rapprochement(uuid, date, bigint, text) to authenticated;

-- Dernière vérification de chaque compte actif (null si jamais vérifié).
create or replace view public.derniers_rapprochements with (security_invoker = true) as
select c.id as compte_id, c.libelle, c.type_compte, c.devise, r.date_releve, r.solde_releve, r.solde_erp, r.ecart, r.created_at
  from public.comptes_tresorerie c
  left join lateral (
    select * from public.rapprochements_tresorerie r where r.compte_id = c.id order by r.date_releve desc, r.created_at desc limit 1
  ) r on true
 where c.actif;

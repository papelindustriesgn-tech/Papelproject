-- =============================================================================
-- Prix étudiant calculé automatiquement (non destructif).
--   Le commerçant saisit le prix normal et la réduction (pourcentage ou montant) : la base calcule le prix
--   étudiant et le libellé affiché. Le prix étudiant n'est plus saisi à la main quand une réduction est donnée.
--   Arrondi à la centaine de GNF inférieure (en faveur de l'étudiant).
--   Offres existantes : la réduction est reprise à l'identique sous forme de montant (prix inchangés).
-- =============================================================================

alter table public.deals
  add column if not exists discount_kind text check (discount_kind is null or discount_kind in ('percent', 'amount')),
  add column if not exists discount_value bigint check (discount_value is null or discount_value > 0);

alter table public.deals add constraint deals_discount_pair
  check ((discount_kind is null) = (discount_value is null)) not valid;
alter table public.deals validate constraint deals_discount_pair;
alter table public.deals add constraint deals_discount_percent_range
  check (discount_kind is distinct from 'percent' or discount_value between 1 and 90) not valid;
alter table public.deals validate constraint deals_discount_percent_range;

create or replace function public.deal_student_price(p_price bigint, p_kind text, p_value bigint)
returns bigint
language sql
immutable
set search_path = ''
as $$
  select case
    when p_price is null or p_kind is null or p_value is null then null
    when p_kind = 'percent' then floor(p_price * (100 - p_value) / 100.0 / 100) * 100
    else greatest(p_price - p_value, 0)
  end::bigint;
$$;

create or replace function public.deal_discount_label(p_kind text, p_value bigint)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when p_kind = 'percent' then '-' || p_value || ' %'
    when p_kind = 'amount' then '-' || replace(to_char(p_value, 'FM999G999G999'), ',', ' ') || ' GNF'
  end;
$$;

-- Calcul imposé par la base : le prix étudiant et le libellé ne peuvent pas contredire la réduction saisie
create or replace function public.deals_compute_student_price()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.discount_kind is not null then
    if new.price_gnf is null then
      raise exception 'Indique le prix normal pour calculer le prix étudiant.' using errcode = 'P0001';
    end if;
    if new.discount_kind = 'amount' and new.discount_value >= new.price_gnf then
      raise exception 'La réduction doit être inférieure au prix normal.' using errcode = 'P0001';
    end if;
    new.promo_price_gnf := public.deal_student_price(new.price_gnf, new.discount_kind, new.discount_value);
    new.discount_label := public.deal_discount_label(new.discount_kind, new.discount_value);
  end if;
  return new;
end;
$$;

drop trigger if exists deals_student_price on public.deals;
create trigger deals_student_price
  before insert or update of price_gnf, discount_kind, discount_value, promo_price_gnf, discount_label on public.deals
  for each row execute function public.deals_compute_student_price();

-- Reprise des offres existantes, sans changer le prix étudiant : pourcentage s'il retombe exactement sur le même
-- prix, sinon montant (différence exacte)
update public.deals d
   set discount_kind = case when x.pct_ok then 'percent' else 'amount' end,
       discount_value = case when x.pct_ok then x.pct else d.price_gnf - d.promo_price_gnf end
  from (select id, pct, pct between 1 and 90 and public.deal_student_price(price_gnf, 'percent', pct) = promo_price_gnf as pct_ok
          from (select id, price_gnf, promo_price_gnf,
                       round(100.0 * (price_gnf - promo_price_gnf) / price_gnf)::bigint as pct
                  from public.deals
                 where price_gnf is not null and promo_price_gnf is not null and promo_price_gnf < price_gnf) y) x
 where d.id = x.id and d.discount_kind is null;

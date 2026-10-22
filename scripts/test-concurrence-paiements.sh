#!/usr/bin/env bash
# Test de concurrence des encaissements (base LOCALE uniquement, jamais la production) :
# deux sessions « finance » enregistrent en même temps 60 % du TTC d'une même facture.
# Attendu : une seule réussit, l'autre est refusée (reste dû dépassé) ; un seul mouvement de trésorerie.
# Usage : npm run db:start && bash scripts/test-concurrence-paiements.sh   (puis npm run db:reset pour repartir propre)
set -euo pipefail

CONTENEUR="${CONTENEUR:-supabase_db_papel-erp}"
psql_local() { docker exec -i "$CONTENEUR" psql -U postgres -v ON_ERROR_STOP=1 -q -t -A "$@"; }

if ! psql_local -c "select 1" >/dev/null; then echo "Base locale introuvable ($CONTENEUR)." >&2; exit 1; fi

FACTURE=$(psql_local <<'SQL'
do $$
declare
  v_finance uuid := (select id from public.profils where identifiant = 'finance');
  v_client uuid := gen_random_uuid();
  v_facture uuid := gen_random_uuid();
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', v_finance, 'role', 'authenticated')::text, true);
  insert into public.clients (id, nom, type_client_id, condition_paiement)
  values (v_client, 'Concurrence ' || left(v_client::text, 8), (select id from public.types_clients order by ordre limit 1), 'comptant');
  insert into public.pieces_vente (id, type_piece, client_id) values (v_facture, 'facture', v_client);
  insert into public.lignes_piece (piece_id, conditionnement_id, quantite_colis, paquets_vrac, paquets, prix_paquet_gnf, montant_ht_gnf)
  values (v_facture, (select id from public.conditionnements order by paquets_par_colis desc limit 1), 1, 0, 1, null, 0);
  perform public.valider_piece(v_facture);
  perform set_config('papel.facture_test', v_facture::text, false);
end $$;
select current_setting('papel.facture_test');
SQL
)
TTC=$(psql_local -c "select total_ttc_gnf from public.pieces_vente where id = '$FACTURE'")
MONTANT=$(( TTC * 60 / 100 ))
echo "Facture $FACTURE : TTC $TTC GNF, deux paiements simultanés de $MONTANT GNF"

payer() { # $1 = délai avant validation de la transaction (secondes)
  psql_local <<SQL 2>&1 | grep -E "OK|ERROR" | sed "s/^/  session $2 : /"
begin;
select set_config('role', 'authenticated', true),
       set_config('request.jwt.claims', json_build_object('sub', (select id from public.profils where identifiant = 'finance'), 'role', 'authenticated')::text, true);
select 'OK ' || public.enregistrer_paiement('$FACTURE', $MONTANT, (select id from public.modes_paiement where actif order by ordre limit 1));
select pg_sleep($1);
commit;
SQL
}

payer 2 A &
sleep 0.5
payer 0 B &
wait

NB=$(psql_local -c "select count(*) from public.paiements where facture_id = '$FACTURE'")
TRESO=$(psql_local -c "select count(*) from public.mouvements_tresorerie where paiement_id in (select id from public.paiements where facture_id = '$FACTURE')")
PAYE=$(psql_local -c "select coalesce(sum(montant_gnf), 0) from public.paiements where facture_id = '$FACTURE'")
echo "Paiements enregistrés : $NB ; mouvements de trésorerie : $TRESO ; total encaissé : $PAYE / $TTC GNF"
if [ "$NB" = "1" ] && [ "$TRESO" = "1" ] && [ "$PAYE" -le "$TTC" ]; then
  echo "RÉUSSI : les paiements concurrents ne dépassent pas le reste dû."
else
  echo "ÉCHEC : dépassement du reste dû par des paiements concurrents." >&2
  exit 1
fi

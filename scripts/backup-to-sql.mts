/**
 * Transforme une sauvegarde Uny (uny-AAAA-MM-JJ-….json.gz, téléchargée depuis Admin → Sauvegardes)
 * en script SQL de restauration à exécuter dans le SQL Editor de Supabase (ou avec psql).
 *
 *   npx tsx scripts/backup-to-sql.mts uny-2026-10-15-02-15-00.json.gz > restauration.sql
 *
 * ⚠️ Le script REMPLACE toutes les données (tables publiques + comptes) par celles de la sauvegarde.
 * La structure (migrations) doit déjà être en place : `npx supabase db push` sur un nouveau projet.
 */
import { readFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { randomBytes } from "node:crypto";

const file = process.argv[2];
if (!file) {
  console.error("Usage : npx tsx scripts/backup-to-sql.mts <sauvegarde.json.gz> > restauration.sql");
  process.exit(1);
}
const raw = readFileSync(file);
const json = (file.endsWith(".gz") ? gunzipSync(raw) : raw).toString("utf8");
const doc = JSON.parse(json) as { format?: string; created_at?: string; tables?: Record<string, unknown[]> };
if (doc.format !== "uny-backup-1" || !doc.tables) {
  console.error("Ce fichier n'est pas une sauvegarde Uny.");
  process.exit(1);
}
let tag = "bk";
while (json.includes(`$${tag}$`)) tag = `bk${randomBytes(4).toString("hex")}`;
const counts = Object.entries(doc.tables)
  .map(([t, rows]) => `--   ${t} : ${rows.length}`)
  .join("\n");

process.stdout.write(`-- Restauration Uny — sauvegarde du ${doc.created_at}
-- Lignes par table :
${counts}
begin;
set local session_replication_role = replica; -- pas de déclencheurs ni de contrôles d'ordre pendant l'import

create temp table _uny_backup (doc jsonb) on commit drop;
insert into _uny_backup values ($${tag}$${json}$${tag}$);

do $restore$
declare
  v_doc jsonb := (select doc -> 'tables' from _uny_backup);
  v_all text;
  t record;
  v_cols text;
  v_n bigint;
  s record;
begin
  -- 1. Vider les données actuelles
  select string_agg(format('%I.%I', schemaname, tablename), ', ') into v_all from pg_tables where schemaname = 'public';
  execute 'truncate ' || v_all || ' restart identity cascade';
  delete from auth.identities;
  delete from auth.users;

  -- 2. Réinsérer (comptes d'abord), colonnes générées exclues
  for t in
    select key, split_part(key, '.', 1) as sch, split_part(key, '.', 2) as tbl, value as rows
      from jsonb_each(v_doc)
     order by (key = 'auth.users') desc, (key = 'auth.identities') desc, key
  loop
    if to_regclass(format('%I.%I', t.sch, t.tbl)) is null then
      raise notice 'Table absente, ignorée : %', t.key;
      continue;
    end if;
    select string_agg(quote_ident(column_name), ', ' order by ordinal_position) into v_cols
      from information_schema.columns
     where table_schema = t.sch and table_name = t.tbl and is_generated = 'NEVER';
    execute format('insert into %I.%I (%s) overriding system value select %s from jsonb_populate_recordset(null::%I.%I, $1)',
                   t.sch, t.tbl, v_cols, v_cols, t.sch, t.tbl)
      using t.rows;
    get diagnostics v_n = row_count;
    raise notice '% : % lignes', t.key, v_n;
  end loop;

  -- 3. Recaler les compteurs (identifiants auto-incrémentés)
  for s in
    select n.nspname as sch, c.relname as tbl, a.attname as col, pg_get_serial_sequence(format('%I.%I', n.nspname, c.relname), a.attname) as seq
      from pg_attribute a join pg_class c on c.oid = a.attrelid join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relkind = 'r' and a.attnum > 0 and not a.attisdropped
       and pg_get_serial_sequence(format('%I.%I', n.nspname, c.relname), a.attname) is not null
  loop
    execute format('select setval(%L, greatest(coalesce((select max(%I) from %I.%I), 0), 1))', s.seq, s.col, s.sch, s.tbl);
  end loop;
end
$restore$;

commit;
`);

# Sauvegarde et restauration de la base Uny

Chaque nuit à 02:30 (heure de Conakry), GitHub Actions exporte la base Supabase, la **chiffre** (AES-256)
et la conserve **90 jours** (onglet _Actions_ → _Sauvegarde base de données_ → artefact `uny-sauvegarde-AAAA-MM-JJ`).
Cette copie est indépendante de Supabase : elle reste disponible même si le projet Supabase est perdu.

Contenu : comptes (auth), profils, cartes, offres, codes promo, questionnaires, etc. (schémas `public`, `auth`,
`supabase_migrations`). Les **fichiers** (photos, justificatifs) restent dans Supabase Storage.

## 1. Mise en place (une seule fois, 5 minutes)

1. **Chaîne de connexion** : Supabase → projet _uny_ → bouton **Connect** (en haut) → onglet _Connection string_ →
   **Session pooler** → copier l'URL `postgresql://postgres.eahujjyeupplllldsuoc:[YOUR-PASSWORD]@aws-…pooler.supabase.com:5432/postgres`
   et remplacer `[YOUR-PASSWORD]` par le mot de passe de la base (Settings → Database → _Reset database password_ si oublié).
2. **Phrase secrète** : choisir une phrase longue (ex. 5 mots au hasard) et **la noter hors ligne** (papier, coffre).
   Sans elle, les sauvegardes sont illisibles — par vous comme par un voleur.
3. GitHub → dépôt _Papelproject_ → **Settings → Secrets and variables → Actions → New repository secret** :
   - `SUPABASE_DB_URL` = la chaîne de l'étape 1
   - `BACKUP_PASSPHRASE` = la phrase de l'étape 2
4. Onglet **Actions** → _Sauvegarde base de données_ → **Run workflow** pour un premier essai. Il doit finir en vert ✅.

> Le workflow tourne depuis la branche par défaut du dépôt (`main`) : il démarre automatiquement chaque nuit
> une fois la PR fusionnée.

## 2. Restaurer

Besoin : un ordinateur avec PostgreSQL 17 (`pg_restore`, `psql`), `gpg`, Node.js, ce dépôt et la phrase secrète.
Procédure testée de bout en bout (comptes, profils, codes promo, notifications retrouvés ; connexion des comptes restaurés).

1. Télécharger l'artefact voulu (Actions → exécution du jour → _Artifacts_), le dézipper, puis déchiffrer :
   ```bash
   gpg --decrypt --output uny.dump uny-AAAA-MM-JJ.dump.gpg
   ```
2. **Créer la structure** dans le projet de destination (nouveau projet Supabase en cas de perte totale) :
   ```bash
   npx supabase link --project-ref <ref-du-projet>
   npx supabase db push
   ```
3. **Vider les données de démonstration** créées par les migrations (SQL Editor du projet de destination) :
   ```sql
   do $$
   declare t text;
   begin
     select string_agg(format('%I.%I', schemaname, tablename), ', ') into t from pg_tables where schemaname = 'public';
     execute 'truncate ' || t || ' restart identity cascade';
   end $$;
   truncate auth.users cascade;
   ```
4. **Importer les données** (comptes puis contenu), en une seule transaction :
   ```bash
   pg_restore --data-only --no-owner --schema=auth --table=users --table=identities -f data-auth.sql uny.dump
   pg_restore --data-only --no-owner --schema=public -f data-public.sql uny.dump
   psql "<chaîne Session pooler du projet>" -v ON_ERROR_STOP=1 --single-transaction \
     -c "set session_replication_role = replica" -f data-auth.sql -f data-public.sql
   ```
   (`session_replication_role = replica` évite que les déclencheurs recréent des profils pendant l'import.)
5. Si c'est un nouveau projet : mettre à jour `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` et
   `SUPABASE_SERVICE_ROLE_KEY` dans Vercel, recréer les tâches planifiées (elles sont dans les migrations) et
   reporter les réglages Auth (Site URL, redirections, SMTP).

**Récupérer seulement quelques lignes** (ex. un compte supprimé par erreur) : restaurer dans un projet de test
avec la procédure ci-dessus, retrouver les lignes, puis les réinsérer à la main. Ne jamais restaurer par-dessus
la base de production sans avoir fait une sauvegarde juste avant (Actions → _Run workflow_).

## 3. Bonnes pratiques

- Tester une restauration **une fois par trimestre** dans un projet de test.
- Le plan **Supabase Pro** ajoute des sauvegardes quotidiennes gérées par Supabase (7 jours) et, en option, la
  restauration à la minute près (PITR). Les deux systèmes se complètent.
- Si la phrase secrète change, les anciennes sauvegardes restent lisibles uniquement avec l'ancienne phrase.

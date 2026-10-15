# Sauvegarde et restauration de la base Uny

## Ce qui est en place (aucun réglage nécessaire)

- **Chaque nuit à 02:15** (heure de Conakry), une sauvegarde complète de la base est créée automatiquement
  (Vercel Cron → `/api/cron/sauvegarde`) et rangée dans un espace privé (bucket Supabase `backups`, accessible
  uniquement par le serveur). Les **30 dernières** sont conservées.
- Contenu : comptes (auth.users, auth.identities), profils, cartes, offres, codes promo, notifications,
  questionnaires, universités… Les **photos et justificatifs** restent dans le stockage Supabase.
- **Admin → Sauvegardes** : voir les sauvegardes, en créer une tout de suite (« Sauvegarder maintenant »),
  et **télécharger** un fichier `uny-AAAA-MM-JJ-….json.gz`.

### Copie indépendante (recommandé, 1 minute par semaine)

Une fois par semaine : Admin → Sauvegardes → **Télécharger** la plus récente, et la garder sur un ordinateur ou
dans Google Drive. C'est la copie qui protège même si le projet Supabase disparaît. Le fichier contient des
données personnelles (et les mots de passe chiffrés) : ne pas le partager.

## Restaurer

Procédure testée : base abîmée (comptes et notifications supprimés, profils modifiés) → restauration →
données identiques, connexions et nouvelles inscriptions fonctionnelles.

1. Récupérer le fichier de sauvegarde (Admin → Sauvegardes, ou la copie gardée sur l'ordinateur).
2. Générer le script de restauration :
   ```bash
   npx tsx scripts/backup-to-sql.mts uny-AAAA-MM-JJ-HH-MM-SS.json.gz > restauration.sql
   ```
3. **Si le projet Supabase a été perdu** : créer un nouveau projet, puis y appliquer la structure :
   ```bash
   npx supabase link --project-ref <ref-du-nouveau-projet>
   npx supabase db push
   ```
   et mettre à jour `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` dans
   Vercel, ainsi que les réglages Auth (Site URL, redirections).
4. Exécuter `restauration.sql` dans le **SQL Editor** de Supabase (ou `psql "<chaîne de connexion>" -f restauration.sql`).
   ⚠️ Le script **remplace toutes les données** par celles de la sauvegarde : en cas de doute, cliquer d'abord sur
   « Sauvegarder maintenant » pour garder l'état actuel.

**Récupérer seulement quelques lignes** (ex. un compte supprimé par erreur) : ouvrir le fichier
(`gunzip uny-….json.gz`), retrouver les lignes dans `tables` → `"public.profiles"` etc., et les réinsérer.

## Bonnes pratiques

- Tester une restauration une fois par trimestre sur un projet de test.
- Le plan **Supabase Pro** ajoute ses propres sauvegardes quotidiennes et la restauration à la minute près (PITR).

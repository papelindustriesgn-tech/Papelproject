# Mise en production — Uny

Objectif : Uny en ligne sur **https://unyafrica.com** (Vercel + Supabase), sans dépendre d'aucun outil tiers de prototypage.
Durée estimée : 45 min à 1 h.

---

## 1. Supabase (base de données, authentification, fichiers)

1. Crée un projet sur https://supabase.com → région la plus proche de tes utilisateurs (ex. *West EU (London/Paris)* ou *Frankfurt*). Plan **Pro** recommandé pour le lancement (sauvegardes quotidiennes, pas de mise en pause).
2. Relie le projet et pousse le schéma :

   ```bash
   npx supabase login
   npx supabase link --project-ref <ref-du-projet>
   npx supabase db push          # applique supabase/migrations (schéma, RLS, stockage, référentiels, contenu démo)
   ```

3. **Authentication → URL Configuration**
   - *Site URL* : `https://unyafrica.com`
   - *Redirect URLs* : `https://unyafrica.com/**`, `https://www.unyafrica.com/**`, `https://*-<ton-equipe>.vercel.app/**` (prévisualisations)
4. **Authentication → Providers → Email** : activer *Confirm email* ; longueur minimale du mot de passe **8** ; exigence *lettres et chiffres*.
5. **Authentication → Email Templates** : copier le contenu de `supabase/templates/confirmation.html`, `recovery.html` et `email_change.html` dans les modèles *Confirm signup*, *Reset password* et *Change email address* (sujets : voir `supabase/config.toml`).
   Les liens utilisent `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=…` : ne pas les modifier.
6. **Authentication → SMTP Settings** : activer un SMTP personnalisé (le SMTP intégré de Supabase est limité à quelques emails/heure). Mêmes identifiants que la section 3.
7. **Authentication → Rate Limits** : les connexions et inscriptions passent par le serveur Next.js (Vercel). Monter *Sign-ups and sign-ins* à **500 / 5 min** au moins pour le lancement, et *Emails sent* selon le forfait SMTP (ex. 300 / h).
8. **Storage** : les 4 buckets sont créés par les migrations. Vérifier que `verification-docs` est bien **privé** (cadenas).
9. Récupère dans **Project Settings → API** : l'URL, la clé `anon` et la clé `service_role`.

## 2. Vercel (hébergement)

1. Importe le dépôt GitHub sur https://vercel.com/new (framework détecté : Next.js).
2. **Environment Variables** (Production + Preview) — voir `.env.example` :

   | Variable | Valeur |
   | --- | --- |
   | `NEXT_PUBLIC_SITE_URL` | `https://unyafrica.com` |
   | `NEXT_PUBLIC_SUPABASE_URL` | URL du projet Supabase |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | clé `anon` |
   | `SUPABASE_SERVICE_ROLE_KEY` | clé `service_role` (**secrète**) |
   | `SMTP_HOST` / `SMTP_PORT` / `SMTP_SECURE` / `SMTP_USER` / `SMTP_PASS` | fournisseur SMTP |
   | `EMAIL_FROM` | `Uny <bonjour@unyafrica.com>` |

   Ne **pas** définir `NEXT_IMAGE_ALLOW_LOCAL_IP` en production.
3. **Deploy**. Région des fonctions : *Settings → Functions → Region* = la même zone que Supabase (ex. `cdg1` Paris ou `fra1`).
4. **Analytics** et **Speed Insights** : les activer dans l'onglet du projet (déjà intégrés au code).

## 3. Emails transactionnels (SMTP)

Tout fournisseur SMTP convient. Exemple avec **Resend** :

1. Ajoute le domaine `unyafrica.com` et crée les enregistrements DNS demandés (SPF, DKIM, et un DMARC `v=DMARC1; p=none;`).
2. `SMTP_HOST=smtp.resend.com`, `SMTP_PORT=465`, `SMTP_SECURE=true`, `SMTP_USER=resend`, `SMTP_PASS=<clé API>`.
3. Utilise les **mêmes** paramètres dans Supabase (étape 1.6) pour que tous les emails partent de `bonjour@unyafrica.com`.

Emails couverts : vérification d'email, bienvenue, mot de passe oublié, changement d'email, statut validé, justificatif refusé.

## 4. Domaine personnalisé + HTTPS

1. Vercel → *Settings → Domains* → ajoute `unyafrica.com` et `www.unyafrica.com` (redirection de `www` vers la racine).
2. Chez le registrar : enregistrement **A** `@ → 76.76.21.21` et **CNAME** `www → cname.vercel-dns.com` (ou les valeurs affichées par Vercel).
3. Le certificat HTTPS est émis automatiquement. HSTS est déjà activé dans `next.config.ts`.
4. Mets à jour `NEXT_PUBLIC_SITE_URL` si besoin et redéploie.

## 5. Premier administrateur

1. Inscris-toi normalement sur le site avec ton email.
2. Depuis ton poste (avec un `.env.local` pointant vers la production) :

   ```bash
   npm run admin:grant -- ton.email@exemple.com
   ```

   ou, dans Supabase → *SQL Editor* : `update public.profiles set role = 'admin' where email = 'ton.email@exemple.com';`
3. L'espace admin est accessible sur `/admin` (lien aussi présent dans le profil).

## 6. Checklist de lancement

- [ ] `npm run build` passe en local ; `npm run test:e2e` au vert contre l'environnement local
- [ ] Inscription → email reçu → confirmation → dashboard (depuis un vrai téléphone)
- [ ] Mot de passe oublié reçu et fonctionnel
- [ ] Envoi d'un justificatif puis validation depuis `/admin/verifications` → email « statut vérifié » reçu
- [ ] QR code de la carte scanné avec un autre téléphone → page « Étudiant vérifié »
- [ ] PWA : « Ajouter à l'écran d'accueil » sur Android (Chrome) et iPhone (Safari)
- [ ] Partage du lien sur WhatsApp : aperçu Open Graph correct
- [ ] Contenu de démo : conservé pour les démonstrations **ou** supprimé via *Admin → Statistiques* avant d'ajouter de vrais partenaires (décocher « Contenu de démonstration » pour les vrais)
- [ ] Sauvegardes Supabase actives (plan Pro) ; alertes d'usage configurées

## 7. Ouvrir un nouveau pays ou une nouvelle ville

Tout est prêt dans le schéma :

```sql
update public.countries set is_active = true where code = 'SN';
update public.cities set is_active = true, districts = array['Plateau','Médina','Point E','Mermoz'] where slug = 'dakar';
insert into public.universities (country_code, city_id, name, short_name)
select 'SN', id, 'Université Cheikh Anta Diop', 'UCAD' from public.cities where slug = 'dakar';
```

Les nouveaux inscrits d'une ville sénégalaise reçoivent automatiquement un identifiant `SN-2026-000001`, `SN-2026-000002`, etc.

## 8. Sécurité — ce qui est en place

- **RLS** activée sur toutes les tables ; privilèges par colonne (un étudiant ne peut pas modifier son rôle, son statut ou son Uny ID).
- Identité verrouillée après vérification (trigger).
- Justificatifs dans un bucket **privé** ; l'admin les consulte via des URL signées de 5 minutes.
- Uploads limités par type MIME et taille (bucket + contrôle client + contrôle serveur) ; photos limitées au dossier de l'utilisateur.
- Coordonnées des logements et vendeurs invisibles pour les visiteurs non connectés (privilèges de colonnes).
- Fonctions sensibles (`review_verification`, `admin_stats`, `admin_set_role`…) vérifient `is_admin()` côté base.
- La page publique de vérification n'expose que nom, photo, établissement, filière et validité.
- En-têtes de sécurité (HSTS, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy).
- Clé `service_role` utilisée uniquement côté serveur (`server-only`), pour la recherche de compte par téléphone et les scripts.

# NØMIA Social — intégration contrôlée

**Statut : code en développement, NON prêt pour ouverture au public.**

NØMIA Social est une application indépendante à l'URL `/social/`. L'interface est hébergée sur GitHub Pages, les comptes et publications doivent être enregistrés dans Supabase. Tant que les migrations n'ont pas été appliquées, le formulaire de connexion est volontairement désactivé.

## Architecture

- `index.html` : interface accessible, connexion, fil, profil, explorer, publication, commentaires, notifications.
- `style.css` : design responsive nuit/or conforme à NØMIA.
- `app.js` : client Supabase utilisant uniquement la **clé publique publishable**.
- `sql/001_social.sql` : tables, contraintes, RLS, stockage privé, première protection anti-spam.
- `sql/002_notifications.sql` : notifications générées côté serveur et lecture privée.
- L'ancienne app Voyage/Photo/Gallery/Stories n'est pas modifiée par ces migrations.
- Le portail NØMIA officiel n'inclut PAS Social tant que les tests ne sont pas validés.

## Mise en service (action humaine nécessaire)

1. Ouvrir le projet Supabase existant et **faire une sauvegarde** avant tout changement.
2. Vérifier dans Authentication que la confirmation de l'e-mail est activée, définir le site URL et autoriser l'URL de redirection `https://pixjax.github.io/travel-photo-os/social/`.
3. Dans SQL Editor, vérifier puis exécuter `sql/001_social.sql`, ensuite `sql/002_notifications.sql`. L'exécution ne peut pas être simulée par un commit GitHub.
4. Confirmer que les tables `social_*` sont présentes, RLS activé sur chaque table, et que le bucket `nomia-social` est **privé**.
5. Tester en navigation privée avec **deux comptes e-mail réellement distincts** et **deux navigateurs**.
6. Effectuer la liste de tests ci-dessous. Tester les refus de permission avec des requêtes directes aussi, pas uniquement l'interface.
7. Ajouter Social au Hub seulement après les corrections de sécurité et la mise en place de modération.

**Attention :** la clé `sb_publishable_...` n'est pas secrète. Ne JAMAIS committer la clé `service_role`, une connexion PostgreSQL privilégiée, un token GitHub, ni un secret mail.

## Scénario de recette à deux comptes

- [ ] A crée un compte et confirme son adresse e-mail.
- [ ] A crée son identifiant public unique.
- [ ] B crée un deuxième compte et confirme son adresse e-mail.
- [ ] A publie une photo originale (limite 10 Mo).
- [ ] B voit réellement la photo publiée par A.
- [ ] B aime, commente, suit A, enregistre puis partage le lien.
- [ ] Le lien partagé ouvre exactement la publication et respecte les permissions.
- [ ] A reçoit des notifications pour l'abonnement, le like et le commentaire.
- [ ] A modifie son profil et visualise ses propres images.
- [ ] A supprime sa publication ; B ne peut plus la consulter.
- [ ] B ne peut ni modifier ni supprimer le post, le commentaire ou le profil de A.
- [ ] B ne peut pas consulter les photos privées d'un autre compte en modifiant une URL ou une requête.
- [ ] Un utilisateur bloqué ne peut pas voir les posts ou s'abonner selon les politiques RLS.
- [ ] Un visiteur non connecté ne peut pas récupérer les images du bucket privé.
- [ ] La plateforme reste utilisable sur Safari iPhone et Mac à diverses résolutions.
- [ ] Connexion, déconnexion, confirmation e-mail et récupération de mot de passe fonctionnent.
- [ ] Confirmer les règles de quotas, le contrôle des contenus et le plan de restauration.

## Fonctionnalités non terminées pour un lancement public

- Modération administrative réelle et outil de traitement des signalements.
- Limites anti-abus au niveau Edge/API et protection contre le spam, au-delà des contraintes SQL initiales.
- Suppression RGPD du compte **et de tous ses médias**, conformément aux règles applicables.
- Demandes et approbation d'abonnement aux profils privés.
- Notifications temps réel ou push (actuellement boîte de réception consultée à la demande).
- Réponses hiérarchisées aux commentaires, vidéos, carrousels multi-images.
- Synchronisation d'identité sécurisée et intégration complète avec les autres univers.
- Recherche de lieux et hashtags, carte communautaire, recommandations algorithmiques.
- Tests E2E automatisés dans un navigateur et pentest sécurité.

## Principes de sécurité

Aucune donnée sociale réelle n'est supposée présente. Aucun compte ou compteur fictif n'est créé. Les politiques RLS contrôlent lectures et écritures. Le stockage est privé, et les images autorisées utilisent des liens signés temporaires. Aucune localisation GPS ne doit être publiée automatiquement.

La configuration Supabase existante est partagée avec un autre projet NØMIA : **avant d'ouvrir des inscriptions publiques, faire valider l'isolation des quotas, l'authentification commune et le plan d'exploitation.**

## Rollback

Le déploiement de l'interface est isolé sous `social/` et n'altère pas l'accueil existant. Pour revenir en arrière, retirer la route Social, sans supprimer les tables utilisateur. Avant toute suppression définitive des tables ou du bucket, exporter données et médias et conserver une sauvegarde vérifiée.

## Tests automatiques

Dans le dossier `social/`, exécuter `npm install`, puis `npm run test:security` avec six variables d'environnement :

- `SOCIAL_URL` et `SOCIAL_ANON_KEY` du projet **de test**.
- `SOCIAL_TEST_A_EMAIL`, `SOCIAL_TEST_A_PASSWORD` : premier compte confirmé.
- `SOCIAL_TEST_B_EMAIL`, `SOCIAL_TEST_B_PASSWORD` : deuxième compte confirmé.

Le test utilise des données réelles temporaires, vérifie qu'un utilisateur ne peut pas effacer la publication de l'autre, teste likes/commentaires/notifications et contrôle la génération d'URL média autorisée. Le script supprime son post et son image à la fin. **Ne pas utiliser sur le projet de production sans sauvegarde et accord préalable.**

## Avancement du frontend

Implémentés côté interface : inscription, connexion, confirmation e-mail via Supabase, récupération de mot de passe, flux général et abonnements, publication photo, likes comptabilisés par la base, commentaires avec réponses, enregistrement, partage de liens vers les posts, profils et galeries personnelles, recherche de membres, blocage, signalement, notifications consultables.

Tout cela reste **non validé de bout en bout**, car les migrations SQL n'ont pas encore été appliquées sur la base accessible au projet. Ne pas présenter comme un service de production actif.

## NØMIA Messages — intégration du 19 octobre 2026

**Intégré dans Social (pas de second compte).** Le menu « Messages » est accessible après connexion. Depuis le profil d'une autre personne, « Message » démarre ou retrouve une conversation à deux. Les inconnus envoient une invitation à accepter ; les correspondants autorisés peuvent discuter en temps réel.

### Fonctions développées

- Conversations à deux participants, sans doublons par paire.
- Demandes reçues, acceptation/refus, blocage via Social, paramètre « accepter les demandes ».
- Textes, photos en bucket privé, liens vers des publications Social, historique et suppression de ses propres messages.
- Realtime sur messages/conversations, avec récupération périodique pendant une conversation.
- Statuts envoyés et lus basés sur les données serveur et compteur de conversations non lues.
- Préparation des images via Canvas pour retirer les métadonnées EXIF, notamment GPS.
- Adaptation des conversations au clavier et aux formats mobiles.

### Migrations appliquées sur Supabase

`004_messages.sql`, `005_dm_realtime.sql`, `006_dm_privacy.sql`, `007_dm_thread_events.sql`, `008_dm_media_integrity.sql`.

**Vérifications structurelles réalisées :** les quatre tables de messagerie ont RLS actif ; toutes les fonctions RPC de messagerie refusent `anon` et acceptent `authenticated` ; les médias sont dans le bucket privé `nomia-messages` (10 Mo) ; `social_dm_messages` et `social_dm_threads` sont dans `supabase_realtime`. Les tables Voyage n'ont pas été modifiées.

### Test réel recommandé avant forte adoption

Créer **trois comptes de test distincts** (A, B, C), confirmer les adresses e-mail et les profils. Depuis `social/` :

1. A trouve B, demande une conversation ; B l'accepte.
2. A envoie un texte et une photo ; B les voit, répond et marque comme lus.
3. Fermer/rouvrir sur deux appareils et vérifier l'historique.
4. C essaie de lire/modifier la conversation A-B : accès refusé.
5. B bloque A : aucun nouvel envoi possible.
6. Tester l'envoi d'une photo, l'ouverture du fichier et sa suppression.
7. Tester les demandes désactivées dans les préférences.
8. Vérifier le compteur de messages non lus et les actualisations Realtime.

Script : `npm run test:messages`. Nécessite `SOCIAL_URL`, `SOCIAL_ANON_KEY` et `DM_TEST_A_EMAIL/PASSWORD`, `DM_TEST_B_EMAIL/PASSWORD`, `DM_TEST_C_EMAIL/PASSWORD`. Exécuter uniquement sur des comptes de test : le script accepte potentiellement une demande de conversation et laisse la conversation créée. Les contrôles automatiques **n'ont pas été exécutés avec trois comptes réels ici**, faute de comptes de test disponibles.

### Restant à réaliser

- Modération centralisée des messages et traitement administratif des signalements.
- Anti-spam/rate limiting plus avancés, suppression RGPD complète et nettoyage systématique des médias orphelins.
- Tests E2E Safari/iPhone sur deux appareils (non effectués ici).
- Notifications push système (non implémentées), appels, voix, groupes, réactions et « écrit… » (non implémentés).
- Reprise hors ligne/réessai automatique avancés et gestion robuste de longues discussions (pagination actuellement limitée aux 80 derniers messages).
- Un statut « reçu sur l'appareil » n'est pas affiché car il ne serait pas vérifiable.
- Pas de chiffrement de bout en bout ; TLS et autorisations Supabase constituent les protections actuelles.

**Important :** ne pas qualifier le service d'audité ou de messagerie de production mature avant les tests réels à trois comptes et une revue indépendante des politiques d'accès.

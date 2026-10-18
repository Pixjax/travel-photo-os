# NØMIA — protocole de validation réelle

Ce document complète `scripts/audit.cjs` et `scripts/smoke.cjs`. Les tests Playwright utilisent un navigateur Chromium émulant un écran de téléphone. **Ils ne valident ni les capteurs Safari/iPhone réels, ni une synchronisation Supabase à deux comptes.**

## Prérequis

- Installer la dernière version publiée de NØMIA sur deux iPhone distincts ou un iPhone et un autre navigateur.
- Utiliser un **voyage de test séparé** de tes voyages personnels. Ne pas utiliser ton voyage Japon pour faire des manipulations de suppression.
- Sauvegarder/exporter les données importantes avant les essais.
- Vérifier que les deux appareils ont Internet, puis noter leurs versions PWA.

## Navigation et position GPS

- Autoriser la localisation et ouvrir Navigation. Vérifier que les coordonnées affichées sont cohérentes avec le lieu réel.
- Sélectionner un spot de test, vérifier que l'ETA est clairement une **estimation**, pas une vraie durée d'itinéraire.
- Refuser le GPS puis rouvrir Navigation : message explicatif, aucune interface bloquée.
- Désactiver/activer les alertes d'arrivée et vérifier qu'elles ne valident pas un spot à grande distance.
- Fermer puis rouvrir la navigation : plus de caméra/GPS actifs inutilement, aucun bouton dupliqué.
- Déplacer l'app en arrière-plan puis au premier plan : pas de promesse de suivi GPS iOS en arrière-plan.

## Dépenses et réservations

- Dans le voyage de test, ajouter une dépense de 12 AUD avec la note `TEST QA`, vérifier le total, fermer/réouvrir, supprimer, vérifier le nouveau total.
- Ajouter une réservation avec une date/heure et une note, vérifier sa présence après fermeture/réouverture.
- Tester URL vide, URL HTTPS et URL invalide : les liens non fiables ne doivent pas être ouverts silencieusement.
- Confirmer que le voyage principal reste inchangé.

## Collaboration réelle (test nécessaire avec deux sessions authentifiées)

- Compte A crée un voyage **de test**, compte B le rejoint avec le code, vérifier visibilité réciproque.
- Ajouter un spot depuis A puis vérifier son arrivée sur B.
- Ajouter une dépense depuis B puis vérifier sur A, après quelques secondes.
- Mettre B hors ligne, modifier une note et revenir en ligne : vérifier l'indicateur de synchronisation et le résultat final.
- Effectuer deux modifications concurrentes depuis A et B : détecter d'éventuels écrasements (le système synchronise un JSON complet : attention aux conflits).
- Tester retrait d'un membre et vérification des accès, sans toucher aux voyages personnels.
- Noter précisément toute donnée perdue ou dupliquée. **Ne pas annoncer une synchronisation sûre tant que ces scénarios ne passent pas.**

## Hors ligne (PWA iPhone réelle)

- Avec Internet, ouvrir un voyage et attendre au moins quelques secondes pour précharger l'application.
- Activer le mode avion, fermer complètement puis rouvrir la PWA : NØMIA doit démarrer.
- Vérifier l'accès aux données déjà chargées (spots, notes, journées, dépenses).
- Modifier une note hors ligne ; reconnecter Internet ; vérifier la synchronisation sur le second appareil.
- Les cartes, la météo et les liens externes non mis en cache ne sont pas garantis offline. **Ne pas conclure à un téléchargement complet des cartes.**

## Appareil iPhone : caméra / boussole / planétarium

- Dans Réglages iOS, autoriser puis refuser tour à tour caméra, localisation et orientation ; vérifier un message clair, pas d'écran figé.
- Tester le Planétarium face à un repère cardinal connu, loin du métal et des aimants ; comparer à une boussole fiable.
- Vérifier la position Soleil/Lune à une heure connue par référence astronomique indépendante, avec même latitude/longitude/fuseau.
- Tester une rotation de 360° et revenir au nord : la projection doit revenir près du même emplacement réel.
- Tester le recalage sur un astre visible **sans fixer le Soleil ni pointer vers lui dangereusement**.
- Une précision annoncée par la boussole n'est pas une preuve de précision de l'overlay RA. Ne jamais garantir ±5° sans validation.
- Fermer l'écran : flux vidéo arrêté, retour à Photo sans boutons dupliqués.

## Rapport de résultat

Pour chaque échec, noter : appareil, version iOS/Safari, version NØMIA, connexion, écran, action, résultat attendu, résultat obtenu, capture vidéo/capture d'écran, caractère reproductible.

Ne publier **« validé sur iPhone »** qu'après les tests sur appareil physique.

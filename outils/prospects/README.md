# Suivi des vendeurs particuliers

Page mobile : `/admin/prospects/`. API : `/api/prospects`, sessions agence vérifiées uniquement, contrôle d'origine pour les modifications. Le passage quotidien `GET /api/prospects?job=1` ne renvoie aucune donnée personnelle et reste idempotent par jour. Le workflow `taches.yml` le déclenche. Tables dédiées, sans modification des demandes d'estimation.

## État au 17 novembre 2026

Aucun flux professionnel autorisé identifié. L'interface doit indiquer `sans_source_autorisee`, jamais une recherche exhaustive sans résultat. PAP interdit la prospection professionnelle et la réutilisation des annonces : https://www.pap.fr/groupe/cgu . Aucun adaptateur PAP ou Leboncoin, aucune extraction de leurs alertes grand public.

Le régime téléphonique a changé le 11 août 2026 : consentement préalable requis pour les nouveaux prospects, Bloctel a cessé d'exister. Source : https://www.service-public.gouv.fr/particuliers/actualites/A19003 . Aucun fournisseur de preuve de consentement n'est raccordé. Coordonnées non rendues par l'API, aucun lien d'appel ou d'envoi, messages en brouillon seulement. Une licence de données ne vaut pas consentement du vendeur à un canal de prospection.

## Raccordement

Configurer une source seulement après vérification du contrat autorisant l'import en base et la prospection professionnelle, la mise à jour et le retrait. Un abonnement aux alertes d'acheteurs ne suffit pas. Un prestataire de pige doit justifier ses droits sur les annonces d'origine.

Variable privée Cloudflare `PROSPECTS_SOURCES_JSON`, cinq sources maximum. Exemple fictif, inactif :

```json
[{"id":"prestataire","nom":"Prestataire sous contrat","origine":"https://annonces.example.invalid","flux":"https://flux.example.invalid/annonces.json","justificatif":"Contrat vérifié","usage":"import_et_prospection","autorise_jusque":"2026-12-31","actif":false}]
```

Le flux doit fournir `{"annonces":[...]}`, au plus 500 annonces et 1 Mo, sans redirection. Chaque annonce contient `reference` stable, `vendeur` égal à `particulier`, `url` HTTPS de l'origine configurée, `commune`, `type` égal à `maison` ou `appartement`. Champs optionnels publiés : `surface`, `pieces`, `prix`, `parution` AAAA-MM-JJ, `quartier`, `prenom`, `nom`, `adresse`, `email`, `telephone`. Nombres JSON ; champ absent null ou vide. `texte_public` sert au contrôle transitoire de la règle 9, sans conservation. Aucun enrichissement d'identité. Un adaptateur propre au fournisseur reste à réaliser si son format diffère.

`REGLE9_LEAD_ADRESSES` et `REGLE9_LEAD_NOMS` sont obligatoires : absentes ou invalides, elles bloquent le traitement. Contrôle avant stockage et à chaque lecture, purge des correspondances existantes. Jamais de listes nominatives dans le dépôt ou les journaux.

Une opposition depuis le tableau retire la fiche et conserve une empreinte de source, référence et URL. Elle ne permet pas de reconnaître une nouvelle annonce sous une autre référence et une autre URL. Dédoublonnage par référence stable ou même URL au sein d'une source ; aucune fusion d'identité entre plateformes.

## Horaire et qualité

Fuseau du contexte actuel du compte : `Asia/Karachi`, passage à 8 h 07. `PROSPECTS_TIMEZONE=Europe/Paris` permet le passage vers 8 h à Dijon ; le workflow couvre été et hiver. GitHub Actions peut démarrer en retard. La préparation ne déclenche aucun appel.

La date de parution n'est pas remplacée par la première observation. La stabilité signifie un même prix observé, pas la preuve d'absence de changement entre deux observations. Un écart de 15 % à une médiane ne prouve pas une surévaluation ni une absence future de vente.

Les pages prix du site sont lues via ASSETS : médiane par type, période et effectif. Les anciens tableaux au périmètre différent restent sans comparaison. Dijon appartements : repère communal publié dans la FAQ ; Dijon maisons : rayon autour du centre, non utilisé comme médiane communale. Neuilly-Crimolois n'est pas assimilée à Neuilly-lès-Dijon. Aucun remplacement par une commune voisine.

Purge des fiches non observées depuis 90 jours. Journaux d'exécution limités aux compteurs et états. Les sources retirées de la configuration ne sont plus affichées.

## Vérification

`node outils/prospects/test.mjs`, Node 24, SQLite natif, données fictives .invalid et tableau public de Beaune. Tests : validation, exclusions, accès anonyme, dédoublonnage, historique atomique, baisses, classement, médiane, messages et reprise quotidienne.

Avant prospection réelle : contrat de source, éventuel adaptateur fournisseur, raccordement du consentement vérifiable et révocable par canal, information des personnes et gestion de leurs droits. Aucun achat ni envoi effectué.

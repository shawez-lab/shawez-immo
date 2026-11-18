# Reels : dépôt Claude → D1 → tableau

Le forfait Metricool ne permet pas l’API. Aucun appel à l’API Metricool, aucune clé, aucun secret de synchronisation, aucun lancement quotidien GitHub.

Claude dépose chaque matin à 6 h 47 **Europe/Paris** dans `espace-estimation.metricool_import` : `id`, `recu_le`, `periode_debut`, `periode_fin`, `reseau='instagram'`, `connecteur='reels'`, `donnees`, `traite_le=NULL`.

`donnees` contient `{"colonnes":[...],"lignes":[...]}` ou `{"erreur":"..."}`. Codes requis : IGRE02, IGRE04, IGRE06, IGRE03, IGRE23, IGRE11, IGRE10, IGRE07, IGRE12, IGRE21, IGRE24, IGRE27, IGRE28, IGRE30, IGRE26. Le lecteur utilise les codes et accepte un ordre différent : **IGRE27 = rétention**, **IGRE28 = taux de vue au-delà de 3 s**, IGRE30 = abandon. Aucun taux n’est déduit d’un autre ; une valeur absente reste nulle. IGRE29 n’est pas fourni : republications indisponibles tant que la colonne n’est pas ajoutée.

L’horloge Cloudflare existante `shawez-prospects-horloge` appelle `GET /api/reels/taches` vers **7 h 15 à Paris**, avec reprises dans la matinée. Configuration versionnée dans `outils/prospects/wrangler.toml`. Cron UTC 05:15, 06:15, 07:15 ; garde Europe/Paris pour couvrir les changements d’heure. Le traitement prospects existant à 03:07 UTC est conservé. Pas de navigateur ou ordinateur ouvert nécessaire pour ce traitement Cloudflare ; le dépôt amont dépend de la tâche Claude.

Le déclencheur public n’accepte aucune donnée. Il traite uniquement les lignes déjà déposées dans D1, renvoie un état et des compteurs sans exposer de statistiques, et ne fonctionne que de 7 h à 9 h Paris. Le bouton agence `POST /api/reels/collect` permet un traitement manuel, sous session agence et contrôle d’origine.

Les lignes sont traitées de la plus ancienne à la plus récente, par lots de trois. Un verrou D1 empêche deux traitements concurrents. Pour un import valide, registre, historiques et `traite_le` sont écrits **dans une transaction D1**. Une panne conserve `traite_le=NULL` et annule les écritures de mesures. La reprise ne crée pas de doublon. Les créations de tables restent additives. Les batches gardent le traitement des 155 Reels sous la limite d’appels D1 du forfait gratuit.

Un JSON d’erreur Claude est journalisé comme `erreur_source`, acquitté et ne change aucun chiffre. Un JSON invalide reste non acquitté et porte `erreur_import`, pour correction de sa source. Un import vide valide est acquitté sans supprimer les Reels. Les données brutes déposées par Claude restent conservées.

Un import utilise `recu_le` pour l’heure d’observation, pas l’heure de traitement. La dernière journée achevée de la période importée sert de date de rapport. Les mesures restent cumulatives ; aucun historique passé n’est reconstruit. Un import plus ancien ne remplace pas l’état récent du registre.

Page `/admin/reels/`, accès agence existant. `reels_registre` : une ligne par Reel ; `reels_historique` : historique commun, clé `(empreinte, observe_le)`, avec mesures, JSON brut et métadonnées de chaque observation. Voir [le plan de migration](MIGRATION-HISTORIQUE.md) ; aucune ancienne table n’est supprimée automatiquement. Types essai/normal conservés explicitement. Le registre du Monteur est lu via les assets du site, uniquement par URL exacte et unique, sans API distante ; les corrections agence restent prioritaires. Si cet asset n’est pas disponible, les métadonnées déjà conservées restent en place et les nouveaux types inconnus restent inconnus.

ManyChat reste par mot-clé : pas d’attribution par Reel tant que l’identifiant média n’est pas reçu et raccordé. Aucun ancien contact n’est réattribué.

Validation : `node --test outils/reels/test.mjs`, Node 24. Contrat IGRE27/28, null/0, colonnes réordonnées, transaction/acquittement, panne puis reprise, doublons, source en erreur, JSON invalide, table absente, vide, concurrence, changements d’heure, traitement de 155 Reels et droits d’accès.

La mise à jour autonome réelle ne peut être confirmée qu’après le premier dépôt Claude et son acquittement par l’horloge. Ne pas injecter de faux chiffres en production pour simuler cette confirmation.

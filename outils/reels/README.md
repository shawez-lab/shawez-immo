# Mesure des Reels

Page `/admin/reels/`, API `/api/reels/`, accès par la session agence existante. Liaison D1 `DB` = `espace-estimation`.

Le registre `reels_registre` contient une ligne par Reel ; chaque Reel a aussi sa propre table d’historique `reels_h_<sha256 de son ID>`. Chaque observation garde le JSON brut, les mesures et les métadonnées connues à cet instant. Aucun historique supprimé, aucune reconstitution de chiffres passés. Migration additive au premier accès.

## Mise en service

1. Déployer les fichiers de cette branche. Ajouter `METRICOOL_API_TOKEN` dans les secrets de **production** du projet Pages `shawez-immo`, puis redéployer. Marque `7212231`, utilisateur `5583508`, fuseau `Europe/Paris` déjà fixés côté serveur. Aucun secret au navigateur.
2. Pour le déclenchement GitHub sans ordinateur ouvert, ajouter un même secret aléatoire `REELS_SYNC_TOKEN` (32 caractères minimum) à Cloudflare Pages et GitHub Actions. Ce secret autorise uniquement la collecte, pas la lecture des statistiques. Lancer « Relevé quotidien des Reels » une fois. La collecte se lance vers 7 h 15 Paris, avec reprises possibles dans la matinée. Les horaires GitHub sont indicatifs et non garantis à la minute.
3. La source REST `/v2/analytics/reels/instagram` est documentée et implémentée. Elle ne documente pas actuellement `retention` et `reelsViewRate`. Les valeurs restent nulles si absentes. Le complément `/datastudio/datasets` utilise les codes IGRE ; son contrat de paramètres reste **à valider avec la clé réelle**. Ne mettre `REELS_DATASTUDIO_ACTIVE=1` qu’après essai concluant. L’import agence Data Studio permet déjà d’enregistrer les 28 champs non dépréciés. Ne pas annoncer la couverture automatique des 30 indicateurs avant cette validation.
4. Importer le relevé initial JSON depuis le formulaire agence. La date d’observation est la date de récupération, jamais la date de publication. Les 17 Reels du 12 au 16 novembre sont qualifiables en essai d’après la confirmation de Shawez ; la légende n’est pas assimilée à l’accroche visuelle.
5. Avant programmation : créer une entrée via le formulaire ou `POST /api/reels/programmation`, avec `uuid`, `type` (essai/normal), `accroche` réellement visible, `mot_cle`, `programme_le` avec décalage horaire. Après publication, rattacher explicitement `reel_id`. Aucun rapprochement automatique par légende ou par mot-clé. Les programmations faites hors de ce registre doivent être raccordées par leur opérateur.

## ManyChat

État confirmé : `ig_commentaires.media_id` existe mais est vide ; `dm_instagram.post` vaut `mot:chateau`, etc. Le tableau expose seulement les contacts ManyChat distincts par mot-clé (historique complet). Ce nombre n’est pas un nombre de vendeurs qualifiés. Aucun lead par Reel n’est calculé.

Le propriétaire du flux ManyChat doit transmettre l’identifiant média du déclencheur dans la requête externe existante, protégée par `X-Boss-Token` / secret `MANYCHAT_TOKEN`, puis l’enregistrer dans `ig_commentaires.media_id`. À valider sur un véritable événement : les ID Graph, shortcode du lien et ID Metricool ne sont pas nécessairement identiques. Conserver une correspondance explicite avant toute jointure. Ne pas réattribuer rétroactivement les événements anciens.

## Lecture des résultats

Les compteurs sont cumulatifs au moment du relevé, pas les seules interactions du jour précédent. Le rapport du matin porte sur la dernière journée achevée à Paris. Les 3 lignes signalent l’absence d’un relevé ; aucune preuve causale sur l’image n’est inventée. Classement par abandon croissant, valeurs nulles à part. Comparer uniquement même type et âge comparable ; l’historique montre l’âge de chaque observation. Le type inconnu n’est jamais renommé normal.

IGRE13 / IGRE15 dépréciés, vues IGRE23. IGRE26 est décrit par Metricool comme durée payante : durée organique manquante complétable par l’agence. Les pourcentages sont conservés en points (62,5), les durées en secondes ; pas de conversion heuristique. La rétention peut dépasser 100 % en cas de boucles.

Validation locale : `node --test outils/reels/test.mjs` (Node 24, SQLite intégrée). Tests d’authentification anonyme / origine, table par Reel, dédoublonnage, ancien import, null/0, reprise après échec, synthèse, fuseau, mots-clés. La validation API Metricool réelle et du scheduler reste nécessaire avant déclaration de mise en service.

Sources : https://app.metricool.com/resources/apidocs/index.html ; https://app.metricool.com/api/swagger.json ; https://help.metricool.com/basic-guide-for-api-integration-r97af

# Migration de l’historique Reels

## État du 18 novembre 2026, avant déploiement

L’inventaire réel de `espace-estimation` contient 155 tables `reels_h_<sha256>`, 155 Reels et 155 observations. Une copie additive a été faite dans `reels_historique` : 155 observations, 155 empreintes. Les cinq champs `observe_le`, `rapport_jour`, `mesures`, `brut` et `meta` ont été comparés pour chacune des 155 sources : aucune différence. Les anciennes tables sont toutes conservées. Un bookmark Time Travel a été pris avant la création de la table commune.

La clé primaire de la nouvelle table est `(empreinte, observe_le)`. L’empreinte est le SHA-256 existant, sans le préfixe `reels_h_`. Le champ `reels_registre.historique` reste un identifiant compatible, validé puis converti en empreinte ; il ne sert plus à construire une requête vers une table par Reel.

## Ordre de bascule

1. Reprendre un bookmark Time Travel et un export avant la bascule finale.
2. Déployer cette PR sur **main**, sans toucher à la branche `agence`.
3. Attendre la fin des invocations de l’ancienne version. Refaire la copie additive pour rattraper les écritures intervenues depuis la première copie et les éventuelles nouvelles tables. Cette étape est indispensable : la production écrit encore dans les anciennes tables tant que la PR n’est pas fusionnée.
4. Depuis une session administrateur existante, appeler `POST /api/reels/migration` avec `{"action":"copier"}` puis `{"action":"verifier"}`. Même authentification et contrôle d’origine que les autres opérations Reels. Aucun endpoint de suppression n’est exposé.
5. Vérifier le rapport détaillé : toutes les tables sources, y compris orphelines du registre, doivent être présentes ; `differences` doit valoir zéro. Les lignes JSON sont comparées comme du texte, sans parsing ni normalisation. Les nouvelles observations propres à la cible peuvent rendre le compte cible supérieur au compte source.
6. Vérifier dans l’espace agence la lecture de plusieurs historiques, un import et une correction de métadonnées. Le nouvel import et son acquittement restent dans la même transaction D1.
7. **Présenter ce bilan à Shawez et obtenir sa validation avant la suppression.** Rien dans cette PR ne supprime automatiquement les anciennes tables.
8. Après validation et confirmation que tous les lecteurs/écrivains utilisent la table commune, appeler explicitement `removeLegacyHistory(DB, 'SUPPRIMER_APRES_BASCULE_VERIFIEE')` depuis un contexte d’administration contrôlé. La fonction vérifie d’abord les contenus, puis refait les assertions et les `DROP TABLE` dans un seul `DB.batch` transactionnel : toute différence annule le batch. Elle ne touche qu’aux noms validés `reels_h_[a-f0-9]{64}`.

## Retour arrière

Avant suppression, aucune source n’est modifiée : on peut conserver l’ancienne version. Une fois que le nouveau code a écrit, un retour au code ancien exigerait aussi de recopier les nouvelles observations vers les anciennes tables ; ne pas faire un simple rollback applicatif en oubliant ces écritures. Après suppression, utiliser l’export ou Time Travel uniquement dans le cadre d’une restauration coordonnée, car une restauration de base concerne aussi les autres fonctions de `espace-estimation`.

## Validation

Les tests SQLite couvrent 170 tables, les sources orphelines, les observations de même date sur différents Reels, les zéros et champs absents, la reprise sans doublon, les conflits de contenu, le refus de supprimer sans confirmation, et la conservation de la cible après nettoyage. La vérification est groupée en petits batches D1, sans grand `UNION`, car la console réelle refuse les requêtes composées volumineuses.

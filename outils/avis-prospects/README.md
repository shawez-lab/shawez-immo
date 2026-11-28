# Avis documentés et courrier postal

Administration : `/admin/avis-prospects/`. Authentification agence existante, base D1 liée sous `DB`.

1. Renseigner le bien et la source vérifiable de ses caractéristiques. Utiliser le code INSEE de la commune, pas le code postal. La préparation lit les trois millésimes géo-DVF officiels nécessaires aux 24 derniers mois. Un millésime absent est signalé ; ce parcours ne certifie pas une couverture complète.
2. Vérifier la période, les mutations et le périmètre retenu. Les mutations multi-lignes sont exclues sans répartition arbitraire du prix. La médiane est celle des ventes simples du même type. Les comparables sont de même type, avec surface entre 75 et 125 % de celle du bien. Priorité à la même voie lorsqu'il reste cinq références, puis quartier documenté, puis commune. Aucun quartier n'est inféré. Moins de cinq références : aucune fourchette.
3. Compléter dans l'étude les concurrents vérifiés et leurs sources, le DPE, les honoraires. Ne pas qualifier la première observation de date de publication. Une statistique régionale de valeur verte ne justifie pas à elle seule un impact en euros sur ce bien. Aucun coefficient DPE automatique.
4. Le repère de valeur est l'intervalle interquartile des prix au m² des comparables, multiplié par la surface. Les valeurs DVF n'harmonisent pas les honoraires. Un net vendeur exige un barème documenté et `honoraires.prix_reference_hai_confirme: true`, après vérification par l'agent de la base HAI. Aucune somme après remboursement de prêt ou impôt n'est promise.
5. Créer le lien personnel. Le jeton aléatoire de 256 bits n'est conservé que haché. Le lien est affiché une fois, expire après 90 jours et peut être révoqué. Les pages sont sans indexation, sans référent et sans balise de mesure tierce. Ne pas mettre ces liens dans le sitemap.
6. Générer le courrier avec QR directement dans l’administration, ou avec `courrier.py` dans un dossier privé, en documentant la source des coordonnées postales et le droit de réutilisation. Ce module n'autorise pas la réutilisation commerciale d'une annonce dont la licence ne le permet pas. Le courrier n'est pas envoyé par ce code. Le QR est produit localement sans service tiers. La version navigateur utilise qrcode-generator 1.4.4, licence MIT, inclus sous assets/vendor/.
7. La demande volontaire crée un dossier dans `demandes` avec les tags `vendeur`, `secteur:…`, `echeance:…`. La version complète s'ouvre immédiatement et reste imprimable. Le numéro n'est pas inscrit à une séquence sans la case WhatsApp dédiée, non précochée. Le texte, la version et la date de l'accord sont conservés dans `consentements_entrants`.
8. Si `LEAD_WEBHOOK_URL` est configuré dans le projet Pages, les demandes consenties sont mises dans `crm_sortie` puis transmises avec `Idempotency-Key`. Le CRM destinataire doit dédupliquer sur `reference` et respecter `automation_allowed` et `consent_whatsapp`. Ne pas déclencher une séquence générique sur tous les nouveaux dossiers. Le bouton de l'administration retente les transmissions en échec ; aucune séquence externe n'est prétendue active si le webhook manque. Aucun envoi de WhatsApp n'est implémenté ici.

L'opposition bloque le lien et la recréation d'une étude sur la même combinaison commune/voie/type/surface. Cette empreinte est conservée dans `avis_oppositions_biens`. La vérification couvre ce parcours ; une campagne postale extérieure doit aussi consulter sa propre liste d'opposition. Les exclusions privées existantes sont requises, avec blocage en cas de configuration absente.

Le chatbot crée désormais un dossier de qualification vendeur sérieux, idempotent par session, sans inventer de coordonnées ni déclencher de relance. Les coordonnées doivent encore être recueillies par le formulaire. Les règles privées du chatbot restent appliquées avant qualification.

## Champs complémentaires de l'étude

`concurrence[]` : `titre`, `prix`, `surface`, `premiere_observation`, `derniere_observation`, `source`; facultatifs `publication` et `source_publication` ensemble.

`energie` : `etiquette`, `source`; facultatif `impact` avec `bas`, `haut`, `portee` et `source`. L'impact est présenté séparément et ne modifie pas automatiquement la fourchette.

`honoraires` : `mode` (`fixe` ou `taux_prix_hai`), `valeur` (euros ou fraction du prix HAI), `charge` (`vendeur` ou `acquereur`), `source`, `prix_reference_hai_confirme`.

Chaque `source` contient une `url` HTTPS, une `ref` précise et `consulte_le` au format date ISO. Le lien source ne suffit pas à lui seul à prouver qu'un chiffre a été vérifié : l'agence doit contrôler les pièces.

## Vérification

`node outils/avis-prospects/test.mjs` avec Node 24. Tests sur SQLite en mémoire : calculs, sources, CSV, exclusions de mutations groupées, période, authentification, origine, D1, doublons, consentement et opposition. Fixtures synthétiques explicitement marquées ; aucun prospect réel ni message envoyé.

Sources de méthode : [DVF géolocalisé](https://www.data.gouv.fr/datasets/demandes-de-valeurs-foncieres-geolocalisees), [CNIL courrier postal](https://cnil.fr/fr/la-prospection-commerciale-par-courrier-postal), [CNIL prospection électronique](https://www.cnil.fr/fr/la-prospection-commerciale-par-courrier-electronique), [Notaires, valeur verte](https://www.notaires.fr/fr/immobilier-fiscalite/etudes-et-analyses-immobilieres/performance-energetique-la-valeur-verte-des-logements).

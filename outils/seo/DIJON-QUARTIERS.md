# Prix DVF et estimation par quartier de Dijon

La page pilier `/estimation-immobiliere-dijon/` relie les pages des conseils de quartier officiels ayant des ventes dans le jeu local. Aucun quartier n’est inféré depuis un rayon. Aucun montant commercial n’est saisi à la main.

## Sources et calcul

- Ventes : `donnees-dvf/index.json`, `t/*.json` et `d/*.txt`, préparés par `outils/dvf.py` depuis les [DVF géolocalisées DGFiP / Etalab](https://www.data.gouv.fr/datasets/demandes-de-valeurs-foncieres-geolocalisees), Licence Ouverte 2.0. Chaque point et sa ligne de détail sont alignés ; une différence de longueur arrête la génération.
- Périmètres : [conseils de quartier de Dijon Métropole, couche 66](https://api-carto.dijon.fr/arcgis/rest/services/OPENDATA/opendata/FeatureServer/66), requête GeoJSON en WGS84, collectée le 18 novembre 2026. Le fichier `dijon-quartiers.geojson` garde les géométries et les seuls nom/numéro de quartier ; les autres propriétés de la réponse source sont retirées. Son empreinte source est conservée.
- Seules les ventes dont la commune DVF est Dijon sont rattachées par inclusion dans un polygone. Une limite ambiguë ne donne jamais deux ventes. Le manifeste indique les ventes non attribuées et l’empreinte de tous les fichiers DVF utilisés.
- Médiane des prix au m² présents dans les tuiles ; médiane des prix signés présents dans les détails. Les demi-unités sont conservées. Le nombre de ventes n’est pas une estimation.
- Évolution : `(médiane année N / médiane année N−1 − 1) × 100`, séparément pour appartements et maisons. Moins de cinq ventes : médiane et évolution non publiées. Les ensembles de biens vendus changent entre deux années : ce n’est pas un indice à bien constant.
- Référence annuelle : dernier millésime complet disponible. Si le dernier fichier porte sur un mois antérieur à décembre, l’année précédente est retenue. Une année partielle n’est jamais présentée comme une année complète.
- Exemples : huit ventes les plus récentes au plus, triées selon le mois et le jour source ; seuls mois, type, surface, prix signé et prix au m² sont affichés. Aucun jour exact, voie, numéro, point géographique ou nom de client n’est publié.

À la création : 8 485 ventes de Dijon, 2023–2025, toutes attribuées une fois à l’un des neuf quartiers ; dernières données départementales au 30 décembre 2025. Les pages indiquent ce décalage de publication. Ces chiffres ne décrivent pas les ventes de 2026.

## Régénération et liens

`python3 outils/seo/dijon_quartiers.py`

Cette commande est hors réseau et relançable. Elle produit les pages, le manifeste agrégé `donnees-dvf/quartiers-dijon.json`, les liens de la page pilier, de l’accueil, des sept articles concernés et des fiches indexables de Dijon, le plan du site et les entrées du sitemap. Une ancienne page générée sans ventes est retirée. Les vidéos et leurs scripts ne sont pas modifiés.

Le constructeur des fiches garde le même lien lors des synchronisations suivantes. La construction générale régénère les quartiers avant le plan du site ; le mode `--chat-only` garde son périmètre initial. Le workflow mensuel DVF régénère aussi les pages avant son commit. Les modifications de quartier sont testées dans une PR ; le rafraîchissement réseau DVF est limité à main.

IndexNow détecte déjà les nouvelles pages HTML et leurs modifications sur main ; son passage quotidien rattrape les commits automatiques. Le contrôle de PR fonctionne avec `--essai`, sans notification aux moteurs. Google utilise le sitemap et les liens internes ; IndexNow ne soumet pas à Google.

## Vérifications

`python3 -m unittest discover -s outils/seo/tests -v`

Contrôles de géométrie, médianes et échantillons, cohérence des sources, partition des ventes, confidentialité, canonicals, JSON-LD, maillage, sitemap et IndexNow, absence de page sans données, régénération identique et conservation des vidéos. Le workflow `Dijon quartiers DVF et indexation` les exécute.

Le point de départ Search Console communiqué pour 28 jours est 0 clic / 163 affichages / position moyenne 44,8 pour les requêtes contenant Dijon, et 57,9 pour « estimation immobilière dijon ». Après publication et exploration des nouvelles URL, comparer à nouveau les mêmes filtres sur 28 jours. La cible est le top 10 ; une publication ou une notification d’URL ne garantit pas un classement.

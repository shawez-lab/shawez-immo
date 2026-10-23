# Modèles de pages SEO — shawez-immo.com

Règle : **une page = un mot-clé principal** (carte : Google Sheet « SEO — carte des mots-clés shawez-immo.com »).
Générer : `python3 outils/seo/pages_spec.py /tmp/pages.json && python3 outils/seo/gen_pages.py . /tmp/pages.json`
(gabarit = article « Choisir un agent » : même en-tête, style, pied de page ; JSON-LD WebSite + Person + agence + `#agent` + WebPage + BreadcrumbList + FAQPage, + Service pour une ville, + Article pour un guide).
Contrôles : `python3 outils/seo/audit.py .` (titres ≤ 60, descriptions ≤ 160, un H1, pas de doublon) et `python3 outils/seo/crawl.py .` (liens cassés, pages orphelines).
Audit complet (site servi en local, tous les contrôles, code 1 s'il reste une erreur) : `python3 outils/seo/audit_complet.py`.
Pages piliers : `python3 outils/seo/piliers_spec.py /tmp/piliers.json && python3 outils/seo/gen_pages.py . /tmp/piliers.json`. Sitemap : `python3 outils/seo/sitemap_maj.py` (ajoute les pages indexables, retire les autres, lastmod des pages modifiées).
Pied de page vers les piliers (`nav_piliers.py`), plan du site (`plan_du_site.py`) et blocs « Pages liées » (`maillage.py`) : refaits par `python3 outils/build.py`.
Pages « Prix immobilier à <commune> » : `python3 outils/seo/prix_communes.py` (seuil 30 ventes DVF sur la période, `--liste` pour voir les communes retenues ; refait aussi le tableau de /prix-immobilier-cote-d-or/), puis `python3 outils/seo/sitemap_maj.py && python3 outils/build.py`.
IndexNow : `.github/workflows/indexnow.yml` + `outils/indexnow.py` (pages modifiées par chaque poussée sur main ; `--essai` pour voir la liste sans envoyer).
Chiffres : uniquement DVF (`python3 outils/seo/dvf_stats.py`, rayon autour du centre, ventes de l'année) ou source officielle datée. Jamais de chiffre d'activité de Shawez sans accord écrit.
Mots interdits : « IA », « Claude », « mandataire », « meilleur », « n°1 », « gratuite » (dire « offerte »), « instantanée », « garantie ».

## Modèle « Page ville » — `/immobilier-<ville>/` (ou `/agent-immobilier-<ville>/` si c'est la requête qui a du volume)
- Titre SEO (≤ 60) : « Immobilier à <Ville> : estimer et vendre » / meta (≤ 160) : prix réels DVF + estimation offerte + Shawez Ali.
- H1 : « Vendre à <Ville>, au bon prix. » — label = nom de la ville — fil d'Ariane : Accueil › Secteurs › <Ville>.
- Intro (2 phrases) : qui achète ici, ce que je fais.
- H2 1 « Les prix à <Ville> » : médianes DVF maison/appartement de l'année, nombre de ventes, année précédente, phrase source.
- H2 2 « Ce que regardent les acheteurs » : 3 à 5 critères concrets du secteur.
- H2 3 « Comment je prépare la vente » : avis de valeur écrit, photos, film, drone, diffusion GRAVELIN IMMO, visites, suivi notaire.
- FAQ (5) : prix maison, prix appartement, délai de vente, coût de l'estimation (offerte), estimation en ligne. Questions prises dans « Autres questions posées » / suggestions Google.
- Maillage : /prix-immobilier-dijon/, 2 villes voisines, /secteurs-…/, /estimer/ (bouton), /estimation-immobiliere-dijon/.

## Modèle « Page quartier » — `/quartiers-dijon/<quartier>/`
- Titre : « <Quartier> à Dijon : prix et vente d'un bien » / H1 : « Vendre à <Quartier>. »
- Fil d'Ariane : Accueil › Prix immobilier à Dijon › <Quartier>.
- H2 1 « Les prix à <Quartier> » (DVF, rayon 0,8 km, à faire relire par Shawez : limites du quartier).
- H2 2 « Le quartier en quelques faits » : UNIQUEMENT des faits validés par Shawez (types de biens, rues, ce qu'il y a vendu ou filmé).
- H2 3 « Ce qui fait le prix ici » (étage, extérieur, stationnement, copropriété…).
- FAQ (5) : prix au m², appartement, maison, le quartier est-il recherché (sans classement), estimation.
- Maillage : /prix-immobilier-dijon/, 2 quartiers voisins, /estimer/.

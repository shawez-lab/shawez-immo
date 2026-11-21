# Production de la série Mission Dijon

Trois vidéos originales sans présentateur, sans voix et avec musique originale. Elles adaptent V01, V05, V03 et V07. Elles ne remplacent pas les vidéos avec l’avatar et la voix de Shawez, dont le blocage est documenté dans avatar-a-faire.md.

## Refaire un rendu

Python 3.12 avec Pillow 12.3, NumPy 2.5 et imageio-ffmpeg. Commande depuis ce dossier :

```sh
python render.py --out ../../../public/assets/trial/2026-11-21
```

Le chemin de sortie peut être remplacé par le dossier de son choix. Depuis contenus/2026-11-21/production-trial, remonter trois niveaux atteint la racine du dépôt. Le programme écrit aussi un WAV intermédiaire et un relevé des limites de texte ; ne programmer que les MP4 accompagnés de leurs TXT homonymes.

Variables possibles : FONT_BOLD et FONT_MONO pour des polices locales dont l’utilisateur dispose des droits, FFMPEG_BIN pour son encodeur installé. Le rendu livré utilise les polices système Arial Bold et Andale Mono du Mac. Les fichiers de police ne sont pas redistribués. Sur une autre machine, renseigner des polices autorisées et refaire la vérification des limites typographiques.

Le JSON contient les textes, couleurs, bornes temporelles et légendes. Le Python contient le dessin, les animations, les contrôles de largeur et la synthèse musicale. La musique est synthétisée localement à partir de notes et d’enveloppes programmées. Elle n’utilise ni échantillon ni piste issue d’un jeu. Le seed et le tempo sont des paramètres techniques, pas des données commerciales.

## Déroulé des 32 secondes

- 0 à 3 : mission et barre de chargement fictive, sans résultat commercial annoncé.
- 3 à 7 : contour communal de Dijon dessiné à partir de données publiques, avec parcours de vente distinct des positions géographiques.
- 7 à 12 : comparaison ou éléments à vérifier.
- 12 à 17 : étapes ou explication utile.
- 17 à 23 : point essentiel, sur fond clair.
- 23 à 28 : prochaine étape avec Shawez.
- 28 à 32 : commentaire ESTIMATION et identité professionnelle.

La barre de chargement désigne seulement l’ouverture d’une mission illustrative. Aucun compteur de prix, délai de vente, rendement ou résultat n’est représenté. Les changements visuels sont suivis de temps de lecture stables. Aucun dialogue n’est présent, donc aucun sous-titre de parole n’est à synchroniser. Tout le message est visible à l’écran et compréhensible sans son.

## Provenance de la carte et droits

Le fichier dijon-contour.geojson contient le contour de la commune de Dijon obtenu le 21 novembre 2026 depuis [l’API publique de découpage administratif](https://geo.api.gouv.fr/communes/21231?fields=nom,contour&format=geojson&geometry=contour). Le dessin est créé dans le renderer, aucune image de carte n’est copiée. Les étapes du parcours commercial ne désignent pas des lieux réels. Aucune adresse, position de client ou trajet routier n’est indiqué.

Réutilisation des données : [Licence Ouverte 2.0](https://www.data.gouv.fr/pages/legal/licences/etalab-2-0). Paternité visible sur la carte et dans la légende : geo.api.gouv.fr, avec date de consultation. [Documentation de l’API](https://geo.api.gouv.fr/decoupage-administratif). La date de consultation ne prétend pas être une date de levé du contour. Le fichier source conserve la réponse reçue.

Les graphismes, animations, composition sonore et textes sont créés pour cette mission. Aucun asset d’un jeu commercial, logo, personnage, musique ou interface copiée n’est utilisé. Le vocabulaire mission, niveau et chargement relève du concept créatif. Aucune donnée consultée ne permet d’affirmer que ce format précis est la tendance dominante d’Instagram en novembre 2026 ; il est traité comme une hypothèse à tester.

## Destination et remise

Instagram, Trial Reels exclusivement. Ni Reel normal, ni TikTok. Ne pas activer « partager avec tout le monde » ou l’option de diffusion automatique vers les abonnés. La présence d’un fichier dans ce dossier ne programme rien. Les agents de Shawez doivent vérifier le mode essai dans leur interface avant de programmer. Si leur outil ne permet pas le mode essai, garder les fichiers en attente.

[Meta — fonctionnement des Trial Reels](https://about.fb.com/news/2024/12/trial-reels-try-content-non-followers-first-see-what-perfoms-best/) : lecture des premières statistiques après environ 24 heures et existence d’une option de partage automatique. La désactivation de cette option est nécessaire pour respecter la demande de Shawez.

# assets/avis/ — fabrication de l'avis de valeur en PDF

Chargé seulement dans `/admin/`, au clic sur « Enregistrer et créer le PDF ». Rien ici n'est chargé par les pages publiques.

| Fichier | Rôle | Origine et licence |
|---|---|---|
| `avis-pdf.js` | Mise en page de l'avis de valeur (7 pages, charte du site). `window.EEAvis.generer(données)` | Écrit pour ce site |
| `pdf-lib.min.js` | Écriture du PDF | pdf-lib 1.17.1 (npm), licence MIT, © Andrew Dillon |
| `fontkit.umd.min.js` | Lecture des polices | @pdf-lib/fontkit 1.1.1 (npm), licence MIT |
| `familjen-400.woff`, `familjen-400-italic.woff` | Titres | Familjen Grotesk (@fontsource/familjen-grotesk 5.x, sous-ensemble latin), licence OFL 1.1 |
| `schibsted-400.woff`, `schibsted-600.woff` | Texte | Schibsted Grotesk (@fontsource/schibsted-grotesk 5.x, sous-ensemble latin), licence OFL 1.1 |
| `logo-*.png` | Logos Shawez Ali et GRAVELIN IMMO | Copies PNG des logos de `assets/` (pdf-lib ne lit pas le WebP) |

Après une modification de `avis-pdf.js`, changer le numéro `?v=` dans `outils/espace/admin.js` (les fichiers de `assets/` restent
une semaine dans le cache des navigateurs), puis `python3 outils/espace.py`.
Relire la mise en page sans navigateur : `node outils/tests-espace/avis-apercu.mjs avis.pdf`.

# Espace estimation — module pour le site de l'agence (GRAVELIN IMMO)

Le même module que sur shawez-immo.com (parcours `/estimer/`, `/mon-espace/`, `/admin/`), à la charte de l'agence.
Fichiers fabriqués par `python3 outils/espace.py` : ne pas les modifier à la main (sources dans `outils/espace/`).

## Brancher le module en 10 lignes

1. Copier dans le dépôt du site de l'agence : `espace-estimation.js`, `espace-estimation.css`, `theme-gravelin.css`, et le dossier `functions/` de ce dépôt (l'API).
2. Créer quatre pages `/estimer/`, `/mon-espace/`, `/admin/` et `/admin/promesses/` avec l'en-tête et le pied de page du site.
3. Dans chacune, à l'endroit du contenu : `<div data-espace-estimation="estimer"></div>` (ou `mon-espace`, `admin`, `promesses`).
4. Dans le `<head>` : `<link rel="stylesheet" href="/espace-estimation.css">` puis `<link rel="stylesheet" href="/theme-gravelin.css">`.
5. Avant `</body>` : `<script src="/espace-estimation.js"></script>` (réglages possibles juste avant, dans `window.EE_CONF`).
6. Cloudflare Pages du site de l'agence → Settings → Bindings : base D1 `espace-estimation` sous le nom `DB` (la même que shawez-immo.com), service `shawez-mailer` sous le nom `MAILER`.
7. Même écran, variables : `SOURCE = gravelin` ; `ADMIN_EMAILS` et `NOTIFY_EMAILS` comme sur shawez-immo.com.
8. Copier aussi le dossier `donnees-dvf/` (ou l'action `.github/workflows/dvf.yml` et `outils/dvf.py`, qui le refont chaque mois).
9. Pictogramme de l'en-tête : `<a href="/mon-espace/" data-compte aria-label="Mon espace : se connecter">…</a>` ; il reçoit la classe `is-in` quand on est connecté.
10. Autoriser `https://api-adresse.data.gouv.fr` et `https://data.geopf.fr` dans `connect-src` si le site a une CSP ; `/mon-espace/` et `/admin/` en `noindex`.

Pour changer l'habillage : seulement `theme-gravelin.css` (couleurs, polices, arrondis).
Démonstration : `demo-estimer.html`, `demo-mon-espace.html`, `demo-admin.html`, `demo-promesses.html` (dans ce dossier).

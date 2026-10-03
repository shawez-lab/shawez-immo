# shawez-immo.com

Site statique publié par Cloudflare Pages à chaque poussée sur `main`.

Autres procédures : [images des posts Google](README-posts-images.md) · [registre des médias](medias-equipe.md).

## Typographie

- Titres : **Familjen Grotesk** (avec son italique pour les mots en couleur) ; texte : **Schibsted Grotesk**. Polices libres (OFL), hébergées sur le site (`assets/fonts/`), avec des polices de repli calibrées.
- `python3 outils/typo.py` applique la typographie (polices, tailles, graisses, interlignages, bloc `typo-v9`) : textes, couleurs, italiques et surtitres restent tels quels.

## Construction : flux RSS et balises

`python3 outils/build.py` (relançable), lancé automatiquement par GitHub Actions (`build.yml`) à chaque poussée sur `main` qui touche une page, et après la synchronisation quotidienne des annonces :

- **Flux RSS des Conseils** : `https://shawez-immo.com/conseils/feed.xml`, refait à partir de `conseils-vendeurs/*/index.html` (titre, lien, date, résumé, texte et image de chaque article, tirés du JSON-LD et de la page). Un nouvel article y apparaît dès qu'il est publié.
- `<link rel="alternate" type="application/rss+xml" href="/conseils/feed.xml">` dans le `<head>` de toutes les pages.
- **Mesure d'audience Metricool** (marque 7212231), balise avant `</body>` de toutes les pages. Testée le 3 octobre 2026 avec Playwright (ordinateur et iPhone, deux visites) : aucun cookie, aucun `localStorage` ni `sessionStorage`, aucun `Set-Cookie` ; elle envoie seulement un pixel `c3po.jpg` avec l'adresse de la page, la taille de la fenêtre et la page de provenance. Journal : `de-claude/metricool-test.md`. `tracker.metricool.com` est autorisé dans `_headers` (`script-src`, `connect-src`, `img-src`). Pas de bandeau cookies : il n'y a pas de cookie. Si Metricool change un jour son script, refaire le test avant tout.

## Formulaire d'estimation

Le formulaire (`/estimation-immobiliere-dijon/`) appelle `/api/lead` :

- `GET /api/lead` répond `{"ready":true}` → la demande est envoyée au Worker `outils/lead-worker.js`, qui la transmet à Shawez par e-mail (et au webhook `LEAD_WEBHOOK_URL` s'il existe). Le visiteur voit « Demande reçue » avec une référence, ou « La transmission automatique n'a pas abouti » avec les boutons WhatsApp et e-mail. Le Worker ne stocke rien.
- Pas de Worker, ou Worker non configuré → envoi par WhatsApp ou e-mail depuis l'appareil du visiteur (comportement d'origine). Aucune donnée n'est envoyée avant de savoir que le Worker est prêt.

Mise en service du Worker (une fois) :

1. Cloudflare → **Compute** › **Email Service** › **Email Routing** → **Onboard Domain** → `shawez-immo.com` → **Done** (enregistrements DNS ajoutés automatiquement).
2. Même page, **Destination Addresses** → saisir `shawez@gravelin-immo.com` → valider, puis cliquer **Verify email address** dans l'e-mail reçu.
3. Cloudflare → **My Profile** › **API Tokens** → **Create Token** → modèle **Edit Cloudflare Workers** → *Account Resources* : le compte de Shawez ; *Zone Resources* : `shawez-immo.com` → **Continue to summary** → **Create Token** → copier le jeton.
4. Cloudflare → **Workers & Pages** : copier l'**Account ID** (colonne de droite).
5. GitHub → dépôt `shawez-lab/shawez-immo` → **Settings** › **Secrets and variables** › **Actions** → **New repository secret** : `CLOUDFLARE_API_TOKEN` (le jeton), puis `CLOUDFLARE_ACCOUNT_ID` (l'identifiant).
6. GitHub → **Actions** → **Déployer le Worker du formulaire** → **Run workflow**. La dernière étape vérifie que `https://shawez-immo.com/api/lead` répond `{"ready":true}`.

Configuration du Worker : `outils/lead-worker.toml` (route `shawez-immo.com/api/lead*`, liaison e-mail `EMAIL`, `LEAD_FROM`, `LEAD_TO`).

## Avis Google

Source unique : **`avis.json`**, à la racine. Le script `outils/avis.py` en tire :

- l'accueil, section « Ce que les autres disent » : note moyenne, nombre d'avis, carrousel de cartes (82 % de la largeur sur mobile, 3 cartes côte à côte sur ordinateur, extrait de 220 caractères au plus) ;
- la page `/avis/` : tous les avis, texte complet ;
- le JSON-LD de l'accueil : un nœud `RealEstateAgent` « Shawez Ali — Agent immobilier » (`#fiche-google`), distinct de celui de l'agence GRAVELIN IMMO, avec `aggregateRating` et `review`. Il n'est ajouté que si `avis.json` contient au moins un avis.

### Format

```json
{
  "fiche": {
    "nom": "Shawez Ali — Agent immobilier",
    "place_id": "ChIJqQpGAKPcg6gRg_CLthoGaP8",
    "note": 5.0,
    "nombre": 24,
    "releve_le": "2026-09-27",
    "lien_avis": "https://www.google.com/maps/search/?api=1&query=…&query_place_id=…",
    "lien_depot": "https://search.google.com/local/writereview?placeid=…"
  },
  "avis": [
    {
      "auteur": "Nom tel qu'affiché sur Google",
      "note": 5,
      "date": "2026-09",
      "texte": "Texte de l'avis, copié tel quel.",
      "lien": "https://… (lien de l'avis sur Google, facultatif)"
    }
  ]
}
```

- `fiche.note` et `fiche.nombre` : la note moyenne et le nombre d'avis affichés par Google sur la fiche, recopiés à chaque mise à jour, avec la date du relevé dans `releve_le`.
- `auteur` : le nom tel que Google l'affiche. Le site n'en montre que le prénom et l'initiale (« Marie Dupont » → « Marie D. »).
- `date` : `AAAA-MM` (ou `AAAA-MM-JJ`). Google affiche souvent une date relative (« il y a 2 semaines ») : noter le mois correspondant.
- `texte` : copié tel quel, sans correction ni coupe. L'accueil coupe lui-même l'extrait ; `/avis/` affiche le texte entier.
- `lien` : facultatif ; à défaut, la carte renvoie vers la fiche.

### Ajouter un avis

1. Ouvrir la fiche Google « Shawez Ali — Agent immobilier », onglet Avis, tri « Plus récents ».
2. Ajouter l'avis dans `avis.json` (l'ordre n'a pas d'importance : le site trie du plus récent au plus ancien, sans tri par note). Mettre à jour `fiche.note`, `fiche.nombre` et `fiche.releve_le`.
3. Depuis la racine du dépôt : `python3 outils/avis.py`. Le script refuse un avis incomplet ou une date mal écrite.
4. Vérifier l'accueil et `/avis/`, puis pousser sur `main`.

### Règles

- Uniquement les avis de la fiche « Shawez Ali — Agent immobilier ». Jamais ceux de la fiche Gravelin Immo.
- Tous les avis, y compris les moins bons ; aucun texte modifié, aucun avis inventé ni sélectionné.

## Annonces de l'agence

Chaque jour à 6 h (heure de Paris), l'action GitHub `.github/workflows/sync-annonces.yml` lance `outils/sync_annonces.py`, puis commit sur `main` s'il y a des changements. Cloudflare republie le site.

Le script lit https://www.gravelin-immo.com/vente/1 à 5 (robots.txt respecté, 2 s entre deux requêtes) et chaque fiche. Il écrit :

- **`annonces.json`**, la source unique : pour chaque référence, le type, la commune et le code postal (jamais l'adresse), le prix, la surface, les pièces, le tableau de caractéristiques, les dépenses d'énergie estimées, les mentions de l'agence, la description expurgée des adresses et des noms, les photos, ainsi que `first_seen`, `last_seen`, `status` et `status_changed`. Il contient aussi la file des posts Google (`posts`).
- **`annonces/<ref>/1.jpg …`** : toutes les photos, en JPG de 1200 px de large, qualité 85, plus `1-600.webp` pour les cartes. Les images qui ressemblent à un plan ou à un document scanné sont écartées. Le dossier est exclu de l'indexation (`robots.txt`).
- **`/biens-a-vendre-dijon/`** : la page des biens, avec les cartes, les filtres par type et par commune, et un JSON-LD `ItemList` + `Offer`. Un clic ouvre la fiche de l'agence dans la page `/biens-a-vendre/?fiche=…`.
- **`de-claude/annonces-google.md`** : la file des posts de la fiche Google, pour Twin.
- **`annonces-log.md`** : le journal des changements.

Statuts :
- « en vente » ;
- « sous compromis » ou « vendu », seulement si l'agence l'affiche ;
- « retirée » (affiché « N'est plus disponible ») pour une annonce disparue sans mention.

Les biens vendus restent dans la grille 60 jours, puis passent dans « Vendus récemment ».

Titres, textes des cartes et textes des posts sont écrits par le script à partir des champs structurés : type, pièces, surface, commune, prix et trois atouts tirés du tableau de caractéristiques. Ils ne reprennent jamais la description de l'agence : ni contenu dupliqué, ni adresse. Un dernier contrôle refuse tout texte qui contiendrait une adresse ou un nom de personne. Les liens vers l'agence sont de la forme `…/vente/<commune>/<type>/<id>-bien/?utm_source=shawez-immo` ; l'agence redirige vers sa fiche.

Exclure une photo (plaque lisible, personne, document) : dans `annonces.json`, mettre sa source à `null` dans `photos.sources` de l'annonce et supprimer le fichier ; le script ne la téléchargera plus. Les photos des nouvelles annonces ne sont contrôlées automatiquement que pour les plans et documents scannés : un coup d'œil reste utile.

Sécurités : si le script trouve 0 annonce, ou moins de la moitié des annonces actives la veille, il ne modifie rien et écrit `de-claude/alerte-sync.md`.

Lancer à la main : `python3 outils/sync_annonces.py`. Pour seulement régénérer la page et la file depuis `annonces.json` : `python3 outils/sync_annonces.py --sans-web`.

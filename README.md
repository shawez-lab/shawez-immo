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

## Espace estimation (/estimer/, /mon-espace/, /admin/)

Estimation en ligne (une question par écran), comptes clients et espace agence. Un seul ensemble pour les deux sites (shawez-immo.com et le site de l'agence) : même module, même API, même base ; chaque demande porte son site (`shawez` ou `gravelin`). Tout est sur le compte Cloudflare de l'agence, rien de payant.

- **Pages** : `python3 outils/espace.py` (relançable) construit `/estimer/`, `/mon-espace/` et `/admin/` sur le gabarit de `/estimation-immobiliere-dijon/`. Sources : `outils/espace/` (`*.html` = contenu de `<main>`, `*.js`, `espace.css`). Le script pose aussi le **pictogramme « Mon espace »** dans l'en-tête de toutes les pages (il mène à `/mon-espace/` et affiche une pastille « connecté »), le lien dans le menu mobile et le pied de page, fait pointer les boutons « Estimer mon bien » vers `/estimer/`, met à jour `_headers`, `robots.txt`, `sitemap.xml`, et refait le module de l'agence (`outils/espace-estimation-gravelin/`).
- **Parcours** : 1 adresse (Base Adresse Nationale) · 2 appartement / maison (ou commerce, murs, immeuble, terrain → rappel) · 3 le bien · 4 atouts · 5 prix idéal (facultatif) · 6 délai · **un seul écran de coordonnées** (civilité, prénom, nom, e-mail, téléphone, accord) → **la fourchette s'affiche tout de suite**. Pas de mot de passe : le compte est créé avec l'e-mail. Le parcours est gardé dans l'onglet (rechargement sans perte) ; un double envoi rend la même demande (clé d'idempotence).
- **Connexion** : lien envoyé par e-mail (30 minutes, usage unique, échangé par la page et non par un simple GET). Mot de passe **facultatif**, proposé après le résultat ou depuis l'espace. Tant que l'envoi d'e-mails aux clients n'est pas ouvert, le résultat s'affiche quand même et le mot de passe est proposé ensuite ; l'agence peut aussi fabriquer un lien de connexion (24 h) à transmettre par WhatsApp ou SMS.
- **Fourchette** (`functions/_lib/estimation.js`) : médiane du prix au m² des ventes DVF comparables les plus proches (même type, surface comparable, 40 au plus), rayon élargi tant qu'il y a moins de 12 ventes ; ajustements bornés (état, époque, étage/ascenseur, extérieur, stationnement) ; ± 5 à 10 % (12 % s'il y a peu de ventes ou s'il a fallu les chercher loin). L'écran montre le nombre de ventes, le rayon (distance de la vente retenue la plus éloignée), la date des données et « indicatif, à confirmer par une visite ». **Moins de 5 ventes, hors Côte-d'Or, adresse non trouvée ou autre type de bien : pas de fourchette, « je vous rappelle sous 24 h ».** Jamais de prix inventé.
- **Données DVF** : `outils/dvf.py`, lancé par `.github/workflows/dvf.yml` (le 5 de chaque mois) → `donnees-dvf/`.
- **Suivi** : à chaque demande, e-mail d'alerte à l'agence (fiche, fourchette, bouton appeler, lien vers la demande) et, si l'envoi aux clients est ouvert, e-mail au client (fourchette, ventes utilisées, la suite, lien vers son espace). `/admin/` : statut (les 10 statuts et 2 sorties, voir plus bas), « rappeler avant le », notes, filtre par site, export CSV, dépôt de l'avis de valeur PDF, liens à transmettre. `/mon-espace/` : avancement (frise des 10 étapes), visite d'estimation, téléchargement de l'avis de valeur, dépôt de photos et de documents (10 Mo par fichier).
- **Google Sheet** : `GET /api/espace/flux/site.csv?cle=…` rend les demandes (date, site, civilité, prénom, nom, téléphone, e-mail, adresse du bien, type, surface, fourchette, délai de vente, prix idéal, statut, prochaine action, notes, référence). Dans l'onglet « Site » du tableau « Relance leads », cellule A1 : `=IMPORTDATA("…")` ; Google relit l'adresse environ toutes les heures. La clé n'est écrite nulle part dans le dépôt (seulement son empreinte) ; `/admin/` → « Google Sheet » en crée une nouvelle et coupe l'ancienne.
- **API** : Pages Functions, `functions/api/espace/[[route]].js` (liste des routes en tête du fichier), base D1 `espace-estimation` liée sous le nom `DB` (Production et Preview). Tables et colonnes créées et mises à jour toutes seules au premier appel (`functions/_lib/base.js`, copie lisible dans `functions/schema.sql`). Session par cookie `se_session` (HttpOnly, Secure, SameSite=Lax, 30 jours) + témoin `se_ok` pour le pictogramme. Contrôle d'origine, validation stricte, limites de débit en base. Robot probable (champ leurre rempli, envoi en moins de 4 s) : la demande est **gardée et signalée**, jamais jetée. `GET /api/espace/sante` : état de la base, des données, de l'e-mail, version.
- **Fichiers** (`functions/_lib/fichiers.js`) : dans la base D1 par blocs de 1 Mo, ou dans R2 si le projet a une liaison `FICHIERS`. JPEG, PNG, WebP, HEIC, PDF, vérifiés sur leur contenu.
- **Admins** : variable `ADMIN_EMAILS` du projet Pages (défaut `shawez@gravelin-immo.com` ; avec Marion : `shawez@gravelin-immo.com,marion@gravelin-immo.com`). Pour entrer : `/mon-espace/` → e-mail → « Recevoir un lien par e-mail » (le compte de l'agence est créé à la première demande). Un compte n'est admin qu'après cette preuve par e-mail ; un mot de passe ou une session posés avant par quelqu'un d'autre sont alors retirés.
- **E-mails** (`functions/_lib/mail.js`) : alertes à l'agence par le Worker `shawez-mailer` (`outils/mailer/`, liaison de service `MAILER`, Email Routing : seules les adresses de destination vérifiées reçoivent — `NOTIFY_EMAILS`). E-mails aux clients : secret `RESEND_API_KEY` (Resend, 3 000 e-mails par mois offerts ; le domaine d'envoi doit y être vérifié), ou Cloudflare Email Sending avec `CLIENT_MAIL = 1` (plan Workers payant). Workers Builds de `shawez-mailer` suit la branche `espace-estimation` : la garder à jour, ou la passer sur `main` (Workers & Pages → shawez-mailer → Settings → Builds).
- **Variables facultatives** du projet Pages : `ADMIN_EMAILS`, `NOTIFY_EMAILS`, `RESEND_API_KEY`, `CLIENT_MAIL`, `MAIL_FROM`, `PBKDF2_ITER`, `SOURCE` (`gravelin` sur le site de l'agence), `FLUX_CLE_SHA256`.
- **Site de l'agence** : `outils/espace-estimation-gravelin/` (un JS, un CSS de thème, mode d'emploi en 10 lignes, pages de démonstration).
- **Tests** : `outils/tests-espace/` (Playwright, iPhone 13 et ordinateur, accessibilité, Lighthouse) ; en ligne par `.github/workflows/tests-espace.yml`.

### Système parfait, étape 2 : statuts, visite d'estimation, avis de valeur

Cible : `cahier-des-charges/systeme-parfait-vendeur-v1.md` (projet Claude). Branche d'aperçu `systeme-parfait` tant que Shawez n'a pas dit oui.

- **Les 10 statuts** (`functions/_lib/base.js`, `PARCOURS`) : Estimation reçue → Appelé → Visite prévue → Avis de valeur envoyé → Mandat signé → Annonce en ligne → Visites en cours → Offre reçue → Compromis signé → Acte signé ; deux sorties : Pas maintenant (date de relance = « rappeler avant le ») et Perdu (raison notée). Chaque changement est écrit au **journal** du dossier (table `evenements` : qui, quoi, quand — c'est lui qui servira à mesurer les 7 promesses) et annoncé au vendeur par un **e-mail court signé Shawez Ali** (`functions/_lib/suivi.js`, `mailStatut`), sauf si la case « annoncer » est décochée ; les deux sorties ne s'annoncent pas. Le lien de ces e-mails ouvre l'espace du vendeur (7 jours, une fois).
- **Dans `/mon-espace/`** : « Étape 3 sur 10 », dix segments, la prochaine étape en une phrase, et la liste des étapes avec leur date.
- **Dans `/admin/`** : chaque dossier affiche sa **prochaine action et son échéance** (`prochaineAction` : appel dans le quart d'heure entre 9 h et 19 h sinon le lendemain 9 h, visite sous 48 h, avis de valeur 24 h après la visite…) ; les actions en retard sont en haut. Les mêmes mots sortent dans le flux Google Sheet (colonnes « statut » et « prochaine action »).
- **Visite d'estimation** : juste après le résultat et dans chaque dossier de son espace, le vendeur propose **jusqu'à 3 créneaux** (lundi-samedi, un début par heure de 9 h à 18 h, 45 minutes, au plus tôt deux heures après ; `GET /api/espace/creneaux`, `POST /api/espace/visite`). L'agence reçoit l'alerte, confirme d'un clic dans le dossier (ou fixe une autre date convenue au téléphone, heure de Paris) : statut « Visite prévue », e-mail de confirmation (date, adresse, quoi préparer, adresse et plan de l'agence), lien « Ajouter à mon agenda Google » (événement prérempli, sans accès au compte). **Rappel la veille à 18 h** : `GET /api/espace/taches`, appelé chaque heure de la soirée par `.github/workflows/taches.yml` (et par le site lui-même au passage des visiteurs) ; chaque rappel ne part qu'une fois.
- **Page de réservation Google Agenda** (facultatif) : `/admin/` → Réglages → coller le lien `https://calendar.app.google/…` ; l'espace du vendeur propose alors ce lien à la place des trois créneaux.
- **Avis de valeur** : dans le dossier, « Préparer l'avis de valeur » → ventes comparables réelles proposées (jusqu'à 20, 12 citées au plus, cases à cocher ; les ventes au prix atypique ne sont pas cochées d'office), notes de visite, atouts, points de vigilance, fourchette, stratégie en 3 points → « Enregistrer et créer le PDF » : le PDF (7 pages, charte du site) est fabriqué **dans le navigateur de l'agence** par `assets/avis/avis-pdf.js` (pdf-lib et fontkit, licence MIT ; polices Familjen Grotesk et Schibsted Grotesk, licence OFL) et déposé comme **brouillon** invisible pour le vendeur → « Valider et envoyer au vendeur » : il devient l'avis de valeur de son espace, statut « Avis de valeur envoyé », e-mail, journal. **Jamais de prix inventé** : la fourchette de l'estimation n'est proposée que s'il y avait au moins 5 ventes comparables ; sinon elle est vide, le PDF dit qu'il y a trop peu de ventes, et sans fourchette saisie par l'agent rien ne se crée ni ne se valide. Relire la mise en page hors navigateur : `node outils/tests-espace/avis-apercu.mjs sortie.pdf` (ou `… sortie.pdf peu`).
- **Détail des ventes DVF** : `outils/dvf.py` écrit aussi `donnees-dvf/d/` (prix signé, voie sans numéro, commune, jour), ligne pour ligne avec les tuiles ; lu seulement pour l'avis de valeur.
- **Base** : tables `evenements`, `visites`, `avis` et colonnes `demandes.raison`, `demandes.statut_le`, ajoutées à côté des autres sans rien modifier (version notée à part, réglage `schema_sp`). **L'aperçu et le site en ligne partagent la même base** : un dossier modifié dans l'aperçu est le vrai dossier.
- **Tests** : `08-visite-statuts`, `09-avis-de-valeur`, `10-accessibilite-etape2` (locaux), et « étape 2 » dans `apercu.spec.mjs` (en ligne, côté vendeur).

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

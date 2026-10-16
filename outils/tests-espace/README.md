# Tests de l'espace estimation

Playwright, sur deux appareils : iPhone 13 et ordinateur. Rien n'est envoyé à qui que ce soit pendant les tests.

## En local (rien n'est écrit dans la vraie base)

```
cd outils/tests-espace
npm ci && npx playwright install chromium
node serveur.mjs          # dans un terminal : le site ×2 et une fausse boîte d'envoi
npx playwright test       # dans un autre : toute la série
node lighthouse.mjs       # Lighthouse mobile sur /estimer/, médiane de 3 passages, seuil 90
node avis-apercu.mjs avis.pdf   # l'avis de valeur PDF avec des données d'exemple, pour relire la mise en page
```

`serveur.mjs` lance : le site avec e-mails aux clients (port 8788 ; les e-mails tombent dans la fausse boîte du port 8790),
le site sans aucun e-mail et avec les vrais plafonds de débit (port 8789), et le site comme en production aujourd'hui :
l'agence reçoit ses e-mails, les vendeurs aucun (`CLIENT_MAIL = 0`, port 8791).
La recherche d'adresses est remplacée par des adresses de test (`tests/aides.mjs`).

| Fichier | Ce qu'il vérifie |
|---|---|
| `01-parcours` | chaque étape, Retour, erreurs de saisie, rechargement, double clic, réseau lent ou coupé, accents et bis/ter, appartement, maison, commerce, moins de 5 ventes, résultat immédiat sans mot de passe |
| `02-connexion` | **le parcours qui échouait** (estimation → accueil → pictogramme → connecté), pictogramme sur toutes les pages, lien de connexion (30 min, usage unique), mot de passe facultatif, mot de passe oublié, déconnexion, e-mails au client et à l'agence, protection contre l'ouverture d'un compte avec l'e-mail d'un autre |
| `03-suivi` | /admin/ refusé aux non-admins, statut, « rappeler avant », notes, filtres, export CSV, avis de valeur PDF, photos et documents (types, 10 Mo), flux Google Sheet, liens à transmettre |
| `04-sans-email` | le site sans e-mail aux clients : résultat immédiat, mot de passe en option après ; champ leurre, envoi trop rapide, limites de débit |
| `05-api` | origine des requêtes, validation, texte jamais exécuté, droits sur les fichiers |
| `06-accessibilite` | règles WCAG A et AA (axe-core) sur chaque écran, libellés, parcours au clavier, focus visible |
| `07-gravelin` | le même module à la charte de l'agence (`outils/espace-estimation-gravelin/`) |
| `08-visite-statuts` | visite d'estimation : 3 créneaux proposés après le résultat, alerte à l'agence, confirmation d'un clic, e-mail de confirmation (quoi préparer, plan de l'agence), déplacement, rappel la veille à 18 h (une seule fois) ; les 10 statuts : frise du vendeur, prochaine action et retard, e-mail court à chaque changement, sorties sans e-mail, journal, Google Sheet ; droits et validation |
| `09-avis-de-valeur` | avis de valeur : ventes DVF réelles (prix signés), choix des ventes citées, PDF de 6 à 10 pages fabriqué dans la page, brouillon invisible pour le vendeur, validation en un clic (statut, espace, e-mail, journal) ; moins de 5 ventes : pas de fourchette proposée, rien sans celle de l'agent |
| `10-accessibilite-etape2` | règles WCAG A et AA sur les nouveaux écrans ; choix d'un créneau au clavier |
| `11-apres-mandat` | après le mandat : comptes rendus de visite (brouillon, publié, corrigé, supprimé ; le dossier passe à « Visites en cours »), offres (le dossier passe à « Offre reçue », prochaine action chiffrée et datée, acceptée ou refusée), notaire (étapes, date de l'acte), documents (nature) ; ce que voit le vendeur ; droits ; **heures calmes** (rien ne part au vendeur entre 21 h et 8 h, tout part à 8 h, une seule fois) ; /admin/ ouvert par un lien reçu par e-mail ; règles WCAG A et AA ; captures `etape3-*` |
| `12-promesses` | la mesure des 7 promesses : les règles sur un jeu de dossiers écrit à la main (chaque chiffre attendu est compté à la main) ; un vrai dossier suivi de l'estimation au mandat dans l'export CSV (tenue, en cours, ratée, avec l'heure du serveur de test avancée) ; la page `/admin/promesses/` (sept cartes, 7 et 30 jours, ce qu'il faut regarder, export), y compris nourrie par le jeu compté à la main (capture d'exemple `etape4-*-exemple`) ; le flux à clé pour le Google Sheet (sept lignes, aucun nom) ; droits ; règles WCAG A et AA ; captures `etape4-*` |
| `13-rdv-express` | rendez-vous en 2 clics sans estimation (accueil, /contact/, /merci/) : « Prendre rendez-vous » en haut de l'accueil, créneau libre (clic 1), confirmation (clic 2), erreurs de saisie, alerte à l'agence, demande et visite dans /admin/, créneau retiré pour les autres (demandé ou fixé), créneau pris entre-temps, dimanche refusé ; agenda Google iCal (moments pris, marge de trajet, répétitions, annulations) ; réglage réservé à l'agence ; WCAG A et AA ; rien ne dépasse de l'écran ; captures `rdv-*` |
| `16-aujourdhui-relance` | créneaux de visite du lundi au vendredi, 9 h – 12 h et 14 h – 19 h (jamais le samedi, ni 12 h, ni 13 h) ; « Pas maintenant » sans date : relance posée d'office trois mois plus tard (jour ouvré, fin de mois), dans la page comme par l'API, une date choisie est gardée, le jour venu « Relancer » est en retard et dans « Aujourd'hui » ; **« Aujourd'hui »** : qui appeler, qui prévenir, ce qui est en retard, ce qui a été fait depuis hier — la règle sur les dossiers rendus par le serveur (un dossier dans un seul groupe, jamais un essai), la carte en haut de /admin/ (un nom ouvre le dossier, la carte suit chaque action), le flux à clé pour l'agent du matin (texte en quatre lignes, CSV, fermé sans clé) ; règles WCAG A et AA ; captures `aujourdhui-*` |
| `90-captures` | captures de chaque étape et du résultat → `captures/` ; rien ne dépasse de l'écran |
| `14-dossier-agence` | dossier ouvert à la main par l'agence (vendeur venu par téléphone, recommandation, mandat déjà signé) : le formulaire de /admin/, les 10 statuts de départ, jamais de fourchette ; l'espace du vendeur ouvert avec son e-mail, le lien à lui envoyer par WhatsApp, SMS ou e-mail (message déjà écrit, 7 jours, une seule ouverture), l'e-mail « Votre espace est ouvert » (jamais entre 21 h et 8 h) ; dossier sans espace puis ouvert ; espace déjà existant (adresse jamais prouvée : le dossier attend le lien, un intrus ne le voit jamais) ; promesses 1 et 2 hors mesure ; Google Sheet ; droits, validation, double envoi ; règles WCAG A et AA ; captures `dossier-*` |
| `15-prevenir-corriger` | **promesse 7 quand l'e-mail ne peut pas partir** (envoi aux vendeurs fermé, vendeur sans espace) : la nouvelle reste « à dire » dans le dossier, le message est déjà écrit (les mots de l'e-mail, le lien de son espace s'il en a un, jamais un espace qu'il n'a pas, jamais de montant), WhatsApp, SMS ou e-mail s'ouvrent avec ; le dossier note « prévenu » (« Ce n'est pas parti » le retire) et la promesse 7 est tenue, « déclaré par l'agence » ; seule la dernière étape reste à dire, la visite déplacée ou annulée suit ; **dossier corrigé après coup** : nom, téléphone, e-mail (espace jamais ouvert : le dossier passe à la bonne adresse ; déjà ouvert : refusé), adresse, type et surface (figés quand une fourchette en ligne a été calculée dessus), journal ; droits et validation ; règles WCAG A et AA ; captures `prevenir-*` |

## Sur le site en ligne

`tests/apercu.spec.mjs` (configuration `apercu.config.mjs`), lancé par GitHub Actions (`.github/workflows/tests-espace.yml`)
à chaque poussée qui touche l'espace estimation : sur l'aperçu pour la branche `espace-estimation`, sur shawez-immo.com pour `main`.
Vraie recherche d'adresses, vraie base ; e-mails d'essai en `@test.invalid` (le site ne leur écrit jamais, n'alerte pas l'agence,
ne les met pas dans le Google Sheet) ; chaque essai supprime son compte. Le journal contient le tableau des 10 adresses.

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
et le site comme en production aujourd'hui, sans e-mail aux clients et avec les vrais plafonds de débit (port 8789).
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
| `90-captures` | captures de chaque étape et du résultat → `captures/` ; rien ne dépasse de l'écran |

## Sur le site en ligne

`tests/apercu.spec.mjs` (configuration `apercu.config.mjs`), lancé par GitHub Actions (`.github/workflows/tests-espace.yml`)
à chaque poussée qui touche l'espace estimation : sur l'aperçu pour la branche `espace-estimation`, sur shawez-immo.com pour `main`.
Vraie recherche d'adresses, vraie base ; e-mails d'essai en `@test.invalid` (le site ne leur écrit jamais, n'alerte pas l'agence,
ne les met pas dans le Google Sheet) ; chaque essai supprime son compte. Le journal contient le tableau des 10 adresses.

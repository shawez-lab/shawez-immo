# Audit de l'espace agence (/admin/) et de l'espace client (/mon-espace/) — 18/10/2026

Branche `admin-audit-2026-10-18`. Tout a été testé en local (wrangler pages dev, base D1 locale créée pour l'occasion,
comptes d'essai en `@exemple-test.fr`, fausse boîte d'envoi). Aucune ressource de production touchée, aucun e-mail envoyé.

## Ce qui a été trouvé

Gravité : **haute** = risque pour les données ou l'accès ; **moyenne** = parcours cassé ou gênant ; **basse** = confort.

| # | Gravité | Problème | Corrigé |
|---|---|---|---|
| 1 | haute | Le code de l'API et le schéma de la base étaient servis comme de simples fichiers (`/functions/schema.sql`, `/functions/_lib/base.js`…), le site étant publié depuis la racine du dépôt. Aucun secret dedans, mais tout le fonctionnement interne était lisible. | Oui : `functions/functions/[[path]].js` répond 404, comme pour `/outils/`. |
| 2 | haute | `outils/espace.py` recopiait la balise de mesure d'audience (Metricool) dans `/admin/` et `/mon-espace/` ; seul `build.py`, lancé après coup par GitHub Actions, la retirait. Entre les deux, une page privée ouverte avec un lien de connexion (`?lien=…`) envoyait son adresse chez Metricool. | Oui : retirée dès la construction, et retirée encore au moment de servir la page (n° 3). |
| 3 | haute | Pages privées sous la politique de sécurité du site entier : scripts en ligne autorisés sans contrôle, service tiers autorisé. Un texte mal échappé un jour aurait suffi à exécuter du code dans l'espace agence. | Oui : politique stricte à « nonce » tiré à chaque affichage (`functions/_lib/pages-privees.js`), aucun tiers, jamais dans un cadre, jamais en cache, aucune provenance transmise. |
| 4 | haute | Le lien de connexion (`?lien=…`) et le lien « nouveau mot de passe » (`?reinit=…`) restaient dans la barre d'adresse le temps de l'échange (historique, capture d'écran) ; le lien « nouveau mot de passe » y restait pendant toute la saisie. | Oui : retirés de l'adresse dès l'ouverture de la page. |
| 5 | haute | Session de l'agence de 30 jours, comme un client, alors qu'elle ouvre tous les dossiers. | Oui : 7 jours sans visite pour l'agence (prolongée à chaque passage) ; 30 jours sans visite pour un client. |
| 6 | moyenne | Session « fixe » de 30 jours : un vendeur actif était déconnecté au 30e jour, en plein milieu. Session expirée pendant le travail : seul un petit message « reconnectez-vous » dans un coin, la page restait affichée comme si de rien n'était (actions qui échouent l'une après l'autre). | Oui : session glissante ; dès qu'une action répond « session expirée », la page revient à la connexion avec un message clair ; le témoin « connecté » du pictogramme est retiré en même temps. |
| 7 | moyenne | Aucun bouton « Me déconnecter » dans `/admin/` ; connecté avec un compte client, l'écran « Ce compte n'a pas accès » n'offrait aucun moyen de changer de compte. | Oui : « Me déconnecter » dans la barre de l'agence et sur l'écran de refus. |
| 8 | moyenne | Lien « nouveau mot de passe » ouvert alors qu'on était déjà connecté : le formulaire ne s'affichait pas et le lien était perdu sans rien dire. | Oui. |
| 9 | moyenne | Déconnexion : si le réseau coupait, la page partait quand même comme si c'était fait (la session restait ouverte). | Oui : l'erreur est dite. |
| 10 | moyenne | Confirmations des actions irréversibles (supprimer une demande, un compte, un fichier, une visite, une clé Google Sheet) : le premier clic armait le bouton pour toujours ; un clic oublié pouvait supprimer plus tard d'un seul clic. | Oui : le bouton se désarme seul au bout de 8 secondes, le texte dit exactement ce qui sera effacé. |
| 11 | moyenne | Notes, statut ou date de rappel modifiés sans « Enregistrer » : perdus sans prévenir en quittant ou en actualisant. | Oui : « Modifications non enregistrées » et alerte avant de quitter. |
| 12 | moyenne | L'API permettait à l'agence de supprimer le compte d'une autre adresse de l'agence (bouton masqué, mais pas le contrôle côté serveur) ; supprimer une demande inexistante répondait « OK ». | Oui : refusé côté serveur ; 404 pour une demande inexistante. |
| 13 | moyenne | RGPD : pas de moyen pour le client de récupérer ses données (droit d'accès et de portabilité) ; pas de trace des exports et suppressions faits par l'agence. | Oui : « Télécharger mes données » (fichier JSON) ; journal de l'agence (actif après la migration, voir plus bas). |
| 14 | basse | Connexion par mot de passe : réponse plus rapide quand l'adresse n'existe pas (le temps de réponse disait si un compte existait). | Oui : même calcul dans tous les cas. |
| 15 | basse | Réponses de l'API sans `nosniff` ni interdiction d'affichage dans un cadre. | Oui. |
| 16 | basse | Tableau de bord : chiffres non cliquables ; toute la liste (jusqu'à 2 000 dossiers avec leurs formulaires) redessinée à chaque lettre tapée ; filtres perdus au rechargement ; pas de « Actualiser » ; pas de nombre de résultats. | Oui : vues rapides cliquables (retards, visites à confirmer, visites prévues, nouvelles, à rappeler), recherche qui attend la fin de la frappe, pages de 40 dossiers, filtres gardés dans l'onglet, « Masquer les essais », nombre de dossiers affichés, « Mis à jour à … », touche « / » pour chercher. Sur téléphone, les vues rapides tiennent sur deux lignes. |
| 17 | basse | Boutons sans état « en cours » (mot de passe oublié, nouveau mot de passe, suppression de l'espace) : double envoi possible. Bouton « Supprimer définitivement » de la même couleur qu'une action ordinaire. | Oui. |
| 18 | basse | Reconstruire les pages (`outils/espace.py`) effaçait les données structurées de `/estimer/` et la règle Metricool « sans paramètre ». | Oui : gardées. |

Vérifié et **sain** (rien à changer) : cookie de session HttpOnly + Secure + SameSite=Lax, seule l'empreinte des jetons et
des sessions est en base, liens à usage unique (30 min), contrôle de l'origine de toute requête qui modifie (protection
CSRF), limites d'essais en base, mots de passe PBKDF2 salés, droits côté serveur sur chaque route (un client ne voit que
ses dossiers et ses fichiers, jamais un brouillon), l'adresse de l'agence ne donne rien sans preuve par e-mail, échappement
de tout texte affiché, export CSV protégé contre les formules, WCAG 2.2 AA (axe-core : aucune violation sur la connexion,
l'espace client, le tableau de bord, un dossier ouvert, les réglages et les 7 promesses, ordinateur et iPhone), rien ne
dépasse de l'écran sur téléphone.

## Limites connues (pas corrigeables dans le code)

- **PBKDF2 à 100 000 tours** : c'est le maximum accepté par Cloudflare Workers ; la recommandation 2026 pour PBKDF2-SHA256
  est plus haute. Le risque reste faible (la connexion par lien reçu par e-mail est la voie normale, le mot de passe est
  facultatif, les essais sont limités).
- **La page de connexion dit si une adresse a un mot de passe** (pour proposer le bon écran) : choix d'ergonomie voulu,
  limité à 30 essais par heure et par adresse IP.
- **Export RGPD** : les notes internes de l'agence n'y sont pas ; le fichier indique comment demander une copie complète
  (droit d'accès). À trancher si besoin : les y mettre.

## À faire en production (après relecture, par le Boss)

1. **Fusionner la PR** dans `main` : Cloudflare Pages publie tout seul. Rien d'autre n'est nécessaire pour que les
   corrections marchent.
2. **Migration D1** (facultative, ajouts seulement : la table `journal_agence` et des index) :
   `npx wrangler d1 execute espace-estimation --remote --file functions/migrations/2026-10-18-admin.sql`
   Vérifier ensuite : `/admin/` → Réglages → « Journal de l'agence » → « Afficher le journal ».
3. **Aucun secret à créer**, aucune variable à changer, aucun DNS.
4. **Après la fusion** : l'agence est déconnectée au bout de 7 jours sans visite (au lieu de 30) ; il suffit de redemander
   le lien sur `/admin/`.
5. **Texte public à ajuster** (hors du périmètre de cette branche) : la politique de confidentialité, section « Estimation
   en ligne et espace client », dit « connecté pendant 30 jours au plus » ; écrire plutôt « jusqu'à 30 jours après votre
   dernière visite », et ajouter « Vous pouvez aussi télécharger toutes vos données depuis Mon espace (« Télécharger mes
   données ») ».

## Tests

- `cd outils/tests-espace && npm run test:node` : 21 tests node (authentification, sessions, droits, pages privées, RGPD,
  migration) — tous passent. Lancés aussi par GitHub Actions sur chaque demande de fusion (job `node-local`).
- La série Playwright existante (`npx playwright test`, après `node serveur.mjs`) : ordinateur 93 réussis, iPhone 13
  96 réussis, aucun échec (les tests ignorés le sont aussi sur `main`). Un test visait l'ancien emplacement du lien
  « Les 7 promesses » : mis à jour. PR : https://github.com/shawez-lab/shawez-immo/pull/9

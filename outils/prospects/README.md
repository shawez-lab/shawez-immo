# Relais Google Apps Script vers Cloudflare

Le script prive appartient au compte de Shawez. Il lit exclusivement les trois feuilles autorisees avec le service Sheets en lecture seule, calcule les empreintes et pousse un lot unique vers /api/prospects-relais. Aucun compte de service, cle API, refresh token ou cookie de navigateur. Les vrais identifiants des feuilles sont injectes uniquement dans le projet Google prive ; le depot ne contient que Code.gs.template.

Le manifeste demande spreadsheets.readonly, openid, userinfo.email, external_request et script.scriptapp. Le compte autorise une fois cette application dans Google. L'API Cloudflare verifie cryptographiquement le jeton Google, son expiration, le proprietaire et l'audience du projet exact, configuree dans veille_drive_relais. L'audience est un identifiant public de client OAuth, pas un secret. Aucun jeton n'est conserve ni journalise. Les feuilles ne sont jamais partagees publiquement.

Le lot contient seulement les trois index de controle pseudonymises, leurs references de ligne et leur couverture. Le serveur verifie leur structure et leurs liens contre la configuration privee D1, puis les remplace atomiquement. Une source manquante ou un lot incorrect ne remplace rien. L'identifiant d'execution assure l'idempotence. Le resultat complet=true exige en plus une veille interne en etat ok.

installerEtTester effectue un passage complet puis installe un declencheur quotidien, cible 07:40 Europe/Paris. Google documente une marge de plus ou moins 15 minutes pour nearMinute. La veille Cloudflare de 08:07 controle la reception du lot du jour. Un simple vieux releve encore frais ne suffit pas a declarer le jour complet. Aucun ordinateur n'a besoin de rester allume.

La commande node outils/prospects/test.mjs couvre les sources internes, les controles postaux, les avis et l'attribution, puis la chaine Apps Script simulee avec verification RSA, expiration, audience, proprietaire, idempotence, rejet des donnees brutes et remplacement atomique. Une simulation complete ne remplace pas le test reel apres autorisation Google.

Les avis Google restent inactifs pour les clients tant que leur activation n'est pas autorisee et le transport client verifie. Le lien et le QR existants restent utilises. Les interactions ManyChat ne sont attribuees que si leur media_id reel est recu ; aucun identifiant ne doit etre deduit d'un simple mot-cle.

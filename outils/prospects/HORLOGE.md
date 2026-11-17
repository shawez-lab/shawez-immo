# Horloge de la veille des entrants

Le Worker Cloudflare `shawez-prospects-horloge` appelle `/api/prospects?job=1` vers 08 h 07 dans le fuseau du compte Asia/Karachi. Depuis la réorientation du 18 novembre 2026, la route lit exclusivement nos dossiers, mails vendeurs, commentaires et DM, mesures Google disponibles et registre postal interne. Aucun import ni flux de pige. Aucune émission de message ou d'appel. Voir README.md pour la couverture et les limites.

Le Worker et son déclencheur restent versionnés dans horloge.js et wrangler.toml. Le workflow GitHub reste un secours. Aucun ordinateur local nécessaire. Pour changer de fuseau, modifier le déclencheur UTC et PROSPECTS_TIMEZONE sur Pages ensemble.

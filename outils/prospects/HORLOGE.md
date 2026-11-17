# Horloge Cloudflare des prospects

Le Worker `shawez-prospects-horloge` déclenche `/api/prospects?job=1` chaque jour à 03 h 07 UTC, soit 08 h 07 dans le fuseau actuel du compte Asia/Karachi. Il n'a ni accès direct aux coordonnées, ni liaison D1, ni secret supplémentaire. Le traitement et les exclusions restent dans les fonctions du site. Deux déclenchements le même jour ne doublent pas les annonces.

Son code est dans `horloge.js`, sa configuration dans `wrangler.toml`. Le Worker est raccordé au dépôt existant depuis le tableau Cloudflare, branche main, commande `npx wrangler deploy --config outils/prospects/wrangler.toml`, avec des builds limités à `outils/prospects/**` et sans aperçu. Il ne dépend pas de l'ordinateur de Shawez ni du planificateur GitHub. Le workflow GitHub reste un secours ; ses échecs historiques liés à la facturation du compte ont motivé cette horloge indépendante.

Une réponse `sans_source_autorisee` signifie que le passage a eu lieu mais qu'aucun flux autorisé n'est raccordé. Elle ne signifie pas absence de vendeurs. Les réponses HTTP en erreur ou les états erreur/partiel provoquent une erreur du Worker, visible dans Cloudflare. Aucun message de prospection n'est envoyé.

Pour changer de fuseau, modifier à la fois `PROSPECTS_TIMEZONE` sur le projet Pages et les crons de cette configuration. Les Cron Triggers Cloudflare sont en UTC. Les déclencheurs peuvent prendre plusieurs minutes à se propager après déploiement.

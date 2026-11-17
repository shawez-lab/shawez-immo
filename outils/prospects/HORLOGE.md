# Horloge Cloudflare

Worker : shawez-prospects-horloge, déployé automatiquement depuis outils/prospects/wrangler.toml. Fuseau métier Europe/Paris, y compris les dates affichées dans la veille mobile.

- 07:40 : lecture serveur des trois feuilles privées.
- 08:07 : veille entrante.
- 08:17 à 19:17 : traitement horaire des avis, si activé.
- Les passages Reels existants restent conservés.

Les déclencheurs Cloudflare utilisent UTC. Le code filtre l’heure de Paris pour gérer été et hiver sans doublon. Aucun appel au Mac, à Codex ou au navigateur. L’ancienne tâche Codex locale est en pause.

Les secrets d’accès Google sont indispensables. Sans eux, le traitement conserve le dernier relevé et ne déclare jamais une synchronisation complète. Une répétition rapprochée garde le même état d’échec ; une nouvelle tentative est possible après 15 minutes.

Les avis exigent aussi un transport réellement capable d’écrire aux clients et AVIS_GOOGLE_ACTIF=1. Les tests n’envoient aucun message réel. Consulter README.md pour les accès et limites.

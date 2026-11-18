# Horaires Europe/Paris

Google Apps Script : declencheur quotidien ciblant 07:40, marge native Google de 15 minutes. Lecture des trois feuilles et envoi d'un lot authentifie vers Cloudflare.

Cloudflare : veille a 08:07, avis de 08:17 a 19:17 si actives. Les passages Reels existants sont conserves. Les crons UTC sont filtres par l'heure de Paris, ete/hiver compris.

Le traitement Cloudflare ne tente plus de connexion Google avec un compte de service. Il verifie le lot Apps Script recu dans la journee. Sans lot valide, complet=false. Les derniers index sont conserves et leur age est affiche.

La tache Codex locale reste desactivee. Aucun navigateur, ordinateur ou copie manuelle de cle n'est necessaire apres l'autorisation Google initiale.

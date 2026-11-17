# Traitements Cloudflare de la relation entrante

Horaires métier Europe/Paris, changement d’heure inclus : lecture des trois feuilles privées à 07:40, veille à 08:07, avis Google chaque heure entre 08:00 et 20:00. Le Worker natif conserve également les passages Reels existants. Aucun ordinateur, navigateur ou tâche Codex n’est nécessaire au traitement serveur.

## Accès Google permanent indispensable

Le code lit uniquement les trois liens déjà configurés dans la table privée veille_drive_controles. Aucun lien privé ni export brut ne doit être committé. Deux configurations serveur possibles dans les secrets Pages : GOOGLE_SHEETS_SERVICE_ACCOUNT avec le JSON du compte de service autorisé à lire ces trois fichiers, ou GOOGLE_SHEETS_CLIENT_ID, GOOGLE_SHEETS_CLIENT_SECRET et GOOGLE_SHEETS_REFRESH_TOKEN pour une autorisation OAuth hors ligne. Le scope utilisé pour le compte de service est spreadsheets.readonly. Les requêtes Sheets de cette application sont exclusivement GET. Ne pas rendre les feuilles publiques. Ne jamais reprendre un cookie ou un jeton du navigateur. La création de l’identité Google, son autorisation et la pose du secret sont un raccordement distinct à effectuer dans les consoles autorisées.

Les métadonnées et tous les onglets sont lus avant un remplacement atomique des trois index. Un refus Google, une source vide, un en-tête inconnu ou une couverture dépassant les limites bloque la mise à jour et conserve le relevé précédent. veille_drive_passages trace le résultat sans coordonnées ni jeton. Les index restent des données personnelles pseudonymisées dans D1, protégées par l’accès agence. Le relevé devient incomplet après 48 heures ; les STOP connus restent bloquants. Les appels publics des tâches ne renvoient aucun contact.

## Avis Google

Lien et QR existants conservés dans assets/avis-google. Le lien utilisé est celui de LISEZMOI.txt. Le premier passage initialise le curseur des événements sans relancer l’historique. Les changements de statut mandat/compromis/acte servent de déclarations de signature. Une visite doit être explicitement confirmée avec le dossier de la personne accompagnée dans l’admin. Un rendez-vous prévu ou un compte rendu au vendeur n’est pas une preuve de visite de l’acquéreur.

Le traitement prépare la file même lorsque l’envoi est arrêté. L’envoi exige AVIS_GOOGLE_ACTIF=1, un transport existant qui peut réellement écrire aux clients et des contrôles Drive à jour. La liaison Email Routing actuelle ne permet pas d’envoyer à des adresses non vérifiées ; CLIENT_MAIL=1 ne débloque pas à lui seul cette limite fournisseur. Aucune dépense ou souscription n’est créée.

Une seule demande par e-mail sur 30 jours, aucune nouvelle demande après avis reçu. Une seule relance à J+3, même heure civile de Paris, puis arrêt. Pas de relance après opposition ou avis déclaré reçu. Un clic sur le lien Google ne prouve jamais un avis publié. Envoi ambigu ou interrompu : a_verifier, aucune reprise automatique pouvant doubler le message. Les messages acceptent les avis positifs ou critiques et n’offrent aucune contrepartie.

## Attribution des Reels

La requête externe ManyChat doit envoyer media_id sous forme de chaîne contenant le vrai identifiant natif présent dans le registre, y compris sa forme numérique composite avec suffixe de compte, séparément de post qui conserve la clé de contenu. Pas de conversion depuis un nombre JavaScript ni de déduction à partir d’un mot-clé. Les variables non résolues et les shortcodes sont refusés comme media_id. Les automatismes « tous les Reels » qui ne fournissent pas cet identifiant restent sans attribution précise.

Quand le média est transmis, le lien d’estimation contient un jeton opaque valable 30 jours. La demande déposée est rattachée dans demandes_reels_attribution, sans nom, adresse ou identifiant Instagram dans l’URL. Un commentaire, une interaction et une demande déposée restent trois mesures distinctes. Le premier rattachement d’une demande est conservé lors des reprises. Les flux ManyChat doivent être vérifiés dans leur interface avant publication ; aucune variable média disponible n’est supposée.

## Vérifications

node outils/prospects/test.mjs lance les contrôles historiques puis test-autonomie.mjs. Le passage complet simulé couvre les trois sources, l’atomicité et les erreurs Google, les horaires été/hiver, les déclencheurs d’avis et leur destinataire, l’arrêt des relances et l’attribution jusqu’au lead. Aucun message réel n’est envoyé par les tests. Un test simulé ne vaut pas validation d’un accès Google réel ni d’une livraison client réelle.

Le diagnostic ManyChat action=controle_attribution vérifie le media_id reçu contre reels_registre, sans écrire de conversation ni envoyer de message. Il utilise l’authentification habituelle du webhook.

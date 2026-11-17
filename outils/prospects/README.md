# Veille des entrants

La mission est réorientée le 18 novembre 2026 : données internes uniquement. Aucun flux de pige, import d'annonces, extraction de portail ou prospection à froid. L'ancienne configuration `PROSPECTS_SOURCES_JSON` est ignorée et le code d'import a été supprimé. Aucun abonnement acheté.

## Sources et données

La page `/admin/prospects/` et son API lisent les dossiers `demandes`, les mails vendeurs de `leads_tri`, les derniers messages de `dm_fil` et les commentaires de `ig_commentaires`. Les STOP de `dm_stop` et les exclusions privées de la règle 9 s'appliquent avant affichage. Le tableau ne recopie pas les coordonnées dans une nouvelle base de prospects. Il n'envoie aucun message et n'appelle aucun numéro.

Les demandes explicites dans le dernier message ou le commentaire sont repérées par des mots liés à la vente ou à l'estimation. Ce repérage est conservateur : il ne détecte pas tous les projets et ne permet pas de décider d'une séquence commerciale. Un message automatique enregistré ne prouve pas une prise en charge humaine. La marque « Traitement vérifié » porte sur un message ou une demande précise ; un nouveau DM reste visible.

Les sources absentes ou au schéma incompatible sont signalées, jamais remplacées par un zéro. La lecture couvre 90 jours, avec un plafond indiqué par source. Le résumé quotidien ne conserve que des compteurs et des états, sans nom, adresse ou contenu de conversation.

## Courriers

`veille_postal` enregistre uniquement des envois réellement effectués rattachés à nos dossiers, avec une référence de registre, une date et un retour déclaré. Aucun champ d'annonce n'est accepté par l'API. Le fichier historique des courriers envoyés n'a pas été retrouvé ; son lien est demandé au responsable. Le registre vide ne signifie pas qu'aucun courrier n'a jamais été envoyé.

La table existante `courriers` contient les e-mails différés du site, pas des courriers papier : elle est volontairement exclue du calcul. Créer un lien personnel, imprimer une lettre ou scanner un QR ne prouve pas un envoi ni une demande d'estimation.

Si le module postal est publié, les demandes volontaires de `avis_prospects_demandes` sont rapprochées des envois par référence interne exacte. Seul le plus récent envoi antérieur à une demande reçoit cette attribution. Aucun rapprochement d'identité externe. Les demandes QR non rapprochées sont comptées séparément. Une opposition postale enregistrée empêche la déclaration d'un nouvel envoi vers le même dossier.

## Fiche Google

La page utilise le relevé public déjà conservé dans `avis.json`, avec sa date. Il n'est pas présenté comme une mesure actuelle. Si le module Google alimente `google_mesures`, ses relevés sont lus. Les auteurs d'avis ne sont pas convertis en prospects. Les demandes d'avis et la relance J+3 restent un module distinct et ne sont jamais déclenchées par cette veille.

## Courrier et consentement

Le courrier postal est une voie à tester si l'origine des coordonnées est licite, l'information et l'opposition assurées. Un QR personnel doit reposer sur un jeton opaque et expirable, sans nom ni adresse dans l'URL. Une demande volontaire permet d'y répondre dans son objet ; elle ne vaut pas accord commercial général sur tous les canaux. Les séquences commerciales doivent conserver leurs consentements distincts, leur preuve et leur retrait.

Références : https://www.cnil.fr/fr/la-prospection-commerciale et https://www.economie.gouv.fr/dgccrf/actualites-dgccrf/le-demarchage-telephonique-desormais-interdit-si-vous-ny-avez-pas-consenti . Aucun mécanisme Bloctel n'est utilisé pour autoriser un appel.

## Exploitation et tests

Le Worker `shawez-prospects-horloge` appelle toujours `/api/prospects?job=1`, mais la route ne lit plus que nos sources. Passage vers 08 h 07 dans le fuseau actuel du compte Asia/Karachi. Il ne dépend pas de l'ordinateur de Shawez. Le job est idempotent ; les erreurs et interruptions peuvent être reprises après 30 minutes.

`node outils/prospects/test.mjs`, Node 24 et SQLite natif : accès agence, origine, exclusions, STOP, zéro accès réseau externe même si une ancienne configuration de pige existe, demande explicite, attribution postale sans double comptage, nouveau DM après traitement et résumé quotidien sans coordonnées.

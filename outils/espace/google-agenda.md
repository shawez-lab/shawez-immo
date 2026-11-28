# Google Agenda — synchronisation des visites

## Fonctionnement

- Une demande de visite d'un bien ou de rendez-vous express, avec un seul créneau, produit un événement **À confirmer**.
- La confirmation de l'agence conserve le même événement et lui donne le statut confirmé ; le déplacement met à jour les horaires. L'annulation, le retrait du créneau ou la suppression du dossier retire l'événement correspondant.
- Une estimation avec plusieurs créneaux n'est ajoutée qu'après confirmation par l'agence.
- La base D1 du site reste la source de vérité. Un identifiant d'événement Google est conservé par demande ; les reprises ne doivent pas créer de doublons. Les tâches existantes réessaient les opérations interrompues. Les événements historiques confirmés ne sont pas supprimés uniquement parce que leur date est passée.
- Le calendrier doit être celui de l'agence : les événements sont privés, sans ajout d'invités ni envoi d'invitations Google. Le parcours de confirmation et les notifications client existants restent inchangés.
- Le code n'écrit rien depuis un aperçu Cloudflare ni en l'absence d'autorisation configurée.

## Mise en service (administrateur)

1. Utiliser un projet Google Cloud avec l'API Google Calendar activée et un client OAuth 2.0 adapté à une application serveur. Autoriser le compte propriétaire de l'agenda cible avec accès hors ligne et la portée d'écriture d'événements `https://www.googleapis.com/auth/calendar.events`. Le jeton de renouvellement doit provenir d'un flux OAuth officiel ; ne jamais le demander dans une conversation ni l'inscrire dans GitHub. Une application OAuth laissée en mode test peut recevoir un jeton à durée de vie limitée : vérifier la configuration de publication avant mise en service durable.
2. Dans les paramètres **Production uniquement** de Cloudflare Pages, renseigner les variables suivantes (les identifiants sensibles en **secrets chiffrés**) :
   - `GOOGLE_CALENDAR_ID` : identifiant de l'agenda de destination (ou `primary` pour l'agenda principal du compte autorisé).
   - `GOOGLE_CALENDAR_CLIENT_ID`, `GOOGLE_CALENDAR_CLIENT_SECRET`, `GOOGLE_CALENDAR_REFRESH_TOKEN`.
   - `GOOGLE_CALENDAR_SYNC_FROM` : horodatage ISO 8601 de mise en service, pour ne pas recopier des anciennes visites déjà saisies manuellement.
   - `GOOGLE_CALENDAR_SYNC_ENABLED=1` : à activer seulement après revue et essais.
3. Vérifier sur un agenda dédié de validation la création d'une demande future, sa confirmation, son déplacement, puis son annulation. Utiliser uniquement des coordonnées fictives sous contrôle de l'agence (les comptes/prénoms détectés comme tests sont volontairement exclus). Vérifier qu'aucune invitation client n'est envoyée et que les créneaux restent correctement indisponibles.
4. Après validation, configurer l'agenda cible et refaire un essai contrôlé. Ne pas changer d'agenda cible alors que des événements synchronisés sont présents sans procédure de migration. En cas de problème, désactiver `GOOGLE_CALENDAR_SYNC_ENABLED` : les réservations du site restent utilisables, mais les événements déjà créés sont conservés.
5. Surveiller les erreurs `agenda_google` dans les logs Cloudflare (sans données clients, sans jetons). Les opérations Google échouées sont retentées lors des tâches et visites suivantes. Une suppression manuelle dans Google Agenda n'est pas un signal d'annulation de la réservation dans le site : agir depuis l'espace agence.

L'intégration iCal existante reste en lecture seule et continue à servir de contrôle des disponibilités. Le calendrier cible doit correspondre à celui lu par le site ou être consulté par l'agence. Le délai de rafraîchissement du flux iCal demeure distinct de l'écriture Google Calendar.

## Tests

Les tests de l'intégration Google sont dans `outils/tests-espace/node/agenda-google.test.mjs` et utilisent exclusivement des réponses Google simulées. Ils sont inclus dans `npm run test:node`. La validation réelle de l'autorisation et du déploiement doit être effectuée avec un agenda de test avant l'activation.

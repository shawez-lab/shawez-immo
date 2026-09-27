# Intégration des outils de l'agence dans shawez-immo.com — demande pour Marion

## Où on en est (relevé du 27/09/2026)

Les en-têtes renvoyés par `https://www.gravelin-immo.com/estimation?...` et `https://www.gravelin-immo.com/vente/1` :

```
HTTP/1.1 200 OK
server: Apache/2.4.68 (Debian)
set-cookie: PHPSESSID=…; path=/
set-cookie: SRV=c103; path=/
```

- Aucun `X-Frame-Options`, aucun `Content-Security-Policy` : l'affichage des pages de l'agence dans shawez-immo.com est techniquement autorisé.
- Mais les deux cookies (`PHPSESSID`, `SRV`) sont posés sans `SameSite=None; Secure`. Affichés dans une autre page, les navigateurs les refusent (Chrome), et Safari sur iPhone bloque de toute façon les cookies de site tiers.
- Résultat : on n'a pas pu vérifier qu'une demande d'estimation envoyée depuis shawez-immo.com arrive bien chez l'agence. Tant que ce n'est pas vérifié, les boutons du site mènent directement aux pages de l'agence (même onglet, avec un écran de transition). Le bouton retour ramène sur shawez-immo.com, au même endroit de la page.

## Ce qu'il faut demander

### 1. À Marion : un envoi de test (5 minutes)

Sur iPhone (Safari), puis sur ordinateur, ouvrir :

- https://shawez-immo.com/estimation-en-ligne/
- remplir l'estimation rapide avec des données de test (nom : « TEST shawez-immo »), envoyer ;
- vérifier dans La Boîte Immo que la demande est bien arrivée, avec la source `shawez-immo`.

Si la demande arrive dans les deux cas, on passe tous les boutons « Estimer mon bien » et « Voir les biens à vendre » sur les pages intégrées (changement d'une ligne de notre côté).

### 2. Au prestataire La Boîte Immo (à transmettre tel quel)

> Bonjour,
> pour le site www.gravelin-immo.com, merci d'ajouter l'en-tête HTTP suivant sur toutes les pages (au minimum /estimation et /vente/*) :
>
> `Content-Security-Policy: frame-ancestors 'self' https://shawez-immo.com https://www.shawez-immo.com`
>
> et de poser les cookies de session avec les attributs `SameSite=None; Secure` (cookies `PHPSESSID` et `SRV`), par exemple en PHP `session.cookie_samesite = "None"` et `session.cookie_secure = 1`, ou sous Apache :
>
> `Header always edit Set-Cookie "^((?!.*SameSite).*)$" "$1; SameSite=None; Secure"`
>
> L'objectif est que le formulaire d'estimation et le catalogue fonctionnent quand ils sont affichés dans https://shawez-immo.com (agent commercial de l'agence). Merci !

Le premier point garantit que l'intégration restera autorisée même si une protection anti-intégration est ajoutée plus tard ; le second permet aux formulaires de fonctionner dans la page intégrée sur ordinateur. Sur iPhone, Safari continuera de bloquer ces cookies : c'est l'envoi de test de Marion qui dira si le formulaire s'en passe.

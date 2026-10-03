# Test de la balise Metricool — 3 octobre 2026

Page de test non indexée (`noindex,nofollow` + `X-Robots-Tag: noindex`), servie par Playwright sur l'origine réelle `https://shawez-immo.com/__test-metricool/` (rien n'a été publié), avec la balise de la marque Metricool 7212231 (hash `33710f67a0c16d7cbb94d1b2ba10e7a8`) avant `</body>`. Chromium 140, deux profils (ordinateur 1440×900, iPhone 13), deux visites chacun, 4 s d'attente par visite.

## Requêtes envoyées

- ordinateur : GET https://shawez-immo.com/__test-metricool/?visite=1
- ordinateur : GET https://tracker.metricool.com/resources/be.js
- ordinateur : GET https://tracker.metricool.com/c3po.jpg?hash=33710f67a0c16d7cbb94d1b2ba10e7a8&u=https%3A%2F%2Fshawez-immo.com%2F__test-metricool%2F%3Fvisite%3D1&bw=1440&bh=900
- ordinateur : GET https://shawez-immo.com/__test-metricool/?visite=2
- ordinateur : GET https://tracker.metricool.com/resources/be.js
- ordinateur : GET https://tracker.metricool.com/c3po.jpg?hash=33710f67a0c16d7cbb94d1b2ba10e7a8&u=https%3A%2F%2Fshawez-immo.com%2F__test-metricool%2F%3Fvisite%3D2&bw=1440&bh=900
- iPhone : GET https://shawez-immo.com/__test-metricool/?visite=1
- iPhone : GET https://tracker.metricool.com/resources/be.js
- iPhone : GET https://tracker.metricool.com/c3po.jpg?hash=33710f67a0c16d7cbb94d1b2ba10e7a8&u=https%3A%2F%2Fshawez-immo.com%2F__test-metricool%2F%3Fvisite%3D1&bw=980&bh=1669
- iPhone : GET https://shawez-immo.com/__test-metricool/?visite=2
- iPhone : GET https://tracker.metricool.com/resources/be.js
- iPhone : GET https://tracker.metricool.com/c3po.jpg?hash=33710f67a0c16d7cbb94d1b2ba10e7a8&u=https%3A%2F%2Fshawez-immo.com%2F__test-metricool%2F%3Fvisite%3D2&bw=980&bh=1669

## En-têtes `Set-Cookie` reçus

- aucun

## Stockage après chaque visite

| Profil | Visite | context.cookies() | document.cookie | localStorage | sessionStorage |
|---|---|---|---|---|---|
| ordinateur | 1 | [] | "" | {} | {} |
| ordinateur | 2 | [] | "" | {} | {} |
| iPhone | 1 | [] | "" | {} | {} |
| iPhone | 2 | [] | "" | {} | {} |

## Script chargé (`https://tracker.metricool.com/resources/be.js`, 379 octets)

```js
beTracker={t:function(a){"undefined"==typeof a&&(a={}),a.u=document.location.href,a.bw=window.innerWidth,a.bh=window.innerHeight,document.referrer&&""!=document.referrer&&(a.ref=document.referrer);var b=[];for(var c in a)a.hasOwnProperty(c)&&b.push(encodeURIComponent(c)+"="+encodeURIComponent(a[c]));var d=new Image;d.src="https://tracker.metricool.com/c3po.jpg?"+b.join("&")}};
```

Décision : aucune trace dans le navigateur → balise installée sur toutes les pages (outils/build.py).

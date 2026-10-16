#!/usr/bin/env python3
"""Espace estimation : pages /estimer/, /mon-espace/, /admin/ et liens « Estimer mon bien ».

Relançable. Depuis la racine du dépôt : python3 outils/espace.py
- /admin/promesses/ (la mesure des 7 promesses, étape 4 du système parfait) est construite de la même façon.
- Les pages sont construites sur le gabarit de /estimation-immobiliere-dijon/ (en-tête, menu, pied de page,
  styles et scripts du site, à l'identique) ; seul le contenu de <main> change, avec le bloc de styles
  « espace-v1 » et le script de chaque page (sources dans outils/espace/).
- Tous les boutons et liens « Estimer mon bien » qui menaient à l'outil de l'agence mènent à /estimer/
  (sauf /estimation-en-ligne/, la page qui affiche l'outil de l'agence, laissée telle quelle).
- Le pictogramme « Mon espace » (une personne) est posé dans l'en-tête de TOUTES les pages : il mène à /mon-espace/
  et passe à l'état « connecté » quand la session est ouverte (témoin se_ok, sans appel à l'API).
  Le lien « Mon espace » est aussi dans le menu mobile et dans le pied de page.
- Le même module est fabriqué pour le site de l'agence dans outils/espace-estimation-gravelin/ (un JS, un CSS de thème).
"""
import glob
import html
import os
import re

RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(RACINE, 'outils', 'espace')
GABARIT = os.path.join(RACINE, 'estimation-immobiliere-dijon', 'index.html')
AGENCE = 'https://www.gravelin-immo.com/estimation?expand=estimation_rapide_group&amp;utm_source=shawez-immo#estimation-formulaires'

PAGES = {
    'estimer': {
        'route': '/estimer',
        'titre': 'Estimation immobilière offerte à Dijon, en 2 minutes',
        'description': 'Le prix de votre appartement ou de votre maison à Dijon en 2 minutes, calculé sur les ventes signées autour de chez vous. Offert, sans engagement.',
        'robots': 'index,follow,max-image-preview:large',
    },
    'mon-espace': {
        'route': '/mon-espace',
        'titre': 'Mon espace — Shawez Ali',
        'description': "Retrouvez vos estimations et l'avancement de votre dossier avec Shawez Ali, GRAVELIN IMMO.",
        'robots': 'noindex,nofollow',
    },
    'admin': {
        'route': '/admin',
        'titre': 'Espace agence — Shawez Ali',
        'description': 'Espace réservé à l\'agence.',
        'robots': 'noindex,nofollow',
    },
    # la mesure des 7 promesses : une page de l'espace agence, rangée sous /admin/
    'promesses': {
        'route': '/admin/promesses',
        'dossier': 'admin/promesses',
        'titre': 'Les 7 promesses — Shawez Ali',
        'description': 'Espace réservé à l\'agence.',
        'robots': 'noindex,nofollow',
    },
}


def lire(p):
    with open(p, encoding='utf-8') as f:
        return f.read()


def ecrire(p, s):
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, 'w', encoding='utf-8') as f:
        f.write(s)


def liens():
    """Boutons « Estimer mon bien » → /estimer/ et textes qui parlaient de l'outil de l'agence."""
    remplacements = [
        (f'href="{AGENCE}" data-sortie="estimation"', 'href="/estimer/"'),
        # accueil, bloc « par où commencer »
        ('<b>Estimation immédiate</b><br><span>Rapport détaillé par e-mail en 2 minutes</span>',
         '<b>Estimation en ligne</b><br><span>Votre fourchette en 2 minutes</span>'),
        # page Estimation
        ("Deux possibilités : un rapport immédiat avec l'outil de l'agence, ou une estimation étudiée personnellement par Shawez.",
         "Deux possibilités : une fourchette immédiate en ligne, ou une estimation étudiée personnellement par Shawez."),
        ("<p class=\"label\">Estimation immédiate</p><h2>Rapport détaillé par e-mail <em>en 2 minutes.</em></h2><p>L'outil d'estimation de notre agence GRAVELIN IMMO. Il s'ouvre dans un nouvel onglet.</p>",
         "<p class=\"label\">Estimation en ligne</p><h2>Votre fourchette de prix <em>en 2 minutes.</em></h2><p>Six questions sur votre bien, comparé aux ventes réelles autour de chez vous. Le résultat reste dans votre espace.</p>"),
        ('<a class="link" href="/estimer/">l\'outil d\'estimation de l\'agence GRAVELIN IMMO</a> : quelques questions sur le bien, et un rapport détaillé vous est envoyé par e-mail en 2 minutes.',
         '<a class="link" href="/estimer/">l\'estimation en ligne</a> : six questions sur le bien, et une fourchette indicative calculée sur les ventes réelles (DVF) autour de chez vous, à confirmer par une visite.'),
        ("Avec l'outil d'estimation de l'agence GRAVELIN IMMO : quelques questions sur le bien, et un rapport détaillé vous est envoyé par e-mail en 2 minutes.",
         "Avec l'estimation en ligne : six questions sur le bien, et une fourchette indicative calculée sur les ventes réelles (DVF) autour de chez vous, à confirmer par une visite."),
        # contact
        ('<a class="link" href="/estimer/">estimation immédiate</a>', '<a class="link" href="/estimer/">estimation en ligne</a>'),
        # à propos
        ("L'outil de l'agence donne une première estimation immédiate ;", "L'estimation en ligne donne une première fourchette immédiate ;"),
    ]
    n = 0
    for p in glob.glob(os.path.join(RACINE, '**', '*.html'), recursive=True):
        rel = os.path.relpath(p, RACINE)
        if rel.startswith(('estimation-en-ligne', 'outils', 'node_modules', 'estimer', 'mon-espace', 'admin')):
            continue
        s = lire(p)
        t = s
        for a, b in remplacements:
            t = t.replace(a, b)
        if t != s:
            ecrire(p, t)
            n += 1
    print(f'Liens « Estimer mon bien » : {n} pages mises à jour.')



# ---------------------------------------------------------------------------------------------------------------
# Pictogramme « Mon espace » dans l'en-tête de toutes les pages
# ---------------------------------------------------------------------------------------------------------------
PICTO = ('<a class="nav-compte" href="/mon-espace/" data-compte aria-label="Mon espace : se connecter" title="Mon espace : se connecter">'
         '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
         '<circle cx="12" cy="8" r="3.6"/><path d="M4.8 20c.9-3.6 3.7-5.6 7.2-5.6s6.300 2 7.200 5.600"/></svg>'
         '<span class="nc-txt">Connecté</span><span class="nc-dot" aria-hidden="true"></span></a>')
PICTO_CSS = """/* Pictogramme « Mon espace » de l'en-tête : mène à /mon-espace/, pastille verte quand on est connecté */
.nav-compte{position:relative;display:inline-flex;align-items:center;justify-content:center;gap:8px;width:42px;height:42px;flex:0 0 auto;border:1px solid currentColor;border-radius:999px;color:inherit;text-decoration:none;font-size:.88rem;font-weight:600;white-space:nowrap;transition:background .25s;}
.nav-compte svg{width:20px;height:20px;flex:0 0 auto;}
.nav-compte:hover{background:rgba(127,127,127,.18);}
.nav-compte:focus-visible{outline:2px solid var(--accent);outline-offset:3px;}
.nav-compte .nc-txt{display:none;}
.nav-compte .nc-dot{display:none;position:absolute;top:-1px;right:-1px;width:11px;height:11px;border-radius:50%;background:#3FA66B;box-shadow:0 0 0 2px rgba(15,14,12,.35);}
.nav-compte.is-in .nc-dot{display:block;}
@media(min-width:760px){.nav-compte.is-in{width:auto;padding:0 16px 0 13px;}.nav-compte.is-in .nc-txt{display:inline;}.nav-compte.is-in .nc-dot{position:static;box-shadow:none;width:9px;height:9px;order:-1;}}
@media(max-width:359px){.nav-compte{width:38px;height:38px;}}
#menu .m-alt+.m-alt{margin-top:10px;}
"""
PICTO_JS = """/* Pictogramme « Mon espace » : état connecté d'après le témoin se_ok (posé par l'API à la connexion, retiré à la déconnexion) */
window.EECompte=function(){var on=/(?:^|;\\s*)se_ok=1/.test(document.cookie||'');[].forEach.call(document.querySelectorAll('[data-compte]'),function(a){a.classList.toggle('is-in',on);var t=on?'Mon espace : connecté':'Mon espace : se connecter';if(a.hasAttribute('aria-label')){a.setAttribute('aria-label',t);a.title=t;}var x=a.querySelector('[data-compte-txt]');if(x)x.textContent=on?'Mon espace · connecté':'Mon espace';});};
window.EECompte();window.addEventListener('pageshow',window.EECompte);
"""
CTA = ('<a class="btn btn-primary" href="/estimer/" aria-label="Estimer mon bien"><span class="cta-long">Estimer mon bien</span>'
       '<span class="cta-court">Estimer</span></a>')   # vague 3 : « Estimer » court sur téléphone (style v3-entete)
MENU = '<a class="m-alt" href="/estimation-immobiliere-dijon/">Estimation chez vous, offerte</a>'
MENU_ESPACE = '<a class="m-alt" href="/mon-espace/" data-compte><span data-compte-txt>Mon espace</span></a>'
PIED = '<li><a href="/contact/">Contact</a></li>'
PIED_ESPACE = '<li><a href="/mon-espace/">Mon espace</a></li>'


def pictogramme():
    """Pose (ou remet à jour) le pictogramme, son style et son script dans toutes les pages qui ont l'en-tête du site."""
    n = 0
    for p in sorted(glob.glob(os.path.join(RACINE, '**', '*.html'), recursive=True)):
        rel = os.path.relpath(p, RACINE)
        if rel.startswith(('outils', 'node_modules')):
            continue
        s = lire(p)
        if '<header id="nav">' not in s:
            continue
        t = s
        # en-tête : le pictogramme juste avant le bouton « Estimer mon bien »
        t = re.sub(r'<a class="nav-compte".*?</a>', '', t, flags=re.S)
        if CTA not in t:
            print(f'  {rel} : bouton « Estimer mon bien » de l\'en-tête introuvable, pictogramme non posé')
            continue
        t = t.replace(CTA, PICTO + CTA, 1)
        # menu mobile et pied de page
        t = t.replace(MENU_ESPACE, '')
        if MENU in t:
            t = t.replace(MENU, MENU + MENU_ESPACE, 1)
        t = t.replace(PIED_ESPACE, '')
        if PIED in t:
            t = t.replace(PIED, PIED + PIED_ESPACE, 1)
        # style et script
        # (remplacés à leur place s'ils existent déjà : relancer ce script ne déplace rien)
        style = f'<style id="compte-v1">\n{PICTO_CSS}</style>\n'
        if '<style id="compte-v1">' in t:
            t = re.sub(r'<style id="compte-v1">.*?</style>\n?', lambda m: style, t, count=1, flags=re.S)
        else:
            t = t.replace('</head>', style + '</head>', 1)
        script = f'<script id="compte-js">\n{PICTO_JS}</script>\n'
        if '<script id="compte-js">' in t:
            t = re.sub(r'<script id="compte-js">.*?</script>\n?', lambda m: script, t, count=1, flags=re.S)
        else:
            t = t.replace('</body>', script + '</body>', 1)
        if t != s:
            ecrire(p, t)
            n += 1
    print(f'Pictogramme « Mon espace » : {n} pages mises à jour.')



# ---------------------------------------------------------------------------------------------------------------
# Le même module, prêt à brancher sur le site de l'agence : outils/espace-estimation-gravelin/
# ---------------------------------------------------------------------------------------------------------------
GRAVELIN = os.path.join(RACINE, 'outils', 'espace-estimation-gravelin')


def prefixer(css, pre='.ee-module'):
    """Range chaque règle sous .ee-module (les @media sont traversés, les @keyframes laissés tels quels)."""
    out, i, n = [], 0, len(css)
    blancs = re.compile(r'(\s|/\*.*?\*/)*', re.S)
    while i < n:
        m = blancs.match(css, i)
        out.append(m.group(0))
        i = m.end()
        if i >= n:
            break
        j = css.index('{', i)
        sel = css[i:j].strip()
        prof, k = 1, j + 1
        while prof:
            prof += (css[k] == '{') - (css[k] == '}')
            k += 1
        corps = css[j + 1:k - 1]
        if sel.startswith(('@media', '@supports')):
            out.append(sel + '{' + prefixer(corps, pre) + '}')
        elif sel.startswith('@'):
            out.append(sel + '{' + corps + '}')
        else:
            out.append(','.join(pre + ' ' + x.strip() for x in sel.split(',')) + '{' + corps + '}')
        i = k
    return ''.join(out)


def css_module(css):
    """Feuille du module pour un autre site : sous .ee-module, arrondis et couleurs fixes rendus réglables par le thème."""
    t = prefixer(css)
    for a, b in (('border-radius:16px', 'border-radius:var(--ee-r-carte,16px)'), ('border-radius:12px', 'border-radius:var(--ee-r-champ,12px)'),
                 ('border-radius:8px', 'border-radius:var(--ee-r-petit,8px)'), ('rgba(227,179,65,.12)', 'var(--ee-avert,rgba(227,179,65,.12))'),
                 ('#7E2C1F', 'var(--ee-erreur,#7E2C1F)'), ('#A23B2A', 'var(--ee-erreur,#A23B2A)'), ('#215A39', 'var(--ee-ok,#215A39)'),
                 ('#D9D3C7', 'var(--night-ink-2,#D9D3C7)'), ('#F3EFE6', 'var(--night-ink,#F3EFE6)'), ('#0F0E0C', 'var(--night,#0F0E0C)')):
        t = t.replace(a, b)
    return t


def js_chaine(x):
    import json
    return json.dumps(x, ensure_ascii=False).replace('</', '<\\/')


DEMO = """<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>{titre} — GRAVELIN IMMO (démonstration du module)</title>
<meta name="robots" content="noindex,nofollow">
<meta name="theme-color" content="#F6F3EC">
<link rel="stylesheet" href="espace-estimation.css">
<link rel="stylesheet" href="theme-gravelin.css">
<style>
/* Page de démonstration : un en-tête et un pied de page simples, aux couleurs de l'agence, pour voir le module en place.
   Sur le vrai site, ce sont l'en-tête et le pied de page du site qui l'entourent. */
html{{-webkit-text-size-adjust:100%;}}
body{{margin:0;background:#F6F3EC;color:#14161C;font-family:'Geist','Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;}}
.g-tete{{position:sticky;top:0;z-index:10;display:flex;align-items:center;justify-content:space-between;gap:12px;height:64px;padding:0 clamp(20px,5vw,96px);background:rgba(246,243,236,.94);backdrop-filter:blur(12px);border-bottom:1px solid #D3CCBC;}}
.g-logo{{font-family:'Fraunces','Iowan Old Style','Palatino Linotype',Georgia,serif;font-size:1.35rem;color:#20376A;text-decoration:none;letter-spacing:-.01em;white-space:nowrap;}}
.g-logo small{{display:block;font-family:inherit;font-size:.62rem;letter-spacing:.08em;text-transform:uppercase;color:#5F626C;}}
.g-nav{{display:flex;align-items:center;gap:10px;}}
.g-nav a.g-lien{{display:none;color:#14161C;text-decoration:none;font-weight:500;font-size:.95rem;padding:0 8px;}}
@media(min-width:900px){{.g-nav a.g-lien{{display:inline;}}}}
.g-compte{{position:relative;display:inline-flex;align-items:center;justify-content:center;gap:8px;width:44px;height:44px;border:1.5px solid #14161C;border-radius:999px;color:#14161C;text-decoration:none;font-weight:600;font-size:.9rem;white-space:nowrap;}}
.g-compte svg{{width:20px;height:20px;}}
.g-compte span{{display:none;}}
.g-compte.is-in::after{{content:"";position:absolute;top:-1px;right:-1px;width:11px;height:11px;border-radius:50%;background:#4E7A5A;box-shadow:0 0 0 2px #F6F3EC;}}
@media(min-width:760px){{.g-compte.is-in{{width:auto;padding:0 16px 0 13px;}}.g-compte.is-in span{{display:inline;}}}}
.g-compte:focus-visible,.g-logo:focus-visible,.g-lien:focus-visible{{outline:3px solid #B9773A;outline-offset:3px;}}
.g-bandeau{{margin:0;padding:8px clamp(20px,5vw,96px);background:#0F1320;color:#F2EEE4;font-size:.82rem;}}
.g-pied{{margin-top:64px;padding:32px clamp(20px,5vw,96px);background:#0F1320;color:#D5D2CB;font-size:.88rem;line-height:1.6;}}
.g-pied a{{color:#F2EEE4;}}
</style>
</head>
<body>
<p class="g-bandeau">Démonstration : le module d'estimation à la charte GRAVELIN IMMO. Les demandes faites ici arrivent dans la même base, notées « gravelin ».</p>
<header class="g-tete">
  <a class="g-logo" href="demo-estimer.html">Gravelin immo<small>Location &amp; Transaction</small></a>
  <nav class="g-nav" aria-label="Navigation"><a class="g-lien" href="demo-estimer.html">Estimer mon bien</a>
    <a class="g-compte" href="demo-mon-espace.html" data-compte aria-label="Mon espace : se connecter" title="Mon espace : se connecter"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="3.6"/><path d="M4.8 20c.9-3.6 3.7-5.6 7.2-5.6s6.3 2 7.2 5.6"/></svg><span>Connecté</span></a></nav>
</header>
<main>
<div data-espace-estimation="{page}"></div>
</main>
<footer class="g-pied">GRAVELIN IMMO — 30 rue Bannelier, 21000 Dijon. Page de démonstration du module d'estimation, à ne pas diffuser. <a href="/">Retour à shawez-immo.com</a></footer>
<script>window.EE_CONF={{site:'gravelin',estimer:'demo-estimer.html',espace:'demo-mon-espace.html',admin:'demo-admin.html',promesses:'demo-promesses.html'}};</script>
<script src="espace-estimation.js"></script>
</body>
</html>
"""

LISEZ_MOI = """# Espace estimation — module pour le site de l'agence (GRAVELIN IMMO)

Le même module que sur shawez-immo.com (parcours `/estimer/`, `/mon-espace/`, `/admin/`), à la charte de l'agence.
Fichiers fabriqués par `python3 outils/espace.py` : ne pas les modifier à la main (sources dans `outils/espace/`).

## Brancher le module en 10 lignes

1. Copier dans le dépôt du site de l'agence : `espace-estimation.js`, `espace-estimation.css`, `theme-gravelin.css`, et le dossier `functions/` de ce dépôt (l'API).
2. Créer quatre pages `/estimer/`, `/mon-espace/`, `/admin/` et `/admin/promesses/` avec l'en-tête et le pied de page du site.
3. Dans chacune, à l'endroit du contenu : `<div data-espace-estimation="estimer"></div>` (ou `mon-espace`, `admin`, `promesses`).
4. Dans le `<head>` : `<link rel="stylesheet" href="/espace-estimation.css">` puis `<link rel="stylesheet" href="/theme-gravelin.css">`.
5. Avant `</body>` : `<script src="/espace-estimation.js"></script>` (réglages possibles juste avant, dans `window.EE_CONF`).
6. Cloudflare Pages du site de l'agence → Settings → Bindings : base D1 `espace-estimation` sous le nom `DB` (la même que shawez-immo.com), service `shawez-mailer` sous le nom `MAILER`.
7. Même écran, variables : `SOURCE = gravelin` ; `ADMIN_EMAILS` et `NOTIFY_EMAILS` comme sur shawez-immo.com.
8. Copier aussi le dossier `donnees-dvf/` (ou l'action `.github/workflows/dvf.yml` et `outils/dvf.py`, qui le refont chaque mois).
9. Pictogramme de l'en-tête : `<a href="/mon-espace/" data-compte aria-label="Mon espace : se connecter">…</a>` ; il reçoit la classe `is-in` quand on est connecté.
10. Autoriser `https://api-adresse.data.gouv.fr` et `https://data.geopf.fr` dans `connect-src` si le site a une CSP ; `/mon-espace/` et `/admin/` en `noindex`.

Pour changer l'habillage : seulement `theme-gravelin.css` (couleurs, polices, arrondis).
Démonstration : `demo-estimer.html`, `demo-mon-espace.html`, `demo-admin.html`, `demo-promesses.html` (dans ce dossier).
"""


def gravelin(css, commun):
    """Un JS, un CSS de thème (et la feuille de structure), les pages de démonstration, le mode d'emploi."""
    base = lire(os.path.join(SRC, 'gravelin', 'base.css'))
    ecrire(os.path.join(GRAVELIN, 'espace-estimation.css'),
           "/* Espace estimation — structure du module (fabriqué par outils/espace.py : ne pas modifier ici).\n"
           "   L'habillage (couleurs, polices, arrondis) est dans theme-gravelin.css. */\n" + base + css_module(css))
    ecrire(os.path.join(GRAVELIN, 'theme-gravelin.css'), lire(os.path.join(SRC, 'gravelin', 'theme-gravelin.css')))
    fragments = {nom: lire(os.path.join(SRC, f'{nom}.html')) for nom in PAGES}
    scripts = {nom: lire(os.path.join(SRC, f'{nom}.js')) for nom in PAGES}
    js = [
        "/* Espace estimation — module autonome (fabriqué par outils/espace.py : ne pas modifier ici).",
        "   Dans la page : <div data-espace-estimation=\"estimer\"></div> (ou \"mon-espace\", \"admin\"), puis ce script.",
        "   Réglages facultatifs avant ce script : window.EE_CONF = { site, conseiller, tel, telAffiche, email, portrait,",
        "   confidentialite, estimer, espace, admin, api }. */",
        "(function(){",
        "'use strict';",
        "var defauts={site:'gravelin',confidentialite:'/politique-de-confidentialite'};",
        "var regles=window.EE_CONF||{}; Object.keys(regles).forEach(function(k){defauts[k]=regles[k];}); window.EE_CONF=defauts;",
        PICTO_JS.replace("/(?:^|;\\\\s*)se_ok=1/", "/(?:^|;\\s*)se_ok=1/"),
        f"var FRAGMENTS={{{','.join(js_chaine(n) + ':' + js_chaine(h) for n, h in fragments.items())}}};",
        "function demarrer(){",
        "  var boite=document.querySelector('[data-espace-estimation]'); if(!boite)return;",
        "  var page=boite.getAttribute('data-espace-estimation'); if(!FRAGMENTS[page])return;",
        "  boite.classList.add('ee-module'); boite.innerHTML=FRAGMENTS[page];",
        commun,
    ]
    for i, nom in enumerate(PAGES):
        js.append(f"  {'if' if i == 0 else 'else if'}(page==={js_chaine(nom)}){{\n{scripts[nom]}\n  }}")
    js += ["}", "if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',demarrer); else demarrer();", "})();", ""]
    ecrire(os.path.join(GRAVELIN, 'espace-estimation.js'), '\n'.join(js))
    titres = {'estimer': 'Estimation en ligne', 'mon-espace': 'Mon espace', 'admin': 'Espace agence', 'promesses': 'Les 7 promesses'}
    for nom in PAGES:
        ecrire(os.path.join(GRAVELIN, f'demo-{nom}.html'), DEMO.format(titre=titres[nom], page=nom))
    ecrire(os.path.join(GRAVELIN, 'LISEZ-MOI.md'), LISEZ_MOI)
    print('Module pour le site de l\'agence : outils/espace-estimation-gravelin/ refait.')


def page(nom, conf, gabarit, css, commun):
    s = gabarit
    titre = html.escape(conf['titre'], quote=False)
    desc = html.escape(conf['description'])
    dossier = conf.get('dossier', nom)
    url = f"https://shawez-immo.com/{dossier}/"
    s = re.sub(r'<title>.*?</title>', f'<title>{titre}</title>', s, count=1, flags=re.S)
    s = re.sub(r'<meta name="description" content="[^"]*">', f'<meta name="description" content="{desc}">', s, count=1)
    s = re.sub(r'<meta name="robots" content="[^"]*">', f'<meta name="robots" content="{conf["robots"]}">', s, count=1)
    s = re.sub(r'<link rel="canonical" href="[^"]*">', f'<link rel="canonical" href="{url}">', s, count=1)
    s = re.sub(r'<meta property="og:title" content="[^"]*">', f'<meta property="og:title" content="{titre}">', s, count=1)
    s = re.sub(r'<meta property="og:description" content="[^"]*">', f'<meta property="og:description" content="{desc}">', s, count=1)
    s = re.sub(r'<meta property="og:url" content="[^"]*">', f'<meta property="og:url" content="{url}">', s, count=1)
    s = re.sub(r'<meta name="twitter:title" content="[^"]*">', f'<meta name="twitter:title" content="{titre}">', s, count=1)
    s = re.sub(r'<meta name="twitter:description" content="[^"]*">', f'<meta name="twitter:description" content="{desc}">', s, count=1)
    s = re.sub(r'<script type="application/ld\+json">.*?</script>\n?', '', s, flags=re.S)
    s = re.sub(r'<style id="espace-v1">.*?</style>\n?', '', s, flags=re.S)
    s = s.replace('</head>', f'<style id="espace-v1">\n{css}</style>\n</head>', 1)
    s = re.sub(r'<body data-route="[^"]*"', f'<body data-route="{conf["route"]}"', s, count=1)
    main = lire(os.path.join(SRC, f'{nom}.html'))
    s = re.sub(r'<main id="main">.*?</main>', lambda m: f'<main id="main">\n{main}</main>', s, count=1, flags=re.S)
    js = lire(os.path.join(SRC, f'{nom}.js'))
    s = re.sub(r'<script id="espace-js">.*?</script>\n?', '', s, flags=re.S)
    s = s.replace('</body>', f'<script id="espace-js">\n{commun}\n{js}</script>\n</body>', 1)
    assert s.index('<script id="compte-js">') < s.index('<script id="espace-js">')
    # pas de données de la page estimation (FAQ, formulaire) : vérifications
    assert 'id="est-form"' not in s
    # les données structurées propres à la page (JSON-LD de /estimer/, posé par outils/seo/) sont gardées d'une construction à l'autre
    cible = os.path.join(RACINE, dossier, 'index.html')
    if os.path.exists(cible):
        ld = re.findall(r'<script type="application/ld\+json">.*?</script>\n?', lire(cible), flags=re.S)
        if ld:
            s = s.replace('</head>', ''.join(ld) + '</head>', 1)
        # blocs de preuve sociale (photo + note Google datée), posés par outils/avis.py depuis avis.json : gardés aussi
        avant = lire(cible)
        for tag in re.findall(r'<!-- avis:([\w-]+) -->', s):
            m = re.search(r'<!-- avis:%s -->.*?<!-- /avis:%s -->' % (re.escape(tag), re.escape(tag)), avant, flags=re.S)
            if m:
                s = re.sub(r'<!-- avis:%s -->.*?<!-- /avis:%s -->' % (re.escape(tag), re.escape(tag)), lambda _: m.group(0), s, count=1, flags=re.S)
    ecrire(cible, s)


def headers():
    p = os.path.join(RACINE, '_headers')
    s = lire(p)
    # adresse : autocomplétion par la Base Adresse Nationale (deux points d'accès)
    s = s.replace("connect-src 'self' https://tracker.metricool.com;",
                  "connect-src 'self' https://tracker.metricool.com https://api-adresse.data.gouv.fr https://data.geopf.fr;")
    bloc = """/admin/*
  X-Robots-Tag: noindex, nofollow
  Cache-Control: no-store
/mon-espace/*
  X-Robots-Tag: noindex, nofollow
  Cache-Control: no-store
/donnees-dvf/*
  X-Robots-Tag: noindex
  Cache-Control: public, max-age=86400
"""
    if '/admin/*' not in s:
        s = s.rstrip('\n') + '\n' + bloc
    if '/outils/*' not in s:
        s = s.rstrip('\n') + '\n/outils/*\n  X-Robots-Tag: noindex, nofollow\n'
    ecrire(p, s)


def robots_sitemap():
    p = os.path.join(RACINE, 'robots.txt')
    s = lire(p)
    for l in ('Disallow: /admin/', 'Disallow: /mon-espace/', 'Disallow: /donnees-dvf/', 'Disallow: /api/'):
        if l not in s:
            s = s.replace('Sitemap:', l + '\nSitemap:', 1)
    ecrire(p, s)
    p = os.path.join(RACINE, 'sitemap.xml')
    s = lire(p)
    if 'https://shawez-immo.com/estimer/' not in s:
        s = s.replace('</urlset>', '  <url><loc>https://shawez-immo.com/estimer/</loc><changefreq>monthly</changefreq><priority>0.9</priority></url>\n</urlset>', 1)
        ecrire(p, s)


def main():
    liens()
    pictogramme()
    gabarit = lire(GABARIT)
    css = lire(os.path.join(SRC, 'espace.css'))
    commun = lire(os.path.join(SRC, 'commun.js'))
    for nom, conf in PAGES.items():
        page(nom, conf, gabarit, css, commun)
        print(f"/{conf.get('dossier', nom)}/ construite.")
    gravelin(css, commun)
    headers()
    robots_sitemap()


if __name__ == '__main__':
    main()

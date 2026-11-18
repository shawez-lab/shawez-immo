#!/usr/bin/env python3
"""Page « Plan du site » (/plan-du-site/) : toutes les pages publiques du sitemap, classées par thème,
avec leur titre. Gabarit : l'article « Choisir un agent » (même en-tête, style, pied de page).
Relançable (outils/build.py la refait à chaque construction) : une nouvelle page du sitemap y apparaît seule.

    python3 outils/seo/plan_du_site.py
"""
import datetime as dt, html, json, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
BASE = 'https://shawez-immo.com'
TPL = os.path.join(ROOT, 'conseils-vendeurs/choisir-agent-immobilier-dijon/index.html')
OUT = os.path.join(ROOT, 'plan-du-site', 'index.html')
TITLE = 'Plan du site | Shawez Ali, agent immobilier à Dijon'
DESC = "Toutes les pages du site de Shawez Ali, agent immobilier à Dijon : vendre, estimer, prix au m² par commune, location, commerces, biens à vendre, conseils."

GROUPES = [
    ('Estimation et prix par quartier de Dijon', lambda u: u.startswith('/estimation-immobiliere-dijon/') and u != '/estimation-immobiliere-dijon/'),
    ('Agent immobilier à Dijon', lambda u: u in ('/', '/agent-immobilier-dijon/', '/shawez-ali-agent-immobilier-dijon/', '/avis/', '/videos-immobilier-dijon/', '/podcast/', '/secteurs-dijon-nuits-saint-georges-beaune/', '/agent-immobilier-beaune/', '/immobilier-nuits-saint-georges/', '/immobilier-fontaine-les-dijon/')),
    ('Vendre et estimer', lambda u: u in ('/estimer/', '/estimation-immobiliere-dijon/', '/vendre-bien-immobilier-dijon/', '/honoraires/', '/simulateur-pret-immobilier-dijon/', '/chateau-a-vendre-bourgogne/')),
    ('Commerces et immobilier professionnel', lambda u: u in ('/vendre-commerce-dijon/', '/fonds-de-commerce-a-vendre-dijon/', '/immobilier-professionnel-dijon/')),
    ('Prix immobilier par commune', lambda u: u.startswith('/prix-immobilier-')),
    ('Location (sans gestion)', lambda u: u.startswith('/location-') or u in ('/estimation-loyer-dijon/', '/louer-appartement-dijon/')),
    ('Biens à vendre', lambda u: u.startswith('/biens') ),
    ('Conseils', lambda u: u.startswith('/conseils-vendeurs/')),
    ('International (English)', lambda u: u.startswith('/en/')),
    ('Pratique', lambda u: True),
]


def titre(u):
    if u == '/':
        return 'Accueil : Shawez Ali, agent immobilier à Dijon'
    f = os.path.join(ROOT, u.strip('/'), 'index.html') if u != '/' else os.path.join(ROOT, 'index.html')
    if not os.path.isfile(f):
        return None
    s = open(f, encoding='utf-8').read()
    m = re.search(r'<title>(.*?)</title>', s, re.S)
    t = html.unescape(m.group(1)).strip() if m else u
    return re.sub(r'\s*[|—]\s*Shawez Ali.*$', '', t)


def construire():
    sm = open(os.path.join(ROOT, 'sitemap.xml'), encoding='utf-8').read()
    urls = [u.replace(BASE, '') for u in re.findall(r'<loc>(.*?)</loc>', sm)]
    urls = [u for u in urls if u != '/plan-du-site/']
    groupes, pris = [], set()
    for nom, test in GROUPES:
        liste = [(u, titre(u)) for u in urls if u not in pris and test(u)]
        liste = [(u, t) for u, t in liste if t]
        pris.update(u for u, _ in liste)
        if nom != 'Biens à vendre':
            liste.sort(key=lambda x: (x[0] != '/', x[0].count('/'), x[1].lower()))
        if liste:
            groupes.append((nom, liste))
    tpl = open(TPL, encoding='utf-8').read()
    h = tpl
    url = BASE + '/plan-du-site/'
    e = lambda x: html.escape(x, quote=True)
    h = re.sub(r'<title>.*?</title>', '<title>%s</title>' % html.escape(TITLE, quote=False), h, count=1, flags=re.S)
    for attr, val in (('name="description"', DESC), ('property="og:title"', TITLE), ('property="og:description"', DESC),
                      ('name="twitter:title"', TITLE), ('name="twitter:description"', DESC), ('property="og:url"', url)):
        h = re.sub(r'(<meta %s content=")[^"]*(")' % re.escape(attr), lambda m: m.group(1) + e(val) + m.group(2), h, count=1)
    h = re.sub(r'(<meta property="og:type" content=")[^"]*(")', r'\1website\2', h, count=1)
    h = re.sub(r'(<link rel="canonical" href=")[^"]*(")', lambda m: m.group(1) + url + m.group(2), h, count=1)
    h = re.sub(r'<body data-route="[^"]*">', '<body data-route="/plan-du-site">', h, count=1)
    graph = json.loads(re.search(r'<script type="application/ld\+json">(.*?)</script>', tpl, re.S).group(1))['@graph']
    nodes = [n for n in graph if n.get('@type') in ('WebSite', 'Person', 'RealEstateAgent')]
    nodes.append({'@type': 'WebPage', '@id': url + '#page', 'url': url, 'name': TITLE, 'description': DESC, 'inLanguage': 'fr-FR',
                  'isPartOf': {'@id': BASE + '/#site'}})
    nodes.append({'@type': 'BreadcrumbList', 'itemListElement': [
        {'@type': 'ListItem', 'position': 1, 'name': 'Accueil', 'item': BASE + '/'},
        {'@type': 'ListItem', 'position': 2, 'name': 'Plan du site', 'item': url}]})
    ld = json.dumps({'@context': 'https://schema.org', '@graph': nodes}, ensure_ascii=False).replace('</', '<\\/')
    h = re.sub(r'<script type="application/ld\+json">.*?</script>', lambda m: '<script type="application/ld+json">' + ld + '</script>', h, count=1, flags=re.S)
    blocs = ''.join(
        '<section class="pds-g" aria-labelledby="g%d"><h2 id="g%d">%s</h2><ul>%s</ul></section>' % (
            i, i, html.escape(nom), ''.join('<li><a class="link" href="%s">%s</a></li>' % (u, html.escape(t)) for u, t in liste))
        for i, (nom, liste) in enumerate(groupes))
    n = sum(len(l) for _, l in groupes)
    main = '''<main id="main">
<section class="route" data-route="/plan-du-site" id="r-plan">
  <style>.pds{columns:2 22em;column-gap:clamp(32px,5vw,80px);} .pds-g{break-inside:avoid;margin:0 0 36px;} .pds-g h2{font-size:1.25rem;margin:0 0 12px;} .pds-g ul{list-style:none;margin:0;padding:0;} .pds-g li{padding:6px 0;border-bottom:1px solid var(--line);}</style>
  <div class="page-head shell">
    <ol class="crumb" aria-label="Fil d'Ariane"><li><a href="/">Accueil</a></li><li aria-current="page">Plan du site</li></ol>
    <p class="label">Plan du site</p>
    <h1 class="display d-xl" style="margin-top:14px;">Toutes les pages, <em>en un coup d'œil.</em></h1>
    <p class="lede">Les %d pages du site, classées par thème : vendre, estimer, les prix commune par commune, la location, les commerces, les biens à vendre et les conseils. Pour les moteurs de recherche : <a class="link" href="/sitemap.xml">sitemap.xml</a>.</p>
  </div>
  <div class="shell sec-mid"><div class="pds">%s</div></div>
</section>
</main>''' % (n, blocs)
    h = re.sub(r'<main id="main">.*?</main>', lambda m: main, h, count=1, flags=re.S)
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    old = open(OUT, encoding='utf-8').read() if os.path.exists(OUT) else ''
    # garder les ajouts de build.py (flux RSS, mesure d'audience) déjà posés
    if old != h:
        open(OUT, 'w', encoding='utf-8').write(h)
        return True
    return False


if __name__ == '__main__':
    print('plan du site :', 'mis à jour' if construire() else 'inchangé')

#!/usr/bin/env python3
"""Espace estimation : pages /estimer/, /mon-espace/, /admin/ et liens « Estimer mon bien ».

Relançable. Depuis la racine du dépôt : python3 outils/espace.py
- Les trois pages sont construites sur le gabarit de /estimation-immobiliere-dijon/ (en-tête, menu, pied de page,
  styles et scripts du site, à l'identique) ; seul le contenu de <main> change, avec le bloc de styles
  « espace-v1 » et le script de chaque page (sources dans outils/espace/).
- Tous les boutons et liens « Estimer mon bien » qui menaient à l'outil de l'agence mènent à /estimer/
  (sauf /estimation-en-ligne/, la page qui affiche l'outil de l'agence, laissée telle quelle).
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
        'titre': 'Estimation en ligne à Dijon et en Côte-d\'Or — Shawez Ali',
        'description': "Estimez votre appartement ou votre maison en deux minutes : une fourchette calculée sur les ventes réelles (DVF) autour de chez vous, puis l'avis de Shawez.",
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


def page(nom, conf, gabarit, css, commun):
    s = gabarit
    titre = html.escape(conf['titre'], quote=False)
    desc = html.escape(conf['description'])
    url = f"https://shawez-immo.com/{nom}/"
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
    # pas de données de la page estimation (FAQ, formulaire) : vérifications
    assert 'id="est-form"' not in s
    ecrire(os.path.join(RACINE, nom, 'index.html'), s)


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
    gabarit = lire(GABARIT)
    css = lire(os.path.join(SRC, 'espace.css'))
    commun = lire(os.path.join(SRC, 'commun.js'))
    for nom, conf in PAGES.items():
        page(nom, conf, gabarit, css, commun)
        print(f'/{nom}/ construite.')
    headers()
    robots_sitemap()


if __name__ == '__main__':
    main()

#!/usr/bin/env python3
"""Biens à vendre (chantier « Mes biens ») : fabrique l'habillage des pages /biens/ et la page /admin/biens/.

Relançable. Depuis la racine du dépôt : python3 outils/biens.py
- /assets/biens-gabarit.html : en-tête, menu, pied de page et styles du site (gabarit de /estimation-immobiliere-dijon/),
  avec des marques (__TITRE__, <!--BIENS-MAIN-->…) remplies à la demande par functions/biens/[[path]].js.
- /admin/biens/ : saisie des mentions obligatoires (DPE, GES, honoraires, copropriété), vidéo, demandes de visite,
  mesures. Sources : outils/biens/admin-biens.html et admin-biens.js.
- robots.txt : plan du site des biens (/biens/sitemap.xml).
"""
import os
import re

RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(RACINE, 'outils', 'biens')
GABARIT = os.path.join(RACINE, 'estimation-immobiliere-dijon', 'index.html')


def lire(p):
    with open(p, encoding='utf-8') as f:
        return f.read()


def ecrire(p, s):
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, 'w', encoding='utf-8') as f:
        f.write(s)


def habiller(s, titre, desc, canon, robots, route, css, main, image):
    s = re.sub(r'<title>.*?</title>', f'<title>{titre}</title>', s, count=1, flags=re.S)
    s = re.sub(r'<meta name="description" content="[^"]*">', f'<meta name="description" content="{desc}">', s, count=1)
    s = re.sub(r'<meta name="robots" content="[^"]*">', f'<meta name="robots" content="{robots}">', s, count=1)
    s = re.sub(r'<link rel="canonical" href="[^"]*">', f'<link rel="canonical" href="{canon}">', s, count=1)
    for prop, val in (('og:title', titre), ('og:description', desc), ('og:url', canon), ('og:image', image)):
        s = re.sub(rf'<meta property="{prop}" content="[^"]*">', f'<meta property="{prop}" content="{val}">', s, count=1)
    for nom, val in (('twitter:title', titre), ('twitter:description', desc), ('twitter:image', image)):
        s = re.sub(rf'<meta name="{nom}" content="[^"]*">', f'<meta name="{nom}" content="{val}">', s, count=1)
    s = re.sub(r'<script type="application/ld\+json">.*?</script>\n?', '', s, flags=re.S)
    s = re.sub(r'<style id="espace-v1">.*?</style>\n?', '', s, flags=re.S)
    s = re.sub(r'<link rel="preload"[^>]*hero[^>]*>\n?', '', s)
    s = s.replace('</head>', f'<style id="biens-v1">\n{css}</style>\n<!--BIENS-JSONLD-->\n</head>', 1)
    s = re.sub(r'<body data-route="[^"]*"', f'<body data-route="{route}"', s, count=1)
    s = re.sub(r'<main id="main">.*?</main>', lambda m: f'<main id="main">\n{main}\n</main>', s, count=1, flags=re.S)
    s = re.sub(r'<script id="espace-js">.*?</script>\n?', '', s, flags=re.S)
    return s


def main():
    g = lire(GABARIT)
    css = lire(os.path.join(SRC, 'biens.css'))
    gab = habiller(g, '__TITRE__', '__DESCRIPTION__', '__CANONICAL__', '__ROBOTS__', '__ROUTE__', css, '<!--BIENS-MAIN-->', '__IMAGE__')
    assert gab.count('<!--BIENS-MAIN-->') == 1 and '__CANONICAL__' in gab and 'id="est-form"' not in gab
    ecrire(os.path.join(RACINE, 'assets', 'biens-gabarit.html'), gab)
    print('/assets/biens-gabarit.html construit.')

    admin_main = lire(os.path.join(SRC, 'admin-biens.html'))
    admin_js = lire(os.path.join(SRC, 'admin-biens.js'))
    adm = habiller(g, 'Biens à vendre — espace agence — Shawez Ali', 'Espace réservé à l\'agence.', 'https://shawez-immo.com/admin/biens/',
                   'noindex,nofollow', '/admin/biens', css, admin_main + f'\n<script id="biens-admin-js">\n{admin_js}</script>',
                   'https://shawez-immo.com/hero-poster.webp')
    adm = adm.replace('<!--BIENS-JSONLD-->\n', '')
    ecrire(os.path.join(RACINE, 'admin', 'biens', 'index.html'), adm)
    print('/admin/biens/ construite.')

    p = os.path.join(RACINE, 'robots.txt')
    s = lire(p)
    if 'biens/sitemap.xml' not in s:
        s = s.rstrip('\n') + '\nSitemap: https://shawez-immo.com/biens/sitemap.xml\n'
        ecrire(p, s)
    p = os.path.join(RACINE, '_headers')
    s = lire(p)
    if '/assets/biens-gabarit.html' not in s:
        s = s.rstrip('\n') + '\n/assets/biens-gabarit.html\n  X-Robots-Tag: noindex, nofollow\n'
        ecrire(p, s)


if __name__ == '__main__':
    main()

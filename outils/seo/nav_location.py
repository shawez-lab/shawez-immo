#!/usr/bin/env python3
"""Ajoute l'entrée « Location » (mise en location, sans gestion) au menu principal, au menu mobile
et au pied de page de toutes les pages du site. Relançable : ne fait rien sur une page déjà à jour.

    python3 outils/seo/nav_location.py
"""
import os, re, subprocess

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
URL = '/location-immobiliere-dijon/'

REMPLACEMENTS = [
    # menu principal (ordinateur)
    ('<li><a href="/vendre-commerce-dijon/" data-nav="commerces">Commerces</a></li>\n',
     '<li><a href="/vendre-commerce-dijon/" data-nav="commerces">Commerces</a></li>\n'
     '      <li><a href="%s" data-nav="location">Location</a></li>\n' % URL),
    # menu mobile
    ('<li><a href="/vendre-commerce-dijon/">Commerces <small>Cédez en toute discrétion</small></a></li>\n',
     '<li><a href="/vendre-commerce-dijon/">Commerces <small>Cédez en toute discrétion</small></a></li>\n'
     '    <li><a href="%s">Location <small>Trouver un locataire, sans gestion</small></a></li>\n' % URL),
    # pied de page, colonne « Vendre »
    ('<li><a href="/vendre-bien-immobilier-dijon/">Vendre à Dijon</a></li>',
     '<li><a href="/vendre-bien-immobilier-dijon/">Vendre à Dijon</a></li><li><a href="%s">Mettre en location</a></li>' % URL),
]


# Avec l'entrée « Location », le menu complet ne tient plus sous 1 380 px : le logo était écrasé.
# En dessous, le menu passe au bouton « Menu » (comme sous 1 240 px avant) ; le logo ne rétrécit plus jamais.
CSS = ('<style id="nav-location">@media(min-width:760px){#nav .brand{flex-shrink:0;}}'
       '@media(max-width:1439px){.nav-links{gap:16px;}}'
       '@media(max-width:1380px){.nav-links{display:none;} #burger{display:inline-flex;align-items:center;gap:8px;} .nav-cta .btn-primary{display:none;}}'
       '</style>')


def pages():
    out = subprocess.check_output(['git', 'ls-files', '*.html'], cwd=ROOT).decode().split()
    return [f for f in out if not f.startswith(('de-claude/', 'cahier', 'outils/'))]


def patch(s):
    for avant, apres in REMPLACEMENTS:
        if apres not in s and avant in s:
            s = s.replace(avant, apres, 1)
    if 'data-nav="location"' in s and '</head>' in s:
        if 'id="nav-location"' in s:
            s = re.sub(r'<style id="nav-location">.*?</style>', lambda m: CSS, s, count=1, flags=re.S)
        else:
            s = s.replace('</head>', CSS + '\n</head>', 1)
    return s


if __name__ == '__main__':
    n = 0
    for f in pages():
        p = os.path.join(ROOT, f)
        s = open(p, encoding='utf-8').read()
        t = patch(s)
        if t != s:
            open(p, 'w', encoding='utf-8').write(t); n += 1
    print('pages mises à jour :', n)

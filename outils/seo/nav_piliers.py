#!/usr/bin/env python3
"""Pied de page de toutes les pages : liens vers les pages piliers (agent immobilier à Dijon, châteaux et prestige,
fonds de commerce, immobilier professionnel) et vers le plan du site. Relançable : ne fait rien sur une page à jour.
Appelé aussi par outils/build.py, pour qu'une nouvelle page reçoive les mêmes liens.

    python3 outils/seo/nav_piliers.py
"""
import os, subprocess

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

REMPLACEMENTS = [
    # colonne « Vendre »
    ('<li><a href="/vendre-commerce-dijon/">Commerces</a></li><li><a href="/biens-a-vendre-dijon/">Voir les biens à vendre</a></li>',
     '<li><a href="/vendre-commerce-dijon/">Commerces</a></li><li><a href="/fonds-de-commerce-a-vendre-dijon/">Fonds de commerce à vendre</a></li>'
     '<li><a href="/immobilier-professionnel-dijon/">Murs, bureaux, locaux</a></li><li><a href="/chateau-a-vendre-bourgogne/">Châteaux et prestige</a></li>'
     '<li><a href="/biens-a-vendre-dijon/">Voir les biens à vendre</a></li>'),
    # colonne « Découvrir »
    ('<p class="ft-h">Découvrir</p><ul><li><a href="/conseils-vendeurs/">Conseils aux vendeurs</a></li>',
     '<p class="ft-h">Découvrir</p><ul><li><a href="/agent-immobilier-dijon/">Agent immobilier à Dijon</a></li><li><a href="/conseils-vendeurs/">Conseils aux vendeurs</a></li>'),
    ('<li><a href="/secteurs-dijon-nuits-saint-georges-beaune/">Territoire</a></li>',
     '<li><a href="/secteurs-dijon-nuits-saint-georges-beaune/">Territoire</a></li><li><a href="/prix-immobilier-dijon/">Prix au m² à Dijon</a></li>'),
    # colonne « Pratique »
    ('<li><a href="/cookies/">Cookies</a></li>',
     '<li><a href="/cookies/">Cookies</a></li><li><a href="/plan-du-site/">Plan du site</a></li>'),
]


def pages():
    out = subprocess.check_output(['git', 'ls-files', '--cached', '--others', '--exclude-standard', '*.html'], cwd=ROOT).decode().split()
    return sorted(set(f for f in out if not f.startswith(('de-claude/', 'cahier', 'outils/', 'admin/', 'mon-espace/', 'functions/')) and os.path.exists(os.path.join(ROOT, f))))


def patch(s):
    for avant, apres in REMPLACEMENTS:
        if apres not in s and avant in s:
            s = s.replace(avant, apres, 1)
    return s


def tout():
    n = 0
    for f in pages():
        p = os.path.join(ROOT, f)
        s = open(p, encoding='utf-8').read()
        t = patch(s)
        if t != s:
            open(p, 'w', encoding='utf-8').write(t)
            n += 1
    return n


if __name__ == '__main__':
    print('pages mises à jour :', tout())

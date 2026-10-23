#!/usr/bin/env python3
"""Met sitemap.xml d'accord avec les pages : ajoute chaque page publique indexable (canonical = elle-même, pas de
noindex) qui manque, retire les URL qui ne sont plus indexables, et met la date du jour (lastmod) sur les pages
modifiées depuis une révision git donnée. Les fiches /biens/ restent gérées par outils/biens/build_biens.py.

    python3 outils/seo/sitemap_maj.py                 # pages modifiées dans l'arbre de travail
    python3 outils/seo/sitemap_maj.py --depuis main   # pages modifiées depuis main
"""
import argparse, datetime as dt, os, re, subprocess

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SITE = 'https://shawez-immo.com'
PRIVEES = ('admin/', 'mon-espace/', 'de-claude/', 'outils/', 'posts-images/', 'annonces/', 'cahier', 'guides/', 'biens/', 'functions/')
PRIORITE = {'/': '1.0', '/agent-immobilier-dijon/': '0.9', '/estimation-immobiliere-dijon/': '0.9', '/vendre-bien-immobilier-dijon/': '0.9',
            '/chateau-a-vendre-bourgogne/': '0.8', '/fonds-de-commerce-a-vendre-dijon/': '0.8', '/immobilier-professionnel-dijon/': '0.8',
            '/plan-du-site/': '0.3'}


def git(*a):
    return subprocess.check_output(['git'] + list(a), cwd=ROOT).decode()


def indexable(f):
    s = open(os.path.join(ROOT, f), encoding='utf-8').read()
    rob = re.search(r'<meta name="robots" content="([^"]*)"', s)
    if rob and 'noindex' in rob.group(1):
        return None
    can = re.search(r'<link rel="canonical" href="([^"]*)"', s)
    chemin = '/' + f[:-len('index.html')]
    if not can or can.group(1) != SITE + chemin:
        return None
    return chemin


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--depuis')
    a = ap.parse_args()
    auj = dt.date.today().isoformat()
    fichiers = sorted(set(git('ls-files', '--cached', '--others', '--exclude-standard', '*index.html').split()))
    pages = {}
    for f in fichiers:
        if f.startswith(PRIVEES) or not os.path.exists(os.path.join(ROOT, f)):
            continue
        c = indexable(f)
        if c:
            pages[c] = f
    modifs = set(git('diff', '--name-only', a.depuis).split()) if a.depuis else set(git('diff', '--name-only', 'HEAD').split())
    modifs |= set(git('ls-files', '--others', '--exclude-standard').split())
    p = os.path.join(ROOT, 'sitemap.xml')
    s = open(p, encoding='utf-8').read()
    blocs = re.findall(r'[ \t]*<url>.*?</url>\n?', s, re.S)
    tete = s[:s.index('<url>')].rstrip()
    garde, vus = [], set()
    for b in blocs:
        loc = re.search(r'<loc>(.*?)</loc>', b).group(1)
        chemin = loc.replace(SITE, '')
        if chemin.startswith('/biens/'):
            garde.append(b.strip()); vus.add(chemin); continue
        if chemin not in pages or chemin in vus:
            print('retirée :', loc); continue
        vus.add(chemin)
        f = pages[chemin]
        if f in modifs or '<lastmod>' not in b:
            if '<lastmod>' in b:
                b = re.sub(r'<lastmod>[^<]*</lastmod>', '<lastmod>%s</lastmod>' % auj, b)
            else:
                b = b.replace('</loc>', '</loc><lastmod>%s</lastmod>' % auj)
            b = re.sub(r'<changefreq>[^<]*</changefreq>', '', b)
        garde.append(b.strip())
    nouvelles = [c for c in pages if c not in vus]
    for c in sorted(nouvelles):
        garde.append('<url><loc>%s%s</loc><lastmod>%s</lastmod><priority>%s</priority></url>' % (SITE, c, auj, PRIORITE.get(c, '0.7')))
        print('ajoutée :', c)
    # pages d'abord, fiches de biens ensuite (build_biens.py les réécrit en fin de fichier)
    pg = [b for b in garde if '/biens/' not in b]
    bi = [b for b in garde if '/biens/' in b]
    out = tete + '\n' + ''.join('  %s\n' % b for b in pg + bi) + '</urlset>\n'
    open(p, 'w', encoding='utf-8').write(out)
    print('sitemap :', len(pg) + len(bi), 'URL')


if __name__ == '__main__':
    main()

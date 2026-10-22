#!/usr/bin/env python3
"""IndexNow (Bing, et par lui ChatGPT Search ; aussi Yandex, Seznam, Naver) : signale les pages HTML modifiées.

La clé est publique par nature : elle est servie à la racine du site (/<clé>.txt, le contenu = la clé) et recopiée
dans outils/indexnow-key.txt. Aucun secret n'est nécessaire.

URL envoyées : les pages index.html ajoutées, modifiées, renommées ou supprimées entre deux révisions git,
sauf /admin/, /mon-espace/, de-claude/, outils/, functions/, et sauf les pages noindex ou dont la balise canonical
pointe ailleurs. Une page supprimée est envoyée aussi (le moteur constate alors qu'elle n'existe plus). 10 000 URL au plus.

    python3 outils/indexnow.py --avant <sha> --apres <sha>      # pages changées entre deux révisions
    python3 outils/indexnow.py --depuis "25 hours ago"          # pages changées par les commits récents
    python3 outils/indexnow.py --sitemap                        # toutes les URL du sitemap (envoi manuel)
    ... --essai                                                 # affiche la liste, n'envoie rien
"""
import argparse, json, os, re, subprocess, sys, urllib.error, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HOST = 'shawez-immo.com'
SITE = 'https://' + HOST
API = 'https://api.indexnow.org/indexnow'
MAX = 10000
EXCLUS = ('admin/', 'mon-espace/', 'de-claude/', 'outils/', 'functions/', 'node_modules/', '.github/')
VIDE = '0' * 40


def git(*a):
    return subprocess.check_output(['git'] + list(a), cwd=ROOT).decode()


def cle():
    k = open(os.path.join(ROOT, 'outils', 'indexnow-key.txt'), encoding='utf-8').read().strip()
    assert re.fullmatch(r'[A-Za-z0-9-]{8,128}', k), 'clé IndexNow invalide'
    f = os.path.join(ROOT, k + '.txt')
    assert os.path.isfile(f) and open(f, encoding='utf-8').read().strip() == k, 'fichier %s.txt absent de la racine ou différent' % k
    return k


def url_de(f):
    """Chemin de fichier -> URL publique, ou None si ce n'est pas une page à signaler."""
    if f.startswith(EXCLUS) or (f != 'index.html' and not f.endswith('/index.html')):
        return None
    chemin = '/' + f[:-len('index.html')]
    p = os.path.join(ROOT, f)
    if os.path.isfile(p):  # page présente : on vérifie qu'elle est indexable
        s = open(p, encoding='utf-8', errors='replace').read()
        rob = re.search(r'<meta\s+name="robots"\s+content="([^"]*)"', s, re.I)
        if rob and 'noindex' in rob.group(1).lower():
            return None
        can = re.search(r'<link\s+rel="canonical"\s+href="([^"]*)"', s, re.I)
        if can and can.group(1) != SITE + chemin:
            return None
    return SITE + chemin


def fichiers_changes(avant, apres):
    if not avant or avant == VIDE:
        try:
            avant = git('rev-parse', apres + '~1').strip()
        except subprocess.CalledProcessError:
            return git('ls-tree', '-r', '--name-only', apres).split()
    try:
        out = git('diff', '--name-only', '--no-renames', '--diff-filter=ACMRD', avant, apres, '--', '*.html')
    except subprocess.CalledProcessError:  # révision « avant » inconnue (poussée forcée) : dernier commit seulement
        return fichiers_changes(None, apres)
    return out.split()


def urls_sitemap():
    xml = open(os.path.join(ROOT, 'sitemap.xml'), encoding='utf-8').read()
    out = []
    for u in re.findall(r'<loc>\s*(https://shawez-immo\.com/[^<\s]*)\s*</loc>', xml):
        chemin = u[len(SITE) + 1:]
        f = (chemin + 'index.html') if (chemin == '' or chemin.endswith('/')) else None
        if f and url_de(f):
            out.append(u)
    return out


def calcule(a):
    if a.sitemap:
        urls = urls_sitemap()
    else:
        if a.depuis:
            avant = git('rev-list', '-1', '--before=' + a.depuis, a.apres).strip() or None
        else:
            avant = a.avant
        urls = [u for u in (url_de(f) for f in fichiers_changes(avant, a.apres)) if u]
    vus, out = set(), []
    for u in urls:
        if u not in vus:
            vus.add(u); out.append(u)
    if len(out) > MAX:
        print('Plus de %d URL (%d) : seules les %d premières sont envoyées.' % (MAX, len(out), MAX))
        out = out[:MAX]
    return out


def envoie(urls, k):
    corps = json.dumps({'host': HOST, 'key': k, 'keyLocation': '%s/%s.txt' % (SITE, k), 'urlList': urls}).encode()
    req = urllib.request.Request(API, data=corps, headers={'Content-Type': 'application/json; charset=utf-8'})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            print('IndexNow : HTTP', r.status, '-', len(urls), 'URL')
            return 0
    except urllib.error.HTTPError as e:
        print('IndexNow : HTTP', e.code, e.read()[:300])
        return 0 if e.code in (200, 202) else 1


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--avant')
    ap.add_argument('--apres', default='HEAD')
    ap.add_argument('--depuis')
    ap.add_argument('--sitemap', action='store_true')
    ap.add_argument('--essai', action='store_true')
    a = ap.parse_args()
    k = cle()
    urls = calcule(a)
    for u in urls:
        print(u)
    if not urls:
        print('Aucune page à signaler.')
        return 0
    if a.essai:
        print('Essai : %d URL, rien envoyé.' % len(urls))
        return 0
    return envoie(urls, k)


if __name__ == '__main__':
    sys.exit(main())

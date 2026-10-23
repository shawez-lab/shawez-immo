#!/usr/bin/env python3
"""Audit SEO technique complet de shawez-immo.com, sur le site servi en local.

    python3 outils/seo/audit_complet.py            # lance lui-même python3 -m http.server sur un port libre
    python3 outils/seo/audit_complet.py --url http://127.0.0.1:8000   # ou un serveur déjà lancé
    python3 outils/seo/audit_complet.py --json rapport.json           # + rapport détaillé en JSON

Contrôles, pour chaque page publique (fichiers HTML du dépôt, hors pages privées) :
statut HTTP, <title> (présent, unique, ≤ 60 caractères), meta description (présente, unique, ≤ 160),
un seul H1, canonical (absolue, sans paramètre, avec slash final, = l'URL de la page = l'URL du sitemap),
meta robots (pas de noindex sur une page publique), hreflang (inutile sur un site en une langue),
JSON-LD parsable, liens internes cassés, pages orphelines, liens entrants (au moins 3), profondeur de clic
depuis l'accueil, poids HTML, images (width/height, alt, loading=lazy hors premier écran, poids),
vidéos hors écran (preload), scripts bloquants, présence dans sitemap.xml, robots.txt, chaînes de
redirection (_redirects), titres/descriptions/paragraphes dupliqués, pages courtes.

Sortie : un tableau par contrôle ; « ERREUR » = à corriger, « ATTENTION » = à regarder.
Code de sortie 1 s'il reste au moins une ERREUR.
"""
import argparse, collections, functools, html, http.server, json, os, re, socketserver, subprocess, sys, threading
import urllib.parse, urllib.request
from bs4 import BeautifulSoup

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SITE = 'https://shawez-immo.com'

# Pages qui ne sont pas publiques (non indexables volontairement)
PRIVEES = ('admin/', 'mon-espace/', 'de-claude/', 'outils/', 'posts-images/', 'annonces/', 'cahier', 'node_modules/', 'guides/')
NOINDEX_VOULU = {'/merci/', '/biens-a-vendre/', '/404.html', '/estimation-en-ligne/'}

TITLE_MAX, DESC_MAX, MIN_MOTS, MIN_LIENS_ENTRANTS = 60, 160, 300, 3
IMG_LOURDE = 300 * 1024          # octets
HTML_LOURD = 250 * 1024


def serveur():
    class Muet(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a):
            pass
    handler = functools.partial(Muet, directory=ROOT)
    httpd = socketserver.ThreadingTCPServer(('127.0.0.1', 0), handler)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    return 'http://127.0.0.1:%d' % httpd.server_address[1], httpd


def fichiers_publics():
    out = subprocess.check_output(['git', 'ls-files', '*.html'], cwd=ROOT).decode().split()
    # fichiers non suivis (pages créées mais pas encore commitées)
    out += subprocess.check_output(['git', 'ls-files', '--others', '--exclude-standard', '*.html'], cwd=ROOT).decode().split()
    res = []
    for f in sorted(set(out)):
        if f.startswith(PRIVEES) or not os.path.exists(os.path.join(ROOT, f)):
            continue
        if f.endswith('index.html'):
            res.append('/' + f[:-len('index.html')])
        elif f == '404.html':
            res.append('/404.html')
    return res


def fichier_de(path):
    p = urllib.parse.urlparse(path).path
    f = os.path.join(ROOT, urllib.parse.unquote(p).lstrip('/'))
    if p.endswith('/'):
        f = os.path.join(f, 'index.html')
    return f


def redirections():
    regles = []
    try:
        for l in open(os.path.join(ROOT, '_redirects'), encoding='utf-8'):
            s = l.split()
            if len(s) >= 2 and not s[0].startswith('#'):
                regles.append((s[0], s[1], s[2] if len(s) > 2 else '301'))
    except FileNotFoundError:
        pass
    return regles


def redirige(path, regles):
    for src, dst, _ in regles:
        if src.startswith('http'):
            continue
        if src == path or src.rstrip('/') == path.rstrip('/'):
            return dst
    return None


def get(url):
    try:
        r = urllib.request.urlopen(url, timeout=20)
        return r.status, r.read()
    except urllib.error.HTTPError as e:
        return e.code, b''


def texte(el):
    return re.sub(r'\s+', ' ', el.get_text(' ', strip=True)) if el else ''


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--url')
    ap.add_argument('--json')
    a = ap.parse_args()
    base, httpd = (a.url.rstrip('/'), None) if a.url else serveur()

    regles = redirections()
    pages = fichiers_publics()
    sm_txt = open(os.path.join(ROOT, 'sitemap.xml'), encoding='utf-8').read()
    sitemap = [u.strip() for u in re.findall(r'<loc>(.*?)</loc>', sm_txt)]
    sm_paths = [urllib.parse.urlparse(u).path for u in sitemap]
    robots = open(os.path.join(ROOT, 'robots.txt'), encoding='utf-8').read()
    disallow = [l.split(':', 1)[1].strip() for l in robots.splitlines() if l.lower().startswith('disallow:') and l.split(':', 1)[1].strip()]

    E = collections.defaultdict(list)   # contrôle -> [(niveau, page, détail)]
    def err(c, p, d=''): E[c].append(('ERREUR', p, d))
    def warn(c, p, d=''): E[c].append(('ATTENTION', p, d))

    infos, liens_sortants, liens_entrants = {}, {}, collections.defaultdict(set)
    titres, descs, paras = collections.defaultdict(list), collections.defaultdict(list), collections.defaultdict(set)
    img_poids = {}

    a_crawler = list(dict.fromkeys(pages + [p for p in sm_paths if p not in pages]))
    for p in a_crawler:
        st, body = get(base + p)
        if st != 200:
            err('statut', p, 'HTTP %s' % st)
            continue
        h = body.decode('utf-8', 'ignore')
        s = BeautifulSoup(h, 'lxml')
        public = p not in NOINDEX_VOULU
        # fiche de bien retirée ou vendue depuis longtemps : noindex voulu (outils/biens/build_biens.py)
        if p.startswith('/biens/') and re.search(r'<meta name="robots" content="noindex', h):
            public = False
        info = infos[p] = {'poids': len(body)}

        rob = s.find('meta', attrs={'name': 'robots'})
        noindex = bool(rob and 'noindex' in rob.get('content', '').lower())
        info['noindex'] = noindex
        if noindex and public:
            err('robots', p, 'noindex sur une page publique')
        if not noindex and not public and p != '/404.html':
            warn('robots', p, 'page non publique sans noindex')
        indexable = public and not noindex

        t = s.title.string.strip() if s.title and s.title.string else ''
        info['title'] = t
        if indexable:
            if not t: err('title', p, 'absent')
            elif len(t) > TITLE_MAX: err('title', p, '%d car. : %s' % (len(t), t))
            titres[t].append(p)
        d = s.find('meta', attrs={'name': 'description'})
        d = html.unescape(d.get('content', '')).strip() if d else ''
        info['description'] = d
        if indexable:
            if not d: err('description', p, 'absente')
            elif len(d) > DESC_MAX: err('description', p, '%d car.' % len(d))
            descs[d].append(p)
        h1 = s.find_all('h1')
        info['h1'] = texte(h1[0]) if h1 else ''
        if indexable and len(h1) != 1:
            err('h1', p, '%d H1' % len(h1))

        can = s.find('link', rel='canonical')
        can = can.get('href', '') if can else ''
        info['canonical'] = can
        if indexable:
            attendu = SITE + p
            if not can: err('canonical', p, 'absente')
            elif can != attendu: err('canonical', p, '%s ≠ %s' % (can, attendu))
            if can and ('?' in can or '#' in can): err('canonical', p, 'paramètre dans la canonical')
            if p not in sm_paths: err('sitemap', p, 'page indexable absente du sitemap')
        else:
            if p in sm_paths: err('sitemap', p, 'page non indexable dans le sitemap')
        if s.find('link', hreflang=True):
            warn('hreflang', p, 'hreflang sur un site en une seule langue')

        for i, sc in enumerate(s.find_all('script', type='application/ld+json')):
            try:
                json.loads(sc.string or '')
            except Exception as e:
                err('json-ld', p, 'bloc %d : %s' % (i + 1, e))
        if indexable and not s.find_all('script', type='application/ld+json'):
            warn('json-ld', p, 'aucune donnée structurée')

        # scripts bloquants dans <head>
        if s.head:
            for sc in s.head.find_all('script', src=True):
                if not sc.has_attr('defer') and not sc.has_attr('async') and sc.get('type') != 'module':
                    warn('scripts', p, 'script bloquant ' + sc['src'])

        # liens
        out = set()
        for l in s.find_all('a', href=True):
            href = html.unescape(l['href']).strip()
            if href.startswith(SITE): href = href[len(SITE):] or '/'
            if not href.startswith('/') or href.startswith('//'): continue
            path = urllib.parse.urlparse(href).path
            if not path: continue
            if re.search(r'\.[a-z0-9]{2,5}$', path) and not path.endswith('.html'):
                if not os.path.isfile(fichier_de(path)) and not redirige(path, regles):
                    err('liens cassés', p, path)
                continue
            if os.path.isfile(fichier_de(path)):
                out.add(path)
            elif os.path.isfile(fichier_de(path + '/')):
                warn('liens sans slash', p, path + ' → ' + path + '/')
                out.add(path + '/')
            else:
                dst = redirige(path, regles)
                if dst:
                    warn('liens vers redirection', p, '%s → %s' % (path, dst))
                    dp = urllib.parse.urlparse(dst).path
                    out.add(dp)
                else:
                    err('liens cassés', p, path)
        liens_sortants[p] = out
        for o in out:
            if o != p:
                liens_entrants[o].add(p)

        # images
        main_el = s.find('main') or s.body
        for tag in re.findall(r'<img\b[^>]*>', h):
            for att in ('fetchpriority', 'loading', 'src', 'alt', 'width', 'height'):
                if len(re.findall(r'\s%s=' % att, tag)) > 1:
                    err('images', p, 'attribut %s en double : %s' % (att, tag[:120]))
        imgs = s.find_all('img')
        dans_main = set(id(x) for x in (main_el.find_all('img') if main_el else []))
        rang = 0
        for i, im in enumerate(imgs):
            if id(im) in dans_main:
                rang += 1
            src = im.get('src') or ''
            if not im.has_attr('alt'):
                err('images', p, 'sans alt : ' + src)
            if not (im.has_attr('width') and im.has_attr('height')):
                warn('images', p, 'sans width/height : ' + src)
            if id(im) in dans_main and rang > 3 and im.get('loading') != 'lazy' and im.get('fetchpriority') != 'high':
                warn('images lazy', p, 'hors premier écran sans loading=lazy : ' + src)
            sp = urllib.parse.urlparse(src).path
            if sp.startswith('/'):
                f = fichier_de(sp)
                if os.path.isfile(f):
                    img_poids[sp] = os.path.getsize(f)
                else:
                    err('liens cassés', p, 'image ' + sp)
        for i, v in enumerate(s.find_all('video')):
            if i >= 1 and v.get('preload') not in ('none', 'metadata') and not v.has_attr('data-src'):
                warn('vidéos', p, 'vidéo hors écran préchargée : ' + (v.get('src') or ''))
        if len(body) > HTML_LOURD:
            warn('poids', p, 'HTML %d Ko' % (len(body) // 1024))

        # contenu
        if main_el:
            m2 = BeautifulSoup(str(main_el), 'lxml')
            for x in m2(['script', 'style', 'noscript', 'svg']):
                x.decompose()
            mots = len(texte(m2).split())
            info['mots'] = mots
            if indexable and mots < MIN_MOTS:
                warn('pages courtes', p, '%d mots dans <main>' % mots)
            if indexable:
                for para in m2.find_all('p'):
                    tx = texte(para)
                    if len(tx) >= 140:
                        paras[tx].add(p)

    # doublons
    for t, ps in titres.items():
        if t and len(ps) > 1: err('title', ', '.join(ps), 'titre dupliqué : ' + t)
    for d, ps in descs.items():
        if d and len(ps) > 1: err('description', ', '.join(ps), 'description dupliquée')
    dup = [(tx, ps) for tx, ps in paras.items() if len(ps) > 1]
    for tx, ps in sorted(dup, key=lambda x: -len(x[1]))[:60]:
        warn('paragraphes dupliqués', '%d pages' % len(ps), tx[:90] + '… → ' + ', '.join(sorted(ps)[:4]))

    # profondeur et orphelines
    prof = {'/': 0}
    file = collections.deque(['/'])
    while file:
        u = file.popleft()
        for o in liens_sortants.get(u, ()):
            if o not in prof:
                prof[o] = prof[u] + 1
                file.append(o)
    for p, info in infos.items():
        indexable = p not in NOINDEX_VOULU and not info.get('noindex')
        if not indexable or p == '/':
            continue
        n = len(liens_entrants.get(p, ()))
        info['liens_entrants'] = n
        info['profondeur'] = prof.get(p)
        if n == 0: err('orphelines', p, 'aucun lien entrant')
        elif n < MIN_LIENS_ENTRANTS: warn('liens entrants', p, '%d lien(s) entrant(s)' % n)
        if p not in prof: err('profondeur', p, 'inaccessible depuis l\'accueil')
        elif prof[p] > 3: warn('profondeur', p, '%d clics depuis l\'accueil' % prof[p])

    for path, n in img_poids.items():
        if n > IMG_LOURDE:
            warn('poids images', path, '%d Ko' % (n // 1024))

    # sitemap
    for u in sitemap:
        pth = urllib.parse.urlparse(u).path
        if not u.startswith(SITE + '/'): err('sitemap', u, 'URL non canonique (domaine)')
        if '?' in u: err('sitemap', u, 'paramètre')
        if pth not in infos and not os.path.isfile(fichier_de(pth)): err('sitemap', u, 'page inexistante')
        if any(pth.startswith(d) for d in disallow): err('sitemap', u, 'bloquée par robots.txt')
    doublons_sm = [u for u, n in collections.Counter(sitemap).items() if n > 1]
    for u in doublons_sm: err('sitemap', u, 'URL en double')
    blocs = re.findall(r'<url>(.*?)</url>', sm_txt, re.S)
    for b in blocs:
        if '<lastmod>' not in b: warn('sitemap', re.search(r'<loc>(.*?)</loc>', b).group(1), 'sans lastmod')

    # robots.txt
    if 'Sitemap: ' + SITE + '/sitemap.xml' not in robots: err('robots.txt', '/robots.txt', 'ligne Sitemap absente')
    for p in infos:
        if any(p.startswith(d) for d in disallow) and p not in NOINDEX_VOULU:
            err('robots.txt', p, 'page publique bloquée')

    # redirections en chaîne
    srcs = {r[0].rstrip('/') or '/' for r in regles}
    for src, dst, code in regles:
        d = urllib.parse.urlparse(dst).path if dst.startswith('http') else dst
        if (d.rstrip('/') or '/') in srcs and not dst.startswith('https://shawez-immo.com/:splat'):
            err('redirections', src, 'chaîne : %s → %s → …' % (src, dst))
        if not dst.startswith('http') and not os.path.exists(fichier_de(d)) and ':splat' not in d:
            err('redirections', src, 'cible inexistante ' + dst)

    # sortie
    nerr = sum(1 for v in E.values() for x in v if x[0] == 'ERREUR')
    nwarn = sum(1 for v in E.values() for x in v if x[0] == 'ATTENTION')
    indexables = [p for p, i in infos.items() if p not in NOINDEX_VOULU and not i.get('noindex')]
    print('Pages analysées : %d (indexables : %d) — URL du sitemap : %d' % (len(infos), len(indexables), len(sitemap)))
    for c in sorted(E):
        v = E[c]
        print('\n## %s — %d' % (c, len(v)))
        for niv, p, d in v[:40]:
            print('  %-9s %s  %s' % (niv, p, d))
        if len(v) > 40:
            print('  … %d de plus' % (len(v) - 40))
    print('\nTOTAL : %d erreur(s), %d point(s) d\'attention' % (nerr, nwarn))
    if a.json:
        json.dump({'pages': infos, 'problemes': {k: v for k, v in E.items()}}, open(a.json, 'w'), ensure_ascii=False, indent=1)
    if httpd:
        httpd.shutdown()
    sys.exit(1 if nerr else 0)


if __name__ == '__main__':
    main()

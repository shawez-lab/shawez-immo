"""Sitemap vidéo (sitemap-videos.xml) : une entrée par page qui porte une vidéo (JSON-LD VideoObject).

Google ne reconnaissait que 2 vidéos du site (Search Console, 23/10/2026) alors que 180 pages en ont une.
Ce fichier lui donne la liste complète : titre, vignette, fichier, durée, date. Relancé par outils/build.py.
"""
import glob, html, json, os, re
from urllib.parse import urlsplit

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SITE = 'https://shawez-immo.com'
EXCLUS = ('admin/', 'mon-espace/', 'de-claude/', 'outils/', 'merci/', 'annonces/', 'posts-images/')

def videos(s):
    for b in re.findall(r'<script type="application/ld\+json">(.*?)</script>', s, re.S):
        try:
            d = json.loads(b)
        except Exception:
            continue
        pile = d.get('@graph', [d]) if isinstance(d, dict) else d
        while pile:
            x = pile.pop()
            if isinstance(x, list):
                pile.extend(x); continue
            if not isinstance(x, dict):
                continue
            if x.get('@type') == 'VideoObject' and x.get('contentUrl') and x.get('thumbnailUrl'):
                yield x
            for v in x.values():
                if isinstance(v, (dict, list)):
                    pile.append(v)

def secondes(iso):
    m = re.fullmatch(r'PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?', iso or '')
    return (int(m.group(1) or 0) * 3600 + int(m.group(2) or 0) * 60 + int(m.group(3) or 0)) if m else 0

def miniature(value):
    """Return one HTTP(S) thumbnail from a schema.org URL or URL array."""
    candidates = value if isinstance(value, list) else [value]
    for candidate in candidates:
        if not isinstance(candidate, str) or any(c.isspace() for c in candidate):
            continue
        try:
            parsed = urlsplit(candidate)
        except ValueError:
            continue
        if parsed.scheme in ('http', 'https') and parsed.hostname:
            return candidate
    raise ValueError('thumbnailUrl must contain an absolute HTTP(S) image URL')

def construire():
    e = lambda t: html.escape(str(t)[:2000], quote=False)
    blocs = []
    for f in sorted(glob.glob(os.path.join(ROOT, '**', 'index.html'), recursive=True)):
        rel = os.path.relpath(f, ROOT).replace(os.sep, '/')
        if rel.startswith(EXCLUS):
            continue
        s = open(f, encoding='utf-8').read()
        if re.search(r'<meta name="robots" content="[^"]*noindex', s):
            continue
        vus, items = set(), []
        for v in videos(s):
            if v['contentUrl'] in vus:
                continue
            vus.add(v['contentUrl'])
            d = secondes(v.get('duration'))
            items.append('    <video:video>\n      <video:thumbnail_loc>%s</video:thumbnail_loc>\n      <video:title>%s</video:title>\n'
                         '      <video:description>%s</video:description>\n      <video:content_loc>%s</video:content_loc>\n%s%s    </video:video>'
                         % (e(miniature(v['thumbnailUrl'])), e(v.get('name') or v.get('description')), e(v.get('description') or v.get('name')),
                            e(v['contentUrl']), ('      <video:duration>%d</video:duration>\n' % d) if d else '',
                            ('      <video:publication_date>%s</video:publication_date>\n' % e(v['uploadDate'])) if v.get('uploadDate') else ''))
        if items:
            url = SITE + '/' + (rel[:-len('index.html')] if rel != 'index.html' else '')
            blocs.append('  <url>\n    <loc>%s</loc>\n%s\n  </url>' % (e(url), '\n'.join(items[:20])))
    x = ('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" '
         'xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">\n%s\n</urlset>\n' % '\n'.join(blocs))
    p = os.path.join(ROOT, 'sitemap-videos.xml')
    if not os.path.exists(p) or open(p, encoding='utf-8').read() != x:
        open(p, 'w', encoding='utf-8').write(x)
        return len(blocs), True
    return len(blocs), False

if __name__ == '__main__':
    print(construire())

#!/usr/bin/env python3
"""Blog international de shawez-immo.com (28/10/2026) : articles en anglais (/en/<slug>/) et en français
(/conseils-vendeurs/<slug>/) pour la clientèle internationale. Règles : voir blog_commun.py.

    python3 outils/seo/blog_international_spec.py /tmp/blog.json \
      && python3 outils/seo/gen_pages.py . /tmp/blog.json \
      && python3 outils/seo/blog_international_spec.py --post . \
      && python3 outils/seo/blog_hubs.py \
      && git add -A en conseils-vendeurs && python3 outils/seo/sitemap_maj.py && python3 outils/build.py
"""
import json, os, re, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import blog_commun as C  # noqa: E402
import blog_marche, blog_achat, blog_fiscal, blog_vivre, blog_biens, blog_profils, blog_fr  # noqa: E402,F401  (remplissent C.P)
from international_spec import FIXE, LANGUES  # noqa: E402


def post(root):
    """Pages anglaises : éléments fixes du gabarit traduits, langue réglée. Toutes : langues parlées dans les données."""
    for p in C.P:
        f = os.path.join(root, p['path'].strip('/'), 'index.html')
        h = open(f, encoding='utf-8').read()
        if p['lang'] == 'en':
            for a, b in FIXE['en']:
                assert a in h, (f, a)
                h = h.replace(a, b, 1)
            h = re.sub(r'(<meta property="og:locale" content=")[^"]*(")', lambda m: m.group(1) + p['locale'] + m.group(2),
                       h, count=1)
        h = re.sub(r'(<meta property="og:type" content=")[^"]*(")', lambda m: m.group(1) + 'article' + m.group(2), h, count=1)
        m = re.search(r'<script type="application/ld\+json">(.*?)</script>', h, re.S)
        d = json.loads(m.group(1))
        for n in d['@graph']:
            if p['lang'] == 'en':
                if n.get('@type') in ('WebPage', 'FAQPage', 'Article'):
                    n['inLanguage'] = 'en'
                if n.get('@type') == 'BreadcrumbList':
                    n['itemListElement'][0]['name'] = 'Home'
            if n.get('@type') == 'Person':
                n['knowsLanguage'] = LANGUES
                if isinstance(n.get('contactPoint'), dict):
                    n['contactPoint']['availableLanguage'] = LANGUES
        ld = json.dumps(d, ensure_ascii=False)
        h = h[:m.start(1)] + ld + h[m.end(1):]
        open(f, 'w', encoding='utf-8').write(h)
    print('post', len(C.P), 'pages')


if __name__ == '__main__':
    if sys.argv[1] == '--post':
        post(sys.argv[2])
    elif sys.argv[1] == '--liste':
        for p in C.P:
            print(p['lang'], p['path'], len(p['title']), len(p['description']), p['title'])
        print(len(C.P), 'articles :', sum(p['lang'] == 'en' for p in C.P), 'en,', sum(p['lang'] == 'fr' for p in C.P), 'fr')
    else:
        json.dump(C.P, open(sys.argv[1], 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
        print(len(C.P), 'articles')

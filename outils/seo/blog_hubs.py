#!/usr/bin/env python3
"""Pages d'entrée du blog international (relançable, à lancer après blog_international_spec.py) :

- /en/guides/ : toutes les pages en anglais pour la clientèle internationale, rangées par thème (cartes) ;
- /conseils-vendeurs/ : bloc « Clientèle internationale » avec les articles en français,
  entre <!-- intl --> et <!-- /intl --> (refait à chaque passage).

    python3 outils/seo/blog_hubs.py
"""
import html, json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import blog_commun as C  # noqa: E402
import blog_marche, blog_achat, blog_fiscal, blog_vivre, blog_biens, blog_profils, blog_fr  # noqa: E402,F401
import international_spec as I  # noqa: E402

ROOT = os.path.dirname(os.path.dirname(HERE))
BASE = 'https://shawez-immo.com'
HUB_FR = os.path.join(ROOT, 'conseils-vendeurs', 'index.html')
OUT_EN = os.path.join(ROOT, 'en', 'guides', 'index.html')

# Guides anglais publiés le 27/10/2026 (international_spec.py) : thème et libellé de carte.
ANCIENS = {
    '/en/buying-a-house-in-beaune/': ('homes', 'Beaune'),
    '/en/buying-a-chateau-in-burgundy/': ('homes', 'Châteaux'),
    '/en/french-property-buying-costs/': ('buying', 'Buying'),
    '/en/buying-property-in-france-from-abroad/': ('buying', 'Buying from abroad'),
    '/en/living-in-dijon/': ('living', 'Dijon'),
    '/en/rental-investment-dijon/': ('homes', 'Investment'),
}


def esc(s):
    return html.escape(s, quote=True)


def carte(href, img, w, h, meta, titre, resume):
    return ('<a class="post rv" href="%s"><div class="post-img"><img fetchpriority="low" src="%s" alt="" width="%d" '
            'height="%d" loading="lazy" decoding="async"></div><span class="meta">%s</span><h3>%s</h3><p>%s</p></a>'
            % (href, img, w, h, esc(meta), esc(titre), esc(resume)))


def cartes_en():
    """{thème: [(chemin, titre, html_carte)]}, anciens guides puis nouveaux, dans l'ordre des fichiers."""
    par = {t: [] for t, _ in C.THEMES_EN}
    for p in I.P:
        if p['path'] in ANCIENS:
            theme, meta = ANCIENS[p['path']]
            par[theme].append((p['path'], p['h1_plain'],
                               carte(p['path'], p['image'], p.get('img_w', 720), p.get('img_h', 900), meta,
                                     p['h1_plain'], p['description'])))
    for p in C.P:
        if p['lang'] == 'en':
            par[p['theme']].append((p['path'], p['card'],
                                    carte(p['path'], p['image'], p['img_w'], p['img_h'], p['meta'], p['card'],
                                          p['card_desc'])))
    return par


def remplace_meta(h, attr, val):
    return re.sub(r'(<meta %s content=")[^"]*(")' % re.escape(attr), lambda m: m.group(1) + esc(val) + m.group(2), h,
                  count=1)


def hub_en():
    tpl = open(HUB_FR, encoding='utf-8').read()
    par = cartes_en()
    n = sum(len(v) for v in par.values())
    url = BASE + '/en/guides/'
    title = 'Guides for international buyers in Burgundy | Shawez Ali'
    desc = ('%d practical guides to buy, own or sell property in Dijon, Beaune and Burgundy from abroad: the steps, '
            'the tax, the villages, daily life.' % n)
    assert len(title) <= 60 and len(desc) <= 160, (len(title), len(desc))
    h = tpl.replace('<html lang="fr"', '<html lang="en"', 1)
    h = re.sub(r'<title>.*?</title>', '<title>' + html.escape(title, quote=False) + '</title>', h, count=1, flags=re.S)
    for attr, val in (('name="description"', desc), ('property="og:title"', title), ('property="og:description"', desc),
                      ('name="twitter:title"', title), ('name="twitter:description"', desc), ('property="og:url"', url),
                      ('property="og:locale"', 'en_GB')):
        h = remplace_meta(h, attr, val)
    h = re.sub(r'(<link rel="canonical" href=")[^"]*(")', lambda m: m.group(1) + url + m.group(2), h, count=1)
    h = re.sub(r'<body data-route="[^"]*">', '<body data-route="/en/guides">', h, count=1)
    # Données structurées : nœuds communs du gabarit + page de collection, fil d'Ariane, liste des guides.
    m = re.search(r'<script type="application/ld\+json">(.*?)</script>', h, re.S)
    graph = [nd for nd in json.loads(m.group(1))['@graph'] if nd.get('@type') in ('WebSite', 'Person', 'RealEstateAgent')]
    for nd in graph:
        if nd.get('@type') == 'Person':
            nd['knowsLanguage'] = I.LANGUES
    liens = [(u, t) for t, _ in C.THEMES_EN for u, t, _ in par[t]]
    graph += [
        {"@type": "CollectionPage", "@id": url + "#page", "url": url, "name": title, "description": desc,
         "inLanguage": "en", "isPartOf": {"@id": BASE + "/#site"}, "about": {"@id": BASE + "/#shawez"},
         "dateModified": C.DATE},
        {"@type": "BreadcrumbList", "itemListElement": [
            {"@type": "ListItem", "position": 1, "name": "Home", "item": BASE + "/"},
            {"@type": "ListItem", "position": 2, "name": "English", "item": BASE + "/en/"},
            {"@type": "ListItem", "position": 3, "name": "Guides", "item": url}]},
        {"@type": "ItemList", "@id": url + "#guides", "numberOfItems": len(liens), "itemListElement": [
            {"@type": "ListItem", "position": i + 1, "url": BASE + u, "name": t} for i, (u, t) in enumerate(liens)]},
    ]
    ld = json.dumps({"@context": "https://schema.org", "@graph": graph}, ensure_ascii=False)
    h = h[:m.start(1)] + ld + h[m.end(1):]
    sommaire = ''.join('<li><a href="#%s">%s</a></li>' % (t, esc(nom)) for t, nom in C.THEMES_EN if par[t])
    blocs = ''.join(
        '\n    <h2 class="display d-m" id="%s" style="margin:clamp(44px,5vw,76px) 0 clamp(18px,2.4vw,28px);">%s</h2>'
        '\n    <div class="posts">%s</div>' % (t, esc(nom), ''.join(c for _, _, c in par[t]))
        for t, nom in C.THEMES_EN if par[t])
    main = f'''<main id="main">
<section class="route" data-route="/en/guides" id="r-en-guides">
  <div class="page-head shell">
    <ol class="crumb" aria-label="Breadcrumb"><li><a href="/">Home</a></li><li><a href="/en/">English</a></li><li aria-current="page">Guides</li></ol>
    <p class="label">Guides for international buyers</p>
    <h1 class="display d-xl" style="margin-top:14px;max-width:18ch;">Buying in Burgundy, <em>from anywhere in the world.</em></h1>
    <p class="lede">Practical guides for buyers and sellers who live abroad or have just arrived: how buying works in France, the tax, the villages and daily life. Written by Shawez Ali, real estate agent in Dijon, with the sources of every figure.</p>
    <details class="toc" style="margin-top:22px;max-width:760px;"><summary>Contents</summary><ol>{sommaire}</ol></details>
  </div>
  <div class="shell" style="padding-bottom:clamp(72px,10vw,136px);">{blocs}
    <div class="second rv" style="margin-top:clamp(48px,6vw,88px);">
      <div><p class="label">A question about a property?</p><p class="q" style="font-size:clamp(1.25rem,2vw,1.7rem);margin:10px 0 8px;">The simplest is to talk.</p><p class="body" style="margin:0;">{esc(I.LANGUES_EN)} Message me on WhatsApp, in your language.</p></div>
      <a class="btn btn-primary" href="https://wa.me/33767579228">WhatsApp <span class="arw">→</span></a>
    </div>
  </div>
</section>
</main>'''
    h = re.sub(r'<main id="main">.*?</main>', lambda mm: main, h, count=1, flags=re.S)
    os.makedirs(os.path.dirname(OUT_EN), exist_ok=True)
    open(OUT_EN, 'w', encoding='utf-8').write(h)
    print('ok /en/guides/ :', n, 'guides,', sum(1 for t, _ in C.THEMES_EN if par[t]), 'thèmes')


def hub_fr():
    h = open(HUB_FR, encoding='utf-8').read()
    h = re.sub(r'<!-- intl -->.*?<!-- /intl -->', '', h, flags=re.S)
    cartes = ''.join(carte(p['path'], p['image'], p['img_w'], p['img_h'], p['meta'], p['card'], p['card_desc'])
                     for p in C.P if p['lang'] == 'fr')
    bloc = ('<!-- intl --><div style="margin-top:clamp(48px,6vw,88px);"><p class="label">Clientèle internationale</p>'
            '<h2 class="display d-l" style="margin:12px 0 clamp(20px,3vw,32px);">Acheteurs et vendeurs '
            '<em>venus d\'ailleurs.</em></h2><div class="posts">' + cartes + '</div><p class="body" '
            'style="margin-top:18px;">In English: <a class="link" href="/en/guides/">guides for international buyers</a>.'
            '</p></div><!-- /intl -->\n    ')
    i = h.index('<div class="second rv"')
    h = h[:i] + bloc + h[i:]
    open(HUB_FR, 'w', encoding='utf-8').write(h)
    print('ok /conseils-vendeurs/ :', cartes.count('class="post rv"'), 'cartes internationales')


if __name__ == '__main__':
    hub_en()
    hub_fr()

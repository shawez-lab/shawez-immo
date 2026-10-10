#!/usr/bin/env python3
"""Génère les pages SEO vague 1 à partir du gabarit d'article du site (même en-tête, style, pied de page).
Usage : python3 gen_pages.py <racine_du_depot> <pages.json>
"""
import html, json, os, re, sys

ROOT, SPEC = sys.argv[1], sys.argv[2]
BASE = 'https://shawez-immo.com'
TPL = os.path.join(ROOT, 'conseils-vendeurs/choisir-agent-immobilier-dijon/index.html')
tpl = open(TPL, encoding='utf-8').read()
pages = json.load(open(SPEC, encoding='utf-8'))

# Noeuds communs (WebSite, Person, RealEstateAgent agence) repris du gabarit
m = re.search(r'<script type="application/ld\+json">(.*?)</script>', tpl, re.S)
graph = json.loads(m.group(1))['@graph']
common = [n for n in graph if n.get('@type') in ('WebSite', 'Person', 'RealEstateAgent')]

AGENT = {
    "@type": "RealEstateAgent",
    "@id": BASE + "/#agent",
    "name": "Shawez Ali — Agent immobilier",
    "url": BASE + "/",
    "image": BASE + "/assets/shawez-ali-portrait-veste-verte.webp",
    "telephone": "+33767579228",
    "email": "shawez@gravelin-immo.com",
    "address": {"@type": "PostalAddress", "streetAddress": "30 rue Bannelier", "postalCode": "21000",
                "addressLocality": "Dijon", "addressRegion": "Côte-d'Or", "addressCountry": "FR"},
    "hasMap": "https://www.google.com/maps/search/?api=1&query=Shawez%20Ali%20%E2%80%94%20Agent%20immobilier&query_place_id=ChIJqQpGAKPcg6gRg_CLthoGaP8",
    "openingHoursSpecification": [{"@type": "OpeningHoursSpecification",
                                   "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
                                   "opens": "09:00", "closes": "19:00"}],
    "areaServed": [{"@type": "City", "name": c} for c in [
        "Dijon", "Talant", "Fontaine-lès-Dijon", "Chenôve", "Quetigny", "Longvic", "Chevigny-Saint-Sauveur",
        "Saint-Apollinaire", "Marsannay-la-Côte", "Plombières-lès-Dijon", "Neuilly-lès-Dijon",
        "Gevrey-Chambertin", "Nuits-Saint-Georges", "Beaune"]],
    "founder": {"@id": BASE + "/#shawez"},
    "parentOrganization": {"@id": BASE + "/#gravelin"},
    "sameAs": ["https://www.google.com/maps/search/?api=1&query=Shawez%20Ali%20%E2%80%94%20Agent%20immobilier&query_place_id=ChIJqQpGAKPcg6gRg_CLthoGaP8",
               "https://www.instagram.com/shawez_immo"],
}


def esc(s):
    return html.escape(s, quote=True).replace('&#x27;', '&#x27;')


def build(p):
    url = BASE + p['path']
    title, desc = p['title'], p['description']
    assert len(title) <= 60, (p['path'], len(title), title)
    assert len(desc) <= 160, (p['path'], len(desc))
    h = tpl
    h = re.sub(r'<title>.*?</title>', '<title>' + html.escape(title, quote=False) + '</title>', h, count=1, flags=re.S)
    for attr, val in (('name="description"', desc), ('property="og:title"', title), ('property="og:description"', desc),
                      ('name="twitter:title"', title), ('name="twitter:description"', desc), ('property="og:url"', url)):
        h = re.sub(r'(<meta %s content=")[^"]*(")' % re.escape(attr), lambda mm: mm.group(1) + esc(val) + mm.group(2), h, count=1)
    h = re.sub(r'(<link rel="canonical" href=")[^"]*(")', lambda mm: mm.group(1) + url + mm.group(2), h, count=1)
    for attr in ('property="og:image"', 'name="twitter:image"'):
        h = re.sub(r'(<meta %s content=")[^"]*(")' % re.escape(attr), lambda mm: mm.group(1) + BASE + p['image'] + mm.group(2), h, count=1)
    h = re.sub(r'(<meta property="og:type" content=")[^"]*(")', lambda mm: mm.group(1) + p.get('og_type', 'website') + mm.group(2), h, count=1)
    if False:
        h = re.sub(r'(<meta property="og:type" content=")[^"]*(")', lambda mm: mm.group(1) + p['og_type'] + mm.group(2), h, count=1)
    # JSON-LD
    crumbs = [("Accueil", BASE + "/")] + [(n, BASE + u) for n, u in p['crumbs']]
    nodes = list(common) + [AGENT]
    nodes.append({"@type": "WebPage", "@id": url + "#page", "url": url, "name": title, "description": desc,
                  "inLanguage": "fr-FR", "isPartOf": {"@id": BASE + "/#site"}, "about": {"@id": BASE + "/#agent"},
                  "dateModified": p['date']})
    nodes.append({"@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": i + 1, "name": n, "item": u} for i, (n, u) in enumerate(crumbs)]})
    if p.get('article'):
        nodes.append({"@type": "Article", "@id": url + "#article", "headline": p['h1_plain'], "description": desc,
                      "image": [BASE + p['image']], "datePublished": p['date'], "dateModified": p['date'],
                      "author": {"@id": BASE + "/#shawez"}, "publisher": {"@id": BASE + "/#shawez"},
                      "mainEntityOfPage": {"@id": url + "#page"}, "inLanguage": "fr-FR", "isAccessibleForFree": True})
    if p.get('service'):
        nodes.append({"@type": "Service", "@id": url + "#service", "name": p['service'], "serviceType": "Estimation et vente immobilière",
                      "provider": {"@id": BASE + "/#agent"}, "areaServed": {"@type": "City", "name": p['city']},
                      "url": url, "offers": {"@type": "Offer", "price": "0", "priceCurrency": "EUR",
                                              "description": "Estimation offerte et sans engagement"}})
    faq = p['faq']
    nodes.append({"@type": "FAQPage", "@id": url + "#faq", "mainEntity": [
        {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": re.sub('<[^>]+>', '', a)}} for q, a in faq]})
    ld = json.dumps({"@context": "https://schema.org", "@graph": nodes}, ensure_ascii=False)
    h = re.sub(r'<script type="application/ld\+json">.*?</script>', lambda mm: '<script type="application/ld+json">' + ld + '</script>', h, count=1, flags=re.S)
    # MAIN
    crumb_html = '<ol class="crumb" aria-label="Fil d\'Ariane">' + ''.join(
        ('<li><a href="%s">%s</a></li>' % (u.replace(BASE, ''), html.escape(n)) if i < len(crumbs) - 1 else '<li aria-current="page">%s</li>' % html.escape(n))
        for i, (n, u) in enumerate(crumbs)) + '</ol>'
    toc = ''.join('<li><a href="#%s">%s</a></li>' % (sid, html.escape(t)) for sid, t, _ in p['sections'])
    body = ''.join('\n        <h2 id="%s">%s</h2>\n        %s\n' % (sid, html.escape(t), b) for sid, t, b in p['sections'])
    faq_html = ''.join('<details><summary>%s</summary><div class="a"><p>%s</p></div></details>' % (html.escape(q), a) for q, a in faq)
    side = ''.join('<a class="link" href="%s">%s</a>' % (u, html.escape(n)) for n, u in p['links'])
    main = f'''<main id="main">
<section class="route" data-route="{p['path'].rstrip('/')}" id="r-{p['id']}">
  <div class="page-head shell">
    {crumb_html}
    <div class="art-head">
      <div>
        <p class="label">{html.escape(p['label'])}</p>
        <h1 class="display d-xl" style="margin-top:14px;max-width:18ch;">{p['h1']}</h1>
        <p class="lede">{p['lede']}</p>
        <div class="byline"><span>Par Shawez Ali</span><span>Mis à jour le {p['date_fr']}</span></div>
      </div>
      <div class="frame"><span class="c"></span><img src="{p['image']}" alt="{esc(p['image_alt'])}" width="512" height="640" fetchpriority="high" decoding="async"></div>
    </div>
  </div>
  <div class="shell sec-mid">
    <div class="art-grid">
      <div class="article">
        <details class="toc"><summary>Sommaire</summary><ol>{toc}<li><a href="#questions">Questions fréquentes</a></li></ol></details>
        <p>{p['intro']}</p>
{body}
        <h2 id="questions">Questions fréquentes</h2>
        <div class="faq" style="max-width:760px;">{faq_html}</div>
        <div class="btn-row" style="margin-top:32px;"><a class="btn btn-primary btn-lg" href="/estimer/">Estimer mon bien <span class="arw">→</span></a><a class="btn" href="/estimation-immobiliere-dijon/">Demander l'avis de valeur de Shawez</a></div>
      </div>
      <aside class="art-side">
        <div class="card"><h3>À lire aussi</h3>{side}</div>
      </aside>
    </div>
  </div>
</section>
</main>'''
    h = re.sub(r'<main id="main">.*?</main>', lambda mm: main, h, count=1, flags=re.S)
    out = os.path.join(ROOT, p['path'].strip('/'), 'index.html')
    os.makedirs(os.path.dirname(out), exist_ok=True)
    open(out, 'w', encoding='utf-8').write(h)
    print('ok', p['path'], len(title), len(desc))


for p in pages:
    build(p)

#!/usr/bin/env python3
"""Keep reviewed editorial additions linked from the existing FR/EN hubs.

Run after blog_hubs.py. The catalog contains public metadata only; private
research and evidence never belong in the website repository.
"""
from pathlib import Path
from html import escape
import json, re

BASE = 'https://shawez-immo.com'
START = '<!-- editorial-additions -->'
END = '<!-- /editorial-additions -->'
GROUPS = {
    'vente_fonds': ('Préparer la vente d’un fonds de commerce', 'Preparing a business sale'),
    'murs_professionnels': ('Vendre des murs professionnels', 'Selling commercial property'),
    'uk': ('Préparer un achat depuis le Royaume-Uni', 'Preparing a purchase from the United Kingdom'),
    'belgique': ('Préparer un achat depuis la Belgique', 'Preparing a purchase from Belgium'),
    'be': ('Préparer un achat depuis la Belgique', 'Preparing a purchase from Belgium'),
    'terrain': ('Vendre et comprendre un terrain', 'Selling and understanding land'),
    'chateaux': ('Préparer la vente d’un château', 'Preparing a château sale'),
    'communes': ('Vendre en Côte-d’Or, commune par commune', 'Selling in Côte-d’Or, town by town'),
    'location_fonds': ('Préparer une location-gérance', 'Preparing a business lease'),
    'prestige_videos': ('Présenter une propriété en vidéo', 'Presenting a property on film'),
    'histoire': ('Patrimoine et maisons de caractère', 'Heritage and character homes'),
    'us': ('Préparer un achat depuis les États-Unis', 'Preparing a purchase from the United States'),
    'quartiers_dijon': ('Vendre dans les quartiers de Dijon', 'Selling in Dijon’s neighbourhoods'),
    'quartiers_beaune': ('Vendre dans les quartiers de Beaune', 'Selling in Beaune’s neighbourhoods'),
}

def dutch_hub_template(source):
    """Use the established design, with a Dutch landing page and French shared navigation."""
    s=re.sub(r'(<html\b[^>]*\blang=")[^"]*(")',r'\1nl\2',source,count=1)
    s=s.replace('<header id="nav">','<header id="nav" lang="fr">',1).replace('<footer>','<footer lang="fr">',1)
    s=s.replace('<div id="menu"','<div lang="fr" id="menu"',1).replace('<div id="stickybar"','<div lang="fr" id="stickybar"',1)
    s=s.replace('</head>','<style>html[lang="nl"] .display{overflow-wrap:break-word;hyphens:auto}</style></head>',1)
    s=re.sub(r'<title>.*?</title>','<title>Vastgoed in Bourgondië: gidsen voor Belgische kopers</title>',s,count=1,flags=re.S)
    url=BASE+'/nl/gidsen/'
    desc='Een woning kopen of verkopen in Bourgondië vanuit België: praktische Nederlandstalige gidsen, met bronnen en concrete aandachtspunten.'
    for attr,val in [('name="description"',desc),('property="og:title"','Vastgoed in Bourgondië: gidsen voor Belgische kopers'),('property="og:description"',desc),('name="twitter:title"','Vastgoed in Bourgondië: gidsen voor Belgische kopers'),('name="twitter:description"',desc),('property="og:url"',url),('property="og:locale"','nl_BE')]:
        s=re.sub(r'(<meta '+re.escape(attr)+r' content=")[^"]*(")',lambda m:m[1]+escape(val,quote=True)+m[2],s,count=1)
    s=re.sub(r'(<link rel="canonical" href=")[^"]*(")',lambda m:m[1]+url+m[2],s,count=1)
    s=re.sub(r'<link\b[^>]*hreflang=[^>]+>\s*','',s)
    s=re.sub(r'<body data-route="[^"]*">','<body data-route="/nl/gidsen">',s,count=1)
    main='''<main id="main"><section class="route" data-route="/nl/gidsen" id="r-nl-gidsen">
<div class="page-head shell"><ol class="crumb"><li><a href="/">Home</a></li><li aria-current="page">Nederlandstalige gidsen</li></ol>
<p class="label">Van België naar Bourgondië</p><h1 class="display d-xl" style="margin-top:14px;max-width:18ch;hyphens:none;overflow-wrap:normal">Een woning in Bourgondië, <em style="display:block">goed voorbereid.</em></h1>
<p class="lede">Praktische gidsen voor uw vastgoedproject vanuit België: documenten begrijpen, bezoeken organiseren en een woning beoordelen. Bij elk artikel vindt u de gebruikte bronnen en een Franse versie.</p>
<p class="body">De algemene navigatie en contactpagina’s van deze website zijn in het Frans.</p></div>
<div class="shell" style="padding-bottom:clamp(72px,10vw,136px)"><div class="second rv" style="margin-top:48px">
<div><p class="label">Uw vastgoedproject</p><p class="q">Een concrete vraag over een woning?</p><p class="body">Beschrijf uw project aan Shawez Ali. Vermeld uw voorkeurstaal, zodat de communicatie vooraf kan worden afgestemd.</p></div><a class="btn btn-primary" href="/contact/">Contact opnemen →</a></div></div></section></main>'''
    s=re.sub(r'<main id="main">.*?</main>',lambda m:main,s,count=1,flags=re.S)
    m=re.search(r'<script type="application/ld\+json">(.*?)</script>',s,re.S)
    old=json.loads(m[1])['@graph']
    common=[n for n in old if n.get('@type') in ('WebSite','Person','RealEstateAgent')]
    for n in common:
        if n.get('@type')=='Person':
            n.pop('knowsLanguage',None)
            if isinstance(n.get('contactPoint'),dict):n['contactPoint'].pop('availableLanguage',None)
    ld={'@context':'https://schema.org','@graph':common+[
        {'@type':'CollectionPage','@id':url+'#page','url':url,'name':'Nederlandstalige gidsen over vastgoed in Bourgondië','description':desc,'inLanguage':'nl','isPartOf':{'@id':BASE+'/#site'}},
        {'@type':'BreadcrumbList','itemListElement':[{'@type':'ListItem','position':1,'name':'Home','item':BASE+'/'},{'@type':'ListItem','position':2,'name':'Nederlandstalige gidsen','item':url}]}]}
    s=s[:m.start(1)]+json.dumps(ld,ensure_ascii=False)+s[m.end(1):]
    return s

def update(root=None):
    root = Path(root) if root else Path(__file__).resolve().parents[2]
    catalog = json.loads((root/'outils/seo/editorial_articles.json').read_text())
    assert len({a['path'] for a in catalog}) == len(catalog), 'Duplicate editorial paths'
    changed = []
    has_nl=any(a['language']=='nl' for a in catalog)
    if has_nl and not (root/'nl/gidsen/index.html').exists():
        target=root/'nl/gidsen/index.html';target.parent.mkdir(parents=True,exist_ok=True)
        target.write_text(dutch_hub_template((root/'conseils-vendeurs/index.html').read_text()))
    for lang, hub in [('fr', 'conseils-vendeurs/index.html'), ('en', 'en/guides/index.html'), ('nl','nl/gidsen/index.html')]:
        selected = [a for a in catalog if a['language'] == lang]
        if not selected:
            continue
        for a in selected:
            assert a['path'].startswith('/') and a['path'].endswith('/')
            assert (root/a['path'].strip('/')/'index.html').is_file(), a['path']
        path = root/hub
        old = path.read_text()
        s = re.sub(re.escape(START)+r'.*?'+re.escape(END)+r'\s*', '', old, flags=re.S)
        language_marker='<!-- editorial-language-links -->'
        s=re.sub(re.escape(language_marker)+r'.*?<!-- /editorial-language-links -->\s*','',s,flags=re.S)
        groups = {}
        for a in selected:
            groups.setdefault(a['group'], []).append(a)
        sections = []
        for key, rows in groups.items():
            title = ('Een vastgoedproject vanuit België' if key in ('be','belgique') else 'Praktische gidsen') if lang=='nl' else GROUPS.get(key, ('Conseils pratiques', 'Practical guides'))[lang == 'en']
            cards = []
            for a in rows:
                cards.append('<a class="post rv" href="'+escape(a['path'],quote=True)+'">'
                    '<div class="post-img"><img src="/assets/shawez-ali-portrait-veste-verte.webp" '
                    'alt="" width="720" height="900" loading="lazy" decoding="async"></div>'
                    '<span class="meta">'+escape(title)+'</span><h3>'+escape(a['title'])+'</h3>'
                    '<p>'+escape(a['description'])+'</p></a>')
            sections.append('<section style="margin-top:clamp(48px,6vw,88px)"><h2 class="display d-l" '
                'style="margin-bottom:28px">'+escape(title)+'</h2><div class="posts">'+''.join(cards)+'</div></section>')
        marker = '<div class="second rv"'
        assert marker in s, 'Hub insertion point missing: '+hub
        at = s.index(marker)
        languages=(language_marker+'<nav aria-label="Languages" style="margin-top:32px"><a href="/conseils-vendeurs/" lang="fr">Français</a> · <a href="/en/guides/" lang="en">English</a> · <a href="/nl/gidsen/" lang="nl">Nederlands</a></nav><!-- /editorial-language-links -->\n    ') if has_nl else ''
        s = s[:at]+START+''.join(sections)+END+'\n    '+languages+s[at:]
        m = re.search(r'<script type="application/ld\+json">(.*?)</script>',s,re.S)
        ld = json.loads(m[1]); graph = ld['@graph']
        list_id = BASE+{'fr':'/conseils-vendeurs/#editorial-guides','en':'/en/guides/#guides','nl':'/nl/gidsen/#guides'}[lang]
        node = next((x for x in graph if x.get('@id') == list_id),None)
        if node is None:
            node = {'@type':'ItemList','@id':list_id,'itemListElement':[]}; graph.append(node)
        new_urls = {BASE+a['path'] for a in selected}
        items = [x for x in node['itemListElement'] if x.get('url') not in new_urls]
        items += [{'@type':'ListItem','url':BASE+a['path'],'name':a['title']} for a in selected]
        for i, item in enumerate(items,1): item['position'] = i
        node['itemListElement'] = items; node['numberOfItems'] = len(items)
        if lang == 'en':
            # The original builder states the number of guides in its descriptions.
            s = re.sub(r'\b\d+ practical guides to buy, own or sell',
                       str(len(items))+' practical guides to buy, own or sell',s)
            for x in graph:
                if isinstance(x.get('description'),str):
                    x['description'] = re.sub(r'^\d+ practical guides',str(len(items))+' practical guides',x['description'])
        # Description changes above can shift offsets; locate the JSON-LD again.
        m = re.search(r'<script type="application/ld\+json">(.*?)</script>',s,re.S)
        s = s[:m.start(1)]+json.dumps(ld,ensure_ascii=False)+s[m.end(1):]
        if s != old:
            path.write_text(s); changed.append(hub)
    return changed

if __name__ == '__main__':
    print('Editorial hubs:', ', '.join(update()) or 'unchanged')



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
    'communes': ('Vendre en Côte-d’Or, commune par commune', 'Selling in Côte-d’Or, town by town'),
    'location_fonds': ('Préparer une location-gérance', 'Preparing a business lease'),
    'prestige_videos': ('Présenter une propriété en vidéo', 'Presenting a property on film'),
    'histoire': ('Patrimoine et maisons de caractère', 'Heritage and character homes'),
    'us': ('Préparer un achat depuis les États-Unis', 'Preparing a purchase from the United States'),
    'quartiers_dijon': ('Vendre dans les quartiers de Dijon', 'Selling in Dijon’s neighbourhoods'),
    'quartiers_beaune': ('Vendre dans les quartiers de Beaune', 'Selling in Beaune’s neighbourhoods'),
}

def update(root=None):
    root = Path(root) if root else Path(__file__).resolve().parents[2]
    catalog = json.loads((root/'outils/seo/editorial_articles.json').read_text())
    assert len({a['path'] for a in catalog}) == len(catalog), 'Duplicate editorial paths'
    changed = []
    for lang, hub in [('fr', 'conseils-vendeurs/index.html'), ('en', 'en/guides/index.html')]:
        selected = [a for a in catalog if a['language'] == lang]
        if not selected:
            continue
        for a in selected:
            assert a['path'].startswith('/') and a['path'].endswith('/')
            assert (root/a['path'].strip('/')/'index.html').is_file(), a['path']
        path = root/hub
        old = path.read_text()
        s = re.sub(re.escape(START)+r'.*?'+re.escape(END)+r'\s*', '', old, flags=re.S)
        groups = {}
        for a in selected:
            groups.setdefault(a['group'], []).append(a)
        sections = []
        for key, rows in groups.items():
            title = GROUPS.get(key, ('Conseils pratiques', 'Practical guides'))[lang == 'en']
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
        s = s[:at]+START+''.join(sections)+END+'\n    '+s[at:]
        m = re.search(r'<script type="application/ld\+json">(.*?)</script>',s,re.S)
        ld = json.loads(m[1]); graph = ld['@graph']
        list_id = BASE+('/en/guides/#guides' if lang == 'en' else '/conseils-vendeurs/#editorial-guides')
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


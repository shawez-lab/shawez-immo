#!/usr/bin/env python3
"""Vidéos en anglais de Shawez sur les pages anglaises (relançable, appelé par outils/build.py).

Pour chaque vidéo de VIDEOS et chaque page de sa liste :
- un bloc lecteur (composant « film » du site, affiche + bouton, son au clic) entre <!-- video-en:<id> --> et
  <!-- /video-en:<id> -->, posé avant l'ancre indiquée, refait à chaque passage ;
- un nœud VideoObject dans le JSON-LD de la page (@id = <url de la page>#video-<id>), repris par
  outils/seo/sitemap_videos.py pour le sitemap vidéo.
Les fichiers sont dans le dépôt : assets/videos/<fichier>.mp4 (720×1280, H.264) et l'affiche .jpg.

    python3 outils/seo/videos_en.py
"""
import html, json, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SITE = 'https://shawez-immo.com'

VIDEOS = [{
    'id': 'beaune',
    'mp4': '/assets/videos/en-beaune-2-5-million.mp4',
    'poster': '/assets/videos/en-beaune-2-5-million-poster.jpg',
    'name': '€2.5 million in Burgundy: same building, two completely different lives',
    'description': ('Shawez Ali, real estate agent in Dijon, films both floors of a townhouse for sale in the heart of '
                    'Beaune: a private courtyard with a timber gallery on old stone columns, then beams, light and '
                    'parquet upstairs.'),
    'upload': '2026-10-28T19:36:45+01:00',
    'duration': 'PT53S',
    'secondes': 52,
    'instagram': 'https://www.instagram.com/reel/DfDFNQ5tDOO/',
    'youtube': 'https://www.youtube.com/shorts/rZbR9PcE18c',
    'youtube_embed': 'https://www.youtube.com/embed/rZbR9PcE18c',
    'pages': [
        # (fichier, ancre avant laquelle poser le bloc, légende)
        ('en/index.html', '<h2 id="what-i-sell">',
         'A townhouse I filmed in Beaune, presented in English: same building, two completely different lives.'),
        ('en/buying-a-house-in-beaune/index.html', '<h2 id="what-is-for-sale">',
         'A townhouse for sale in the heart of Beaune, filmed floor by floor: a private courtyard with a timber '
         'gallery, then beams, light and parquet upstairs. <a class="link" href="/biens/527-immeuble-beaune/">'
         'The listing, in French</a>.'),
        ('en/guides/index.html', '<h2 class="display d-m" id="market"',
         'Before the guides, a home I filmed in Beaune and presented in English.'),
    ],
}]


def bloc(v, legende):
    d = v['id']
    return ('<!-- video-en:%s -->\n<figure class="film rv" style="aspect-ratio:9/16;max-width:380px;margin:32px auto 12px;">'
            '<video preload="none" playsinline data-poster="%s" width="720" height="1280" aria-label="%s">'
            '<source src="%s" type="video/mp4"></video>'
            '<button type="button" class="film-play" aria-label="Play the video with sound"><i aria-hidden="true">▶</i>'
            '<span>Play · %d s, with sound</span></button></figure>\n'
            '<p class="body" style="text-align:center;font-size:.92rem;max-width:560px;margin:0 auto 28px;">%s '
            'Also on <a class="link" href="%s" rel="noopener">Instagram</a> and '
            '<a class="link" href="%s" rel="noopener">YouTube</a>.</p>\n<!-- /video-en:%s -->\n'
            % (d, v['poster'], html.escape(v['name'], quote=True), v['mp4'], v['secondes'], legende,
               v['instagram'], v['youtube'], d))


def noeud(v, url):
    return {"@type": "VideoObject", "@id": url + "#video-" + v['id'], "name": v['name'],
            "description": v['description'], "thumbnailUrl": [SITE + v['poster']], "contentUrl": SITE + v['mp4'],
            "embedUrl": v['youtube_embed'], "uploadDate": v['upload'], "duration": v['duration'], "inLanguage": "en",
            "author": {"@id": SITE + "/#shawez"}}


def poser():
    n = 0
    for v in VIDEOS:
        for fichier, ancre, legende in v['pages']:
            p = os.path.join(ROOT, fichier)
            if not os.path.exists(p):
                continue
            s = open(p, encoding='utf-8').read()
            t = re.sub(r'<!-- video-en:%s -->.*?<!-- /video-en:%s -->\n?' % (v['id'], v['id']), '', s, flags=re.S)
            i = t.find(ancre)
            if i < 0:
                print('videos_en : ancre absente dans', fichier)
                continue
            t = t[:i] + bloc(v, legende) + t[i:]
            url = SITE + '/' + fichier[:-len('index.html')]
            m = re.search(r'<script type="application/ld\+json">(.*?)</script>', t, re.S)
            if m:
                ld = json.loads(m.group(1))
                graph = ld.get('@graph') if isinstance(ld, dict) else None
                if graph is not None:
                    graph[:] = [x for x in graph if not (isinstance(x, dict) and x.get('@id') == url + '#video-' + v['id'])]
                    graph.append(noeud(v, url))
                    t = t[:m.start(1)] + json.dumps(ld, ensure_ascii=False) + t[m.end(1):]
            if t != s:
                open(p, 'w', encoding='utf-8').write(t)
                n += 1
    return n


if __name__ == '__main__':
    print('videos_en :', poser(), 'pages mises à jour')

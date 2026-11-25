"""Dates documentées de modifications significatives, sans rafraîchissement artificiel.

Le manifeste ne décrit pas la date des ventes DVF. Ces transformations conservent
les dates plus récentes et ne modifient que les deux représentations de la page :
lastmod dans le sitemap et dateModified de son nœud WebPage.
"""
import datetime as dt
import html
import json
from html.parser import HTMLParser
from pathlib import Path
import re

SITE = 'https://shawez-immo.com'
MANIFESTE = 'outils/seo/modifications-significatives.json'
SCRIPT = re.compile(
    r'(?P<ouvre><script\b[^>]*\btype\s*=\s*(?P<quote>[\"\'])application/ld\+json(?P=quote)[^>]*>)'
    r'(?P<json>.*?)(?P<ferme></script\s*>)', re.I | re.S)


def _jour(valeur):
    if not isinstance(valeur, str):
        return None
    try:
        return dt.date.fromisoformat(valeur[:10])
    except ValueError:
        return None


def _manifest(root):
    donnees = json.loads((Path(root) / MANIFESTE).read_text(encoding='utf-8'))
    if not isinstance(donnees, dict):
        raise ValueError('Le manifeste des modifications doit être un objet.')
    for chemin, date in donnees.items():
        if not re.fullmatch(r'/(?:[a-z0-9-]+/)*', chemin):
            raise ValueError('Chemin de modification invalide : ' + str(chemin))
        if not isinstance(date, str) or not re.fullmatch(r'\d{4}-\d{2}-\d{2}', date) or not _jour(date):
            raise ValueError('Date de modification invalide : ' + str(date))
    return donnees


def _plus_recente(existante, documentee):
    ancienne = _jour(existante)
    return existante if ancienne and ancienne >= _jour(documentee) else documentee


def appliquer_sitemap(xml, root):
    """Met à jour les seules URL du manifeste, en conservant le reste octet pour octet."""
    dates = {SITE + chemin: date for chemin, date in _manifest(root).items()}

    def bloc(match):
        source = match[0]
        loc = re.search(r'<loc>\s*(.*?)\s*</loc>', source, re.S)
        if not loc or html.unescape(loc[1]) not in dates:
            return source
        date = dates[html.unescape(loc[1])]
        actuelle = re.search(r'<lastmod>\s*(.*?)\s*</lastmod>', source, re.S)
        if actuelle:
            nouvelle = _plus_recente(actuelle[1], date)
            if nouvelle == actuelle[1]:
                return source
            return source[:actuelle.start(1)] + nouvelle + source[actuelle.end(1):]
        return source[:loc.end()] + '<lastmod>' + date + '</lastmod>' + source[loc.end():]

    return re.sub(r'<url>.*?</url>', bloc, xml, flags=re.S)


class _Entete(HTMLParser):
    def __init__(self, source):
        super().__init__()
        self.noindex = False
        self.canoniques = []
        self.feed(source.split('</head>', 1)[0])

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == 'meta' and a.get('name', '').lower() in ('robots', 'googlebot'):
            self.noindex |= 'noindex' in a.get('content', '').lower().split(',') or bool(
                re.search(r'\bnoindex\b', a.get('content', ''), re.I))
        if tag == 'link' and 'canonical' in a.get('rel', '').lower().split():
            self.canoniques.append(a.get('href'))


def appliquer_page(source, chemin, root):
    """Date uniquement le nœud WebPage correspondant à la page canonique indexable."""
    date = _manifest(root).get(chemin)
    if not date:
        return source
    canonique = SITE + chemin
    entete = _Entete(source)
    if entete.noindex or entete.canoniques != [canonique]:
        return source

    def script(match):
        try:
            data = json.loads(match['json'])
        except (ValueError, TypeError):
            return match[0]
        if not isinstance(data, dict):
            return match[0]
        noeuds = data.get('@graph', [data])
        if not isinstance(noeuds, list):
            return match[0]
        change = False
        for n in noeuds:
            if not isinstance(n, dict):
                continue
            types = n.get('@type', [])
            types = [types] if isinstance(types, str) else types
            if not isinstance(types, list) or 'WebPage' not in types:
                continue
            if n.get('url') is not None and n['url'] != canonique:
                continue
            if n.get('url') != canonique and n.get('@id') not in (canonique, canonique + '#page'):
                continue
            nouvelle = _plus_recente(n.get('dateModified'), date)
            if nouvelle != n.get('dateModified'):
                n['dateModified'] = nouvelle
                change = True
        if not change:
            return match[0]
        corps = json.dumps(data, ensure_ascii=False).replace('</', '<\\/')
        return match['ouvre'] + corps + match['ferme']

    return SCRIPT.sub(script, source)

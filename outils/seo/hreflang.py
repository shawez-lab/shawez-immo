"""Repair language alternates after all page generators have run.

Templates must not turn unrelated French pages into language alternatives. The
editorial catalog and reciprocal links between different languages identify real
translation families. Canonical URLs, content, RSS and private pages are untouched.
"""
import argparse
from collections import defaultdict
from html import escape
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import subprocess

SITE = 'https://shawez-immo.com'
LANGUES = {'fr': 'fr-FR', 'en': 'en', 'nl': 'nl'}
PRIVEES = ('admin/', 'mon-espace/', 'de-claude/', 'outils/', 'functions/',
           'posts-images/', 'annonces/', 'api/', 'donnees-dvf/', 'cahier')
DEBUT, FIN = '<!--illu-hreflang-->', '<!--/illu-hreflang-->'


class Entete(HTMLParser):
    def __init__(self, source):
        super().__init__(convert_charrefs=True)
        self.source = source
        self.lignes = [0]
        for match in re.finditer('\n', source):
            self.lignes.append(match.end())
        self.dans_head = False
        self.langue = None
        self.canoniques = []
        self.alternates = []
        self.plages = []
        self.marque_debut = None
        self.noindex = False
        fin = re.search(r'</head\s*>', source, re.I)
        self.feed(source[:fin.end()] if fin else source)

    def position(self):
        ligne, colonne = self.getpos()
        return self.lignes[ligne - 1] + colonne

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == 'html':
            self.langue = (attrs.get('lang') or '').lower().split('-')[0]
        if tag == 'head':
            self.dans_head = True
        if not self.dans_head:
            return
        if tag == 'meta' and (attrs.get('name') or '').lower() in ('robots', 'googlebot'):
            self.noindex |= 'noindex' in re.split(r'[\s,]+', (attrs.get('content') or '').lower())
        if tag != 'link':
            return
        relations = (attrs.get('rel') or '').lower().split()
        plage = (self.position(), self.position() + len(self.get_starttag_text()))
        if 'canonical' in relations:
            self.canoniques.append((attrs.get('href'), plage))
        if 'alternate' in relations and 'hreflang' in attrs:
            self.alternates.append(((attrs.get('hreflang') or '').lower(), attrs.get('href') or ''))
            self.plages.append(plage)

    handle_startendtag = handle_starttag

    def handle_endtag(self, tag):
        if tag == 'head':
            self.dans_head = False

    def handle_comment(self, data):
        if not self.dans_head:
            return
        if data.strip() == 'illu-hreflang':
            self.marque_debut = self.position()
        elif data.strip() == '/illu-hreflang' and self.marque_debut is not None:
            fin = self.source.find('-->', self.position())
            if fin >= 0:
                self.plages.append((self.marque_debut, fin + 3))
            self.marque_debut = None


def page_publique(source, chemin):
    chemin = str(chemin).replace('\\', '/')
    if chemin.startswith(PRIVEES) or not chemin.endswith('index.html'):
        return None
    entete = Entete(source)
    url = SITE + '/' + chemin[:-len('index.html')]
    if entete.noindex or entete.langue not in LANGUES or len(entete.canoniques) != 1:
        return None
    if entete.canoniques[0][0] != url:
        return None
    return {'chemin': chemin, 'url': url, 'langue': entete.langue,
            'source': source, 'entete': entete}


def familles(pages, root):
    """Only explicit catalog siblings and reciprocal cross-language links join pages."""
    voisins = {url: set() for url in pages}

    def relier(urls):
        urls = list(urls)
        if len({pages[url]['langue'] for url in urls}) != len(urls):
            return
        for url in urls:
            voisins[url].update(set(urls) - {url})

    catalog = Path(root) / 'outils/seo/editorial_articles.json'
    if catalog.is_file():
        groupes = defaultdict(list)
        for article in json.loads(catalog.read_text(encoding='utf-8')):
            url = SITE + article.get('path', '')
            if url in pages and article.get('language') == pages[url]['langue']:
                groupes[re.sub(r'-(EN|FR|NL)$', '', article['id'])].append(url)
        for groupe in groupes.values():
            relier(groupe)

    # These two pages are the established French and English homepages.
    accueil = [SITE + '/', SITE + '/en/']
    if all(url in pages for url in accueil) and [pages[url]['langue'] for url in accueil] == ['fr', 'en']:
        relier(accueil)

    for url, page in pages.items():
        for code, cible in page['entete'].alternates:
            autre = pages.get(cible)
            if (autre is None or autre['langue'] == page['langue']
                    or code != LANGUES[autre['langue']].lower()):
                continue
            retour = (LANGUES[page['langue']].lower(), url)
            if retour in autre['entete'].alternates:
                relier([url, cible])

    resultat, ambigues = {}, []
    for url in sorted(pages):
        if url in resultat:
            continue
        groupe, attente = set(), [url]
        while attente:
            courant = attente.pop()
            if courant not in groupe:
                groupe.add(courant)
                attente.extend(voisins[courant] - groupe)
        langues = [pages[cible]['langue'] for cible in groupe]
        if len(set(langues)) != len(langues):
            # Do not guess which translation wins an ambiguous cluster.
            famille = None
            ambigues.extend(sorted(groupe))
        else:
            famille = {pages[cible]['langue']: cible for cible in groupe}
        for cible in groupe:
            resultat[cible] = famille
    return resultat, ambigues


def normaliser(page, famille):
    source, entete = page['source'], page['entete']
    if famille is None or (not entete.alternates and len(famille) < 2):
        return source
    attendus = [(LANGUES[langue].lower(), famille[langue])
                for langue in LANGUES if langue in famille]
    defaut = famille.get('fr') or famille[page['langue']]
    attendus.append(('x-default', defaut))
    if len(entete.alternates) == len(attendus) and set(entete.alternates) == set(attendus):
        return source

    # Remove only language links and their generated marker, never RSS or body.
    plages = []
    for debut, fin in sorted(entete.plages):
        if plages and debut <= plages[-1][1]:
            plages[-1] = (plages[-1][0], max(fin, plages[-1][1]))
        else:
            plages.append((debut, fin))
    for debut, fin in reversed(plages):
        if source[fin:fin + 2] == '\r\n':
            fin += 2
        elif source[fin:fin + 1] == '\n':
            fin += 1
        source = source[:debut] + source[fin:]
    neuf = Entete(source)
    fin_canonique = neuf.canoniques[0][1][1]
    liens = ['<link rel="alternate" hreflang="%s" href="%s">' %
             ('fr-FR' if langue == 'fr-fr' else langue, escape(url, quote=True))
             for langue, url in attendus]
    nl = '\r\n' if '\r\n' in source else '\n'
    bloc = nl + DEBUT + nl + nl.join(liens) + nl + FIN
    return source[:fin_canonique] + bloc + source[fin_canonique:]


def normaliser_site(root, chemins=None, ecrire=False):
    root = Path(root)
    if chemins is None:
        chemins = subprocess.check_output(['git', 'ls-files', '--', '*.html'], cwd=root, text=True).splitlines()
    pages = {}
    for chemin in chemins:
        fichier = root / chemin
        if not fichier.is_file():
            continue
        page = page_publique(fichier.read_bytes().decode('utf-8'), chemin)
        if page:
            pages[page['url']] = page
    traductions, ambigues = familles(pages, root)
    modifiees = []
    for url, page in pages.items():
        neuf = normaliser(page, traductions[url])
        if neuf != page['source']:
            modifiees.append(page['chemin'])
            if ecrire:
                (root / page['chemin']).write_bytes(neuf.encode('utf-8'))
    groupes = {tuple(sorted(famille.values())) for famille in traductions.values()
               if famille is not None and len(famille) > 1}
    return {'modifiees': sorted(modifiees), 'familles_multilingues': len(groupes), 'ambigues': ambigues}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--write', action='store_true', help='Write repaired language links')
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[2]
    print(json.dumps(normaliser_site(root, ecrire=args.write), ensure_ascii=False, indent=2))

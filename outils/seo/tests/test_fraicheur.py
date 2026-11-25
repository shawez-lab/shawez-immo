import json
from pathlib import Path
import re
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from fraicheur import MANIFESTE, SITE, appliquer_page, appliquer_sitemap


class FraicheurTest(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        p = self.root / MANIFESTE
        p.parent.mkdir(parents=True)
        p.write_text(json.dumps({'/': '2026-11-25', '/estimation-immobiliere-dijon/': '2026-11-25'}))

    def page(self, graph, chemin='/', meta=''):
        return ('<!doctype html><html><head><link rel="canonical" href="' + SITE + chemin + '">'
                + meta + '<script type="application/ld+json">'
                + json.dumps({'@context': 'https://schema.org', '@graph': graph}, ensure_ascii=False)
                + '</script></head><body><h1>Texte inchangé.</h1></body></html>')

    def graph(self, source):
        return json.loads(re.search(r'<script type="application/ld\+json">(.*?)</script>', source)[1])['@graph']

    def test_sitemap_updates_only_documented_pages_and_preserves_later_dates(self):
        home = '<url><loc>' + SITE + '/</loc><lastmod>2026-11-18</lastmod><priority>1.0</priority></url>'
        estimation = '<url><loc>' + SITE + '/estimation-immobiliere-dijon/</loc><lastmod>2026-12-01T12:00:00+01:00</lastmod></url>'
        autre = '<url><loc>' + SITE + '/prix-immobilier-talant/</loc><lastmod>2026-10-31</lastmod></url>'
        xml = '<urlset>' + home + estimation + autre + '</urlset>'
        resultat = appliquer_sitemap(xml, self.root)
        self.assertIn(home.replace('2026-11-18', '2026-11-25'), resultat)
        self.assertIn(estimation, resultat)
        self.assertIn(autre, resultat)
        self.assertEqual(appliquer_sitemap(resultat, self.root), resultat)

    def test_sitemap_adds_missing_date_without_inventing_other_urls(self):
        xml = '<urlset><url><loc>' + SITE + '/</loc></url></urlset>'
        self.assertEqual(appliquer_sitemap(xml, self.root),
                         xml.replace('</loc>', '</loc><lastmod>2026-11-25</lastmod>'))

    def test_page_only_changes_matching_webpage_modified_date(self):
        page = {'@type': 'WebPage', '@id': SITE + '/#page', 'url': SITE + '/',
                'datePublished': '2026-09-25', 'dateModified': '2026-11-18'}
        article = {'@type': 'Article', 'datePublished': '2026-10-01', 'dateModified': '2026-11-18'}
        dvf = {'@type': 'Dataset', 'dateModified': '2026-11-18', 'temporalCoverage': '2023/2025'}
        autre = {'@type': 'WebPage', 'url': SITE + '/autre/', 'dateModified': '2026-09-25'}
        source = self.page([page, article, dvf, autre])
        resultat = appliquer_page(source, '/', self.root)
        graph = self.graph(resultat)
        self.assertEqual(graph[0], dict(page, dateModified='2026-11-25'))
        self.assertEqual(graph[1:], [article, dvf, autre])
        self.assertEqual(resultat[resultat.index('</head>'):], source[source.index('</head>'):])
        self.assertEqual(appliquer_page(resultat, '/', self.root), resultat)

    def test_later_page_date_keeps_entire_source_byte_identical(self):
        source = self.page([{'@type': 'WebPage', 'url': SITE + '/', 'dateModified': '2026-12-02T10:00:00Z'}])
        self.assertEqual(appliquer_page(source, '/', self.root), source)

    def test_unknown_noncanonical_and_noindex_pages_are_untouched(self):
        graph = [{'@type': 'WebPage', 'url': SITE + '/', 'dateModified': '2026-10-01'}]
        for source, chemin in [
            (self.page(graph), '/autre/'),
            (self.page(graph, '/autre/'), '/'),
            (self.page(graph, meta='<meta content="noindex,follow" name="robots">'), '/'),
            (self.page(graph, meta="<meta name='googlebot' content='NOINDEX'>"), '/'),
        ]:
            self.assertEqual(appliquer_page(source, chemin, self.root), source)

    def test_missing_webpage_date_added_but_other_scripts_unchanged(self):
        source = self.page([{'@type': ['WebPage', 'CollectionPage'], '@id': SITE + '/#page'}])
        other = '<script type="application/ld+json">{"@type":"FAQPage","dateModified":"2026-10-01"}</script>'
        source = source.replace('</head>', other + '</head>')
        resultat = appliquer_page(source, '/', self.root)
        self.assertEqual(self.graph(resultat)[0]['dateModified'], '2026-11-25')
        self.assertIn(other, resultat)


if __name__ == '__main__':
    unittest.main()

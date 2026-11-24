import json
from pathlib import Path
import sys
import tempfile
import unittest

SEO = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SEO))
import hreflang


def page(route, langue='fr', alternatives=(), robots=''):
    liens = '\n'.join('<link href="%s%s" hreflang="%s" rel="alternate">' %
                      (hreflang.SITE, cible, code) for code, cible in alternatives)
    return ('<!doctype html><html lang="%s"><head><meta charset="utf-8">'
            '<link rel="canonical" href="%s%s">\n'
            '<!--illu-hreflang-->\n%s\n<!--/illu-hreflang-->\n'
            '<link rel="alternate" type="application/rss+xml" href="/conseils/feed.xml">'
            '%s</head><body><main><h1>Contenu %s</h1><p>Texte inchangé.</p>'
            '<video src="/film.mp4"></video></main></body></html>') % (
                langue, hreflang.SITE, route, liens, robots, langue)


class HreflangTest(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        self.chemins = []

    def ajouter(self, route, source):
        chemin = route.lstrip('/') + 'index.html'
        fichier = self.root / chemin
        fichier.parent.mkdir(parents=True, exist_ok=True)
        fichier.write_bytes(source.encode('utf-8'))
        self.chemins.append(chemin)
        return fichier

    def reparer(self):
        return hreflang.normaliser_site(self.root, self.chemins, ecrire=True)

    def alternates(self, fichier):
        return dict(hreflang.Entete(fichier.read_text(encoding='utf-8')).alternates)

    def test_copied_french_templates_point_to_their_own_canonical(self):
        copied = [('fr-FR', '/prix-immobilier-fenay/'), ('x-default', '/prix-immobilier-fenay/')]
        fichiers = [self.ajouter(route, page(route, alternatives=copied))
                    for route in ['/prix-immobilier-chenove/', '/plan-du-site/']]
        avant = [f.read_text() for f in fichiers]
        resultat = self.reparer()
        self.assertEqual(len(resultat['modifiees']), 2)
        for fichier, ancien in zip(fichiers, avant):
            source = fichier.read_text()
            canonique = hreflang.Entete(source).canoniques[0][0]
            self.assertEqual(self.alternates(fichier), {'fr-fr': canonique, 'x-default': canonique})
            self.assertEqual(source[source.index('</head>'):], ancien[ancien.index('</head>'):])
            self.assertIn('type="application/rss+xml" href="/conseils/feed.xml"', source)
        self.assertEqual(self.reparer()['modifiees'], [])

    def test_catalog_restores_complete_french_english_dutch_family(self):
        routes = {'fr': '/conseils-vendeurs/exemple/', 'en': '/en/example/', 'nl': '/nl/voorbeeld/'}
        fichiers = {lg: self.ajouter(route, page(route, lg)) for lg, route in routes.items()}
        catalog = self.root / 'outils/seo/editorial_articles.json'
        catalog.parent.mkdir(parents=True)
        catalog.write_text(json.dumps([{'id': 'SUJET-1-' + lg.upper(), 'language': lg, 'path': route}
                                      for lg, route in routes.items()]))
        self.assertEqual(self.reparer()['familles_multilingues'], 1)
        attendus = {hreflang.LANGUES[lg].lower(): hreflang.SITE + route for lg, route in routes.items()}
        attendus['x-default'] = hreflang.SITE + routes['fr']
        for fichier in fichiers.values():
            self.assertEqual(self.alternates(fichier), attendus)
        self.assertEqual(self.reparer()['modifiees'], [])

    def test_valid_reciprocal_translations_stay_byte_identical_despite_a_clone(self):
        famille = [('fr-FR', '/conseils-vendeurs/original/'), ('en', '/en/original/'),
                   ('x-default', '/conseils-vendeurs/original/')]
        fr = self.ajouter('/conseils-vendeurs/original/', page('/conseils-vendeurs/original/', alternatives=famille))
        en = self.ajouter('/en/original/', page('/en/original/', 'en', famille))
        clone = self.ajouter('/autre-page/', page('/autre-page/', alternatives=famille))
        avant = [fr.read_bytes(), en.read_bytes()]
        resultat = self.reparer()
        self.assertEqual(resultat['modifiees'], ['autre-page/index.html'])
        self.assertEqual([fr.read_bytes(), en.read_bytes()], avant)
        self.assertEqual(self.alternates(clone), {'fr-fr': hreflang.SITE + '/autre-page/',
                                                'x-default': hreflang.SITE + '/autre-page/'})

    def test_homepages_get_reciprocal_real_languages(self):
        fr = self.ajouter('/', page('/'))
        en = self.ajouter('/en/', page('/en/', 'en'))
        self.reparer()
        attendus = {'fr-fr': hreflang.SITE + '/', 'en': hreflang.SITE + '/en/',
                    'x-default': hreflang.SITE + '/'}
        self.assertEqual(self.alternates(fr), attendus)
        self.assertEqual(self.alternates(en), attendus)

    def test_private_noindex_and_noncanonical_pages_are_untouched(self):
        mauvais = [('fr-FR', '/mauvaise-page/')]
        fichiers = [
            self.ajouter('/admin/', page('/admin/', alternatives=mauvais)),
            self.ajouter('/mon-espace/', page('/mon-espace/', alternatives=mauvais)),
            self.ajouter('/merci/', page('/merci/', alternatives=mauvais,
                                      robots='<meta name="robots" content="noindex,follow">')),
            self.ajouter('/ancienne/', page('/autre/', alternatives=mauvais)),
        ]
        avant = [f.read_bytes() for f in fichiers]
        self.assertEqual(self.reparer()['modifiees'], [])
        self.assertEqual([f.read_bytes() for f in fichiers], avant)

    def test_english_page_is_never_relabeled_french_without_a_translation(self):
        en = self.ajouter('/en/only/', page('/en/only/', 'en', [('fr-FR', '/sans-rapport/')]))
        self.ajouter('/sans-rapport/', page('/sans-rapport/'))
        self.reparer()
        self.assertEqual(self.alternates(en), {'en': hreflang.SITE + '/en/only/',
                                            'x-default': hreflang.SITE + '/en/only/'})
        self.assertIn('<html lang="en">', en.read_text())

    def test_attribute_order_quotes_and_crlf_do_not_damage_the_page(self):
        source = page('/prix/', alternatives=[('fr-FR', '/copie/')]).replace('\n', '\r\n')
        source = source.replace('rel="canonical" href="', "href='").replace('/prix/">', "/prix/' rel='canonical' />")
        fichier = self.ajouter('/prix/', source)
        self.reparer()
        neuf = fichier.read_bytes().decode('utf-8')
        self.assertEqual(self.alternates(fichier)['fr-fr'], hreflang.SITE + '/prix/')
        self.assertEqual(neuf[neuf.index('</head>'):], source[source.index('</head>'):])
        self.assertNotIn('\n', neuf.replace('\r\n', ''))
        self.assertEqual(self.reparer()['modifiees'], [])


if __name__ == '__main__':
    unittest.main()

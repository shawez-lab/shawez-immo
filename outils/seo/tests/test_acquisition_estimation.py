import html
from html.parser import HTMLParser
from pathlib import Path
import re
import sys
import unittest
from urllib.parse import parse_qs, urlsplit

SEO = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SEO))
from acquisition_estimation import appliquer, commune, MARQUE, STYLE_ID


def page(titre='Prix immobilier à Talant au m² (ventes DVF)', lede=True, lang='fr', meta=''):
    return (f'<!doctype html><html lang="{lang}"><head><title>{titre}</title>{meta}</head>'
            '<body><main id="main"><section><h1>' + titre + '</h1>'
            + ('<p class="lede">Les données locales, avec leurs sources.</p>' if lede else '')
            + '<p id="valeurs">385 ventes ; données et réserves inchangées.</p></section></main></body></html>')


class Liens(HTMLParser):
    def __init__(self, texte):
        super().__init__()
        self.liens = []
        self.feed(texte)

    def handle_starttag(self, tag, attrs):
        if tag == 'a':
            self.liens.append(dict(attrs).get('href', ''))


class AcquisitionEstimation(unittest.TestCase):
    def test_carte_apres_intro_liens_reels_et_donnees_preservees(self):
        avant = page()
        apres = appliquer(avant, '/prix-immobilier-talant/', None)
        self.assertIn('Votre bien à Talant : parlons de sa valeur.', apres)
        self.assertLess(apres.index('Les données locales'), apres.index(MARQUE))
        self.assertLess(apres.index(MARQUE), apres.index('id="valeurs"'))
        self.assertIn('385 ventes ; données et réserves inchangées.', apres)
        liens = Liens(apres).liens
        estimation = next(urlsplit(u) for u in liens if u.startswith('/estimation-immobiliere-dijon/'))
        self.assertEqual(estimation.path, '/estimation-immobiliere-dijon/')
        self.assertEqual(estimation.fragment, 'formulaire')
        self.assertEqual(parse_qs(estimation.query), {'commune': ['Talant'], 'origine': ['/prix-immobilier-talant/']})
        self.assertIn('tel:+33767579228', liens)
        self.assertIn('&amp;origine=', apres)

    def test_relance_sans_duplicata(self):
        apres = appliquer(page(), '/prix-immobilier-talant/')
        self.assertEqual(appliquer(apres, '/prix-immobilier-talant/'), apres)
        self.assertEqual(apres.count(MARQUE), 1)
        self.assertEqual(apres.count(f'id="{STYLE_ID}"'), 1)

    def test_accents_et_apostrophes_viennent_du_titre(self):
        cas = [('Chenôve', 'chenove'), ('Fontaine-lès-Dijon', 'fontaine-les-dijon'),
               ("Perrigny-sur-l'Ognon", 'perrigny-sur-l-ognon')]
        for nom, slug in cas:
            with self.subTest(nom=nom):
                chemin = '/prix-immobilier-' + slug + '/'
                texte = page('Prix immobilier à ' + html.escape(nom) + ' au m² (ventes DVF)')
                self.assertEqual(commune(texte, chemin), nom)
                apres = appliquer(texte, chemin)
                lien = next(u for u in Liens(apres).liens if u.startswith('/estimation-immobiliere-dijon/'))
                self.assertEqual(parse_qs(urlsplit(lien).query)['commune'], [nom])

    def test_commune_ne_se_deduit_pas_d_un_slug_ou_titre_discordant(self):
        self.assertEqual(commune(page('Prix immobilier à Talant au m²'), '/prix-immobilier-dijon/'), '')
        self.assertEqual(commune(page('Prix immobilier en Côte-d\'Or au m², commune par commune'), '/prix-immobilier-cote-d-or/'), '')
        apres = appliquer(page('Données immobilières'), '/prix-immobilier-commune-inconnue/')
        self.assertIn('Vous avez un bien à faire estimer ?', apres)
        self.assertNotIn('commune=', apres)

    def test_quartier_dijon_ne_devient_pas_commune(self):
        chemin = '/estimation-immobiliere-dijon/montchapet/'
        texte = page('Estimation immobilière à Dijon Montchapet : repères DVF')
        apres = appliquer(texte, chemin)
        lien = next(u for u in Liens(apres).liens if u.startswith('/estimation-immobiliere-dijon/'))
        self.assertEqual(parse_qs(urlsplit(lien).query)['commune'], ['Dijon'])
        self.assertIn('Votre bien à Dijon : parlons de sa valeur.', apres)

    def test_dijon_et_routes_vendre(self):
        self.assertEqual(commune(page('Prix immobilier à Dijon en 2026 : les repères DVF'), '/prix-immobilier-dijon/'), 'Dijon')
        self.assertEqual(commune(page('Vendre sa maison à Dijon | Shawez Ali'), '/vendre-maison-dijon/'), 'Dijon')
        self.assertEqual(commune(page('Agent immobilier à Beaune : estimer et vendre | Shawez Ali'), '/agent-immobilier-beaune/'), 'Beaune')

    def test_exclusions_sans_mutation(self):
        for chemin in ['/', '/admin/', '/mon-espace/', '/estimer/', '/estimation-immobiliere-dijon/',
                       '/estimation-en-ligne/', '/merci/', '/mentions-legales/', '/honoraires/', '/politique-de-confidentialite/',
                       '/404.html', '/biens/512-appartement-chenove/', '/en/', '/en/sell-property/',
                       '/estimation-loyer-dijon/', '//example.com/', '/prix-immobilier-talant/?adresse=personnelle',
                       '/prix-immobilier-talant/#nom', '/prix-immobilier-talant/../']:
            with self.subTest(chemin=chemin):
                texte = page()
                self.assertEqual(appliquer(texte, chemin), texte)
        for lang in ['en', 'nl', 'de', 'ar']:
            texte = page(lang=lang)
            self.assertEqual(appliquer(texte, '/vendre-maison-dijon/'), texte)
        for meta in ['<meta name="robots" content="noindex,follow">',
                     '<meta content="noindex" name="googlebot">',
                     '<meta http-equiv="refresh" content="0;url=/">']:
            texte = page(meta=meta)
            self.assertEqual(appliquer(texte, '/prix-immobilier-talant/'), texte)

    def test_fallback_dans_main_et_pas_hors_page(self):
        texte = page(lede=False)
        apres = appliquer(texte, '/conseils-vendeurs/preparer-une-vente/')
        self.assertIn('<main id="main">\n' + MARQUE, apres)
        self.assertIn('acq-est-main', apres)
        self.assertEqual(appliquer('<p>Fragment sans main.</p>', '/vendre-maison-dijon/'), '<p>Fragment sans main.</p>')


if __name__ == '__main__':
    unittest.main()

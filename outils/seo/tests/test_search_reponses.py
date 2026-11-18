import json
import pathlib
import re
import sys
import unittest

SEO = pathlib.Path(__file__).resolve().parents[1]
ROOT = SEO.parents[1]
sys.path.insert(0, str(SEO))
import search_reponses as sr


class SearchReponses(unittest.TestCase):
    def test_questions_francaises_reponses_en_tete_et_attribuees(self):
        # Les 17 questions demandées sont distribuées sur 12 pages ; la page agent
        # apporte en plus la réponse de choix, sans la compter deux fois.
        questions = sr.reponses(ROOT)
        self.assertEqual(sum(len(v) for k, v in questions.items() if k != '/agent-immobilier-dijon/'), 17)
        for chemin, items in questions.items():
            with self.subTest(chemin=chemin):
                s = (ROOT / chemin.strip('/') / 'index.html').read_text()
                bloc = re.search(r'<!-- search-reponses -->(.*?)<!-- /search-reponses -->', s, re.S)
                self.assertIsNotNone(bloc)
                self.assertLess(bloc.start(), s.index('</h1>') + 20)
                self.assertEqual(bloc[1].count('class="search-reponse"'), len(items))
                for question, reponse in items:
                    self.assertIn(sr.NOM, reponse)
                    self.assertNotRegex(reponse.lower(), r'\bmandataire\b|gratuit|realadvisor|\bia\b')
                self.assertEqual(sr.appliquer(s, chemin, ROOT), s)

    def test_identite_et_video_inchangee(self):
        video = {'@type': 'VideoObject', 'name': 'Film', 'contentUrl': '/film.mp4'}
        graph = [
            {'@type': 'RealEstateAgent', '@id': sr.SITE + '/#agent', 'name': 'Ancien nom', 'hasMap': 'ancien'},
            {'@type': 'Person', '@id': sr.SITE + '/#shawez', 'contactPoint': {'availableLanguage': 'fr'}, 'sameAs': ['https://www.youtube.com/@gravelinimmo', 'https://www.instagram.com/shawez_immo']},
            {'@type': 'RealEstateAgent', '@id': sr.SITE + '/#gravelin', 'openingHoursSpecification': [{'opens': '09:00'}], 'openingHours': 'Mo-Fr 09:00-19:00'},
            {'@type': 'WebPage', 'about': {'@type': 'Place', 'name': 'Dijon'}}, video,
        ]
        s = '<script type="application/ld+json">' + json.dumps({'@graph': graph}) + '</script>'
        n = json.loads(re.search(r'>(.*?)</script>', sr.balisage(s), re.S)[1])['@graph']
        self.assertEqual(n[0]['name'], 'Shawez Ali')
        self.assertEqual(n[1]['contactPoint']['availableLanguage'], sr.LANGUES)
        self.assertEqual(n[1]['knowsLanguage'], sr.LANGUES)
        self.assertNotIn('openingHoursSpecification', n[2])
        self.assertNotIn('openingHours', n[2])
        self.assertEqual(n[-1], video)
        self.assertEqual(n[3]['about'][0], {'@type': 'Place', 'name': 'Dijon'})
        self.assertIn({'@id': sr.SITE + '/#agent'}, n[3]['about'])
        self.assertEqual(sr.balisage(sr.balisage(s)), sr.balisage(s))

    def test_faq_visible_et_balisage_coherents(self):
        for chemin in ['/vendre-bien-immobilier-dijon/', '/estimation-immobiliere-dijon/', '/vendre-commerce-dijon/']:
            s = (ROOT / chemin.strip('/') / 'index.html').read_text()
            data = json.loads(re.search(r'<script type="application/ld\+json">(.*?)</script>', s, re.S)[1])
            faq = next(n for n in data['@graph'] if n.get('@type') == 'FAQPage')
            from html import unescape
            texte = unescape(re.sub('<[^>]*>', '', s))
            for q in faq['mainEntity']:
                self.assertIn(unescape(q['acceptedAnswer']['text']).replace('\xa0', ' '), texte.replace('\xa0', ' '))
        self.assertNotIn('vous choisissez', sr.MANDAT)

    def test_avis_sans_texte_non_publies(self):
        source = json.loads((ROOT / 'avis.json').read_text())
        if not source['avis']:
            s = (ROOT / 'avis/index.html').read_text()
            self.assertNotIn('<article class="avis-card">', s)
            self.assertNotIn('Ce que mes clients disent le plus souvent', s)


if __name__ == '__main__':
    unittest.main()

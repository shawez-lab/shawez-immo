import json
import pathlib
import re
import sys
import tempfile
import unittest

OUTILS = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(OUTILS / 'biens'))
import build_biens


class EcritureFiche(unittest.TestCase):
    def test_ecrit_la_fiche_avec_son_balisage_et_sa_video(self):
        video = {'@type': 'VideoObject', 'name': 'Visite', 'contentUrl': '/visite.mp4'}
        graph = [
            {'@type': 'RealEstateAgent', '@id': 'https://shawez-immo.com/#agent',
             'name': 'Ancien nom'},
            video,
        ]
        source = '<html><head><script type="application/ld+json">' + json.dumps(
            {'@graph': graph}, ensure_ascii=False
        ) + '</script></head><body>Maison à Dijon</body></html>'

        with tempfile.TemporaryDirectory() as dossier:
            cible = pathlib.Path(dossier) / 'biens' / 'maison-dijon' / 'index.html'
            build_biens.ecrire(str(cible), source)
            resultat = cible.read_text(encoding='utf-8')
            donnees = json.loads(re.search(
                r'<script type="application/ld\+json">(.*?)</script>', resultat, re.S
            )[1])['@graph']

            self.assertIn('Maison à Dijon', resultat)
            self.assertEqual(donnees[0]['name'], 'Shawez Ali')
            self.assertEqual(donnees[1], video)
            build_biens.ecrire(str(cible), resultat)
            self.assertEqual(cible.read_text(encoding='utf-8'), resultat)


if __name__ == '__main__':
    unittest.main()

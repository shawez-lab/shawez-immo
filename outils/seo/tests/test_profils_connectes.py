import json
from pathlib import Path
import sys
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from search_reponses import balisage, SITE, TIKTOK


class ProfilsConnectes(unittest.TestCase):
    def test_reference_tiktok_corrigee_uniquement_pour_shawez(self):
        ancien = 'https://www.tiktok.com/@shawez_immobilier'
        autre = {'@type': 'VideoObject', '@id': SITE + '/video#exemple', 'sameAs': [ancien]}
        graph = {'@graph': [
            {'@type': 'Person', '@id': SITE + '/#shawez', 'sameAs': [ancien, TIKTOK, 'https://www.instagram.com/shawez_immo']},
            autre,
        ]}
        source = '<script type="application/ld+json">' + json.dumps(graph) + '</script>'
        resultat = balisage(source)
        data = json.loads(resultat.split('>', 1)[1].rsplit('</script>', 1)[0])
        profils = data['@graph'][0]['sameAs']
        self.assertNotIn(ancien, profils)
        self.assertEqual(profils.count(TIKTOK), 1)
        self.assertIn('https://www.instagram.com/shawez_immo', profils)
        self.assertEqual(data['@graph'][1], autre)
        self.assertEqual(balisage(resultat), resultat)


if __name__ == '__main__':
    unittest.main()

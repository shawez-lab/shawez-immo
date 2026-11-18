import pathlib
import sys
import unittest
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
from sync_annonces import extras_fiche
from energie_annonces import images_diagnostic, lire_image

FIX = pathlib.Path(__file__).parent / 'fixtures'
class EnergieReelle(unittest.TestCase):
    def test_quatre_fiches_reelles(self):
        expected = {'349A': {'dpe': 'D', 'dpe_kwh_m2_an': 185, 'ges': 'B', 'ges_kg_co2_m2_an': 6},
                    '394': {'dpe': 'F', 'dpe_kwh_m2_an': 356, 'ges': 'D', 'ges_kg_co2_m2_an': 49},
                    '383': {}, '403': {}}
        for ref, values in expected.items():
            with self.subTest(ref=ref):
                s = (FIX / (ref + '.html')).read_text()
                def image(src):
                    i = 1 if 'type=GES' in src else 0
                    return (FIX / (ref + '-' + str(i) + '.jpg')).read_bytes()
                actual = extras_fiche(s, charge_image=image)
                self.assertEqual({k:v for k,v in actual.items() if k in ('dpe','ges','dpe_kwh_m2_an','ges_kg_co2_m2_an')}, values)
    def test_absence_ambiguite_et_panne(self):
        self.assertEqual(extras_fiche('<p>Pas de diagnostic</p>'), {})
        self.assertEqual(extras_fiche('<p>DPE vierge</p>'), {})
        self.assertEqual(images_diagnostic('<img src="https://evil.invalid/admin/dpe.php?idann=1">'), {})
        s = (FIX/'349A.html').read_text()
        def panne(_): raise TimeoutError()
        self.assertEqual(extras_fiche(s, charge_image=panne), {})
        self.assertEqual(lire_image((FIX/'383-0.jpg').read_bytes(), 'dpe'), {})
    def test_texte_existant(self):
        self.assertEqual(extras_fiche('<p>DPE : F. GES : D.</p>'), {'dpe':'F','ges':'D'})
if __name__ == '__main__': unittest.main()

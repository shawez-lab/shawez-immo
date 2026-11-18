import copy
import pathlib
import sys
import unittest
from unittest.mock import patch

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1]))
import sync_annonces as sync

CONNUS = {'dpe': 'D', 'dpe_kwh_m2_an': 185, 'ges': 'B', 'ges_kg_co2_m2_an': 6}
DIAGNOSTIC = '<img src="/admin/dpe.php?idann=123"><img src="/admin/dpe.php?idann=123&type=GES">'

class PreservationDiagnostics(unittest.TestCase):
    def synchroniser(self, nouveaux, connu=True):
        carte = {'ref': 'TEST', 'id': '123', 'chemin': '/vente/21/appartement/123-test',
                 'commune': 'Dijon', 'cp': '21000', 'prix': 120000, 'compo': '2 pièces 50 m²', 'mentions': []}
        ancien = dict(carte, **CONNUS, status='en vente', photos={}, first_seen='2026-01-01')
        etat = {'annonces': {'TEST': copy.deepcopy(ancien)} if connu else {}}
        fiche = dict(tableau={}, texte='Ref : TEST', mentions_fiche=[], energie=None,
                     description='', photos=[], **nouveaux)
        with patch.multiple(sync, PAGES=['https://example.invalid'], PASSES=1), \
             patch.object(sync, 'get', return_value=b'fixture'), \
             patch.object(sync, 'cartes', return_value=[carte]), \
             patch.object(sync, 'fiche', return_value=fiche), \
             patch.object(sync, 'photos', return_value={}), \
             patch.object(sync, 'lien_valide', return_value=True), \
             patch.object(sync, 'journal'), \
             patch.object(sync.os.path, 'exists', return_value=False):
            sync.synchronise(etat)
        return {k: etat['annonces']['TEST'].get(k) for k in CONNUS}

    def test_echec_lecture_conserve_les_quatre_champs(self):
        def panne(_):
            raise TimeoutError('fixture')
        nouveaux = sync.extras_fiche(DIAGNOSTIC, charge_image=panne)
        self.assertEqual(self.synchroniser(nouveaux), CONNUS)

    def test_tesseract_absent_conserve_les_quatre_champs(self):
        with patch('energie_annonces.lire_image', side_effect=FileNotFoundError('tesseract')):
            nouveaux = sync.extras_fiche(DIAGNOSTIC, charge_image=lambda _: b'fixture')
        self.assertEqual(self.synchroniser(nouveaux), CONNUS)

    def test_valeurs_vides_ne_remplacent_jamais_les_connues(self):
        self.assertEqual(self.synchroniser({'dpe': '', 'ges': ' ', 'dpe_kwh_m2_an': None}), CONNUS)

    def test_lecture_partielle_et_nouvelles_valeurs(self):
        self.assertEqual(self.synchroniser({'dpe': 'C', 'dpe_kwh_m2_an': 130}),
                         {**CONNUS, 'dpe': 'C', 'dpe_kwh_m2_an': 130})
        self.assertEqual(self.synchroniser({'ges_kg_co2_m2_an': 0}),
                         {**CONNUS, 'ges_kg_co2_m2_an': 0})

    def test_nouvelle_fiche_sans_diagnostic_reste_inconnue(self):
        self.assertEqual(self.synchroniser({}, connu=False), dict.fromkeys(CONNUS))

if __name__ == '__main__':
    unittest.main()

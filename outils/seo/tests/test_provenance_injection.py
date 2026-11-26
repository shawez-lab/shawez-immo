import importlib.util
from pathlib import Path
import unittest

spec = importlib.util.spec_from_file_location('site_build', Path(__file__).resolve().parents[2] / 'build.py')
build = importlib.util.module_from_spec(spec)
spec.loader.exec_module(build)


class ProvenanceInjection(unittest.TestCase):
    def test_landing_avec_lien_ou_formulaire_recoit_un_seul_script(self):
        for tag in ['<a href="/estimation-immobiliere-dijon/?commune=Dijon">Estimer</a>',
                    "<form action='/estimation-immobiliere-dijon/#formulaire'></form>"]:
            source = '<html><body>' + tag + '</body></html>'
            resultat = build.patch_provenance(source, 'agent-immobilier-dijon/index.html')
            self.assertEqual(resultat.count(build.PROVENANCE), 1)
            self.assertIn(tag, resultat)
            self.assertEqual(build.patch_provenance(resultat, 'agent-immobilier-dijon/index.html'), resultat)

    def test_pages_privees_et_tunnel_adresse_ne_recoivent_pas_le_script(self):
        source = '<body><a href="/estimation-immobiliere-dijon/">Estimer</a>' + build.PROVENANCE + '\n</body>'
        for chemin in ['admin/index.html', 'mon-espace/index.html', 'estimer/index.html', 'merci/index.html']:
            with self.subTest(chemin=chemin):
                self.assertNotIn(build.PROVENANCE, build.patch_provenance(source, chemin))

    def test_page_sans_destination_ou_fragment_incomplet_reste_intact(self):
        for source in ['<body><a href="/contact/">Contact</a></body>',
                       '<a href="/estimation-immobiliere-dijon/">Estimer</a>']:
            self.assertEqual(build.patch_provenance(source, 'exemple/index.html'), source)


if __name__ == '__main__':
    unittest.main()

import hashlib
import importlib.util
import json
import pathlib
import re
import shutil
import sys
import tempfile
import unittest
from unittest.mock import patch

SEO = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SEO))
import dijon_quartiers as dq


class GeometrieEtCalcul(unittest.TestCase):
    def test_polygone_trou_multipolygone_et_limites(self):
        carre = [[0, 0], [4, 0], [4, 4], [0, 4], [0, 0]]
        trou = [[1, 1], [2, 1], [2, 2], [1, 2], [1, 1]]
        p = {'type': 'Polygon', 'coordinates': [carre, trou]}
        self.assertTrue(dq.contient(p, 3, 3))
        self.assertTrue(dq.contient(p, 0, 3))
        self.assertFalse(dq.contient(p, 1.5, 1.5))
        self.assertFalse(dq.contient(p, 5, 5))
        self.assertTrue(dq.contient({'type': 'MultiPolygon', 'coordinates': [[carre]]}, 3, 3))
        with self.assertRaises(ValueError):
            dq.contient({'type': 'Point', 'coordinates': [0, 0]}, 0, 0)

    def test_mediane_et_evolution_pas_moyenne(self):
        ventes = [{'prix_m2': n, 'prix': n * 50} for n in [1000, 2000, 3000, 4000, 10000, 11000]]
        s = dq.stats(ventes)
        self.assertEqual(s, {'ventes': 6, 'median_m2': 3500, 'median_prix': 175000})
        self.assertAlmostEqual(dq.evolution({'median_m2': 2800}, s), 25)
        self.assertIsNone(dq.stats(ventes[:4])['median_m2'])
        self.assertIsNone(dq.evolution(dq.stats([]), s))
        self.assertEqual(dq.fr(2964.5), '2\u202f965')


class PublicationDVF(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.tmp = tempfile.TemporaryDirectory()
        cls.root = pathlib.Path(cls.tmp.name)
        for f in ['index.html', 'estimation-immobiliere-dijon/index.html', 'sitemap.xml',
                  'outils/seo/dijon-quartiers.geojson', 'plan-du-site/index.html']:
            p = cls.root / f
            p.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(dq.ROOT / f, p)
        shutil.copytree(dq.ROOT / 'donnees-dvf', cls.root / 'donnees-dvf')
        cls.manifeste = dq.construire(cls.root)
        cls.meta, cls.ville, cls.quartiers = dq.charger(cls.root)

    @classmethod
    def tearDownClass(cls):
        cls.tmp.cleanup()

    def test_donnees_reelles_et_partition_sans_double_compte(self):
        # Contrôle indépendant sur les lignes de détail, stable lors des mises à jour mensuelles.
        nombre_source = sum(1 for p in (self.root / 'donnees-dvf/d').glob('*.txt') for l in p.read_text().splitlines() if dq.normal(json.loads(l)[2]).strip() == 'dijon')
        self.assertEqual(len(self.ville), nombre_source)
        self.assertEqual(len(self.quartiers), 9)
        self.assertEqual(sum(len(q['ventes']) for q in self.quartiers), len(self.ville))
        self.assertEqual(self.meta['ventes_limite_ambigue'], 0)
        self.assertEqual(self.meta['ventes_hors_contours'], 0)
        self.assertTrue(all(len(q['ventes']) > 0 for q in self.quartiers))

    def test_pages_liens_canonicals_donnees_structurees_et_confidentialite(self):
        for q in self.quartiers:
            with self.subTest(quartier=q['nom']):
                s = (self.root / dq.url(q).strip('/') / 'index.html').read_text()
                self.assertEqual(len(re.findall(r'<h1\b', s)), 1)
                self.assertIn(f'<link rel="canonical" href="{dq.SITE + dq.url(q)}">', s)
                self.assertIn('href="/estimer/"', s)
                self.assertIn('Estimation immobilière', s)
                self.assertIn('estimation offerte', s)
                self.assertNotRegex(s.lower(), r'\b(mandataire|gratuit|ia)\b|intelligence artificielle|streetaddress')
                self.assertNotRegex(s, r'\b\d+\s+(rue|avenue|boulevard)\b')
                self.assertNotIn('latitude', s)
                self.assertEqual(set(re.findall(r'<img src="([^"]+)"', s)), {dq.PHOTO})
                data = json.loads(re.search(r'<script type="application/ld\+json">(.*?)</script>', s)[1])
                types = {n['@type'] for n in data['@graph']}
                self.assertTrue({'WebPage', 'Dataset', 'Service', 'BreadcrumbList', 'FAQPage', 'RealEstateAgent'} <= types)
                for autre in self.quartiers:
                    if q != autre:
                        self.assertIn(f'href="{dq.url(autre)}"', s)
                dernieres = sorted(q['ventes'], key=lambda v: (v['mois'], v['jour'], v['type'], v['surface'], v['prix']), reverse=True)[:8]
                for vente in dernieres:
                    self.assertIn(dq.fr(vente['prix']) + ' €</td>', s)

    def test_prix_commune_meme_reference_que_estimation(self):
        from search_prix import spec
        p = spec(self.root)
        for type_ in (0, 1):
            ventes = [v for v in self.ville if v['type'] == type_ and v['mois'] // 100 == 2025]
            self.assertIn(dq.fr(dq.stats(ventes)['median_m2']) + ' €/m²', p['lede'])
            self.assertIn(dq.fr(dq.stats(ventes)['median_m2']) + ' €/m²', p['faq'][0][1])
        self.assertNotIn('immovrai', str(p))
        self.assertNotIn('1,2 km', str(p))
        self.assertIn('2026', p['title'])
        self.assertIn('ne contient pas encore de ventes de 2026', p['lede'])

    def test_pilier_accueil_plan_sitemap_et_indexnow(self):
        pilier = (self.root / 'estimation-immobiliere-dijon/index.html').read_text()
        plan = (self.root / 'plan-du-site/index.html').read_text()
        sm = (self.root / 'sitemap.xml').read_text()
        locs = re.findall(r'<loc>(.*?)</loc>', sm)
        self.assertEqual(len(locs), len(set(locs)))
        spec = importlib.util.spec_from_file_location('indexnow', dq.ROOT / 'outils/indexnow.py')
        mod = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(mod)
        with patch.object(mod, 'ROOT', str(self.root)):
            for q in self.quartiers:
                cible = dq.SITE + dq.url(q)
                self.assertIn(f'href="{dq.url(q)}"', pilier)
                self.assertIn(f'href="{dq.url(q)}"', plan)
                self.assertEqual(locs.count(cible), 1)
                self.assertEqual(mod.url_de(dq.url(q).strip('/') + '/index.html'), cible)
                self.assertIn(cible, mod.urls_sitemap())
        self.assertIn('href="/estimation-immobiliere-dijon/#quartiers"', (self.root / 'index.html').read_text())

    def test_regeneration_identique_sans_reseau(self):
        def empreintes():
            return {str(p.relative_to(self.root)): hashlib.sha256(p.read_bytes()).hexdigest() for p in self.root.rglob('*') if p.is_file()}
        avant = empreintes()
        dq.construire(self.root)
        self.assertEqual(empreintes(), avant)

    def test_quartier_sans_donnees_aucune_page_et_ancienne_page_retiree(self):
        contour = self.root / 'outils/seo/dijon-quartiers.geojson'
        original = contour.read_text()
        data = json.loads(original)
        data['features'].append({'type': 'Feature', 'properties': {'nom': 'Sans données'}, 'geometry': {'type': 'Polygon', 'coordinates': [[[0, 0], [1, 0], [1, 1], [0, 0]]]}})
        contour.write_text(json.dumps(data))
        ancienne = self.root / 'estimation-immobiliere-dijon/sans-donnees/index.html'
        ancienne.parent.mkdir()
        ancienne.write_text('<body class="dq">Page périmée</body>')
        try:
            resultat = dq.construire(self.root)
            self.assertEqual(len(resultat['quartiers']), 9)
            self.assertFalse(ancienne.exists())
            self.assertNotIn('/sans-donnees/', (self.root / 'sitemap.xml').read_text())
        finally:
            contour.write_text(original)
            dq.construire(self.root)

    def test_maillage_fiches_preserve_strictement_videos(self):
        for commune in ('Dijon', 'Talant'):
            path = self.root / f'biens/test-{commune}/index.html'
            path.parent.mkdir(parents=True, exist_ok=True)
            listing = {'@graph': [{'@type': 'RealEstateListing', 'about': {'address': {'addressLocality': commune}}}]}
            video = '<video autoplay muted data-ref="fixture"><source src="film.mp4"></video><script id="video-js">const videoFixture=42;</script>'
            path.write_text('<head></head><script type="application/ld+json">' + json.dumps(listing) + '</script><main>' + video + '</main>')
            dq.mailler(self.root, self.quartiers, 2025)
            nouveau = path.read_text()
            self.assertIn(video, nouveau)
            self.assertEqual('dijon-quartiers-fiche' in nouveau, commune == 'Dijon')
            path.unlink()

    def test_annee_partielle_ne_remplace_pas_le_millesime_complet(self):
        index = self.root / 'donnees-dvf/index.json'
        original = index.read_text()
        data = json.loads(original)
        data['annees'] = [2024, 2025, 2026]
        data['derniere_vente'] = '2026-06-30'
        index.write_text(json.dumps(data))
        try:
            resultat = dq.construire(self.root)
            self.assertEqual(resultat['annee_reference'], 2025)
            p = (self.root / 'estimation-immobiliere-dijon/centre-ville/index.html').read_text()
            self.assertIn('DVF 2025', p)
            self.assertNotIn('marché de 2026', p)
            self.assertIn('2026-06-30', p)
        finally:
            index.write_text(original)
            dq.construire(self.root)


if __name__ == '__main__':
    unittest.main()

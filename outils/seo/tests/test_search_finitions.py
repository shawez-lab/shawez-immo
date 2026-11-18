import json
import pathlib
import re
import subprocess
import sys
import unittest

SEO = pathlib.Path(__file__).resolve().parents[1]
ROOT = SEO.parents[1]
sys.path.insert(0, str(SEO))
import search_finitions as sf
import search_reponses as sr


class SearchFinitions(unittest.TestCase):
    def test_hero_mobile_differe_sans_source_initiale(self):
        s = (ROOT / 'index.html').read_text()
        video = re.search(r'<video id="hero-video".*?</video>', s, re.S)[0]
        self.assertIn('preload="none"', video)
        self.assertNotRegex(video, r'\sautoplay\b|<source[^>]*\ssrc=')
        self.assertIn('heroPainted=false', s)
        self.assertEqual(sf.appliquer(s, '/'), s)
        subprocess.run(['node', '--test', str(SEO / 'tests/test_hero_differe.mjs')], check=True, capture_output=True)

    def test_honoraires_llms_contact_et_prestige(self):
        self.assertIn('Fiche Google : Shawez Ali', (ROOT / 'llms.txt').read_text())
        self.assertNotIn('Fiche Google : « Shawez Ali —', (ROOT / 'llms.txt').read_text())
        self.assertIn('<span>Mes horaires</span>', (ROOT / 'contact/index.html').read_text())
        h = (ROOT / 'honoraires/index.html').read_text()
        self.assertRegex(h, r'<h1[^>]*>Honoraires de vente et de location à Dijon')
        p = (ROOT / 'chateau-a-vendre-bourgogne/index.html').read_text()
        self.assertIn(sf.PRESTIGE, p)
        self.assertIn('Faire estimer ma propriété, offert', p)

    def test_profils_nom_langues_et_horaires_sur_toutes_pages_publiques(self):
        for p in ROOT.rglob('*.html'):
            rel = p.relative_to(ROOT)
            if rel.parts[0] in ('outils', 'de-claude', 'admin', 'mon-espace', '.git', 'node_modules'):
                continue
            for m in re.finditer(r'<script type="application/ld\+json">(.*?)</script>', p.read_text(), re.S):
                data = json.loads(m[1])
                for n in data.get('@graph', [data]):
                    if n.get('@id') == sr.SITE + '/#agent':
                        self.assertEqual(n['name'], 'Shawez Ali', str(rel))
                        self.assertIn(sf.CYLEX, n['sameAs'], str(rel))
                    if n.get('@id') in (sr.SITE + '/#shawez', sr.SITE + '/#agent'):
                        self.assertEqual(n['knowsLanguage'], sr.LANGUES, str(rel))
                        self.assertFalse(any('@gravelinimmo' in u for u in n['sameAs']), str(rel))
                    if n.get('@id') == sr.SITE + '/#gravelin':
                        self.assertNotIn('openingHoursSpecification', n, str(rel))
                        self.assertNotIn('openingHours', n, str(rel))


if __name__ == '__main__':
    unittest.main()

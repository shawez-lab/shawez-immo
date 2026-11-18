import difflib
import html
import json
import pathlib
import re
import sys
import unittest

SEO = pathlib.Path(__file__).resolve().parents[1]
ROOT = SEO.parents[1]
sys.path.insert(0, str(SEO))
import dijon_quartiers as dq
import prix_communes as pc
import search_local as sl
import search_quartiers as sq


class SearchLocal(unittest.TestCase):
    def test_voisins_sont_des_limitrophes_et_non_des_centres_proches(self):
        voisins = json.loads((SEO / 'communes-voisines.json').read_text())['communes']
        self.assertIn('Fontaine-lès-Dijon', voisins['Daix'])
        self.assertNotIn('Auxonne', voisins['Daix'])
        self.assertEqual(set(voisins['Talant']), {'Daix', 'Dijon', 'Fontaine-lès-Dijon', 'Plombières-lès-Dijon'})
        for n, noms in voisins.items():
            for autre in noms:
                self.assertIn(n, voisins[autre])
        for p in ROOT.glob('prix-immobilier-*/index.html'):
            s = p.read_text()
            if pc.MARQUE not in s:
                continue
            nom = html.unescape(re.search(r'<h1[^>]*>Prix immobilier à (.*?) :', s)[1])
            carte = re.search(r'<h3>Communes voisines</h3>(.*?)</div>', s, re.S)[1]
            for voisin in re.findall(r'>Prix immobilier à (.*?)</a>', carte):
                self.assertIn(html.unescape(voisin), voisins[nom], p)

    def test_zone_et_58_pages_hors_zone(self):
        hors = []
        for p in ROOT.glob('prix-immobilier-*/index.html'):
            s = p.read_text()
            if pc.MARQUE not in s:
                continue
            nom = html.unescape(re.search(r'<h1[^>]*>Prix immobilier à (.*?) :', s)[1])
            if nom not in sl.ZONE_GOOGLE:
                hors.append(nom)
                self.assertIn('Je travaille depuis Dijon.', s)
                texte = html.unescape(re.sub('<[^>]*>', ' ', s)).lower()
                self.assertNotRegex(texte, r'je viens chez vous|je me déplace|estimation chez vous, offerte')
            else:
                self.assertIn('id="ce-qui-se-vend"', s)
                self.assertIn('id="questions"', s)
                self.assertIn('id="les-rues"', s)
        self.assertEqual(len(hors), 58)

    def test_neuf_quartiers_sources_noms_et_textes_distincts(self):
        textes = []
        manifeste = json.loads((ROOT / 'donnees-dvf/quartiers-dijon.json').read_text())
        for q in manifeste['quartiers']:
            p = ROOT / q['url'].strip('/') / 'index.html'
            s = p.read_text()
            self.assertIn('Comprendre ce quartier avant de fixer votre prix', s)
            self.assertNotIn('Gresilles', s)
            if q['slug'] in sq.GUIDES:
                self.assertIn('/conseils-vendeurs/' + sq.GUIDES[q['slug']][0] + '/', s)
            for chemin in ('prix-immobilier-dijon/index.html', 'secteurs-dijon-nuits-saint-georges-beaune/index.html'):
                parent = (ROOT / chemin).read_text()
                self.assertIn('href="' + q['url'] + '"', parent)
                self.assertIn(html.escape(q['nom']), parent)
            main = re.search(r'<main\b.*?</main>', s, re.S)[0]
            textes.append(html.unescape(re.sub('<[^>]+>', ' ', main)).split())
        # Contrôle de régression du texte intégral du main, navigation comprise.
        for i, a in enumerate(textes):
            for b in textes[i+1:]:
                self.assertLess(difflib.SequenceMatcher(None, a, b, autojunk=False).ratio(), .8)

    def test_neuilly_contour_fusionne_et_redirection(self):
        idx, ventes = pc.charge()
        selection = [v for v in ventes if v['commune'] == 'Neuilly-Crimolois']
        self.assertTrue(selection)
        # Toutes les ventes du libellé ancien sont conservées dans la commune actuelle.
        anciens = sum(1 for p in (ROOT / 'donnees-dvf/d').glob('*.txt') for l in p.read_text().splitlines() if json.loads(l)[2] in ('Neuilly-lès-Dijon', 'Crimolois', 'Neuilly-Crimolois'))
        self.assertGreaterEqual(len(selection), anciens)
        nouveau = '/prix-immobilier-neuilly-crimolois/'
        s = (ROOT / nouveau.strip('/') / 'index.html').read_text()
        self.assertIn('Prix immobilier à Neuilly-Crimolois', s)
        self.assertIn('href="https://shawez-immo.com' + nouveau + '"', s)
        self.assertIn('/prix-immobilier-neuilly-les-dijon/ ' + nouveau + ' 301', (ROOT / '_redirects').read_text())
        sitemap = (ROOT / 'sitemap.xml').read_text()
        self.assertNotIn('<loc>https://shawez-immo.com/prix-immobilier-neuilly-les-dijon/</loc>', sitemap)
        self.assertEqual(sitemap.count('<loc>https://shawez-immo.com' + nouveau + '</loc>'), 1)


if __name__ == '__main__':
    unittest.main()

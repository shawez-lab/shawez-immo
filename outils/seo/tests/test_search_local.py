import difflib
import html
import json
import pathlib
import re
import sys
import unittest
from unittest.mock import patch

SEO = pathlib.Path(__file__).resolve().parents[1]
ROOT = SEO.parents[1]
sys.path.insert(0, str(SEO))
import dijon_quartiers as dq
import prix_communes as pc
import search_local as sl
import search_quartiers as sq


class SearchLocal(unittest.TestCase):
    def test_generation_commune_preserve_sa_video_et_non_celle_du_gabarit(self):
        import statistics
        idx, ventes = pc.charge()
        dep = {'app': statistics.median(v['pm2'] for v in ventes if not v['maison']),
               'mai': statistics.median(v['pm2'] for v in ventes if v['maison'])}
        stats = pc.analyse('Talant', [v for v in ventes if v['commune'] == 'Talant'], dep, idx['annees'])
        stats.update(a0=min(idx['annees']), a1=max(idx['annees']), derniere_fr=idx['derniere_vente'])
        p = pc.page(stats, [], [], idx['annees'])
        actuel = (ROOT / 'prix-immobilier-talant/index.html').read_text()
        gabarit = (ROOT / 'prix-immobilier-fenay/index.html').read_text()
        def videos(s):
            out = []
            def inspecte(n):
                if isinstance(n, dict):
                    if n.get('@type') == 'VideoObject':
                        out.append(n)
                    for v in n.values(): inspecte(v)
                elif isinstance(n, list):
                    for v in n: inspecte(v)
            for m in re.finditer(r'<script type="application/ld\+json">(.*?)</script>', s, re.S):
                inspecte(json.loads(m[1]))
            return out
        self.assertTrue(videos(actuel))
        self.assertNotEqual(videos(actuel), videos(gabarit))
        with patch.object(pc, 'open', create=True) as writer:
            pc.ecrire(stats, p, gabarit)
        produit = writer.return_value.write.call_args[0][0]
        self.assertEqual(videos(produit), videos(actuel))
        self.assertEqual(re.search(r'<div data-reel="[^"]*"[^>]*></div>', produit)[0],
                         re.search(r'<div data-reel="[^"]*"[^>]*></div>', actuel)[0])

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

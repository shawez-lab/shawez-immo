"""Périmètres de service et nom actuel de commune, avec sources conservées."""
import json
import re
from functools import lru_cache
from pathlib import Path

ZONE_GOOGLE = {'Dijon', 'Talant', 'Fontaine-lès-Dijon', 'Chenôve', 'Marsannay-la-Côte', 'Longvic',
               'Quetigny', 'Saint-Apollinaire', 'Chevigny-Saint-Sauveur', 'Plombières-lès-Dijon',
               'Ahuy', 'Daix', 'Perrigny-lès-Dijon', 'Neuilly-Crimolois', 'Sennecey-lès-Dijon',
               'Gevrey-Chambertin', 'Genlis', 'Beaune', 'Nuits-Saint-Georges'}
EXEMPLES = {
    'Talant': 'La page Secteurs cite une maison de 202 m² avec sous-sol et piscine, vendue en 2025, et une maison de plain-pied estimée.',
    'Fontaine-lès-Dijon': 'La page Secteurs cite une maison estimée à Fontaine-lès-Dijon. Ce dossier est présenté comme une estimation.',
    'Saint-Apollinaire': 'La page Secteurs cite une estimation à Saint-Apollinaire, sans préciser le type du bien ni la date.',
    'Chenôve': 'La page Secteurs cite un T5 familial avec un mandat de vente en cours au relevé de cette page. Aucune vente conclue n’est déduite de ce statut.',
    'Neuilly-Crimolois': 'La page Secteurs cite une maison filmée à Neuilly-Crimolois. Le film est un travail de présentation, sans affirmation de vente conclue.',
}


@lru_cache(maxsize=4)
def contour(root):
    data = json.loads((Path(root) / 'outils/seo/neuilly-crimolois.geojson').read_text())
    g = data['geometry']
    polys = [g['coordinates']] if g['type'] == 'Polygon' else g['coordinates']
    points = [p for poly in polys for ring in poly for p in ring]
    return g, (min(p[0] for p in points), max(p[0] for p in points), min(p[1] for p in points), max(p[1] for p in points))


def commune_actuelle(root, nom, lon, lat):
    from dijon_quartiers import contient
    g, (x0, x1, y0, y1) = contour(str(Path(root).resolve()))
    dedans = x0 <= lon <= x1 and y0 <= lat <= y1 and contient(g, lon, lat)
    if nom in ('Neuilly-lès-Dijon', 'Crimolois', 'Neuilly-Crimolois') and not dedans:
        raise ValueError('Vente de Neuilly-Crimolois hors contour actuel : vérifier la source')
    return 'Neuilly-Crimolois' if dedans else nom


def adapter_prix(p, nom):
    if nom in ZONE_GOOGLE:
        p['intro'] = f'Depuis Dijon, j’accompagne les propriétaires à {nom} pour leur estimation et leur vente. ' + p['intro']
        if nom in EXEMPLES:
            p['sections'].append(('dossier-local', 'Un dossier déjà cité dans ce secteur', '<p>' + EXEMPLES[nom] + ' <a href="/secteurs-dijon-nuits-saint-georges-beaune/">Voir la source sur la page Secteurs</a>.</p>'))
        return p
    p['intro'] = 'Je travaille depuis Dijon. Cette page donne des repères DVF pour ' + nom + ', sans promesse de déplacement sur place. ' + p['intro']
    p['sections'] = [(i, titre, ('<p>Je travaille depuis Dijon. Les ventes publiées ici donnent un repère statistique pour votre commune. '
                                'Vous pouvez obtenir une première fourchette en ligne, offerte, ou me contacter pour étudier votre projet. '
                                'Les modalités d’un accompagnement et d’un éventuel déplacement sont à convenir au préalable, sans engagement de visite sur place.</p>'
                                '<p><a href="/estimer/">Consulter la fourchette en ligne</a> · <a href="/contact/">Contacter Shawez à Dijon</a>.</p>') if i == 'votre-bien' else texte)
                      for i, titre, texte in p['sections']]
    p['faq'] = [(q, 'La première fourchette en ligne est offerte. Je travaille depuis Dijon ; les modalités d’un avis de valeur et d’un éventuel déplacement doivent être convenues avant toute intervention.')
                if q.startswith('Combien coûte une estimation') else (q, a) for q, a in p['faq']]
    p['desc'] = p['desc'].replace('Estimation offerte.', 'Repères DVF.')
    return p


def redirection_neuilly(root):
    ancien, nouveau = '/prix-immobilier-neuilly-les-dijon/', '/prix-immobilier-neuilly-crimolois/'
    if not (root / nouveau.strip('/') / 'index.html').exists():
        return
    p = root / ancien.strip('/') / 'index.html'
    p.write_text('<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Prix immobilier à Neuilly-Crimolois</title>'
                 f'<link rel="canonical" href="https://shawez-immo.com{nouveau}"><meta name="robots" content="noindex,follow">'
                 f'<meta http-equiv="refresh" content="0;url={nouveau}"></head><body><a href="{nouveau}">Prix immobilier à Neuilly-Crimolois</a></body></html>\n')
    p = root / '_redirects'
    s = p.read_text()
    for chemin in (ancien, ancien.rstrip('/')):
        ligne = chemin + ' ' + nouveau + ' 301'
        if ligne not in s:
            s = ligne + '\n' + s
    p.write_text(s)
    p = root / 'sitemap.xml'
    p.write_text(p.read_text().replace('https://shawez-immo.com' + ancien, 'https://shawez-immo.com' + nouveau))

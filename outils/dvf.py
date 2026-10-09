#!/usr/bin/env python3
"""Ventes réelles DVF de la Côte-d'Or pour l'estimation en ligne (/estimer/).

Source : DVF géolocalisées d'Etalab, https://files.data.gouv.fr/geo-dvf/latest/csv/<année>/departements/21.csv.gz
(Licence Ouverte 2.0). On garde les 3 dernières années publiées.

Ventes retenues (« ventes simples ») : nature « Vente », un seul logement (un appartement OU une maison)
dans la mutation, avec au plus des dépendances (cave, garage) ; aucun local d'activité ; coordonnées connues ;
surface bâtie entre 9 et 1000 m² ; prix au m² entre 300 et 12 000 €.

Sortie : donnees-dvf/
  index.json            date des données, période, nombre de ventes, taille des tuiles, liste des tuiles
  t/<x>_<y>.json        une tuile de 0,05° × 0,05° (environ 4 × 5,5 km) :
                        [[lat, lon, type, surface, prix_m2, aaaamm, pieces, terrain], ...]
                        type : 0 = appartement, 1 = maison ; terrain en m² (0 pour un appartement)
  d/<x>_<y>.txt         le détail des mêmes ventes, une par ligne de texte (même ordre que la tuile), pour l'avis de valeur :
                        [prix, voie, commune, jour]  prix = valeur foncière en euros (le prix signé, tel que publié),
                        voie = nom de la voie sans le numéro, jour = jour du mois de la vente

Lancer : python3 outils/dvf.py  (ou --dossier <dossier contenant 21-<année>.csv.gz> pour travailler hors ligne)
"""
import argparse
import csv
import gzip
import io
import json
import math
import os
import shutil
import sys
import urllib.request
from collections import defaultdict
from datetime import date

RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SORTIE = os.path.join(RACINE, 'donnees-dvf')
DEP = '21'
BASE = 'https://files.data.gouv.fr/geo-dvf/latest/csv'
TUILE = 0.05


def annees_publiees():
    """Les années disponibles dans geo-dvf/latest : on essaie les 8 dernières années (requête HEAD)."""
    trouvees = []
    for an in range(date.today().year, date.today().year - 8, -1):
        req = urllib.request.Request(f'{BASE}/{an}/departements/{DEP}.csv.gz', method='HEAD',
                                     headers={'User-Agent': 'shawez-immo.com (estimation en ligne)'})
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                if r.status == 200:
                    trouvees.append(an)
        except Exception as e:
            print(f'  {an} : indisponible ({e})', flush=True)
    return sorted(trouvees)


def lire(source):
    if source.startswith('http'):
        req = urllib.request.Request(source, headers={'User-Agent': 'shawez-immo.com (estimation en ligne)'})
        with urllib.request.urlopen(req, timeout=300) as r:
            brut = r.read()
    else:
        with open(source, 'rb') as f:
            brut = f.read()
    return io.TextIOWrapper(gzip.GzipFile(fileobj=io.BytesIO(brut)), encoding='utf-8', newline='')


def flottant(v):
    try:
        return float(v) if v not in ('', None) else None
    except ValueError:
        return None


def ventes(flux):
    """Regroupe les lignes par mutation et renvoie les ventes simples."""
    mutations = defaultdict(list)
    for l in csv.DictReader(flux):
        mutations[l['id_mutation']].append(l)
    for mid, lignes in mutations.items():
        l0 = lignes[0]
        if l0['nature_mutation'] != 'Vente':
            continue
        valeur = flottant(l0['valeur_fonciere'])
        if not valeur:
            continue
        locaux = {}       # (id_parcelle, type, surface, pieces, lot1) -> ligne : les lignes sont répétées par nature de culture
        terrains = set()  # (id_parcelle, nature_culture, surface_terrain)
        autre = False
        for l in lignes:
            t = l['type_local']
            if t in ('Appartement', 'Maison'):
                locaux[(l['id_parcelle'], t, l['surface_reelle_bati'], l['nombre_pieces_principales'], l['lot1_numero'])] = l
            elif t in ('Dépendance', ''):
                pass
            else:
                autre = True
            if l['surface_terrain']:
                terrains.add((l['id_parcelle'], l['nature_culture'], l['surface_terrain']))
        if autre or len(locaux) != 1:
            continue
        l = next(iter(locaux.values()))
        surf = flottant(l['surface_reelle_bati'])
        lat, lon = flottant(l['latitude']), flottant(l['longitude'])
        if not surf or lat is None or lon is None or not 9 <= surf <= 1000:
            continue
        pm2 = valeur / surf
        if not 300 <= pm2 <= 12000:
            continue
        maison = l['type_local'] == 'Maison'
        terrain = int(sum(float(s) for _, _, s in terrains)) if maison else 0
        d = l0['date_mutation']  # AAAA-MM-JJ
        try:
            pieces = int(float(l['nombre_pieces_principales'] or 0))
        except ValueError:
            pieces = 0
        detail = [int(round(valeur)), ' '.join((l.get('adresse_nom_voie') or '').split()), ' '.join((l.get('nom_commune') or '').split()), int(d[8:10])]
        yield [round(lat, 5), round(lon, 5), 1 if maison else 0, int(round(surf)), int(round(pm2)),
               int(d[:4] + d[5:7]), pieces, min(terrain, 999999)], d, detail


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--dossier', help='dossier local contenant 21-<année>.csv.gz (sinon téléchargement)')
    ap.add_argument('--annees', type=int, default=3)
    a = ap.parse_args()

    if a.dossier:
        annees = sorted(int(n[3:7]) for n in os.listdir(a.dossier) if n.startswith(DEP + '-') and n.endswith('.csv.gz'))
    else:
        annees = annees_publiees()
    annees = annees[-a.annees:]
    if not annees:
        sys.exit('Aucune année DVF trouvée.')

    tuiles = defaultdict(list)
    n = 0
    derniere = ''
    for an in annees:
        src = os.path.join(a.dossier, f'{DEP}-{an}.csv.gz') if a.dossier else f'{BASE}/{an}/departements/{DEP}.csv.gz'
        print('Lecture', src, flush=True)
        k = 0
        for v, d, detail in ventes(lire(src)):
            tuiles[(math.floor(v[1] / TUILE), math.floor(v[0] / TUILE))].append((v, detail))
            derniere = max(derniere, d)
            k += 1
        print(f'  {an} : {k} ventes simples', flush=True)
        n += k

    # Garde-fou : si la source a changé de forme et ne donne presque rien, on ne remplace pas les données en place.
    if n < 3000:
        sys.exit(f'Seulement {n} ventes : données non remplacées.')

    tmp = SORTIE + '.tmp'
    shutil.rmtree(tmp, ignore_errors=True)
    os.makedirs(os.path.join(tmp, 't'))
    os.makedirs(os.path.join(tmp, 'd'))
    noms = []
    for (x, y), lst in sorted(tuiles.items()):
        lst.sort(key=lambda c: (c[0][0], c[0][1], c[0][5], c[1][3], c[1][0]))
        nom = f'{x}_{y}'
        noms.append(nom)
        with open(os.path.join(tmp, 't', nom + '.json'), 'w') as f:
            json.dump([c[0] for c in lst], f, separators=(',', ':'))
        # le détail, ligne pour ligne : lu seulement pour préparer un avis de valeur (l'estimation en ligne ne le charge pas)
        # une vente par ligne : l'API ne décode que les lignes dont elle a besoin (une douzaine), pas tout le fichier
        with open(os.path.join(tmp, 'd', nom + '.txt'), 'w', encoding='utf-8') as f:
            f.write('\n'.join(json.dumps(c[1], ensure_ascii=False, separators=(',', ':')) for c in lst))
    index = {
        'source': 'DVF géolocalisées (Etalab, DGFiP), Licence Ouverte 2.0',
        'departement': DEP,
        'annees': annees,
        'derniere_vente': derniere,
        'genere_le': date.today().isoformat(),
        'ventes': n,
        'tuile': TUILE,
        'tuiles': noms,
        'colonnes': ['lat', 'lon', 'type(0 appartement, 1 maison)', 'surface', 'prix_m2', 'aaaamm', 'pieces', 'terrain'],
        'detail': ['prix', 'voie', 'commune', 'jour'],
    }
    with open(os.path.join(tmp, 'index.json'), 'w') as f:
        json.dump(index, f, ensure_ascii=False, indent=1)
    shutil.rmtree(SORTIE, ignore_errors=True)
    os.rename(tmp, SORTIE)
    print(f'{n} ventes, {len(noms)} tuiles, dernière vente {derniere}.')


if __name__ == '__main__':
    main()

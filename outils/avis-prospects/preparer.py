#!/usr/bin/env python3
"""Prépare un avis à partir des CSV géo-DVF officiels. Aucune donnée privée dans Git.

python3 preparer.py --bien /dossier-prive/bien.json --csv 2024.csv --csv 2025.csv --sortie /dossier-prive/etude.json
Les JSON privés sont importés dans /admin/avis-prospects/. Les groupes de plusieurs lignes sont exclus.
"""
import argparse, csv, datetime as dt, hashlib, json
from collections import defaultdict
from pathlib import Path

SOURCE = 'https://files.data.gouv.fr/geo-dvf/latest/csv/{annee}/communes/{dept}/{insee}.csv'

def extraire(fichiers, bien, aujourd_hui):
    groupes = defaultdict(list)
    sources = []
    for chemin in fichiers:
        p = Path(chemin)
        contenu = p.read_bytes()
        digest = hashlib.sha256(contenu).hexdigest()
        with p.open(encoding='utf-8-sig', newline='') as f:
            for ligne, row in enumerate(csv.DictReader(f), 2):
                # Le millésime est déduit de la donnée et non du nom du fichier.
                annee = row['date_mutation'][:4]
                url = SOURCE.format(annee=annee, dept=bien['insee'][:2], insee=bien['insee'])
                groupes[(annee, row['id_mutation'])].append((row, ligne, url, digest))
        sources.append({'fichier': p.name, 'sha256': digest})
    ventes, rejets = [], 0
    for (annee, ident), lignes in groupes.items():
        # Doublons de fichiers ou mutation multi-lignes : aucun prix arbitrairement réparti.
        if len(lignes) != 1:
            rejets += 1
            continue
        r, numero, url, digest = lignes[0]
        if r.get('nature_mutation') != 'Vente' or r.get('code_commune') != bien['insee']:
            continue
        if r.get('type_local', '').lower() != bien['type']:
            continue
        try:
            prix, surface = float(r['valeur_fonciere']), float(r['surface_reelle_bati'])
        except (ValueError, TypeError):
            continue
        if prix <= 0 or surface <= 0:
            continue
        ventes.append({'id': annee + ':' + ident, 'date': r['date_mutation'], 'commune': bien['commune'],
            'voie': r.get('adresse_nom_voie', ''), 'quartier': '', 'type': bien['type'],
            'surface': surface, 'prix': prix, 'mutation_simple': True,
            'source': {'url': url, 'ref': f'{ident} · ligne CSV {numero} · SHA-256 {digest}', 'consulte_le': aujourd_hui}})
    return ventes, rejets, sources

def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--bien', required=True)
    p.add_argument('--csv', action='append', required=True)
    p.add_argument('--sortie', required=True)
    a = p.parse_args()
    b = json.loads(Path(a.bien).read_text())
    jour = dt.date.today().isoformat()
    ventes, rejets, sources = extraire(a.csv, b['bien'], jour)
    maxi = max((v['date'] for v in ventes), default='aucune vente')
    resultat = {**b, 'arrete_au': jour, 'ventes': ventes,
        'publication': f'Fichiers fournis uniquement ; dernière vente exploitable : {maxi}. {rejets} mutations multi-lignes exclues. La couverture des millésimes doit être vérifiée avant diffusion.',
        'source_dvf': {'url': 'https://www.data.gouv.fr/datasets/demandes-de-valeurs-foncieres-geolocalisees',
            'ref': 'DVF géolocalisé DGFiP / data.gouv.fr · fichiers et empreintes conservés dans le dossier privé', 'consulte_le': jour},
        'audit_fichiers': sources}
    out = Path(a.sortie)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(resultat, ensure_ascii=False, indent=2))
    print(f'{len(ventes)} ventes exploitables. {rejets} mutations multi-lignes exclues. Étude écrite dans {out}.')

if __name__ == '__main__':
    main()

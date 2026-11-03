#!/usr/bin/env python3
"""Choisit les biens d'un passage du Monteur. Deterministe, sans discussion.

Ajoute le 03/11/2026. Shawez, ce soir-la : « c'est tous les jours la meme chose
qui est publiee, c'est du n'importe quoi. Repare-moi tout ca pour toujours. »

Il avait raison. Le 03/11, le chateau 438 totalisait 60 versions au registre
pendant que six biens en ligne, non vendus, avec leur video prete, n'en avaient
JAMAIS eu une seule : 403, 415, 425, 431, 452IMMEUBLE, 513.

La regle « un bien jamais sorti passe en premier » existait depuis le 02/11,
mais elle etait ecrite en francais dans la consigne. Une regle en francais se
discute ; une regle en code, non. C'est tout l'objet de ce fichier : le Monteur
ne choisit plus, il execute ce que choisir.py lui rend.

  python3 choisir.py --nombre 4
  python3 choisir.py --nombre 4 --json
"""
import argparse, json, os, re, sys
from collections import defaultdict
from datetime import date, datetime, timedelta

RACINE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
ANNONCES = os.path.join(RACINE, 'annonces.json')
REGISTRE = os.path.join(RACINE, 'outils', 'trial-reels', 'registre.json')
JUGE = os.path.join(RACINE, 'outils', 'trial-reels', 'juge.json')
VIDEOS = os.path.join(RACINE, 'assets', 'biens')

# Biens que Shawez ne veut jamais voir sortir en video.
EXCLUS = {'498', '499', '506', '508', '512', '441'}
VENDU = ('Sous-offre', 'Sous-compromis', 'Accord', 'Vendu')


def famille(ref):
    """461 et 461BALI sont le meme bien, 452 et 452IMMEUBLE aussi.

    Sans ca, un meme appartement compte pour deux biens differents et sort deux
    fois plus souvent que les autres. C'est arrive au 461 / 461BALI.
    """
    m = re.match(r'^(\d+)', str(ref))
    return m.group(1) if m else str(ref)


def charger(chemin, defaut):
    try:
        with open(chemin, encoding='utf-8') as f:
            return json.load(f)
    except Exception:
        return defaut


def vivier(jours_frais=3):
    annonces = charger(ANNONCES, {}).get('annonces', {})
    juge = charger(JUGE, {})
    en_pause = {str(x) for x in juge.get('biens_en_pause', [])}
    limite = date.today() - timedelta(days=jours_frais)
    dedans, dehors = [], []
    for ref, a in annonces.items():
        ref = str(ref)
        raison = None
        if ref in EXCLUS or famille(ref) in EXCLUS:
            raison = 'exclu par Shawez'
        elif ref in en_pause or famille(ref) in en_pause:
            raison = 'en pause par le Juge'
        elif any(m in str(a.get('mentions_agence') or '') for m in VENDU):
            raison = 'sous offre ou vendu'
        elif not os.path.exists(os.path.join(VIDEOS, ref, 'video.mp4')):
            raison = 'pas de video.mp4'
        else:
            try:
                vu = datetime.strptime(str(a.get('last_seen'))[:10], '%Y-%m-%d').date()
                if vu < limite:
                    raison = f'annonce plus vue depuis le {vu}'
            except Exception:
                raison = 'last_seen illisible'
        (dehors if raison else dedans).append((ref, a, raison))
    return dedans, dehors


def sorties():
    """Date de la derniere serie par famille de bien, et les refs des 2 derniers passages."""
    versions = charger(REGISTRE, {}).get('versions', [])
    derniere = {}
    par_passage = defaultdict(set)
    for v in versions:
        f = famille(v.get('ref'))
        d = str(v.get('date') or '')[:10]
        if d > derniere.get(f, ''):
            derniere[f] = d
        par_passage[str(v.get('date') or '')[:13]].add(f)
    recents = set()
    for cle in sorted(par_passage, reverse=True)[:2]:
        recents |= par_passage[cle]
    return derniere, recents


def prix(a):
    txt = str((a.get('caracteristiques') or {}).get('prix_honoraires_inclus') or '')
    chiffres = re.sub(r'[^0-9]', '', txt)
    return int(chiffres) if chiffres else 0


def choisir(nombre):
    dedans, dehors = vivier()
    derniere, recents = sorties()
    # Jamais sorti d'abord, le plus cher en tete. Puis par anciennete de la derniere serie.
    def cle(e):
        ref, a, _ = e
        f = famille(ref)
        jamais = f not in derniere
        return (0 if jamais else 1, -prix(a) if jamais else 0, derniere.get(f, ''), -prix(a))
    classe = sorted(dedans, key=cle)
    # Un bien des deux derniers passages ne repasse pas tant qu'un autre attend.
    frais = [e for e in classe if famille(e[0]) not in recents]
    reste = [e for e in classe if famille(e[0]) in recents]
    ordre, vus = [], set()
    for e in frais + reste:
        f = famille(e[0])
        if f in vus:
            continue
        vus.add(f)
        ordre.append(e)
    return ordre[:nombre], ordre, dehors, derniere


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--nombre', type=int, default=4)
    p.add_argument('--json', action='store_true')
    args = p.parse_args()
    choisis, ordre, dehors, derniere = choisir(args.nombre)
    if not choisis:
        print('AUCUN')
        return 1
    if args.json:
        print(json.dumps([{'ref': r, 'commune': a.get('commune'),
                           'prix': (a.get('caracteristiques') or {}).get('prix_honoraires_inclus'),
                           'derniere_serie': derniere.get(famille(r), 'JAMAIS')}
                          for r, a, _ in choisis], ensure_ascii=False))
        return 0
    print('=== BIENS DU PASSAGE ===')
    for r, a, _ in choisis:
        print(f"{r}\t{a.get('commune')}\t{(a.get('caracteristiques') or {}).get('prix_honoraires_inclus')}"
              f"\tderniere serie: {derniere.get(famille(r), 'JAMAIS')}")
    jamais = [r for r, a, _ in ordre if famille(r) not in derniere]
    print(f"\n=== VIVIER : {len(ordre)} biens ===")
    print('ordre complet : ' + ' '.join(r for r, _, _ in ordre))
    if jamais:
        print(f"ATTENTION : {len(jamais)} biens n'ont JAMAIS eu de video : " + ' '.join(jamais))
    bizarres = [r for r, _, _ in ordre if not re.match(r'^\d', str(r))]
    if bizarres:
        print('A SIGNALER A SHAWEZ : reference anormale sur le site de l\'agence : ' + ' '.join(bizarres))
    print(f"\n=== ECARTES : {len(dehors)} ===")
    for r, _, raison in sorted(dehors, key=lambda e: str(e[2]))[:40]:
        print(f'  {r}\t{raison}')
    return 0


if __name__ == '__main__':
    sys.exit(main())

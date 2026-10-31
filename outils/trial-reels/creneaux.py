#!/usr/bin/env python3
"""Créneaux des Trial Reels : jour et nuit, sans jamais dépasser le plafond d'Instagram.

Demande de Shawez (29/10/2026, 17 h 06) : publier non-stop, sans heure fixe, le plus possible.
Plafond : 15 Trial Reels sur 24 heures glissantes (décision de Shawez, 31/10/2026 : « il faut publier
15 minimum »). Les refus d'Instagram du 28/10 et du 30/10 sont arrivés quand plusieurs agents programmaient
en même temps, Codex en plus du Monteur, et que la fenêtre de 24 h dépassait 15. Depuis le 31/10, le Monteur
est le SEUL à programmer des Trial Reels : Codex livre des idées dans le doc Croissance, il ne publie plus rien.
Un créneau par 96 minutes donne exactement 15 par jour, donc jamais plus de 15 sur une fenêtre de 24 h.

Grille : 15 créneaux par jour, un toutes les 96 minutes, heure de Paris :
00:00 01:36 03:12 04:48 06:24 08:00 09:36 11:12 12:48 14:24 16:00 17:36 19:12 20:48 22:24

Usage :
  python3 outils/trial-reels/creneaux.py --existants /tmp/tr.txt --depuis 2026-10-29T17:30 --nombre 15
/tmp/tr.txt : une ligne AAAA-MM-JJTHH:MM (heure de Paris) par Trial Reel déjà publiée ou en attente,
brouillons exclus, sur les dernières 24 heures et tout ce qui est déjà programmé ensuite.
Affiche les créneaux libres retenus, un par ligne, dans l'ordre, ou « AUCUN » s'il n'y en a pas.
"""
import argparse
import datetime as dt

PLAFOND = 15                 # Trial Reels au plus sur 24 heures glissantes
PAS = dt.timedelta(minutes=96)
ECART_MIN = dt.timedelta(minutes=45)
JOUR = dt.timedelta(hours=24)


def lire(chemin):
    heures = []
    with open(chemin, encoding='utf-8') as f:
        for ligne in f:
            ligne = ligne.strip()
            if ligne and not ligne.startswith('#'):
                heures.append(dt.datetime.strptime(ligne[:16], '%Y-%m-%dT%H:%M'))
    return sorted(heures)


def charge_max(heures, t):
    """Nombre maximal de Trial Reels sur une période de 24 h qui contient t, en comptant t."""
    debuts = [h for h in heures if t - JOUR < h <= t] + [t]
    tous = heures + [t]
    return max(sum(1 for h in tous if s <= h < s + JOUR) for s in debuts)


def grille(depuis, jusqu_a):
    t = depuis.replace(hour=0, minute=0)
    while t < jusqu_a:
        if t >= depuis:
            yield t
        t += PAS


def main():
    a = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    a.add_argument('--existants', required=True)
    a.add_argument('--depuis', required=True, help='AAAA-MM-JJTHH:MM, heure de Paris : pas de créneau avant')
    a.add_argument('--nombre', type=int, default=15, help='nombre de créneaux voulus')
    a.add_argument('--horizon', type=int, default=48, help='heures à explorer après --depuis')
    args = a.parse_args()
    heures = lire(args.existants)
    depuis = dt.datetime.strptime(args.depuis, '%Y-%m-%dT%H:%M')
    retenus = []
    for t in grille(depuis, depuis + dt.timedelta(hours=args.horizon)):
        if len(retenus) >= args.nombre:
            break
        if any(abs(t - h) < ECART_MIN for h in heures):
            continue
        if charge_max(heures, t) <= PLAFOND:
            heures = sorted(heures + [t])
            retenus.append(t)
    print('\n'.join(t.strftime('%Y-%m-%dT%H:%M') for t in retenus) if retenus else 'AUCUN')


if __name__ == '__main__':
    main()

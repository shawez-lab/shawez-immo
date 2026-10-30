#!/usr/bin/env python3
"""Créneaux des Trial Reels : jour et nuit, sans jamais dépasser le plafond d'Instagram.

Demande de Shawez (29/10/2026, 17 h 06) : publier non-stop, sans heure fixe, le plus possible.
Plafond réel, mesuré deux fois : Instagram refuse les Trial Reels publiés par l'API au-delà d'une douzaine
sur 24 heures glissantes (« You reached maximum number of trial reels that is allowed to be published by
Content Publishing API » : le 28/10 après 16 en 24 h, puis le 30/10 à 12 h, 12 h 48, 14 h 24 et 16 h, alors
que 13 avaient été publiées dans les 24 h précédentes). On vise donc 12 au plus sur n'importe quelle période
de 24 heures, pour qu'aucun refus ni e-mail d'erreur Metricool n'arrive jamais à Shawez.

Grille : 12 créneaux par jour, un toutes les 2 heures, heure de Paris :
00:00 02:00 04:00 06:00 08:00 10:00 12:00 14:00 16:00 18:00 20:00 22:00

Usage :
  python3 outils/trial-reels/creneaux.py --existants /tmp/tr.txt --depuis 2026-10-29T17:30 --nombre 12
/tmp/tr.txt : une ligne AAAA-MM-JJTHH:MM (heure de Paris) par Trial Reel déjà publiée ou en attente,
brouillons exclus, sur les dernières 24 heures et tout ce qui est déjà programmé ensuite.
Affiche les créneaux libres retenus, un par ligne, dans l'ordre, ou « AUCUN » s'il n'y en a pas.
"""
import argparse
import datetime as dt

PLAFOND = 12                 # Trial Reels au plus sur 24 heures glissantes
PAS = dt.timedelta(minutes=120)
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
    a.add_argument('--nombre', type=int, default=12, help='nombre de créneaux voulus')
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

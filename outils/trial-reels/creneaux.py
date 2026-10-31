#!/usr/bin/env python3
"""Créneaux des Trial Reels : jour et nuit, sans jamais dépasser le plafond d'Instagram.

Demande de Shawez (29/10/2026, 17 h 06) : publier non-stop, sans heure fixe, le plus possible.
Plafond : 8 Trial Reels sur 24 heures glissantes. Chiffre mesuré, pas estimé.

L'explication retenue le 31/10 au matin était fausse : les refus ne venaient pas de Codex programmant en
parallèle du Monteur. Le 31/10, le Monteur était SEUL à programmer et Instagram a refusé 7 Trial Reels
d'affilée, de 00:00 à 10:00, avec « You reached maximum number of trial reels that is allowed to be
published by Content Publishing API » — zéro publiée de la journée alors que 15 étaient programmées.

Ce qui passe réellement, relevé dans Metricool : 29/10, 8 publiées et aucun refus ; 30/10, 8 publiées
puis le premier refus ; 31/10, 15 programmées et 0 publiée. Au-delà de 8, Instagram ne publie pas :
programmer davantage ne produit pas une vidéo de plus, cela ne produit que des e-mails d'erreur, et les
tentatives refusées semblent consommer du quota à leur tour (refus à 10:00 alors que la fenêtre de 24 h
ne contenait que 2 publications). Descendre à 8 ne réduit donc pas ce qui sort, cela supprime le gâchis.
Pour publier plus, c'est sur les autres réseaux que ça se joue (diffusion.py), pas en remontant ce nombre.

Le Monteur reste le SEUL à programmer des Trial Reels : Codex livre des idées dans le doc Croissance.
Un créneau par 180 minutes donne exactement 8 par jour, donc jamais plus de 8 sur une fenêtre de 24 h.

Grille : 8 créneaux par jour, un toutes les 3 heures, heure de Paris :
00:00 03:00 06:00 09:00 12:00 15:00 18:00 21:00

Usage :
  python3 outils/trial-reels/creneaux.py --existants /tmp/tr.txt --depuis 2026-10-29T17:30 --nombre 8
/tmp/tr.txt : une ligne AAAA-MM-JJTHH:MM (heure de Paris) par Trial Reel déjà publiée ou en attente,
brouillons exclus, sur les dernières 24 heures et tout ce qui est déjà programmé ensuite.
Affiche les créneaux libres retenus, un par ligne, dans l'ordre, ou « AUCUN » s'il n'y en a pas.
"""
import argparse
import datetime as dt

PLAFOND = 8                  # Trial Reels au plus sur 24 heures glissantes (mesuré le 29-31/10/2026)
PAS = dt.timedelta(minutes=180)
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
    a.add_argument('--nombre', type=int, default=8, help='nombre de créneaux voulus')
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

#!/usr/bin/env python3
"""Diffuseur : les mêmes vidéos que les Trial Reels Instagram, rediffusées sur TikTok, YouTube Shorts et Facebook Reels.

Demande de Shawez (29/10/2026) : « en total je veux que tu publies 50 réels par jour ». Instagram refuse au-delà
d'environ 16 Trial Reels par 24 h, donc le reste part sur les autres réseaux connectés à Metricool :
  Instagram   8 Trial Reels / 24 h glissantes   (Monteur, creneaux.py, aux heures de forte audience)
  Pinterest  15 épingles / 24 h, 30 min d'écart   (tableau « Biens a vendre a Dijon et en Cote-d'Or »)
  Bluesky    15 posts    / 24 h, 30 min d'écart
  Google Business 2 photos / 24 h, 4 h d'écart    (met la vidéo dans la galerie de la fiche Google)
  TikTok      8 vidéos / 24 h, 45 min d'écart au moins   (compte shawez_immo)
  YouTube    10 Shorts  / 24 h, 60 min d'écart au moins   (limite Metricool du compte YouTube)
  Facebook   10 Reels   / 24 h, 60 min d'écart au moins   (page Facebook)
  Threads    10 vidéos  / 24 h, 45 min d'écart au moins   (plafond Metricool : 250, large)
Soit 50 publications par jour, sans jamais dépasser une limite.

PLAFONDS CORRIGÉS LE 30/10/2026, après de vrais refus : Instagram a refusé la 14e Trial Reel de la fenêtre de
24 h (« You reached maximum number of trial reels that is allowed to be published by Content Publishing API »,
4 refus entre 12 h et 16 h) ; TikTok a refusé la 8e vidéo du jour (« This TikTok creator has made too many posts
via OpenAPI in the last 24 hours », 403). Les plafonds ci-dessus gardent une marge sous ces refus réels.
Ne jamais les remonter : Shawez ne veut plus recevoir un seul e-mail d'erreur Metricool.

Usage :
  python3 outils/trial-reels/diffusion.py --a-faire --existants /tmp/diffuses.txt --depuis 2026-10-29T19:00
      /tmp/diffuses.txt : une ligne « reseau<TAB>AAAA-MM-JJTHH:MM » (heure de Paris) par publication déjà publiée
      ou en attente sur tiktok, youtube ou facebook dans les 24 dernières heures et tout ce qui est programmé ensuite.
      Affiche une ligne JSON par diffusion à programmer : id, reseau, uuid_instagram, heure, texte, titre.
  python3 outils/trial-reels/diffusion.py --noter TR-2910-525-a tiktok <uuid Metricool> 2026-10-29T19:20 [url]
      Note la diffusion dans registre.json (le Juge la mesure ensuite avec la médiane de ce réseau).

Règles : seulement les versions du registre au statut « publie » (Trial Reel programmée ou publiée sur Instagram),
des 48 dernières heures, dont le style n'est pas dans styles_interdits de juge.json et le bien pas dans biens_en_pause ;
jamais deux fois la même version sur le même réseau ; d'abord les versions les plus anciennes pas encore diffusées.
Chaque réseau reçoit la légende adaptée : ManyChat ne lit que les commentaires Instagram, donc ailleurs on dit
« Écris-moi MOT en privé sur Instagram @shawez_immo ».
"""
import argparse
import datetime as dt
import json
import os
import re
import sys

ICI = os.path.dirname(os.path.abspath(__file__))
REGISTRE = os.path.join(ICI, 'registre.json')
JUGE = os.path.join(ICI, 'juge.json')
JOUR = dt.timedelta(hours=24)
RESEAUX = {  # plafond sur 24 h glissantes, écart minimal, horizon de diffusion après la Trial Reel
    'tiktok': {'plafond': 10, 'ecart': dt.timedelta(minutes=45)},
    'youtube': {'plafond': 20, 'ecart': dt.timedelta(minutes=30)},
    'facebook': {'plafond': 5, 'ecart': dt.timedelta(minutes=120)},
    'threads': {'plafond': 20, 'ecart': dt.timedelta(minutes=30)},
    'linkedin': {'plafond': 8, 'ecart': dt.timedelta(minutes=90)},
    # Ajoutés le 01/11/2026 : trois canaux déjà connectés à Metricool et jamais utilisés. Pinterest est un
    # moteur de recherche, pas un fil : une épingle vidéo avec le lien du site continue d'amener du monde
    # des mois après, même avec zéro abonné. Google Business de type « photo » met la vidéo dans la galerie
    # de la fiche Google de l'agence, là où les gens de Dijon cherchent vraiment : on reste à 2 par jour
    # pour ne pas noyer la galerie. Le tableau Pinterest est « Biens a vendre a Dijon et en Cote-d'Or ».
    'pinterest': {'plafond': 15, 'ecart': dt.timedelta(minutes=30)},
    'bluesky': {'plafond': 15, 'ecart': dt.timedelta(minutes=30)},
    'gmb': {'plafond': 2, 'ecart': dt.timedelta(minutes=240)},
}
PINTEREST_TABLEAU = '1143844074049722490'   # « Biens a vendre a Dijon et en Cote-d'Or », compte shawez0180

# FENÊTRES HORAIRES, ajoutées le 01/11/2026 d'après getBestTimeToPostByNetwork de Metricool, heure de Paris.
# Jusqu'ici une diffusion pouvait tomber à 1 h ou 3 h du matin, et beaucoup y tombaient. Les chiffres réels
# de l'audience de Shawez, du 01/11 : Instagram 42 à 3 h contre 492 à 19 h ; TikTok 50 à 4 h contre 1 471 à
# 10 h ; Facebook 900 à 3 h contre 15 500 à 10 h. Soit de dix à vingt fois moins la nuit. Une publication de
# nuit n'est pas « un peu moins vue », elle est perdue. Chaque réseau a donc sa plage, bornes incluses,
# centrée sur ses propres pics : TikTok et Facebook culminent à 10 h, midi et 17-18 h, Instagram le soir.
# Ne jamais élargir ces plages vers la nuit pour « publier plus » : publier plus la nuit ne rapporte rien.
FENETRES = {
    'tiktok': (9, 20),
    'youtube': (9, 21),
    'facebook': (9, 19),
    'threads': (8, 22),
    'linkedin': (8, 19),
    'pinterest': (8, 22),
    'bluesky': (8, 22),
    'gmb': (9, 18),
}


def dans_la_fenetre(reseau, t):
    debut, fin = FENETRES.get(reseau, (8, 22))
    return debut <= t.hour <= fin
FENETRE_H = 48
INSTAGRAM = '@shawez_immo'


def lire_json(chemin, defaut):
    try:
        with open(chemin, encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        return defaut


def ecrire_json(chemin, donnees):
    with open(chemin, 'w', encoding='utf-8') as f:
        json.dump(donnees, f, ensure_ascii=False, indent=1)
        f.write('\n')


def heure(v):
    return dt.datetime.strptime('%s %s' % (v['date'], v.get('heure', '00:00')), '%Y-%m-%d %H:%M')


def lire_existants(chemin):
    existants = {r: [] for r in RESEAUX}
    if not chemin or not os.path.exists(chemin):
        return existants
    with open(chemin, encoding='utf-8') as f:
        for ligne in f:
            c = ligne.strip().split('\t')
            if len(c) >= 2 and c[0].strip().lower() in existants:
                existants[c[0].strip().lower()].append(dt.datetime.strptime(c[1].strip()[:16], '%Y-%m-%dT%H:%M'))
    return {r: sorted(h) for r, h in existants.items()}


def charge_max(heures, t):
    debuts = [h for h in heures if t - JOUR < h <= t] + [t]
    tous = heures + [t]
    return max(sum(1 for h in tous if s <= h < s + JOUR) for s in debuts)


def creneau(reseau, heures, depuis, horizon_h=30):
    regle = RESEAUX[reseau]
    t = depuis.replace(second=0, microsecond=0)
    t += dt.timedelta(minutes=(5 - t.minute % 5) % 5)
    fin = depuis + dt.timedelta(hours=horizon_h)
    while t < fin:
        if dans_la_fenetre(reseau, t) and all(abs(t - h) >= regle['ecart'] for h in heures) \
                and charge_max(heures, t) <= regle['plafond']:
            return t
        t += dt.timedelta(minutes=5)
    return None


# Les vidéos des biens sont muettes : ni Instagram ni YouTube ne peuvent les doubler, leur traduction
# automatique ne traduit que des voix. Pour être vu par les acheteurs étrangers que Shawez vise, la
# seule chose qui marche est d'écrire la légende dans les deux langues. « Complimentary », jamais « free » :
# c'est l'équivalent anglais d'« offert », le mot que Shawez veut partout.
SIGNATURE_FR = '\n\nShawez Ali, agent immobilier à Dijon. Estimation offerte sur shawez-immo.com'
EN_LONG = ('\n\n— English —\nShawez Ali, real estate agent in Dijon, Burgundy, France. '
           'I also speak English, Hindi, Urdu and Punjabi. '
           'Complimentary valuation on shawez-immo.com, WhatsApp +33 7 67 57 92 28.')
EN_COURT = '\n\nReal estate in Burgundy, France. English spoken. shawez-immo.com'


def texte_pour(reseau, v):
    legende = v.get('legende_complete') or v.get('legende') or ''
    mot = (v.get('mot') or '').upper()
    appel_prive = 'Écris-moi %s en privé sur Instagram %s et je t’envoie la visite complète 📩' % (mot, INSTAGRAM)
    legende = re.sub(r"Commente\s+\S+\s+et je t[’']envoie la visite complète en privé\s*📩?", appel_prive, legende)
    legende = re.sub(r"Écris-moi\s+\S+\s+en (?:message )?privé et je t[’']envoie la visite complète\s*📩?", appel_prive, legende)
    if mot and mot not in legende and v.get('ref') != 'defi':
        legende = legende.rstrip() + '\n' + appel_prive
    if reseau == 'youtube':
        legende = legende.replace('#', '').strip()
        legende += SIGNATURE_FR + EN_LONG
    if reseau == 'threads':
        legende = (legende.rstrip() + EN_COURT)[:480]
    if reseau == 'linkedin':
        legende = legende.replace('#', '').strip()
        legende += SIGNATURE_FR + EN_LONG
    if reseau == 'tiktok':
        tags = ' '.join(t for t in ('#immobilier', '#dijon', '#maison', '#visite', '#fyp',
                                    '#realestate', '#france', '#burgundy') if t not in legende)
        legende = (legende.rstrip() + EN_COURT + '\n' + tags).strip()
    return legende[:2000]


def titre_pour(v):
    accroche = (v.get('accroche') or '').replace('|', ' ')
    accroche = re.sub(r'\s+', ' ', accroche).strip(' .')
    titre = accroche or (v.get('legende') or '').split('.')[0]
    # Un repère en anglais dans le titre : c'est ce qui fait sortir la vidéo sur les recherches étrangères.
    return (titre[:78] + ' | Burgundy France #Shorts').strip()


def a_faire(args):
    registre = lire_json(REGISTRE, {'versions': []})
    juge = lire_json(JUGE, {})
    interdits = set(juge.get('styles_interdits', []))
    pauses = set(juge.get('biens_en_pause', {}).keys())
    depuis = dt.datetime.strptime(args.depuis, '%Y-%m-%dT%H:%M')
    existants = lire_existants(args.existants)
    debut = depuis - dt.timedelta(hours=FENETRE_H)
    versions = sorted([v for v in registre['versions']
                       if v.get('statut', 'publie') == 'publie' and (v.get('uuid') or v.get('media')) and debut <= heure(v) <= depuis + dt.timedelta(hours=6)
                       and v.get('style') not in interdits and str(v.get('ref')) not in pauses],
                      key=heure)
    sorties = []
    for reseau in args.reseaux.split(','):
        reseau = reseau.strip()
        if reseau not in RESEAUX:
            continue
        heures = list(existants[reseau])
        for v in versions:
            if reseau in (v.get('diffusions') or {}):
                continue
            # jamais avant la Trial Reel Instagram elle-même
            t = creneau(reseau, heures, max(depuis, heure(v) + dt.timedelta(minutes=10)))
            if t is None:
                break
            heures = sorted(heures + [t])
            sorties.append({'id': v['id'], 'reseau': reseau, 'uuid_instagram': v.get('uuid'), 'media': v.get('media', ''), 'ref': v.get('ref'),
                            'style': v.get('style'), 'heure': t.strftime('%Y-%m-%dT%H:%M'),
                            'texte': texte_pour(reseau, v), 'titre': titre_pour(v) if reseau in ('youtube', 'facebook') else ''})
    for s in sorties:
        print(json.dumps(s, ensure_ascii=False))
    if not sorties:
        print('AUCUN')


def noter(args):
    tr, reseau, uuid, quand = args.noter[:4]
    url = args.noter[4] if len(args.noter) > 4 else ''
    registre = lire_json(REGISTRE, {'versions': []})
    for v in registre['versions']:
        if v['id'] == tr:
            d = v.setdefault('diffusions', {})
            d[reseau] = {'uuid': str(uuid), 'url': url, 'date': quand[:10], 'heure': quand[11:16]}
            ecrire_json(REGISTRE, registre)
            print('OK %s %s %s' % (tr, reseau, quand))
            return
    sys.exit('Version %s absente du registre' % tr)


def main():
    a = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    a.add_argument('--a-faire', action='store_true')
    a.add_argument('--existants')
    a.add_argument('--depuis', help='AAAA-MM-JJTHH:MM heure de Paris : pas de diffusion avant')
    a.add_argument('--reseaux', default='threads,linkedin,pinterest,bluesky,gmb,tiktok,youtube,facebook')
    a.add_argument('--noter', nargs='+', metavar='X', help='TR-id reseau uuid AAAA-MM-JJTHH:MM [url]')
    args = a.parse_args()
    if args.noter:
        noter(args)
    elif args.a_faire:
        if not args.depuis:
            a.error('--depuis est obligatoire')
        a_faire(args)
    else:
        a.print_help()


if __name__ == '__main__':
    main()

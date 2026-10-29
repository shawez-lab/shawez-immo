#!/usr/bin/env python3
"""Juge des Trial Reels : il mesure, il calcule, il décide.

Demande de Shawez (29/10/2026) : « style de vidéo qui marche pas, vous publiez pas. Absolument pas. »
Ce script lit les vues de chaque Trial Reel, donne un verdict par version, par style et par bien,
et écrit outils/trial-reels/juge.json. Le Monteur, l'agent Croissance et Codex obéissent à ce fichier.

Usage :
  python3 outils/trial-reels/juge.py --mesures /tmp/mesures.tsv [--leads /tmp/leads.tsv] [--maintenant 2026-10-30T06:47]
  python3 outils/trial-reels/juge.py --classer "texte de l'accroche ou de la légende"

Fichiers :
  outils/trial-reels/registre.json  une entrée par Trial Reel programmé : écrite par le Monteur au moment
                                    de la programmation, complétée par le Juge (adresse, vues, verdict).
  outils/trial-reels/juge.json      le verdict, réécrit à chaque passage du Juge.
  mesures.tsv (écrit par le Juge à partir de Metricool, une ligne par reel, séparateur tabulation) :
      cle  vues  duree_moy  partages  enregistrements  commentaires
      cle = adresse du reel (https://www.instagram.com/reel/XXXX/) ou id du registre (TR-...).
  leads.tsv (facultatif) : ref  nombre_de_messages_prives   (table D1 dm_instagram, fenêtre de 14 jours)

Rien n'est jamais « dé-interdit » automatiquement : un style interdit le reste tant que Shawez
ou le Boss ne le retire pas à la main de « interdits » dans juge.json.
"""
import argparse
import datetime as dt
import json
import math
import os
import re
import statistics
import sys
from zoneinfo import ZoneInfo

ICI = os.path.dirname(os.path.abspath(__file__))
REGISTRE = os.path.join(ICI, 'registre.json')
JUGE = os.path.join(ICI, 'juge.json')

FENETRE_JOURS = 14      # on juge les Trial Reels des 14 derniers jours
AGE_MIN_H = 24          # un Trial Reel est jugé 24 h après sa publication
GAGNANT_MIN = 1000      # gagnant : au moins 1 000 vues…
GAGNANT_X = 3           # … et au moins 3 fois la médiane
PERDANT_MIN = 300       # perdant : moins de 300 vues…
PERDANT_X = 2           # … ou moins de 2 fois la médiane (le plus haut des deux seuils)
STYLE_BAN_N = 2         # style interdit dès 2 versions jugées sans gagnant, avec 2/3 de perdants
BIEN_PAUSE_N = 4        # bien en pause après 4 versions jugées sans gagnant ni message privé
PAUSE_JOURS = 14
TESTS_MAX = 20          # au plus 20 % des versions du jour dans un style à tester
QUOTA_GAGNANTS = 80     # au moins 80 % des versions du jour dans un style gagnant

STYLES = {
    'chiffre_choc': "le prix ou un chiffre fort dès le premier mot (« 2 500 000 € derrière cette porte », « 18 pièces, 520 m², un étang »)",
    'lieu_exception': "le bien d'exception annoncé d'emblée, en une phrase courte (« Château du XVIIIe à 15 min de Beaune », « Marrakech, en plein centre de Dijon »)",
    'revelation': "une porte, un placard ou une pièce cachée qu'on ouvre (« Tu pensais que c'était un placard ? », « Derrière cette porte… »)",
    'defi_1pourcent': "défi pause avec la statistique « Seul 1 % y arrive » ou « 99 % ratent ce moment »",
    'question': "l'accroche est une question posée au spectateur (« Tu choisis quoi ? », « Un week-end ici, tu dis oui ? »)",
    'detail_surprenant': "un équipement inattendu (« Une baignoire balnéo dans 19 m², oui c'est possible »)",
    'business': "rentabilité ou chiffres d'exploitation (« déjà loué en courte durée », « 1,8 M€ encaissés »)",
    'descriptif': "visite guidée : « je te montre », « je commence par », « je te propose », liste de pièces ou d'équipements",
    'pov': "« POV : … »",
    'defi_autre': "défi pause sans la statistique du 1 % (réflexes, chute, pari, « impossible »)",
    'autre': "rien de ce qui précède",
}

PRIX = r"\d[\d\s .,]*\s?(?:€|euros?\b|m€|k€)|\bmillions?\b|\bcent mille\b|\bmille euros\b"


def classer(texte):
    """Style d'une accroche ou d'une légende, d'après son début. Le Monteur écrit le style lui-même ;
    ceci sert pour les Trial Reels programmés par quelqu'un d'autre."""
    t = (texte or '').strip()
    bas = t.lower().replace('’', "'")
    debut = bas.split('\n')[0][:160]
    tete = debut[:40]
    zone = bas[:300]
    if re.match(r"\s*pov\b", debut):
        return 'pov'
    if re.search(r"\b(1|99)\s?%", debut) and re.search(r"pause|ratent|\brate|arrive|réussi|moment|essai", zone):
        return 'defi_1pourcent'
    if re.search(r"\bpause\b|réflexe|reflexe|\bdéfi\b|\bdefi\b|\bpari\b|\bparie\b", zone):
        return 'defi_autre'
    if re.search(PRIX, tete):
        return 'chiffre_choc'
    if re.match(r"\s*\d[\d\s.,]*\s*(pièces|pieces|m²|m2|chambres|hectares|ha\b|appartements|lots)", tete) and not re.match(r"\s*\d{1,2}\s*m²\s*(rénov|renov)", tete):
        return 'chiffre_choc'
    if re.search(r"je (te )?(montre|commence|propose|fais (entrer|découvrir|decouvrir))|un aperçu|voilà les espaces|voici quelques|je voulais te le montrer|^(le|la|les) .{0,40}(puis|ensuite)", debut):
        return 'descriptif'
    if re.search(r"derrière (cette|la) porte|tu pensais|regarde bien|attends (la fin|de voir)|\bcache\b|caché|cachée|secret|porte.{0,60}derrière|pièce derrière", debut):
        return 'revelation'
    if re.match(r"[^:?]{0,60}:\s*[^,]+,[^,]+,", debut):
        return 'descriptif'
    if re.search(r"déjà loué|rentab|chiffre d'affaires|rapporte|investiss|courte durée|bilan", debut):
        return 'business'
    if re.search(r"oui c'est possible|dans \d+\s?m²", debut):
        return 'detail_surprenant'
    if re.match(r"\s*(ce |cet |un |une )?(château|chateau|hôtel particulier|hotel particulier|manoir|villa|loft|maison d'architecte)|.{0,30}en plein (centre|cœur|coeur)", debut):
        return 'lieu_exception'
    premiere_phrase = re.split(r"(?<=[.!?…])\s", debut)[0]
    if '?' in premiere_phrase:
        return 'question'
    if re.search(r"je te montre|je commence|visite", debut):
        return 'descriptif'
    return 'autre'


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


def nombre(x):
    x = (x or '').strip().replace(' ', '').replace(' ', '')
    if not x:
        return 0.0
    return float(x.replace(',', '.'))


def lire_mesures(chemin):
    mesures = {}
    with open(chemin, encoding='utf-8') as f:
        for ligne in f:
            ligne = ligne.rstrip('\n')
            if not ligne.strip() or ligne.startswith('#') or ligne.lower().startswith('cle'):
                continue
            c = ligne.split('\t')
            c += [''] * (6 - len(c))
            cle = c[0].strip()
            m = re.search(r"instagram\.com/reels?/([A-Za-z0-9_-]+)", cle)
            if m:
                cle = 'https://www.instagram.com/reel/%s/' % m.group(1)
            mesures[cle] = {
                'vues': int(nombre(c[1])), 'duree_moy': round(nombre(c[2]), 2), 'partages': int(nombre(c[3])),
                'enregistrements': int(nombre(c[4])), 'commentaires': int(nombre(c[5])),
            }
    return mesures


def lire_leads(chemin):
    leads = {}
    if not chemin:
        return leads
    with open(chemin, encoding='utf-8') as f:
        for ligne in f:
            c = ligne.rstrip('\n').split('\t')
            if len(c) >= 2 and c[0].strip() and not c[0].lower().startswith('ref'):
                leads[c[0].strip()] = leads.get(c[0].strip(), 0) + int(nombre(c[1]))
    return leads


def quand(v):
    return dt.datetime.strptime('%s %s' % (v['date'], v.get('heure', '00:00')), '%Y-%m-%d %H:%M')


def juger(args):
    maintenant = (dt.datetime.strptime(args.maintenant, '%Y-%m-%dT%H:%M') if args.maintenant
                  else dt.datetime.now(ZoneInfo('Europe/Paris')).replace(tzinfo=None, second=0, microsecond=0))
    registre = lire_json(REGISTRE, {'versions': []})
    precedent = lire_json(JUGE, {})
    mesures = lire_mesures(args.mesures)
    leads = lire_leads(args.leads)
    debut = maintenant - dt.timedelta(days=FENETRE_JOURS)

    # 1. Rattacher les mesures au registre (par id, puis par adresse du reel).
    for v in registre['versions']:
        m = mesures.get(v['id']) or (mesures.get(v.get('url')) if v.get('url') else None)
        if m:
            v.update(m)
            v['mesure_le'] = maintenant.strftime('%Y-%m-%dT%H:%M')

    jugeables = [v for v in registre['versions']
                 if v.get('statut', 'publie') == 'publie' and 'vues' in v and debut <= quand(v) <= maintenant]
    murs = [v for v in jugeables if (maintenant - quand(v)).total_seconds() >= AGE_MIN_H * 3600]
    mediane = statistics.median([v['vues'] for v in murs]) if murs else 0
    seuil_g = max(GAGNANT_MIN, GAGNANT_X * mediane)
    seuil_p = max(PERDANT_MIN, PERDANT_X * mediane)

    # 2. Verdict par version.
    for v in jugeables:
        age_h = (maintenant - quand(v)).total_seconds() / 3600
        if v['vues'] >= seuil_g:
            v['verdict'] = 'gagnant'
        elif age_h < AGE_MIN_H:
            v['verdict'] = 'en_cours'
        elif v['vues'] < seuil_p:
            v['verdict'] = 'perdant'
        else:
            v['verdict'] = 'moyen'

    juges = [v for v in jugeables if v['verdict'] != 'en_cours']

    # 3. Verdict par style.
    interdits = dict(precedent.get('interdits', {}))
    styles = {}
    for nom, definition in STYLES.items():
        vs = [v for v in juges if v.get('style') == nom]
        g = sum(1 for v in vs if v['verdict'] == 'gagnant')
        p = sum(1 for v in vs if v['verdict'] == 'perdant')
        n = len(vs)
        if nom not in interdits and n >= STYLE_BAN_N and g == 0 and p >= math.ceil(2 * n / 3):
            interdits[nom] = {'depuis': maintenant.strftime('%Y-%m-%d'), 'source': 'juge',
                              'raison': '%d versions jugées, %d perdantes, aucune gagnante' % (n, p)}
        if nom in interdits:
            statut = 'interdit'
        elif g >= 1 and g >= p:
            statut = 'gagnant'
        elif n < STYLE_BAN_N:
            statut = 'a_tester'
        else:
            statut = 'neutre'
        meilleure = max(vs, key=lambda x: x['vues']) if vs else None
        styles[nom] = {
            'definition': definition, 'statut': statut, 'versions_jugees': n, 'gagnants': g, 'perdants': p,
            'mediane_vues': int(statistics.median([x['vues'] for x in vs])) if vs else None,
            'meilleure': {'id': meilleure['id'], 'vues': meilleure['vues']} if meilleure else None,
        }

    # 4. Verdict par bien.
    pauses = {ref: p for ref, p in precedent.get('biens_en_pause', {}).items()
              if p.get('jusqu_au', '') >= maintenant.strftime('%Y-%m-%d')}
    biens = {}
    for ref in sorted({v.get('ref') for v in juges if v.get('ref') and v.get('ref') != 'defi'}):
        vs = [v for v in juges if v.get('ref') == ref]
        g = sum(1 for v in vs if v['verdict'] == 'gagnant')
        nl = leads.get(ref, 0)
        if ref not in pauses and len(vs) >= BIEN_PAUSE_N and g == 0 and nl == 0:
            pauses[ref] = {'jusqu_au': (maintenant + dt.timedelta(days=PAUSE_JOURS)).strftime('%Y-%m-%d'),
                           'source': 'juge', 'raison': '%d versions jugées, aucune gagnante, aucun message privé' % len(vs)}
        biens[ref] = {
            'versions_jugees': len(vs), 'gagnants': g, 'messages_prives': nl,
            'mediane_vues': int(statistics.median([x['vues'] for x in vs])),
            'statut': 'en_pause' if ref in pauses else ('fort' if g >= 1 else 'actif'),
        }

    recents = sorted([v for v in jugeables if v['verdict'] == 'gagnant' and (maintenant - quand(v)).days <= 3],
                     key=lambda x: -x['vues'])
    gagnants_styles = [s for s, d in styles.items() if d['statut'] == 'gagnant']
    a_tester = [s for s, d in styles.items() if d['statut'] in ('a_tester', 'neutre') and s != 'autre']

    juge = {
        'maj': maintenant.strftime('%Y-%m-%dT%H:%M'),
        'regles': {
            'fenetre': 'Trial Reels publiés depuis %d jours, jugés %d h après publication' % (FENETRE_JOURS, AGE_MIN_H),
            'gagnant': 'au moins %d vues et au moins %d fois la médiane' % (GAGNANT_MIN, GAGNANT_X),
            'perdant': 'moins de %d vues ou moins de %d fois la médiane (le plus haut des deux)' % (PERDANT_MIN, PERDANT_X),
            'style_interdit': 'dès %d versions jugées sans aucune gagnante et au moins 2/3 de perdantes ; jamais levé automatiquement' % STYLE_BAN_N,
            'bien_en_pause': '%d versions jugées sans gagnante ni message privé : pause de %d jours' % (BIEN_PAUSE_N, PAUSE_JOURS),
            'quota_du_jour': 'au moins %d %% des versions du jour dans un style gagnant, au plus %d %% dans un style à tester, zéro dans un style interdit ; 15 Trial Reels au plus sur 24 heures glissantes' % (QUOTA_GAGNANTS, TESTS_MAX),
        },
        'seuils': {'mediane_vues': int(mediane), 'gagnant_des': int(seuil_g), 'perdant_sous': int(seuil_p),
                   'versions_jugees': len(juges), 'versions_en_cours': len(jugeables) - len(juges)},
        'styles_gagnants': gagnants_styles,
        'styles_a_tester': a_tester,
        'styles_interdits': sorted(interdits),
        'interdits': interdits,
        'biens_en_pause': pauses,
        'styles': styles,
        'biens': biens,
        'gagnants_recents': [{'id': v['id'], 'ref': v.get('ref'), 'style': v.get('style'), 'vues': v['vues'],
                              'url': v.get('url'), 'date': v['date']} for v in recents],
        'consigne_monteur': ("Chaque version porte un « style » de la liste. Jamais un style de styles_interdits, jamais un bien de biens_en_pause. "
                             "Au moins %d %% des versions du jour dans styles_gagnants (sur les biens les plus forts), au plus %d %% dans styles_a_tester. "
                             "Chaque Trial Reel programmé est ajouté à registre.json." % (QUOTA_GAGNANTS, TESTS_MAX)),
        'consigne_codex': ("Ne livre plus aucun Trial Reel dans un style de styles_interdits : il sera refusé. "
                           "Livre d'abord des variantes des gagnants_recents (même accroche, autre musique, autres premiers plans)."),
    }
    ecrire_json(JUGE, juge)
    registre['versions'] = [v for v in registre['versions'] if quand(v) >= maintenant - dt.timedelta(days=30)]
    ecrire_json(REGISTRE, registre)

    # Résumé lisible, recopié par l'agent dans le doc Croissance pour Codex.
    jj = maintenant.strftime('%d/%m')
    lignes = ['=== JUGE %s ===' % jj,
              'Médiane des Trial Reels sur %d jours : %d vues. Gagnant dès %d vues, perdant sous %d vues après %d h. %d versions jugées.'
              % (FENETRE_JOURS, mediane, seuil_g, seuil_p, AGE_MIN_H, len(juges))]
    lignes.append('STYLES GAGNANTS : ' + (', '.join('%s (%d/%d gagnants)' % (s, styles[s]['gagnants'], styles[s]['versions_jugees']) for s in gagnants_styles) or 'aucun encore'))
    lignes.append('À TESTER, 2 par jour au plus : ' + (', '.join(a_tester) or 'aucun'))
    lignes.append('INTERDITS, plus jamais publiés : ' + (', '.join('%s (%s)' % (s, interdits[s]['raison']) for s in sorted(interdits)) or 'aucun'))
    lignes.append('BIENS EN PAUSE : ' + (', '.join('%s jusqu\'au %s' % (r, p['jusqu_au']) for r, p in sorted(pauses.items())) or 'aucun'))
    for v in recents[:5]:
        lignes.append('GAGNANT %s : %d vues, style %s, %s' % (v['id'], v['vues'], v.get('style'), v.get('url') or ''))
    print('\n'.join(lignes))


def main():
    a = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    a.add_argument('--mesures')
    a.add_argument('--leads')
    a.add_argument('--maintenant', help='AAAA-MM-JJTHH:MM, heure de Paris (par défaut : maintenant)')
    a.add_argument('--classer', help="donne le style d'un texte")
    args = a.parse_args()
    if args.classer is not None:
        print(classer(args.classer))
        return
    if not args.mesures:
        a.error('--mesures est obligatoire (ou --classer)')
    juger(args)


if __name__ == '__main__':
    main()

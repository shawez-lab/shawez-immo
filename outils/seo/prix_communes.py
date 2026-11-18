#!/usr/bin/env python3
"""Pages « Prix immobilier à <commune> » (/prix-immobilier-<commune>/) pour les communes de Côte-d'Or
qui ont assez de ventes réelles DVF, à partir des seules données du dépôt (donnees-dvf/).

Règles :
- SEUIL : une page n'est faite que si la commune compte au moins 30 ventes simples (un seul logement) sur la période
  DVF du dépôt (2023-2025), et au moins 20 pour le type de bien dominant. En dessous, aucun chiffre n'est publié.
- Un prix médian par type n'est affiché que s'il repose sur au moins 10 ventes ; une année, sur au moins 5 ventes ;
  une évolution en %, seulement si les deux années comparées ont chacune au moins 10 ventes.
- Aucune donnée inventée : prix, surfaces, terrains, pièces et voies sortent des fichiers DVF ; les biens en vente,
  d'annonces.json. Pas de temps de trajet (non vérifiable dans les données).
- Les pages prix faites avant ce script ne sont pas réécrites (sauf --tout) ; celles qui portent sa marque sont refaites. Le tableau de /prix-immobilier-cote-d-or/ est refait
  avec toutes les communes qui ont une page.

    python3 outils/seo/prix_communes.py            # crée les pages manquantes + met à jour le tableau Côte-d'Or
    python3 outils/seo/prix_communes.py --liste    # affiche les communes retenues / écartées, n'écrit rien
"""
import argparse, glob, html, json, math, os, re, statistics as st, sys, unicodedata
from pathlib import Path
from search_local import ZONE_GOOGLE, commune_actuelle, adapter_prix

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
BASE = 'https://shawez-immo.com'
sys.path.insert(0, os.path.join(ROOT, 'outils', 'biens'))
from commun import ACTIFS, chemin_fiche  # noqa: E402

SEUIL, SEUIL_TYPE_DOMINANT, MIN_TYPE, MIN_ANNEE, MIN_EVOL = 30, 20, 10, 5, 10
DATE, DATE_FR = '2026-11-18', '18 novembre 2026'
NB = ' '
MARQUE = '<!-- page générée par outils/seo/prix_communes.py -->'
GABARIT = os.path.join(ROOT, 'prix-immobilier-fenay', 'index.html')

# Communes membres de Dijon Métropole (fait public, liste officielle de la métropole)
METROPOLE = {'Ahuy', 'Bressey-sur-Tille', 'Bretenière', 'Chenôve', 'Chevigny-Saint-Sauveur', 'Corcelles-les-Monts', 'Daix',
             'Dijon', 'Fénay', 'Flavignerot', 'Fontaine-lès-Dijon', 'Hauteville-lès-Dijon', 'Longvic', 'Magny-sur-Tille',
             'Marsannay-la-Côte', 'Neuilly-lès-Dijon', 'Ouges', 'Perrigny-lès-Dijon', 'Plombières-lès-Dijon', 'Quetigny',
             'Saint-Apollinaire', 'Sennecey-lès-Dijon', 'Talant'}
# Pages « ville » déjà en ligne, à relier depuis la page prix de la même commune
PAGES_VILLE = {'Beaune': ('/agent-immobilier-beaune/', 'Agent immobilier à Beaune'),
               'Nuits-Saint-Georges': ('/immobilier-nuits-saint-georges/', 'Vendre à Nuits-Saint-Georges'),
               'Fontaine-lès-Dijon': ('/immobilier-fontaine-les-dijon/', 'Vendre à Fontaine-lès-Dijon')}

ABR = {'AV': 'avenue', 'AVE': 'avenue', 'RTE': 'route', 'RUE': 'rue', 'BD': 'boulevard', 'CHE': 'chemin', 'CHEM': 'chemin',
       'ALL': 'allée', 'IMP': 'impasse', 'PL': 'place', 'FG': 'faubourg', 'QUAI': 'quai', 'QUA': 'quai', 'CRS': 'cours',
       'SQ': 'square', 'LOT': 'lotissement', 'RES': 'résidence', 'PAS': 'passage', 'PASS': 'passage', 'SEN': 'sentier',
       'CHEMIN': 'chemin', 'ROUTE': 'route', 'AVENUE': 'avenue', 'PLACE': 'place', 'IMPASSE': 'impasse', 'ALLEE': 'allée',
       'CITE': 'cité', 'RLE': 'ruelle', 'PROM': 'promenade', 'MAIL': 'mail', 'HAM': 'hameau', 'VC': 'chemin', 'GR': 'grande rue',
       'GRANDE': 'Grande', 'GRAND': 'Grand', 'GDE': 'Grande', 'CTRE': 'centre', 'PRV': 'parvis', 'ESP': 'esplanade', 'RPT': 'rond-point', 'TSSE': 'terrasse'}
MINUS = {'DE', 'DU', 'DES', 'LA', 'LE', 'LES', 'L', 'D', 'ET', 'AU', 'AUX', 'EN', 'SUR', 'SOUS'}
ACCENTS = {'RESISTANCE': 'Résistance', 'GENERAL': 'Général', 'REPUBLIQUE': 'République', 'ECOLE': 'École', 'ECOLES': 'Écoles',
           'EGLISE': 'Église', 'ETANG': 'Étang', 'CHATEAU': 'Château', 'PRES': 'Prés', 'PRE': 'Pré', 'FORET': 'Forêt',
           'LIBERATION': 'Libération', 'MARECHAL': 'Maréchal', 'FRERES': 'Frères', 'GENERAUX': 'Généraux', 'COTE': 'Côte',
           'COTES': 'Côtes', 'CHENES': 'Chênes', 'CHENE': 'Chêne', 'TILLEULS': 'Tilleuls', 'PERE': 'Père', 'MERE': 'Mère',
           'ELYSEES': 'Élysées', 'ETOILE': 'Étoile', 'ECLUSE': 'Écluse', 'HOTEL': 'Hôtel', 'HOPITAL': 'Hôpital',
           'PRIEURE': 'Prieuré', 'MONTEE': 'Montée', 'VALLEE': 'Vallée', 'ALLEE': 'Allée', 'CITE': 'Cité', 'FETE': 'Fête',
           'FETES': 'Fêtes', 'ARMEE': 'Armée', 'EPINE': 'Épine', 'EPINES': 'Épines', 'ETANGS': 'Étangs', 'FONTAINE': 'Fontaine',
           'DEPORTES': 'Déportés', 'FUSILLES': 'Fusillés', 'MAQUIS': 'Maquis', 'COMBATTANTS': 'Combattants', 'LEON': 'Léon',
           'HELENE': 'Hélène', 'THEODORE': 'Théodore', 'RENE': 'René', 'ANDRE': 'André', 'FELIX': 'Félix', 'CLEMENT': 'Clément',
           'CLEMENCEAU': 'Clemenceau', 'GENEVIEVE': 'Geneviève', 'EMILE': 'Émile', 'EDOUARD': 'Édouard', 'ETIENNE': 'Étienne',
           'EUGENE': 'Eugène', 'VERONIQUE': 'Véronique', 'JOSEPHINE': 'Joséphine', 'ISAAC': 'Isaac', 'PEPINIERE': 'Pépinière',
           'CIMETIERE': 'Cimetière', 'CHAMPAGNE': 'Champagne', 'BEZE': 'Bèze', 'SAONE': 'Saône', 'NOTRE': 'Notre',
           'DAME': 'Dame', 'MAITRE': 'Maître', 'CRETE': 'Crête', 'BOUCHERES': 'Bouchères', 'TREMOUILLE': 'Trémouille',
           'BRULE': 'Brûlé', 'BRULEE': 'Brûlée', 'GENETS': 'Genêts', 'BLE': 'Blé', 'MEDECIN': 'Médecin', 'DOCTEUR': 'Docteur',
           'ETE': 'Été', 'ILE': 'Île', 'ILES': 'Îles', 'MAIRIE': 'Mairie', 'MOULIN': 'Moulin', 'LYCEE': 'Lycée',
           'COLLEGE': 'Collège', 'GARE': 'Gare', 'ECHO': 'Écho', 'ELIE': 'Élie', 'GEORGES': 'Georges', 'BERANGER': 'Béranger',
           'MERIMEE': 'Mérimée', 'PREVERT': 'Prévert', 'VERDUN': 'Verdun', 'DEGAULLE': 'de Gaulle', 'AERODROME': 'Aérodrome',
           'NAPOLEON': 'Napoléon', 'CELESTIN': 'Célestin', 'PERRIERE': 'Perrière', 'PERRIERES': 'Perrières', 'VIGNERONS': 'Vignerons',
           'TERREAUX': 'Terreaux', 'MARECHAUX': 'Maréchaux', 'REMPARTS': 'Remparts', 'EVEQUE': 'Évêque', 'DIDEROT': 'Diderot',
           'MOLIERE': 'Molière', 'PEGUY': 'Péguy', 'ARAGO': 'Arago', 'ESPERANCE': 'Espérance', 'MEDIEVAL': 'Médiéval',
           'GREGOIRE': 'Grégoire', 'FREDERIC': 'Frédéric', 'MISTRAL': 'Mistral', 'VERGERS': 'Vergers', 'CHAUME': 'Chaume',
           'BRIQUETERIE': 'Briqueterie', 'TUILERIE': 'Tuilerie', 'TUILERIES': 'Tuileries', 'CURE': 'Cure', 'CURES': 'Cures',
           'SEMINAIRE': 'Séminaire', 'BENEDICTINS': 'Bénédictins', 'CORDELIERS': 'Cordeliers', 'BASTIE': 'Bastié',
           'HERISSON': 'Hérisson', 'GENIE': 'Génie', 'HERONS': 'Hérons', 'ORMES': 'Ormes', 'EGALITE': 'Égalité',
           'FRATERNITE': 'Fraternité', 'LIBERTE': 'Liberté', 'PRESIDENT': 'Président', 'DEPUTE': 'Député', 'SENATEUR': 'Sénateur',
           'OCTOBRE': 'Octobre', 'FEVRIER': 'Février', 'AOUT': 'Août', 'DECEMBRE': 'Décembre', 'MAI': 'Mai', 'JUIN': 'Juin',
           'GUERIN': 'Guérin', 'ECHENON': 'Échenon', 'EPOISSES': 'Époisses', 'BELEM': 'Belém', 'EOLE': 'Éole',
           'TETE': 'Tête', 'FORETS': 'Forêts', 'PATURE': 'Pâture', 'PATURES': 'Pâtures', 'PATIS': 'Pâtis', 'CHENEVIERES': 'Chènevières',
           'CHENEVIERE': 'Chènevière', 'LOUVIERE': 'Louvière', 'FEUILLEE': 'Feuillée', 'FRANCAISE': 'Française',
           'FRANCOIS': 'François', 'CESAR': 'César', 'BLES': 'Blés', 'CEZANNE': 'Cézanne', 'DAUPHINE': 'Dauphiné',
           'BRETONNIERE': 'Bretonnière', 'EGLANTIERS': 'Églantiers', 'COMTE': 'Comté', 'GLACIERE': 'Glacière', 'PREMIERE': 'Première',
           'CORVEE': 'Corvée', 'ANE': 'Âne', 'SECHE': 'Sèche', 'CARRE': 'Carré', 'FRENE': 'Frêne', 'CHATAIGNIER': 'Châtaignier',
           'PREE': 'Prée', 'CHEVRIERES': 'Chevrières', 'EPEAUTRE': 'Épeautre', 'OREADES': 'Oréades', 'JAURES': 'Jaurès',
           'STEPHANE': 'Stéphane', 'DOC': 'Docteur', 'ING': 'Ingénieur', 'FBG': 'Faubourg', 'GDE': 'Grande', 'A': 'à', 'FOSSES': 'Fossés', 'FOSSE': 'Fossé', 'ROMAINE': 'Romaine', 'LEVEE': 'Levée'}


def slug(s):
    s = unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[^a-z0-9]+', '-', s).strip('-')


def voie_lisible(v):
    mots = v.replace("'", "' ").split()
    if len(mots) > 1 and mots[0] == 'GR' and mots[1].startswith('GRAND'):
        mots = mots[1:]
    out = []
    for i, m in enumerate(mots):
        if i == 0 and m in ABR:
            out.append(ABR[m]); continue
        if m in ('L\'', 'D\''):
            out.append(m.lower()); continue
        if m in ('L', 'D') and 0 < i < len(mots) - 1:
            out.append(m.lower() + "\x00"); continue
        if m in MINUS and i > 0:
            out.append(m.lower()); continue
        if m in ACCENTS:
            out.append(ACCENTS[m]); continue
        out.append('-'.join(p.capitalize() for p in m.split('-')))
    s = ' '.join(out).replace("' ", "'").replace("\x00 ", "'")
    s = re.sub(r'\bSt\b', 'Saint', s); s = re.sub(r'\bSte\b', 'Sainte', s)
    return s[0].upper() + s[1:] if s else s


def e(n):
    """Nombre arrondi à la dizaine, séparateur fine insécable."""
    return '{:,}'.format(int(round(n / 10.0) * 10)).replace(',', NB)


def ent(n, pas=1000):
    return '{:,}'.format(int(round(n / float(pas)) * pas)).replace(',', NB)


def charge():
    idx = json.load(open(os.path.join(ROOT, 'donnees-dvf', 'index.json'), encoding='utf-8'))
    ventes = []
    for nom in idx['tuiles']:
        t = json.load(open(os.path.join(ROOT, 'donnees-dvf', 't', nom + '.json')))
        d = open(os.path.join(ROOT, 'donnees-dvf', 'd', nom + '.txt'), encoding='utf-8').read().split('\n')
        assert len(t) == len(d), nom
        for v, l in zip(t, d):
            x = json.loads(l)
            ventes.append(dict(lat=v[0], lon=v[1], maison=v[2] == 1, surf=v[3], pm2=v[4], an=v[5] // 100, pieces=v[6],
                               terrain=v[7], prix=x[0], voie=x[1], commune=commune_actuelle(ROOT, x[2], v[1], v[0])))
    return idx, ventes


def q(vals):
    if len(vals) < 4:
        return None
    a = st.quantiles(vals, n=4)
    return a[0], a[2]


def stats_type(lst):
    if not lst:
        return None
    pm = [v['pm2'] for v in lst]
    out = dict(n=len(lst), pm2=st.median(pm), prix=st.median([v['prix'] for v in lst]), surf=st.median([v['surf'] for v in lst]),
               q=q(pm), qprix=q([v['prix'] for v in lst]), ans={})
    for an in sorted(set(v['an'] for v in lst)):
        s = [v['pm2'] for v in lst if v['an'] == an]
        out['ans'][an] = (len(s), st.median(s))
    return out


def evolution(s, annees):
    a0, a1 = annees[0], annees[-1]
    n0, m0 = s['ans'].get(a0, (0, 0)); n1, m1 = s['ans'].get(a1, (0, 0))
    if n0 >= MIN_EVOL and n1 >= MIN_EVOL:
        return round((m1 - m0) / m0 * 100)
    return None


def dist(a, b):
    x = math.radians(b[1] - a[1]) * math.cos(math.radians((a[0] + b[0]) / 2)); y = math.radians(b[0] - a[0])
    return 6371 * math.hypot(x, y)


def accord(n, sing, plur):
    return '%d %s' % (n, sing if n == 1 else plur)


def analyse(nom, lst, dep, annees):
    ap = [v for v in lst if not v['maison']]; ma = [v for v in lst if v['maison']]
    S = dict(nom=nom, slug=slug(nom), n=len(lst), app=stats_type(ap), mai=stats_type(ma),
             centre=(st.median([v['lat'] for v in lst]), st.median([v['lon'] for v in lst])))
    S['dominant'] = 'mai' if len(ma) >= len(ap) else 'app'
    # pièces du type dominant
    dom = ma if S['dominant'] == 'mai' else ap
    par = {}
    for v in dom:
        if v['pieces'] <= 0:
            continue
        k = min(v['pieces'], 6 if S['dominant'] == 'mai' else 5)
        par.setdefault(k, []).append(v)
    S['pieces'] = {k: (len(l), st.median([v['prix'] for v in l]), st.median([v['surf'] for v in l])) for k, l in sorted(par.items())}
    terr = [v['terrain'] for v in ma if v['terrain'] > 0]
    S['terrain'] = (len(terr), st.median(terr), sum(1 for t in terr if t >= 1000)) if len(terr) >= MIN_TYPE else None
    # voies : au moins 3 ventes
    vo = {}
    for v in lst:
        if v['voie']:
            vo.setdefault(v['voie'], []).append(v)
    top = sorted(((k, l) for k, l in vo.items() if len(l) >= 3), key=lambda x: (-len(x[1]), x[0]))[:6]
    S['voies'] = [(voie_lisible(k), len(l), st.median([v['pm2'] for v in l]) if len(l) >= 5 else None) for k, l in top]
    S['par_an'] = {an: sum(1 for v in lst if v['an'] == an) for an in annees}
    S['dep'] = dep
    return S


# ---------- texte ----------

def nom_type(t, pl=True):
    return {'mai': 'maisons' if pl else 'maison', 'app': 'appartements' if pl else 'appartement'}[t]


def page(S, voisins, annonces, annees):
    N, n = S['nom'], S['n']
    a0, a1 = annees[0], annees[-1]
    dom = S['dominant']; sd = S[dom]
    autre = 'app' if dom == 'mai' else 'mai'
    so = S[autre]
    part = round(sd['n'] / n * 10)
    sections = []

    # intro
    intro = ('Ces chiffres ne viennent pas d\'annonces : ce sont les %d ventes de logements signées chez le notaire à %s entre %d et %d, '
             'telles que publiées par l\'État (base DVF). ' % (n, N, a0, a1))
    if part >= 9:
        intro += 'Ici, le marché, c\'est d\'abord la %s : %d ventes sur %d.' % (nom_type(dom, False), sd['n'], n)
    elif part >= 6:
        intro += 'Environ %d ventes sur 10 concernent des %s.' % (part, nom_type(dom))
    else:
        intro += 'Les ventes se partagent entre appartements (%d) et maisons (%d).' % (S['app']['n'] if S['app'] else 0, S['mai']['n'] if S['mai'] else 0)
    if N in METROPOLE:
        intro += ' %s fait partie de Dijon Métropole.' % N

    # 1. prix à retenir
    rows = ''
    for t, lab in (('app', 'Appartements'), ('mai', 'Maisons')):
        s = S[t]
        if not s:
            continue
        if s['n'] >= MIN_TYPE:
            rows += '<tr><td>%s</td><td>%d</td><td>%s €/m²</td><td>%s €</td><td>%d m²</td></tr>' % (lab, s['n'], e(s['pm2']), ent(s['prix']), round(s['surf']))
        else:
            rows += '<tr><td>%s</td><td>%d</td><td colspan="3">trop peu de ventes pour un prix fiable</td></tr>' % (lab, s['n'])
    b = ('<p>Prix médians des ventes de %d à %d à %s. La médiane coupe les ventes en deux : la moitié s\'est faite au-dessus, l\'autre moitié en dessous.</p>'
         '<table><thead><tr><th>Type</th><th>Ventes</th><th>Prix médian au m²</th><th>Prix médian</th><th>Surface médiane</th></tr></thead><tbody>%s</tbody></table>'
         % (a0, a1, N, rows))
    dep = S['dep'][dom]
    ecart = round((sd['pm2'] - dep) / dep * 100)
    if abs(ecart) < 3:
        cmp_ = 'au même niveau que la médiane de la Côte-d\'Or (%s €/m²)' % e(dep)
    else:
        cmp_ = '%d %% %s la médiane de toute la Côte-d\'Or (%s €/m²) sur la même période' % (abs(ecart), 'au-dessus de' if ecart > 0 else 'en dessous de', e(dep))
    b += '<p>Pour les %s, le prix médian au m² à %s est %s.</p>' % (nom_type(dom), N, cmp_)
    sections.append(('les-prix-a-retenir', 'Les prix à retenir à %s' % N, b))

    # 2. fourchettes
    b = ''
    for t in (dom, autre):
        s = S[t]
        if s and s['n'] >= MIN_TYPE and s['q']:
            b += ('<p><strong>%s</strong> : la moitié des ventes s\'est faite entre %s et %s €/m², soit entre %s et %s € pour le prix total.</p>'
                  % (nom_type(t).capitalize(), e(s['q'][0]), e(s['q'][1]), ent(s['qprix'][0]), ent(s['qprix'][1])))
    b += ('<p>L\'écart entre le bas et le haut de la fourchette vient surtout de l\'état du bien, du DPE, %s.</p>'
          % ('du terrain et des travaux à prévoir' if dom == 'mai' else 'de l\'étage, de l\'ascenseur et du stationnement'))
    sections.append(('la-fourchette', 'La fourchette de prix', b))

    # 3. ce qui se vend
    b = ''
    if S['pieces']:
        lab = (lambda k: ('%d pièces et plus' % k) if k == (6 if dom == 'mai' else 5) else ('%d pièce' % k if k == 1 else '%d pièces' % k))
        li = ''.join('<li>%s : %s%s</li>' % (lab(k), accord(c, 'vente', 'ventes'),
                                              (', prix médian %s €, %d m² en médiane' % (ent(p), round(sf))) if c >= 5 else '')
                     for k, (c, p, sf) in S['pieces'].items())
        b += '<p>Les %s à %s, par nombre de pièces principales :</p><ul>%s</ul>' % (
            'appartements vendus' if dom == 'app' else 'maisons vendues', N, li)
    if S['terrain']:
        nt, mt, gros = S['terrain']
        fin = ('%s %s 1%s000 m² de terrain ou plus' % (accord(gros, 'maison', 'maisons'), 'avait' if gros == 1 else 'avaient', NB)) if gros \
            else 'aucune n\'atteignait 1%s000 m²' % NB
        b += ('<p>Côté terrain, la médiane est de %s m² sur les %d maisons dont la surface de terrain est connue ; %s.</p>'
              % (ent(mt, 10), nt, fin))
    if b:
        sections.append(('ce-qui-se-vend', 'Ce qui se vend à %s' % N, b))

    # 4. évolution
    li = ''
    for an in annees:
        c, m = sd['ans'].get(an, (0, 0))
        li += '<li>%d : %s</li>' % (an, ('%s €/m² (%s)' % (e(m), accord(c, 'vente', 'ventes'))) if c >= MIN_ANNEE else
                                    '%s, trop peu pour un prix fiable' % accord(c, 'vente', 'ventes'))
    ev = evolution(sd, annees)
    b = '<p>Prix médian au m² des %s, année par année :</p><ul>%s</ul>' % (nom_type(dom), li)
    if ev is not None:
        if abs(ev) < 3:
            b += '<p>À %s, entre %d et %d, le prix médian est resté stable (%+d %%).</p>' % (N, a0, a1, ev)
        else:
            b += '<p>À %s, entre %d et %d, le prix médian au m² des %s a %s d\'environ %d %%. ' % (N, a0, a1, nom_type(dom), 'augmenté' if ev > 0 else 'baissé', abs(ev))
            b += 'Une médiane annuelle bouge aussi selon les biens vendus cette année-là : c\'est une tendance, pas une règle.</p>'
    else:
        b += '<p>Avec moins de %d ventes certaines années, une évolution en pourcentage ne serait pas fiable : je ne la donne pas.</p>' % MIN_EVOL
    if so and all(so['ans'].get(an, (0, 0))[0] >= MIN_ANNEE for an in annees):
        li2 = ''.join('<li>%d : %s €/m² (%s)</li>' % (an, e(so['ans'][an][1]), accord(so['ans'][an][0], 'vente', 'ventes')) for an in annees)
        b += '<p>Et pour les %s :</p><ul>%s</ul>' % (nom_type(autre), li2)
        ev2 = evolution(so, annees)
        if ev2 is not None:
            b += '<p>Soit %s entre %d et %d pour les %s.</p>' % ('une quasi-stabilité (%+d %%)' % ev2 if abs(ev2) < 3 else '%+d %%' % ev2, a0, a1, nom_type(autre))
    vol = ', '.join('%s en %d' % (accord(S['par_an'][an], 'vente', 'ventes'), an) for an in annees)
    b += '<p>Nombre de ventes de logements à %s : %s.</p>' % (N, vol)
    sections.append(('l-evolution', 'Comment les prix ont bougé depuis %d' % a0, b))

    # 5. voies
    if len(S['voies']) >= 2:
        li = ''.join('<li>%s : %s%s</li>' % (html.escape(v), accord(c, 'vente', 'ventes'), (', %s €/m² en médiane' % e(m)) if m else '')
                     for v, c, m in S['voies'])
        b = ('<p>Les rues et lieux-dits où il s\'est vendu le plus de logements entre %d et %d (au moins 3 ventes) :</p><ul>%s</ul>'
             '<p>À %s comme ailleurs, une rue très active n\'est pas forcément plus chère : c\'est souvent là qu\'il y a le plus de logements, ou un programme récent. '
             'Pour un prix au m², je regarde toujours les ventes les plus proches de votre bien.</p>' % (a0, a1, li, N))
        sections.append(('les-rues', 'Les rues où ça se vend', b))

    # 6. biens en vente
    if annonces:
        li = ''.join('<li><a href="%s">%s</a></li>' % (u, html.escape(t)) for u, t in annonces)
        sections.append(('en-vente', 'Mes biens en vente à %s' % N, '<ul>%s</ul><p>Tous les biens : <a href="/biens-a-vendre-dijon/">biens à vendre</a>.</p>' % li))

    # 7. votre bien
    b = ('<p>Une médiane ne dit pas le prix de votre bien à %s. Je compare votre logement aux ventes les plus proches, '
         'à surface et état comparables, et je vous donne un prix réaliste, pas un prix qui fait plaisir. '
         'L\'estimation est offerte et sans engagement : <a href="/estimer/">estimer mon bien en ligne</a> ou '
         '<a href="/estimation-immobiliere-dijon/">demander mon avis de valeur écrit</a>.</p>' % N)
    if N in PAGES_VILLE:
        u, t = PAGES_VILLE[N]
        b += '<p>Vous vendez à %s ? Voir aussi : <a href="%s">%s</a>.</p>' % (N, u, html.escape(t))
    sections.append(('votre-bien', 'Et votre bien, il vaut combien ?', b))

    # FAQ
    faq = []
    for t in ('mai', 'app'):
        s = S[t]
        if s and s['n'] >= MIN_TYPE:
            faq.append(('Quel est le prix au m² %s à %s ?' % ('d\'une maison' if t == 'mai' else 'd\'un appartement', N),
                        'Sur %d ventes %s entre %d et %d, le prix médian est de %s €/m², pour un prix médian de %s € et une surface médiane de %d m². '
                        'La moitié des ventes se situe entre %s et %s €/m².'
                        % (s['n'], 'de maisons' if t == 'mai' else 'd\'appartements', a0, a1, e(s['pm2']), ent(s['prix']), round(s['surf']), e(s['q'][0]), e(s['q'][1]))))
    if ev is not None:
        faq.append(('Les prix immobiliers baissent-ils à %s ?' % N,
                    'Pour les %s, le prix médian au m² est passé de %s €/m² en %d à %s €/m² en %d (%+d %%). Une seule année de médiane dépend aussi des biens vendus : '
                    'pour votre bien, ce sont les ventes comparables les plus proches qui comptent.'
                    % (nom_type(dom), e(sd['ans'][a0][1]), a0, e(sd['ans'][a1][1]), a1, ev)))
    faq.append(('Combien de logements se vendent à %s chaque année ?' % N,
                'D\'après la base DVF, %d ventes de logements à %s sur trois ans : %s. Ce sont les ventes d\'un seul appartement ou d\'une seule maison ; '
                'les ventes en bloc, les terrains et les locaux professionnels ne sont pas comptés.' % (n, N, vol)))
    faq.append(('D\'où viennent les prix de %s ?' % N,
                'Des %d ventes de logements à %s publiées dans la base « Demandes de valeurs foncières » (DVF géolocalisées, Etalab, DGFiP), '
                'qui recense les ventes enregistrées par les services fiscaux, jusqu\'au %s. Les ventes atypiques (moins de 9 m², prix au m² anormal) sont écartées.'
                % (n, N, S['derniere_fr'])))
    faq.append(('Combien coûte une estimation à %s ?' % N,
                'Rien : l\'estimation est offerte et sans engagement. Vous pouvez faire une première estimation en ligne, '
                'puis je vous remets un avis de valeur écrit, appuyé sur les ventes comparables à %s et autour de votre bien.' % N))

    # titres
    title = 'Prix immobilier à %s au m² (ventes DVF)' % N
    if len(title) > 60:
        title = 'Prix immobilier à %s au m²' % N
    parts = []
    for t in ('mai', 'app'):
        s = S[t]
        if s and s['n'] >= MIN_TYPE:
            parts.append('%s %s €/m²' % (nom_type(t), e(s['pm2'])))
    desc = 'Prix au m² à %s sur %d ventes réelles %d-%d : %s. Fourchettes, rues, évolution. Estimation offerte.' % (N, n, a0, a1, ', '.join(parts))
    if len(desc) > 160:
        desc = 'Prix au m² à %s sur %d ventes réelles %d-%d : %s. Estimation offerte.' % (N, n, a0, a1, ', '.join(parts))
    if len(desc) > 160:
        desc = 'Prix au m² à %s (%d ventes DVF %d-%d) : %s. Estimation offerte.' % (N, n, a0, a1, parts[0])
    P = dict(title=title, desc=desc, intro=intro, sections=sections, faq=faq, voisins=voisins)
    return adapter_prix(P, N)


def ecrire(S, P, tpl):
    N = S['nom']
    path = '/prix-immobilier-%s/' % S['slug']
    url = BASE + path
    title, desc = P['title'], P['desc']
    assert len(title) <= 60 and len(desc) <= 160, (title, desc)
    h = tpl
    h = re.sub(r'<title>.*?</title>', '<title>' + html.escape(title, quote=False) + '</title>', h, count=1, flags=re.S)
    for attr, val in (('name="description"', desc), ('property="og:title"', title), ('property="og:description"', desc),
                      ('name="twitter:title"', title), ('name="twitter:description"', desc), ('property="og:url"', url)):
        h, k = re.subn(r'(<meta %s content=")[^"]*(")' % re.escape(attr), lambda m: m.group(1) + html.escape(val, quote=True) + m.group(2), h, count=1)
        assert k == 1, attr
    h, k = re.subn(r'(<link rel="canonical" href=")[^"]*(")', lambda m: m.group(1) + url + m.group(2), h, count=1)
    assert k == 1
    # JSON-LD : mêmes nœuds que les pages prix existantes (+ FAQPage)
    m = re.search(r'<script type="application/ld\+json">(.*?)</script>', h, re.S)
    g = json.loads(m.group(1))
    nodes = []
    for nd in g['@graph']:
        t = nd.get('@type')
        if t == 'WebPage':
            nd.update({'@id': url + '#page', 'url': url, 'name': title, 'description': desc, 'dateModified': DATE})
        elif t == 'BreadcrumbList':
            nd['itemListElement'][2].update({'name': 'Prix immobilier à %s' % N, 'item': url})
        elif t == 'Article':
            nd.update({'@id': url + '#article', 'headline': title, 'description': desc, 'datePublished': DATE, 'dateModified': DATE,
                       'mainEntityOfPage': {'@id': url + '#page'}})
            nd.pop('wordCount', None)
        elif t == 'FAQPage':
            continue
        nodes.append(nd)
    nodes.append({'@type': 'FAQPage', '@id': url + '#faq', 'mainEntity': [
        {'@type': 'Question', 'name': qq, 'acceptedAnswer': {'@type': 'Answer', 'text': re.sub('<[^>]+>', '', a)}} for qq, a in P['faq']]})
    g['@graph'] = nodes
    ld = json.dumps(g, ensure_ascii=False)
    h = h[:m.start(1)] + ld + h[m.end(1):]
    # contenu
    crumb = ('<ol class="crumb" aria-label="Fil d\'Ariane"><li><a href="/">Accueil</a></li><li><a href="/prix-immobilier-cote-d-or/">Prix immobilier</a></li>'
             '<li aria-current="page">Prix immobilier à %s</li></ol>' % html.escape(N))
    toc = ''.join('<li><a href="#%s">%s</a></li>' % (i, html.escape(t)) for i, t, _ in P['sections']) + '<li><a href="#questions">Questions fréquentes</a></li>'
    body = ''.join('\n        <h2 id="%s">%s</h2>\n        %s\n' % (i, html.escape(t), b) for i, t, b in P['sections'])
    faq = ''.join('<details><summary>%s</summary><div class="a"><p>%s</p></div></details>' % (html.escape(qq), a) for qq, a in P['faq'])
    side = ''.join('<a class="link" href="/prix-immobilier-%s/">Prix immobilier à %s</a>' % (s, html.escape(n)) for s, n in P['voisins'])
    side += '<a class="link" href="/prix-immobilier-cote-d-or/">Toutes les communes</a>'
    main = f'''<main id="main">
{MARQUE}
<section class="route" id="r-prix">
  <div class="page-head shell">
    {crumb}
    <div class="art-head">
      <div>
        <p class="label">Prix immobilier</p>
        <h1 class="display d-xl" style="margin-top:14px;max-width:18ch;">Prix immobilier à {html.escape(N)} : <em>les vraies ventes.</em></h1>
        <p class="lede">{S['n']} ventes de logements signées chez le notaire entre {S['a0']} et {S['a1']} à {html.escape(N)}. Ce qu'elles disent des prix, rue par rue et année par année, et comment savoir ce que vaut votre bien.</p>
        <div class="byline"><span>Par Shawez Ali</span><span>Mis à jour le {DATE_FR}</span><span>Source : DVF (notaires, {S['a0']}-{S['a1']})</span></div>
      </div>
      <div class="frame"><span class="c"></span><img src="/assets/shawez-ali-hotel-commerce-dijon.webp" alt="Shawez Ali, agent immobilier en Côte-d'Or" width="720" height="900" fetchpriority="high" decoding="async"></div>
    </div>
  </div>
  <div class="shell sec-mid">
    <div class="art-grid">
      <div class="article">
        <details class="toc"><summary>Sommaire</summary><ol>{toc}</ol></details>
        <p>{P['intro']}</p>
{body}
        <h2 id="questions">Questions fréquentes</h2>
        <div class="faq" style="max-width:760px;">{faq}</div>

        <p style="font-size:.9rem;color:var(--muted)">Source : Demandes de valeurs foncières géolocalisées (Etalab, DGFiP), {S['n']} ventes à {html.escape(N)} de {S['a0']} à {S['a1']} (données arrêtées au {S['derniere_fr']}), licence ouverte. Ventes d'un seul logement, hors ventes atypiques (moins de 9 m², prix au m² anormal). Calcul de Shawez Ali le {DATE_FR}.</p>
        <div class="btn-row" style="margin-top:32px;"><a class="btn btn-primary btn-lg" href="/estimer/">Estimation offerte</a><a class="btn" href="tel:+33767579228">Appeler Shawez</a></div>
      </div>
      <aside class="art-side">
        <div data-reel="v13" aria-label="Une vidéo de Shawez Ali"></div>
        <div class="card"><h3>Communes voisines</h3>{side}</div>
      </aside>
    </div>
  </div>
</section>
</main>'''
    h, k = re.subn(r'<main id="main">.*?</main>', lambda mm: main, h, count=1, flags=re.S)
    assert k == 1
    out = os.path.join(ROOT, path.strip('/'), 'index.html')
    os.makedirs(os.path.dirname(out), exist_ok=True)
    from search_reponses import appliquer
    h = appliquer(h, path, ROOT)
    if N not in ZONE_GOOGLE:
        h = h.replace('Estimation chez vous, offerte', 'Contacter Shawez à Dijon')
    open(out, 'w', encoding='utf-8').write(h)
    return path


def maj_hub(pages):
    """Refait le tableau de /prix-immobilier-cote-d-or/ avec toutes les communes qui ont une page prix."""
    f = os.path.join(ROOT, 'prix-immobilier-cote-d-or', 'index.html')
    s = open(f, encoding='utf-8').read()
    def cell(S, t):
        # même règle que la page de la commune : 10 ventes pour les pages de ce script, 8 pour les pages plus anciennes (leur règle d'origine)
        f_ = os.path.join(ROOT, 'prix-immobilier-%s' % S['slug'], 'index.html')
        mini = MIN_TYPE if MARQUE in open(f_, encoding='utf-8').read() else 8
        return ('%s €/m²' % e(S[t]['pm2'])) if S[t] and S[t]['n'] >= mini else '—'
    rows = ''.join('<tr><td><a href="/prix-immobilier-%s/">%s</a></td><td>%d</td><td>%s</td><td>%s</td></tr>'
                   % (S['slug'], html.escape(S['nom']), S['n'], cell(S, 'app'), cell(S, 'mai')) for S in pages)
    tab = ('<table><thead><tr><th>Commune</th><th>Ventes %d-%d</th><th>Appartements (médiane)</th><th>Maisons (médiane)</th></tr></thead><tbody>%s</tbody></table>'
           % (pages[0]['a0'], pages[0]['a1'], rows))
    s2, k = re.subn(r'(<h2 id="le-tableau">[^<]*</h2>\s*)<table>.*?</table>', lambda m: m.group(1) + tab, s, count=1, flags=re.S)
    assert k == 1
    nb = len(pages)
    s2 = re.sub(r'Le prix au m² des ventes réellement signées dans \d+ communes (autour de Dijon|de Côte-d\'Or)[^<]*',
                'Le prix au m² des ventes réellement signées dans %d communes de Côte-d\'Or, de Dijon Métropole à Beaune, Montbard et Châtillon-sur-Seine.' % nb, s2)
    s2 = s2.replace('<h1 class="display d-xl" style="margin-top:14px;max-width:18ch;">Prix immobilier autour de Dijon : <em>commune par commune.</em></h1>',
                    '<h1 class="display d-xl" style="margin-top:14px;max-width:18ch;">Prix immobilier en Côte-d\'Or : <em>commune par commune.</em></h1>')
    s2 = s2.replace('<p>Cliquez sur une commune pour voir le détail : appartements, maisons, fourchette de prix et évolution depuis 2023.</p>',
                    '<p>Cliquez sur une commune pour voir le détail : appartements, maisons, fourchette de prix et évolution depuis 2023. '
                    'Seules les communes avec au moins %d ventes de logements sur la période ont une page : en dessous, un prix médian ne veut pas dire grand-chose.</p>' % SEUIL)
    s2 = s2.replace('<h2 id="dijon-et-les-autres">Dijon, Beaune, Fontaine-lès-Dijon, Nuits-Saint-Georges</h2>', '<h2 id="dijon-et-les-autres">Dijon et les pages ville</h2>')
    s2 = s2.replace('<li><a href="#dijon-et-les-autres">Dijon, Beaune, Fontaine-lès-Dijon, Nuits-Saint-Georges</a></li>', '<li><a href="#dijon-et-les-autres">Dijon et les pages ville</a></li>')
    s2 = re.sub(r'<p>Ces villes ont leur propre page : .*?</p>',
                '<p>Dijon a sa propre page : <a href="/prix-immobilier-dijon/">prix immobilier à Dijon</a>. Pour vendre, voir aussi '
                '<a href="/agent-immobilier-beaune/">agent immobilier à Beaune</a>, <a href="/immobilier-fontaine-les-dijon/">Fontaine-lès-Dijon</a> '
                'et <a href="/immobilier-nuits-saint-georges/">Nuits-Saint-Georges</a>.</p>', s2, count=1, flags=re.S)
    if s2 != s:
        s2 = re.sub(r'<span>Mis à jour le [^<]*</span>', '<span>Mis à jour le %s</span>' % DATE_FR, s2, count=1)
        s2 = re.sub(r'("@type": "WebPage", "@id": "https://shawez-immo.com/prix-immobilier-cote-d-or/#page".*?"dateModified": ")[^"]*', lambda m: m.group(1) + DATE, s2, count=1, flags=re.S)
        open(f, 'w', encoding='utf-8').write(s2)


MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--liste', action='store_true')
    ap.add_argument('--tout', action='store_true', help='réécrit aussi les pages prix déjà en ligne (déconseillé)')
    ap.add_argument('--commune', help='reconstruit une commune existante depuis son slug')
    ap.add_argument('--existantes', action='store_true', help='ne crée aucune nouvelle commune hors du périmètre publié')
    a = ap.parse_args()
    idx, ventes = charge()
    annees = idx['annees']
    dv = idx['derniere_vente']
    derniere_fr = '%d %s %s' % (int(dv[8:10]), MOIS[int(dv[5:7]) - 1], dv[:4])
    dep = {'app': st.median([v['pm2'] for v in ventes if not v['maison']]), 'mai': st.median([v['pm2'] for v in ventes if v['maison']])}
    par = {}
    for v in ventes:
        par.setdefault(v['commune'], []).append(v)
    retenues, ecartees = [], []
    for nom, lst in sorted(par.items(), key=lambda x: -len(x[1])):
        if nom == 'Dijon':
            continue
        S = analyse(nom, lst, dep, annees)
        S.update(a0=annees[0], a1=annees[-1], derniere_fr=derniere_fr)
        if S['n'] >= SEUIL and S[S['dominant']]['n'] >= SEUIL_TYPE_DOMINANT:
            retenues.append(S)
        else:
            ecartees.append(S)
    existantes = {d[len('prix-immobilier-'):] for d in os.listdir(ROOT) if d.startswith('prix-immobilier-') and os.path.isfile(os.path.join(ROOT, d, 'index.html'))}
    if 'neuilly-les-dijon' in existantes:
        existantes.add('neuilly-crimolois')
    if a.liste:
        for S in retenues:
            print('%-4d %-28s %s' % (S['n'], S['nom'], 'existe' if S['slug'] in existantes else 'NOUVELLE'))
        print('--- écartées (moins de %d ventes) : %d communes' % (SEUIL, len(ecartees)))
        return
    # annonces actives par commune
    ann = json.load(open(os.path.join(ROOT, 'annonces.json'), encoding='utf-8')).get('annonces', {})
    par_c = {}
    for x in ann.values():
        if x.get('status') in ACTIFS and x.get('commune') and os.path.isfile(os.path.join(ROOT, chemin_fiche(x).strip('/'), 'index.html')):
            t = '%s%s%s' % (x.get('type') or 'Bien', (', %s' % x['compo_agence']) if x.get('compo_agence') else '', (', %s €' % ent(float(x['prix']), 1)) if x.get('prix') else '')
            par_c.setdefault(slug(x['commune']), []).append((chemin_fiche(x), t))
    tpl = open(GABARIT, encoding='utf-8').read()
    for S in retenues:
        if a.commune and S['slug'] != a.commune.replace('neuilly-les-dijon', 'neuilly-crimolois'):
            continue
        if a.existantes and S['slug'] not in existantes:
            continue
        noms_voisins = json.load(open(os.path.join(ROOT, 'outils/seo/communes-voisines.json'), encoding='utf-8'))['communes'].get(S['nom'], [])
        voisins = [(slug(n), n) for n in noms_voisins if slug(n) in existantes or n == 'Dijon']
        f = os.path.join(ROOT, 'prix-immobilier-%s' % S['slug'], 'index.html')
        if S['slug'] in existantes and not (a.tout or a.commune) and MARQUE not in open(f, encoding='utf-8').read():
            continue
        P = page(S, voisins, par_c.get(S['slug'], []), annees)
        print('ok', ecrire(S, P, tpl), len(P['title']), len(P['desc']))
    if not a.commune:
        maj_hub(retenues)
    from search_local import redirection_neuilly
    redirection_neuilly(Path(ROOT))


if __name__ == '__main__':
    main()

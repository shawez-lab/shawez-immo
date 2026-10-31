#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Illustre les articles : une photo qui correspond au sujet, une vidéo, et les hreflang.

Avant : 8 photos remplissaient 196 emplacements, 349 articles sur 426 partageaient la
même og:image, 416 n'avaient aucune vidéo et 256 aucun hreflang.

Ce script rapproche chaque article d'une photo et d'une vidéo par le sens — mots du
titre, du h1, du slug et des premiers paragraphes — puis :
  • remplace la photo d'en-tête (et l'og:image, la twitter:image, l'image de l'Article
    dans les données structurées) par celle qui correspond, avec un alt rédigé ;
  • insère dans le corps de l'article un bloc vidéo avec son poster, sa légende et le
    VideoObject correspondant ;
  • écrit les balises hreflang fr-FR / en / nl et le x-default.

Il est fait pour être relancé : chaque bloc posé est délimité par un commentaire, donc
un nouvel article reçoit son illustration sans toucher aux autres.

    python3 outils/seo/illustrer.py             # écrit
    python3 outils/seo/illustrer.py --blanc     # n'écrit rien, affiche le bilan
    python3 outils/seo/illustrer.py --rapport   # bilan détaillé article par article

Ensuite : python3 outils/seo/sitemap_videos.py && python3 outils/seo/sitemap_maj.py
"""
import argparse, collections, glob, html, json, os, re, struct, subprocess, sys, unicodedata

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from illustrer_donnees import (ASSETS, SUJETS, BIENS_PHOTOS, BIEN_COMMUNE, VIDEOS,
                               VIDEOS_BIENS, COMMUNES, ECARTEES_BIENS, ECARTEES_ASSETS,
                               AVEC_SHAWEZ)

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SITE = 'https://shawez-immo.com'
MAX_PHOTO = 15         # la banque a été réduite aux belles photos : on accepte 15
VISE_PHOTO = 4         # au-delà de 4, la photo devient coûteuse
MAX_VIDEO = 15         # jamais plus de 15 articles sur la même vidéo
VISE_VIDEO = 8
SEUIL = 4.0            # en dessous, aucune photo ne colle vraiment

# vidéos de conseil face caméra, entièrement parlées en français
PAROLE = {'v6', 'v10', 'v14', 'v20', 'v32', 'v36'}

MARQ_V0, MARQ_V1 = '<!--illu-video-->', '<!--/illu-video-->'
MARQ_H0, MARQ_H1 = '<!--illu-hreflang-->', '<!--/illu-hreflang-->'

LANGUE = {'fr': 'fr-FR', 'en': 'en', 'nl': 'nl'}
LIEU = {'fr': ' à %s', 'en': ' in %s', 'nl': ' in %s'}

# mots équivalents en anglais et en néerlandais, pour que le rapprochement
# fonctionne aussi sur les 131 articles EN et les 15 articles NL
ALIAS = {
 'appartement': 'apartment apartments flat flats appartement',
 'maison': 'house houses home homes huis woning woningen',
 'chateau': 'chateau castle kasteel',
 'commerce': 'business businesses commercial trade handelszaak',
 'boutique': 'shop shops boutique winkel',
 'restaurant': 'restaurant restaurants',
 'hotel': 'hotel hotels',
 'fonds-de-commerce': 'goodwill business-transfer handelsfonds',
 'murs': 'premises freehold',
 'bail': 'lease leases tenancy huurcontract',
 'clientele': 'customers clientele klanten',
 'exploitant': 'operator uitbater',
 'vitrine': 'shopfront etalage',
 'licence': 'licence license vergunning',
 'hygiene': 'hygiene',
 'reprise': 'takeover overname',
 'jardin': 'garden gardens tuin',
 'terrasse': 'terrace terras',
 'balcon': 'balcony balconies balkon',
 'loggia': 'loggia',
 'cave': 'cellar cellars kelder',
 'cellier': 'storeroom',
 'vin': 'wine wijn',
 'vigne': 'vine vines vineyard vineyards wijngaard',
 'cuisine': 'kitchen kitchens keuken',
 'chambre': 'bedroom bedrooms slaapkamer',
 'salon': 'living lounge woonkamer',
 'sejour': 'living lounge woonkamer',
 'salle-a-manger': 'dining eetkamer',
 'studio': 'studio',
 'immeuble': 'building buildings block gebouw',
 'copropriete': 'copropriete condominium condo syndic vve',
 'charge': 'charges kosten lasten',
 'partie-commune': 'communal common gemeenschappelijke',
 'residence': 'residence residentie',
 'collectif': 'communal collective',
 'terrain': 'plot plots land parcel perceel grond',
 'parcelle': 'plot parcel perceel',
 'lotissement': 'development estate verkaveling',
 'cadastre': 'cadastre',
 'bornage': 'boundary boundaries',
 'urbanisme': 'planning bestemmingsplan',
 'viabilise': 'serviced utilities nutsvoorzieningen',
 'reseau': 'mains connection connections',
 'branchement': 'connection connections aansluiting',
 'village': 'village villages dorp',
 'commune': 'town commune gemeente',
 'bourg': 'village',
 'hameau': 'hamlet',
 'campagne': 'countryside rural platteland',
 'rural': 'rural countryside platteland',
 'prix': 'price prices pricing prijs prijzen',
 'estimation': 'valuation valuations estimate waardebepaling',
 'marche': 'market markets markt',
 'comparable': 'comparable comparables',
 'chiffre': 'figures numbers cijfers',
 'budget': 'budget budgets',
 'valeur': 'value worth waarde',
 'offre': 'offer offers bod',
 'negociation': 'negotiation negotiating onderhandeling',
 'acheteur': 'buyer buyers koper kopers',
 'achat': 'buying purchase purchases aankoop kopen',
 'vendre': 'sell selling verkopen',
 'vente': 'sale sales selling verkoop',
 'vendu': 'sold verkocht',
 'mandat': 'mandate instruction opdracht',
 'honoraires': 'fees fee honoraria',
 'mise-en-vente': 'listing marketing',
 'location': 'rent renting rental letting lettings huur verhuur',
 'locataire': 'tenant tenants huurder',
 'loyer': 'rent rents huur',
 'meuble': 'furnished gemeubileerd',
 'courte-duree': 'short-stay holiday-rental vakantiewoning weekendhuis weekendwoning',
 'tourisme': 'tourist holiday toerisme vakantie',
 'etudiant': 'student students studenten',
 'famille': 'family families gezin familie',
 'enfant': 'child children kinderen',
 'ecole': 'school schools scholen',
 'video': 'video videos film films filming',
 'film': 'film films filming footage',
 'tournage': 'shoot shooting filming opname',
 'sequence': 'sequence shot shots',
 'plan': 'shot shots plan plans',
 'coulisse': 'behind-the-scenes',
 'photo': 'photo photos photograph photographs photography foto',
 'image': 'image images beeld',
 'annonce': 'listing listings advert advertisement advertentie advertenties',
 'portail': 'portal portals',
 'diffusion': 'marketing distribution',
 'internet': 'online internet',
 'travaux': 'works repairs renovation verbouwing werken',
 'renover': 'renovate renovating renovation refurbish',
 'chantier': 'site works bouwplaats',
 'devis': 'quote quotes estimate offerte',
 'etat': 'condition staat',
 'rafraichir': 'dated refresh update opfrissen',
 'succession': 'inheritance inherited probate erfenis nalatenschap',
 'heritage': 'inheritance inherited probate erfenis',
 'patrimoine': 'heritage listed historic erfgoed',
 'historique': 'historic historical historisch',
 'ancien': 'old older period oude',
 'pierre': 'stone steen stenen',
 'poutre': 'beam beams balk balken',
 'charpente': 'roof-frame timber dakconstructie',
 'combles': 'attic loft roof zolder',
 'grenier': 'attic zolder',
 'mansarde': 'attic mansard',
 'toit': 'roof roofs dak daken',
 'toiture': 'roof roofing dak',
 'dernier-etage': 'top-floor',
 'cheminee': 'fireplace chimney schouw',
 'poele': 'stove wood-burner houtkachel kachel',
 'chauffage': 'heating verwarming',
 'dossier': 'file dossier paperwork stukken',
 'document': 'document documents paperwork stukken',
 'preparer': 'prepare preparing voorbereiden',
 'verifier': 'check checks verify controleren nakijken',
 'question': 'question questions vraag vragen',
 'erreur': 'mistake mistakes fout fouten',
 'conseil': 'advice guide tips advies',
 'garage': 'garage garages',
 'box': 'box',
 'stationnement': 'parking parkeren parkeerplaats',
 'parking': 'parking parkeerplaats',
 'voiture': 'car cars auto wagen',
 'velo': 'bike bikes bicycle fiets fietsen fietsenberging',
 'piscine': 'pool swimming zwembad',
 'vue': 'view views uitzicht',
 'degage': 'open unobstructed',
 'panorama': 'panorama view',
 'etage': 'floor storey verdieping',
 'piece': 'room rooms kamer kamers',
 'surface': 'size square-metres oppervlakte',
 'volume': 'volume space ruimte',
 'hauteur': 'height hoogte',
 'amenagement': 'layout fit-out indeling',
 'rangement': 'storage berging',
 'placard': 'cupboard closet kast',
 'dressing': 'dressing walk-in kleedkamer',
 'escalier': 'stairs staircase trap',
 'couloir': 'hallway corridor gang',
 'entree': 'entrance hall hal',
 'circulation': 'circulation flow',
 'distribution': 'layout',
 'cour': 'courtyard binnenplaats koer',
 'courette': 'courtyard',
 'portail': 'gate gates poort',
 'haie': 'hedge hedges haag hagen',
 'arbre': 'tree trees boom bomen',
 'verger': 'orchard boomgaard',
 'entretien': 'maintenance upkeep onderhoud',
 'saison': 'season seasonal seizoen',
 'ete': 'summer zomer',
 'exterieur': 'outdoor outside outdoors buiten',
 'facade': 'facade front gevel',
 'rue': 'street streets straat',
 'perron': 'steps',
 'mitoyen': 'semi-detached terraced party-wall geschakeld',
 'pavillon': 'detached-house',
 'contemporaine': 'contemporary modern eigentijds',
 'recente': 'recent newer modern',
 'neuf': 'new-build newbuild off-plan vefa nieuwbouw',
 'vefa': 'off-plan vefa nieuwbouw',
 'programme': 'development scheme project',
 'design': 'design',
 'decoration': 'decoration styling staging inrichting',
 'home-staging': 'staging styling',
 'mobilier': 'furniture meubilair meubels',
 'equipement': 'equipment appliances apparatuur uitrusting',
 'lumiere': 'light daylight licht',
 'son': 'sound noise geluid',
 'salle-de-bain': 'bathroom bathrooms badkamer',
 'salle-d-eau': 'shower-room bathroom douche',
 'douche': 'shower douche',
 'bain': 'bath bathtub bad',
 'sanitaire': 'bathroom toilet sanitair',
 'wc': 'toilet wc',
 'buanderie': 'utility-room wasruimte',
 'lave-linge': 'washing-machine wasmachine',
 'eau': 'water',
 'parquet': 'parquet floorboards parket',
 'sol': 'floor floors flooring vloer',
 'carrelage': 'tiles tiled tegels',
 'colombage': 'timber-framed half-timbered vakwerk',
 'tourelle': 'turret',
 'galerie': 'gallery galerij',
 'dependance': 'outbuilding outbuildings annexe bijgebouw',
 'annexe': 'annexe outbuilding bijgebouw',
 'grange': 'barn schuur',
 'ferme': 'farm farmhouse boerderij',
 'friche': 'overgrown',
 'plateau': 'shell open-space',
 'brut': 'bare shell',
 'acces': 'access right-of-way toegang',
 'passage': 'access right-of-way doorgang',
 'limite': 'boundary boundaries grens',
 'perimetre': 'perimeter scope',
 'hectare': 'hectare hectares acres',
 'aerien': 'aerial drone luchtfoto',
 'drone': 'drone aerial',
 'investissement': 'investment investing belegging',
 'rendement': 'yield return rendement',
 'locatif': 'rental letting verhuur',
 'agence': 'agency agent makelaar',
 'agent': 'agent agency makelaar',
 'telephone': 'phone call telefoon',
 'contact': 'contact',
 'appel': 'call calls',
 'visite': 'viewing viewings visit tour bezichtiging',
 'rendez-vous': 'appointment meeting afspraak',
 'reunion': 'meeting vergadering',
 'distance': 'remote distance afstand',
 'trajet': 'journey route rit',
 'kilometre': 'kilometres miles',
 'deplacement': 'travel travelling reizen',
 'quartier': 'area areas district neighbourhood wijk buurt',
 'secteur': 'area areas district sector',
 'centre': 'centre center centrum',
 'ville': 'town city stad',
 'dijon': 'dijon',
 'beaune': 'beaune',
 'bourgogne': 'burgundy bourgogne bourgondie',
 'chevigny': 'chevigny',
 'chenove': 'chenove',
 'petite-surface': 'small studio',
 'rez-de-jardin': 'garden-level ground-floor gelijkvloers',
 'plain-pied': 'single-storey ground-level gelijkvloers',
 'libre': 'vacant empty vrij',
 'vide': 'empty unfurnished leeg',
 'calme': 'quiet calm rustig',
 'nuit': 'night nacht',
 'origine': 'original origineel',
 'moderne': 'modern',
 'familial': 'family gezin',
 'prestige': 'prestige luxury',
 'demeure': 'manor residence landhuis',
 'domaine': 'estate grounds domein',
 'parc': 'park grounds park',
 'aile': 'wing wings vleugel',
 'cachet': 'character charm karakter',
 'caractere': 'character charm karakter',
 'atypique': 'unusual unconventional bijzonder',
 'loft': 'loft',
 'duplex': 'duplex maisonette',
 'mezzanine': 'mezzanine',
 'kitchenette': 'kitchenette',
 'jacuzzi': 'jacuzzi whirlpool hot-tub bubbelbad',
 'verriere': 'glass-partition glaswand',
 'puits': 'well waterput',
 'bassin': 'pond vijver',
 'porte-cochere': 'carriage-entrance koetspoort',
 'professionnel': 'commercial professional',
 'comptes': 'accounts books boekhouding',
 'loisir': 'leisure',
 'detente': 'relax',
 'usage': 'use uses gebruik',
 'voisinage': 'neighbours neighbourhood buren',
 'arrivee': 'arrival aankomst',
 'accueil': 'welcome arrival onthaal',
 'recevoir': 'entertaining hosting ontvangen',
 'confort': 'comfort comfort',
 'structure': 'structure',
 'bois': 'wood timber hout',
 'feu': 'fire vuur',
 'signature': 'sign signing signed ondertekenen handtekening',
 'acte': 'deed deeds title akte',
 'notaire': 'notaire notary notaris',
 'contrat': 'contract contracts',
 'justificatif': 'proof evidence documents bewijs bewijsstukken',
 'banque': 'bank banking banks',
 'compte': 'account accounts rekening',
 'credit': 'credit loan mortgage lening krediet',
 'pret': 'loan mortgage lening',
 'financement': 'financing finance funding',
 'fiscal': 'tax taxes fiscal belasting fiscaal',
 'impot': 'tax taxes belasting',
 'taxe': 'tax taxes belasting',
 'assurance': 'insurance insuring insurer verzekering',
 'pouvoir': 'power powers authority volmacht',
 'procuration': 'power-of-attorney proxy volmacht',
 'traduction': 'translation translating translated vertaling',
 'apostille': 'apostille',
 'societe': 'company companies entity sci vennootschap',
 'inventaire': 'inventory inventaris',
 'attestation': 'certificate evidence attest',
 'certificat': 'certificate certificaat',
 'releve': 'statement statements',
 'bilan': 'accounts balance-sheet jaarrekening',
 'calcul': 'calculate calculation berekening',
 'tableau': 'table schedule tabel',
 'devise': 'currency exchange valuta',
 'etranger': 'abroad foreign overseas buitenland',
 'international': 'international',
 'organiser': 'organise organize plan organiseren',
 'joindre': 'reach contact bereiken',
 'liste': 'list lijst',
 'explication': 'explain explaining uitleg',
 'bureau': 'desk office kantoor',
 'acquereur': 'buyer buyers koper',
 'adresse': 'address adres',
 'localisation': 'location locating ligging',
 'gravelin': '',
 'fenetre': 'window windows raam ramen',
 'fleuriste': 'florist bloemist',
 'renovation': 'renovation renovating refurbishment verbouwing',
 'vendeur': 'seller sellers vendor verkoper',
}


# --------------------------------------------------------------------- outillage
def sansacc(s):
    return ''.join(c for c in unicodedata.normalize('NFD', s)
                   if unicodedata.category(c) != 'Mn')


def norm(s):
    """Minuscules, sans accents, tout séparateur devient un tiret."""
    s = sansacc(html.unescape(s)).lower()
    s = re.sub(r'[^a-z0-9]+', '-', s)
    return s.strip('-')


def mots(s):
    return [w for w in norm(s).split('-') if w]


def webp_dim(path):
    """Largeur et hauteur d'un .webp, sans dépendance extérieure."""
    try:
        with open(path, 'rb') as f:
            d = f.read(40)
        if d[:4] != b'RIFF' or d[8:12] != b'WEBP':
            return None
        tag = d[12:16]
        if tag == b'VP8 ':
            w, h = struct.unpack('<HH', d[26:30])
            return w & 0x3FFF, h & 0x3FFF
        if tag == b'VP8L':
            b0, b1, b2, b3 = d[21], d[22], d[23], d[24]
            w = 1 + (((b1 & 0x3F) << 8) | b0)
            h = 1 + (((b3 & 0xF) << 10) | (b2 << 2) | ((b1 & 0xC0) >> 6))
            return w, h
        if tag == b'VP8X':
            w = 1 + int.from_bytes(d[24:27], 'little')
            h = 1 + int.from_bytes(d[27:30], 'little')
            return w, h
    except Exception:
        pass
    return None


def iso_duree(s):
    return 'PT%dS' % int(s) if s < 60 else 'PT%dM%dS' % (int(s) // 60, int(s) % 60)


# ------------------------------------------------------------------- les articles
def articles():
    out = []
    for p in sorted(glob.glob(os.path.join(ROOT, 'conseils-vendeurs', '*', 'index.html'))):
        out.append(('fr', p))
    # les 78 pages de prix par commune : même gabarit, donc la même photo et la même
    # vidéo partout, et c'est elles qui remplissaient le sitemap vidéo de v13
    for p in sorted(glob.glob(os.path.join(ROOT, 'prix-immobilier-*', 'index.html'))):
        out.append(('fr', p))
    for p in sorted(glob.glob(os.path.join(ROOT, 'en', '*', 'index.html'))):
        if os.sep + 'guides' + os.sep not in p:
            out.append(('en', p))
    for p in sorted(glob.glob(os.path.join(ROOT, 'nl', '*', 'index.html'))):
        if os.sep + 'gidsen' + os.sep not in p:
            out.append(('nl', p))
    return out


def sans_balises(s):
    return re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', ' ', s))).strip()


class Article:
    def __init__(self, lang, path):
        self.lang, self.path = lang, path
        self.commune_page = os.path.basename(os.path.dirname(path)).startswith('prix-immobilier-')
        self.src = open(path, encoding='utf-8').read()
        self.url = '/' + os.path.relpath(path, ROOT).replace(os.sep, '/')[:-len('index.html')]
        self.slug = os.path.basename(os.path.dirname(path))
        i, j = self.src.find('<main'), self.src.find('</main>')
        self.body = self.src[i:j]
        # on lit l'article sans ce que ce script y a déjà posé : sinon la légende
        # d'une vidéo influencerait le choix de la photo au passage suivant
        self.net = re.sub(re.escape(MARQ_V0) + '.*?' + re.escape(MARQ_V1), '',
                          self.body, flags=re.S)
        self.propre = re.sub(r'<div (?:data-reel="[^"]*"|class="illu-reel")[^>]*>.*?</div>',
                             '', self.net, flags=re.S)
        m = re.search(r'<h1[^>]*>(.*?)</h1>', self.src, re.S)
        self.h1 = sans_balises(m.group(1)) if m else ''
        m = re.search(r'<title>(.*?)</title>', self.src, re.S)
        self.title = sans_balises(m.group(1)) if m else ''
        m = re.search(r'<p class="lede">(.*?)</p>', self.propre, re.S)
        self.lede = sans_balises(m.group(1)) if m else ''
        k = self.propre.find('class="article"')
        self.debut = sans_balises(self.propre[k:k + 2600]) if k >= 0 else ''
        # zones de recherche et leur poids
        self.zones = [(norm(self.slug), 4.0), (norm(self.h1), 4.0), (norm(self.title), 2.5),
                      (norm(self.lede), 2.0), (norm(self.debut), 1.0)]
        self.zmots = [(set(z.split('-')), w) for z, w in self.zones]
        tete = norm(self.slug) + '-' + norm(self.h1) + '-' + norm(self.title) + '-' + norm(self.lede)
        self.tete = tete
        self.commune = None
        for c in COMMUNES:
            if ('-' + c + '-') in ('-' + tete + '-'):
                if self.commune is None or len(c) > len(self.commune):
                    self.commune = c
        m = re.search(r'<div class="frame"><span class="c"></span><img[^>]*src="([^"]+)"', self.net)
        self.photo_actuelle = m.group(1) if m else ''
        # les photos passe-partout ne peuvent pas rester : ce sont elles le problème
        self.doit_changer = os.path.basename(self.photo_actuelle)[:-5] in (
            'shawez-ali-portrait-veste-verte', 'shawez-ali-portrait-sourire-720',
            'shawez-ali-portrait-costume-rose-800', 'ph-studio', 'ph-rose')
        # une vidéo posée à la main reste en place ; celles de ce script sont refaites.
        # sur les pages de prix, le data-reel du gabarit est au contraire à remplacer.
        self.reel_seulement = self.commune_page
        self.a_video = (not self.commune_page and
                        (('data-reel="' in self.net) or ('<video' in self.net)))
        if self.commune_page:
            self.doit_changer = True
        self.photo = None
        self.video = None

    def score_tags(self, tags):
        """Poids cumulé des mots-clés trouvés dans l'article."""
        tot = 0.0
        for t in tags:
            alias = ALIAS.get(t, '')
            variantes = [t] + [a for a in alias.split() if a]
            best = 0.0
            for v in variantes:
                for (z, w), (ms, _) in zip(self.zones, self.zmots):
                    if '-' in v:
                        if ('-' + v + '-') in ('-' + z + '-'):
                            best = max(best, w)
                    else:
                        for mot in ms:
                            if mot == v or (len(v) >= 4 and mot.startswith(v)):
                                best = max(best, w)
                                break
            tot += best
        return tot


# ------------------------------------------------------------ banque de photos
# une salle de bains, un WC ou un dressing n'illustrent un article que si l'article
# parle vraiment de cela : on leur demande un rapprochement franc
EXIGEANTS = {'salle-de-bain': 9.0, 'salle-de-bain-ancienne': 9.0, 'salle-eau-douche': 9.0,
             'wc': 12.0, 'buanderie': 9.0, 'jacuzzi': 8.0, 'decoration': 8.0,
             'dressing': 8.0, 'suite-dressing': 8.0, 'box-garage': 8.0, 'garage-amenage': 7.0,
             'chambre-meublee': 6.5, 'chambre-vide': 6.5, 'chambre-ancienne': 6.5,
             'chambre-enfant': 6.5, 'chambre-combles': 6.0, 'plan-lotissement': 7.0,
             'vue-toits': 6.0, 'kitchenette': 6.0, 'parquet-ancien': 6.0, 'verriere': 7.0,
             'garage': 7.0, 'wc': 12.0, 'couloir': 6.0}


class Photo:
    def __init__(self, src, og, desc, tags, commune, cle, mini=0.0):
        self.src, self.og, self.desc, self.tags = src, og, desc, tags
        self.commune, self.cle, self.mini = commune, cle, mini
        self.n = 0
        d = webp_dim(os.path.join(ROOT, src.lstrip('/')))
        self.w, self.h = d if d else (720, 900)


def banque_photos():
    out = []
    for f, desc, tags, com in ASSETS:
        p = '/assets/' + f
        if f[:-5] in ECARTEES_ASSETS:
            continue
        if not os.path.exists(os.path.join(ROOT, p.lstrip('/'))):
            continue
        ph = Photo(p, p, dict(zip(('fr', 'en', 'nl'), desc)), tags, com, f[:-5],
                   7.0 if 'chateau' in tags else 0.0)
        ph.shawez = f[:-5] in AVEC_SHAWEZ
        out.append(ph)
    for ref, num, sujet in BIENS_PHOTOS:
        if sujet not in SUJETS or (ref, num) in ECARTEES_BIENS:
            continue
        p640 = '/assets/biens/%s/%d-640.webp' % (ref, num)
        p1200 = '/assets/biens/%s/%d-1200.webp' % (ref, num)
        if not os.path.exists(os.path.join(ROOT, p640.lstrip('/'))):
            continue
        if not os.path.exists(os.path.join(ROOT, p1200.lstrip('/'))):
            p1200 = p640
        fr, en, nl, tags = SUJETS[sujet]
        com = BIEN_COMMUNE.get(ref)
        desc, muet = {}, {}
        for lg, tpl in (('fr', fr), ('en', en), ('nl', nl)):
            desc[lg] = tpl.format(l=(LIEU[lg] % com) if com else '')
            muet[lg] = tpl.format(l='')
        ph = Photo(p640, p1200, desc, list(tags), com, '%s-%d' % (ref, num),
                   max(EXIGEANTS.get(sujet, 0.0), 7.0 if 'chateau' in tags else 0.0))
        ph.muet = muet
        ph.shawez = False
        out.append(ph)
    return out


# ------------------------------------------------------------ banque de vidéos
class Video:
    def __init__(self, cle, src, poster, noms, legendes, tags, duree, w, h, commune=None):
        self.cle, self.src, self.poster = cle, src, poster
        self.noms, self.legendes, self.tags, self.duree = noms, legendes, tags, duree
        self.w, self.h, self.n, self.commune = w, h, 0, commune


def poster_pour(mp4, poster):
    """Fabrique le poster manquant à la seconde 1 (ffmpeg), en .webp."""
    a = os.path.join(ROOT, mp4.lstrip('/'))
    b = os.path.join(ROOT, poster.lstrip('/'))
    if os.path.exists(b) or not os.path.exists(a):
        return os.path.exists(b)
    try:
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', '1', '-i', a,
                        '-frames:v', '1', '-c:v', 'libwebp', '-q:v', '80', b],
                       check=True, timeout=120)
        print('poster créé :', poster)
        return True
    except Exception as e:
        print('poster impossible pour', mp4, e)
        return False


def banque_videos():
    out = []
    for cle, nfr, nen, nnl, lfr, len_, lnl, tags, d in VIDEOS:
        src, poster = '/%s.mp4' % cle, '/%s-poster.webp' % cle
        if not os.path.exists(os.path.join(ROOT, src.lstrip('/'))):
            continue
        if not poster_pour(src, poster):
            continue
        dim = webp_dim(os.path.join(ROOT, poster.lstrip('/'))) or (640, 1136)
        com = None
        for t, nom in (('chevigny', 'Chevigny-Saint-Sauveur'), ('beaune', 'Beaune'), ('dijon', 'Dijon')):
            if t in tags:
                com = nom
                break
        v = Video(cle, src, poster, {'fr': nfr, 'en': nen, 'nl': nnl},
                  {'fr': lfr, 'en': len_, 'nl': lnl}, list(tags), d, dim[0], dim[1], com)
        v.parole = cle in PAROLE
        v.reel = True
        v.mini = 7.0 if 'chateau' in tags else 0.0
        out.append(v)
    for ref, tfr, ten, tnl, tags, d in VIDEOS_BIENS:
        src = '/assets/biens/%s/video.mp4' % ref
        poster = '/assets/biens/%s/video-poster.webp' % ref
        if not os.path.exists(os.path.join(ROOT, src.lstrip('/'))):
            continue
        if not poster_pour(src, poster):
            continue
        com = BIEN_COMMUNE.get(ref, '')
        noms = {'fr': 'Visite en vidéo : %s à %s' % (tfr, com),
                'en': 'Video tour: %s in %s' % (ten, com),
                'nl': 'Videobezichtiging: %s in %s' % (tnl, com)}
        leg = {'fr': "La visite en vidéo d'%s à %s." % (tfr, com),
               'en': 'A video tour of %s in %s.' % (ten, com),
               'nl': 'Een videobezichtiging van %s in %s.' % (tnl, com)}
        t = list(tags) + [norm(com)]
        dim = webp_dim(os.path.join(ROOT, poster.lstrip('/'))) or (720, 1280)
        v = Video('bien-' + ref, src, poster, noms, leg, t, d, dim[0], dim[1], com)
        v.reel = False
        v.mini = 7.0 if 'chateau' in t else 0.0
        out.append(v)
    return out


# ------------------------------------------------------------------ attribution
def commune_match(art, objet):
    """Une page de commune veut une image de cette commune, pas d'une autre."""
    if not objet.commune or not art.commune:
        return 0.0
    if norm(objet.commune) == art.commune:
        return 9.0 if art.commune not in ('dijon', 'beaune') else 4.0
    return -2.5


def attribuer(arts, objets, vise, maxi, seuil):
    """Attribution globale : les rapprochements les plus forts servis d'abord, la charge
    étalée par paliers pour qu'aucune image ne revienne trop souvent."""
    paires = []
    for a in arts:
        for o in objets:
            s = a.score_tags(o.tags) + commune_match(a, o)
            # un conseil filmé en français parle mal à un lecteur anglais ou néerlandais :
            # on lui préfère une visite, qui se regarde dans toutes les langues
            if a.lang != 'fr' and getattr(o, 'parole', False):
                s -= 5.0
            # une page de prix par commune parle de maisons et d'appartements vendus :
            # une visite de logement y a sa place, une boutique beaucoup moins
            # un article administratif n'a pas de sujet à photographier :
            # Shawez préfère s'y voir plutôt qu'un intérieur quelconque
            if getattr(o, 'shawez', False) and getattr(a, 'fam', '') == 'agent':
                s += 4.0
            if getattr(a, 'commune_page', False):
                t = set(o.tags)
                if t & {'maison', 'appartement', 'village', 'prix', 'vendre', 'studio'}:
                    s += 2.0
                if t & {'commerce', 'boutique', 'hotel', 'restaurant', 'fonds-de-commerce', 'murs'}:
                    s -= 5.0
            paires.append((s, a, o))
    paires.sort(key=lambda t: (-t[0], t[1].url, t[2].cle))
    reste = {a.url for a in arts}
    res = {}
    # on commence serré pour étaler la charge, puis on desserre palier par palier
    plafond = max(2, min(vise, maxi, -(-len(arts) // max(1, len(objets)))))
    while reste and plafond <= maxi:
        for s, a, o in paires:
            if a.url not in reste or o.n >= plafond:
                continue
            if s < max(seuil, getattr(o, 'mini', 0.0)):
                continue
            o.n += 1
            res[a.url] = (o, s)
            reste.discard(a.url)
        plafond += 1
    for a in arts:
        o, s = res.get(a.url, (None, 0.0))
        yield a, o, s


# familles : à défaut d'un rapprochement net, l'image doit au moins rester
# dans le bon registre — un lieu, un intérieur, un commerce ou l'agent au travail
FAM = {
 'lieu': {'village', 'commune', 'maison', 'pierre', 'campagne', 'rural', 'facade', 'cour',
          'jardin', 'terrain', 'hameau', 'bourg', 'rue', 'parcelle', 'ferme', 'immeuble',
          'aerien', 'terrasse', 'chateau', 'demeure', 'domaine', 'parc'},
 'interieur': {'sejour', 'salon', 'chambre', 'cuisine', 'couloir', 'entree', 'piece',
               'escalier', 'parquet', 'cheminee', 'studio', 'appartement', 'combles',
               'salle-a-manger', 'cave', 'meuble'},
 'commerce': {'commerce', 'fonds-de-commerce', 'boutique', 'hotel', 'restaurant', 'murs', 'local',
              'vitrine', 'bail', 'clientele', 'professionnel', 'exploitant'},
 'agent': {'agent', 'portrait', 'conseil', 'dossier', 'document', 'bureau', 'video',
           'tournage', 'agence', 'telephone', 'visite', 'prix', 'estimation'},
}


INTIME = {'salle-de-bain', 'salle-d-eau', 'douche', 'wc', 'bain', 'jacuzzi', 'buanderie',
          'lave-linge', 'chambre', 'sanitaire', 'dressing', 'garage', 'box', 'decoration'}
NEUTRE = {'sejour', 'salon', 'salle-a-manger', 'entree', 'couloir', 'escalier', 'parquet',
          'cheminee', 'cour', 'facade', 'immeuble', 'village', 'maison', 'jardin', 'terrasse',
          'piece', 'plateau', 'cave', 'charpente', 'agent', 'portrait', 'conseil', 'dossier',
          'document', 'bureau', 'agence', 'visite', 'prix', 'estimation', 'video', 'pierre'}


def familles_de(tags):
    t = set(tags)
    f = {k for k, mots_f in FAM.items() if t & mots_f} or {'agent'}
    if (t & NEUTRE) and not (t & INTIME):
        f.add('neutre')
    return f


# quand on bascule dans un registre, on s'autorise aussi le registre voisin
POOLS = {'lieu': ('lieu',), 'commerce': ('commerce', 'agent', 'neutre'),
         'interieur': ('interieur', 'neutre'), 'agent': ('agent', 'neutre')}


def famille_voulue(art):
    """Le registre attendu quand rien ne colle précisément."""
    if art.commune and art.commune not in ('dijon', 'beaune'):
        return 'lieu'
    if art.score_tags(['commerce', 'fonds-de-commerce', 'boutique', 'bail', 'murs', 'restaurant', 'hotel']) >= 6:
        return 'commerce'
    if art.score_tags(['appartement', 'copropriete', 'chambre', 'cuisine', 'piece', 'studio']) >= 6:
        return 'interieur'
    return 'agent'


# ----------------------------------------------------------------- modifications
COUPURES = set('le la les un une des du de d l et ou a au aux en dans sur pour par avec sans '
               'son sa ses leur leurs ce cet cette que qui quoi the a an and or of to in on for '
               'with your his her its their what which van de het een en of in op voor met uw'.split())


def alt_pour(art, photo):
    # on ne nomme pas une commune dans la légende si la page parle d'une autre
    desc = photo.desc[art.lang]
    if (getattr(photo, 'muet', None) and photo.commune and art.commune
            and norm(photo.commune) != art.commune):
        desc = photo.muet[art.lang]
    sujet = art.h1 or art.title
    sujet = re.sub(r'\s+', ' ', sujet).strip(' .')
    if len(sujet) > 64:
        court = sujet[:64].rsplit(' ', 1)[0]
        # on ne laisse pas la phrase pendre sur un mot vide
        while court and norm(court.rsplit(' ', 1)[-1]) in COUPURES:
            court = court.rsplit(' ', 1)[0]
        sujet = court.rstrip(' ,;:·—-') + '…'
    return desc + ' — ' + sujet


def pose_photo(s, art, photo):
    alt = html.escape(alt_pour(art, photo), quote=True)
    img = ('<img src="%s" alt="%s" width="%d" height="%d" fetchpriority="high" decoding="async">'
           % (photo.src, alt, photo.w, photo.h))
    s2, n = re.subn(r'(<div class="frame"><span class="c"></span>)<img\b[^>]*>',
                    lambda m: m.group(1) + img, s, count=1)
    if n != 1:
        return s, False
    abs_og = SITE + photo.og
    s2 = re.sub(r'(<meta property="og:image" content=")[^"]*(")', lambda m: m.group(1) + abs_og + m.group(2), s2, count=1)
    s2 = re.sub(r'(<meta name="twitter:image" content=")[^"]*(")', lambda m: m.group(1) + abs_og + m.group(2), s2, count=1)
    return s2, True


def bloc_video(art, video):
    leg = html.escape(video.legendes[art.lang], quote=False)
    nom = html.escape(video.noms[art.lang], quote=True)
    ratio = '%d/%d' % (video.w, video.h) if video.w and video.h else '9/16'
    return (MARQ_V0 +
            '<figure style="margin:28px 0;max-width:320px">'
            '<video controls playsinline preload="none" width="%d" height="%d" '
            'style="width:100%%;height:auto;aspect-ratio:%s;background:#171918;border-radius:12px" '
            'poster="%s" aria-label="%s">'
            '<source src="%s" type="video/mp4">'
            '<a href="%s">%s</a></video>'
            '<figcaption style="font-size:.9em;margin-top:10px">%s</figcaption></figure>'
            % (video.w, video.h, ratio, video.poster, nom, video.src, video.src, nom, leg) +
            MARQ_V1)


def point_insertion(s):
    """Après un bloc de texte du corps, de préférence au milieu d'une section
    plutôt que juste avant un titre, et jamais dans le sommaire."""
    k = s.find('class="article"')
    if k < 0:
        return -1
    fin = s.find('</main>')
    fin = len(s) if fin < 0 else fin
    zone = s[k:fin]
    dep = zone.find('</details>')
    dep = (dep + len('</details>')) if dep >= 0 else 0
    h2 = zone.find('<h2', dep)
    cands = []
    for m in re.finditer(r'</(?:p|ul|ol|table|blockquote)>', zone):
        p = m.end()
        if p <= dep:
            continue
        suite = zone[p:p + 400].lstrip()
        if suite.startswith('<div') or suite.startswith('</div') or not suite:
            continue          # fin de l'article : le bloc y serait orphelin
        milieu = suite.startswith(('<p', '<ul', '<ol', '<table', '<blockquote'))
        cands.append((p, milieu))
    if not cands:
        return -1
    for apres_titre in (True, False):
        for prefere_milieu in (True, False):
            for p, milieu in cands:
                if apres_titre and not (h2 >= 0 and p > h2):
                    continue
                if prefere_milieu and not milieu:
                    continue
                return k + p
    return -1


RE_SLOT = re.compile(r'<div (?:data-reel="[^"]*"|class="illu-reel")[^>]*>.*?</div>', re.S)


def pose_video(s, art, video):
    if art.commune_page:
        # le gabarit réserve un emplacement dans la colonne : on y met soit un reel du
        # catalogue, soit, pour une visite de bien, le même bloc que dans les articles
        if getattr(video, 'reel', False):
            neuf = ('<div data-reel="%s" aria-label="%s"></div>'
                    % (video.cle, html.escape(video.noms[art.lang], quote=True)))
        else:
            neuf = '<div class="illu-reel">%s</div>' % bloc_video(art, video)
        s2, n = RE_SLOT.subn(lambda m: neuf, s, count=1)
        if n == 1:
            return s2, True
        # pas d'emplacement dans la colonne : on pose le bloc dans le corps, comme ailleurs
    s = re.sub(re.escape(MARQ_V0) + '.*?' + re.escape(MARQ_V1), '', s, flags=re.S)
    i = point_insertion(s)
    if i < 0:
        return s, False
    return s[:i] + bloc_video(art, video) + s[i:], True


def pose_hreflang(s, art, familles):
    s = re.sub(r'\n?' + re.escape(MARQ_H0) + '.*?' + re.escape(MARQ_H1), '', s, flags=re.S)
    s = re.sub(r'[ \t]*<link rel="alternate" hreflang="[^"]*" href="[^"]*">\n?', '', s)
    fam = familles.get(art.url, {art.lang: art.url})
    liens = []
    for lg in ('fr', 'en', 'nl'):
        if lg in fam:
            liens.append('<link rel="alternate" hreflang="%s" href="%s%s">' % (LANGUE[lg], SITE, fam[lg]))
    defaut = fam.get('fr') or fam.get(art.lang) or art.url
    liens.append('<link rel="alternate" hreflang="x-default" href="%s%s">' % (SITE, defaut))
    bloc = MARQ_H0 + '\n' + '\n'.join(liens) + '\n' + MARQ_H1
    m = re.search(r'<link rel="canonical" href="[^"]*">', s)
    if not m:
        return s, False
    return s[:m.end()] + '\n' + bloc + s[m.end():], True


def pose_jsonld(s, art, photo, video):
    m = re.search(r'<script type="application/ld\+json">(.*?)</script>', s, re.S)
    if not m:
        return s, False
    try:
        d = json.loads(m.group(1))
    except Exception:
        return s, False
    noeuds = d.get('@graph', [d]) if isinstance(d, dict) else []
    art_node = next((n for n in noeuds if isinstance(n, dict) and n.get('@type') == 'Article'), None)
    if art_node is None:
        # certaines pages n'ont pas de nœud Article : la vidéo se rattache à la page
        art_node = next((n for n in noeuds if isinstance(n, dict)
                         and n.get('@type') == 'WebPage'), None)
        if art_node is None:
            return s, False
        photo = None      # l'image d'une WebPage n'a pas le même sens, on n'y touche pas
    if photo is not None:
        art_node['image'] = [SITE + photo.og]
    if video is not None:
        date = (art_node.get('datePublished') or art_node.get('dateModified') or '2026-10-31')[:10]
        art_node['video'] = {
            '@type': 'VideoObject',
            'name': video.noms[art.lang],
            'description': video.legendes[art.lang],
            'thumbnailUrl': [SITE + video.poster],
            'contentUrl': SITE + video.src,
            'uploadDate': date,
            'duration': iso_duree(video.duree),
            'inLanguage': LANGUE[art.lang],
            'author': {'@id': SITE + '/#shawez'},
        }
    neuf = json.dumps(d, ensure_ascii=False)
    return s[:m.start(1)] + neuf + s[m.end(1):], True


# ----------------------------------------------------------------- les familles
def familles_langues(arts):
    """Regroupe les versions d'un même article, uniquement sur des liens sûrs :
    les hreflang déjà posés et les identifiants de outils/seo/editorial_articles.json."""
    exist = {a.url for a in arts}
    parent = {a.url: a.url for a in arts}

    def find(x):
        while parent[x] != x:
            parent[x] = parent[parent[x]]
            x = parent[x]
        return x

    def union(a, b):
        ra, rb = find(a), find(b)
        if ra != rb:
            parent[ra] = rb

    for a in arts:
        for h in re.findall(r'<link rel="alternate" hreflang="[^"]*" href="([^"]+)"', a.src):
            t = h.replace(SITE, '')
            if t in exist and t != a.url:
                union(a.url, t)
    p = os.path.join(ROOT, 'outils', 'seo', 'editorial_articles.json')
    if os.path.exists(p):
        fam = collections.defaultdict(list)
        for x in json.load(open(p, encoding='utf-8')):
            if x.get('path') in exist:
                fam[re.sub(r'-(EN|FR|NL)$', '', x['id'])].append(x['path'])
        for v in fam.values():
            for o in v[1:]:
                union(v[0], o)
    lang = {a.url: a.lang for a in arts}
    grp = collections.defaultdict(dict)
    conflits = 0
    for a in arts:
        g = grp[find(a.url)]
        if a.lang in g:
            conflits += 1
            continue
        g[a.lang] = a.url
    return {a.url: grp[find(a.url)] for a in arts}, conflits


def rebalancer(arts, photos, plancher, charge, mini):
    """Fait servir les photos encore inutilisées en les prenant aux plus sollicitées."""
    bouges = 0
    for _ in range(plancher):
        sous = [o for o in photos if o.n < plancher]
        if not sous:
            break
        pool = [a for a in arts if a.photo is not None and a.photo.n > charge]
        if not pool:
            break
        notes = []
        for o in sous:
            for a in pool:
                notes.append((a.score_tags(o.tags) + commune_match(a, o), a, o))
        notes.sort(key=lambda t: (-t[0], t[1].url, t[2].cle))
        pris = set()
        for sc, a, o in notes:
            if sc < mini or a.url in pris or o.n >= plancher or a.photo.n <= charge:
                continue
            if a.photo is o:
                continue
            a.photo.n -= 1
            o.n += 1
            a.photo, a.photo_score = o, sc
            pris.add(a.url)
            bouges += 1
    return bouges


# ----------------------------------------------------------- poids des photos
def alleger(blanc):
    """Recompresse en webp qualité 82 les photos de biens au-dessus de 300 Ko.

    Une image déjà encodée à ce niveau ne gagne rien à être réencodée : elle y perd
    une génération de qualité pour le même poids. On ne remplace donc l'originale que
    si la recompression fait gagner au moins 8 %, et jamais si elle tombe sous 150 Ko
    avec une perte visible.
    """
    try:
        from PIL import Image
    except Exception:
        print('Pillow absent : recompression ignorée')
        return []
    import math
    faits = []
    for p in sorted(glob.glob(os.path.join(ROOT, 'assets', 'biens', '*', '*.webp'))):
        taille = os.path.getsize(p)
        if taille <= 300 * 1024:
            continue
        im = Image.open(p).convert('RGB')
        tmp = p + '.tmp'
        im.save(tmp, 'WEBP', quality=82, method=6)
        neuf = os.path.getsize(tmp)
        raison = ''
        garde = neuf <= taille * 0.92
        if not garde:
            raison = 'déjà à ce niveau de compression'
        if garde and neuf < 150 * 1024:
            b = Image.open(tmp).convert('RGB')
            if b.size != im.size:
                garde, raison = False, 'dimensions changées'
            else:
                pa, pb = im.resize((160, 160)).tobytes(), b.resize((160, 160)).tobytes()
                rms = math.sqrt(sum((x - y) ** 2 for x, y in zip(pa, pb)) / len(pa))
                if rms > 7.0:
                    garde, raison = False, 'perte visible sous 150 Ko'
        if garde and not blanc:
            os.replace(tmp, p)
        else:
            os.remove(tmp)
        faits.append((os.path.relpath(p, ROOT), taille, neuf, garde, raison))
    return faits


# ------------------------------------------------------------------------ main
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--blanc', action='store_true', help="n'écrit rien")
    ap.add_argument('--rapport', action='store_true', help='bilan article par article')
    ap.add_argument('--sans-poids', action='store_true', help='ne recompresse pas les photos de biens')
    a = ap.parse_args()

    arts = [Article(lg, p) for lg, p in articles()]
    photos, videos = banque_photos(), banque_videos()
    print('%d articles · %d photos · %d vidéos' % (len(arts), len(photos), len(videos)))

    familles, conflits = familles_langues(arts)
    if conflits:
        print('familles ambiguës ignorées :', conflits)

    for o in photos + videos:
        o.familles = familles_de(o.tags)
    for x in arts:
        x.fam = famille_voulue(x)

    # 1er tour : seuls les rapprochements nets sont retenus
    for art, ph, sc in attribuer(arts, photos, VISE_PHOTO, MAX_PHOTO, SEUIL):
        art.photo, art.photo_score = ph, sc
    # 2e tour : pour le reste, on reste au moins dans le bon registre
    repli = collections.defaultdict(list)
    for x in arts:
        if x.photo is None:
            repli[x.fam].append(x)
    for fam, lot in repli.items():
        pool = [p for p in photos if p.familles & set(POOLS[fam])] or photos
        for art, ph, sc in attribuer(lot, pool, VISE_PHOTO, MAX_PHOTO, -999.0):
            art.photo, art.photo_score = ph, sc
    # 3e tour : une page qui montrait encore la photo passe-partout doit changer
    obliges = [x for x in arts if x.photo is None and x.doit_changer]
    for art, ph, sc in attribuer(obliges, photos, VISE_PHOTO, MAX_PHOTO, -999.0):
        art.photo, art.photo_score = ph, sc
    # la banque est faite de belles photos : autant les faire toutes servir plutôt que
    # d'en saturer quatre. On déplace des articles des photos les plus sollicitées vers
    # celles qui ne servent pas encore, tant que le rapprochement reste défendable.
    deplaces = rebalancer(arts, photos, plancher=4, charge=6, mini=1.5)
    if deplaces:
        print('articles déplacés pour varier les photos :', deplaces)
    garde = sum(1 for x in arts if x.photo is None)
    replis = sum(len(v) for v in repli.values())

    # vidéos : seulement pour les pages qui n'en ont pas déjà une. Les pages de prix
    # passent devant : elles ne peuvent afficher que les 32 reels du catalogue, alors
    # que les articles ont aussi les visites filmées des biens.
    sans = [x for x in arts if not x.a_video]
    for lot in ([x for x in sans if x.commune_page], [x for x in sans if not x.commune_page]):
        for art, vd, sc in attribuer(lot, videos, VISE_VIDEO, MAX_VIDEO, SEUIL):
            art.video, art.video_score = vd, sc
    repliv = collections.defaultdict(list)
    for x in sans:
        if x.video is None:
            repliv[x.fam].append(x)
    for fam, lot in repliv.items():
        pool = [v for v in videos if v.familles & set(POOLS[fam])] or videos
        for art, vd, sc in attribuer(lot, pool, VISE_VIDEO, MAX_VIDEO, -999.0):
            art.video, art.video_score = vd, sc
    encore = [x for x in sans if x.video is None]
    for art, vd, sc in attribuer(encore, videos, VISE_VIDEO, MAX_VIDEO, -999.0):
        art.video, art.video_score = vd, sc

    # deux communes voisines ne doivent pas tomber sur la même vidéo
    echanges = 0
    comm = sorted([x for x in sans if x.commune and x.video], key=lambda x: (x.lang, x.commune))
    for i in range(1, len(comm)):
        p, c = comm[i - 1], comm[i]
        if p.lang != c.lang or p.commune == c.commune or p.video is not c.video:
            continue
        for v in sorted(videos, key=lambda v: -(c.score_tags(v.tags) + commune_match(c, v))):
            if v is not c.video and v.n < MAX_VIDEO and v is not p.video:
                if c.score_tags(v.tags) + commune_match(c, v) >= (c.video_score - 2.5):
                    c.video.n -= 1
                    v.n += 1
                    c.video = v
                    echanges += 1
                break
    if echanges:
        print('vidéos échangées entre communes voisines :', echanges)

    echph = 0
    comp = sorted([x for x in arts if x.commune and x.photo], key=lambda x: (x.lang, x.commune))
    for i in range(1, len(comp)):
        p_, c = comp[i - 1], comp[i]
        if p_.lang != c.lang or p_.commune == c.commune or p_.photo is not c.photo:
            continue
        for ph in sorted(photos, key=lambda ph: -(c.score_tags(ph.tags) + commune_match(c, ph))):
            if ph is c.photo or ph.n >= MAX_PHOTO or ph is p_.photo:
                continue
            if c.score_tags(ph.tags) + commune_match(c, ph) >= (c.photo_score - 2.5):
                c.photo.n -= 1
                ph.n += 1
                c.photo = ph
                echph += 1
            break
    if echph:
        print('photos échangées entre communes voisines :', echph)

    # écriture
    ecrits = casses = 0
    for art in arts:
        s = art.src
        if art.photo is not None:
            s, ok = pose_photo(s, art, art.photo)
            if not ok:
                print('photo impossible :', art.url)
                art.photo = None
        if art.video is not None:
            s, ok = pose_video(s, art, art.video)
            if not ok:
                print('vidéo impossible :', art.url)
                art.video = None
        s, ok = pose_jsonld(s, art, art.photo, art.video)
        if not ok:
            print('JSON-LD intouchable :', art.url)
        s, ok = pose_hreflang(s, art, familles)
        if not ok:
            print('hreflang impossible :', art.url)
        # garde-fous : la page doit rester entière
        for ctrl, nb in (('<h1', 1), ('<link rel="canonical"', 1), ('<title>', 1),
                         ('application/ld+json', 1)):
            if s.count(ctrl) != nb:
                print('PAGE CASSÉE, ignorée :', art.url, ctrl, s.count(ctrl))
                casses += 1
                s = None
                break
        if s is None:
            continue
        if s.count('<div') != art.src.count('<div') or s.count('</div>') != art.src.count('</div>'):
            print('PAGE CASSÉE (div), ignorée :', art.url)
            casses += 1
            continue
        if s != art.src:
            if not a.blanc:
                open(art.path, 'w', encoding='utf-8').write(s)
            ecrits += 1
        art.out = s

    # bilan
    usage_p = collections.Counter(x.photo.cle for x in arts if x.photo)
    usage_v = collections.Counter(x.video.cle for x in arts if x.video)
    print()
    print('pages réécrites        :', ecrits, '| cassées :', casses)
    print('photos distinctes      :', len(usage_p), '| max par photo :',
          max(usage_p.values()) if usage_p else 0)
    print('articles passés par un repli de registre :', replis, '| sans photo :', garde)
    print('vidéos distinctes      :', len(usage_v), '| max par vidéo :',
          max(usage_v.values()) if usage_v else 0)
    print('articles sans vidéo    :', sum(1 for x in arts if not x.a_video and not x.video))
    print('articles avec famille  :', sum(1 for x in arts if len(familles[x.url]) > 1))

    if not a.sans_poids:
        res = alleger(a.blanc)
        for rel, av, ap_, g, pq in res:
            print('poids %-38s %5.0f → %5.0f Ko  %s' % (rel, av / 1024, ap_ / 1024,
                                                        'recompressée' if g else 'originale gardée : ' + pq))
        print('photos de biens > 300 Ko : %d, recompressées : %d'
              % (len(res), sum(1 for x in res if x[3])))

    if a.rapport:
        print()
        for x in arts:
            print('%-4s %-58s | %-34s %4.1f | %-12s %4.1f' % (
                x.lang, x.slug[:58], (x.photo.cle if x.photo else '(inchangée)'),
                getattr(x, 'photo_score', 0), (x.video.cle if x.video else '(déjà)'),
                getattr(x, 'video_score', 0)))


if __name__ == '__main__':
    main()

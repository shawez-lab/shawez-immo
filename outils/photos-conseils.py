#!/usr/bin/env python3
"""Varie la photo d'en-tete des articles conseils-vendeurs.

259 des 280 articles affichaient la meme photo (shawez-ali-portrait-veste-verte).
Chaque article recoit desormais la photo la plus proche de son sujet, choisie parmi
les 26 photos en 720x900 : memes dimensions, donc aucun decalage de mise en page.
Le champ "image" des donnees structurees n'est PAS touche : c'est la photo de Shawez
pour le schema Person/Organization, elle doit rester la meme partout.
"""
import glob, io, re, sys, unicodedata, hashlib

PHOTOS = {
    'appartement-ancien-salon-lumineux': (['appartement','ancien','salon','sejour','charme'], "Salon lumineux d'un appartement ancien"),
    'appartement-centre-historique-dijon-salon': (['appartement','centre','historique','salon','hypercentre'], "Salon d'un appartement du centre historique de Dijon"),
    'appartement-centre-historique-dijon-sejour': (['appartement','sejour','centre','historique'], "Séjour d'un appartement du centre historique de Dijon"),
    'appartement-dijon-couloir-parquet': (['parquet','couloir','entree','renovation','travaux'], "Couloir en parquet d'un appartement à Dijon"),
    'appartement-dijon-cuisine-lumineuse': (['cuisine','equipee','appartement'], "Cuisine lumineuse d'un appartement à Dijon"),
    'appartement-sous-les-toits-chambre': (['combles','toit','chambre','mansarde','dernier-etage','grenier'], "Chambre sous les toits"),
    'chateau-facade-allee': (['chateau','demeure','prestige','facade','propriete'], "Façade d'un château et son allée"),
    'chateau-salon': (['chateau','salon','prestige','luxe'], "Salon d'un château"),
    'chateau-xixe-parc-topiaires': (['parc','chateau','domaine','hectare'], "Parc et topiaires d'un château du XIXe"),
    'dijon-eglise-saint-michel': (['dijon','quartier','ville','centre','secteur','marche','prix-m2'], "L'église Saint-Michel à Dijon"),
    'immeuble-ancien-angle-bourgogne': (['immeuble','locatif','investissement','rendement','copropriete','locataire','location','bail','loyer'], "Immeuble ancien d'angle en Bourgogne"),
    'loft-charpente-cuisine': (['loft','atelier','charpente','cuisine','atypique'], "Cuisine d'un loft sous charpente"),
    'loft-charpente-mezzanine': (['mezzanine','loft','volume','hauteur'], "Mezzanine d'un loft sous charpente"),
    'loft-poutres-lumiere': (['poutre','loft','atypique','caractere'], "Poutres et lumière dans un loft"),
    'maison-230m2-cuisine-ilot': (['cuisine','ilot','maison','familiale'], "Cuisine avec îlot central dans une maison"),
    'maison-230m2-dressing': (['dressing','rangement','chambre','placard'], "Dressing d'une maison"),
    'maison-pierre-terrasse-jardin': (['terrasse','jardin','exterieur','maison','veranda','saison','hiver','ete','pelouse','haie','cloture'], "Terrasse et jardin d'une maison en pierre"),
    'maison-pierre-volets-rouges-beaune': (['beaune','village','pierre','maison','campagne','rural','bourgogne'], "Maison en pierre aux volets rouges près de Beaune"),
    'maison-piscine-vue-aerienne': (['piscine','aerien','drone','vue','parcelle'], "Vue aérienne d'une maison avec piscine"),
    'shawez-ali-depart-visite-dijon': (['visite','rendez-vous','acquereur','acheteur','contre-visite'], "Shawez Ali partant en visite à Dijon"),
    'shawez-ali-hotel-commerce-dijon': (['commerce','fonds','hotel','local','bail','professionnel','restaurant','tabac','murs'], "Shawez Ali devant un hôtel commerce à Dijon"),
    'shawez-ali-studio-meuble-visite': (['studio','meuble','etudiant','petite-surface','t1'], "Shawez Ali dans un studio meublé"),
    'shawez-ali-terrain-maison-pierre': (['terrain','constructible','parcelle','lotissement','viabilise'], "Shawez Ali sur un terrain devant une maison en pierre"),
    'shawez-ali-verger-maison-pierre': (['verger','campagne','arbre','rural','nature','exterieur'], "Shawez Ali dans un verger devant une maison en pierre"),
    'shawez-ali-portrait-sourire-720': ([], "Shawez Ali, agent immobilier à Dijon"),
    'shawez-ali-portrait-veste-verte': ([], "Shawez Ali, agent immobilier à Dijon"),
}
GENERIQUES = ['shawez-ali-portrait-sourire-720', 'shawez-ali-depart-visite-dijon', 'dijon-eglise-saint-michel',
              'shawez-ali-portrait-veste-verte', 'immeuble-ancien-angle-bourgogne', 'maison-pierre-terrasse-jardin']
CIBLE = '/assets/shawez-ali-portrait-veste-verte.webp'
IMG = re.compile(r'<img\b[^>]*src="' + re.escape(CIBLE) + r'"[^>]*>')

def sansacc(s):
    return ''.join(c for c in unicodedata.normalize('NFD', s.lower()) if unicodedata.category(c) != 'Mn')

def candidats(slug):
    """Photos triees de la plus pertinente a la moins pertinente pour ce sujet."""
    s = '-' + sansacc(slug) + '-'
    h = int(hashlib.md5(slug.encode()).hexdigest(), 16)
    scores = []
    for nom, (mots, _) in PHOTOS.items():
        n = sum(1 for m in mots if m in s)
        # Le hash departage les ex aequo differemment pour chaque article
        scores.append((-n, (h + hash(nom)) % 997, nom))
    scores.sort()
    ordre = [nom for mn, _, nom in scores if -mn > 0]
    gen = [GENERIQUES[(h + i) % len(GENERIQUES)] for i in range(len(GENERIQUES))]
    return ordre, gen, bool(ordre)

def main(appliquer):
    pages = sorted(glob.glob('conseils-vendeurs/*/index.html'))
    # Aucune photo ne doit ecraser les autres : au-dela du plafond on passe a la suivante
    PLAFOND = 24
    compte, choix, sans = {}, {}, 0
    for p in pages:
        slug = p.split('/')[1]
        ordre, gen, pertinent = candidats(slug)
        if not pertinent:
            sans += 1
        retenu = None
        for nom in ordre + gen:
            if compte.get(nom, 0) < PLAFOND:
                retenu = nom
                break
        if retenu is None:
            retenu = min(PHOTOS, key=lambda n: compte.get(n, 0))
        compte[retenu] = compte.get(retenu, 0) + 1
        choix[p] = retenu
    import itertools
    print('--- 14 exemples ---')
    for p, ph in itertools.islice(sorted(choix.items()), 0, 280, 20):
        print(f'  {p.split(chr(47))[1][:52]:52} -> {ph}')
    print()
    changes = 0
    for p, photo in choix.items():
        html = io.open(p, encoding='utf-8').read()
        m = IMG.search(html)
        if not m or photo == 'shawez-ali-portrait-veste-verte':
            continue
        neuf = m.group(0).replace(CIBLE, f'/assets/{photo}.webp')
        neuf = re.sub(r'alt="[^"]*"', 'alt="' + PHOTOS[photo][1] + '"', neuf)
        if appliquer:
            io.open(p, 'w', encoding='utf-8').write(html[:m.start()] + neuf + html[m.end():])
        changes += 1
    print(f'{len(pages)} articles, {changes} photos remplacees, {sans} sans mot-cle reconnu')
    print(f'{len(compte)} photos differentes utilisees, maximum {max(compte.values())} fois la meme\n')
    for k, v in sorted(compte.items(), key=lambda x: -x[1]):
        print(f'  {v:>4}  {k}')

main(appliquer='--appliquer' in sys.argv)

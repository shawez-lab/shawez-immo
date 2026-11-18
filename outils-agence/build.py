"""Fabrique le site de l'agence GRAVELIN IMMO dans ../out à partir d'annonces.json (même source que shawez-immo.com).
    python3 src/build.py /chemin/vers/annonces.json
Aucune adresse de rue, aucun nom de propriétaire : les textes viennent des champs structurés et de la description expurgée."""
import html, json, os, re, shutil, sys, unicodedata, datetime

ICI = os.path.dirname(os.path.abspath(__file__))
OUT = os.environ.get('AGENCE_OUT') or os.path.join(os.path.dirname(ICI), 'out')
SITE = os.environ.get('SITE_DIR') or '/home/claude/site'
SRC_ANN = os.path.join(SITE, 'annonces.json')
IMG = '/annonces'      # photos des annonces, recopiées depuis le dépôt principal à chaque construction
TEL, TEL_LIEN = '03 45 34 35 31', '+33345343531'
MAIL = 'marion@gravelin-immo.com'
AVIS = {'note': '4,8', 'nombre': 141, 'date': '17 novembre 2026',
        'lien': 'https://www.google.com/maps/search/?api=1&query=Gravelin%20Immo%2030%20rue%20Bannelier%20Dijon'}
e = html.escape
HORAIRES = '<dl class="horaires"><dt>Lundi, mardi</dt><dd>9 h 30 à 18 h</dd><dt>Mercredi</dt><dd>Fermé</dd><dt>Jeudi, vendredi</dt><dd>9 h 30 à 18 h</dd><dt>Samedi, dimanche</dt><dd>Fermé</dd></dl>'
PRIX = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'prix.json'), encoding='utf-8'))
M = '/assets/m'
DISCUSSION = True   # à passer à True quand le projet Cloudflare de l'agence aura ses variables (liste d'exclusions, clé du modèle)
EQUIPE = [('marion-gravelin', 'Marion Gravelin', 'Fondatrice et dirigeante de l’agence', 'Marion a créé l’agence en 2016 et la dirige depuis. Elle est titulaire de la carte professionnelle et suit les ventes et les mises en location.'),
          ('shawez-ali', 'Shawez Ali', 'Agent commercial, Dijon', 'Shawez vend des appartements, des maisons, des immeubles et des commerces. Il reçoit ses clients en français, en anglais et dans six autres langues.'),
          ('bernard-gogneau', 'Bernard Gogneau', 'Agent commercial, Beaune', 'Bernard accompagne les vendeurs et les acheteurs à Beaune et dans les villages de la Côte.')]

def equipe_html():
    return '<div class="equipe">' + ''.join(
        f'<div class="membre"><img src="{M}/{f}.webp" alt="{e(n)}, {e(r.lower())}" loading="lazy" width="900" height="1125"><h3>{e(n)}</h3><p class="role">{e(r)}</p><p>{e(t)}</p></div>'
        for f, n, r, t in EQUIPE) + '</div>'

def formulaire(objet, bien='', bouton='Envoyer', message='Votre message'):
    return f'''<form class="form" data-envoi novalidate>
<input type="hidden" name="objet" value="{e(objet)}"><input type="hidden" name="bien" value="{e(bien)}">
<label class="champ"><span>Votre nom</span><input name="nom" autocomplete="name" required></label>
<label class="champ"><span>Téléphone</span><input name="telephone" type="tel" autocomplete="tel" inputmode="tel"></label>
<label class="champ large"><span>E-mail</span><input name="email" type="email" autocomplete="email"></label>
<label class="champ large"><span>{message}</span><textarea name="message" rows="4"></textarea></label>
<label class="piege" aria-hidden="true">Ne pas remplir<input name="website" tabindex="-1" autocomplete="off"></label>
<label class="accord"><input type="checkbox" name="consent" required><span>J’accepte que l’agence utilise ces informations pour me répondre. <a href="/confidentialite/">En savoir plus</a></span></label>
<button class="btn btn-plein large" type="submit">{bouton}</button>
<p class="form-etat" role="status" aria-live="polite"></p>
</form>'''

FAQ = [('Combien coûte une estimation ?', 'Rien. L’estimation est offerte et ne vous engage à rien. Vous recevez d’abord une fourchette calculée sur les ventes signées autour de chez vous, puis nous venons voir le bien pour l’affiner.'),
       ('Pourquoi un mandat exclusif ?', 'Parce qu’il nous permet d’investir dans votre bien : le film, les photos, la diffusion. Un seul interlocuteur, un seul prix affiché partout, et un compte rendu après chaque visite.'),
       ('Combien de temps faut-il pour vendre ?', 'Cela dépend surtout du prix de départ. Un bien affiché au prix du marché trouve en général son acheteur en quelques semaines. Il faut ensuite compter environ trois mois entre le compromis et l’acte chez le notaire.'),
       ('Quels diagnostics faut-il fournir ?', 'Le diagnostic de performance énergétique est obligatoire dès l’annonce. Selon le bien s’ajoutent l’amiante, le plomb, l’électricité, le gaz, les termites, l’état des risques et, en copropriété, le mesurage Carrez. Nous vous disons lesquels vous concernent.'),
       ('Qui paie les honoraires de l’agence ?', 'C’est indiqué sur chaque annonce et dans le mandat. Notre barème est public : vous le trouvez sur la page Honoraires et il est affiché à l’agence.'),
       ('Vous occupez-vous aussi des locations ?', 'Oui : recherche du locataire, étude de son dossier, rédaction du bail et état des lieux. Vous gardez ensuite la relation avec votre locataire.')]

def faq_html(titre='Les questions qu’on nous pose'):
    return (f'<section class="bloc"><div class="enveloppe deux"><div><h2>{titre}</h2></div><div class="questions">'
            + ''.join(f'<details><summary>{e(q)}</summary><p>{e(r)}</p></details>' for q, r in FAQ) + '</div></div></section>')

MUR = [('loop-chateau', 'film-chateau', 'Le château de Saint-Gervais-en-Vallière'), ('loop-loft', 'film-loft', ''), ('loop-spa', 'film-spa', ''),
       ('loop-8portes', 'film-8portes', ''), ('loop-republique', '', ''), ('loop-hotel', '', ''), ('loop-sauna', '', ''),
       ('loop-marrakech', '', ''), ('loop-republique2', '', ''), ('loop-saffron', '', '')]

def mur_html():
    fig = ''
    for loop, film, titre in MUR:
        fig += (f'<figure><video muted loop playsinline preload="none" poster="{M}/{loop}.webp" data-src="{M}/{loop}.mp4" aria-label="Visite filmée"></video>'
                + (f'<button type="button" data-film="{film}">Voir le film</button>' if film else '')
                + (f'<figcaption>{e(titre)}</figcaption>' if titre else '') + '</figure>')
    return f'<div class="mur" tabindex="0" aria-label="Visites filmées par l’agence">{fig}</div>'

CINEMA = '<div class="cinema" role="dialog" aria-modal="true" aria-label="Film du bien"><video controls playsinline></video><button type="button" aria-label="Fermer">×</button></div>'


def slug(s):
    s = unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[^a-z0-9]+', '-', s).strip('-')

def eur(n):
    return f"{int(round(n)):,}".replace(',', ' ') + ' €'

def nb(x):
    return (f"{x:.2f}".rstrip('0').rstrip('.')).replace('.', ',')

FAMILLE = {'Appartement': 'Appartement', 'Studio': 'Appartement', 'Duplex': 'Appartement', 'Loft': 'Appartement',
           'Maison': 'Maison', 'Propriété': 'Maison', 'Château': 'Maison', 'Viager': 'Maison',
           'Immeuble': 'Immeuble', 'Terrain': 'Terrain', 'Terrain à bâtir': 'Terrain'}

NOMS = {'527': 'Hôtel particulier'}   # le type saisi par l'agence est « Immeuble » ; l'annonce décrit un hôtel particulier du XVIIe

def charger():
    d = json.load(open(SRC_ANN, encoding='utf-8'))
    biens = []
    for a in d['annonces'].values():
        if a['status'] == 'retirée' or not a['photos'].get('fichiers'):
            continue
        c = a['caracteristiques']
        t, p, s = NOMS.get(a['ref'], a['type']), a.get('pieces'), a.get('surface')
        fam = FAMILLE.get(a['type'], 'Autre')
        if t in ('Terrain', 'Terrain à bâtir'):
            nom = f"{t} de {nb(s)} m²" if s else t
        elif t == 'Studio' or not p or p == 1:
            nom = t
        else:
            nom = f"{t} {p} pièces"
        photos = sorted(a['photos']['fichiers'], key=lambda f: int(re.sub(r'\D', '', f) or 0))
        m = [x for x in (a.get('mentions_agence') or [])]
        b = dict(ref=a['ref'], type=t, famille=fam, nom=nom, commune=a['commune'], cp=a.get('cp') or c.get('cp', ''),
                 prix=a.get('prix'), avant=a.get('prix_precedent'), surface=s, pieces=p, chambres=c.get('nbchambres'),
                 terrain=c.get('surfterrn'), status=a['status'], c=c, dpe=a.get('dpe'), ges=a.get('ges'), energie=a.get('energie'),
                 desc=a.get('description_expurgee') or '', photos=photos, maj=a.get('last_seen'),
                 exclu='Exclusivité' in m, coeur='Coup de coeur' in m, neuf='Nouveauté' in m, baisse='Prix en baisse' in m)
        b['url'] = f"/biens/{slug(b['ref'])}-{slug(t)}-{slug(b['commune'])}/"
        b['titre'] = f"{nom} à {b['commune']}"
        biens.append(b)
    biens.sort(key=lambda b: (b['status'] != 'en vente', not (b['coeur'] or b['exclu']), -(b['prix'] or 0)))
    for i, b in enumerate(biens):
        b['rang'] = i
    return biens, d.get('maj')

def photo(b, n=0, petit=False):
    f = b['photos'][n]
    if petit and n == 0:
        return f"{IMG}/{b['ref']}/1-600.webp"
    return f"{IMG}/{b['ref']}/{f}"

def etiquette(b):
    if b['status'] == 'sous offre': return '<span class="etiq pris">Sous offre</span>'
    if b['status'] == 'sous compromis': return '<span class="etiq pris">Sous compromis</span>'
    if b['exclu']: return '<span class="etiq">Exclusivité</span>'
    if b['baisse']: return '<span class="etiq">Prix en baisse</span>'
    if b['neuf']: return '<span class="etiq">Nouveauté</span>'
    return ''

def prix_html(b):
    if not b['prix']: return 'Prix sur demande'
    s = eur(b['prix'])
    if b['avant'] and b['avant'] > b['prix']: s += f"<s>{eur(b['avant'])}</s>"
    return s

def carte(b, charge='lazy'):
    faits = []
    if b['surface']: faits.append(f"{nb(b['surface'])} m²")
    if b['chambres'] and b['chambres'] != '0': faits.append(f"{b['chambres']} chambre{'s' if b['chambres'] != '1' else ''}")
    if b['terrain']: faits.append(f"Terrain {b['terrain']}")
    return (f'<a class="bien" href="{b["url"]}" data-famille="{e(b["famille"])}" data-commune="{e(b["commune"])}" '
            f'data-prix="{int(b["prix"] or 0)}" data-surface="{b["surface"] or 0}" data-rang="{b["rang"]}">'
            f'<div class="bien-photo"><img src="{photo(b, 0, True)}" srcset="{photo(b, 0, True)} 600w, {photo(b)} 1200w" '
            f'sizes="(max-width:620px) 92vw, (max-width:980px) 46vw, 400px" alt="{e(b["titre"])}" loading="{charge}" decoding="async" width="600" height="450">'
            f'{etiquette(b)}</div><h3>{e(b["titre"])}</h3>'
            f'<div class="bien-faits">{"".join(f"<span>{e(x)}</span>" for x in faits)}</div>'
            f'<div class="bien-prix num">{prix_html(b)}</div></a>')

NAV = [('/acheter/', 'Acheter'), ('/vendre/', 'Vendre'), ('/louer/', 'Louer'), ('/estimation/', 'Estimer'), ('/videos/', 'Films'), ('/agence/', 'L’agence'), ('/contact/', 'Contact')]
ICONE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="3.6"/><path d="M4.8 20c.9-3.6 3.7-5.6 7.2-5.6s6.3 2 7.2 5.6"/></svg>'

def page(chemin, titre, desc, corps, actif='', tete='', fin='', index=True, classe='', prive=False):
    nav = ''.join(f'<a href="{u}"{" aria-current=\"page\"" if u == actif else ""}>{l}</a>' for u, l in NAV)
    h = f'''<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>{e(titre)}</title>
<meta name="description" content="{e(desc)}">
{'' if index else '<meta name="robots" content="noindex">'}
<meta name="theme-color" content="#F3F4F1">
<meta property="og:title" content="{e(titre)}"><meta property="og:description" content="{e(desc)}"><meta property="og:type" content="website"><meta property="og:locale" content="fr_FR">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preload" href="/assets/fonts/serif.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/assets/fonts/sans.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/assets/site.css">
{tete}
</head>
<body class="{classe}">
<a class="passer" href="#contenu">Aller au contenu</a>
<header class="tete"><div class="enveloppe">
<a class="logo" href="/" aria-label="Gravelin immo, accueil"><span>Gravelin immo</span></a>
<button class="menu-btn" type="button" aria-label="Menu" aria-expanded="false"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M3 7h18M3 12h18M3 17h18"/></svg></button>
<nav class="nav" aria-label="Navigation principale">{nav}<a class="tete-tel num" href="tel:{TEL_LIEN}">{TEL}</a></nav>
<a class="compte" href="/mon-espace/" data-compte aria-label="Mon espace : se connecter" title="Mon espace">{ICONE}</a>
</div></header>
<main id="contenu">
{corps}
</main>
<div class="tuiles" aria-hidden="true"></div>
<footer class="pied"><div class="enveloppe">
<div class="pied-grille">
<div><a class="logo" href="/" aria-label="Gravelin immo, accueil"><span>Gravelin immo</span></a>
<p>30 rue Bannelier<br>21000 Dijon</p>
<p><a class="num" href="tel:{TEL_LIEN}">{TEL}</a><br><a href="mailto:{MAIL}">{MAIL}</a></p>{HORAIRES}</div>
<div><h2>Les biens</h2><ul><li><a href="/acheter/">Tous les biens à vendre</a></li><li><a href="/acheter/?type=Appartement">Appartements</a></li><li><a href="/acheter/?type=Maison">Maisons</a></li><li><a href="/acheter/?type=Immeuble">Immeubles</a></li><li><a href="/acheter/?type=Terrain">Terrains</a></li><li><a href="/immobilier-professionnel/">Commerces et locaux</a></li><li><a href="/prix-immobilier/">Prix au m² par commune</a></li></ul></div>
<div><h2>L’agence</h2><ul><li><a href="/vendre/">Vendre avec nous</a></li><li><a href="/louer/">Mettre en location</a></li><li><a href="/estimation/">Estimation offerte</a></li><li><a href="/agence/">L’équipe</a></li><li><a href="/videos/">Nos films</a></li><li><a href="/honoraires/">Nos honoraires</a></li><li><a href="/avis/">Avis clients</a></li></ul></div>
<div><h2>Nous suivre</h2><ul><li><a href="https://www.instagram.com/gravelin_immo/" rel="noopener">Instagram</a></li><li><a href="https://www.facebook.com/gravelinimmo/" rel="noopener">Facebook</a></li><li><a href="https://www.linkedin.com/company/gravelin-immo/" rel="noopener">LinkedIn</a></li><li><a href="/mon-espace/">Mon espace</a></li></ul></div>
</div>
<div class="pied-bas"><p>© {datetime.date.today().year} GRAVELIN IMMO, agence immobilière à Dijon depuis 2016.</p><p><a href="/mentions-legales/">Mentions légales</a> &nbsp; <a href="/confidentialite/">Confidentialité</a></p></div>
</div></footer>
<script src="/assets/app.js" defer></script>
{'' if (prive or not DISCUSSION) else '<script src="/assets/discussion.js" defer></script>'}
{fin}
</body>
</html>'''
    p = os.path.join(OUT, chemin.strip('/'), 'index.html') if chemin != '/404' else os.path.join(OUT, '404.html')
    os.makedirs(os.path.dirname(p), exist_ok=True)
    open(p, 'w', encoding='utf-8').write(h)

def entete(titre, chapo='', fil=None):
    f = ''
    if fil:
        f = '<p class="fil">' + ' / '.join(f'<a href="{u}">{e(l)}</a>' if u else e(l) for u, l in fil) + '</p>'
    return f'<section class="entete-page"><div class="enveloppe">{f}<h1>{titre}</h1>{f"<p class=chapo>{chapo}</p>" if chapo else ""}</div></section>'

APPEL = '''<section class="bloc fond-nuit"><div class="enveloppe appel">
<div><h2>Combien vaut votre bien aujourd’hui ?</h2>
<p class="chapo" style="margin-top:18px">L’estimation est offerte et sans engagement. Elle s’appuie sur les ventes réellement signées autour de chez vous, puis sur une visite.</p></div>
<div class="appel-actions"><a class="btn btn-clair" href="/estimation/">Estimer mon bien</a><a class="lien" style="color:#fff" href="tel:+33345343531">ou appeler le 03 45 34 35 31</a></div>
</div></section>'''

FILM = '''<section class="bloc fond-nuit"><div class="enveloppe film">
<div class="film-cadre"><img src="/assets/m/hw-roofs.webp" alt="Vue aérienne d’un quartier de maisons filmé au drone par l’agence" loading="lazy" width="1600" height="900">
<button class="film-jouer" type="button" data-film="film-loft"><i aria-hidden="true"></i><span>Regarder un film de bien</span></button></div>
<div><h2>Chaque bien a son film</h2>
<p class="chapo" style="margin-top:18px">Drone, stabilisateur, lumière du matin : notre vidéaste, notre photographe et nos monteurs préparent chaque bien avant sa mise en vente. Les acheteurs visitent une première fois depuis leur canapé, et ceux qui se déplacent savent déjà pourquoi ils viennent.</p>
<p><a class="lien" style="color:#fff" href="/vendre/">Comment nous vendons</a></p></div>
</div></section>'''

# ---------------------------------------------------------------- carte du secteur
GEO = {'Dijon': (47.322, 5.041, 'd'), 'Beaune': (47.024, 4.840, 'g'), 'Bèze': (47.468, 5.271, 'g'), 'Arceau': (47.383, 5.183, 'd'),
       'Saulon-la-Rue': (47.220, 5.083, 'd'), 'Saint-Gervais-en-Vallière': (46.946, 4.960, 'g'), 'Plombières-lès-Dijon': (47.338, 4.965, 'g'),
       'Neuilly-Crimolois': (47.280, 5.117, 'd'), 'Bragny-sur-Saône': (46.905, 5.020, 'd'), 'Allerey-sur-Saône': (46.906, 4.983, 'g'),
       'Couchey': (47.260, 4.983, 'g'), 'Chenôve': (47.293, 5.006, 'g'), 'Chevigny-Saint-Sauveur': (47.302, 5.135, 'd'),
       'Bligny-sur-Ouche': (47.106, 4.669, 'd'), 'Chalon-sur-Saône': (46.781, 4.853, 'd')}

def carte_secteur(compte):
    def xy(lat, lon): return round((lon - 4.50) * 760, 1), round((47.52 - lat) * 1115, 1)
    o = ['<svg viewBox="0 0 700 860" role="img" aria-label="Carte des communes où l’agence a des biens à vendre, de Dijon à Chalon-sur-Saône">']
    ax = [xy(*GEO[k][:2]) for k in ('Dijon', 'Beaune', 'Chalon-sur-Saône')]
    o.append(f'<path class="axe" d="M{ax[0][0]},{ax[0][1]} L{ax[1][0]},{ax[1][1]} L{ax[2][0]},{ax[2][1]}"/>')
    for nom, (lat, lon, cote) in GEO.items():
        n = compte.get(nom, 0)
        x, y = xy(lat, lon)
        r = 5 if not n else round(6 + (n ** .5) * 3, 1)
        dx = (r + 9) if cote == 'd' else -(r + 9)
        anc = 'start' if cote == 'd' else 'end'
        lab = nom + (f' ({n})' if n else '')
        g = f'<circle class="{"pt" if n else "pt-agence"}" cx="{x}" cy="{y}" r="{r}"{"" if n else " fill-opacity=.35"}/><text x="{x + dx}" y="{y + 6}" text-anchor="{anc}">{e(lab)}</text>'
        o.append(f'<a href="/immobilier/{slug(nom)}/">{g}</a>' if n else g)
    o.append('</svg>')
    return ''.join(o)

# ---------------------------------------------------------------- pages
def accueil(biens):
    actifs = [b for b in biens if b['status'] == 'en vente']
    une = [b for b in actifs if b['ref'] in ('527', '438', '500A', '525')] or actifs[:3]
    une.sort(key=lambda b: ['527', '438', '500A', '525'].index(b['ref']) if b['ref'] in ('527', '438', '500A', '525') else 9)
    imgs = ''.join(f'<img src="{photo(b)}" alt="{e(b["titre"])}" data-lien="{b["url"]}" data-titre="{e(b["titre"])}" data-prix="{e(prix_html(b).split("<")[0])}"'
                   f'{" data-on fetchpriority=high" if i == 0 else " loading=lazy"} decoding="async">' for i, b in enumerate(une))
    types = ''.join(f'<option value="{t}">{l}</option>' for t, l in (('Appartement', 'Appartement'), ('Maison', 'Maison'), ('Immeuble', 'Immeuble'), ('Terrain', 'Terrain')))
    compte = {}
    for b in biens: compte[b['commune']] = compte.get(b['commune'], 0) + 1
    communes = sorted(compte, key=lambda k: (-compte[k], k))
    opts = ''.join(f'<option>{e(c)}</option>' for c in sorted(compte))
    budgets = ''.join(f'<option value="{v}">{eur(v)}</option>' for v in (100000, 150000, 200000, 300000, 500000, 1000000))
    selection = ''.join(carte(b) for b in actifs[:6])
    liste_com = ''.join(f'<li><a href="{url_commune(c)}">{e(c)}</a><span class="num">{compte[c]}</span></li>' for c in communes)
    ph = next((x for x in actifs if x['ref'] == '438'), None)
    une_bloc = ''
    if ph:
        une_bloc = f'''<section class="bloc"><div class="enveloppe une">
<a class="une-photo" href="{ph["url"]}"><img src="{photo(ph)}" alt="{e(ph["titre"])}" loading="lazy" width="1200" height="675"></a>
<div><h2>Un château du XVIIIe siècle, près de Beaune</h2>
<div class="une-faits num"><span>{nb(ph["surface"])} m²</span><span>{ph["pieces"]} pièces</span><span>Domaine de 15 hectares</span></div>
<p>À Saint-Gervais-en-Vallière, une demeure des XVIIIe et XIXe siècles, son étang, son colombier et la vue sur la Côte de Beaune.</p>
<p class="une-prix num">{eur(ph["prix"])}</p>
<a class="btn btn-trait" href="{ph["url"]}">Découvrir le château</a></div>
</div></section>'''
    corps = f'''
<section class="enveloppe vitrine">
<div class="vitrine-texte">
<h1>Votre agence immobilière à Dijon, depuis 2016.</h1>
<p class="chapo">{len(biens)} biens à vendre en ce moment entre Dijon, Beaune et Chalon-sur-Saône. Pour les vendeurs, l’estimation est offerte.</p>
<form class="cherche" action="/acheter/" method="get">
<label><span>Type de bien</span><select name="type"><option value="">Tous</option>{types}</select></label>
<label><span>Commune</span><select name="commune"><option value="">Toutes</option>{opts}</select></label>
<label><span>Budget</span><select name="budget"><option value="">Sans limite</option>{budgets}</select></label>
<button class="btn btn-plein" type="submit">Voir les biens</button>
</form>
<p class="vitrine-suite"><a class="lien" href="/estimation/">Estimer mon bien</a><a class="lien" href="/vendre/">Comment nous vendons</a></p>
</div>
<div class="vitrine-image"><div class="toit">{imgs}
<a class="toit-carton" href="{une[0]["url"]}"><b>{e(une[0]["titre"])}</b><span class="num">{e(prix_html(une[0]).split("<")[0])}</span></a></div></div>
</section>

<section class="bloc fond-papier"><div class="enveloppe">
<div class="titre-rang"><h2>À vendre en ce moment</h2><a class="lien" href="/acheter/">Voir les {len(biens)} biens</a></div>
<div class="grille">{selection}</div>
</div></section>
{une_bloc}
{FILM}
<section class="bloc"><div class="enveloppe deux">
<div><h2>Vendre avec l’agence</h2>
<p class="chapo" style="margin-top:20px">Un prix juste dès le départ, un bien montré sous son meilleur jour, et quelqu’un qui vous tient au courant à chaque étape.</p>
<p><a class="btn btn-bleu" href="/vendre/">Notre façon de vendre</a></p></div>
<ol class="etapes">
<li><h3>L’estimation</h3><p>Nous partons des ventes signées dans votre rue et votre quartier, puis nous visitons. Vous repartez avec un prix argumenté.</p></li>
<li><h3>La mise en valeur</h3><p>Notre équipe de marketing photographie et filme le bien. Plus de 200 biens ont déjà été présentés en vidéo par l’agence.</p></li>
<li><h3>La diffusion et les visites</h3><p>Le bien part sur les sites d’annonces et nos réseaux. Nous vérifions le financement des acheteurs avant de vous les présenter.</p></li>
<li><h3>Du compromis à l’acte</h3><p>Nous suivons le dossier avec le notaire jusqu’à la remise des clés.</p></li>
</ol>
</div></section>

<section class="bloc fond-papier" style="padding-top:0"><div class="enveloppe">
<div class="preuves">
<div><b class="num">{AVIS["note"]} sur 5</b><span>Note de l’agence sur Google, sur {AVIS["nombre"]} avis. Relevé du {AVIS["date"]}. <a class="lien" href="/avis/">Lire les avis</a></span></div>
<div><b>Depuis 2016</b><span>La même adresse, 30 rue Bannelier, à deux pas des Halles de Dijon.</span></div>
<div><b>Plus de 200 vidéos</b><span>Chaque film montre le bien tel qu’il est, avant même la première visite.</span></div>
</div></div></section>

<section class="bloc fond-papier" style="padding-top:0"><div class="enveloppe secteur">
<div><h2>De Dijon à Chalon-sur-Saône</h2>
<p class="chapo" style="margin-top:20px">L’agence vend à Dijon, dans les communes voisines et le long de la Côte, jusqu’à Beaune et la vallée de la Saône.</p>
<ul class="communes">{liste_com}</ul></div>
<div class="carte">{carte_secteur(compte)}</div>
</div></section>

<section class="bloc"><div class="enveloppe deux">
<div><h2>Vous avez un logement à louer ?</h2></div>
<div><p class="chapo">Nous cherchons le locataire, vérifions son dossier, rédigeons le bail et faisons l’état des lieux. Vous gardez la main sur votre bien, sans la partie pénible.</p>
<p style="margin-top:22px"><a class="btn btn-trait" href="/louer/">La mise en location</a></p></div>
</div></section>
{APPEL}'''
    ld = {"@context": "https://schema.org", "@type": "RealEstateAgent", "name": "GRAVELIN IMMO", "telephone": "+33345343531", "email": MAIL,
          "address": {"@type": "PostalAddress", "streetAddress": "30 rue Bannelier", "postalCode": "21000", "addressLocality": "Dijon", "addressCountry": "FR"},
          "foundingDate": "2016", "areaServed": ["Dijon", "Beaune", "Chalon-sur-Saône"]}
    page('/', 'GRAVELIN IMMO, agence immobilière à Dijon depuis 2016',
         f'{len(biens)} biens à vendre entre Dijon, Beaune et Chalon-sur-Saône. Vente, mise en location et estimation offerte, 30 rue Bannelier à Dijon.',
         corps, tete=f'<script type="application/ld+json">{json.dumps(ld, ensure_ascii=False)}</script>')

def acheter(biens):
    communes = sorted({b['commune'] for b in biens})
    corps = entete('Les biens à vendre', 'Appartements, maisons, immeubles et terrains, à Dijon et jusqu’à la vallée de la Saône.') + f'''
<section class="enveloppe" style="padding-bottom:var(--pas)">
<form class="filtres" aria-label="Filtrer les biens">
<label class="champ"><span>Type de bien</span><select name="type"><option value="">Tous les types</option><option>Appartement</option><option>Maison</option><option>Immeuble</option><option>Terrain</option></select></label>
<label class="champ"><span>Commune</span><select name="commune"><option value="">Toutes les communes</option>{"".join(f"<option>{e(c)}</option>" for c in communes)}</select></label>
<label class="champ"><span>Budget maximum</span><select name="budget"><option value="">Sans limite</option>{"".join(f'<option value="{v}">{eur(v)}</option>' for v in (100000, 150000, 200000, 300000, 500000, 1000000))}</select></label>
<label class="champ"><span>Surface minimum</span><select name="surface"><option value="">Toutes les surfaces</option>{"".join(f'<option value="{v}">{v} m²</option>' for v in (30, 50, 80, 120, 200))}</select></label>
<label class="champ"><span>Trier par</span><select name="tri"><option value="">Notre sélection</option><option value="prix-bas">Prix croissant</option><option value="prix-haut">Prix décroissant</option><option value="surface">Surface</option></select></label>
</form>
<p class="compte-res num" aria-live="polite">{len(biens)} biens à vendre</p>
<div class="grille" data-liste>{"".join(carte(b, "eager" if i < 3 else "lazy") for i, b in enumerate(biens))}</div>
<div class="vide" hidden><p>Aucun bien ne correspond à cette recherche pour l’instant.</p>
<p><button class="btn btn-trait" type="button" data-raz>Revoir tous les biens</button> &nbsp; <a class="lien" href="/contact/">Nous confier votre recherche</a></p></div>
</section>{APPEL}'''
    page('/acheter/', 'Biens à vendre à Dijon et alentours | GRAVELIN IMMO',
         f'{len(biens)} appartements, maisons, immeubles et terrains à vendre à Dijon, Beaune et dans la vallée de la Saône.', corps, '/acheter/')

LIB = [('surf_carrez', 'Surface'), ('surfterrn', 'Terrain'), ('nbpiecees', 'Pièces'), ('nbchambres', 'Chambres'), ('nbsdb', 'Salles de bains'), ('nbse', 'Salles d’eau'),
       ('nbniveaux', 'Niveaux'), ('nbetage', 'Étage'), ('exposition', 'Exposition'), ('vue', 'Vue'), ('nb_garage', 'Garages'), ('nb_parking', 'Places de stationnement')]
OUI = [('terrasse', 'Terrasse'), ('balcon', 'Balcon'), ('loggia', 'Loggia'), ('cave', 'Cave'), ('interphone', 'Interphone'), ('visiophone', 'Visiophone'),
       ('terrain_arbore', 'Terrain arboré'), ('terrain_piscinable', 'Terrain piscinable'), ('terrain_constructible', 'Terrain constructible'), ('terrain_viabilise', 'Terrain viabilisé')]
DPE_C = {'A': '#2E8B4A', 'B': '#5BAA3A', 'C': '#A5C63B', 'D': '#E8D21D', 'E': '#EFA92A', 'F': '#E3702B', 'G': '#D02A2A'}

def unique(v):
    out = []
    for x in [y.strip() for y in str(v).split(',')]:
        if x and x not in out: out.append(x)
    return ', '.join(out)

def paragraphes(t):
    t = re.sub(r'\[adresse retirée\][\s,;:]*', '', t)
    t = re.sub(r'[^.!?]*risques[^.!?]*?(?:www\.)?g[ée]orisques\.gouv\.fr[\s\d.]*', ' ', t, flags=re.I)
    t = re.sub(r'\s+', ' ', t).strip()
    t = re.sub(r'\s+([,.])', r'\1', t)
    t = re.sub(r'\b(X[IVX]+)\s*[eè]me\b', r'\1e', t)
    if t: t = t[0].upper() + t[1:]
    ph = re.split(r'(?<=[.!?])\s+(?=[A-ZÀÉÈÊÎÔÛÇ])', t)
    out, cur = [], ''
    for p in ph:
        if len(cur) + len(p) > 420 and cur:
            out.append(cur); cur = p
        else:
            cur = (cur + ' ' + p).strip()
    if cur: out.append(cur)
    return ''.join(f'<p>{e(p)}</p>' for p in out)

def fiche(b, biens):
    c = b['c']
    gal = b['photos'][:5]
    tous = [photo(b, i) for i in range(len(b['photos']))]
    boutons = ''
    for i, f in enumerate(gal):
        plus = f'<span class="plus">Voir les {len(tous)} photos</span>' if i == len(gal) - 1 and len(tous) > len(gal) else ''
        boutons += (f'<button type="button" data-n="{i}" aria-label="Agrandir la photo {i + 1}"><img src="{photo(b, i)}" alt="{e(b["titre"])}, photo {i + 1}" '
                    f'{"fetchpriority=high" if i == 0 else "loading=lazy"} decoding="async">{plus}</button>')
    faits = []
    if b['surface']: faits.append((nb(b['surface']) + ' m²', 'Surface'))
    if b['pieces']: faits.append((str(b['pieces']), 'Pièces' if b['pieces'] > 1 else 'Pièce'))
    if b['chambres'] and b['chambres'] != '0': faits.append((b['chambres'], 'Chambres' if b['chambres'] != '1' else 'Chambre'))
    if b['terrain']: faits.append((b['terrain'], 'Terrain'))
    if b['dpe']: faits.append((b['dpe'], 'Classe énergie'))
    lignes = [(l, c[k]) for k, l in LIB if c.get(k) and c[k] not in ('0', 'NON')]
    if c.get('type_cuisine') or c.get('cuisine'):
        lignes.append(('Cuisine', unique(', '.join(x for x in (c.get('cuisine'), c.get('type_cuisine')) if x)).lower().capitalize()))
    ch = [unique(c[k]) for k in ('mode_chauffage', 'type_chauffage', 'format_chauffage') if c.get(k) and unique(c[k]) != 'Autre']
    if ch: lignes.append(('Chauffage', ', '.join(ch).lower().capitalize()))
    equip = [l for k, l in OUI if c.get(k) == 'OUI']
    if c.get('sous_sol'): equip.append('Sous-sol')
    if equip: lignes.append(('Et aussi', ', '.join(equip).lower().capitalize()))
    if c.get('copropriete') == 'OUI':
        lignes.append(('Copropriété', f"{c['copropriete_nb_lot']} lots" if c.get('copropriete_nb_lot') else 'Oui'))
    carac = ''.join(f'<div><dt>{e(l)}</dt><dd>{e(str(v))}</dd></div>' for l, v in lignes)
    nrj = ''
    if b['dpe']:
        nrj += '<div class="dpe" role="img" aria-label="Classe énergie ' + b['dpe'] + '">' + ''.join(
            f'<i style="background:{col}"{" data-on" if k == b["dpe"] else ""}>{k}</i>' for k, col in DPE_C.items()) + '</div>'
    if b['energie']:
        nrj += f'<p>Dépenses annuelles d’énergie estimées {e(b["energie"])}, pour un usage standard.</p>'
    if not nrj:
        nrj = '<p>Le diagnostic de performance énergétique de ce bien vous est communiqué sur simple demande.</p>'
    statut = {'sous offre': 'Ce bien est sous offre.', 'sous compromis': 'Ce bien est sous compromis.'}.get(b['status'], '')
    sujet = f"Bien réf. {b['ref']} : {b['titre']}"
    mail = f"mailto:{MAIL}?subject={e(sujet).replace(' ', '%20')}"
    calc = ''
    if b['prix'] and b['famille'] != 'Terrain':
        calc = f'''<hr><form class="calc" data-prix="{int(b['prix'])}"><h3 style="margin-bottom:14px">Votre mensualité</h3>
<label>Apport, en euros<input name="apport" inputmode="numeric" value="{int(round(b['prix'] * .1, -3))}"></label>
<label>Durée, en années<input name="duree" inputmode="numeric" value="25"></label>
<label>Taux du prêt, en %<input name="taux" inputmode="decimal" value="3,5"></label>
<output class="num" aria-live="polite"></output><small style="margin:6px 0 0">Calcul indicatif, hors assurance. Indiquez le taux que votre banque vous propose.</small></form>'''
    autres = [x for x in biens if x['ref'] != b['ref'] and x['status'] == 'en vente' and (x['commune'] == b['commune'] or x['famille'] == b['famille'])][:3]
    hon = 'Prix honoraires inclus.' if c.get('prix_honoraires_inclus') else ''
    corps = f'''
<section class="enveloppe" style="padding-top:22px">
<p class="fil"><a href="/acheter/">Biens à vendre</a> / <a href="/immobilier/{slug(b["commune"])}/">{e(b["commune"])}</a> / {e(b["nom"])}</p>
<div class="galerie" data-photos='{e(json.dumps(tous))}'>{boutons}</div>
<div class="fiche">
<div>
<h1>{e(b["titre"])}</h1>
<p class="fiche-ref">{e(b["commune"])} {e(b["cp"])} &nbsp; Référence {e(b["ref"])}</p>
<div class="faits">{"".join(f"<div><b class=num>{e(v)}</b><span>{l}</span></div>" for v, l in faits)}</div>
<div class="desc prose">{paragraphes(b["desc"])}</div>
<div class="prose"><h2>Le bien en détail</h2><dl class="carac">{carac}</dl>
<h2>Énergie</h2>{nrj}
<p style="color:var(--gris);font-size:.95rem">Les informations sur les risques auxquels ce bien est exposé sont disponibles sur le site Géorisques : <a href="https://www.georisques.gouv.fr" rel="noopener">www.georisques.gouv.fr</a>.</p></div>
</div>
<aside class="cote">
{f'<div class="statut-bandeau">{statut}</div>' if statut else ''}
<div class="cote-prix num">{prix_html(b)}</div>
<small>{hon} <a href="/honoraires/">Barème de l’agence</a></small>
<a class="btn btn-plein" href="tel:{TEL_LIEN}">Appeler le {TEL}</a>
<hr><h3 style="margin-bottom:14px">Demander une visite</h3>
{formulaire('Demande de visite', sujet, 'Envoyer ma demande', 'Vos disponibilités, vos questions')}
{calc}
</aside>
</div>
</section>
{f'<section class="bloc"><div class="enveloppe"><div class="titre-rang"><h2>À voir aussi</h2><a class="lien" href="/acheter/">Tous les biens</a></div><div class="grille">{"".join(carte(x) for x in autres)}</div></div></section>' if autres else '<div style="height:var(--pas)"></div>'}
<div class="barre-bas"><b class="num">{prix_html(b).split("<")[0]}</b><a class="btn btn-plein" href="tel:{TEL_LIEN}">Appeler l’agence</a></div>
<div class="vis" role="dialog" aria-modal="true" aria-label="Photos du bien"><img alt=""><button class="x" type="button" aria-label="Fermer">×</button><button class="g" type="button" aria-label="Photo précédente">‹</button><button class="d" type="button" aria-label="Photo suivante">›</button><div class="n num"></div></div>'''
    d = f"{b['titre']}" + (f", {nb(b['surface'])} m²" if b['surface'] else '') + (f", {eur(b['prix'])}" if b['prix'] else '') + f". Référence {b['ref']}, GRAVELIN IMMO à Dijon."
    page(b['url'], f"{b['titre']} | GRAVELIN IMMO", d, corps, '/acheter/', tete=f'<meta property="og:image" content="{photo(b)}">')

def pages_fixes(biens):
    page('/vendre/', 'Vendre son bien à Dijon | GRAVELIN IMMO', 'Estimation offerte, film du bien, diffusion et suivi jusqu’à l’acte : la méthode de vente de GRAVELIN IMMO à Dijon.',
         entete('Vendre votre bien, au bon prix', 'Un bien se vend bien quand il part au bon prix dès le premier jour. Tout notre travail commence là.') + '''
<section class="enveloppe deux" style="padding-bottom:var(--pas)">
<div class="prose"><h2 style="margin-top:0">Ce que nous faisons pour vous</h2>
<p>Depuis 2016, l’agence accompagne des propriétaires à Dijon, autour de Beaune et jusqu’à Chalon-sur-Saône. Appartement, maison, immeuble, terrain ou local professionnel : la méthode reste la même.</p>
<p>Nous travaillons en mandat exclusif. C’est ce qui nous permet d’investir dans le film, les photos et la diffusion de votre bien, et de vous rendre des comptes à chaque étape.</p>
<p><a class="btn btn-plein" href="/estimation/">Demander mon estimation offerte</a></p></div>
<ol class="etapes">
<li><h3>L’estimation</h3><p>Nous regardons les ventes signées dans votre secteur, l’état du bien, sa copropriété, son diagnostic énergétique. Puis nous venons le voir.</p></li>
<li><h3>Le prix de mise en vente</h3><p>Nous vous disons le prix auquel nous pensons vendre, et pourquoi. Un prix trop haut fait perdre des mois, puis de l’argent.</p></li>
<li><h3>Le film et les photos</h3><p>Notre vidéaste et notre photographe viennent sur place, puis nos monteurs préparent les images. Les acheteurs le découvrent avant de se déplacer : ceux qui viennent sont déjà intéressés.</p></li>
<li><h3>La diffusion</h3><p>Annonce sur les grands sites, sur nos réseaux, auprès de nos acquéreurs en recherche et dans notre vitrine, rue Bannelier.</p></li>
<li><h3>Les visites et l’offre</h3><p>Nous vérifions le projet et le financement des acheteurs, nous vous transmettons chaque offre avec notre avis.</p></li>
<li><h3>Du compromis à l’acte</h3><p>Nous préparons le dossier pour le notaire et suivons les délais jusqu’à la signature définitive.</p></li>
</ol></section>''' + FILM + CINEMA + APPEL, '/vendre/')

    page('/louer/', 'Mettre un logement en location à Dijon | GRAVELIN IMMO', 'Recherche du locataire, étude du dossier, bail et état des lieux : la mise en location par GRAVELIN IMMO à Dijon.',
         entete('Mettre votre logement en location', 'Nous trouvons le bon locataire et nous sécurisons son entrée dans les lieux, du premier appel jusqu’à l’état des lieux.') + f'''
<section class="enveloppe deux" style="padding-bottom:var(--pas)">
<div class="prose"><h2 style="margin-top:0">Une prestation complète</h2>
<p>Nous prenons en charge toute la mise en location : vous n’avez ni les appels, ni les visites, ni les papiers à gérer. Une fois le locataire installé, vous restez l’interlocuteur de votre locataire.</p>
<h2>À louer en ce moment</h2>
<p><b>Appartement 2 pièces meublé à Dijon</b><br><span class="num">36,96 m², 790 € par mois charges comprises. Référence 389.</span></p>
<p style="color:var(--gris);font-size:.95rem">Relevé du 17 novembre 2026. Appelez l’agence au <a class="lien num" href="tel:{TEL_LIEN}">{TEL}</a> pour la disponibilité et les autres logements à louer.</p>
<p><a class="btn btn-plein" href="/contact/">Parler de mon logement</a></p></div>
<ol class="etapes">
<li><h3>Le loyer</h3><p>Nous fixons avec vous un loyer cohérent avec le marché et avec les règles applicables à votre logement.</p></li>
<li><h3>L’annonce et les visites</h3><p>Photos, annonce, réponses aux candidats et visites : nous nous en occupons.</p></li>
<li><h3>Le dossier du locataire</h3><p>Nous contrôlons les pièces et la solvabilité de chaque candidat avant de vous le présenter.</p></li>
<li><h3>Le bail et l’état des lieux</h3><p>Nous rédigeons le bail, réunissons les diagnostics et réalisons l’état des lieux d’entrée.</p></li>
</ol></section>''' + APPEL, '/louer/')

    page('/agence/', 'L’agence et son équipe | GRAVELIN IMMO, Dijon', 'GRAVELIN IMMO, agence immobilière indépendante installée 30 rue Bannelier à Dijon depuis 2016.',
         entete('Une agence indépendante, rue Bannelier', 'GRAVELIN IMMO a ouvert en 2016, à côté des Halles de Dijon. On y vend et on y loue des logements, des immeubles et des locaux professionnels.') + f'''
<section class="enveloppe" style="padding-bottom:var(--pas)">
{equipe_html()}
<div class="deux" style="margin-top:var(--pas)">
<div><h2>Une équipe entière derrière chaque bien</h2>
<p class="chapo" style="margin-top:20px">Vendre un bien, c’est aussi le montrer. L’agence travaille avec sa propre équipe de marketing.</p></div>
<div class="prose"><p>Robin, notre vidéaste, tourne les films au stabilisateur et au drone. Notre photographe réalise les prises de vue. Nos monteurs vidéo et nos retoucheurs photo préparent ensuite chaque image avant la mise en vente.</p>
<p>C’est ce travail qui a permis à l’agence de présenter plus de 200 biens en vidéo.</p></div>
</div>
<div class="trio">
<img src="/assets/equipe-tournage.webp" alt="Préparation d’un tournage dans la cuisine d’une maison en pierre" loading="lazy" width="800" height="1067">
<img src="/assets/equipe-preparation.webp" alt="Le vidéaste de l’agence prépare son matériel" loading="lazy" width="800" height="1067">
<img src="/assets/equipe-agence.webp" alt="Le vidéaste et sa caméra sur trépied, devant l’agence" loading="lazy" width="900" height="1600">
</div>
<div class="prose" style="margin-top:var(--pas)"><h2>Ce qui compte pour nous</h2>
<p>Connaître nos clients et leurs biens. Dire les choses clairement, y compris sur le prix. Et montrer chaque bien aussi bien qu’il le mérite.</p>
<p><a class="lien" href="/avis/">{AVIS["note"]} sur 5 sur Google, sur {AVIS["nombre"]} avis</a></p></div>
<div class="deux" style="margin-top:var(--pas);align-items:center"><img class="photo-haute" src="{M}/p88-800.webp" alt="L’enseigne Gravelin immo, location et transaction" loading="lazy" width="800" height="1000" style="max-width:420px">
<div><h2>Passez nous voir</h2><p class="chapo" style="margin-top:18px">30 rue Bannelier, à Dijon, à côté des Halles.</p>{HORAIRES}<p style="margin-top:24px"><a class="btn btn-trait" href="/contact/">Nous écrire</a></p></div></div>
</section>''' + APPEL, '/agence/')

    page('/honoraires/', 'Honoraires de l’agence | GRAVELIN IMMO', 'Barème des honoraires de vente et de location de GRAVELIN IMMO, agence immobilière à Dijon.',
         entete('Nos honoraires') + '''
<section class="enveloppe prose" style="padding-bottom:var(--pas)">
<h2 style="margin-top:0">Vente</h2>
<table class="bareme num"><thead><tr><th>Prix de vente</th><th>Honoraires</th></tr></thead><tbody>
<tr><td>Moins de 70 000 €</td><td>Forfait de 4 500 €</td></tr>
<tr><td>De 70 000 € à 100 000 €</td><td>7 %</td></tr>
<tr><td>De 100 000 € à 200 000 €</td><td>6,5 %</td></tr>
<tr><td>De 200 000 € à 300 000 €</td><td>6 %</td></tr>
<tr><td>Plus de 300 000 €</td><td>5,5 %</td></tr></tbody></table>
<h2>Location</h2>
<table class="bareme num"><thead><tr><th>Prestation</th><th>Honoraires</th></tr></thead><tbody>
<tr><td>Visite, constitution du dossier du locataire et rédaction du bail</td><td>8 € TTC par m²</td></tr>
<tr><td>État des lieux</td><td>3 € TTC par m²</td></tr></tbody></table>
<p>Le barème complet est affiché à l’agence, 30 rue Bannelier à Dijon.</p>
</section>''', '')

    page('/avis/', 'Avis clients | GRAVELIN IMMO, Dijon', f'GRAVELIN IMMO est notée {AVIS["note"]} sur 5 sur Google, sur {AVIS["nombre"]} avis.',
         entete(f'{AVIS["note"]} sur 5, sur {AVIS["nombre"]} avis', f'C’est la note de l’agence sur Google, relevée le {AVIS["date"]}. Nous ne recopions pas les avis ici : vous les lisez à la source, tels que nos clients les ont écrits.') + f'''
<section class="enveloppe" style="padding-bottom:var(--pas)"><p><a class="btn btn-plein" href="{AVIS["lien"]}" rel="noopener">Lire les avis sur Google</a></p></section>''' + APPEL, '')

    page('/contact/', 'Contact | GRAVELIN IMMO, 30 rue Bannelier à Dijon', 'Appeler, écrire ou passer à l’agence GRAVELIN IMMO, 30 rue Bannelier, 21000 Dijon.',
         entete('Nous joindre', 'Par téléphone, par e-mail ou en poussant la porte de l’agence.') + f'''
<section class="enveloppe coord" style="padding-bottom:var(--pas)">
<dl><dt>Téléphone</dt><dd><a class="num" href="tel:{TEL_LIEN}">{TEL}</a></dd>
<dt>E-mail</dt><dd><a href="mailto:{MAIL}">{MAIL}</a></dd>
<dt>Adresse</dt><dd>30 rue Bannelier<br>21000 Dijon</dd>
<dt>Horaires</dt><dd style="font:inherit">{HORAIRES}</dd></dl>
<div><div class="plan"><img src="/assets/plan-agence.webp" alt="Plan : l’agence se trouve 30 rue Bannelier, près des Halles de Dijon" loading="lazy" width="1200" height="800"></div>
<p style="margin-top:14px"><a class="lien" href="https://www.google.com/maps/search/?api=1&query=Gravelin%20Immo%2030%20rue%20Bannelier%20Dijon" rel="noopener">Ouvrir l’itinéraire</a></p></div>
</section>
<section class="bloc fond-papier"><div class="enveloppe deux"><div><h2>Écrivez-nous</h2><p class="chapo" style="margin-top:18px">Un projet de vente, une recherche, un logement à louer : dites-nous l’essentiel, nous vous rappelons.</p></div>
<div>{formulaire('Message depuis la page Contact')}</div></div></section>''', '/contact/')

    page('/mentions-legales/', 'Mentions légales | GRAVELIN IMMO', 'Mentions légales du site de l’agence GRAVELIN IMMO.',
         entete('Mentions légales') + f'''
<section class="enveloppe prose" style="padding-bottom:var(--pas)">
<h2 style="margin-top:0">L’agence</h2>
<p>GRAVELIN IMMO, société par actions simplifiée au capital de 800 €.<br>Siège social : 30 rue Bannelier, 21000 Dijon.<br>RCS Dijon 822 940 789. Numéro de TVA : FR10822940789.<br>Téléphone : {TEL}. E-mail : {MAIL}.</p>
<h2>Carte professionnelle</h2>
<p>Carte « Transactions sur immeubles et fonds de commerce » n° CPI 2102 2016 000 014 831, délivrée par la CCI de Côte-d’Or.</p>
<h2>Garantie et assurance</h2>
<p>Garantie financière et assurance de responsabilité civile professionnelle : GROUPAMA ASSURANCE-CRÉDIT, 8-10 rue d’Astorg, 75008 Paris.</p>
<h2>Hébergement</h2>
<p>Cloudflare, Inc., 101 Townsend Street, San Francisco, CA 94107, États-Unis.</p>
</section>''', '')

    page('/confidentialite/', 'Confidentialité | GRAVELIN IMMO', 'Comment GRAVELIN IMMO utilise les données que vous lui confiez.',
         entete('Vos données') + f'''
<section class="enveloppe prose" style="padding-bottom:var(--pas)">
<p>Ce site ne dépose aucun traceur publicitaire. Les seules données que nous recevons sont celles que vous nous envoyez : une demande d’estimation, un message, la création de votre espace.</p>
<h2>À quoi elles servent</h2><p>À répondre à votre demande et à suivre votre projet de vente, d’achat ou de location. Elles ne sont ni vendues ni transmises à des tiers.</p>
<h2>Vos droits</h2><p>Vous pouvez demander à consulter, corriger ou supprimer vos données en écrivant à <a class="lien" href="mailto:{MAIL}">{MAIL}</a>. Depuis votre espace, vous pouvez aussi les télécharger ou supprimer votre compte vous-même. Vous pouvez saisir la CNIL si vous estimez que vos droits ne sont pas respectés.</p>
</section>''', '')

    page('/404', 'Page introuvable | GRAVELIN IMMO', 'Cette page n’existe pas ou plus.',
         entete('Cette page n’existe plus', 'Le bien a peut-être été vendu. Tous ceux qui sont à vendre sont ici.') +
         '<section class="enveloppe" style="padding-bottom:var(--pas)"><p><a class="btn btn-plein" href="/acheter/">Voir les biens à vendre</a></p></section>', index=False)

def module(chemin, nom, titre, index, prive=False):
    tete = '<link rel="stylesheet" href="/espace-estimation.css"><link rel="stylesheet" href="/theme-gravelin.css">'
    page(chemin, titre, 'Estimation offerte de votre bien par GRAVELIN IMMO, à partir des ventes réelles autour de chez vous.',
         f'<div data-espace-estimation="{nom}"></div>', '/estimation/' if nom == 'estimer' else '', tete=tete,
         fin='<script src="/espace-estimation.js"></script>', index=index, prive=prive)

# ================================================================ version 2 : accueil et pages enrichies
def img(n, alt, cls=''):
    return (f'<img {f"class={cls} " if cls else ""}src="{M}/p{n}-800.webp" srcset="{M}/p{n}-800.webp 800w, {M}/p{n}.webp 1600w" '
            f'sizes="(max-width:900px) 92vw, 640px" alt="{e(alt)}" loading="lazy" decoding="async">')

def prix_puces(noms):
    o = ''
    for n in noms:
        c = PRIX['communes'].get(n)
        if not c: continue
        a, m = c.get('appartement'), c.get('maison')
        v = a or m
        o += (f'<a href="/prix-immobilier/#{slug(n)}"><b class="num">{eur(v["median"])}/m²</b>'
              f'<span>{e(n)}, {"appartements" if a else "maisons"}</span></a>')
    return f'<div class="prix-puces">{o}</div>'

def accueil(biens):
    actifs = [b for b in biens if b['status'] == 'en vente']
    types = ''.join(f'<option value="{t}">{t}</option>' for t in ('Appartement', 'Maison', 'Immeuble', 'Terrain'))
    compte = {}
    for b in biens: compte[b['commune']] = compte.get(b['commune'], 0) + 1
    communes = sorted(compte, key=lambda k: (-compte[k], k))
    opts = ''.join(f'<option>{e(c)}</option>' for c in sorted(compte))
    budgets = ''.join(f'<option value="{v}">{eur(v)}</option>' for v in (100000, 150000, 200000, 300000, 500000, 1000000))
    selection = ''.join(carte(b) for b in actifs[:6])
    liste_com = ''.join(f'<li><a href="{url_commune(c)}">{e(c)}</a><span class="num">{compte[c]}</span></li>' for c in communes)
    ph = next((x for x in actifs if x['ref'] == '438'), None)
    hp = next((x for x in actifs if x['ref'] == '527'), None)
    une = ''
    if ph:
        une = f"""<section class="bloc fond-papier"><div class="enveloppe une">
<video class="une-video" muted loop playsinline autoplay preload="metadata" poster="{M}/hero-chateau.webp" src="{M}/hero-chateau.mp4" aria-label="Vue aérienne du château"></video>
<div><h2>Un château du XVIIIe siècle, près de Beaune</h2>
<div class="une-faits num"><span>{nb(ph["surface"])} m²</span><span>{ph["pieces"]} pièces</span><span>Domaine de 15 hectares</span></div>
<p>À Saint-Gervais-en-Vallière, une demeure des XVIIIe et XIXe siècles, son étang, son colombier et la vue sur la Côte de Beaune.</p>
<p class="une-prix num">{eur(ph["prix"])}</p>
<p><a class="btn btn-plein" href="{ph["url"]}">Découvrir le château</a> &nbsp; <button class="btn btn-trait" type="button" data-film="film-chateau">Voir le film</button></p></div>
</div></section>"""
    hotel = ''
    if hp:
        hotel = f"""<section class="bloc"><div class="enveloppe une" style="grid-template-columns:minmax(0,2fr) minmax(0,3fr)">
<div><h2>Un hôtel particulier du XVIIe, au cœur de Beaune</h2>
<div class="une-faits num"><span>{nb(hp["surface"])} m²</span><span>Cour intérieure</span><span>Cave voûtée</span></div>
<p>Derrière une façade de pierre, une cour, des volumes anciens, une terrasse et un jardin, en plein centre historique.</p>
<p class="une-prix num">{eur(hp["prix"])}</p>
<a class="btn btn-trait" href="{hp["url"]}">Pousser la porte</a></div>
<a class="une-photo" href="{hp["url"]}"><img src="{photo(hp)}" alt="{e(hp["titre"])}" loading="lazy" width="1200" height="801"></a>
</div></section>"""
    mosaique = ''.join(f'<img src="{M}/p{n}-800.webp" alt="{e(a)}" loading="lazy" decoding="async">' for n, a in (
        (10, 'Loft sous charpente métallique'), (64, 'Maison bourgeoise et son magnolia'), (14, 'Suite sous les toits avec bain à remous'),
        (32, 'Maison de vigneron en pierre'), (12, 'Séjour lumineux avec balcon'), (79, 'Façade du château'),
        (76, 'Terrasse d’une maison contemporaine'), (29, 'Salon avec cheminée en pierre'), (118, 'Longère au crépuscule'),
        (123, 'Salon aux boiseries bleues'), (21, 'Séjour clair et bois naturel'), (36, 'Studio rénové par architecte')))
    corps = f"""
<section class="cine" data-pc="hw-villa,hw-pool,hw-roofs,hw-salon,hw-contemp" data-mobile="hero-chateau,hero-beaune,hero-loft">
<picture><source media="(max-width:760px)" srcset="{M}/hero-chateau.webp"><img class="fond" data-on src="{M}/hw-villa.webp" alt="" fetchpriority="high"></picture>
<video muted loop playsinline aria-hidden="true"></video><video muted loop playsinline aria-hidden="true"></video>
<div class="cine-texte"><div class="enveloppe">
<h1>Votre agence immobilière à Dijon, depuis 2016.</h1>
<p class="chapo">{len(biens)} biens à vendre en ce moment entre Dijon, Beaune et Chalon-sur-Saône. Chacun est photographié et filmé par notre équipe.</p>
<form class="cherche" action="/acheter/" method="get">
<label><span>Type de bien</span><select name="type"><option value="">Tous</option>{types}</select></label>
<label><span>Commune</span><select name="commune"><option value="">Toutes</option>{opts}</select></label>
<label><span>Budget</span><select name="budget"><option value="">Sans limite</option>{budgets}</select></label>
<button class="btn btn-plein" type="submit">Voir les biens</button>
</form>
<p class="vitrine-suite"><a class="lien" href="/estimation/">Estimer mon bien</a><a class="lien" href="/videos/">Regarder nos films</a></p>
</div></div>
</section>

<section class="bloc"><div class="enveloppe">
<div class="titre-rang"><h2>À vendre en ce moment</h2><a class="lien" href="/acheter/">Voir les {len(biens)} biens</a></div>
<div class="grille">{selection}</div>
</div></section>
{une}
<section class="bloc fond-nuit"><div class="enveloppe"><div class="titre-rang"><div><h2>Visitez avant de vous déplacer</h2>
<p class="chapo" style="margin-top:16px">Drone, stabilisateur, lumière du matin : notre vidéaste, notre photographe et nos monteurs préparent chaque bien. Plus de 200 films à ce jour.</p></div>
<a class="lien" style="color:#fff" href="/videos/">Tous nos films</a></div></div>
{mur_html()}</section>
{hotel}
<section class="bloc fond-papier"><div class="enveloppe deux">
<div><h2>Vendre avec l’agence</h2>
<p class="chapo" style="margin-top:20px">Un prix juste dès le départ, un bien montré sous son meilleur jour, et quelqu’un qui vous tient au courant à chaque étape.</p>
<p style="margin-bottom:32px"><a class="btn btn-bleu" href="/vendre/">Notre façon de vendre</a></p>
{img(64, "Maison bourgeoise présentée par l’agence, magnolia en fleurs", "photo-haute")}</div>
<ol class="etapes">
<li><h3>L’estimation</h3><p>Nous partons des ventes signées dans votre rue et votre quartier, puis nous visitons. Vous repartez avec un prix argumenté.</p></li>
<li><h3>La mise en valeur</h3><p>Notre équipe de marketing photographie et filme le bien : vidéaste, photographe, monteurs.</p></li>
<li><h3>La diffusion et les visites</h3><p>Le bien part sur les sites d’annonces et nos réseaux. Nous vérifions le financement des acheteurs avant de vous les présenter.</p></li>
<li><h3>Du compromis à l’acte</h3><p>Nous suivons le dossier avec le notaire jusqu’à la remise des clés.</p></li>
</ol>
</div></section>

<section class="bloc fond-papier" style="padding-top:0"><div class="enveloppe">
<div class="preuves">
<div><b class="num">{AVIS["note"]} sur 5</b><span>Note de l’agence sur Google, sur {AVIS["nombre"]} avis. Relevé du {AVIS["date"]}. <a class="lien" href="/avis/">Lire les avis</a></span></div>
<div><b>Depuis 2016</b><span>La même adresse, 30 rue Bannelier, à côté des Halles de Dijon.</span></div>
<div><b>Plus de 200 films</b><span>Tournés et montés par notre équipe, pour que le bien soit vu avant la première visite.</span></div>
</div></div></section>

<section class="bloc"><div class="enveloppe">
<div class="titre-rang"><div><h2>Les prix réels, commune par commune</h2>
<p class="chapo" style="margin-top:16px">Prix médian au m² des ventes signées de {PRIX["annees"][0]} à {PRIX["annees"][-1]}, d’après les actes enregistrés par l’État.</p></div>
<a class="lien" href="/prix-immobilier/">Toutes les communes</a></div>
{prix_puces(["Dijon", "Beaune", "Fontaine-lès-Dijon", "Talant", "Chevigny-Saint-Sauveur", "Saint-Apollinaire"])}
</div></section>

<section class="bloc fond-papier"><div class="enveloppe">
<div class="titre-rang"><h2>Des biens que nous avons présentés</h2><a class="lien" href="https://www.instagram.com/gravelin_immo/" rel="noopener">Suivre l’agence sur Instagram</a></div>
<div class="mosaique">{mosaique}</div>
</div></section>

<section class="bloc"><div class="enveloppe">
<div class="titre-rang"><h2>Ceux qui s’occupent de vous</h2><a class="lien" href="/agence/">Toute l’équipe</a></div>
{equipe_html()}
</div></section>

<section class="bloc fond-papier"><div class="enveloppe secteur">
<div><h2>De Dijon à Chalon-sur-Saône</h2>
<p class="chapo" style="margin-top:20px">L’agence vend à Dijon, dans les communes voisines et le long de la Côte, jusqu’à Beaune et la vallée de la Saône.</p>
<ul class="communes">{liste_com}</ul></div>
<div class="carte">{carte_secteur(compte)}</div>
</div></section>

<section class="bloc"><div class="enveloppe deux" style="align-items:center">
<div>{img(123, "Salon aux boiseries bleues d’un appartement ancien", "photo-large")}</div>
<div><h2>We speak English</h2>
<p class="chapo" style="margin-top:18px">Buying in Burgundy from abroad? The agency works in French and English, and Shawez Ali also welcomes clients in Hindi, Urdu, Punjabi, Persian, Greek and Arabic.</p>
<p><a class="btn btn-trait" href="/contact/">Contact the agency</a></p></div>
</div></section>

<section class="bloc fond-papier"><div class="enveloppe deux" style="align-items:start">
<div><h2>Commerces, immeubles, locaux</h2>
<p class="chapo" style="margin-top:18px">Fonds de commerce, murs, immeubles de rapport : l’agence vend aussi l’immobilier professionnel, à Dijon et dans son agglomération.</p>
<p><a class="btn btn-trait" href="/immobilier-professionnel/">L’immobilier professionnel</a></p></div>
<div><h2>Un logement à louer ?</h2>
<p class="chapo" style="margin-top:18px">Nous cherchons le locataire, vérifions son dossier, rédigeons le bail et faisons l’état des lieux.</p>
<p><a class="btn btn-trait" href="/louer/">La mise en location</a></p></div>
</div></section>
{faq_html()}
{APPEL}{CINEMA}"""
    ld = {"@context": "https://schema.org", "@type": "RealEstateAgent", "name": "GRAVELIN IMMO", "telephone": "+33345343531", "email": MAIL,
          "address": {"@type": "PostalAddress", "streetAddress": "30 rue Bannelier", "postalCode": "21000", "addressLocality": "Dijon", "addressCountry": "FR"},
          "foundingDate": "2016", "areaServed": ["Dijon", "Beaune", "Chalon-sur-Saône"], "openingHours": ["Mo,Tu,Th,Fr 09:30-18:00"]}
    faq = {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": r}} for q, r in FAQ]}
    page('/', 'GRAVELIN IMMO, agence immobilière à Dijon depuis 2016',
         f'{len(biens)} biens à vendre entre Dijon, Beaune et Chalon-sur-Saône. Vente, mise en location et estimation offerte, 30 rue Bannelier à Dijon.',
         corps, classe='accueil',
         tete=f'<link rel="preload" as="image" href="{M}/hw-villa.webp" media="(min-width:761px)"><script type="application/ld+json">{json.dumps(ld, ensure_ascii=False)}</script><script type="application/ld+json">{json.dumps(faq, ensure_ascii=False)}</script>')

def pages_v2(biens):
    films = [('film-chateau', 'loop-chateau', 'Le château de Saint-Gervais-en-Vallière'), ('film-loft', 'loop-loft', 'Un loft sous charpente'),
             ('film-spa', 'loop-spa', 'Une suite avec bain à remous'), ('film-8portes', 'loop-8portes', 'Derrière les portes')]
    cartes = ''.join(f'<figure style="flex:1 1 220px;max-width:300px"><video muted loop playsinline preload="none" poster="{M}/{l}.webp" data-src="{M}/{l}.mp4"></video>'
                     f'<button type="button" data-film="{f}">Voir le film</button><figcaption>{e(t)}</figcaption></figure>' for f, l, t in films)
    page('/videos/', 'Nos films de biens | GRAVELIN IMMO', 'Les biens vendus par GRAVELIN IMMO, filmés au drone et au stabilisateur par l’équipe de l’agence.',
         entete('Nos films', 'Plus de 200 biens filmés par l’équipe de l’agence. En voici quelques-uns, à regarder avec le son.') + f"""
<section class="fond-nuit bloc" style="padding-top:clamp(36px,5vw,64px)"><div class="mur" style="flex-wrap:wrap;overflow:visible;justify-content:flex-start">{cartes}</div>
<div class="enveloppe" style="margin-top:clamp(40px,6vw,80px)"><h2>En boucle, sans le son</h2></div>
<div style="margin-top:28px">{mur_html()}</div></section>
<section class="bloc"><div class="enveloppe deux"><div><h2>Une équipe entière derrière chaque film</h2></div>
<div class="prose"><p>Robin, notre vidéaste, tourne au stabilisateur et au drone. Notre photographe réalise les prises de vue. Nos monteurs vidéo et nos retoucheurs photo préparent ensuite chaque image avant la mise en vente.</p>
<p>Tous les films sont publiés sur <a class="lien" href="https://www.instagram.com/gravelin_immo/" rel="noopener">Instagram</a> et sur la chaîne YouTube de l’agence.</p>
<p><a class="btn btn-plein" href="/estimation/">Faire filmer mon bien</a></p></div></div></section>{CINEMA}""" + APPEL, '/videos/')

    C = PRIX['communes']
    ordre = sorted(C, key=lambda k: -sum(v['n'] for v in C[k].values()))
    mx = max(v['median'] for c in C.values() for v in c.values())
    def cell(v, cls):
        lib = 'Maisons' if cls else 'Appartements'
        if not v: return f'<td data-l="{lib}"><small>Trop peu de ventes</small></td>'
        return (f'<td data-l="{lib}"><b class="num">{eur(v["median"])}/m²</b><small class="num">de {eur(v["q1"])} à {eur(v["q3"])}, sur {v["n"]} ventes</small>'
                f'<div class="barre {cls}" style="width:{round(v["median"] / mx * 100)}%"></div></td>')
    pg = set(communes_pages(biens))
    lignes = ''.join(f'<tr id="{slug(n)}" data-n="{slug(n).replace("-", " ")}"><td><b>{f"<a href={url_commune(n)}>{e(n)}</a>" if n in pg else e(n)}</b></td>{cell(C[n].get("appartement"), "")}{cell(C[n].get("maison"), "m")}</tr>' for n in ordre)
    d = PRIX["derniere"]
    page('/prix-immobilier/', 'Prix de l’immobilier au m² à Dijon et en Côte-d’Or | GRAVELIN IMMO',
         f'Prix médian au m² des appartements et des maisons dans {len(C)} communes de Côte-d’Or, d’après les ventes signées de {PRIX["annees"][0]} à {PRIX["annees"][-1]}.',
         entete('Les prix de l’immobilier, commune par commune', f'Le prix médian au m² dans {len(C)} communes de Côte-d’Or, calculé sur les ventes réellement signées de {PRIX["annees"][0]} à {PRIX["annees"][-1]}.') + f"""
<section class="enveloppe" style="padding-bottom:var(--pas)">
<div class="deux" style="margin-bottom:36px"><label class="champ"><span>Chercher une commune</span><input type="search" data-filtre-prix placeholder="Dijon, Beaune, Talant…" autocomplete="off"></label>
<p style="color:var(--encre-2);margin:0">La médiane sépare les ventes en deux moitiés. La fourchette indique où se situe la moitié centrale des ventes. Ces chiffres donnent un ordre de grandeur : l’étage, l’état, l’extérieur et le diagnostic énergétique font varier le prix d’un bien à l’autre.</p></div>
<table class="prix"><thead><tr><th>Commune</th><th>Appartements</th><th>Maisons</th></tr></thead><tbody>{lignes}</tbody></table>
<p style="color:var(--gris);font-size:.95rem;margin-top:22px">Source : {e(PRIX["source"])}. Dernière vente prise en compte : {d[8:10]}/{d[5:7]}/{d[:4]}.</p>
</section>""" + APPEL, '')

    page('/immobilier-professionnel/', 'Immobilier professionnel à Dijon | GRAVELIN IMMO', 'Fonds de commerce, murs commerciaux, immeubles de rapport et locaux à Dijon : l’immobilier professionnel par GRAVELIN IMMO.',
         entete('Commerces, immeubles et locaux', 'L’agence vend aussi des fonds de commerce, des murs, des immeubles de rapport et des locaux, à Dijon et dans son agglomération.') + f"""
<section class="enveloppe deux" style="padding-bottom:var(--pas)">
<div class="prose"><h2 style="margin-top:0">Ce que nous vendons</h2>
<ul><li>Fonds de commerce : restaurants, bars, tabacs, hôtels, commerces de centre-ville</li><li>Murs commerciaux, libres ou occupés</li><li>Immeubles de rapport</li><li>Locaux d’activité et bureaux</li></ul>
<p>Chaque dossier est étudié avec ses chiffres : bail, loyer, chiffre d’affaires, rentabilité. Les documents sont transmis après signature d’un engagement de confidentialité.</p>
<p>Les dossiers en cours ne sont pas tous publiés. Dites-nous ce que vous cherchez.</p></div>
<div><h2 style="margin-bottom:22px;font-size:1.6rem">Demander les dossiers en cours</h2>{formulaire('Immobilier professionnel', '', 'Envoyer', 'Votre recherche ou le bien à vendre')}</div>
</section>""" + APPEL, '')

def photos_annonces(biens):
    # Les photos des biens en vente sont recopiées telles quelles ; celles des biens retirés disparaissent.
    dest = os.path.join(OUT, 'annonces'); os.makedirs(dest, exist_ok=True)
    garder = {b['ref'] for b in biens}
    for d in os.listdir(dest):
        if d not in garder: shutil.rmtree(os.path.join(dest, d), ignore_errors=True)
    for b in biens:
        src = os.path.join(SITE, 'annonces', b['ref']); dst = os.path.join(dest, b['ref']); os.makedirs(dst, exist_ok=True)
        voulus = set(b['photos']) | {'1-600.webp'}
        for f in os.listdir(dst):
            if f not in voulus: os.remove(os.path.join(dst, f))
        for f in voulus:
            s = os.path.join(src, f); t = os.path.join(dst, f)
            if os.path.exists(s) and (not os.path.exists(t) or os.path.getsize(s) != os.path.getsize(t)): shutil.copy(s, t)

# ================================================================ version 3 : une page par commune
def communes_pages(biens):
    C = PRIX['communes']
    avec_biens = {b['commune'] for b in biens}
    top = sorted(C, key=lambda k: -sum(v['n'] for v in C[k].values()))[:28]
    return sorted(avec_biens | set(top))

def url_commune(n):
    return f"/immobilier/{slug(n)}/"

def pages_communes(biens):
    noms = communes_pages(biens)
    for n in noms:
        ici = [b for b in biens if b['commune'] == n]
        c = PRIX['communes'].get(n, {})
        a, m = c.get('appartement'), c.get('maison')
        def tuile(v, lib):
            if not v: return f'<div><b>Trop peu de ventes</b><span>{lib} : moins de douze ventes sur la période, pas de médiane fiable.</span></div>'
            return (f'<div><b class="num">{eur(v["median"])}/m²</b><span>{lib} : prix médian. La moitié des ventes se situe entre '
                    f'<span class="num">{eur(v["q1"])}</span> et <span class="num">{eur(v["q3"])}</span> le m², sur {v["n"]} ventes.</span></div>')
        prix = ''
        if a or m:
            prix = f"""<section class="bloc fond-papier"><div class="enveloppe">
<div class="titre-rang"><div><h2>Les prix à {e(n)}</h2>
<p class="chapo" style="margin-top:16px">Ventes signées de {PRIX["annees"][0]} à {PRIX["annees"][-1]}, d’après les actes enregistrés par l’État.</p></div>
<a class="lien" href="/prix-immobilier/">Comparer avec les autres communes</a></div>
<div class="preuves" style="grid-template-columns:repeat(2,1fr)">{tuile(a, "Appartements")}{tuile(m, "Maisons")}</div>
</div></section>"""
        if ici:
            chapo = f"{len(ici)} bien{'s' if len(ici) > 1 else ''} à vendre en ce moment à {e(n)} avec l’agence."
            liste = f"""<section class="enveloppe" style="padding-bottom:var(--pas)"><div class="grille">{"".join(carte(b, "eager" if i < 3 else "lazy") for i, b in enumerate(ici))}</div></section>"""
        else:
            chapo = f"Aucun bien de l’agence n’est à vendre à {e(n)} en ce moment. Dites-nous ce que vous cherchez : nous vous prévenons dès qu’un bien arrive."
            liste = f"""<section class="enveloppe deux" style="padding-bottom:var(--pas)"><div><h2>Votre recherche à {e(n)}</h2>
<p class="chapo" style="margin-top:18px">Type de bien, budget, quartier : quelques mots suffisent.</p></div>
<div>{formulaire("Recherche à " + n, "", "Envoyer ma recherche", "Ce que vous cherchez")}</div></section>"""
        corps = entete(f"L’immobilier à {e(n)}", chapo, [("/acheter/", "Biens à vendre"), ("", n)]) + liste + prix + f"""
<section class="bloc"><div class="enveloppe deux"><div><h2>Vous vendez à {e(n)} ?</h2></div>
<div><p class="chapo">Nous partons des ventes signées autour de chez vous, puis nous venons voir le bien. L’estimation est offerte et ne vous engage à rien.</p>
<p style="margin-top:22px"><a class="btn btn-plein" href="/estimation/">Estimer mon bien à {e(n)}</a></p></div></div></section>""" + APPEL
        d = f"Biens à vendre à {n}" + (f", prix médian des appartements {eur(a['median'])}/m²" if a else '') + (f", des maisons {eur(m['median'])}/m²" if m else '') + ". GRAVELIN IMMO, agence immobilière à Dijon."
        page(url_commune(n), f"Immobilier à {n} : biens à vendre et prix au m² | GRAVELIN IMMO", d, corps, '/acheter/')
    return noms

def main():
    biens, maj = charger()
    os.makedirs(os.path.join(OUT, 'assets'), exist_ok=True)
    for f in ('site.css', 'app.js', 'logo.svg'):
        shutil.copy(os.path.join(ICI, f), os.path.join(OUT, 'assets', f))
    shutil.copy(os.path.join(ICI, 'discussion.js'), os.path.join(OUT, 'assets', 'discussion.js'))
    photos_annonces(biens)
    shutil.rmtree(os.path.join(OUT, 'biens'), ignore_errors=True)
    accueil(biens); acheter(biens)
    for b in biens: fiche(b, biens)
    pages_fixes(biens); pages_v2(biens); pages_communes(biens)
    module('/estimation/', 'estimer', 'Estimation offerte de votre bien | GRAVELIN IMMO', True)
    module('/mon-espace/', 'mon-espace', 'Mon espace | GRAVELIN IMMO', False, True)
    module('/admin/', 'admin', 'Espace agence | GRAVELIN IMMO', False, True)
    module('/admin/promesses/', 'promesses', 'Promesses | GRAVELIN IMMO', False, True)
    print(len(biens), 'biens ; mise à jour des annonces :', maj)

main()

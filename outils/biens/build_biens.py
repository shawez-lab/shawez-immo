"""Système d'annonces de shawez-immo.com : une fiche par bien, la page des biens, le sitemap, les liens du site.

    python3 outils/biens/build_biens.py            # relançable ; lancé aussi par outils/sync_annonces.py chaque matin

Sources : annonces.json (les annonces), outils/biens/medias.json (photos HD du Drive, vidéo, visite virtuelle).
Écrit :
- /biens/<ref>-<type>-<commune>/index.html : la fiche de chaque bien (galerie plein écran, vidéo en lecture
  automatique, visite virtuelle si elle existe, prix, honoraires, énergie, description, demande de visite,
  WhatsApp, simulateur de prêt, partage, biens proches, JSON-LD RealEstateListing + Offer, Open Graph) ;
- /biens-a-vendre-dijon/index.html : la page des biens (filtres type, commune, prix, surface ; tri) ;
- /biens-a-vendre/index.html : ancienne adresse « ?fiche=… » → renvoie vers la fiche interne ;
- assets/biens/<ref>/ : photos AVIF + WebP en deux tailles et image de partage og.jpg (créées une seule fois) ;
- sitemap.xml : une ligne par fiche en ligne.
Il remplace aussi, dans les pages du site, les liens vers le catalogue de l'agence par les pages internes.

Règles (textes publics) : jamais d'adresse ni de nom ; aucun chiffre qui ne vienne de l'annonce ; si une donnée manque
(DPE, GES, montant des honoraires…), la fiche le dit au lieu d'inventer.
"""
import datetime as dt, glob, html, json, os, re, sys, urllib.parse

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from commun import P, SITE, ACTIFS, slug, chemin_fiche, charge_annonces, charge_manuels, charge_medias, charge_youtube, enregistre_tailles

JOURS_VENDU = 60
TEL, TEL_AFF, WA = '+33767579228', '07 67 57 92 28', '33767579228'
E = lambda s: html.escape(str(s if s is not None else ''), quote=True)
try:
    from zoneinfo import ZoneInfo
    AUJ = dt.datetime.now(ZoneInfo('Europe/Paris')).date()
except Exception:
    AUJ = dt.date.today()


# ------------------------------------------------------------------------------------------------ données
def nombre(s):
    s = (s or '').replace('\xa0', ' ').replace(' ', '').replace(',', '.')
    m = re.search(r'\d+(?:\.\d+)?', s)
    return float(m.group(0)) if m else None


def fr(x, dec=False):
    if x is None:
        return ''
    if dec and abs(x - round(x)) > 0.01:
        return ('%.2f' % x).rstrip('0').rstrip('.').replace('.', ',')
    return '{:,}'.format(int(round(x))).replace(',', ' ')


def oui(t, k):
    return (t.get(k) or '').upper().startswith('OUI')


def carac(a):
    return {k: v for k, v in (a.get('caracteristiques') or {}).items() if v and not str(v).startswith('TRAD_')}


TERRAINS = ('Terrain', 'Terrain à bâtir')


def titre(a):
    bits = []
    if a.get('pieces') and a['type'] not in TERRAINS + ('Parking', 'Garage', 'Studio'):
        bits.append('%d pièce%s' % (a['pieces'], 's' if a['pieces'] > 1 else ''))
    if a.get('surface'):
        bits.append('%s m²' % fr(a['surface'], True))
    return '%s%s à %s' % (a['type'], (' ' + ', '.join(bits)) if bits else '', a['commune'])


def lieu(a):
    """Commune (code postal) et, pour un bien saisi à la main, le quartier : jamais l'adresse."""
    s = '%s (%s)' % (a['commune'], a['cp']) if a.get('cp') else a['commune']
    return s + (', %s' % a['secteur'] if a.get('secteur') else '')


def atouts(a):
    if a.get('atouts'):
        return list(a['atouts'])
    t, out = carac(a), []
    val = lambda k: nombre(t.get(k, ''))
    terrain = a['type'] in TERRAINS
    if val('surfterrn') and not terrain and val('surfterrn') > 10:
        out.append('Terrain de %s m²%s' % (fr(val('surfterrn')), ', arboré' if oui(t, 'terrain_arbore') else ''))
    if terrain:
        if oui(t, 'terrain_viabilise'): out.append('Terrain viabilisé')
        if oui(t, 'terrain_constructible'): out.append('Constructible')
        if oui(t, 'terrain_raccordement_eau') and oui(t, 'terrain_raccordement_electricite'): out.append('Raccordé à l\'eau et à l\'électricité')
    for k, lib in (('piscine', 'Piscine'), ('terrasse', 'Terrasse'), ('balcon', 'Balcon'), ('loggia', 'Loggia'), ('cave', 'Cave'), ('ascenseur', 'Ascenseur')):
        if oui(t, k): out.append(lib)
    if val('nb_garage'): out.append('Garage' if val('nb_garage') == 1 else '%d garages' % val('nb_garage'))
    if val('nb_parking'): out.append('Place de stationnement' if val('nb_parking') == 1 else '%d places de stationnement' % val('nb_parking'))
    if t.get('mode_chauffage') and 'pompe' in t['mode_chauffage'].lower(): out.append('Pompe à chaleur')
    if t.get('vue') and t['vue'].lower() not in ('rue', 'cour', 'aucune'):
        out.append('Vue : %s' % t['vue'])
    if t.get('exposition'): out.append('Exposition %s' % t['exposition'])
    return out


def chiffres(a):
    """Les chiffres clés affichés en tête de fiche (tous tirés de l'annonce)."""
    t, out = carac(a), []
    val = lambda k: nombre(t.get(k, ''))
    if a.get('surface'):
        out.append(('Surface', '%s m²' % fr(a['surface'], True) + (' (terrain)' if a['type'] in TERRAINS else '')))
    if a.get('pieces') and a['type'] not in TERRAINS:
        out.append(('Pièces', str(a['pieces'])))
    if val('nbchambres'):
        out.append(('Chambres', fr(val('nbchambres'))))
    sdb = (val('nbsdb') or 0) + (val('nbse') or 0)
    if sdb:
        out.append(('Salles d\'eau', fr(sdb)))
    if val('surfterrn') and a['type'] not in TERRAINS and val('surfterrn') > 10:
        out.append(('Terrain', '%s m²' % fr(val('surfterrn'))))
    if 'nbetage' in t and val('nbetage') is not None and a['type'] not in TERRAINS + ('Maison', 'Propriété', 'Château'):
        e = int(val('nbetage'))
        out.append(('Étage', 'Rez-de-chaussée' if e == 0 else ('1er' if e == 1 else '%de' % e)))
    if val('nbniveaux') and a['type'] in ('Maison', 'Propriété', 'Château', 'Duplex', 'Immeuble'):
        out.append(('Niveaux', fr(val('nbniveaux'))))
    return out[:6]


def details(a):
    """Tableau de caractéristiques (libellés lisibles ; seulement ce que l'annonce indique)."""
    t = carac(a)
    L = [('type_cuisine', 'Cuisine'), ('cuisine', 'Type de cuisine'), ('format_chauffage', 'Chauffage'), ('mode_chauffage', 'Énergie de chauffage'),
         ('type_chauffage', 'Émission de chaleur'), ('exposition', 'Exposition'), ('vue', 'Vue'), ('sous_sol', 'Sous-sol'),
         ('mitoyens', 'Mitoyenneté'), ('interphone', 'Interphone'), ('visiophone', 'Visiophone'), ('terrain_piscinable', 'Terrain piscinable'),
         ('terrain_surface_constructible', 'Surface constructible')]
    out = []
    if t.get('surf_carrez') and a['type'] not in TERRAINS:
        out.append(('Surface loi Carrez', t['surf_carrez']))
    for k, lib in L:
        v = t.get(k)
        if v and v.upper() not in ('NON', 'SANS', 'AUTRE'):
            out.append((lib, v[0].upper() + v[1:]))
    return out


def copro(a):
    t = carac(a)
    if not oui(t, 'copropriete'):
        return []
    out = []
    if t.get('copropriete_nb_lot'):
        out.append('Copropriété de %s lots' % t['copropriete_nb_lot'])
    else:
        out.append('Bien en copropriété')
    if t.get('copropriete_quote_part'):
        out.append('Charges courantes annuelles (quote-part) : %s' % t['copropriete_quote_part'])
    if t.get('copropriete_statut_syndicat'):
        out.append('Procédure contre le syndicat : %s' % t['copropriete_statut_syndicat'])
    if t.get('copropriete_plan_sauvegarde') and t['copropriete_plan_sauvegarde'].upper() == 'NON':
        out.append('Pas de plan de sauvegarde')
    return out


DPE_RE = [re.compile(r'\bDPE\s*(?:projet[ée]|projeté)?\s*[:\-]?\s*(?:classe\s*)?([A-G])\b'),
          re.compile(r'consommation énergétique excessive\s*:\s*classe\s*([A-G])\b', re.I),
          re.compile(r'\bclasse énergie\s*[:\-]?\s*([A-G])\b', re.I)]


def dpe(a):
    """Classe énergie : celle de l'annonce si elle est structurée, sinon celle écrite dans la description de l'agence."""
    if a.get('dpe') and re.fullmatch(r'[A-G]', str(a['dpe'])):
        return a['dpe'], 'annonce'
    d = a.get('description_expurgee') or ''
    for r in DPE_RE:
        m = r.search(d)
        if m:
            return m.group(1).upper(), 'description'
    return None, None


def ges(a):
    if a.get('ges') and re.fullmatch(r'[A-G]', str(a['ges'])):
        return a['ges']
    m = re.search(r'\bGES\s*[:\-]?\s*(?:classe\s*)?([A-G])\b', a.get('description_expurgee') or '')
    return m.group(1) if m else None


def honoraires(a):
    """Mention des honoraires d'après l'annonce. Renvoie (texte, complet) ; complet=False si une donnée légale manque."""
    t = a.get('caracteristiques') or {}
    if a.get('honoraires_texte'):
        return a['honoraires_texte'], True
    if 'honoraires_vendeur' in t:
        return 'Honoraires à la charge du vendeur : le prix affiché ne comprend aucun honoraire à votre charge.', True
    if 'prix_honoraires_inclus' in t:
        return ('Prix honoraires d\'agence inclus. Le montant des honoraires et le prix hors honoraires ne figurent pas dans '
                'l\'annonce : ils vous sont communiqués sur simple demande.'), False
    return 'Prix et honoraires sur demande.', False


PHRASES_HORS = re.compile(r'\[adresse|\[nom|contact|conatct|renseignement|visites?\s*:|PATOUILLET|Clément|Gogneau|Marion|'
                          r'\b0\s?[67]\b|\+\s?3\s?3|(?:\d\s?){10}|\bO\s?6\b|agent commercial|mandataire|gratuit', re.I)


def description(a):
    """Description de l'agence, sans adresse, sans nom ni téléphone de collaborateur (phrases retirées entières)."""
    d = re.sub(r'\s+', ' ', a.get('description_expurgee') or '').strip()
    d = re.sub(r'\s\d+(?:\.\d+){2,}\b', '', d)           # codes internes (« 2.16.1.2 »)
    d = re.sub(r'\s+([.,])(?=\s|$)', r'\1', d)            # « accueillante . Un » → « accueillante. Un »
    if not d:
        return []
    phrases = re.split(r'(?<=[.!?])\s+(?=[A-ZÀÂÉÈÊÎÔÛÇ0-9])', d)
    out = [p.strip() for p in phrases if p.strip() and not PHRASES_HORS.search(p) and len(re.findall(r'[A-Za-zÀ-ÿ]', p)) >= 12]
    paras, cur = [], []
    for p in out:
        cur.append(p)
        if sum(len(x) for x in cur) > 380:
            paras.append(' '.join(cur)); cur = []
    if cur:
        paras.append(' '.join(cur))
    return paras


def statut(a):
    return {'en vente': '', 'sous offre': 'Sous offre', 'sous compromis': 'Sous compromis', 'vendu': 'Vendu',
            'retirée': 'N\'est plus disponible'}.get(a['status'], '')


def en_ligne(a):
    """Biens montrés dans la page des biens et dans le sitemap."""
    if not a['photos']['fichiers']:
        return False
    if a['status'] in ACTIFS:
        return True
    if a['status'] == 'vendu':
        return a['status_changed'] >= (AUJ - dt.timedelta(days=JOURS_VENDU)).isoformat()
    return False


# ------------------------------------------------------------------------------------------------ images
def photos(a, medias):
    """[(n, [(largeur, hauteur)…])…] ; crée les tailles manquantes dans assets/biens/<ref>/."""
    from PIL import Image
    ref = a['ref']
    dossier = P('assets', 'biens', ref)
    os.makedirs(dossier, exist_ok=True)
    fichiers = a['photos']['fichiers'] if a['status'] != 'retirée' else a['photos']['fichiers'][:1]
    out = []
    for nf in fichiers:
        n = int(nf.split('.')[0])
        if not glob.glob(os.path.join(dossier, '%d-*.webp' % n)):
            src = P('annonces', ref, nf)
            if not os.path.exists(src):
                continue
            enregistre_tailles(Image.open(src), dossier, n, (640, 1200))
        tailles = []
        for f in sorted(glob.glob(os.path.join(dossier, '%d-*.webp' % n)), key=lambda x: int(re.search(r'-(\d+)\.webp$', x).group(1))):
            with Image.open(f) as im:
                tailles.append(im.size)
        if tailles:
            out.append((n, tailles))
    og = os.path.join(dossier, 'og.jpg')
    if out and not os.path.exists(og):
        n, t = out[0]
        im = Image.open(os.path.join(dossier, '%d-%d.webp' % (n, t[-1][0]))).convert('RGB')
        w, h = im.size
        r = 1200 / 630
        if w / h > r:
            nw = int(h * r); im = im.crop(((w - nw) // 2, 0, (w - nw) // 2 + nw, h))
        else:
            nh = int(w / r); im = im.crop((0, (h - nh) // 2, w, (h - nh) // 2 + nh))
        im.resize((1200, 630), Image.LANCZOS).save(og, 'JPEG', quality=84, optimize=True, progressive=True)
    return out


def picture(ref, n, tailles, alt, sizes, eager=False, cls=''):
    base = '/assets/biens/%s/%d-' % (urllib.parse.quote(ref), n)
    w, h = tailles[-1]
    av = ', '.join('%s%d.avif %dw' % (base, x, x) for x, _ in tailles)
    wb = ', '.join('%s%d.webp %dw' % (base, x, x) for x, _ in tailles)
    attrs = {True: 'fetchpriority="high" decoding="async"', 'auto': 'decoding="async"'}.get(eager, 'loading="lazy" decoding="async"')
    return ('<picture%s><source type="image/avif" srcset="%s" sizes="%s"><source type="image/webp" srcset="%s" sizes="%s">'
            '<img src="%s%d.webp" alt="%s" width="%d" height="%d" %s></picture>'
            % (' class="%s"' % cls if cls else '', av, sizes, wb, sizes, base, tailles[0][0], E(alt), w, h, attrs))


# ------------------------------------------------------------------------------------------------ gabarit du site
def gabarit():
    s = open(P('avis', 'index.html'), encoding='utf-8').read()
    s = re.sub(r'<style id="avis-css">.*?</style>\n?', '', s, flags=re.S)
    s = re.sub(r'<style id="(?:annonces|biens)-css">.*?</style>\n?|<script id="(?:annonces|biens)-js">.*?</script>\n?', '', s, flags=re.S)
    return liens_dans(s)


def page_html(base, *, route, titre_page, desc, canonical, image, main, graph, css, js, robots='index,follow,max-image-preview:large',
              sticky=None, image_alt='', head_extra=''):
    s = base
    s = re.sub(r'<title>.*?</title>', '<title>%s</title>' % E(titre_page), s, count=1)
    s = re.sub(r'<meta name="robots" content="[^"]*">', '<meta name="robots" content="%s">' % robots, s, count=1)
    s = re.sub(r'<link rel="canonical" href="[^"]*">', '<link rel="canonical" href="%s">' % canonical, s, count=1)
    for k in ('og:title', 'twitter:title'):
        s = re.sub(r'(<meta (?:property|name)="%s" content=")[^"]*' % k, lambda m: m.group(1) + E(titre_page), s)
    for k in ('description', 'og:description', 'twitter:description'):
        s = re.sub(r'(<meta (?:property|name)="%s" content=")[^"]*' % k, lambda m: m.group(1) + E(desc), s)
    s = re.sub(r'(<meta property="og:url" content=")[^"]*', lambda m: m.group(1) + canonical, s)
    for k in ('og:image', 'twitter:image'):
        s = re.sub(r'(<meta (?:property|name)="%s" content=")[^"]*' % k, lambda m: m.group(1) + image, s)
    s = s.replace('<meta property="og:type" content="website">', '<meta property="og:type" content="%s">' % ('product' if '/biens/' in canonical else 'website'), 1)
    if image_alt and 'og:image:alt' not in s:
        s = s.replace('<meta name="twitter:card"', '<meta property="og:image:alt" content="%s">\n<meta name="twitter:card"' % E(image_alt), 1)

    def ld(m):
        d = json.loads(m.group(1))
        g = d.get('@graph', [d])
        g[:] = [x for x in g if x.get('@type') in ('WebSite', 'Person', 'RealEstateAgent')]
        g.extend(graph)
        return '<script type="application/ld+json">%s</script>' % json.dumps(d, ensure_ascii=False).replace('</', '<\\/')
    s = re.sub(r'<script type="application/ld\+json">(.*?)</script>', ld, s, count=1, flags=re.S)
    s = re.sub(r'<body data-route="[^"]*"', '<body data-route="%s"' % route, s, count=1)
    s = re.sub(r'<main id="main">.*?</main>', lambda m: '<main id="main">\n%s\n</main>' % main, s, count=1, flags=re.S)
    if sticky is not None:
        s = re.sub(r'(<div id="stickybar"[^>]*>).*?(</div>)', lambda m: m.group(1) + sticky + m.group(2), s, count=1, flags=re.S)
    s = s.replace('</head>', head_extra + '<style id="biens-css">%s</style>\n</head>' % css, 1)
    s = s.replace('</body>', '<script id="biens-js">%s</script>\n</body>' % js, 1)
    return s


def ecrire(chemin, s):
    os.makedirs(os.path.dirname(chemin), exist_ok=True)
    with open(chemin, 'w', encoding='utf-8') as o:
        o.write(s)


# ------------------------------------------------------------------------------------------------ styles et scripts
CSS_COMMUN = """
.bi-crumb{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:0 0 18px;padding:0;list-style:none;font-size:.84rem;color:var(--muted);}
.bi-crumb a{color:inherit;text-decoration:none;border-bottom:1px solid var(--line-strong);}
.bi-crumb li+li::before{content:"/";margin-right:6px;color:var(--dim);}
.bi-st{display:inline-flex;align-items:center;min-height:28px;padding:0 12px;border-radius:999px;font-size:.74rem;font-weight:700;letter-spacing:.06em;text-transform:uppercase;background:var(--ink);color:var(--ground);}
.bi-st.warm{background:#E3B341;color:#0F0E0C;}
.bi-st.off{background:var(--stone-2);color:var(--ink-2);}
.bi-vid{display:inline-flex;align-items:center;gap:6px;min-height:28px;padding:0 11px;border-radius:999px;font-size:.74rem;font-weight:700;letter-spacing:.04em;background:rgba(15,14,12,.72);color:#F3EFE6;backdrop-filter:blur(6px);}
.bi-vid svg{width:12px;height:12px;}
"""

CSS_FICHE = CSS_COMMUN + """
.bf{padding-top:calc(var(--nav-h) + 20px);}
.bf-stage{display:grid;gap:8px;border-radius:var(--r-l);overflow:hidden;position:relative;background:var(--stone);}
.bf-stage.has-v{grid-template-columns:minmax(0,.62fr) minmax(0,1.35fr) minmax(0,.9fr);grid-template-rows:repeat(2,minmax(0,1fr));height:min(74vh,720px);}
.bf-stage.no-v{grid-template-columns:minmax(0,1.6fr) minmax(0,1fr);grid-template-rows:repeat(2,minmax(0,1fr));height:min(70vh,660px);}
.bf-video{grid-row:1/3;position:relative;background:#0F0E0C;overflow:hidden;}
.bf-video video{width:100%;height:100%;object-fit:cover;display:block;}
.bf-emb{min-height:420px;}
.bf-stage{position:relative;}
.bf-igbtn{position:absolute;left:16px;bottom:16px;z-index:3;display:inline-flex;align-items:center;gap:8px;white-space:nowrap;padding:12px 18px;border:0;border-radius:999px;background:rgba(15,14,12,.86);color:#fff;font:600 15px/1 inherit;letter-spacing:.01em;cursor:pointer;box-shadow:0 8px 28px rgba(0,0,0,.28);backdrop-filter:blur(6px);}
.bf-igbtn svg{width:18px;height:18px;}
.bf-igbtn:hover{background:#0F0E0C;}
.bf-igbox{position:fixed;inset:0;z-index:80;background:rgba(10,9,8,.86);display:flex;align-items:center;justify-content:center;padding:16px;}
.bf-igbox[hidden]{display:none;}
.bf-igcard{position:relative;width:min(92vw,400px,calc((100svh - 80px)*.8));}
.bf-igcrop{position:relative;width:100%;aspect-ratio:4/5;overflow:hidden;border-radius:16px;background:#000;}
.bf-igcrop iframe{position:absolute;left:0;top:-56px;width:100%;height:calc(100% + 420px);border:0;background:#000;}
.bf-igclose{position:absolute;right:-6px;top:-46px;width:38px;height:38px;border-radius:50%;border:0;background:#fff;color:#0F0E0C;font:400 26px/1 inherit;cursor:pointer;}
.bf-emb iframe{position:absolute;inset:0;width:100%;height:100%;border:0;display:block;background:#0F0E0C;}
.bf-emb-ig iframe{background:#fff;}
.bf-stage.has-ig{grid-template-columns:minmax(340px,.95fr) minmax(0,1.25fr) minmax(0,.8fr);height:min(88vh,820px);}
.bf-emb .bf-vlab{display:none;}
.bf-vctl{position:absolute;right:12px;bottom:12px;display:flex;gap:8px;z-index:2;}
.bf-vctl button{width:44px;height:44px;border-radius:50%;border:0;background:rgba(15,14,12,.66);color:#F3EFE6;display:grid;place-items:center;cursor:pointer;backdrop-filter:blur(6px);}
.bf-vctl button:focus-visible,.bf-shot:focus-visible,.bf-all:focus-visible{outline:3px solid #E3B341;outline-offset:2px;}
.bf-vctl svg{width:18px;height:18px;}
.bf-vlab{position:absolute;left:12px;top:12px;z-index:2;}
.bf-shot{position:relative;display:block;padding:0;border:0;background:var(--stone-2);cursor:zoom-in;overflow:hidden;min-height:0;}
.bf-shot picture,.bf-shot img{display:block;width:100%;height:100%;object-fit:cover;transition:transform 1.2s var(--ease);}
.bf-shot:hover img{transform:scale(1.03);}
.bf-stage.has-v .bf-shot.main{grid-row:1/3;}
.bf-stage.no-v .bf-shot.main{grid-row:1/3;}
.bf-all{position:absolute;right:14px;bottom:14px;z-index:3;display:inline-flex;align-items:center;gap:8px;min-height:44px;padding:0 18px;border-radius:999px;border:0;background:#F7F6F2;color:#0F0E0C;font-weight:600;font-size:.92rem;cursor:pointer;box-shadow:0 8px 24px rgba(0,0,0,.18);}
.bf-stage.has-v .bf-all{right:14px;}
.bf-strip{display:none;}
.bf-head{display:grid;grid-template-columns:minmax(0,1fr) 380px;gap:clamp(28px,5vw,72px);margin-top:clamp(28px,4vw,48px);align-items:start;}
.bf-title{display:flex;flex-direction:column;gap:14px;}
.bf-title .tags{display:flex;flex-wrap:wrap;gap:8px;align-items:center;}
.bf-title h1{font-family:var(--font-display);font-weight:340;font-size:clamp(2rem,4vw,3.4rem);line-height:1.04;letter-spacing:-.018em;margin:0;text-wrap:balance;}
.bf-title .where{margin:0;color:var(--muted);font-size:1.02rem;}
.bf-keys{display:grid;grid-template-columns:repeat(auto-fit,minmax(118px,1fr));gap:1px;background:var(--line);border:1px solid var(--line);border-radius:var(--r-m);overflow:hidden;margin:clamp(24px,3vw,36px) 0 0;}
.bf-keys div{background:var(--ground);padding:16px 18px;display:flex;flex-direction:column;gap:4px;}
.bf-keys dt{font-size:.74rem;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);font-weight:600;}
.bf-keys dd{margin:0;font-family:var(--font-display);font-size:1.45rem;font-weight:380;}
.bf-card{position:sticky;top:calc(var(--nav-h) + 20px);background:var(--surface);border:1px solid var(--line);border-radius:var(--r-l);padding:26px;display:flex;flex-direction:column;gap:14px;box-shadow:0 24px 60px -32px rgba(15,14,12,.28);}
.bf-price{font-family:var(--font-display);font-weight:380;font-size:clamp(2rem,3vw,2.6rem);line-height:1;margin:0;letter-spacing:-.01em;}
.bf-price small{display:block;margin-top:8px;font-family:var(--font-text);font-size:.86rem;color:var(--muted);letter-spacing:0;}
.bf-old{color:var(--muted);text-decoration:line-through;font-size:.92rem;margin:0;}
.bf-card .btn{width:100%;}
.bf-card.bf-mob{display:none;}
.bf-card .mini{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;}
.bf-card .mini .btn{min-height:48px;padding:0 8px;gap:6px;font-size:.86rem;}
.bf-card .mini svg{flex:0 0 auto;}
.bf-ref{font-size:.82rem;color:var(--muted);margin:0;}
.bf-agent{display:flex;gap:12px;align-items:center;padding-top:14px;border-top:1px solid var(--line);font-size:.9rem;color:var(--ink-2);}
.bf-agent img{width:48px;height:48px;border-radius:50%;object-fit:cover;}
.bf-sec{padding-block:clamp(36px,5vw,64px) 0;}
.bf-sec h2{font-family:var(--font-display);font-weight:340;font-size:clamp(1.5rem,2.4vw,2.1rem);margin:0 0 18px;letter-spacing:-.01em;}
.bf-sec p{max-width:40em;color:var(--ink-2);line-height:1.65;margin:0 0 14px;}
.bf-atouts{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 6px;padding:0;list-style:none;}
.bf-atouts li{border:1px solid var(--line-strong);border-radius:999px;padding:8px 14px;font-size:.9rem;}
.bf-dl{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:0 28px;margin:0;}
.bf-dl div{display:flex;justify-content:space-between;gap:16px;padding:12px 0;border-bottom:1px solid var(--line);font-size:.95rem;}
.bf-dl dt{color:var(--muted);}
.bf-dl dd{margin:0;text-align:right;font-weight:600;}
.bf-nrg{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:24px;}
.bf-scale{display:flex;flex-direction:column;gap:4px;margin:10px 0 0;padding:0;list-style:none;}
.bf-scale li{display:flex;align-items:center;height:26px;border-radius:0 6px 6px 0;padding:0 10px;font-weight:700;font-size:.82rem;color:#0F0E0C;opacity:.42;}
.bf-scale li.on{opacity:1;height:34px;font-size:1rem;box-shadow:0 0 0 2px var(--ink);}
.bf-scale li.on::after{content:attr(data-l);margin-left:auto;font-size:.78rem;font-weight:600;}
.bf-nrg h3{margin:0;font-size:1rem;font-weight:700;}
.bf-nrg .nd{margin:10px 0 0;padding:14px 16px;border:1px dashed var(--line-strong);border-radius:var(--r-m);color:var(--ink-2);font-size:.92rem;}
.bf-note{font-size:.86rem;color:var(--muted);max-width:44em;}
.bf-tour{position:relative;aspect-ratio:16/9;border-radius:var(--r-l);overflow:hidden;background:var(--stone);}
.bf-tour iframe{position:absolute;inset:0;width:100%;height:100%;border:0;}
.bf-sim{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:16px;align-items:end;}
.bf-sim .out{grid-column:1/-1;display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:1px;background:var(--line);border:1px solid var(--line);border-radius:var(--r-m);overflow:hidden;}
.bf-sim .out div{background:var(--surface);padding:16px;}
.bf-sim .out span{display:block;font-size:.76rem;letter-spacing:.08em;text-transform:uppercase;color:var(--muted);font-weight:600;}
.bf-sim .out b{display:block;margin-top:6px;font-family:var(--font-display);font-weight:400;font-size:1.3rem;white-space:nowrap;}
.bf-form .row{display:grid;grid-template-columns:1fr 1fr;gap:14px;}
.bf-form .field{margin-bottom:14px;}
.bf-form label{font-weight:600;font-size:.92rem;}
.bf-form .chk{display:flex;gap:10px;align-items:flex-start;font-size:.86rem;color:var(--ink-2);font-weight:400;}
.bf-form .chk input{width:20px;height:20px;margin-top:2px;flex:0 0 auto;}
.bf-form .hp{position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden;}
#visite{scroll-margin-top:84px;}
.bf-ecrire{margin-top:22px;max-width:860px;margin-inline:auto;}
.bf-ecrire>summary{cursor:pointer;min-height:48px;display:flex;align-items:center;font-weight:600;text-decoration:underline;text-underline-offset:3px;}
.bf-ecrire[open]>summary{margin-bottom:14px;}
.bf-msg{margin-top:12px;padding:14px 16px;border-radius:var(--r-m);font-size:.94rem;}
.bf-msg.ok{background:rgba(63,166,107,.12);border:1px solid rgba(63,166,107,.4);}
.bf-msg.ko{background:rgba(215,34,31,.07);border:1px solid rgba(215,34,31,.3);}
.bf-sims{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px;}
.bf-lb{position:fixed;inset:0;z-index:500;background:#0B0A09;color:#F3EFE6;display:flex;flex-direction:column;}
.bf-lb[hidden]{display:none;}
.bf-lb .top{display:flex;align-items:center;justify-content:space-between;padding:calc(10px + env(safe-area-inset-top)) 14px 10px;gap:12px;}
.bf-lb .cnt{font-size:.92rem;color:#A9A297;font-variant-numeric:tabular-nums;}
.bf-lb button{min-width:44px;min-height:44px;border-radius:999px;border:1px solid rgba(243,239,230,.28);background:transparent;color:#F3EFE6;font:600 .92rem var(--font-text);cursor:pointer;padding:0 14px;}
.bf-lb button:focus-visible{outline:3px solid #E3B341;outline-offset:2px;}
.bf-lb .trk{flex:1;display:flex;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none;overscroll-behavior-x:contain;}
.bf-lb .trk::-webkit-scrollbar{display:none;}
.bf-lb figure{flex:0 0 100%;margin:0;scroll-snap-align:center;display:flex;align-items:center;justify-content:center;padding:0 0 calc(10px + env(safe-area-inset-bottom));}
.bf-lb figure picture,.bf-lb figure img{max-width:100%;max-height:100%;object-fit:contain;display:block;}
.bf-lb .nav{position:absolute;top:50%;transform:translateY(-50%);width:52px;height:52px;padding:0;background:rgba(15,14,12,.6);}
.bf-lb .prev{left:14px;}.bf-lb .next{right:14px;}
.bf-stage.has-phone{grid-template-columns:minmax(0,1.35fr) minmax(0,.8fr) auto;height:min(78vh,760px);}
.bf-stage.has-phone .bf-shot.main{grid-column:1;grid-row:1/3;}
.bf-ph-col{grid-column:3;grid-row:1/3;background:#000;}
.bf-ph{position:relative;height:100%;aspect-ratio:9/16;max-width:100%;}
.bf-ph-scr{position:relative;width:100%;height:100%;overflow:hidden;background:#000;}
.bf-ph-scr video{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block;}
.bf-ph-lien{position:absolute;inset:0;z-index:2;}
.bf-ph-ig{position:absolute;left:12px;bottom:12px;z-index:3;width:40px;height:40px;border-radius:50%;display:grid;place-items:center;background:rgba(15,14,12,.55);color:#fff;pointer-events:none;backdrop-filter:blur(6px);}
.bf-ph-ig svg{width:20px;height:20px;}
.bf-ph-son{position:absolute;right:12px;bottom:12px;z-index:4;width:44px;height:44px;border-radius:50%;border:0;display:grid;place-items:center;background:rgba(15,14,12,.55);color:#fff;cursor:pointer;backdrop-filter:blur(6px);}
.bf-ph-son svg{width:22px;height:22px;}
.bf-ph-son:focus-visible,.bf-ph-lien:focus-visible{outline:3px solid #E3B341;outline-offset:-3px;}
.bf-stage.has-phone .bf-all{right:auto;left:14px;}
.bf-share-ok{font-size:.84rem;color:var(--muted);min-height:1.2em;margin:0;}
@media(max-width:1080px){.bf-head{grid-template-columns:minmax(0,1fr);}.bf-card{position:static;}.bf-card.bf-desk{display:none;}.bf-card.bf-mob{display:flex;margin-top:24px;box-shadow:none;}.bf-sims{grid-template-columns:1fr 1fr;}}
@media(max-width:820px){
 .bf{padding-top:var(--nav-h);}
 .bf>.shell:first-child{padding-inline:0;}
 .bf-crumbs{padding-inline:var(--gutter);}
 .bf-stage{border-radius:0;}
 .bf-stage.has-v{grid-template-columns:1fr;grid-template-rows:auto;height:auto;}
 .bf-stage.has-v .bf-video{grid-row:auto;height:min(78svh,calc(100vw*16/9));}
 .bf-stage.has-ig{grid-template-columns:1fr;height:auto;}
 .bf-stage.has-phone{grid-template-columns:1fr;height:auto;}
 .bf-stage.has-phone .bf-ph-col{grid-column:auto;grid-row:auto;height:auto;display:flex;justify-content:center;}
 .bf-stage.has-phone .bf-ph{height:min(82svh,calc(100vw*16/9));}
 .bf-stage.has-phone .bf-all{position:static;order:2;justify-self:center;margin:0 0 16px;}
 .bf-stage.has-ig .bf-emb{height:calc(100vw*16/9 + 150px);max-height:none;}
 .bf-stage.no-v{display:block;height:auto;}
 .bf-stage .bf-shot:not(.main){display:none;}
 .bf-stage.has-v .bf-shot.main{display:none;}
 .bf-stage.no-v .bf-shot.main{aspect-ratio:4/3;width:100%;}
 .bf-strip{display:flex;gap:8px;overflow-x:auto;scroll-snap-type:x mandatory;padding:8px var(--gutter) 0;scrollbar-width:none;}
 .bf-strip::-webkit-scrollbar{display:none;}
 .bf-strip .bf-shot{flex:0 0 78%;aspect-ratio:4/3;border-radius:var(--r-m);scroll-snap-align:start;}
 .bf-all{bottom:12px;right:12px;}
 .bf-stage.has-v .bf-all{right:auto;left:12px;}
 .bf-lb .nav{display:none;}
 .bf-sims{grid-template-columns:1fr;}
 .bf-form .row{grid-template-columns:1fr;}
 .bf-dl dd{text-align:right;}
}
@media(prefers-reduced-motion:reduce){.bf-shot img{transition:none;}}
"""

CSS_LISTE_SEUL = """
.bl-bar{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:12px;margin:0 0 20px;align-items:end;}
.bl-bar label{display:flex;flex-direction:column;gap:6px;font-size:.78rem;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);}
.bl-bar select,.bl-bar input{min-height:48px;width:100%;padding:0 14px;border:1px solid var(--line-strong);border-radius:var(--r-m);background:var(--surface);color:var(--ink);font:500 .98rem var(--font-text);letter-spacing:0;text-transform:none;}
.bl-bar button{min-height:48px;border-radius:var(--r-m);border:1px solid var(--line-strong);background:transparent;color:var(--ink);font:600 .92rem var(--font-text);cursor:pointer;}
.bl-n{margin:0 0 22px;font-size:.95rem;color:var(--muted);}
.bl-grid{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:clamp(18px,2.4vw,32px);}
.bl-card a{display:flex;flex-direction:column;height:100%;color:inherit;text-decoration:none;}
.bl-card a:focus-visible{outline:3px solid #E3B341;outline-offset:4px;border-radius:var(--r-l);}
.bl-img{position:relative;display:block;aspect-ratio:4/3;border-radius:var(--r-l);overflow:hidden;background:var(--stone);}
.bl-img picture,.bl-img img{width:100%;height:100%;object-fit:cover;display:block;transition:transform 1.1s var(--ease);}
.bl-card a:hover .bl-img img{transform:scale(1.04);}
.bl-tags{position:absolute;left:12px;top:12px;display:flex;gap:6px;flex-wrap:wrap;}
.bl-nb{position:absolute;right:12px;bottom:12px;font-size:.78rem;font-weight:600;padding:6px 10px;border-radius:999px;background:rgba(15,14,12,.66);color:#F3EFE6;}
.bl-body{display:flex;flex-direction:column;gap:6px;padding:16px 4px 0;}
.bl-p{font-family:var(--font-display);font-size:1.55rem;font-weight:400;letter-spacing:-.01em;}
.bl-t{font-size:1.02rem;font-weight:600;}
.bl-c{font-size:.92rem;color:var(--muted);}
.bl-a{font-size:.88rem;color:var(--ink-2);}
.bl-empty{padding:40px 0;color:var(--muted);}
.bl-sold{margin-top:56px;border-top:1px solid var(--line);padding-top:18px;}
.bl-sold summary{cursor:pointer;min-height:44px;display:flex;align-items:center;font-weight:600;}
.bl-sold .bl-grid{margin-top:20px;}
.bl-note{margin:40px 0 0;font-size:.86rem;color:var(--muted);max-width:52em;}
@media(max-width:1100px){.bl-bar{grid-template-columns:repeat(3,minmax(0,1fr));}.bl-grid{grid-template-columns:repeat(2,minmax(0,1fr));}}
@media(max-width:640px){.bl-bar{grid-template-columns:1fr 1fr;}.bl-grid{grid-template-columns:1fr;}}
@media(prefers-reduced-motion:reduce){.bl-img img{transition:none;}}
"""

CSS_LISTE = CSS_COMMUN + CSS_LISTE_SEUL

JS_FICHE = r"""
(function(){
'use strict';
var D=document, $=function(s,c){return (c||D).querySelector(s);}, $$=function(s,c){return Array.prototype.slice.call((c||D).querySelectorAll(s));};
var fiche=$('#bf'); if(!fiche)return;
/* ---- mesures par bien, sans cookie : vue, clic « Visiter ce bien », vidéo regardée, WhatsApp, appel (jamais pendant un essai : ?test) ---- */
var srcRef=$('[data-bien]',fiche), fRef=$('#bf-form',fiche), REF=srcRef?srcRef.getAttribute('data-bien'):(fRef?fRef.getAttribute('data-ref'):'');
var vu={};
var mesure=function(evt,une){ if(!REF||/[?&]test\b/.test(location.search)||(une&&vu[evt]))return; vu[evt]=1;
  try{ fetch('/api/espace/mesure',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ref:REF,evt:evt}),keepalive:true,credentials:'same-origin'}).catch(function(){}); }catch(e){} };
mesure('vue',true);
D.addEventListener('click',function(e){ var a=e.target.closest&&e.target.closest('a,button'); if(!a)return; var h=a.getAttribute('href')||'';
  if(h==='#visite')mesure('visiter',true); else if(h.indexOf('wa.me/')>=0)mesure('whatsapp',true); else if(h.indexOf('tel:')===0)mesure('appel',true);
  else if(a.id==='bf-vs'||a.id==='bf-igbtn')mesure('video',true); },true);
/* bloc « Visitez ce bien en 2 clics » : son script arrive une fois la page affichée (photos et texte d'abord) */
if($('[data-rdv]',fiche)){ var rdvjs=function(){ if(D.getElementById('rdv-js'))return; var sc=D.createElement('script'); sc.id='rdv-js'; sc.src='/assets/rdv.js?v=4'; sc.async=true; D.body.appendChild(sc); };
  if(D.readyState==='complete')setTimeout(rdvjs,0); else window.addEventListener('load',function(){ setTimeout(rdvjs,0); }); }
/* « Visiter ce bien » : la page bouge encore pendant le défilement (photos et vidéo qui se chargent) ; on vérifie l'arrivée */
var vis=$('#visite');
if(vis)D.addEventListener('click',function(e){ var a=e.target.closest&&e.target.closest('a[href="#visite"]'); if(!a)return; e.preventDefault();
  var go=function(doux){ vis.scrollIntoView({behavior:doux?'smooth':'auto',block:'start'}); };
  go(true); try{ history.replaceState(null,'','#visite'); }catch(x){}
  setTimeout(function(){ var r=vis.getBoundingClientRect().top; if(r<-8||r>innerHeight*0.4)go(false); },900); });
/* ---- vidéo : lecture automatique sans le son, en boucle ; pause et son au choix du visiteur ---- */
var v=$('#bf-v');
if(v){
  v.muted=true; v.setAttribute('muted','');
  var essai=function(){ if(!v.dataset.go)return; var p=v.play(); if(p&&p.catch)p.catch(function(){}); };
  /* la vidéo se charge dès que la page est affichée (photos et texte d'abord), puis démarre seule */
  var lance=function(){ if(v.dataset.go)return; v.dataset.go='1'; $$('source[data-src]',v).forEach(function(s){ s.src=s.getAttribute('data-src'); });
    v.setAttribute('autoplay',''); v.preload='auto'; v.load(); essai(); };
  if(D.readyState==='complete'){ setTimeout(lance,50); } else { window.addEventListener('load',function(){ setTimeout(lance,50); }); setTimeout(lance,3500); }
  v.addEventListener('canplay',essai);
  D.addEventListener('visibilitychange',function(){ if(!D.hidden&&!v.dataset.pause)essai(); });
  if('IntersectionObserver' in window){ new IntersectionObserver(function(es){ es.forEach(function(e){ if(e.isIntersecting){ if(!v.dataset.pause)essai(); } else { v.pause(); } }); },{threshold:.15}).observe(v); }
  var bp=$('#bf-vp'), bs=$('#bf-vs');
  if(bp)bp.addEventListener('click',function(){ if(v.paused){ delete v.dataset.pause; essai(); bp.setAttribute('aria-pressed','false'); bp.setAttribute('aria-label','Mettre la vidéo en pause'); bp.innerHTML=bp.dataset.pause; } else { v.dataset.pause='1'; v.pause(); bp.setAttribute('aria-pressed','true'); bp.setAttribute('aria-label','Lire la vidéo'); bp.innerHTML=bp.dataset.play; } });
  if(bs)bs.addEventListener('click',function(){ v.muted=!v.muted; bs.setAttribute('aria-pressed',String(!v.muted)); bs.setAttribute('aria-label',v.muted?'Activer le son':'Couper le son'); bs.innerHTML=v.muted?bs.dataset.off:bs.dataset.on; if(!v.muted)essai(); });
}
/* ---- vidéo intégrée (YouTube ou Instagram) : chargée une fois la page affichée, pour garder la page rapide ---- */
var em=$('#bf-emb');
var igb=$('#bf-igbtn'), igx=$('#bf-igbox');
if(igb&&igx&&em){ var fermeIg=function(){ igx.hidden=true; D.documentElement.style.overflow=''; em.src='about:blank'; delete em.dataset.go; igb.focus(); };
  igb.addEventListener('click',function(){ igx.hidden=false; D.documentElement.style.overflow='hidden'; em.dataset.go='1'; em.src=em.getAttribute('data-src'); $('.bf-igclose',igx).focus(); });
  $('.bf-igclose',igx).addEventListener('click',fermeIg);
  igx.addEventListener('click',function(e){ if(e.target===igx)fermeIg(); });
  D.addEventListener('keydown',function(e){ if(e.key==='Escape'&&!igx.hidden)fermeIg(); });
  em=null; }
if(em){ var charge=function(){ if(em.dataset.go)return; em.dataset.go='1'; em.src=em.getAttribute('data-src'); };
  if(D.readyState==='complete'){ setTimeout(charge,50); } else { window.addEventListener('load',function(){ setTimeout(charge,50); }); setTimeout(charge,3500); } }
/* ---- galerie plein écran : glisser au doigt, flèches, clavier ---- */
var lb=$('#bf-lb'), trk=lb&&$('.trk',lb), cnt=lb&&$('.cnt',lb), last=null, n=0;
function idx(){ return trk?Math.round(trk.scrollLeft/Math.max(1,trk.clientWidth)):0; }
function maj(){ if(cnt)cnt.textContent=(idx()+1)+' / '+n; }
function go(i,smooth){ i=(i+n)%n; trk.scrollTo({left:i*trk.clientWidth,behavior:smooth?'smooth':'auto'}); setTimeout(maj,smooth?350:0); }
function ouvre(i){ if(!lb)return; last=D.activeElement;
  var tp=$('#bf-lb-t'); if(tp&&!trk.children.length){ trk.appendChild(tp.content.cloneNode(true)); n=trk.children.length; }
  lb.hidden=false; D.documentElement.style.overflow='hidden';
  requestAnimationFrame(function(){ go(i,false); maj(); $('.close',lb).focus(); }); }
function ferme(){ lb.hidden=true; D.documentElement.style.overflow=''; if(last&&last.focus)last.focus(); }
$$('[data-photo]').forEach(function(b){ b.addEventListener('click',function(){ ouvre(parseInt(b.getAttribute('data-photo'),10)||0); }); });
if(lb){
  $('.close',lb).addEventListener('click',ferme);
  $('.prev',lb).addEventListener('click',function(){ go(idx()-1,true); });
  $('.next',lb).addEventListener('click',function(){ go(idx()+1,true); });
  trk.addEventListener('scroll',function(){ clearTimeout(trk._t); trk._t=setTimeout(maj,80); },{passive:true});
  lb.addEventListener('keydown',function(e){
    if(e.key==='Escape'){ e.preventDefault(); ferme(); }
    else if(e.key==='ArrowRight'){ e.preventDefault(); go(idx()+1,true); }
    else if(e.key==='ArrowLeft'){ e.preventDefault(); go(idx()-1,true); }
    else if(e.key==='Tab'){ var f=$$('button',lb), a=f[0], z=f[f.length-1]; if(e.shiftKey&&D.activeElement===a){e.preventDefault();z.focus();} else if(!e.shiftKey&&D.activeElement===z){e.preventDefault();a.focus();} }
  });
}
/* ---- partage ---- */
$$('.bf-share').forEach(function(sh){ var ok=sh.closest('.bf-card')&&$('.bf-share-ok',sh.closest('.bf-card'));
sh.addEventListener('click',function(){ var d={title:D.title,url:location.href.split('#')[0]};
  if(navigator.share){ navigator.share(d).catch(function(){}); return; }
  if(navigator.clipboard){ navigator.clipboard.writeText(d.url).then(function(){ if(ok)ok.textContent='Lien copié.'; },function(){ if(ok)ok.textContent=d.url; }); } else if(ok){ ok.textContent=d.url; } }); });
/* ---- simulateur de prêt (mêmes taux que la page Simulateur) ---- */
var sim=$('#bf-sim');
if(sim){
  var TAUX=JSON.parse(sim.getAttribute('data-taux')), eur=new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR',maximumFractionDigits:0});
  var num=function(id){ var d=($('#'+id).value||'').replace(/[^\d]/g,''); return d?parseInt(d,10):0; };
  var calc=function(){ var prix=num('bs-prix'), ap=num('bs-apport'), ans=parseInt($('#bs-duree').value,10)||25, f=$('#bs-type').value==='neuf'?0.025:0.075;
    var notaire=prix*f, cap=Math.max(0,prix+notaire-ap), r=TAUX[ans]/100/12, nb=ans*12, m=cap>0?cap*r/(1-Math.pow(1+r,-nb)):0;
    $('#bs-m').textContent=prix?eur.format(Math.round(m))+' / mois':'—'; $('#bs-n').textContent=prix?eur.format(Math.round(notaire)):'—';
    $('#bs-c').textContent=prix?eur.format(Math.round(cap)):'—'; $('#bs-r').textContent=prix&&m?eur.format(Math.ceil(m/0.35/10)*10)+' / mois':'—';
    $('#bs-t').textContent='Sur '+ans+' ans à '+String(TAUX[ans]).replace('.',',')+' % (taux indicatif au '+sim.getAttribute('data-date')+', hors assurance), frais de notaire estimés à '+(f*100).toString().replace('.',',')+' % du prix. À confirmer avec votre banque ou votre courtier.'; };
  sim.addEventListener('input',calc); sim.addEventListener('change',calc); calc();
}
/* ---- demande de visite : /api/lead (même circuit que les autres demandes) ; sinon WhatsApp ou e-mail ---- */
var form=$('#bf-form');
if(form){
  var msg=$('#bf-fmsg'), t0=Date.now();
  var val=function(n){ var el=form.elements[n]; return el?(el.type==='checkbox'?el.checked:(el.value||'').trim()):''; };
  var repli=function(){ var txt='Bonjour Shawez, je souhaite visiter le bien réf. '+form.dataset.ref+' ('+form.dataset.titre+') : '+location.href.split('#')[0]+'\n'+val('prenom')+' '+val('nom')+(val('telephone')?' — '+val('telephone'):'')+(val('message')?'\n'+val('message'):'');
    return '<p style="margin:10px 0 0;display:flex;flex-wrap:wrap;gap:8px;"><a class="btn btn-primary" href="https://wa.me/'+form.dataset.wa+'?text='+encodeURIComponent(txt)+'" target="_blank" rel="noopener">Envoyer par WhatsApp</a><a class="btn" href="mailto:shawez@gravelin-immo.com?subject='+encodeURIComponent('Visite réf. '+form.dataset.ref)+'&body='+encodeURIComponent(txt)+'">Envoyer par e-mail</a></p>'; };
  var etat=function(cls,h){ msg.hidden=false; msg.className='bf-msg '+cls; msg.innerHTML=h; msg.focus&&msg.focus(); };
  form.addEventListener('submit',function(e){ e.preventDefault();
    var manque=[]; ['prenom','nom','email'].forEach(function(k){ if(!val(k))manque.push(k); });
    if(val('email')&&!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(val('email')))manque.push('email');
    if(!val('consent'))manque.push('consent');
    $$('.field',form).forEach(function(f){ f.classList.remove('err'); });
    if(manque.length){ manque.forEach(function(k){ var el=form.elements[k]; if(el){ var f=el.closest('.field'); if(f)f.classList.add('err'); } }); etat('ko','Merci de compléter : prénom, nom, e-mail valide et accord pour être recontacté.'); var el=form.elements[manque[0]]; if(el)el.focus(); return; }
    var b=$('button[type=submit]',form); b.disabled=true; etat('','Envoi de votre demande…');
    var corps={formulaire:'visite-bien',bien_ref:form.dataset.ref,bien_titre:form.dataset.titre,bien_url:location.href.split('#')[0].split('?')[0],type:form.dataset.type,commune:form.dataset.commune,
      prenom:val('prenom'),nom:val('nom'),email:val('email'),telephone:val('telephone').replace(/\s/g,''),creneau:val('creneau'),message:val('message'),
      consent_notice:!!val('consent'),consent_newsletter:false,website:val('website')+(Date.now()-t0<2500?'':''),source:'shawez-immo.com',page:location.href.split('?')[0],ts:new Date().toISOString(),schema:'lead.v1'};
    var ctrl=('AbortController' in window)?new AbortController():null, t=setTimeout(function(){ if(ctrl)ctrl.abort(); },12000);
    fetch('/api/lead',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(corps),signal:ctrl?ctrl.signal:undefined})
    .then(function(r){ clearTimeout(t); if(r.status>=200&&r.status<300)return r.json().catch(function(){return {};}); throw new Error('http '+r.status); })
    .then(function(j){ try{if(window.oaiLead)window.oaiLead(j.reference);}catch(x){} form.reset(); b.disabled=false; etat('ok','<b>Demande reçue.</b> '+(j.reference?'Référence '+j.reference+'. ':'')+'Shawez vous rappelle pour fixer la visite.'); })
    .catch(function(){ clearTimeout(t); b.disabled=false; etat('ko','<b>La transmission automatique n\'a pas abouti.</b> Envoyez votre demande directement, tout est prêt :'+repli()); });
  });
}
})();
"""

JS_LISTE = r"""
(function(){
'use strict';
var g=document.getElementById('bl-grid'); if(!g)return;
var f={type:document.getElementById('bl-type'),commune:document.getElementById('bl-commune'),pmin:document.getElementById('bl-pmin'),pmax:document.getElementById('bl-pmax'),smin:document.getElementById('bl-smin'),tri:document.getElementById('bl-tri')};
var n=document.getElementById('bl-n'), vide=document.getElementById('bl-vide'), items=Array.prototype.slice.call(g.children);
var num=function(el){ var d=(el.value||'').replace(/[^\d]/g,''); return d?parseInt(d,10):0; };
try{ var q=new URLSearchParams(location.search);
  if(q.get('type'))f.type.value=q.get('type'); if(q.get('commune'))f.commune.value=q.get('commune');
  if(q.get('prix_min'))f.pmin.value=q.get('prix_min'); if(q.get('prix_max'))f.pmax.value=q.get('prix_max');
  if(q.get('surface_min'))f.smin.value=q.get('surface_min'); if(q.get('tri'))f.tri.value=q.get('tri'); }catch(e){}
function maj(){
  var t=f.type.value, c=f.commune.value, a=num(f.pmin), b=num(f.pmax), s=num(f.smin), k=0;
  items.forEach(function(li){ var p=+li.dataset.prix||0, su=+li.dataset.surface||0;
    var ok=(!t||li.dataset.type===t)&&(!c||li.dataset.commune===c)&&(!a||(p&&p>=a))&&(!b||(p&&p<=b))&&(!s||su>=s);
    li.hidden=!ok; if(ok)k++; });
  var tri=f.tri.value, cle={recent:function(x){return -(+x.dataset.ordre);},'prix-asc':function(x){return +x.dataset.prix||9e12;},'prix-desc':function(x){return -(+x.dataset.prix||0);},surface:function(x){return -(+x.dataset.surface||0);}}[tri]||function(x){return -(+x.dataset.ordre);};
  items.slice().sort(function(x,y){return cle(x)-cle(y);}).forEach(function(li){ g.appendChild(li); });
  n.textContent=k+' bien'+(k>1?'s':'')+' à vendre'; vide.hidden=k>0;
  try{ var u=new URL(location.href); [['type',t],['commune',c],['prix_min',a||''],['prix_max',b||''],['surface_min',s||''],['tri',tri==='recent'?'':tri]].forEach(function(x){ if(x[1])u.searchParams.set(x[0],x[1]); else u.searchParams.delete(x[0]); }); history.replaceState(null,'',u); }catch(e){}
}
Object.keys(f).forEach(function(k){ f[k].addEventListener(f[k].tagName==='INPUT'?'input':'change',maj); });
var r=document.getElementById('bl-reset'); if(r)r.addEventListener('click',function(){ Object.keys(f).forEach(function(k){ f[k].value=k==='tri'?'recent':''; }); maj(); });
maj();
})();
"""

ICO = {
    'pause': '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>',
    'play': '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13l11-6.5z"/></svg>',
    'mute': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M17 9l4 6M21 9l-4 6"/></svg>',
    'son': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M17 8.5a5 5 0 0 1 0 7M19.5 6a8.5 8.5 0 0 1 0 12"/></svg>',
    'cam': '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M4 6h11a2 2 0 0 1 2 2v1.5l4-2.5v10l-4-2.5V16a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z"/></svg>',
    'tel': '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.6a2 2 0 0 1-.5 2.1L8 9.7a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.8.3 1.7.5 2.6.7a2 2 0 0 1 1.7 2z"/></svg>',
    'wa': '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 11.5a8.4 8.4 0 0 1-12.6 7.3L3 21l2.2-5.2A8.4 8.4 0 1 1 21 11.5z"/></svg>',
    'share': '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12M7 8l5-5 5 5M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/></svg>',
    'ig': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>',
    'grid': '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="3" y="3" width="8" height="8" rx="1.5"/><rect x="13" y="3" width="8" height="8" rx="1.5"/><rect x="3" y="13" width="8" height="8" rx="1.5"/><rect x="13" y="13" width="8" height="8" rx="1.5"/></svg>',
}

DPE_COUL = {'A': '#009C6D', 'B': '#52B153', 'C': '#A5CC74', 'D': '#F4E70F', 'E': '#F0B40F', 'F': '#EB8235', 'G': '#D7221F'}
GES_COUL = {'A': '#F6EDFD', 'B': '#E4C7FB', 'C': '#D5AAF6', 'D': '#CB95F3', 'E': '#BA72EF', 'F': '#A74DEB', 'G': '#8A19DF'}
SCHEMA = {'Appartement': 'Apartment', 'Duplex': 'Apartment', 'Studio': 'Apartment', 'Loft': 'Apartment', 'Maison': 'SingleFamilyResidence',
          'Propriété': 'SingleFamilyResidence', 'Château': 'SingleFamilyResidence', 'Viager': 'SingleFamilyResidence', 'Immeuble': 'Residence'}


def taux_simulateur():
    s = open(P('simulateur-pret-immobilier-dijon', 'index.html'), encoding='utf-8').read()
    t = re.search(r'var TAUX=\{15:([\d.]+),20:([\d.]+),25:([\d.]+)\};', s)
    d = re.search(r"var TAUX_DATE='([^']+)'", s)
    return ({15: float(t.group(1)), 20: float(t.group(2)), 25: float(t.group(3))}, d.group(1)) if t and d else (None, None)


def echelle(lettre, couleurs, label):
    lis = []
    for i, L in enumerate('ABCDEFG'):
        on = L == lettre
        lis.append('<li style="background:%s;width:%d%%"%s%s>%s</li>' % (couleurs[L], 34 + i * 9, ' class="on"' if on else '',
                                                                       ' data-l="%s"' % E(label) if on else '', L))
    return '<ul class="bf-scale" aria-hidden="true">%s</ul>' % ''.join(lis)


# ------------------------------------------------------------------------------------------------ fiche
def sources_video(vref, video):
    """MP4 H.264 d'abord (Safari, iPhone, Chrome, Edge), WebM VP9 ensuite (navigateurs sans H.264)."""
    base = '/assets/biens/%s/' % urllib.parse.quote(vref)
    out = '<source data-src="%s%s" type=\'video/mp4; codecs="avc1.640028, mp4a.40.2"\'>' % (base, video['fichier'])
    if video.get('webm'):
        out += '<source data-src="%s%s" type=\'video/webm; codecs="vp9, opus"\'>' % (base, video['webm'])
    return out


def integration(ref, medias):
    """Vidéo intégrée du bien : YouTube d'abord (lecture automatique sans le son), sinon le Reel Instagram.
    Champs de medias.json : « youtube » (identifiant, ou fichier outils/biens/youtube.json) et « instagram » (liste de Reels,
    le premier est affiché). Renvoie ('youtube', id), ('instagram', code) ou None (la vidéo hébergée sert alors de secours)."""
    m = medias.get(ref) or {}
    for x in (m, medias.get(m.get('video_de')) or {}):
        if x.get('youtube'):
            return 'youtube', x['youtube']
        if x.get('instagram'):
            return 'instagram', x['instagram'][0]
    return None


def a_video(ref, medias):
    m = medias.get(ref) or {}
    return bool(m.get('video') or m.get('video_de') or integration(ref, medias))


def bloc_integration(emb, t):
    if emb[0] == 'youtube':
        i = urllib.parse.quote(emb[1])
        src = 'https://www.youtube-nocookie.com/embed/%s?autoplay=1&mute=1&playsinline=1&loop=1&playlist=%s&rel=0&modestbranding=1' % (i, i)
        allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen'
    else:
        src = 'https://www.instagram.com/reel/%s/embed/' % urllib.parse.quote(emb[1])
        allow = 'autoplay; encrypted-media; picture-in-picture; clipboard-write; fullscreen'
    if emb[0] == 'instagram':
        # Instagram : pas de lecteur brut dans la page (en-tête, mentions J'aime, image trop large).
        # Un bouton « Voir la vidéo » ouvre une fenêtre propre, format vertical, recadrée sur la vidéo seule.
        return ('<button type="button" class="bf-igbtn" id="bf-igbtn">%s<span>Voir la vidéo du bien</span></button>'
                '<div class="bf-igbox" id="bf-igbox" role="dialog" aria-modal="true" aria-label="Vidéo du bien" hidden>'
                '<div class="bf-igcard"><button type="button" class="bf-igclose" aria-label="Fermer la vidéo">×</button>'
                '<div class="bf-igcrop"><iframe id="bf-emb" data-src="%s" data-clic="1" title="Vidéo du bien : %s" allow="%s" '
                'allowfullscreen scrolling="no" referrerpolicy="strict-origin-when-cross-origin"></iframe></div></div></div>'
                % (ICO['play'], E(src), E(t), allow))
    return ('<div class="bf-video bf-emb bf-emb-%s"><span class="bf-vlab bi-vid">%sVisite en vidéo</span>'
            '<iframe id="bf-emb" data-src="%s" title="Vidéo du bien : %s" allow="%s" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div>'
            % ('yt' if emb[0] == 'youtube' else 'ig', ICO['cam'], E(src), E(t), allow))


def telephone(ref, vref, video, ig, ph, t):
    """Cadre vertical (9:16) à droite des photos : la vraie vidéo du bien, rien d'autre. Elle démarre seule dès l'arrivée
    sur la page, sans le son (seule lecture automatique permise par les navigateurs), en boucle ; bouton du son en bas à
    droite ; un clic sur la vidéo ouvre le Reel sur Instagram. Sans fichier vidéo hébergé : pas de cadre (jamais de photos
    qui défilent à la place de la vidéo)."""
    if not video:
        return ''
    ecran = ('<video id="bf-v" poster="/assets/biens/%s/%s" width="%d" height="%d" muted loop playsinline autoplay preload="metadata" '
             'disablepictureinpicture aria-label="Vidéo du bien : %s">%s</video>'
             % (urllib.parse.quote(vref), video['poster'], video['largeur'], video['hauteur'], E(t), sources_video(vref, video)))
    son = ('<button type="button" class="bf-ph-son" id="bf-vs" aria-pressed="false" aria-label="Activer le son" data-on=\'%s\' data-off=\'%s\'>%s</button>'
           % (ICO['son'], ICO['mute'], ICO['mute']))
    lien = ('<a class="bf-ph-lien" href="https://www.instagram.com/reel/%s/" target="_blank" rel="noopener" aria-label="Voir la vidéo du bien sur Instagram"></a>'
            '<span class="bf-ph-ig">%s</span>' % (urllib.parse.quote(ig), ICO['ig'])) if ig else ''
    return '<div class="bf-video bf-ph-col"><div class="bf-ph"><div class="bf-ph-scr">%s%s%s</div></div></div>' % (ecran, lien, son)


def carte(a, ph, medias, eager=False):
    n, t = ph[0]
    st = statut(a)
    cls = 'warm' if a['status'] in ('sous offre', 'sous compromis') else ''
    tags = ''
    if st:
        tags += '<span class="bi-st %s">%s</span>' % (cls, E(st))
    if a_video(a['ref'], medias):
        tags += '<span class="bi-vid">%sVidéo</span>' % ICO['cam']
    at = ', '.join(atouts(a)[:3])
    prix = ('%s €' % fr(a['prix'])) if a.get('prix') else 'Prix sur demande'
    return ('<a href="%s"><span class="bl-img">%s<span class="bl-tags">%s</span><span class="bl-nb">%d photo%s</span></span>'
            '<span class="bl-body"><span class="bl-p">%s</span><span class="bl-t">%s</span><span class="bl-c">%s</span>%s</span></a>'
            % (chemin_fiche(a), picture(a['ref'], n, t, titre(a), '(max-width:640px) 100vw, (max-width:1100px) 50vw, 420px', eager=eager), tags,
               len(a['photos']['fichiers']), 's' if len(a['photos']['fichiers']) > 1 else '', prix, E(titre(a)),
               E(lieu(a)),
               ('<span class="bl-a">%s</span>' % E(at)) if at else ''))


# ------------------------------------------------------------------------------------------------ SEO des fiches
# Titres ≤ 60 caractères et uniques, descriptions ≤ 160 ; une annonce publiée deux fois (même bien, deux références)
# pointe sa canonical vers la première et sort du sitemap (contenu dupliqué).
_TITRES, _DOUBLONS = set(), {}


def titre_court(a):
    bits = []
    if a.get('surface'):
        bits.append('%s m²' % fr(round(a['surface']), True))
    return '%s%s à %s' % (a['type'], (' ' + ', '.join(bits)) if bits else '', a['commune'])


def titre_seo(a, prix):
    p = (' — %s €' % fr(prix)) if prix else ''
    cands = ['%s%s | Shawez Ali' % (titre(a), p), '%s%s' % (titre(a), p), '%s%s' % (titre_court(a), p), titre_court(a)]
    ok = [c for c in cands if len(c) <= 60] or [titre_court(a)[:60]]
    cle = (titre_court(a), prix)
    if cle not in _TITRES and a['ref'] not in _DOUBLONS:
        _TITRES.add(cle)
        return ok[0]
    c = '%s%s, réf. %s' % (titre_court(a), p, a['ref'])
    return c if len(c) <= 60 else '%s, réf. %s' % (titre_court(a), a['ref'])
    c = '%s%s, réf. %s' % (titre_court(a), p, a['ref'])
    if len(c) > 60:
        c = '%s, réf. %s' % (titre_court(a), a['ref'])
    _TITRES.add(cle(c))
    return c


def desc_seo(t, prix, at, ref):
    px = (' : %s €' % fr(prix)) if prix else ''
    for n in (3, 2, 1, 0):
        d = '%s%s. %s Visite avec Shawez Ali, agent immobilier à Dijon. Réf. %s.' % (t, px, (', '.join(at[:n]) + '.') if at and n else '', ref)
        d = d.replace('.  ', '. ')
        if len(d) <= 160:
            return d
    return ('%s%s. Visite avec Shawez Ali, agent immobilier. Réf. %s.' % (t, px, ref))[:160]


def doublons(annonces):
    """{ref en double: ref gardée} — même type, commune, surface, prix et début de description."""
    vus, out = {}, {}
    ordre = sorted(annonces, key=lambda a: (a['status'] not in ACTIFS, a['status'] != 'en vente', not str(a['ref']).isdigit(), str(a['ref'])))
    for a in ordre:
        cle = (a['type'], a['commune'], a.get('surface'), a.get('prix'), re.sub(r'\s+', ' ', a.get('description_expurgee') or '')[:200])
        if not a.get('surface') or not a.get('prix'):
            continue
        if cle in vus:
            out[a['ref']] = vus[cle]
        else:
            vus[cle] = a
    return out


def fiche(a, ph, medias, base, voisins, taux):
    ref, m = a['ref'], medias.get(a['ref']) or {}
    url = SITE + chemin_fiche(a)
    canon = SITE + chemin_fiche(_DOUBLONS[ref]) if ref in _DOUBLONS else url
    t = titre(a)
    st = statut(a)
    actif = a['status'] in ACTIFS
    video = m.get('video') or (medias.get(m['video_de']) or {}).get('video') if m.get('video_de') else m.get('video')
    vref = m.get('video_de') or ref
    emb = integration(ref, medias)
    ig = emb[1] if emb and emb[0] == 'instagram' else None
    if emb and emb[0] == 'youtube':
        video = None          # YouTube en tête de fiche
    elif emb:
        emb = None            # Instagram : la vidéo hébergée (ou les photos) tourne dans l'écran téléphone, le clic ouvre le Reel
    tour = (m.get('visite_virtuelle') or {}).get('url') or a.get('visite_virtuelle')
    prix = a.get('prix')
    hon, hon_complet = honoraires(a)
    lettre, src_dpe = dpe(a)
    lg = ges(a)
    desc_paras = description(a)
    at = atouts(a)

    # --- scène : vidéo + photos
    nb = len(ph)
    shots = []
    for i, (n, tl) in enumerate(ph[:4] if video or emb else ph[:3]):
        cls = 'bf-shot main' if i == 0 else 'bf-shot'
        shots.append('<button type="button" class="%s" data-photo="%d" aria-label="Agrandir la photo %d sur %d">%s</button>'
                     % (cls, i, i + 1, nb, picture(ref, n, tl, '%s, photo %d' % (t, i + 1),
                                                   '(max-width:820px) 100vw, 60vw' if i == 0 else '(max-width:820px) 78vw, 30vw', eager=(i == 0 and not video))))
    igbloc = ''
    if video:
        shots = shots[:3]
        vid = telephone(ref, vref, video, ig, ph, t)
    elif emb:
        shots = shots[:3]
        vid = bloc_integration(emb, t)
    else:
        vid = ''
    toutes = ('<button type="button" class="bf-all" data-photo="0">%sLes %d photos</button>' % (ICO['grid'], nb)) if nb > 1 else ''
    stage = '<div class="bf-stage %s">%s%s%s%s</div>' % ('has-v has-phone' if video else 'has-v' if emb else 'no-v', ''.join(shots), toutes, vid, igbloc)
    strip = ('<div class="bf-strip" aria-label="Photos du bien">%s</div>'
             % ''.join('<button type="button" class="bf-shot" data-photo="%d" aria-label="Agrandir la photo %d sur %d">%s</button>'
                       % (i, i + 1, nb, picture(ref, n, tl, '%s, photo %d' % (t, i + 1), '78vw')) for i, (n, tl) in enumerate(ph[:8]))) if nb > 1 else ''
    lightbox = ('<div class="bf-lb" id="bf-lb" role="dialog" aria-modal="true" aria-label="Photos du bien" hidden>'
                '<div class="top"><span class="cnt" aria-live="polite">1 / %d</span><button type="button" class="close">Fermer</button></div>'
                '<div class="trk"></div><template id="bf-lb-t">%s</template><button type="button" class="nav prev" aria-label="Photo précédente">←</button>'
                '<button type="button" class="nav next" aria-label="Photo suivante">→</button></div>'
                % (nb, ''.join('<figure>%s</figure>' % picture(ref, n, tl, '%s, photo %d sur %d' % (t, i + 1, nb), '100vw') for i, (n, tl) in enumerate(ph))))

    # --- en-tête + carte prix
    tags = '<span class="bi-st %s">%s</span>' % ('warm' if a['status'] in ('sous offre', 'sous compromis') else 'off', E(st)) if st else ''
    for mtn in a.get('mentions_agence') or []:
        if mtn in ('Exclusivité', 'Coup de coeur', 'Prix en baisse', 'Nouveauté') and a['status'] == 'en vente':
            tags += '<span class="bi-st off">%s</span>' % E(mtn.replace('Coup de coeur', 'Coup de cœur'))
    keys = ''.join('<div><dt>%s</dt><dd>%s</dd></div>' % (E(k), E(v)) for k, v in chiffres(a))
    au_m2 = (' · soit %s €/m²' % fr(prix / a['surface'])) if prix and a.get('surface') and a['type'] not in TERRAINS else ''
    prix_html = ('<p class="bf-price">%s €<small>%s%s</small></p>' % (fr(prix), 'Honoraires inclus' if 'prix_honoraires_inclus' in (a.get('caracteristiques') or {}) else 'Prix de vente', au_m2)
                 if prix else '<p class="bf-price">Prix sur demande</p>')
    ancien = ('<p class="bf-old">%s €</p>' % fr(a['prix_precedent'])) if a.get('prix_precedent') and prix and a['prix_precedent'] > prix else ''
    wa_txt = 'Bonjour Shawez, je suis intéressé(e) par le bien réf. %s (%s) : %s' % (ref, t, url)
    wa = 'https://wa.me/%s?text=%s' % (WA, urllib.parse.quote(wa_txt))
    cta = 'Visiter ce bien' if actif else 'Être recontacté'
    card = ('<aside class="bf-card %s" aria-label="Prix et contact">%s%s<p class="bf-note" style="margin:0">%s</p>'
            '<a class="btn btn-primary btn-lg" href="#visite">%s</a>'
            '<div class="mini"><a class="btn" href="%s" target="_blank" rel="noopener" aria-label="Écrire à Shawez sur WhatsApp">%s<span>WhatsApp</span></a>'
            '<a class="btn" href="tel:%s" aria-label="Appeler Shawez au %s">%s<span>Appeler</span></a>'
            '<button type="button" class="btn bf-share" aria-label="Partager ce bien">%s<span>Partager</span></button></div>'
            '<p class="bf-share-ok" aria-live="polite"></p>'
            '<p class="bf-ref">Référence %s · mandat de l\'agence GRAVELIN IMMO</p>'
            '<div class="bf-agent"><img src="/assets/biens/shawez-ali-96.webp" alt="" width="48" height="48" loading="lazy" decoding="async">'
            '<span><b>Shawez Ali</b>, agent immobilier<br>Je vous fais visiter, du lundi au samedi.</span></div></aside>'
            % ('{cls}', prix_html, ancien, E(hon), cta, wa, ICO['wa'], TEL, TEL_AFF, ICO['tel'], ICO['share'], E(ref)))

    entete = ('<div class="bf-title"><div class="tags">%s</div><h1>%s</h1><p class="where">%s · Réf. %s</p></div><dl class="bf-keys">%s</dl>'
              % (tags, E(t), E(lieu(a)), E(ref), keys)) + card.replace('{cls}', 'bf-mob')

    # --- sections
    secs = []
    if st and not actif:
        secs.append('<section class="bf-sec"><p class="bf-note" style="font-size:1rem;color:var(--ink)"><b>%s.</b> Ce bien n\'est plus proposé à la vente. '
                    'Les biens disponibles : <a class="link" href="/biens-a-vendre-dijon/">tous les biens à vendre</a>.</p></section>' % E(st))
    if desc_paras or at:
        secs.append('<section class="bf-sec" aria-labelledby="h-bien"><h2 id="h-bien">Le bien</h2>%s%s</section>'
                    % (('<ul class="bf-atouts">%s</ul>' % ''.join('<li>%s</li>' % E(x) for x in at)) if at else '',
                       ''.join('<p>%s</p>' % E(p) for p in desc_paras)))
    dts = details(a)
    cp = copro(a)
    if dts or cp:
        secs.append('<section class="bf-sec" aria-labelledby="h-car"><h2 id="h-car">Caractéristiques</h2><dl class="bf-dl">%s</dl>%s</section>'
                    % (''.join('<div><dt>%s</dt><dd>%s</dd></div>' % (E(k), E(v)) for k, v in dts),
                       ('<p class="bf-note" style="margin-top:16px">%s.</p>' % E(' · '.join(cp))) if cp else ''))
    if tour:
        secs.append('<section class="bf-sec" aria-labelledby="h-vv"><h2 id="h-vv">Visite virtuelle</h2><div class="bf-tour">'
                    '<iframe src="%s" title="Visite virtuelle du bien" loading="lazy" allow="fullscreen; xr-spatial-tracking" allowfullscreen></iframe></div></section>' % E(tour))
    # énergie
    if a['type'] not in TERRAINS:
        nd = 'pas encore reçu' if a.get('manuel') else 'Non indiquée dans l\'annonce'
        dpe_bloc = (('<h3>Classe énergie (DPE) : %s</h3>%s%s' % (lettre, echelle(lettre, DPE_COUL, 'Énergie'),
                     '<p class="bf-note" style="margin-top:8px">Classe indiquée dans la description de l\'annonce.</p>' if src_dpe == 'description' else ''))
                    if lettre else '<h3>Classe énergie (DPE)</h3><p class="nd">%s : demandez le diagnostic, je vous l\'envoie.</p>' % ('Diagnostic ' + nd if a.get('manuel') else nd))
        ges_bloc = (('<h3>Émissions de gaz à effet de serre (GES) : %s</h3>%s' % (lg, echelle(lg, GES_COUL, 'Climat')))
                    if lg else '<h3>Émissions de gaz à effet de serre (GES)</h3><p class="nd">%s : demandez le diagnostic, je vous l\'envoie.</p>' % ('Diagnostic ' + nd if a.get('manuel') else 'Non indiquées dans l\'annonce'))
        cout = ('<p class="bf-note" style="margin-top:18px">Montant estimé des dépenses annuelles d\'énergie pour un usage standard : %s.</p>' % E(a['energie'])) if a.get('energie') else ''
        secs.append('<section class="bf-sec" aria-labelledby="h-nrg"><h2 id="h-nrg">Performance énergétique</h2><div class="bf-nrg"><div>%s</div><div>%s</div></div>%s'
                    '<p class="bf-note">Les informations sur les risques auxquels ce bien est exposé sont disponibles sur le site Géorisques : '
                    '<a class="link" href="https://www.georisques.gouv.fr" target="_blank" rel="noopener">www.georisques.gouv.fr</a>.</p></section>'
                    % (dpe_bloc, ges_bloc, cout))
    # prix et honoraires
    secs.append('<section class="bf-sec" aria-labelledby="h-prix"><h2 id="h-prix">Prix et honoraires</h2><p>%s%s</p>'
                '<p class="bf-note">Barème des honoraires de l\'agence GRAVELIN IMMO : <a class="link" href="/honoraires/">consulter le barème</a>. '
                'Les honoraires ne sont dus qu\'en cas de vente.</p></section>'
                % (('%s € · ' % fr(prix)) if prix else '', E(hon)))
    # localisation
    secs.append('<section class="bf-sec" aria-labelledby="h-loc"><h2 id="h-loc">Localisation</h2><p>%s. L\'adresse exacte est communiquée lors de la prise de rendez-vous, '
                'pour respecter la tranquillité des occupants.</p></section>' % E(lieu(a)))
    # simulateur
    if prix and actif and taux[0]:
        secs.append('<section class="bf-sec" aria-labelledby="h-sim"><h2 id="h-sim">Financer ce bien</h2>'
                    '<form class="form bf-sim" id="bf-sim" data-taux=\'%s\' data-date="%s" onsubmit="return false" novalidate>'
                    '<div class="field"><label for="bs-prix">Prix du bien</label><input type="text" id="bs-prix" inputmode="numeric" value="%s"></div>'
                    '<div class="field"><label for="bs-apport">Votre apport</label><input type="text" id="bs-apport" inputmode="numeric" placeholder="ex. 20 000"></div>'
                    '<div class="field"><label for="bs-duree">Durée</label><select id="bs-duree"><option value="15">15 ans</option><option value="20">20 ans</option><option value="25" selected>25 ans</option></select></div>'
                    '<div class="field"><label for="bs-type">Type</label><select id="bs-type"><option value="ancien" selected>Ancien</option><option value="neuf">Neuf</option></select></div>'
                    '<div class="out" aria-live="polite"><div><span>Mensualité estimée</span><b id="bs-m">—</b></div><div><span>Frais de notaire</span><b id="bs-n">—</b></div>'
                    '<div><span>Montant à emprunter</span><b id="bs-c">—</b></div><div><span>Revenus conseillés</span><b id="bs-r">—</b></div></div>'
                    '<p class="bf-note" id="bs-t" style="grid-column:1/-1;margin:0"></p></form>'
                    '<p class="bf-note" style="margin-top:12px"><a class="link" href="/simulateur-pret-immobilier-dijon/">Simulateur complet : combien puis-je emprunter ?</a></p></section>'
                    % (json.dumps({str(k): v for k, v in taux[0].items()}), E(taux[1]), fr(prix)))
    # formulaire de visite
    # bien en vente : visite en 2 clics sur les créneaux libres (assets/rdv.js, /api/espace/rdv), le message reste possible
    tete_vis = (('<section class="bf-sec" id="visite"><div data-rdv data-depuis="bien" data-bien="%s" data-bien-titre="%s"></div>'
                 '<details class="bf-ecrire"><summary>Plutôt une question ? Écrivez à Shawez</summary>' % (E(ref), E(t)))
                if actif else '<section class="bf-sec" id="visite" aria-labelledby="h-vis"><h2 id="h-vis">%s</h2>' % 'Être recontacté')
    secs.append(tete_vis +
                '<form class="form bf-form" id="bf-form" novalidate data-ref="%s" data-titre="%s" data-type="%s" data-commune="%s" data-wa="%s">'
                '<div class="row"><div class="field"><label for="fv-prenom">Prénom</label><input type="text" id="fv-prenom" name="prenom" autocomplete="given-name" required></div>'
                '<div class="field"><label for="fv-nom">Nom</label><input type="text" id="fv-nom" name="nom" autocomplete="family-name" required></div></div>'
                '<div class="row"><div class="field"><label for="fv-email">E-mail</label><input type="email" id="fv-email" name="email" autocomplete="email" required></div>'
                '<div class="field"><label for="fv-tel">Téléphone</label><input type="tel" id="fv-tel" name="telephone" autocomplete="tel" inputmode="tel"></div></div>'
                '<div class="field"><label for="fv-cr">Vos disponibilités</label><input type="text" id="fv-cr" name="creneau" maxlength="30" placeholder="ex. samedi matin"></div>'
                '<div class="field"><label for="fv-msg">Message (facultatif)</label><textarea id="fv-msg" name="message" rows="3" maxlength="1500"></textarea></div>'
                '<div class="hp" aria-hidden="true"><label for="fv-web">Ne pas remplir</label><input type="text" id="fv-web" name="website" tabindex="-1" autocomplete="off"></div>'
                '<div class="field"><label class="chk"><input type="checkbox" name="consent" required> J\'accepte d\'être recontacté(e) par Shawez Ali au sujet de ce bien. '
                'Mes données ne servent qu\'à cela (<a class="link" href="/politique-de-confidentialite/">confidentialité</a>).</label></div>'
                '<button type="submit" class="btn btn-primary btn-lg">%s</button>'
                '<div class="bf-msg" id="bf-fmsg" role="status" tabindex="-1" hidden></div></form>%s</section>'
                % (E(ref), E(t), E(a['type']), E(a['commune']), WA,
                   'Envoyer mon message' if actif else 'Envoyer', '</details>' if actif else ''))
    if voisins:
        secs.append('<section class="bf-sec" aria-labelledby="h-sim2"><h2 id="h-sim2">À voir aussi</h2><ul class="bf-sims bl-grid">%s</ul>'
                    '<p style="margin-top:24px"><a class="btn" href="/biens-a-vendre-dijon/">Tous les biens à vendre</a></p></section>'
                    % ''.join('<li class="bl-card">%s</li>' % carte(b, bp, medias) for b, bp in voisins))

    crumbs = ('<ol class="bi-crumb bf-crumbs"><li><a href="/">Accueil</a></li><li><a href="/biens-a-vendre-dijon/">Biens à vendre</a></li><li aria-current="page">Réf. %s</li></ol>' % E(ref))
    main = ('<section class="route bf" data-route="%s" id="bf"><div class="shell">%s%s</div>%s<div class="shell"><div class="bf-head"><div>%s%s</div>%s</div>'
            '<div style="height:clamp(72px,10vw,136px)"></div></div>%s</section>'
            % (chemin_fiche(a), crumbs, stage, strip, entete, ''.join(secs), card.replace('{cls}', 'bf-desk'), lightbox))

    # --- données structurées
    imgs = ['%s/assets/biens/%s/%d-%d.webp' % (SITE, urllib.parse.quote(ref), n, tl[-1][0]) for n, tl in ph[:8]]
    bien = {'@type': SCHEMA.get(a['type'], 'Place'), 'name': t,
            'address': {'@type': 'PostalAddress', 'addressLocality': a['commune'], 'postalCode': a.get('cp') or '', 'addressCountry': 'FR'}}
    if a.get('pieces') and a['type'] not in TERRAINS: bien['numberOfRooms'] = a['pieces']
    if a.get('surface'): bien['floorSize'] = {'@type': 'QuantitativeValue', 'value': a['surface'], 'unitCode': 'MTK'}
    offre = {'@type': 'Offer', 'url': url, 'businessFunction': 'https://purl.org/goodrelations/v1#Sell',
             'availability': 'https://schema.org/InStock' if actif else 'https://schema.org/SoldOut', 'seller': {'@id': SITE + '/#gravelin'}}
    if prix:
        offre.update(price=prix, priceCurrency='EUR')
    annonce = {'@type': 'RealEstateListing', '@id': url + '#annonce', 'url': url, 'name': t, 'image': imgs, 'datePosted': a.get('first_seen'),
               'description': (desc_paras[0][:300] if desc_paras else t), 'offers': offre, 'about': bien, 'inLanguage': 'fr-FR',
               'provider': {'@id': SITE + '/#shawez'}}
    if video:
        annonce['subjectOf'] = {'@type': 'VideoObject', 'name': 'Visite en vidéo : ' + t, 'description': 'Visite en vidéo : ' + t,
                                'thumbnailUrl': '%s/assets/biens/%s/%s' % (SITE, urllib.parse.quote(vref), video.get('poster_jpg') or video['poster']),
                                'contentUrl': '%s/assets/biens/%s/%s' % (SITE, urllib.parse.quote(vref), video['fichier']),
                                'uploadDate': (m.get('video', {}) or {}).get('date') or a.get('first_seen'), 'duration': 'PT%dS' % int(video.get('duree') or 30)}
    if emb:
        annonce['subjectOf'] = {'@type': 'VideoObject', 'name': 'Visite en vidéo : ' + t, 'description': 'Visite en vidéo : ' + t,
                                'thumbnailUrl': imgs[0] if imgs else '', 'uploadDate': a.get('first_seen'),
                                'embedUrl': ('https://www.youtube-nocookie.com/embed/%s' % emb[1]) if emb[0] == 'youtube'
                                else 'https://www.instagram.com/reel/%s/' % emb[1]}
    graph = [annonce,
             {'@type': 'WebPage', '@id': url + '#page', 'url': url, 'name': t, 'inLanguage': 'fr-FR', 'isPartOf': {'@id': SITE + '/#site'},
              'primaryImageOfPage': imgs[0] if imgs else None, 'mainEntity': {'@id': url + '#annonce'}},
             {'@type': 'BreadcrumbList', 'itemListElement': [
                 {'@type': 'ListItem', 'position': 1, 'name': 'Accueil', 'item': SITE + '/'},
                 {'@type': 'ListItem', 'position': 2, 'name': 'Biens à vendre', 'item': SITE + '/biens-a-vendre-dijon/'},
                 {'@type': 'ListItem', 'position': 3, 'name': 'Réf. %s' % ref, 'item': url}]}]
    if video:
        preload = '<link rel="preload" as="image" href="/assets/biens/%s/%s" fetchpriority="high">\n' % (urllib.parse.quote(vref), video['poster'])
    elif ph:
        n0, t0 = ph[0]
        preload = ('<link rel="preload" as="image" type="image/avif" imagesrcset="%s" imagesizes="(max-width:820px) 100vw, 60vw" fetchpriority="high">\n'
                   % ', '.join('/assets/biens/%s/%d-%d.avif %dw' % (urllib.parse.quote(ref), n0, x, x) for x, _ in t0))
    else:
        preload = ''
    titre_page = titre_seo(a, prix)
    d = desc_seo(t, prix, at, ref)
    if st and not actif:
        d = '%s — %s. Voir les biens disponibles à Dijon et alentours.' % (t, st)
        if len(d) > 160:
            d = '%s — %s. Biens disponibles à Dijon et alentours.' % (titre_court(a), st)
    sticky = ('<a class="btn btn-primary" href="#visite">%s</a><a class="btn ico" href="tel:%s" aria-label="Appeler Shawez">%s</a>'
              '<a class="btn ico" href="%s" target="_blank" rel="noopener" aria-label="Écrire sur WhatsApp">%s</a>' % (cta, TEL, ICO['tel'], wa, ICO['wa']))
    return page_html(base, route=chemin_fiche(a), titre_page=titre_page, desc=d, canonical=canon,
                     image='%s/assets/biens/%s/og.jpg' % (SITE, urllib.parse.quote(ref)), image_alt=t, main=main, graph=graph,
                     css=CSS_FICHE + CSS_LISTE_SEUL, js=JS_FICHE, sticky=sticky,
                     head_extra=preload,
                     robots='index,follow,max-image-preview:large,max-video-preview:-1' if en_ligne(a) and ref not in _DOUBLONS else 'noindex,follow')


# ------------------------------------------------------------------------------------------------ page des biens
def page_liste(base, liste, vendus, medias):
    types = sorted({a['type'] for a, _ in liste})
    communes = sorted({a['commune'] for a, _ in liste})
    opt = lambda vs: ''.join('<option>%s</option>' % E(v) for v in vs)

    def li(a, ph, ordre):
        return ('<li class="bl-card" data-type="%s" data-commune="%s" data-prix="%s" data-surface="%s" data-ordre="%d">%s</li>'
                % (E(a['type']), E(a['commune']), int(a['prix']) if a.get('prix') else '', a.get('surface') or '', ordre,
                   carte(a, ph, medias, eager=(True if ordre == len(liste) else 'auto' if ordre > len(liste) - 3 else False))))
    cartes = ''.join(li(a, ph, len(liste) - i) for i, (a, ph) in enumerate(liste))
    main = ('<section class="route" data-route="/biens-a-vendre-dijon" id="r-annonces">\n'
            '  <div class="page-head shell"><ol class="bi-crumb"><li><a href="/">Accueil</a></li><li aria-current="page">Biens à vendre</li></ol>'
            '<p class="label">Biens à vendre</p><h1 class="display d-xl" style="margin-top:14px;">Biens à vendre à Dijon <em>et alentours.</em></h1>'
            '<p class="lede">Chaque bien en photos et, quand elle existe, en vidéo. Je vous les fais visiter. Mis à jour chaque matin.</p></div>\n'
            '  <div class="shell" style="padding-bottom:clamp(72px,10vw,136px);">\n'
            '    <form class="bl-bar" onsubmit="return false" aria-label="Filtrer les biens">'
            '<label>Type<select id="bl-type"><option value="">Tous</option>%s</select></label>'
            '<label>Commune<select id="bl-commune"><option value="">Toutes</option>%s</select></label>'
            '<label>Prix min.<input id="bl-pmin" inputmode="numeric" placeholder="€"></label>'
            '<label>Prix max.<input id="bl-pmax" inputmode="numeric" placeholder="€"></label>'
            '<label>Surface min.<input id="bl-smin" inputmode="numeric" placeholder="m²"></label>'
            '<label>Trier<select id="bl-tri"><option value="recent">Plus récents</option><option value="prix-asc">Prix croissant</option>'
            '<option value="prix-desc">Prix décroissant</option><option value="surface">Plus grands</option></select></label></form>\n'
            '    <p class="bl-n" id="bl-n" aria-live="polite">%d biens à vendre</p>\n'
            '    <ul class="bl-grid" id="bl-grid">%s</ul>\n'
            '    <p class="bl-empty" id="bl-vide" hidden>Aucun bien ne correspond à ces critères. <button type="button" class="btn" id="bl-reset">Tout afficher</button></p>\n%s'
            '    <p class="bl-note">Biens de l\'agence GRAVELIN IMMO, présentés par Shawez Ali, agent immobilier. Prix indiqués tels qu\'annoncés ; '
            'la répartition des honoraires, le diagnostic de performance énergétique et les informations sur les risques figurent sur la fiche de chaque bien. '
            '<a class="link" href="/honoraires/">Barème des honoraires</a>.</p>\n'
            '  </div>\n</section>'
            % (opt(types), opt(communes), len(liste), cartes,
               ('    <details class="bl-sold"><summary>Vendus récemment (%d)</summary><ul class="bl-grid">%s</ul></details>\n'
                % (len(vendus), ''.join('<li class="bl-card">%s</li>' % carte(a, ph, medias) for a, ph in vendus))) if vendus else ''))
    items = []
    for i, (a, ph) in enumerate(liste, 1):
        bien = {'@type': SCHEMA.get(a['type'], 'Place'), 'name': titre(a),
                'address': {'@type': 'PostalAddress', 'addressLocality': a['commune'], 'postalCode': a.get('cp') or '', 'addressCountry': 'FR'}}
        if a.get('surface'): bien['floorSize'] = {'@type': 'QuantitativeValue', 'value': a['surface'], 'unitCode': 'MTK'}
        it = {'@type': 'Offer', 'name': titre(a), 'url': SITE + chemin_fiche(a), 'image': '%s/assets/biens/%s/og.jpg' % (SITE, urllib.parse.quote(a['ref'])),
              'availability': 'https://schema.org/InStock', 'seller': {'@id': SITE + '/#gravelin'}, 'itemOffered': bien}
        if a.get('prix'):
            it.update(price=a['prix'], priceCurrency='EUR')
        items.append({'@type': 'ListItem', 'position': i, 'item': it})
    graph = [{'@type': 'CollectionPage', '@id': SITE + '/biens-a-vendre-dijon/#page', 'url': SITE + '/biens-a-vendre-dijon/', 'name': 'Biens à vendre à Dijon et alentours',
              'inLanguage': 'fr-FR', 'isPartOf': {'@id': SITE + '/#site'}},
             {'@type': 'ItemList', '@id': SITE + '/biens-a-vendre-dijon/#liste', 'name': 'Biens à vendre à Dijon et alentours', 'numberOfItems': len(items), 'itemListElement': items},
             {'@type': 'BreadcrumbList', 'itemListElement': [{'@type': 'ListItem', 'position': 1, 'name': 'Accueil', 'item': SITE + '/'},
                                                             {'@type': 'ListItem', 'position': 2, 'name': 'Biens à vendre', 'item': SITE + '/biens-a-vendre-dijon/'}]}]
    img = ('%s/assets/biens/%s/og.jpg' % (SITE, urllib.parse.quote(liste[0][0]['ref']))) if liste else SITE + '/assets/og.jpg'
    return page_html(base, route='/biens-a-vendre-dijon', titre_page='Biens à vendre à Dijon et alentours | Shawez Ali',
                     desc='Maisons, appartements et propriétés à vendre à Dijon et alentours : photos, vidéos, prix, visites avec Shawez Ali. Mis à jour chaque jour.',
                     canonical=SITE + '/biens-a-vendre-dijon/', image=img, main=main, graph=graph, css=CSS_LISTE, js=JS_LISTE)


REDIR = """<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Biens à vendre · Shawez Ali</title><meta name="robots" content="noindex,follow">
<link rel="canonical" href="https://shawez-immo.com/biens-a-vendre-dijon/">
<style>html,body{margin:0;background:#F7F6F2;color:#0F0E0C;font:16px/1.5 -apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;}main{max-width:560px;margin:18vh auto;padding:0 20px;}a{color:#8A6614;}</style>
</head><body><main><h1 style="font-weight:500">Biens à vendre</h1><p>Redirection vers la page du bien… <a href="/biens-a-vendre-dijon/" id="go">Voir tous les biens à vendre</a>.</p></main>
<script>
/* ancienne adresse /biens-a-vendre/?fiche=<lien de l'agence> : on retrouve la fiche du bien sur ce site grâce au numéro de fiche */
(function(){var M=%s,dest='/biens-a-vendre-dijon/';
try{var f=new URLSearchParams(location.search).get('fiche')||'',m=f.match(/\\/(\\d+)-bien/);if(m&&M[m[1]])dest=M[m[1]];}catch(e){}
document.getElementById('go').href=dest;location.replace(dest);})();
</script></body></html>
"""


# ------------------------------------------------------------------------------------------------ liens du site
VENTE = re.compile(r'https?://(?:www\.)?gravelin-immo\.com/vente/[^"\'\s<>]*')
EXCLUS = ('admin/', 'mon-espace/', 'outils/', 'de-claude/', 'node_modules/', 'functions/', 'biens/', 'biens-a-vendre/', 'cahier')
_IDS = {}


def lien_interne(url):
    m = re.search(r'/(\d+)-bien', url)
    if m and m.group(1) in _IDS:
        return _IDS[m.group(1)]
    return '/biens-a-vendre-dijon/'


def liens_dans(s):
    """Liens vers le catalogue ou les fiches de l'agence → pages internes (les liens vers l'agence elle-même restent)."""
    def tag(m):
        t = m.group(0)
        h = re.search(r'href="([^"]*)"', t)
        if not h or not VENTE.match(html.unescape(h.group(1))):
            return t
        new = lien_interne(html.unescape(h.group(1)))
        t = t.replace(h.group(0), 'href="%s"' % new)
        t = re.sub(r'\s+data-sortie="biens"', '', t)
        t = re.sub(r'\s+title="Catalogue des biens à vendre de l\'agence GRAVELIN IMMO"', '', t)
        t = re.sub(r'\s+target="_blank"', '', t)
        return t
    s = re.sub(r'<a\s[^>]*>', tag, s)
    # menu principal : l'entrée « Biens à vendre » devient une page du site (état « page courante »)
    s = s.replace('<li><a href="/biens-a-vendre-dijon/">Biens à vendre</a></li>\n    </ul>',
                  '<li><a href="/biens-a-vendre-dijon/" data-nav="biens-a-vendre-dijon">Biens à vendre</a></li>\n    </ul>')
    s = s.replace('>Catalogue de l\'agence</a>', '>Tous les biens à vendre</a>').replace('>Voir sur le catalogue</a>', '>Voir les biens à vendre</a>')
    s = s.replace('<a class="btn btn-primary btn-lg" href="/biens-a-vendre-dijon/">Voir les biens dans ce budget</a>',
                  '<a class="btn btn-primary btn-lg" id="sim-biens" href="/biens-a-vendre-dijon/">Voir les biens dans ce budget</a>')
    if 'id="sim-biens"' in s and 'sim-biens-js' not in s:
        s = s.replace("set('r-prix',eur.format(Math.floor(prix/1000)*1000));",
                      "set('r-prix',eur.format(Math.floor(prix/1000)*1000));/* sim-biens-js */var vb=$('sim-biens');if(vb)vb.href='/biens-a-vendre-dijon/?prix_max='+Math.floor(prix/1000)*1000;", 1)
    return s


def liens_site():
    n = 0
    for p in glob.glob(P('**', '*.html'), recursive=True):
        rel = os.path.relpath(p, P()).replace(os.sep, '/')
        if rel.startswith(EXCLUS):
            continue
        s = open(p, encoding='utf-8').read()
        t = liens_dans(s)
        if t != s:
            open(p, 'w', encoding='utf-8').write(t)
            n += 1
    return n


# ------------------------------------------------------------------------------------------------ sitemap
def sitemap(fiches):
    f = P('sitemap.xml')
    s = open(f, encoding='utf-8').read()
    s = re.sub(r'  <url><loc>%s/biens/[^<]*</loc>.*?</url>\n' % re.escape(SITE), '', s)
    lignes = ''.join('  <url><loc>%s%s</loc><lastmod>%s</lastmod><priority>0.7</priority></url>\n' % (SITE, c, d) for c, d in fiches)
    open(f, 'w', encoding='utf-8').write(s.replace('</urlset>', lignes + '</urlset>'))


# ------------------------------------------------------------------------------------------------ construction
def construire(etat=None):
    etat = etat or charge_annonces()
    medias = charge_medias().get('biens', {})
    for ref, yid in charge_youtube().items():      # outils/biens/youtube.json {ref: id} : prioritaire sur medias.json
        medias.setdefault(ref, {})['youtube'] = yid
    # annonces Hektor + biens hors Hektor (outils/biens/manuels.json, mandat signé ; Hektor l'emporte à référence égale)
    annonces = [a for a in list(etat['annonces'].values()) + list(charge_manuels(etat, medias).values())
                if a.get('ref') and a.get('type') and a.get('commune')]
    _IDS.clear()
    _IDS.update({a['id']: chemin_fiche(a) for a in annonces if a.get('id') and a['photos']['fichiers']})
    base = gabarit()
    taux = taux_simulateur()
    ph = {}
    for a in annonces:
        if a['photos']['fichiers']:
            ph[a['ref']] = photos(a, medias)
    tous = sorted([a for a in annonces if ph.get(a['ref'])], key=lambda a: (a['first_seen'], int(a['id']) if str(a.get('id', '')).isdigit() else 0), reverse=True)
    visibles = [a for a in tous if en_ligne(a)]
    actifs = [a for a in visibles if a['status'] in ACTIFS]
    _TITRES.clear()
    _DOUBLONS.clear()
    _DOUBLONS.update(doublons(visibles))
    faites, plan = set(), []
    for a in tous:
        proches = [b for b in actifs if b['ref'] != a['ref'] and (b['commune'] == a['commune'] or b['type'] == a['type'])]
        proches.sort(key=lambda b: (b['type'] != a['type'], b['commune'] != a['commune'], abs((b.get('prix') or 0) - (a.get('prix') or 0))))
        ecrire(P(chemin_fiche(a).strip('/'), 'index.html'), fiche(a, ph[a['ref']], medias, base, [(b, ph[b['ref']]) for b in proches[:3]], taux))
        faites.add(chemin_fiche(a))
        if en_ligne(a) and a['ref'] not in _DOUBLONS:
            plan.append((chemin_fiche(a), max(a.get('status_changed') or a['first_seen'], a['first_seen'])))
    # fiches d'anciennes annonces qui ne sont plus dans annonces.json : supprimées (leur adresse renvoie à la page des biens)
    for d in glob.glob(P('biens', '*', 'index.html')):
        c = '/biens/%s/' % os.path.basename(os.path.dirname(d))
        if c not in faites:
            os.remove(d)
            os.rmdir(os.path.dirname(d))
    limite = (AUJ - dt.timedelta(days=JOURS_VENDU)).isoformat()
    vendus = [a for a in tous if a['status'] == 'vendu' and a['status_changed'] < limite]
    ecrire(P('biens-a-vendre-dijon', 'index.html'), page_liste(base, [(a, ph[a['ref']]) for a in visibles], [(a, ph[a['ref']]) for a in vendus], medias))
    ecrire(P('biens-a-vendre', 'index.html'), REDIR % json.dumps(dict(_IDS)))
    sitemap(plan)
    n = liens_site()
    print('Fiches : %d (dont %d en ligne) · photos : %d biens · vidéos : %d · pages du site mises à jour : %d'
          % (len(faites), len(plan), len(ph), sum(1 for a in tous if a_video(a['ref'], medias)), n))


if __name__ == '__main__':
    construire()

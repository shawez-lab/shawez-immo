"""Synchronisation des annonces de l'agence GRAVELIN IMMO → annonces.json, photos, page du site, file des posts Google.

    python3 outils/sync_annonces.py              # passage complet (lancé chaque jour par GitHub Actions)
    python3 outils/sync_annonces.py --sans-web   # régénère seulement la page et les fichiers depuis annonces.json

Règles :
- robots.txt de l'agence respecté, 2 s entre deux requêtes ;
- jamais d'adresse de rue ni de nom de propriétaire dans ce qui est publié : titres et textes sont écrits à partir
  des champs structurés (type, pièces, surface, commune, équipements), la description de l'agence n'est gardée
  qu'expurgée des adresses, pour référence ;
- « vendu » uniquement si l'agence l'affiche ; une annonce disparue sans mention devient « retirée » ;
- 0 annonce trouvée, ou moins de la moitié des annonces actives : rien n'est modifié, alerte dans de-claude/alerte-sync.md.
"""
import datetime as dt, html, io, json, os, re, sys, time, urllib.parse, urllib.request, urllib.robotparser

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = 'https://www.gravelin-immo.com'
UA = 'shawez-immo-sync/1.0 (+https://shawez-immo.com ; Shawez Ali, agent GRAVELIN IMMO)'
PAGES = [BASE + '/vente/%d' % n for n in range(1, 9)]   # on s'arrête à la première page vide
PASSES = 2   # l'ordre des pages de l'agence varie d'une requête à l'autre : deux lectures, fusionnées
DELAI = 2.0
UTM = 'utm_source=shawez-immo'
SITE = 'https://shawez-immo.com'
JOURS_VENDU = 60
PARIS = dt.timezone(dt.timedelta(hours=2))  # remplacé par zoneinfo si disponible
try:
    from zoneinfo import ZoneInfo
    PARIS = ZoneInfo('Europe/Paris')
except Exception:
    pass
AUJ = dt.datetime.now(PARIS).date()
P = lambda *a: os.path.join(ROOT, *a)

# ---------------------------------------------------------------- réseau
_last = [0.0]
_robots = {}

def autorise(url):
    host = urllib.parse.urlsplit(url)
    key = host.scheme + '://' + host.netloc
    if key not in _robots:
        rp = urllib.robotparser.RobotFileParser()
        try:
            rp.parse(get(key + '/robots.txt', verif=False).decode('utf-8', 'ignore').splitlines())
        except Exception:
            rp.parse([])   # robots.txt absent : tout est permis
        _robots[key] = rp
    return _robots[key].can_fetch(UA, url)

def get(url, verif=True, essais=3):
    if verif and not autorise(url):
        raise PermissionError('interdit par robots.txt : ' + url)
    for k in range(essais):
        attente = _last[0] + DELAI - time.time()
        if attente > 0:
            time.sleep(attente)
        try:
            req = urllib.request.Request(url, headers={'User-Agent': UA, 'Accept-Language': 'fr-FR'})
            with urllib.request.urlopen(req, timeout=60) as r:
                data = r.read()
            _last[0] = time.time()
            return data
        except urllib.error.HTTPError as e:
            _last[0] = time.time()
            if e.code == 404:
                raise
            if k == essais - 1:
                raise
        except Exception:
            _last[0] = time.time()
            if k == essais - 1:
                raise
        time.sleep(5 * (k + 1))

# ---------------------------------------------------------------- analyse
T = lambda s: re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', ' ', s or ''))).strip()
TYPES = {'appartement': 'Appartement', 'duplex': 'Duplex', 'maison': 'Maison', 'propriete': 'Propriété', 'immeuble': 'Immeuble',
         'terrain': 'Terrain', 'terrain-a-batir': 'Terrain à bâtir', 'loft': 'Loft', 'chateau': 'Château', 'studio': 'Studio',
         'viager-maison': 'Viager', 'local-commercial': 'Local commercial', 'commerce': 'Commerce', 'bureau': 'Bureau',
         'parking': 'Parking', 'garage': 'Garage'}
STATUTS = {'vendu': 'vendu', 'vendue': 'vendu', 'sous-compromis': 'sous compromis', 'sous compromis': 'sous compromis', 'compromis': 'sous compromis'}

def nombre(s):
    s = (s or '').replace('\xa0', ' ').replace(' ', '').replace(',', '.')
    m = re.search(r'\d+(?:\.\d+)?', s)
    return float(m.group(0)) if m else None

def cartes(page_html):
    out = []
    for m in re.finditer(r'<article class="property-listing-v3__item[ "].*?</article>', page_html, re.S):
        a = m.group(0)
        href = re.search(r'href="(/vente/[^"]+?/(\d+)-[^"/]*/?)"', a)
        if not href:
            continue
        ref = re.search(r'Ref\s*:\s*([A-Za-z0-9_-]+)', a)
        statut = [T(x) for x in re.findall(r'property-status__content">(.*?)</span>', a, re.S)]
        if not statut:
            zone = re.search(r'property-listing-v3__item-status">(.*?)</div>\s*<h2', a, re.S)
            statut = [x for x in (T(zone.group(1)).split('  ') if zone else []) if x]
        out.append({'id': href.group(2), 'chemin': href.group(1), 'ref': ref.group(1) if ref else href.group(2),
                    'compo': T((re.search(r'item-compo">(.*?)</div>', a, re.S) or [None, ''])[1]),
                    'commune': T((re.search(r'title__content-1">(.*?)</span>', a, re.S) or [None, ''])[1]),
                    'cp': T((re.search(r'title__content-2">(.*?)</span>', a, re.S) or [None, ''])[1]).strip('()'),
                    'prix': nombre(T((re.search(r'price-value">(.*?)</span>', a, re.S) or [None, ''])[1])),
                    'mentions': [s for s in statut if s]})
    return out

def lignes_tableau(s):
    d = {}
    for m in re.finditer(r'table-aria__tr--([a-z0-9_]+)" role="row">\s*<span[^>]*>(.*?)</span>\s*<span[^>]*>(.*?)</span>', s, re.S):
        d[m.group(1)] = (T(m.group(2)), T(m.group(3)))
    return d

def fiche(url):
    s = get(url).decode('utf-8', 'ignore')
    desc = re.search(r'property-detail-v1__description__text[^>]*>(.*?)</div>', s, re.S)
    gal = re.search(r'property-detail-v1__infos__gallery(.*?)property-detail-v1__description', s, re.S)
    zone = gal.group(1) if gal else s
    dossiers = re.findall(r'images/biens/\d+/([0-9a-f]{32})/photo_', zone)
    photos = []
    if dossiers:
        h = max(set(dossiers), key=dossiers.count)
        for p in re.findall(r'images/biens/(\d+/%s/photo_[0-9a-f]+\.(?:jpe?g|png|webp))' % h, zone):
            if p not in photos:
                photos.append(p)
    ener = re.search(r"dépenses annuelles d'énergie[^<]*?compris entre\s*([\d\s\xa0]+)\s*€\s*et\s*([\d\s\xa0]+)\s*€", html.unescape(s))
    mentions = [T(x) for x in re.findall(r'property-status__content">(.*?)</span>', s.split('property-detail-v1__description')[0], re.S)]
    return {'tableau': lignes_tableau(s), 'description': T(desc.group(1)) if desc else '', 'photos': photos, 'texte': T(s),
            'energie': ('entre %s € et %s €' % (' '.join(ener.group(1).split()), ' '.join(ener.group(2).split()))) if ener else None,
            'mentions_fiche': mentions}

# ---------------------------------------------------------------- confidentialité
VOIES = r"(?:rue|avenue|av\.|boulevard|bd|place|impasse|allée|allee|chemin|route|quai|cours|square|passage|faubourg|rond-point|voie|sentier|résidence|residence|lotissement|hameau|lieu-dit)"
ADRESSE = re.compile(r"\b\d{1,4}\s?(?:bis|ter)?\s*,?\s*(?i:%s)\b[^,.;\n]*|(?<![-\w])(?i:%s)\s+(?:(?i:de\s+la|de\s+l'|du|des|de|d')\s*)?[A-ZÉÈ][\w'’-]+(?:\s+[A-ZÉÈ][\w'’-]+)*" % (VOIES, VOIES))
PERSONNE = re.compile(r"\b(?:M\.|Mme|Mlle|Monsieur|Madame|propriétaire|vendeur|vendeuse)\s+[A-ZÉÈ][a-zéèêëïîôöüç-]+", re.U)

def expurge(t):
    t = ADRESSE.sub('[adresse retirée]', t or '')
    return PERSONNE.sub('[nom retiré]', t)

def verifie_public(t, ou):
    """Dernier contrôle avant publication : aucune adresse, aucun nom de personne."""
    if ADRESSE.search(t) or PERSONNE.search(t) or '[adresse' in t or '[nom' in t:
        raise ValueError('texte refusé (%s) : %s' % (ou, t[:120]))
    return t

# ---------------------------------------------------------------- photos
def document_probable(im):
    """Plan, diagnostic ou document scanné : surtout blanc et presque sans couleur."""
    from PIL import ImageStat
    p = im.convert('RGB').resize((64, 64))
    px = list(p.getdata())
    blanc = sum(1 for r, g, b in px if r > 225 and g > 225 and b > 225) / len(px)
    sat = ImageStat.Stat(p.convert('HSV')).mean[1]
    return blanc > 0.55 and sat < 25

def photos(ref, liste, deja):
    from PIL import Image
    dossier = P('annonces', ref)
    os.makedirs(dossier, exist_ok=True)
    gardees, n = [], 0
    for chemin in liste:
        if chemin in deja.get('sources', {}):
            nom = deja['sources'][chemin]
            if nom and os.path.exists(os.path.join(dossier, nom)):
                gardees.append((chemin, nom)); n = max(n, int(nom.split('.')[0])); continue
            if nom is None:
                gardees.append((chemin, None)); continue
        url = 'https://gravelin-immo.staticlbi.com/1200xauto/images/biens/' + chemin
        try:
            im = Image.open(io.BytesIO(get(url)))
        except Exception as e:
            print('  photo ignorée', chemin, e); continue
        if document_probable(im):
            print('  document probable écarté', chemin); gardees.append((chemin, None)); continue
        im = im.convert('RGB')
        if im.width > 1200:
            im = im.resize((1200, round(im.height * 1200 / im.width)), Image.LANCZOS)
        n += 1
        nom = '%d.jpg' % n
        im.save(os.path.join(dossier, nom), 'JPEG', quality=85, optimize=True, progressive=True)
        if n == 1:
            v = im.resize((600, round(im.height * 600 / im.width)), Image.LANCZOS)
            v.save(os.path.join(dossier, '1-600.webp'), 'WEBP', quality=80, method=6)
        gardees.append((chemin, nom))
    return {'sources': dict(gardees), 'fichiers': [nom for _, nom in gardees if nom]}

# ---------------------------------------------------------------- textes (écrits par le script, jamais copiés)
def fr_nombre(x, dec=False):
    if x is None:
        return ''
    if dec and abs(x - round(x)) > 0.01:
        return ('%.2f' % x).rstrip('0').rstrip('.').replace('.', ',')
    return '{:,}'.format(int(round(x))).replace(',', '\u202f')

def atouts(a):
    """Atouts concrets tirés du tableau de caractéristiques de l'agence (jamais de la description)."""
    t, out = a['caracteristiques'], []
    t = {k: v for k, v in t.items() if v and not v.startswith('TRAD_')}
    oui = lambda k: t.get(k, '').upper().startswith('OUI')
    val = lambda k: nombre(t.get(k, ''))
    terrain = a['type'].startswith('Terrain')
    if val('surfterrn') and not terrain: out.append('terrain de %s m²' % fr_nombre(val('surfterrn')) + (', arboré' if oui('terrain_arbore') else ''))
    if terrain:
        if oui('terrain_viabilise'): out.append('terrain viabilisé')
        if oui('terrain_constructible'): out.append('constructible' + (' sur %s m²' % fr_nombre(val('terrain_surface_constructible')) if val('terrain_surface_constructible') and val('terrain_surface_constructible') != a.get('surface') else ''))
        if oui('terrain_raccordement_eau') and oui('terrain_raccordement_electricite'): out.append('raccordé à l\'eau et à l\'électricité')
    if oui('piscine'): out.append('piscine')
    if oui('terrasse'): out.append('terrasse')
    if oui('balcon'): out.append('balcon')
    for k in ('nbgarage', 'nb_garage', 'garage'):
        if val(k) or oui(k): out.append('garage'); break
    if val('nb_parking'): out.append('place de parking' if val('nb_parking') == 1 else '%d places de stationnement' % val('nb_parking'))
    if oui('cave'): out.append('cave')
    if oui('ascenseur'): out.append('ascenseur')
    if val('nbchambres'): out.append('%d chambre%s' % (val('nbchambres'), 's' if val('nbchambres') > 1 else ''))
    if t.get('mode_chauffage') and 'pompe à chaleur' in t['mode_chauffage'].lower(): out.append('chauffage par pompe à chaleur')
    if t.get('type_cuisine', '').lower() in ('equipée', 'équipée', 'aménagée', 'amenagée'): out.append('cuisine %s' % t['type_cuisine'].lower().replace('equipée', 'équipée'))
    sdb = (val('nbsdb') or 0) + (val('nbse') or 0)
    if sdb > 1: out.append('%d salles de bains ou d\'eau' % sdb)
    if 'nbetage' in t and val('nbetage') is not None:
        e = int(val('nbetage')); out.append('rez-de-chaussée' if e == 0 else '%s étage' % ('1er' if e == 1 else '%de' % e))
    return out

def titre(a):
    bits = [a['type']]
    if a.get('pieces') and a['type'] not in ('Terrain', 'Terrain à bâtir', 'Parking', 'Garage'):
        bits.append('%d pièce%s' % (a['pieces'], 's' if a['pieces'] > 1 else ''))
    if a.get('surface'):
        bits.append('%s m²' % fr_nombre(a['surface']))
    t = ' '.join(bits[:1]) + (' ' + ', '.join(bits[1:]) if len(bits) > 1 else '') + ' à ' + a['commune']
    if len(t) > 58:
        t = t[:57].rsplit(' ', 1)[0] + '…'
    return verifie_public(t, 'titre ' + a['ref'])

def resume_carte(a):
    at = atouts(a)[:3]
    s = ', '.join(at)
    return verifie_public((s[0].upper() + s[1:] + '.') if s else '', 'carte ' + a['ref'])

def texte_post(a):
    at = atouts(a)[:3]
    det = []
    if a.get('pieces'): det.append('%d pièce%s' % (a['pieces'], 's' if a['pieces'] > 1 else ''))
    if a.get('surface'): det.append('%s m²' % fr_nombre(a['surface'], True))
    p = ['%s%s à %s.' % (a['type'], (' de ' + ', '.join(det) + ',') if det else '', a['commune'])]
    if a.get('prix'):
        p.append('Prix : %s €, honoraires inclus.' % fr_nombre(a['prix']))
    if at:
        p.append('\n'.join('• ' + x[0].upper() + x[1:] for x in at))
    if a.get('energie'):
        p.append("Dépenses annuelles d'énergie estimées %s (usage standard)." % a['energie'])
    p.append('Référence %s, GRAVELIN IMMO. Visites et informations : Shawez Ali, 07 67 57 92 28.' % a['ref'])
    t = '\n\n'.join(p)
    return verifie_public(t[:1200], 'post ' + a['ref'])

TXT_VENDU = 'VENDU — Ce bien a trouvé preneur. Vous avez un bien similaire ? Estimation offerte.'
TXT_RETIRE = "N'est plus disponible"

class _SansRedir(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *a, **k):
        return None

def lien_valide(url):
    """Le lien neutre doit rediriger vers la fiche du bien, pas vers l'accueil de l'agence."""
    attente = _last[0] + DELAI - time.time()
    if attente > 0:
        time.sleep(attente)
    try:
        urllib.request.build_opener(_SansRedir).open(urllib.request.Request(url.split('?')[0], headers={'User-Agent': UA}), timeout=30)
        return True
    except urllib.error.HTTPError as e:
        loc = e.headers.get('Location', '')
        return e.code in (301, 302) and '/vente/' in loc
    except Exception:
        return False
    finally:
        _last[0] = time.time()

SLUG_ADRESSE = re.compile(r'(?:^|-)\d+(?:-bis|-ter)?-(?:rue|avenue|av|boulevard|bd|place|impasse|allee|chemin|route|quai|cours|square|passage|faubourg|voie|sentier)-', re.I)

def chemin_stocke(chemin, id_, complet):
    """Chemin gardé dans annonces.json (public) : forme neutre « …/<id>-bien », sauf si l'agence la refuse
    et que l'adresse d'origine ne contient pas de nom de rue."""
    seg = chemin.strip('/').split('/')
    if complet and not SLUG_ADRESSE.search(seg[-1]):
        return chemin
    return '/' + '/'.join(seg[:-1]) + '/%s-bien' % id_ + ('/' if chemin.endswith('/') else '')

def lien_agence(a):
    if a.get('lien_complet'):
        if a['chemin'].rstrip('/').endswith('-bien'):
            return BASE + '/vente/1?' + UTM   # lien court refusé et adresse dans l'URL de l'agence : on renvoie vers la liste
        return BASE + a['chemin'] + '?' + UTM
    return lien_neutre(a)

def lien_neutre(a):
    """Lien neutre vers la fiche : l'agence redirige vers sa page complète, sans adresse dans notre lien."""
    fin = '/' if a['chemin'].endswith('/') else ''   # même forme que l'adresse d'origine, sinon l'agence renvoie à l'accueil
    return '%s/vente/%s/%s-bien%s?%s' % (BASE, '/'.join(a['chemin'].strip('/').split('/')[1:-1]), a['id'], fin, UTM)

def photo_url(a, n):
    f = a['photos']['fichiers']
    return '%s/annonces/%s/%s' % (SITE, a['ref'], f[n]) if len(f) > n else ''

# ---------------------------------------------------------------- calendrier des posts
def feries(y):
    a, b, c = y % 19, y // 100, y % 100
    d, e = b // 4, b % 4
    f = (b + 8) // 25; g = (b - f + 1) // 3
    h = (19 * a + b - d - g + 15) % 30
    i, k = c // 4, c % 4
    l = (32 + 2 * e + 2 * i - h - k) % 7
    m = (a + 11 * h + 22 * l) // 451
    mois, jour = divmod(h + l - 7 * m + 114, 31)
    paques = dt.date(y, mois, jour + 1)
    fixes = [(1, 1), (5, 1), (5, 8), (7, 14), (8, 15), (11, 1), (11, 11), (12, 25)]
    return {dt.date(y, m_, j) for m_, j in fixes} | {paques + dt.timedelta(days=x) for x in (1, 39, 50)}

def ouvre(d):
    return d.weekday() < 5 and d not in feries(d.year)

def jours_ouvres(depuis):
    d = depuis
    while True:
        if ouvre(d):
            yield d
        d += dt.timedelta(days=1)

# ---------------------------------------------------------------- état
def charge():
    try:
        return json.load(open(P('annonces.json'), encoding='utf-8'))
    except FileNotFoundError:
        return {'maj': None, 'annonces': {}, 'posts': []}

def journal(lignes):
    if not lignes:
        return
    f = P('annonces-log.md')
    tete = '' if os.path.exists(f) else '# Journal des annonces\n\nChaque passage de `outils/sync_annonces.py` ajoute ici les changements constatés.\n'
    with open(f, 'a', encoding='utf-8') as o:
        o.write(tete + '\n## %s\n\n' % AUJ.isoformat() + ''.join('- %s\n' % x for x in lignes))

def alerte(msg):
    os.makedirs(P('de-claude'), exist_ok=True)
    with open(P('de-claude', 'alerte-sync.md'), 'w', encoding='utf-8') as o:
        o.write('# Alerte : synchronisation des annonces\n\n%s — %s\n\nRien n\'a été modifié (annonces.json, photos, page et file des posts intacts). '
                'À vérifier : la structure des pages https://www.gravelin-immo.com/vente/1 a peut-être changé ; adapter `outils/sync_annonces.py`.\n'
                % (dt.datetime.now(PARIS).strftime('%d/%m/%Y %H:%M'), msg))
    print('ALERTE :', msg)

def synchronise(etat):
    vues = {}
    for _ in range(PASSES):
        for url in PAGES:
            try:
                s = get(url).decode('utf-8', 'ignore')
            except urllib.error.HTTPError as e:
                if e.code == 404:
                    break
                raise
            c = cartes(s)
            if not c:
                break
            for x in c:
                vues.setdefault(x['ref'], x)
    actifs = [a for a in etat['annonces'].values() if a['status'] in ('en vente', 'sous compromis')]
    if not vues:
        alerte('0 annonce trouvée sur les pages de vente.')
        return False
    if actifs and len(vues) < len(actifs) / 2:
        alerte('%d annonces trouvées pour %d actives la veille : lecture probablement incomplète.' % (len(vues), len(actifs)))
        return False
    log, now = [], AUJ.isoformat()
    for ref, c in vues.items():
        a = etat['annonces'].get(ref)
        f = fiche(BASE + c['chemin'])
        if not re.search(r'Ref\s*:\s*%s\b' % re.escape(ref), f['texte']):
            # la fiche ne répond pas (lien cassé côté agence) : on n'en prend rien, ni données ni photos
            if a is None:
                log.append('Annonce %s : visible dans la liste de l\'agence mais sa fiche ne s\'ouvre pas ; non reprise.' % ref)
            else:
                a['last_seen'] = now
            continue
        tab = {k: v for k, (_, v) in f['tableau'].items()}
        seg = c['chemin'].strip('/').split('/')
        typ = TYPES.get(seg[2], seg[2].replace('-', ' ').capitalize())
        # pièces et surface : d'abord ce que l'agence affiche sur sa carte, puis son tableau de caractéristiques
        m_p = re.search(r'(\d+)\s*pièce', c['compo']); m_s = re.search(r'([\d\s,]+)\s*m²', c['compo'])
        pieces = nombre(m_p.group(1)) if m_p else nombre(tab.get('nbpiecees') or tab.get('nbpieces'))
        surf = nombre(m_s.group(1)) if m_s else nombre(tab.get('surf_hab') or tab.get('surfhab') or tab.get('surf_carrez') or (tab.get('surfterrn') if seg[2].startswith('terrain') else None))
        mentions = list(dict.fromkeys(c['mentions'] + f['mentions_fiche']))
        vus_st = {STATUTS.get(m_.lower().strip()) for m_ in mentions}
        statut = 'vendu' if 'vendu' in vus_st else 'sous compromis' if 'sous compromis' in vus_st else 'en vente'
        # « chemin » est remplacé par sa forme neutre avant l'écriture
        nouveau = {'ref': ref, 'id': c['id'], 'chemin': c['chemin'], 'type': typ, 'commune': c['commune'], 'cp': c['cp'],
                   'prix': c['prix'], 'surface': surf, 'compo_agence': c['compo'], 'pieces': int(pieces) if pieces else None,
                   'caracteristiques': tab, 'energie': f['energie'], 'dpe': None,
                   'description_expurgee': expurge(f['description']), 'mentions_agence': mentions}
        nouveau['photos'] = photos(ref, f['photos'], (a or {}).get('photos', {}))
        if a is None and not lien_valide(lien_neutre(nouveau)):
            nouveau['lien_complet'] = True
            log.append('Annonce %s : lien court refusé par l\'agence, lien complet utilisé.' % ref)
        nouveau['chemin'] = chemin_stocke(c['chemin'], c['id'], nouveau.get('lien_complet') or (a or {}).get('lien_complet'))
        if a is None:
            nouveau.update(first_seen=now, last_seen=now, status=statut, status_changed=now)
            etat['annonces'][ref] = nouveau
            log.append('Nouvelle annonce %s : %s à %s, %s.' % (ref, typ, c['commune'], ('%s €' % fr_nombre(c['prix'])) if c['prix'] else 'prix non affiché par l\'agence'))
            continue
        ancien_prix, ancien_statut = a.get('prix'), a['status']
        nouveau['lien_complet'] = a.get('lien_complet', False)
        a.update(nouveau); a['last_seen'] = now
        if statut != ancien_statut:
            a['status'], a['status_changed'] = statut, now
            log.append('Annonce %s : statut « %s » → « %s »%s.' % (ref, ancien_statut, statut, ' (mention de l\'agence : %s)' % ', '.join(mentions) if mentions else ''))
        if ancien_prix and c['prix'] and ancien_prix != c['prix']:
            a['prix_precedent'] = ancien_prix
            log.append('Annonce %s : prix %s € → %s €.' % (ref, fr_nombre(ancien_prix), fr_nombre(c['prix'])))
    for ref, a in etat['annonces'].items():
        if ref not in vues and a['status'] in ('en vente', 'sous compromis'):
            # absente de la liste : on vérifie la fiche avant de conclure (la liste de l'agence n'est pas stable)
            en_ligne = False
            try:
                s = get(BASE + a['chemin']).decode('utf-8', 'ignore')
                en_ligne = bool(re.search(r'Ref\s*:\s*%s\b' % re.escape(ref), T(s)))
            except Exception:
                en_ligne = False
            if en_ligne:
                a['last_seen'] = now
                continue
            a['status'], a['status_changed'] = 'retirée', now
            log.append('Annonce %s : absente des pages de l\'agence et fiche hors ligne, sans mention → « retirée ».' % ref)
    etat['maj'] = now
    journal(log)
    if os.path.exists(P('de-claude', 'alerte-sync.md')):
        os.remove(P('de-claude', 'alerte-sync.md'))
    return log

# ---------------------------------------------------------------- file des posts (pour Twin)
def file_posts(etat):
    posts = etat.setdefault('posts', [])
    connus = {(p['ref'], p['cle']) for p in posts}
    prevus = sorted([p['date'] for p in posts if p['action'] == 'publier'], reverse=True)
    stock = not posts   # premier passage : le stock existant est étalé à un par jour ouvré
    jours = jours_ouvres(AUJ + dt.timedelta(days=1)) if stock else None
    # ordre : date de première apparition, puis de la plus récente à la plus ancienne annonce de l'agence (numéro de fiche)
    for a in sorted(etat['annonces'].values(), key=lambda x: (x['first_seen'], -int(x['id']))):
        if not a['photos']['fichiers']:
            continue
        pub = [p for p in posts if p['ref'] == a['ref'] and p['action'] == 'publier']
        if not pub and a['status'] == 'en vente':   # pas de nouveau post pour un bien déjà sous compromis
            d = next(jours) if stock else max(AUJ, dt.date.fromisoformat(a['first_seen']))
            posts.append({'date': d.isoformat(), 'action': 'publier', 'ref': a['ref'], 'cle': 'publier', 'titre': titre(a), 'texte': texte_post(a),
                          'photos': [photo_url(a, i) for i in range(3)], 'lien': lien_agence(a)})
            continue
        if not pub:
            continue
        deja_publie = dt.date.fromisoformat(pub[0]['date']) < AUJ   # le passage de 6 h précède la publication de Twin (15 h)
        cle, texte = None, None
        if a['status'] == 'vendu':
            cle, texte = 'vendu', TXT_VENDU
        elif a['status'] == 'retirée':
            cle, texte = 'retiree', TXT_RETIRE
        elif a['status'] == 'sous compromis':
            cle, texte = 'compromis', 'Sous compromis — ' + texte_post(a)
        elif a.get('prix_precedent') and a.get('prix'):
            cle, texte = 'prix-%d' % a['prix'], texte_post(a)
        if not cle or (a['ref'], cle) in connus:
            continue
        if not deja_publie:
            # pas encore publié : on retire la ligne « publier » si le bien n'est plus proposé, sinon on la met à jour
            if cle in ('vendu', 'retiree'):
                posts.remove(pub[0])
            else:
                pub[0].update(titre=titre(a), texte=texte if cle != 'compromis' else texte_post(a))
                if cle == 'compromis':
                    pub[0]['texte'] = texte
            continue
        posts.append({'date': AUJ.isoformat(), 'action': 'mettre à jour', 'ref': a['ref'], 'cle': cle, 'titre': titre(a), 'texte': texte,
                      'photos': [photo_url(a, i) for i in range(3)], 'lien': lien_agence(a)})
    posts.sort(key=lambda p: (p['date'], p['action'] != 'publier', p['ref']))

def md_posts(etat):
    cell = lambda s: (s or '').replace('|', '\\|').replace('\n', '<br>')
    out = ['# Annonces de l\'agence → posts de la fiche Google « Shawez Ali — Agent immobilier »', '',
           'Généré chaque matin par `outils/sync_annonces.py` à partir de `annonces.json`. Ne pas modifier à la main.', '',
           'Pour Twin : chaque jour ouvré à 15 h, traiter **une seule** ligne « publier » dont la date est aujourd\'hui ou passée (la plus ancienne non encore traitée), '
           'et toutes les lignes « mettre à jour » non encore traitées. Texte et photos tels quels.', '',
           '| date | action | ref | titre | texte du post | photo 1 | photo 2 | photo 3 | lien |', '|---|---|---|---|---|---|---|---|---|']
    for p in etat['posts']:
        out.append('| %s | %s | %s | %s | %s | %s | %s | %s | %s |' % (dt.date.fromisoformat(p['date']).strftime('%d/%m/%Y'), p['action'], p['ref'],
                   cell(p['titre']), cell(p['texte']), p['photos'][0], p['photos'][1], p['photos'][2], p['lien']))
    os.makedirs(P('de-claude'), exist_ok=True)
    open(P('de-claude', 'annonces-google.md'), 'w', encoding='utf-8').write('\n'.join(out) + '\n')

# ---------------------------------------------------------------- page du site
PASTILLE = {'en vente': ('', ''), 'sous compromis': ('Sous compromis', 'st-compromis'), 'vendu': ('Vendu', 'st-vendu')}

def carte_html(a):
    lab, cls = PASTILLE[a['status']]
    href = '/biens-a-vendre/?fiche=' + urllib.parse.quote(lien_agence(a), safe='')
    det = ' · '.join(x for x in [('%d pièce%s' % (a['pieces'], 's' if a['pieces'] > 1 else '')) if a.get('pieces') else '',
                                  ('%s m²' % fr_nombre(a['surface'])) if a.get('surface') else ''] if x)
    return ('<li class="an-card" data-type="%s" data-commune="%s"><a href="%s">'
            '<span class="an-img"><img src="/annonces/%s/1-600.webp" srcset="/annonces/%s/1-600.webp 600w, /annonces/%s/1.jpg 1200w" sizes="(max-width:767px) 100vw, 380px" alt="%s" width="600" height="400" loading="lazy" decoding="async">%s</span>'
            '<span class="an-body"><span class="an-t">%s</span><span class="an-c">%s</span><span class="an-p">%s</span><span class="an-d">%s</span><span class="an-r">%s</span></span></a></li>'
            % (html.escape(a['type']), html.escape(a['commune']), href, a['ref'], a['ref'], a['ref'], html.escape(titre(a)),
               ('<span class="an-st %s">%s</span>' % (cls, lab)) if lab else '', html.escape(a['type']), html.escape('%s (%s)' % (a['commune'], a['cp']) if a.get('cp') else a['commune']),
               ('%s €' % fr_nombre(a['prix'])) if a.get('prix') else 'Prix sur demande', det, html.escape(resume_carte(a))))

CSS = """<style id="annonces-css">
.an-filtres{display:flex;flex-wrap:wrap;gap:12px;margin:0 0 28px;}
.an-filtres label{display:flex;flex-direction:column;gap:6px;font-size:13px;color:#5E5850;}
.an-filtres select{min-height:44px;min-width:180px;padding:0 14px;border:1px solid rgba(15,14,12,.22);border-radius:999px;background:#fff;color:#0F0E0C;font:500 15px var(--font-text);}
.an-n{margin:0 0 18px;font-size:14px;color:#5E5850;}
.an-grid{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(3,1fr);gap:24px;}
.an-card a{display:flex;flex-direction:column;height:100%;border-radius:20px;overflow:hidden;background:#F3EFE6;border:1px solid rgba(15,14,12,.08);color:inherit;text-decoration:none;transition:transform .3s var(--ease,ease),box-shadow .3s;}
.an-card a:hover{transform:translateY(-3px);box-shadow:0 18px 40px rgba(15,14,12,.12);}
.an-card a:focus-visible{outline:2px solid #E3B341;outline-offset:3px;}
.an-img{position:relative;display:block;aspect-ratio:3/2;background:#E6E1D6;}
.an-img img{width:100%;height:100%;object-fit:cover;display:block;}
.an-st{position:absolute;left:12px;top:12px;padding:6px 12px;border-radius:999px;font-size:12px;font-weight:700;letter-spacing:.04em;background:#0F0E0C;color:#F3EFE6;}
.an-st.st-compromis{background:#E3B341;color:#0F0E0C;}
.an-body{display:flex;flex-direction:column;gap:6px;padding:18px 20px 22px;}
.an-t{font-family:var(--font-display);font-weight:360;font-size:21px;line-height:1.2;color:#0F0E0C;}
.an-c{font-size:14px;color:#5E5850;}
.an-p{font-size:18px;font-weight:700;color:#0F0E0C;margin-top:4px;}
.an-d{font-size:14px;color:#2B2824;}
.an-r{font-size:13px;color:#5E5850;}
.an-vendus{margin-top:48px;border-top:1px solid rgba(15,14,12,.12);padding-top:20px;}
.an-vendus summary{cursor:pointer;min-height:44px;display:flex;align-items:center;font-weight:600;}
.an-vendus .an-grid{margin-top:20px;}
.an-note{margin:36px 0 0;font-size:13px;color:#5E5850;max-width:52em;}
@media(max-width:1000px){.an-grid{grid-template-columns:repeat(2,1fr);}}
@media(max-width:767px){.an-grid{grid-template-columns:1fr;gap:18px;}.an-filtres{display:grid;grid-template-columns:1fr 1fr;}.an-filtres select{min-width:0;width:100%;}}
</style>"""

JS = """<script id="annonces-js">
(function(){
  var g=document.getElementById('an-grid'), ft=document.getElementById('f-type'), fc=document.getElementById('f-commune'), n=document.getElementById('an-n');
  if(!g||!ft||!fc)return;
  function maj(){ var t=ft.value, c=fc.value, k=0; Array.prototype.forEach.call(g.children,function(li){ var ok=(!t||li.getAttribute('data-type')===t)&&(!c||li.getAttribute('data-commune')===c); li.hidden=!ok; if(ok)k++; }); n.textContent=k+' bien'+(k>1?'s':''); }
  ft.addEventListener('change',maj); fc.addEventListener('change',maj); maj();
})();
</script>"""

def page(etat):
    tous = sorted(etat['annonces'].values(), key=lambda a: (a['first_seen'], int(a['id'])), reverse=True)   # plus récentes d'abord
    limite = (AUJ - dt.timedelta(days=JOURS_VENDU)).isoformat()
    grille = [a for a in tous if a['photos']['fichiers'] and (a['status'] in ('en vente', 'sous compromis') or (a['status'] == 'vendu' and a['status_changed'] >= limite))]
    vendus = [a for a in tous if a['photos']['fichiers'] and a['status'] == 'vendu' and a['status_changed'] < limite]
    types = sorted({a['type'] for a in grille}); communes = sorted({a['commune'] for a in grille})
    opt = lambda vs: ''.join('<option>%s</option>' % html.escape(v) for v in vs)
    main = ('<main id="main">\n<section class="route" data-route="/biens-a-vendre-dijon" id="r-annonces">\n'
            '  <div class="page-head shell"><p class="label">Biens à vendre</p><h1 class="display d-xl" style="margin-top:14px;">Biens à vendre à Dijon <em>et alentours.</em></h1>'
            '<p class="lede">Les biens de l\'agence GRAVELIN IMMO, que je vous fais visiter. Mis à jour chaque matin.</p></div>\n'
            '  <div class="shell" style="padding-bottom:clamp(72px,10vw,136px);">\n'
            '    <div class="an-filtres"><label>Type<select id="f-type"><option value="">Tous les types</option>%s</select></label>'
            '<label>Commune<select id="f-commune"><option value="">Toutes les communes</option>%s</select></label></div>\n'
            '    <p class="an-n" id="an-n" aria-live="polite">%d biens</p>\n'
            '    <ul class="an-grid" id="an-grid">%s</ul>\n%s'
            '    <p class="an-note">Annonces de l\'agence GRAVELIN IMMO, reprises chaque matin. Prix honoraires inclus. Le détail, le diagnostic de performance énergétique et les informations sur les risques figurent sur la fiche de chaque bien.</p>\n'
            '  </div>\n</section>\n</main>'
            % (opt(types), opt(communes), len(grille), ''.join(carte_html(a) for a in grille),
               ('    <details class="an-vendus"><summary>Vendus récemment (%d)</summary><ul class="an-grid">%s</ul></details>\n' % (len(vendus), ''.join(carte_html(a) for a in vendus))) if vendus else ''))
    s = open(P('avis', 'index.html'), encoding='utf-8').read()
    s = re.sub(r'<main id="main">.*?</main>', lambda m: main, s, flags=re.S)
    s = re.sub(r'<style id="avis-css">.*?</style>\n?', '', s, flags=re.S)
    s = re.sub(r'<style id="annonces-css">.*?</style>\n?|<script id="annonces-js">.*?</script>\n?', '', s, flags=re.S)
    t = 'Biens à vendre à Dijon et alentours | Shawez Ali'
    d = 'Les biens à vendre de l\'agence GRAVELIN IMMO à Dijon et alentours : maisons, appartements, propriétés. Mis à jour chaque jour.'
    s = re.sub(r'<title>.*?</title>', '<title>%s</title>' % t, s, 1)
    for k in ('og:title', 'twitter:title'):
        s = re.sub(r'(<meta (?:property|name)="%s" content=")[^"]*' % k, lambda m: m.group(1) + t, s)
    for k in ('description', 'og:description', 'twitter:description'):
        s = re.sub(r'(<meta (?:property|name)="%s" content=")[^"]*' % k, lambda m: m.group(1) + d, s)
    s = s.replace('https://shawez-immo.com/avis/', SITE + '/biens-a-vendre-dijon/')
    s = re.sub(r'<script type="application/ld\+json">(.*?)</script>', lambda m: '<script type="application/ld+json">%s</script>' % jsonld(m.group(1), grille), s, flags=re.S)
    s = s.replace('</head>', CSS + '\n</head>', 1).replace('</body>', JS + '\n</body>', 1)
    for a in grille + vendus:
        verifie_public(titre(a), 'page'); verifie_public(resume_carte(a), 'page')
    os.makedirs(P('biens-a-vendre-dijon'), exist_ok=True)
    open(P('biens-a-vendre-dijon', 'index.html'), 'w', encoding='utf-8').write(s)

SCHEMA = {'Appartement': 'Apartment', 'Duplex': 'Apartment', 'Studio': 'Apartment', 'Loft': 'Apartment', 'Maison': 'SingleFamilyResidence',
          'Propriété': 'SingleFamilyResidence', 'Château': 'SingleFamilyResidence', 'Immeuble': 'Residence'}

def jsonld(txt, grille):
    d = json.loads(txt)
    g = d.get('@graph', [d])
    g[:] = [x for x in g if x.get('@type') not in ('ItemList',)]
    items = []
    for i, a in enumerate(grille, 1):
        bien = {'@type': SCHEMA.get(a['type'], 'Place'), 'name': titre(a), 'address': {'@type': 'PostalAddress', 'addressLocality': a['commune'], 'postalCode': a['cp'], 'addressCountry': 'FR'}}
        if a.get('pieces'): bien['numberOfRooms'] = a['pieces']
        if a.get('surface'): bien['floorSize'] = {'@type': 'QuantitativeValue', 'value': a['surface'], 'unitCode': 'MTK'}
        offre_prix = {'price': a['prix'], 'priceCurrency': 'EUR'} if a.get('prix') else {}
        items.append({'@type': 'ListItem', 'position': i, 'item': {**offre_prix,
            '@type': 'Offer', 'name': titre(a), 'url': lien_agence(a), 'image': photo_url(a, 0),
            'availability': 'https://schema.org/SoldOut' if a['status'] == 'vendu' else 'https://schema.org/InStock',
            'businessFunction': 'https://purl.org/goodrelations/v1#Sell', 'seller': {'@id': SITE + '/#gravelin'}, 'itemOffered': bien}})
    g.append({'@type': 'ItemList', '@id': SITE + '/biens-a-vendre-dijon/#liste', 'name': 'Biens à vendre à Dijon et alentours', 'numberOfItems': len(items), 'itemListElement': items})
    return json.dumps(d, ensure_ascii=False)

def sitemap(etat):
    """lastmod = dernier vrai changement (nouvelle annonce, statut, prix), pas la date du passage."""
    dates = [a['first_seen'] for a in etat['annonces'].values()] + [a['status_changed'] for a in etat['annonces'].values()] + [p['date'] for p in etat['posts'] if p['action'] != 'publier']
    der = min(max(dates), AUJ.isoformat()) if dates else AUJ.isoformat()
    f = P('sitemap.xml'); s = open(f, encoding='utf-8').read()
    loc = SITE + '/biens-a-vendre-dijon/'
    ligne = '  <url><loc>%s</loc><lastmod>%s</lastmod><priority>0.8</priority></url>\n' % (loc, der)
    s = re.sub(r'  <url><loc>%s</loc>.*?</url>\n' % re.escape(loc), '', s)
    open(f, 'w', encoding='utf-8').write(s.replace('</urlset>', ligne + '</urlset>'))

# ---------------------------------------------------------------- fiches incomplètes
REQUIS = ('ref', 'id', 'type', 'commune', 'status', 'first_seen', 'photos')

def manque(a):
    return [k for k in REQUIS if a.get(k) in (None, '')]

def ecarte_incompletes(etat):
    """Une fiche incomplète (ex. KeyError 'type' du 9/10) ne bloque plus tout le passage :
    elle est mise de côté (ni post, ni page), gardée dans annonces.json, et signalée dans de-claude/alerte-sync.md."""
    mises_de_cote = {}
    for ref, a in list(etat['annonces'].items()):
        m = manque(a)
        if m:
            mises_de_cote[ref] = etat['annonces'].pop(ref)
            print('ALERTE : annonce %s mise de côté (manque %s)' % (ref, ', '.join(m)))
    if mises_de_cote:
        os.makedirs(P('de-claude'), exist_ok=True)
        with open(P('de-claude', 'alerte-sync.md'), 'w', encoding='utf-8') as o:
            o.write('# Alerte : fiche(s) d\'annonce incomplète(s)\n\n%s — %d fiche(s) mise(s) de côté, les autres annonces sont à jour.\n\n%s\n'
                    % (dt.datetime.now(PARIS).strftime('%d/%m/%Y %H:%M'), len(mises_de_cote),
                       '\n'.join('- %s : manque %s' % (r, ', '.join(manque(a))) for r, a in mises_de_cote.items())))
    return mises_de_cote

def normalise(etat):
    """Corrections appliquées aussi aux annonces déjà connues (sans relire le site)."""
    for a in etat['annonces'].values():
        a['chemin'] = chemin_stocke(a['chemin'], a['id'], a.get('lien_complet'))
        if not a.get('surface') and a['type'].startswith('Terrain') and a['caracteristiques'].get('surfterrn'):
            a['surface'] = nombre(a['caracteristiques']['surfterrn'])

def ecrit(etat):
    json.dump(etat, open(P('annonces.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1, sort_keys=True)

if __name__ == '__main__':
    etat = charge()
    if '--sans-web' not in sys.argv:
        r = synchronise(etat)
        if r is False:
            sys.exit(0)   # alerte écrite, rien d'autre ne bouge
    cote = ecarte_incompletes(etat)
    normalise(etat)
    file_posts(etat)
    etat['annonces'].update(cote)   # gardées telles quelles dans annonces.json
    ecrit(etat)
    for r in cote:
        etat['annonces'].pop(r)
    md_posts(etat)
    page(etat)
    sitemap(etat)
    n = sum(1 for a in etat['annonces'].values() if a['status'] in ('en vente', 'sous compromis'))
    print('%d annonces actives · %d au total · %d lignes de posts' % (n, len(etat['annonces']), len(etat['posts'])))

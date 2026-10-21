"""Vidéos des biens reprises automatiquement d'Instagram (@shawez_immo) — chaque matin, avec la synchronisation des annonces.

Shawez publie ses Reels sur Instagram et ne dépose rien sur le site. Ce script :
1. lit ses Reels par l'API officielle d'Instagram (jeton IG_TOKEN, secret GitHub ; rien d'autre à faire pour lui) ;
2. relie chaque Reel à un bien : registre videos-biens.json (tenu par l'agent ManyChat), liste « instagram » de
   medias.json, ou légende qui cite la commune ET le prix de l'annonce ;
3. garde, pour chaque bien, la version « qualité » : jamais une version avec le prix incrusté sur l'image (lecture des
   images par OCR), jamais un court teaser (moins de 15 s), puis la plus longue et la plus nette ;
4. l'encode pour le site (outils/biens/video.py : MP4 + WebM + affiche) et la note dans medias.json, avec le Reel à
   ouvrir au clic. La fiche du bien la fait tourner seule, sans le son, en boucle (build_biens.py).

Sans jeton : le script le dit et ne fait rien (la synchronisation des annonces continue).
Un Reel déjà examiné n'est pas re-téléchargé (medias.json → reels_vus).

    IG_TOKEN=… python3 outils/biens/reels.py            # tous les biens
    python3 outils/biens/reels.py --fichier 520 V.mp4   # essai sur un fichier local : verdict seulement
"""
import json, os, re, subprocess, sys, tempfile, urllib.parse, urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from commun import P, charge_medias, ecrit_medias, charge_annonces

API = 'https://graph.instagram.com/v21.0'
API_FB = 'https://graph.facebook.com/v21.0'
DUREE_MIN = 15.0
CHAMPS = 'id,shortcode,caption,media_type,media_product_type,media_url,thumbnail_url,timestamp,permalink'
# « 200 000 € », « 200000€ », « 1,6 million € », « 139 000€ » … incrustés sur l'image
PRIX = re.compile(r'(\d[\d\s.,]{2,}\s*(€|EUR|euros?)|(€|EUR)\s*\d|\bmillions?\s*€)', re.I)


def lire(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'shawez-immo-sync'}), timeout=60) as r:
        return json.loads(r.read().decode('utf-8'))


def reels(jeton, limite=200):
    """Les Reels du compte, du plus récent au plus ancien. IG_BUSINESS_ID défini → API Facebook (jeton de page, sans
    date d'expiration) ; sinon API Instagram (jeton Instagram de 60 jours, rafraîchi à chaque passage)."""
    biz = os.environ.get('IG_BUSINESS_ID')
    url = ('%s/%s/media?fields=%s&limit=50&access_token=%s' % (API_FB, biz, CHAMPS, urllib.parse.quote(jeton)) if biz
           else '%s/me/media?fields=%s&limit=50&access_token=%s' % (API, CHAMPS, urllib.parse.quote(jeton)))
    out = []
    while url and len(out) < limite:
        d = lire(url)
        out += [x for x in d.get('data', []) if x.get('media_type') == 'VIDEO']
        url = (d.get('paging') or {}).get('next')
    return out


def rafraichir(jeton):
    """Jeton Instagram longue durée : on le prolonge à chaque passage (60 jours de plus). Renvoie le nouveau ou None."""
    if os.environ.get('IG_BUSINESS_ID'):
        return None
    try:
        d = lire('%s/refresh_access_token?grant_type=ig_refresh_token&access_token=%s' % (API.rsplit('/', 1)[0], urllib.parse.quote(jeton)))
        return d.get('access_token')
    except Exception as e:  # noqa: BLE001
        print('Jeton Instagram : prolongation impossible (%s)' % e)
        return None


def norm(s):
    s = (s or '').lower()
    for a, b in (('é', 'e'), ('è', 'e'), ('ê', 'e'), ('à', 'a'), ('â', 'a'), ('î', 'i'), ('ô', 'o'), ('û', 'u'), ('ç', 'c'), ('-', ' ')):
        s = s.replace(a, b)
    return re.sub(r'\s+', ' ', s)


def prix_dans(texte, prix):
    if not prix:
        return False
    p = int(round(prix))
    chiffres = re.sub(r'[^\d]', '', texte or '')
    return str(p) in chiffres or str(p // 1000) in re.findall(r'(\d+)\s*k\b', texte or '', re.I)


def biens_du_reel(r, annonces, registre, medias):
    """Références des biens que ce Reel montre."""
    code = r.get('shortcode') or ''
    refs = set()
    x = registre.get(code)
    if isinstance(x, dict) and x.get('ref') and x['ref'] in annonces:
        refs.add(x['ref'])
    for ref, m in medias.items():
        if code and code in (m.get('instagram') or []):
            refs.add(ref)
    if not refs:
        leg = norm(r.get('caption'))
        for ref, a in annonces.items():
            if a.get('status') not in ('en vente', 'sous offre'):
                continue
            if a.get('commune') and norm(a['commune']) in leg and prix_dans(r.get('caption'), a.get('prix')):
                refs.add(ref)
    return refs


def sonde(f):
    out = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height',
                          '-show_entries', 'format=duration', '-of', 'json', f], capture_output=True, text=True, check=True).stdout
    d = json.loads(out)
    s = (d.get('streams') or [{}])[0]
    return float(d['format']['duration']), int(s.get('width') or 0), int(s.get('height') or 0)


def prix_incruste(f, duree):
    """Vrai si un prix est écrit sur l'image (titre « 200 000 € » des versions annonce). On lit 6 images réparties
    sur la vidéo, le tiers haut puis l'image entière, en noir et blanc agrandi."""
    with tempfile.TemporaryDirectory() as d:
        for i, t in enumerate([duree * k / 7 for k in range(1, 7)]):
            img = os.path.join(d, '%d.png' % i)
            subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', '%.2f' % t, '-i', f, '-frames:v', '1',
                            '-vf', 'scale=1080:-2,format=gray', img], check=True)
            for zone in ('crop=iw:ih*0.42:0:0', 'null'):
                z = os.path.join(d, 'z.png')
                subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', img, '-vf', zone, z], check=True)
                txt = subprocess.run(['tesseract', z, '-', '--psm', '11', '-l', langue()], capture_output=True, text=True).stdout
                if PRIX.search(txt.replace('\n', ' ')):
                    return True
    return False


def langue():
    langs = subprocess.run(['tesseract', '--list-langs'], capture_output=True, text=True).stdout
    return 'fra' if '\nfra' in langs else 'eng'


def examiner(f):
    duree, w, h = sonde(f)
    if duree < DUREE_MIN:
        return {'verdict': 'trop_court', 'duree': round(duree, 1), 'largeur': w, 'hauteur': h}
    if h < w:
        return {'verdict': 'horizontal', 'duree': round(duree, 1), 'largeur': w, 'hauteur': h}
    if prix_incruste(f, duree):
        return {'verdict': 'prix_incruste', 'duree': round(duree, 1), 'largeur': w, 'hauteur': h}
    return {'verdict': 'ok', 'duree': round(duree, 1), 'largeur': w, 'hauteur': h}


def telecharger(url, dst):
    req = urllib.request.Request(url, headers={'User-Agent': 'shawez-immo-sync'})
    with urllib.request.urlopen(req, timeout=180) as r, open(dst, 'wb') as o:
        while True:
            b = r.read(1 << 20)
            if not b:
                break
            o.write(b)


def principal():
    jeton = os.environ.get('IG_TOKEN', '').strip()
    if not jeton:
        print('Vidéos Instagram : pas de jeton IG_TOKEN, rien à faire.')
        return 0
    from video import encoder_bien
    annonces = charge_annonces()['annonces']
    try:
        registre = json.load(open(P('videos-biens.json'), encoding='utf-8')).get('videos', {})
    except FileNotFoundError:
        registre = {}
    m = charge_medias()
    biens = m.setdefault('biens', {})
    vus = m.setdefault('reels_vus', {})
    liste = reels(jeton)
    print('Vidéos Instagram : %d Reels lus' % len(liste))
    par_bien = {}
    for r in liste:
        for ref in biens_du_reel(r, annonces, registre, biens):
            par_bien.setdefault(ref, []).append(r)
    faits = 0
    with tempfile.TemporaryDirectory() as tmp:
        for ref, rs in sorted(par_bien.items()):
            a = annonces.get(ref) or {}
            if a.get('status') not in ('en vente', 'sous offre', 'sous compromis'):
                continue
            actuelle = (biens.get(ref) or {}).get('video') or {}
            if actuelle and not str(actuelle.get('source', '')).startswith('instagram:'):
                continue            # vidéo choisie à la main : on n'y touche pas
            candidats = []
            for r in rs:
                code = r.get('shortcode') or r['id']
                if code not in vus:
                    if not r.get('media_url'):
                        continue
                    f = os.path.join(tmp, code + '.mp4')
                    try:
                        telecharger(r['media_url'], f)
                        vus[code] = dict(examiner(f), ref=ref, le=r.get('timestamp'))
                    except Exception as e:  # noqa: BLE001
                        print('  %s %s : illisible (%s)' % (ref, code, e))
                        continue
                    vus[code]['_fichier'] = f
                print('  %s %s : %s (%s s)' % (ref, code, vus[code]['verdict'], vus[code].get('duree')))
                if vus[code]['verdict'] == 'ok':
                    candidats.append((vus[code]['duree'] * (vus[code]['hauteur'] or 1), r.get('timestamp') or '', code, r))
            if not candidats:
                continue
            candidats.sort(reverse=True)
            _, _, code, r = candidats[0]
            if actuelle.get('source') == 'instagram:' + code:
                continue
            f = vus[code].get('_fichier')
            if not f or not os.path.exists(f):
                f = os.path.join(tmp, code + '.mp4')
                telecharger(r['media_url'], f)
            encoder_bien(ref, f, texte='instagram:' + code, extra={'reel': code})
            m = charge_medias()            # encoder_bien a réécrit medias.json
            biens, vus_m = m.setdefault('biens', {}), m.setdefault('reels_vus', {})
            vus_m.update({k: v for k, v in vus.items()})
            vus = vus_m
            ig = [code] + [x for x in (biens[ref].get('instagram') or []) if x != code]
            biens[ref]['instagram'] = ig
            ecrit_medias(m)
            faits += 1
    for v in vus.values():
        v.pop('_fichier', None)
    m['reels_vus'] = vus
    ecrit_medias(m)
    rafraichir(jeton)               # jeton Instagram de 60 jours : prolongé à chaque passage (sans effet avec IG_BUSINESS_ID)
    print('Vidéos Instagram : %d bien(s) mis à jour' % faits)
    return faits


if __name__ == '__main__':
    if len(sys.argv) == 4 and sys.argv[1] == '--fichier':
        print(sys.argv[2], json.dumps(examiner(sys.argv[3]), ensure_ascii=False))
    else:
        principal()

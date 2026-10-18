"""Outils communs du système d'annonces de shawez-immo.com (fiches /biens/…, photos, vidéos).

Données :
- annonces.json (racine)            : les annonces (tenu à jour chaque matin par outils/sync_annonces.py) ;
- outils/biens/medias.json          : par référence, le dossier Drive du bien, les photos HD reprises du Drive,
                                      la vidéo et la visite virtuelle (non publié : /outils/* renvoie 404) ;
- assets/biens/<ref>/               : photos optimisées (AVIF + WebP, deux tailles) et vidéo du bien.
"""
import json, os, re, unicodedata

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
P = lambda *a: os.path.join(ROOT, *a)
SITE = 'https://shawez-immo.com'
MEDIAS = P('outils', 'biens', 'medias.json')
ACTIFS = ('en vente', 'sous offre', 'sous compromis')


def slug(s):
    s = unicodedata.normalize('NFKD', str(s)).encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[^a-z0-9]+', '-', s).strip('-')


def chemin_fiche(a):
    """Adresse de la fiche d'un bien : /biens/<ref>-<type>-<commune>/ (même règle dans functions/api/manychat-dm.js)."""
    return '/biens/%s/' % '-'.join(x for x in (slug(a['ref']), slug(a.get('type') or 'bien'), slug(a.get('commune') or '')) if x)


def charge_annonces():
    return json.load(open(P('annonces.json'), encoding='utf-8'))


def charge_medias():
    try:
        return json.load(open(MEDIAS, encoding='utf-8'))
    except FileNotFoundError:
        return {'biens': {}}


def ecrit_medias(m):
    with open(MEDIAS, 'w', encoding='utf-8') as o:
        json.dump(m, o, ensure_ascii=False, indent=1, sort_keys=True)
        o.write('\n')


def dhash(im, n=16):
    from PIL import Image
    g = im.convert('L').resize((n + 1, n), Image.LANCZOS)
    p = list(g.getdata())
    return [p[r * (n + 1) + c] > p[r * (n + 1) + c + 1] for r in range(n) for c in range(n)]


def distance(a, b):
    return sum(x != y for x, y in zip(a, b))


def enregistre_tailles(im, dossier, n, tailles):
    """Écrit <n>-<largeur>.avif et .webp pour chaque largeur demandée (sans agrandir). Renvoie les largeurs écrites."""
    from PIL import Image
    im = im.convert('RGB')
    faites = []
    for w in tailles:
        w = min(w, im.width)
        if w in faites:
            continue
        h = round(im.height * w / im.width)
        r = im.resize((w, h), Image.LANCZOS) if w != im.width else im
        r.save(os.path.join(dossier, '%s-%d.webp' % (n, w)), 'WEBP', quality=80, method=6)
        r.save(os.path.join(dossier, '%s-%d.avif' % (n, w)), 'AVIF', quality=58, speed=6)
        faites.append(w)
    return faites

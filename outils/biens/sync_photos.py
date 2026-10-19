"""Photos HD d'un bien, reprises de son dossier Google Drive → assets/biens/<ref>/.

    python3 outils/biens/sync_photos.py <ref> --drive <id du dossier Drive> FICHIER [FICHIER…]

FICHIER : une photo (jpg, png, webp, heic si pillow-heif est installé) ou le fichier JSON rendu par l'outil Google Drive
« download_file_content » ({content: base64, id, title}) — on peut donc passer directement les fichiers enregistrés par
l'outil, sans les décoder à la main.

Ce que fait le script :
1. Il compare chaque photo du Drive aux photos de l'annonce (annonces/<ref>/N.jpg) par empreinte visuelle.
2. Pour chaque photo de l'annonce retrouvée dans le Drive, la version HD du Drive la remplace sur la fiche
   (même ordre que l'annonce, mêmes exclusions : plans, documents, photos retirées).
3. Si l'annonce n'a aucune photo (bien pas encore publié), les photos du Drive sont prises dans l'ordre des noms
   de fichiers, documents et plans écartés.
4. Il écrit outils/biens/medias.json (dossier Drive, date, photos HD) puis il suffit de relancer
   python3 outils/biens/build_biens.py.

Rien n'est jamais supprimé ni déplacé dans le Drive : on ne fait que lire.
"""
import argparse, base64, datetime as dt, glob, io, json, os, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from commun import P, charge_annonces, charge_manuels, charge_medias, ecrit_medias, dhash, distance, enregistre_tailles

SEUIL = 16          # écart d'empreinte (sur 256) en dessous duquel deux photos sont la même prise de vue
TAILLES = (640, 1920)


def lit(fichier):
    """Renvoie (nom, image PIL) ; accepte une image ou un JSON de l'outil Drive."""
    from PIL import Image
    try:
        import pillow_heif
        pillow_heif.register_heif_opener()
    except Exception:
        pass
    brut = open(fichier, 'rb').read()
    nom = os.path.basename(fichier)
    if brut[:1] in (b'{', b'['):
        d = json.loads(brut.decode('utf-8'))
        brut = base64.b64decode(d['content'])
        nom = d.get('title') or d.get('id') or nom
    im = Image.open(io.BytesIO(brut))
    im.load()
    try:
        from PIL import ImageOps
        im = ImageOps.exif_transpose(im)
    except Exception:
        pass
    return nom, im


def document_probable(im):
    from PIL import ImageStat
    p = im.convert('RGB').resize((64, 64))
    px = list(p.getdata())
    blanc = sum(1 for r, g, b in px if r > 225 and g > 225 and b > 225) / len(px)
    return blanc > 0.55 and ImageStat.Stat(p.convert('HSV')).mean[1] < 25


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('ref')
    ap.add_argument('--drive', default='', help='identifiant du dossier Google Drive des photos du bien')
    ap.add_argument('fichiers', nargs='+')
    a = ap.parse_args()

    annonce = charge_annonces()['annonces'].get(a.ref)
    if annonce is None and a.ref in charge_manuels(medias={}):
        annonce = {'photos': {'fichiers': []}}   # bien hors Hektor (outils/biens/manuels.json) : photos du Drive seules
    if annonce is None:
        sys.exit('Référence inconnue dans annonces.json : %s' % a.ref)
    drive = []
    for f in a.fichiers:
        for g in sorted(glob.glob(f)) or [f]:
            try:
                nom, im = lit(g)
            except Exception as e:
                print('  ignoré', g, e)
                continue
            if document_probable(im):
                print('  document ou plan écarté :', nom)
                continue
            drive.append((nom, im, dhash(im)))
    print('%d photo(s) du Drive lue(s)' % len(drive))

    dossier = P('assets', 'biens', a.ref)
    os.makedirs(dossier, exist_ok=True)
    hd, pris = [], set()
    fichiers = annonce['photos']['fichiers']
    if fichiers:
        from PIL import Image
        for nf in fichiers:
            n = int(nf.split('.')[0])
            h = dhash(Image.open(P('annonces', a.ref, nf)))
            choix = sorted((distance(h, d[2]), i) for i, d in enumerate(drive) if i not in pris)
            if choix and choix[0][0] <= SEUIL:
                i = choix[0][1]
                pris.add(i)
                for x in glob.glob(os.path.join(dossier, '%d-*.*' % n)):
                    os.remove(x)   # anciennes tailles de cette photo (générées par le site), remplacées par la HD
                enregistre_tailles(drive[i][1], dossier, n, TAILLES)
                hd.append(n)
                print('  photo %d de l\'annonce ← %s (écart %d)' % (n, drive[i][0], choix[0][0]))
            else:
                print('  photo %d de l\'annonce : pas d\'équivalent HD dans le Drive' % n)
    else:
        for n, (nom, im, _) in enumerate(sorted(drive, key=lambda d: d[0]), 1):
            enregistre_tailles(im, dossier, n, TAILLES)
            hd.append(n)
    if os.path.exists(os.path.join(dossier, 'og.jpg')):
        os.remove(os.path.join(dossier, 'og.jpg'))   # l'image de partage sera refaite à partir de la photo HD
    m = charge_medias()
    b = m['biens'].setdefault(a.ref, {})
    b['drive'] = {'dossier': a.drive or b.get('drive', {}).get('dossier', ''), 'maj': dt.date.today().isoformat(),
                  'photos_hd': hd, 'photos_drive': len(drive)}
    if not fichiers:
        b['drive']['seules'] = True   # la fiche n'utilise que les photos du Drive
    ecrit_medias(m)
    print('%d photo(s) HD retenue(s) pour %s. Relancer : python3 outils/biens/build_biens.py' % (len(hd), a.ref))


if __name__ == '__main__':
    main()

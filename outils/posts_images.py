#!/usr/bin/env python3
"""Produit les images carrées des posts Google à partir des assets du site.

Usage (depuis la racine du dépôt) :
    python3 outils/posts_images.py                              # lit de-claude/images-a-fournir.md
    python3 outils/posts_images.py chemin/vers/liste.md
    python3 outils/posts_images.py --taille 1200 --qualite 88 liste.md

La liste contient une ligne par image, « nom → asset » (on accepte aussi ←, ->, <-, = et :),
dans n'importe quel ordre ; le côté en .jpg est le nom produit, l'autre côté est l'asset source :
    post-chateau.jpg ← assets/chateau-facade-allee.webp
    - post-loft.jpg → assets/loft-charpente-mezzanine.webp
Les lignes qui ne contiennent pas ce motif (titres, commentaires) sont ignorées.

Recadrage : carré centré ; pour les portraits (asset dont le nom contient « shawez » ou
« equipe », ou ligne terminée par « (haut) »), le carré est placé sur le tiers supérieur.
Une ligne terminée par « (centre) » force le recadrage centré.

Sortie : posts-images/<nom>.jpg, JPEG RVB, sans métadonnées. Les sources plus petites que
la taille demandée sont agrandies (Lanczos) et signalées dans le rapport.
"""
import argparse
import re
import sys
from pathlib import Path

from PIL import Image, ImageOps

RACINE = Path(__file__).resolve().parent.parent
LIGNE = re.compile(r'([\w./-]+\.(?:jpe?g|webp|png))\s*(?:←|→|<-|->|=|:)\s*([\w./-]+\.(?:jpe?g|webp|png))(.*)$', re.I)


def lire_liste(chemin):
    paires = []
    for n, brut in enumerate(Path(chemin).read_text(encoding='utf-8').splitlines(), 1):
        m = LIGNE.search(brut.replace('`', ''))
        if not m:
            continue
        a, b, reste = m.group(1), m.group(2), m.group(3).lower()
        nom, asset = (a, b) if a.lower().endswith(('.jpg', '.jpeg')) and not b.lower().endswith(('.jpg', '.jpeg')) else (b, a) if b.lower().endswith(('.jpg', '.jpeg')) else (a, b)
        mode = 'haut' if '(haut)' in reste else 'centre' if '(centre)' in reste else None
        paires.append((n, Path(nom).name, asset, mode))
    return paires


def est_portrait(asset, mode):
    if mode:
        return mode == 'haut'
    nom = Path(asset).name.lower()
    return 'shawez' in nom or 'equipe' in nom


def carre(im, haut):
    w, h = im.size
    c = min(w, h)
    if w > h:
        gauche, dessus = (w - c) // 2, 0
    else:
        gauche = 0
        # tiers supérieur : le centre du carré à 1/3 de la hauteur (borné à l'image)
        dessus = (h - c) // 2 if not haut else max(0, min(h - c, round(h / 3 - c / 2)))
    return im.crop((gauche, dessus, gauche + c, dessus + c))


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('liste', nargs='?', default=str(RACINE / 'de-claude' / 'images-a-fournir.md'))
    ap.add_argument('--taille', type=int, default=1200)
    ap.add_argument('--qualite', type=int, default=88)
    ap.add_argument('--sortie', default=str(RACINE / 'posts-images'))
    a = ap.parse_args()

    paires = lire_liste(a.liste)
    if not paires:
        sys.exit('Aucune ligne « nom → asset » trouvée dans %s' % a.liste)
    sortie = Path(a.sortie)
    sortie.mkdir(parents=True, exist_ok=True)
    erreurs = 0
    for n, nom, asset, mode in paires:
        src = (RACINE / asset) if not Path(asset).is_absolute() else Path(asset)
        if not src.exists():
            print('ERREUR ligne %d : source introuvable %s' % (n, asset))
            erreurs += 1
            continue
        im = ImageOps.exif_transpose(Image.open(src)).convert('RGB')
        haut = est_portrait(asset, mode)
        sq = carre(im, haut)
        agrandie = sq.size[0] < a.taille
        sq = sq.resize((a.taille, a.taille), Image.LANCZOS)
        dest = sortie / (nom if nom.lower().endswith('.jpg') else nom + '.jpg')
        sq.save(dest, 'JPEG', quality=a.qualite, optimize=True, progressive=True)
        print('%-32s ← %-52s %s%s' % (dest.name, asset, 'haut' if haut else 'centre',
                                        ' · agrandie depuis %dpx' % min(im.size) if agrandie else ''))
    print('%d image(s) produite(s), %d erreur(s) → %s' % (len(paires) - erreurs, erreurs, sortie))
    sys.exit(1 if erreurs else 0)


if __name__ == '__main__':
    main()

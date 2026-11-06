#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Fabrique un Reel vertical à partir des PHOTOS d'un bien, quand il n'existe aucune vidéo.

Pourquoi ce fichier existe (06/11/2026). Shawez : « toutes les vidéos doivent être publiées de A à Z,
aucune ne doit être manquée ». En cherchant, on a trouvé le vrai mur : sur les trente-quatre biens
réellement en vente ce jour-là, une quinzaine n'ont JAMAIS été filmés. Les archives Instagram et
YouTube ne contiennent rien pour eux, ou seulement une copie de diffusion en 360x640, qui est
inutilisable. On ne fabrique pas des images qui n'ont pas été tournées.

En revanche, chaque annonce a ses photos, en 1200 px de large, et une photo bien animée fait un Reel
honnête. C'est un format courant en immobilier et il vaut infiniment mieux qu'une annonce muette.

Le rendu reprend exactement le style des Trial Reels — mêmes polices, même accroche, même pastille
jaune de fin — pour que le compte garde une seule écriture. Les textes ne disent QUE ce qui est dans
annonces.json : pas un prix, pas une surface, pas une pièce inventée. Jamais d'adresse exacte ni de
nom de vendeur, c'est public.

    python3 outils/biens/diaporama.py 509 --mot COUCHEY \
        --accroche "Deux maisons|pour le prix d'une" \
        --lignes "Entièrement rénovées" "Au cœur du village viticole" "141 m² habitables"
"""
import argparse
import io
import json
import os
import subprocess
import sys
import tempfile

from PIL import Image, ImageDraw, ImageFilter

ICI = os.path.dirname(os.path.abspath(__file__))
RACINE = os.path.abspath(os.path.join(ICI, '..', '..'))
sys.path.insert(0, os.path.join(RACINE, 'outils', 'trial-reels'))
import fabriquer as tr  # accroche(), mot_plan(), appel(), duree_accroche() : le style maison

W, H = tr.W, tr.H
PAR_PHOTO = 2.7          # secondes par photo : assez pour lire, assez court pour ne pas lasser
DUREE_MINI = 15.0        # en dessous, un Reel n'a pas le temps d'accrocher : on tient chaque photo plus longtemps
MAX_PHOTOS = 8           # au-delà le Reel traîne et la rétention tombe
SUR_ECHANTILLON = 2      # on monte à 2x avant le zoom, sinon zoompan rend une image molle


def photos(ref):
    """Les photos de l'annonce, dans l'ordre du site, en 1200 px. Les webp d'abord, sinon les avif."""
    d = os.path.join(RACINE, 'assets', 'biens', ref)
    for ext in ('webp', 'avif'):
        f = [p for p in os.listdir(d) if p.endswith('-1200.' + ext)]
        if f:
            # 1-1200.webp, 2-1200.webp… : tri numérique, pas alphabétique, sinon 10 passe avant 2
            f.sort(key=lambda p: int(p.split('-')[0]) if p.split('-')[0].isdigit() else 999)
            return [os.path.join(d, p) for p in f]
    return []


def plaque(src, sortie):
    """Une photo paysage posée sur un fond vertical sombre, dans l'écriture du compte.

    Premier essai le 06/11/2026 : fond = la même photo floutée et assombrie. Rendu mou et gris,
    surtout quand la photo est un plafond clair ou un mur uni — l'image donnait l'impression d'un
    cadre vide plutôt que d'une mise en page. On garde donc un fond presque noir, celui des panneaux
    du compte, avec juste un voile de la photo pour que la couleur de la pièce respire. C'est net,
    c'est volontaire, et ça ne vole pas l'attention à la photo.

    On travaille en 1200 px de large, la taille native des photos du site : aucun agrandissement.
    """
    im = Image.open(src).convert('RGB')
    cw, ch = 1200, 2133                      # 9:16 à la largeur native des photos
    r = max(cw / im.width, ch / im.height)
    voile = im.resize((max(1, round(im.width * r)), max(1, round(im.height * r))), Image.LANCZOS)
    voile = voile.crop(((voile.width - cw) // 2, (voile.height - ch) // 2,
                        (voile.width - cw) // 2 + cw, (voile.height - ch) // 2 + ch))
    voile = voile.filter(ImageFilter.GaussianBlur(60))
    fond = Image.new('RGB', (cw, ch), (14, 14, 14))
    fond = Image.blend(fond, voile, 0.22)

    av = im.resize((cw, max(1, round(im.height * cw / im.width))), Image.LANCZOS)
    y = (ch - av.height) // 2
    # Une ombre portée sous la photo : elle la décolle du fond et évite l'effet « collé à plat ».
    ombre = Image.new('RGB', (cw, ch), (0, 0, 0))
    m = Image.new('L', (cw, ch), 0)
    ImageDraw.Draw(m).rectangle([0, y - 6, cw, y + av.height + 6], fill=190)
    fond.paste(ombre, (0, 0), m.filter(ImageFilter.GaussianBlur(26)))
    fond.paste(av, (0, y))
    fond.save(sortie, quality=95)


def monter(ref, mot, texte_accroche, lignes, sortie, tmp, prive=False, par_photo=None):
    src = photos(ref)
    if not src:
        raise SystemExit("Aucune photo en 1200 px pour le bien %s : rien à monter." % ref)
    src = src[:MAX_PHOTOS]
    n = len(src)
    # Un bien avec peu de photos aurait un Reel de huit secondes, trop court pour accrocher
    # et trop court pour que la fin « Commente MOT » ait le temps d'exister. On tient alors
    # chaque photo plus longtemps plutôt que d'inventer des images.
    par_photo = par_photo or max(PAR_PHOTO, DUREE_MINI / n if n else PAR_PHOTO)
    total = n * par_photo

    entrees, filtres = [], []
    for i, p in enumerate(src):
        pl = os.path.join(tmp, 'p%02d.jpg' % i)
        plaque(p, pl)
        # Une seule image en entrée, surtout pas -loop : zoompan sort d images PAR image reçue.
        # Avec -loop 1 -t 2.7 il en recevait 81 et en sortait 81x81, si bien que la première photo
        # occupait toute la vidéo et que les sept autres ne passaient jamais. Vu le 06/11/2026.
        entrees += ['-i', pl]
        img = int(par_photo * 30)
        # Un mouvement par photo, alterné : on zoome, puis on dézoome. Deux photos qui bougent
        # pareil de suite donnent une impression de diaporama de vacances.
        if i % 2 == 0:
            z = "min(1.001+%.5f*on,1.075)" % (0.074 / max(1, img))
        else:
            z = "max(1.075-%.5f*on,1.001)" % (0.074 / max(1, img))
        filtres.append(
            "[%d:v]scale=%d:%d:flags=lanczos,"
            "zoompan=z='%s':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=%d:s=%dx%d:fps=30,"
            "setsar=1,eq=contrast=1.03:saturation=1.06,unsharp=5:5:0.4:5:5:0[s%d]"
            % (i, 1200 * SUR_ECHANTILLON, 2133 * SUR_ECHANTILLON, z, img, W, H, i))
    filtres.append(''.join('[s%d]' % i for i in range(n)) + 'concat=n=%d:v=1:a=0[base]' % n)

    calques = []
    fa = os.path.join(tmp, 'accroche.png')
    tr.accroche(texte_accroche, fa)
    d_acc = tr.duree_accroche(texte_accroche)
    calques.append((fa, 0.0, d_acc, False))

    # Une ligne par photo, à partir de la deuxième : la première photo porte déjà l'accroche.
    for i, ligne in enumerate(lignes[:max(0, n - 1)]):
        if not ligne:
            continue
        d0 = (i + 1) * par_photo + 0.15
        d1 = min((i + 2) * par_photo - 0.15, total - 2.75)
        if d1 - d0 < 0.6:
            continue
        fm = os.path.join(tmp, 'mot%d.png' % i)
        tr.mot_plan(ligne, fm)
        calques.append((fm, d0, d1, True))

    fc = os.path.join(tmp, 'appel.png')
    tr.appel(mot, fc, prive)
    calques.append((fc, total - 2.7, total + 1, True))

    courant = 'base'
    for j, (png, d0, d1, fondu) in enumerate(calques, start=n):
        entrees += ['-loop', '1', '-t', '%.3f' % (total + 1), '-i', png]
        prep = '[%d:v]format=rgba' % j
        if fondu:
            prep += ',fade=t=in:st=%.3f:d=0.15:alpha=1' % d0
        filtres.append(prep + '[c%d]' % j)
        filtres.append("[%s][c%d]overlay=0:0:enable='between(t,%.3f,%.3f)':eof_action=pass[o%d]"
                       % (courant, j, d0, d1, j))
        courant = 'o%d' % j
    filtres.append('[%s]format=yuv420p[v]' % courant)
    entrees += ['-f', 'lavfi', '-t', '%.3f' % total, '-i',
                'anullsrc=channel_layout=stereo:sample_rate=48000']
    audio = n + len(calques)

    # Mêmes réglages d'encodage que les Trial Reels : CRF 19, jamais plus haut. Voir le commentaire
    # dans outils/trial-reels/fabriquer.py, mesures du 06/11/2026 à l'appui.
    subprocess.run(['ffmpeg', '-v', 'error', '-y'] + entrees + [
        '-filter_complex', ';'.join(filtres), '-map', '[v]', '-map', '%d:a' % audio,
        '-t', '%.3f' % total, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '19',
        '-profile:v', 'high', '-level', '4.2', '-maxrate', '9M', '-bufsize', '18M', '-g', '60',
        '-r', '30', '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', sortie], check=True)

    # Marqueur : ce video.mp4 n'est pas un rush, c'est un Reel fini, textes incrustes compris.
    # Sans lui, le Monteur le prendrait pour une source et recouperait dedans en rajoutant
    # SES propres incrustations par-dessus les miennes. Deux accroches et deux pastilles
    # jaunes sur la meme image : ce serait illisible et ca partirait tout seul.
    marque = os.path.join(os.path.dirname(sortie), 'diaporama.json')
    with io.open(marque, 'w', encoding='utf-8') as f:
        json.dump({'fabrique_le': __import__('datetime').date.today().isoformat(),
                   'outil': 'outils/biens/diaporama.py',
                   'photos': n, 'duree': round(total, 2), 'mot': mot,
                   'pourquoi': "Reel deja monte a partir des photos de l'annonce, textes incrustes. "
                               "Ne pas le remonter : publie-le tel quel."},
                  f, ensure_ascii=False, indent=2)

    couv = os.path.splitext(sortie)[0] + '-cover.jpg'
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', '0.5', '-i', sortie,
                    '-frames:v', '1', '-q:v', '2', couv], check=True)
    return total, n, couv


def main():
    a = argparse.ArgumentParser(description=__doc__,
                                formatter_class=argparse.RawDescriptionHelpFormatter)
    a.add_argument('ref')
    a.add_argument('--mot', required=True, help="Mot-clé de fin. Il DOIT avoir son automatisation "
                                                "ManyChat, sinon le commentaire ne déclenche rien.")
    a.add_argument('--accroche', required=True, help="Deux lignes séparées par |")
    a.add_argument('--lignes', nargs='*', default=[], help="Une ligne courte par photo, à partir de la 2e")
    a.add_argument('--sortie')
    a.add_argument('--prive', action='store_true')
    a.add_argument('--par-photo', type=float, dest='par_photo', help="Secondes par photo ; sinon calcule pour tenir au moins %d s" % DUREE_MINI)
    o = a.parse_args()
    sortie = o.sortie or os.path.join(RACINE, 'assets', 'biens', o.ref, 'video.mp4')
    os.makedirs(os.path.dirname(sortie), exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        total, n, couv = monter(o.ref, o.mot, o.accroche, o.lignes, sortie, tmp, o.prive, o.par_photo)
    print('%s : %d photos, %.1f s, %.1f Mo' % (sortie, n, total, os.path.getsize(sortie) / 1048576))
    print('couverture : %s' % couv)


if __name__ == '__main__':
    main()

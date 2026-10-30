#!/usr/bin/env python3
"""Planche de contrôle des Trial Reels d'un jour : pour chaque version, l'image à 0,4 s (accroche),
au milieu (mot à l'écran) et 1 s avant la fin (appel à commenter), en petit, sur une seule image.

Usage : python3 outils/trial-reels/controle.py trial/<jour> <sortie.jpg>
"""
import json
import os
import subprocess
import sys
import tempfile

from PIL import Image, ImageDraw

dossier, sortie = sys.argv[1], sys.argv[2]
man = json.load(open(os.path.join(dossier, 'manifest.json')))
L = 150
lignes = []
with tempfile.TemporaryDirectory() as tmp:
    for v in man['versions']:
        f = os.path.join(dossier, v['fichier'])
        images = []
        for i, t in enumerate((0.4, v['duree'] / 2, v['duree'] - 1.0)):
            o = os.path.join(tmp, f"{v['fichier']}-{i}.jpg")
            subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', f'{t:.2f}', '-i', f, '-frames:v', '1',
                            '-vf', f'scale={L}:-1', o], check=True)
            images.append(Image.open(o).copy())
        lignes.append((v['fichier'], images))
h = lignes[0][1][0].height
par_ligne = 5  # versions par rangée
rangs = (len(lignes) + par_ligne - 1) // par_ligne
planche = Image.new('RGB', (par_ligne * (3 * L + 16), rangs * (h + 22)), 'white')
d = ImageDraw.Draw(planche)
for k, (nom, images) in enumerate(lignes):
    x0, y0 = (k % par_ligne) * (3 * L + 16), (k // par_ligne) * (h + 22)
    d.text((x0 + 2, y0 + 2), nom, fill='black')
    for i, im in enumerate(images):
        planche.paste(im, (x0 + i * L, y0 + 18))
planche.save(sortie, quality=82)
print(sortie)

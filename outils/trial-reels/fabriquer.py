#!/usr/bin/env python3
"""Trial Reels : monte plusieurs versions d'une vidéo de bien (accroche, plans, mots, appel à commenter).

Usage : python3 outils/trial-reels/fabriquer.py outils/trial-reels/plans/<jour>.json
Sortie : trial/<jour>/<fichier>.mp4 (1080x1920, H.264 CRF 19 preset medium, AAC muet) + trial/<jour>/manifest.json
Le fichier source : si assets/biens/<ref>/video-hd.mp4 existe, c'est LUI qui est monté, pas video.mp4.
video.mp4 est la version allégée du site, bridée à 720 px de large : elle n'a jamais dû servir de master Instagram.
Le manifest donne pour chaque version l'adresse publique, la légende et l'heure de publication prévue :
c'est lui que l'agent qui programme dans Metricool (type TRIAL_REEL) lit.

Plan JSON :
{
  "jour": "2026-10-28",
  "biens": [
    {"ref": "483", "src": "assets/biens/483/video.mp4", "mot": "LOFT", "nom": "loft",
     "versions": [
       {"id": "v1", "accroche": "…", "legende": "…", "publier": "2026-10-27T23:10",
        "plans": [[debut, fin, vitesse, "mot affiché ou null"], …]}
     ]}
  ]
}
Le dernier plan porte l'appel à commenter : il doit durer au moins 2,6 s une fois accéléré.
« appel » (facultatif, par bien) : "prive" → la fin dit « Écris-moi MOT en privé » au lieu de « Commente MOT ».
ManyChat ne transmet pas le texte d'un commentaire : seul un mot-clé qui a son automatisation (« commentaires_manychat »
de videos-biens.json) peut être demandé en commentaire ; pour tout autre mot, l'appel se fait en message privé.
"""
import json
import io
import os
import subprocess
import sys
import tempfile

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ICI = os.path.dirname(os.path.abspath(__file__))
RACINE = os.path.abspath(os.path.join(ICI, '..', '..'))
W, H = 1080, 1920
POLICE_FORTE = os.path.join(ICI, 'InterDisplay-ExtraBold.otf')
POLICE = os.path.join(ICI, 'Inter-Bold.otf')
JAUNE = (255, 212, 59, 255)
NOIR = (14, 14, 14, 255)
BLANC = (255, 255, 255, 255)
SITE = 'https://shawez-immo.com'


def police(chemin, taille):
    return ImageFont.truetype(chemin, taille)


def couper(texte, f, largeur):
    """Coupe le texte en lignes qui tiennent dans la largeur, le plus équilibrées possible (pas de mot seul en bas)."""
    # La ponctuation haute française reste collée au mot d'avant (jamais « : » ou « ? » en début de ligne)
    for p in (' :', ' ?', ' !', ' ;', ' …'):
        texte = texte.replace(p, ' ' + p[1:])
    mots = [m for m in texte.split(' ') if m]
    lignes, cour = [], []
    for mot in mots:
        if not cour or f.getlength(' '.join(cour + [mot])) <= largeur:
            cour.append(mot)
        else:
            lignes.append(cour)
            cour = [mot]
    if cour:
        lignes.append(cour)
    # Pas de dernière ligne trop courte : on descend des mots de la ligne d'avant tant que ça tient
    while len(lignes) >= 2:
        av, der = lignes[-2], lignes[-1]
        lav, lder = f.getlength(' '.join(av)), f.getlength(' '.join(der))
        if len(av) < 2 or (len(der) >= 2 and lder >= 0.55 * lav):
            break
        essai = [av[-1]] + der
        if f.getlength(' '.join(essai)) > largeur or f.getlength(' '.join(essai)) > lav:
            break
        lignes[-2], lignes[-1] = av[:-1], essai
    return [' '.join(l) for l in lignes]


def ombre(img, rayon=14, opacite=90, dy=8):
    """Ombre douce sous les éléments opaques du calque."""
    a = img.split()[3].point(lambda v: opacite if v > 0 else 0)
    o = Image.new('RGBA', img.size, (0, 0, 0, 0))
    o.putalpha(a)
    o = o.filter(ImageFilter.GaussianBlur(rayon))
    fond = Image.new('RGBA', img.size, (0, 0, 0, 0))
    fond.alpha_composite(o, (0, dy))
    fond.alpha_composite(img)
    return fond


def accroche(texte, sortie):
    """Accroche du début : lignes en blanc sur fond noir doux, style natif Instagram, tiers haut de l'écran."""
    taille = 76
    while True:
        f = police(POLICE_FORTE, taille)
        if '|' in texte:  # coupures choisies à la main
            lignes = [l.strip() for l in texte.split('|')]
            for ponct in (' :', ' ?', ' !', ' ;'):
                lignes = [l.replace(ponct, '\u00a0' + ponct[1:]) for l in lignes]
        else:
            lignes = couper(texte, f, 860)
        if max(f.getlength(l) for l in lignes) <= 880 or taille <= 56:
            break
        taille -= 4
    calque = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(calque)
    pas = int(taille * 1.30)
    y = 300
    for l in lignes:
        lg = f.getlength(l)
        x0 = (W - lg) / 2 - 28
        d.rounded_rectangle([x0, y - 10, x0 + lg + 56, y + taille + 18], radius=22, fill=BLANC)
        d.text(((W - lg) / 2, y - taille * 0.06), l, font=f, fill=NOIR)
        y += pas
    ombre(calque).save(sortie)


def mot_plan(texte, sortie):
    """Petit mot pendant un plan : blanc contour noir, bas-milieu (au-dessus de la légende Instagram)."""
    f = police(POLICE_FORTE, 62)
    lignes = couper(texte, f, 900)
    calque = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(calque)
    y = 1190 - (len(lignes) - 1) * 40
    for l in lignes:
        lg = f.getlength(l)
        d.text(((W - lg) / 2, y), l, font=f, fill=BLANC, stroke_width=7, stroke_fill=(0, 0, 0, 255))
        y += 80
    ombre(calque, rayon=10, opacite=70, dy=4).save(sortie)


def appel(mot, sortie, prive=False):
    """Fin : « Commente MOT » (ou « Écris-moi MOT » en privé) avec le mot sur pastille jaune, sur un panneau sombre au centre."""
    f1 = police(POLICE_FORTE, 70)
    fm = police(POLICE_FORTE, 76)
    f2 = police(POLICE, 46)
    calque = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(calque)
    t1 = 'Écris-moi' if prive else 'Commente'
    ligne2 = 'en privé, je t’envoie la visite' if prive else 'et je t’envoie la visite complète'
    l1, lm = f1.getlength(t1), fm.getlength(mot)
    total = l1 + 26 + lm + 52
    larg = max(total, f2.getlength(ligne2)) + 110
    x0, y0 = (W - larg) / 2, 860
    d.rounded_rectangle([x0, y0, x0 + larg, y0 + 290], radius=40, fill=(10, 10, 10, 200))
    xa = (W - total) / 2
    ya = y0 + 58
    d.text((xa, ya), t1, font=f1, fill=BLANC)
    xp = xa + l1 + 26
    d.rounded_rectangle([xp, ya - 14, xp + lm + 52, ya + 92], radius=20, fill=JAUNE)
    d.text((xp + 26, ya - 4), mot, font=fm, fill=NOIR)
    l2 = f2.getlength(ligne2)
    d.text(((W - l2) / 2, y0 + 185), ligne2, font=f2, fill=(255, 255, 255, 235))
    ombre(calque, rayon=18, opacite=110, dy=10).save(sortie)


def duree_accroche(texte):
    return max(2.4, min(3.4, 1.5 + 0.13 * len(texte.replace('|', ' ').split())))


def monter(src, version, mot, sortie, tmp, prive=False):
    plans = version['plans']
    entrees = ['-i', src]
    filtres = []
    t = 0.0
    reperes = []  # (debut, fin) de chaque plan dans la vidéo finale
    for i, p in enumerate(plans):
        deb, fin, vit = p[0], p[1], p[2]
        dur = (fin - deb) / vit
        filtres.append(
            f'[0:v]trim=start={deb}:end={fin},setpts=(PTS-STARTPTS)/{vit},fps=30,'
            f'scale={W}:{H}:force_original_aspect_ratio=increase:flags=lanczos,crop={W}:{H},setsar=1,eq=contrast=1.03:saturation=1.07,'
            f'unsharp=5:5:0.5:5:5:0[s{i}]')
        reperes.append((t, t + dur))
        t += dur
    total = t
    filtres.append(''.join(f'[s{i}]' for i in range(len(plans))) + f'concat=n={len(plans)}:v=1:a=0[base]')

    calques = []  # (fichier png, debut, fin, fondu)
    fa = os.path.join(tmp, 'accroche.png')
    accroche(version['accroche'], fa)
    calques.append((fa, 0.0, duree_accroche(version['accroche']), False))
    fin_accroche = calques[0][2]
    for i, p in enumerate(plans):
        if len(p) > 3 and p[3]:
            d0, d1 = reperes[i]
            d0 = max(d0 + 0.08, fin_accroche + 0.05)  # jamais par-dessus l'accroche
            d1 = min(d1 - 0.04, total - 2.65)          # jamais par-dessus l'appel final
            if d1 - d0 < 0.6:
                continue
            fm = os.path.join(tmp, f'mot{i}.png')
            mot_plan(p[3], fm)
            calques.append((fm, d0, d1, True))
    fc = os.path.join(tmp, 'appel.png')
    appel(mot, fc, prive)
    calques.append((fc, total - 2.6, total + 1, True))

    courant = 'base'
    for j, (png, d0, d1, fondu) in enumerate(calques, start=1):
        entrees += ['-loop', '1', '-t', f'{total + 1:.3f}', '-i', png]
        prep = f'[{j}:v]format=rgba'
        if fondu:
            prep += f',fade=t=in:st={d0:.3f}:d=0.15:alpha=1'
        filtres.append(prep + f'[c{j}]')
        filtres.append(f"[{courant}][c{j}]overlay=0:0:enable='between(t,{d0:.3f},{d1:.3f})':eof_action=pass[o{j}]")
        courant = f'o{j}'
    filtres.append(f'[{courant}]format=yuv420p[v]')
    entrees += ['-f', 'lavfi', '-t', f'{total:.3f}', '-i', 'anullsrc=channel_layout=stereo:sample_rate=48000']
    audio = len(calques) + 1
    cmd = ['ffmpeg', '-v', 'error', '-y'] + entrees + [
        '-filter_complex', ';'.join(filtres), '-map', '[v]', '-map', f'{audio}:a',
        # Réglages du 06/11/2026. Avant : CRF 24, soit 2,5 Mbps. Shawez : « la qualité est complètement
        # éclatée ». Instagram recompresse TOUT ce qu'on lui envoie : lui donner un fichier déjà écrasé,
        # c'est deux compressions l'une sur l'autre, et ça se voit sur les visages et les cheveux.
        # Mesuré sur le bien 438, 10 s montées en 1080x1920, sur la machine des agents :
        #   veryfast CRF 24 = 2,5 Mbps en 6,9 s      (l'ancien réglage)
        #   veryfast CRF 19 = 6,6 Mbps en 8,2 s      (celui-ci)
        #   medium   CRF 20 = 6,5 Mbps en 17,9 s
        #   slow     CRF 18 = 4,5 Mbps en 20,3 s sur une vraie source 1080p
        # On garde veryfast exprès : le Monteur fabrique seize versions par passage et a un temps limité.
        # Tout le gain vient du CRF, pas du preset — même débit que medium, pour le tiers du temps.
        # Ne remonte pas le CRF pour alléger les fichiers : c'est exactement l'erreur d'avant.
        '-t', f'{total:.3f}', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '19',
        '-profile:v', 'high', '-level', '4.2', '-maxrate', '9M', '-bufsize', '18M', '-g', '60',
        '-r', '30', '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', sortie]
    subprocess.run(cmd, check=True)
    return total


def une_version(args):
    src, v, mot, sortie, prive = args
    with tempfile.TemporaryDirectory() as tmp:
        return monter(src, v, mot, sortie, tmp, prive)


def master(src):
    """Le fichier à monter : video-hd.mp4 s'il existe, sinon video.mp4, et on dit ce qu'on a sous la main.

    Pourquoi (06/11/2026) : assets/biens/<ref>/video.mp4 est fabriqué par outils/biens/video.py POUR LE SITE,
    bridé à 720 px de large et jusqu'à CRF 33 pour que les pages chargent vite. C'est le bon fichier pour une
    fiche, c'est le pire possible comme master Instagram : on l'agrandissait en 1080x1920 et Instagram
    recompressait par-dessus. Mesuré ce jour-là : 14 des 18 biens étaient sous 1080 de large, et le duplex 415
    était en 360x640, soit neuf fois moins de pixels que ce qu'Instagram attend.
    video-hd.mp4 est le master social, écrit par video.py en même temps que la version du site.
    """
    dossier = os.path.dirname(src)
    # master.txt : un chemin vers le vrai master, hors du dépôt.
    # Pourquoi (06/11/2026) : Cloudflare Pages refuse tout fichier au-delà de 25 Mio, donc un master de
    # 85 s en 1080 ne peut pas vivre dans le site. Celui de l'hôtel particulier de Beaune (527) pèse 52 Mo.
    # Plutôt que de le dégrader à 2,4 Mbit/s pour qu'il rentre, on laisse le fichier d'origine dans
    # TrialReels-Studio et on écrit ici où le trouver. Une ligne, un chemin, ~ accepté.
    pointeur = os.path.join(dossier, 'master.txt')
    if os.path.exists(pointeur):
        for ligne in io.open(pointeur, encoding='utf-8').read().splitlines():
            ligne = ligne.strip()
            if not ligne or ligne.startswith('#'):
                continue
            cible = os.path.expanduser(ligne)
            if os.path.exists(cible):
                return cible
            print("ATTENTION %s : master.txt renvoie vers %s, introuvable. On retombe sur le dépôt."
                  % (os.path.basename(dossier), ligne), file=sys.stderr)
            break
    # Un Reel deja monte a partir des photos de l'annonce n'est pas une source. Il porte deja
    # son accroche, ses lignes et sa pastille « Commente MOT ». Le recouper reviendrait a
    # empiler deux accroches et deux pastilles sur la meme image, et ca partirait tel quel.
    # Vu le 06/11/2026, quand six biens jamais filmes ont recu leur Reel photo.
    if os.path.exists(os.path.join(dossier, 'diaporama.json')):
        raise SystemExit(
            "%s : video.mp4 est un Reel fini fabrique par outils/biens/diaporama.py, pas un rush. "
            "On ne le remonte pas, on le publie tel quel. Pour d'autres versions, relance "
            "diaporama.py avec une autre accroche et un autre ordre de photos."
            % os.path.basename(dossier))

    hd = os.path.join(dossier, 'video-hd.mp4')
    choisi = hd if os.path.exists(hd) else src
    try:
        out = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0',
                              '-show_entries', 'stream=width,height', '-of', 'csv=p=0', choisi],
                             capture_output=True, text=True, check=True).stdout.strip()
        larg, haut = (int(x) for x in out.split(',')[:2])
    except Exception:
        return choisi
    if larg < W or haut < H:
        print("ATTENTION %s : source en %dx%d, on monte en %dx%d. Les pixels manquants ne s'inventent pas, "
              "la vidéo sera molle. Refais le master avec outils/biens/video.py --hd depuis le fichier d'origine."
              % (os.path.basename(os.path.dirname(choisi)), larg, haut, W, H), file=sys.stderr)
    return choisi


def main():
    from concurrent.futures import ProcessPoolExecutor
    plan = json.load(open(sys.argv[1]))
    jour = plan['jour']
    dossier = os.path.join(RACINE, 'trial', jour)
    os.makedirs(dossier, exist_ok=True)
    taches, infos = [], []
    for bien in plan['biens']:
        src = master(os.path.join(RACINE, bien['src']))
        for v in bien['versions']:
            nom = f"{bien['nom']}-{bien['ref']}-{v['id']}.mp4"
            taches.append((src, v, bien['mot'], os.path.join(dossier, nom), bien.get('appel') == 'prive'))
            infos.append((bien, v, nom))
    with ProcessPoolExecutor(max_workers=max(1, (os.cpu_count() or 2))) as ex:
        durees = list(ex.map(une_version, taches))
    manifeste = {'jour': jour, 'versions': []}
    for (bien, v, nom), duree in zip(infos, durees):
        sortie = os.path.join(dossier, nom)
        manifeste['versions'].append({
            'fichier': nom, 'url': f'{SITE}/trial/{jour}/{nom}', 'ref': bien['ref'],
            'mot': bien['mot'], 'accroche': ' '.join(v['accroche'].replace('|', ' ').split()),
            'legende': v['legende'], 'publier': v.get('publier', ''), 'duree': round(duree, 2),
            'octets': os.path.getsize(sortie)})
        print(f'{nom} {duree:.1f}s {os.path.getsize(sortie) // 1024} Ko')
    manifeste['versions'].sort(key=lambda x: x['publier'])
    json.dump(manifeste, open(os.path.join(dossier, 'manifest.json'), 'w'), ensure_ascii=False, indent=1)


if __name__ == '__main__':
    main()

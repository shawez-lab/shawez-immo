"""Vidéo d'un bien → DEUX fichiers, parce qu'un site et Instagram ne veulent pas la même chose.

  assets/biens/<ref>/video.mp4     la version du SITE : 720 px de large, moins de 20 Mo, pour que la fiche charge vite.
  assets/biens/<ref>/video-hd.mp4  le MASTER SOCIAL : jusqu'à 1080 px de large, CRF 20, c'est lui que monte
                                   outils/trial-reels/fabriquer.py pour les Trial Reels.
  + video.webm (VP9) + affiche (poster).

Pourquoi deux fichiers (06/11/2026). Shawez : « la qualité des vidéos publiées sur un Reel d'essai est
complètement éclatée ». Le montage Instagram allait chercher video.mp4, c'est-à-dire la version allégée du
site, bridée à 720 px, et l'agrandissait en 1080x1920 ; Instagram recompressait encore derrière. Mesuré ce
jour-là : 14 des 18 biens étaient sous 1080 de large et le duplex 415 était en 360x640. Le fichier du site
n'a jamais dû servir de master. Un master ne se fabrique QUE depuis la vidéo d'origine : repartir du fichier
de 720 px ne rend aucun pixel, ça ne fait qu'un gros fichier aussi mou que le petit.

    python3 outils/biens/video.py <ref> SOURCE.mp4 [--debut 8] [--duree 30] [--recadrer-haut 0.22] [--source "texte"]

- SOURCE : la vidéo du bien (dossier Drive du bien, ou « GRAVELIN IMMO - SÉLECTION PREMIUM » / « Médias site »).
- --debut / --duree : extrait à garder, en secondes. Couper tout passage qui montre une adresse, un ancien prix,
  un chiffre qui ne correspond plus à l'annonce, ou une image fabriquée.
- --recadrer-haut : part de la hauteur à retirer en haut (bandeau de texte incrusté).
- Le son est gardé (la fiche démarre la vidéo sans le son ; le visiteur peut l'activer).
Le résultat est noté dans outils/biens/medias.json ; relancer ensuite python3 outils/biens/build_biens.py.
"""
import argparse, json, os, subprocess, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from commun import P, charge_medias, ecrit_medias

LIMITE = 19 * 1024 * 1024        # version du site : une fiche doit rester légère
LIMITE_HD = 30 * 1024 * 1024     # master social : on accepte lourd, il n'est jamais servi à un visiteur


def sonde(f):
    out = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'stream=codec_type,width,height', '-show_entries', 'format=duration',
                          '-of', 'json', f], capture_output=True, text=True, check=True).stdout
    return json.loads(out)


def encode(src, dst, debut, duree, haut, crf):
    vf = []
    if haut:
        vf.append('crop=iw:ih*(1-%.3f):0:ih*%.3f' % (haut, haut))
    vf.append("scale='min(720,iw)':-2:flags=lanczos")
    vf.append('fps=30')
    cmd = ['ffmpeg', '-v', 'error', '-y']
    if debut:
        cmd += ['-ss', str(debut)]
    cmd += ['-i', src]
    if duree:
        cmd += ['-t', str(duree)]
    cmd += ['-vf', ','.join(vf), '-c:v', 'libx264', '-profile:v', 'high', '-level', '4.0', '-pix_fmt', 'yuv420p',
            '-preset', 'slow', '-crf', str(crf), '-maxrate', '2500k', '-bufsize', '5000k',
            '-c:a', 'aac', '-b:a', '96k', '-ac', '2', '-movflags', '+faststart', dst]
    subprocess.run(cmd, check=True)


def encode_hd(src, dst, debut, duree, haut, crf):
    """Le master social : même extrait, mais la meilleure image possible, jusqu'à 1080x1920.

    On n'agrandit jamais au-delà de la source (« min(1080,iw) ») : fabriquer un 1080 à partir d'un 720 ne crée
    aucun détail, ça ne fait que gonfler le fichier. Si la source est petite, le master est petit lui aussi et
    fabriquer.py le dira au montage.
    """
    vf = []
    if haut:
        vf.append('crop=iw:ih*(1-%.3f):0:ih*%.3f' % (haut, haut))
    vf.append("scale='min(1080,iw)':-2:flags=lanczos")
    vf.append('fps=30')
    cmd = ['ffmpeg', '-v', 'error', '-y']
    if debut:
        cmd += ['-ss', str(debut)]
    cmd += ['-i', src]
    if duree:
        cmd += ['-t', str(duree)]
    cmd += ['-vf', ','.join(vf), '-c:v', 'libx264', '-profile:v', 'high', '-level', '4.2', '-pix_fmt', 'yuv420p',
            '-preset', 'slow', '-crf', str(crf), '-maxrate', '16M', '-bufsize', '32M', '-g', '60',
            '-c:a', 'aac', '-b:a', '192k', '-ac', '2', '-movflags', '+faststart', dst]
    subprocess.run(cmd, check=True)


def master_hd(ref, source, debut=0, duree=0, haut=0):
    """Écrit assets/biens/<ref>/video-hd.mp4 depuis la vidéo d'origine. Renvoie (largeur, hauteur, octets)."""
    dossier = P('assets', 'biens', ref)
    os.makedirs(dossier, exist_ok=True)
    dst = os.path.join(dossier, 'video-hd.mp4')
    for crf in (20, 22, 24):
        encode_hd(source, dst, debut, duree, haut, crf)
        if os.path.getsize(dst) <= LIMITE_HD:
            break
    info = sonde(dst)
    v = [s for s in info['streams'] if s['codec_type'] == 'video'][0]
    octets = os.path.getsize(dst)
    print('%s : video-hd.mp4 %dx%d, %.1f Mo%s' % (ref, v['width'], v['height'], octets / 1e6,
          '' if v['width'] >= 1080 else '  ATTENTION : la source fait moins de 1080 px de large, '
          'le Reel sera mou. Retrouve le fichier d\'origine du vidéaste.'))
    return v['width'], v['height'], octets


def webm(mp4, dst):
    """Copie WebM (VP9 + Opus) de la vidéo déjà découpée : lue par les navigateurs qui n'ont pas le H.264."""
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', mp4, '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '36', '-deadline', 'good',
                    '-cpu-used', '4', '-row-mt', '1', '-pix_fmt', 'yuv420p', '-c:a', 'libopus', '-b:a', '64k', dst], check=True)


def encoder_bien(ref, source, debut=0, duree=0, haut=0, texte='', extra=None):
    """Encode la vidéo du bien (MP4 + WebM + affiche) dans assets/biens/<ref>/ et la note dans medias.json."""
    dossier = P('assets', 'biens', ref)
    os.makedirs(dossier, exist_ok=True)
    dst = os.path.join(dossier, 'video.mp4')
    for crf in (24, 27, 30, 33):
        encode(source, dst, debut, duree, haut, crf)
        if os.path.getsize(dst) <= LIMITE:
            break
    master_hd(ref, source, debut, duree, haut)
    webm(dst, os.path.join(dossier, 'video.webm'))
    info = sonde(dst)
    v = [s for s in info['streams'] if s['codec_type'] == 'video'][0]
    # affiche : une image nette au début de l'extrait
    from PIL import Image
    tmp = os.path.join(dossier, '_poster.png')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', '0.8', '-i', dst, '-frames:v', '1', tmp], check=True)
    im = Image.open(tmp).convert('RGB')
    im.save(os.path.join(dossier, 'video-poster.webp'), 'WEBP', quality=78, method=6)
    im.save(os.path.join(dossier, 'video-poster.jpg'), 'JPEG', quality=82, optimize=True, progressive=True)
    os.remove(tmp)
    m = charge_medias()
    fiche = {
        'fichier': 'video.mp4', 'webm': 'video.webm', 'poster': 'video-poster.webp', 'poster_jpg': 'video-poster.jpg',
        'largeur': v['width'], 'hauteur': v['height'], 'duree': round(float(info['format']['duration']), 1),
        'octets': os.path.getsize(dst), 'source': texte or os.path.basename(source),
        'extrait': {'debut': debut, 'duree': duree, 'recadrer_haut': haut}}
    hd = os.path.join(dossier, 'video-hd.mp4')
    if os.path.exists(hd):
        vhd = [x for x in sonde(hd)['streams'] if x['codec_type'] == 'video'][0]
        fiche['master'] = {'fichier': 'video-hd.mp4', 'largeur': vhd['width'], 'hauteur': vhd['height'],
                           'octets': os.path.getsize(hd)}
    fiche.update(extra or {})
    m['biens'].setdefault(ref, {})['video'] = fiche
    ecrit_medias(m)
    print('%s : video.mp4 %dx%d, %.1f s, %.1f Mo' % (ref, v['width'], v['height'], float(info['format']['duration']), os.path.getsize(dst) / 1e6))
    return fiche


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('ref')
    ap.add_argument('source')
    ap.add_argument('--debut', type=float, default=0)
    ap.add_argument('--duree', type=float, default=0)
    ap.add_argument('--recadrer-haut', type=float, default=0)
    ap.add_argument('--source-texte', default='')
    ap.add_argument('--webm-seulement', action='store_true', help='ajoute seulement la copie WebM à une vidéo déjà encodée')
    ap.add_argument('--hd', action='store_true', help="refait SEULEMENT video-hd.mp4, le master social, depuis la vidéo d'origine")
    a = ap.parse_args()
    if a.webm_seulement:
        d = P('assets', 'biens', a.ref)
        webm(os.path.join(d, 'video.mp4'), os.path.join(d, 'video.webm'))
        m = charge_medias()
        m['biens'][a.ref]['video']['webm'] = 'video.webm'
        ecrit_medias(m)
        print('%s : video.webm %.1f Mo' % (a.ref, os.path.getsize(os.path.join(d, 'video.webm')) / 1e6))
        return

    if a.hd:
        master_hd(a.ref, a.source, a.debut, a.duree, a.recadrer_haut)
        return
    encoder_bien(a.ref, a.source, a.debut, a.duree, a.recadrer_haut, a.source_texte or os.path.basename(a.source))


if __name__ == '__main__':
    main()

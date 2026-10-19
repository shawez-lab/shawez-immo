"""Vidéo d'un bien → assets/biens/<ref>/video.mp4 (H.264, 720 px de large, < 20 Mo) + video.webm (VP9) + affiche (poster).

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

LIMITE = 19 * 1024 * 1024


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


def webm(mp4, dst):
    """Copie WebM (VP9 + Opus) de la vidéo déjà découpée : lue par les navigateurs qui n'ont pas le H.264."""
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', mp4, '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '36', '-deadline', 'good',
                    '-cpu-used', '4', '-row-mt', '1', '-pix_fmt', 'yuv420p', '-c:a', 'libopus', '-b:a', '64k', dst], check=True)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('ref')
    ap.add_argument('source')
    ap.add_argument('--debut', type=float, default=0)
    ap.add_argument('--duree', type=float, default=0)
    ap.add_argument('--recadrer-haut', type=float, default=0)
    ap.add_argument('--source-texte', default='')
    ap.add_argument('--webm-seulement', action='store_true', help='ajoute seulement la copie WebM à une vidéo déjà encodée')
    a = ap.parse_args()
    if a.webm_seulement:
        d = P('assets', 'biens', a.ref)
        webm(os.path.join(d, 'video.mp4'), os.path.join(d, 'video.webm'))
        m = charge_medias()
        m['biens'][a.ref]['video']['webm'] = 'video.webm'
        ecrit_medias(m)
        print('%s : video.webm %.1f Mo' % (a.ref, os.path.getsize(os.path.join(d, 'video.webm')) / 1e6))
        return

    dossier = P('assets', 'biens', a.ref)
    os.makedirs(dossier, exist_ok=True)
    dst = os.path.join(dossier, 'video.mp4')
    for crf in (24, 27, 30, 33):
        encode(a.source, dst, a.debut, a.duree, a.recadrer_haut, crf)
        if os.path.getsize(dst) <= LIMITE:
            break
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
    m['biens'].setdefault(a.ref, {})['video'] = {
        'fichier': 'video.mp4', 'webm': 'video.webm', 'poster': 'video-poster.webp', 'poster_jpg': 'video-poster.jpg',
        'largeur': v['width'], 'hauteur': v['height'], 'duree': round(float(info['format']['duration']), 1),
        'octets': os.path.getsize(dst), 'source': a.source_texte or os.path.basename(a.source),
        'extrait': {'debut': a.debut, 'duree': a.duree, 'recadrer_haut': a.recadrer_haut}}
    ecrit_medias(m)
    print('%s : video.mp4 %dx%d, %.1f s, %.1f Mo' % (a.ref, v['width'], v['height'], float(info['format']['duration']), os.path.getsize(dst) / 1e6))


if __name__ == '__main__':
    main()

"""Lecture des seules valeurs réellement dessinées sur les diagnostics LBI.

Pas de calcul de classe à partir des seuils. Un format inconnu, un DPE vierge,
un OCR ambigu ou une panne laisse les champs vides et produit un diagnostic.
"""
import csv
import html
import io
import re
import subprocess
import urllib.parse


def images_diagnostic(s):
    """Uniquement les images publiques exactes intégrées à la fiche, sur le même hôte."""
    out = {}
    for tag in re.findall(r'<img\b[^>]*>', s, re.I):
        src = re.search(r'\bsrc=["\']([^"\']+)', tag, re.I)
        if not src:
            continue
        url = urllib.parse.urlsplit(html.unescape(src.group(1)))
        if url.scheme or url.netloc or url.path != '/admin/dpe.php':
            continue
        q = urllib.parse.parse_qs(url.query)
        if not re.fullmatch(r'\d+', q.get('idann', [''])[0]):
            continue
        cle = 'ges' if q.get('type') == ['GES'] else 'dpe' if 'type' not in q else None
        if cle:
            out[cle] = url.geturl()
    return out


def _ocr(im, alphabet):
    from PIL import ImageOps
    im = ImageOps.expand(im.convert('RGB').resize((im.width * 4, im.height * 4)), border=32, fill='white')
    buf = io.BytesIO(); im.save(buf, format='PNG')
    result = subprocess.run(['tesseract', 'stdin', 'stdout', '-l', 'eng', '--psm', '10',
                             '-c', 'tessedit_char_whitelist=' + alphabet, 'tsv'],
                            input=buf.getvalue(), capture_output=True, check=True, timeout=15)
    words = [r for r in csv.DictReader(io.StringIO(result.stdout.decode()), delimiter='\t')
             if r.get('text', '').strip()]
    if len(words) != 1 or float(words[0]['conf']) < 70:
        return None
    return words[0]['text'].strip()


def lire_image(data, cle):
    from PIL import Image
    im = Image.open(io.BytesIO(data)).convert('RGB')
    # Format nouveau DPE LBI constaté sur les fiches 454 et 512 le 18/11/2026.
    # Les anciennes images « vierge » / « non concerné » ont un autre format.
    if im.size != (600, 401):
        return {}
    x = 171 if cle == 'dpe' else 1
    # Seule la ligne sélectionnée possède un encadrement noir vertical continu.
    ranges = []; start = None
    for y in range(20, 380):
        dark = max(im.getpixel((x, y))) < 90
        if dark and start is None:
            start = y
        if not dark and start is not None:
            if y - start >= 55:
                ranges.append((start, y))
            start = None
    if len(ranges) != 1:
        return {}
    top, bottom = ranges[0]
    if not 65 <= bottom - top <= 85:
        return {}
    letter_box = (176, top + 6, 240, bottom - 7) if cle == 'dpe' else (5, top + 6, 75, bottom - 7)
    letter = _ocr(im.crop(letter_box), 'ABCDEFG')
    out = {cle: letter} if letter and re.fullmatch('[A-G]', letter) else {}
    box = (1, top + 7, 89, top + 55) if cle == 'dpe' else (200, top + 5, 400, top + 60)
    # GES : exclure le petit texte de l'unité à droite en isolant les grands glyphes.
    if cle == 'ges':
        # La valeur est à droite de la flèche ; les caractères numériques font > 30 px.
        # OCR TSV du crop puis filtrage des grands mots, sans lire le « 2 » de CO2.
        value = _ocr_grand_nombre(im.crop(box))
    else:
        value = _ocr(im.crop(box), '0123456789')
    if value is not None and re.fullmatch(r'\d{1,4}', value):
        out['dpe_kwh_m2_an' if cle == 'dpe' else 'ges_kg_co2_m2_an'] = int(value)
    return out


def _ocr_grand_nombre(im):
    # Composantes connexes des grands chiffres ; les unités ont une hauteur moindre.
    dark = {(x, y) for y in range(im.height) for x in range(im.width)
            if max(im.getpixel((x, y))) < 100}
    boxes = []
    while dark:
        todo = [dark.pop()]; pixels = []
        while todo:
            x, y = todo.pop(); pixels.append((x, y))
            for pt in ((x-1,y),(x+1,y),(x,y-1),(x,y+1)):
                if pt in dark:
                    dark.remove(pt); todo.append(pt)
        xs, ys = zip(*pixels)
        if max(ys)-min(ys) >= 25 and max(xs)-min(xs) >= 7:
            boxes.append((min(xs),min(ys),max(xs)+1,max(ys)+1))
    if not boxes:
        return None
    return _ocr(im.crop((min(b[0] for b in boxes),min(b[1] for b in boxes),
                         max(b[2] for b in boxes),max(b[3] for b in boxes))), '0123456789')


def extras_energie(s, charge_image=None):
    out = {}
    if charge_image is None:
        return out
    for cle, chemin in images_diagnostic(s).items():
        try:
            out.update(lire_image(charge_image(chemin), cle))
        except Exception as e:
            print('Diagnostic énergie indisponible', cle, type(e).__name__)
    return out

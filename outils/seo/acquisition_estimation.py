"""Entrées statiques vers la demande personnelle d'estimation.

``appliquer`` ne lit ni n'écrit de fichier. Les liens et l'encart sont présents dans
le HTML publié, même sans JavaScript. Les pages prix gardent leurs chiffres et
leurs réserves sur les modalités d'un éventuel déplacement.
"""
import html
import re
import unicodedata
from urllib.parse import urlencode, urlsplit

MARQUE = '<!-- acquisition-estimation -->'
FIN = '<!-- /acquisition-estimation -->'
STYLE_ID = 'acquisition-estimation-style'
STYLE = '''<style id="acquisition-estimation-style">
.acq-est{display:grid;gap:12px;margin:22px 0;padding:clamp(16px,2.3vw,26px);border:1px solid var(--line-strong,#d8d1c4);border-radius:var(--r-m,12px);background:var(--surface,#faf8f3);color:var(--ink,#29251e);text-align:left;max-width:760px;box-sizing:border-box}
.acq-est.acq-est-main{margin:24px auto;width:calc(100% - 2 * var(--gutter,24px))}
.acq-est .acq-est-title{font-family:inherit;font-size:clamp(1.1rem,1.6vw,1.35rem);line-height:1.3;font-weight:700;margin:0;color:inherit;letter-spacing:normal}
.acq-est .acq-est-copy{font-size:.96rem;line-height:1.5;margin:0;color:inherit;max-width:60ch}
.acq-est .acq-est-actions{display:flex;align-items:center;gap:12px 18px;flex-wrap:wrap;margin:0}
.acq-est .acq-est-actions .btn{white-space:normal;text-align:center;line-height:1.35;min-height:48px;font-size:.96rem;padding:12px 20px}
.acq-est .acq-est-call{color:inherit;font-size:.92rem;text-underline-offset:3px}
.acq-est a:focus-visible{outline:3px solid var(--accent,#b5891f);outline-offset:4px}
@media(max-width:480px){.acq-est .acq-est-actions{align-items:stretch;flex-direction:column}.acq-est .acq-est-call{text-align:center;padding:5px}}
</style>'''


def _texte(s):
    return re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]*>', '', s))).strip()


def _slug(s):
    s = unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode().lower()
    return re.sub(r'[^a-z0-9]+', '-', s).strip('-')


def _chemin(chemin):
    """Un chemin de page interne, sans requête, fragment ni origine externe."""
    if not isinstance(chemin, str) or not chemin.startswith('/') or chemin.startswith('//'):
        return None
    p = urlsplit(chemin)
    if p.scheme or p.netloc or p.query or p.fragment or '\\' in p.path:
        return None
    if any(part in ('.', '..') for part in p.path.split('/')):
        return None
    path = p.path
    if path.endswith('/index.html'):
        path = path[:-10]
    if path == '/index.html':
        path = '/'
    return path


def _eligible(s, chemin):
    if not re.search(r'<html\b[^>]*\blang\s*=\s*[\"\']fr(?:-FR)?[\"\']', s, re.I):
        return False
    for tag in re.findall(r'<meta\b[^>]*>', s, re.I):
        if re.search(r'\bname\s*=\s*[\"\'](?:robots|googlebot)[\"\']', tag, re.I) and re.search(r'\bnoindex\b', tag, re.I):
            return False
    if re.search(r'<meta\b[^>]*http-equiv\s*=\s*[\"\']refresh[\"\']', s, re.I):
        return False
    if chemin in ('/conseils-vendeurs/', '/secteurs-dijon-nuits-saint-georges-beaune/',
                  '/agent-immobilier-dijon/', '/agent-immobilier-beaune/',
                  '/immobilier-nuits-saint-georges/', '/immobilier-fontaine-les-dijon/'):
        return True
    return bool(re.fullmatch(r'/(?:prix-immobilier-[a-z0-9-]+|vendre-[a-z0-9-]+)/', chemin)
                or re.fullmatch(r'/conseils-vendeurs/[a-z0-9-]+/', chemin)
                or re.fullmatch(r'/estimation-immobiliere-dijon/[a-z0-9-]+/', chemin))


def commune(s, chemin):
    """Nom écrit dans le titre local, seulement s'il concorde avec la route.

    On ne transforme jamais un slug en nom de commune : les accents et
    apostrophes proviennent du contenu éditorial existant.
    """
    if chemin.startswith('/conseils-vendeurs/') or chemin in ('/', '/secteurs-dijon-nuits-saint-georges-beaune/'):
        return ''
    titre = re.search(r'<title\b[^>]*>(.*?)</title>', s, re.I | re.S)
    h1 = re.search(r'<h1\b[^>]*>(.*?)</h1>', s, re.I | re.S)
    textes = [_texte(m[1]) for m in (titre, h1) if m]
    if chemin.startswith('/estimation-immobiliere-dijon/'):
        return 'Dijon' if any(re.search(r'\bDijon\b', t) for t in textes) else ''
    for texte in textes:
        if chemin.startswith('/prix-immobilier-'):
            m = re.search(r'^Prix immobilier à (.+?)(?= au m²\b| en \d{4}\b|\s*[:|—]|$)', texte, re.I)
        else:
            m = re.search(r'\bà (.+?)(?=\s*[:|—.,]| et |$)', texte)
        if not m:
            continue
        nom = m[1].strip()
        if not 1 <= len(nom) <= 90 or not re.fullmatch(r"[A-Za-zÀ-ÖØ-öø-ÿŒœ'’ -]+", nom):
            continue
        slug = _slug(nom)
        if chemin.startswith('/prix-immobilier-'):
            correspond = chemin == '/prix-immobilier-' + slug + '/'
        else:
            correspond = chemin.rstrip('/').endswith('-' + slug)
        if correspond:
            return nom
    return ''


def appliquer(s, chemin, root=None):
    """Ajoute une entrée vers le formulaire personnel, une seule fois par page."""
    chemin = _chemin(chemin)
    if not chemin or not _eligible(s, chemin) or MARQUE in s:
        return s
    main = re.search(r'<main\b[^>]*>', s, re.I)
    if not main or '</head>' not in s:
        return s
    fin_main = s.find('</main>', main.end())
    if fin_main < 0:
        return s
    corps = s[main.end():fin_main]
    intro = re.search(r'<p\b[^>]*class\s*=\s*[\"\'][^\"\']*\blede\b[^\"\']*[\"\'][^>]*>.*?</p>', corps, re.I | re.S)
    position = main.end() + intro.end() if intro else main.end()
    nom = commune(s, chemin)
    titre = 'Votre bien à ' + nom + ' : parlons de sa valeur.' if nom else 'Vous avez un bien à faire estimer ?'
    params = {'commune': nom, 'origine': chemin} if nom else {'origine': chemin}
    href = '/estimation-immobiliere-dijon/?' + urlencode(params) + '#formulaire'
    classe = 'acq-est' + ('' if intro else ' acq-est-main')
    bloc = ('\n' + MARQUE + f'<aside class="{classe}" aria-label="Votre estimation avec Shawez">'
            f'<p class="acq-est-title">{html.escape(titre)}</p>'
            '<p class="acq-est-copy">Une estimation offerte et sans engagement, étudiée personnellement par Shawez Ali.</p>'
            '<div class="acq-est-actions">'
            f'<a class="btn btn-primary" href="{html.escape(href, quote=True)}">Demander mon estimation à Shawez <span aria-hidden="true">→</span></a>'
            '<a class="acq-est-call" href="tel:+33767579228">Appeler le 07 67 57 92 28</a>'
            '</div></aside>' + FIN + '\n')
    s = s[:position] + bloc + s[position:]
    if f'id="{STYLE_ID}"' not in s:
        s = s.replace('</head>', STYLE + '\n</head>', 1)
    return s

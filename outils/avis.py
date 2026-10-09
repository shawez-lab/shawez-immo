"""Avis Google : génère l'accueil (section « Ce que les autres disent »), la page /avis/
et le JSON-LD à partir de avis.json, source unique.

    python3 outils/avis.py            # depuis la racine du dépôt
    python3 outils/avis.py autre.json # (test) autre fichier source

Relançable : le contenu généré est encadré par des marqueurs <!-- avis:… --> et remplacé à chaque passage.
Aucun texte n'est modifié ; seul l'extrait de l'accueil est coupé à 220 caractères (texte complet sur /avis/).
"""
import html, json, re, sys

SRC = sys.argv[1] if len(sys.argv) > 1 else 'avis.json'
D = json.load(open(SRC, encoding='utf-8'))
F, AVIS = D['fiche'], D['avis']
MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']
E = lambda s: html.escape(str(s), quote=True)

for a in AVIS:
    for k in ('auteur', 'note', 'date', 'texte'):
        if a.get(k) in (None, ''):
            sys.exit('avis incomplet (%s manquant) : %r' % (k, a))
    if not re.match(r'^\d{4}-\d{2}(-\d{2})?$', a['date']):
        sys.exit('date attendue AAAA-MM ou AAAA-MM-JJ : %r' % a['date'])
    if not 1 <= int(a['note']) <= 5:
        sys.exit('note attendue de 1 à 5 : %r' % a)
AVIS = sorted(AVIS, key=lambda a: a['date'], reverse=True)   # du plus récent au plus ancien, sans tri par note


def court(nom):
    """Prénom + initiale : « Marie Dupont » → « Marie D. » ; un seul mot reste tel quel."""
    p = nom.split()
    return nom if len(p) < 2 else '%s %s.' % (p[0], p[-1][0].upper())

def mois(d):
    y, m = d.split('-')[:2]
    return '%s %s' % (MOIS[int(m) - 1], y)

def extrait(t, n=220):
    t = ' '.join(t.split())
    if len(t) <= n:
        return t
    return t[:n].rsplit(' ', 1)[0].rstrip(' ,;:.') + '…'

def fr(x):
    return ('%.1f' % x).replace('.', ',')

G = ('<svg class="g" viewBox="0 0 48 48" width="16" height="16" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z"/>'
     '<path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>'
     '<path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/>'
     '<path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.2-.1-2.3-.4-3.5z"/></svg>')

def etoiles(n):
    n = int(n)
    return ('<span class="stars" role="img" aria-label="%d étoile%s sur 5">%s<span class="off">%s</span></span>'
            % (n, 's' if n > 1 else '', '★' * n, '★' * (5 - n)))

def carte(a, complet=False):
    t = ' '.join(a['texte'].split()) if complet else extrait(a['texte'])
    lien = a.get('lien') or F['lien_avis']
    more = '' if complet or t == ' '.join(a['texte'].split()) else ' <a class="more" href="%s" target="_blank" rel="noopener">Lire l\'avis</a>' % E(lien)
    return ('<article class="avis-card">%s<p class="avis-txt">%s%s</p>'
            '<div class="avis-meta"><span class="who">%s</span><span class="when">%s</span>'
            '<a class="src" href="%s" target="_blank" rel="noopener">%s<span>Avis Google</span></a></div></article>'
            % (etoiles(a['note']), E(t), more, E(court(a['auteur'])), mois(a['date']), E(lien), G))

def date_fr(d):
    y, m, j = d.split('-')
    return '%d %s %s' % (int(j), MOIS[int(m) - 1], y)

def entete():
    """Preuve sociale : d'abord la note de la fiche Google « Shawez Ali — Agent immobilier » (vérifiée et datée,
    avis.json → fiche), puis celle de l'AGENCE Gravelin Immo (avis.json → preuve_agence), datée elle aussi."""
    A = D['preuve_agence']
    return ('<div class="avis-score"><p class="avis-note"><span class="n">%s</span>'
            '<span class="stars" role="img" aria-label="%s sur 5">★★★★★<span class="off"></span></span></p>'
            '<p class="avis-count"><strong>Ma fiche Google : %s/5 sur %d avis</strong> '
            '(<a href="%s" target="_blank" rel="noopener">relevé du %s</a>)</p>'
            '<p class="avis-count">L\'agence %s est notée %s/5 sur %d avis Google '
            '(<a href="%s" target="_blank" rel="noopener">relevé du %s</a>)</p></div>'
            % (fr(F['note']), fr(F['note']), fr(F['note']), F['nombre'], E(F['lien_avis']), date_fr(F['releve_le']),
               E(A['nom']), fr(A['note']), A['nombre'], E(A['lien']), date_fr(A['releve_le'])))

def boutons(page_avis=False):
    b = ('<a class="btn btn-primary" href="%s" target="_blank" rel="noopener">Voir tous les avis sur Google <span class="arw">→</span></a>'
         '<a class="btn" href="%s" target="_blank" rel="noopener">Laisser un avis</a>' % (E(F['lien_avis']), E(F['lien_depot'])))
    if not page_avis:
        b += '<a class="btn-text" href="/avis/">Comment les avis sont affichés <span class="arw">→</span></a>'
    return '<div class="btn-row avis-btns">%s</div>' % b

VIDE = '<p class="avis-vide body">Les avis se lisent sur la fiche Google, tels que leurs auteurs les ont écrits.</p>'

def bloc_accueil():
    h = ['<!-- avis:accueil -->', '<div class="avis-head rv">', entete(), '</div>']
    if AVIS:
        h.append('<div class="avis-row" id="avis-row" tabindex="0" aria-label="Avis Google">%s</div>' % ''.join(carte(a) for a in AVIS[:9]))
        if len(AVIS) > 1:
            h.append('<div class="dots m-only" data-dots="#avis-row" aria-hidden="true">%s</div>' % ('<i></i>' * min(len(AVIS), 9)))
    else:
        h.append(VIDE)
    h += [boutons(), '<!-- /avis:accueil -->']
    return '\n    '.join(h)

def bloc_page():
    h = ['<!-- avis:page -->', entete()]
    h.append('<div class="avis-list">%s</div>' % ''.join(carte(a, True) for a in AVIS) if AVIS else VIDE)
    h += [boutons(True), '<!-- /avis:page -->']
    return '\n      '.join(h)

CSS = """<style id="avis-css">
.avis-head{margin:8px 0 24px;}
.avis-score{display:flex;flex-direction:column;gap:6px;}
.avis-note{display:flex;align-items:center;gap:14px;margin:0;}
.avis-note .n{font-family:var(--font-display);font-weight:340;font-size:40px;line-height:1;font-variation-settings:"opsz" 144;color:var(--ink,#0F0E0C);}
.avis-count{margin:0;font-size:14px;color:#5E5850;}
.stars{color:#B5891F;letter-spacing:2px;font-size:18px;line-height:1;white-space:nowrap;}
.stars .off{color:rgba(15,14,12,.18);}
.avis-row{display:grid;grid-auto-flow:column;grid-auto-columns:calc((100% - 2*20px)/3);gap:20px;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none;padding:4px 2px 12px;margin-bottom:8px;}
.avis-row::-webkit-scrollbar{display:none;}
.avis-row:focus-visible{outline:2px solid #E3B341;outline-offset:4px;border-radius:20px;}
.avis-card{scroll-snap-align:start;display:flex;flex-direction:column;gap:14px;padding:24px;border-radius:20px;background:#F3EFE6;border:1px solid rgba(15,14,12,.08);min-height:100%;}
.avis-txt{margin:0;flex:1;font-size:15px;line-height:1.6;color:#2B2824;}
.avis-txt .more{white-space:nowrap;color:#8A6614;}
.avis-card .avis-meta{display:flex;flex-wrap:wrap;align-items:center;gap:6px 12px;font-size:13px;color:#5E5850;}
.avis-card .who{font-weight:600;color:#0F0E0C;}
.avis-card .src{margin-left:auto;display:inline-flex;align-items:center;gap:6px;min-height:44px;color:#5E5850;text-decoration:none;}
.avis-card .src:hover span{text-decoration:underline;}
.avis-list{display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:20px;margin:28px 0;}
.avis-vide{margin:0 0 20px;max-width:40em;}
.avis-btns{margin-top:16px;}
#home-avis .dots{margin:4px 0 12px;}
@media(max-width:767px){
  .avis-row{grid-auto-columns:82vw;gap:14px;margin-inline:calc(-1 * var(--gutter,20px));padding-inline:var(--gutter,20px);scroll-padding-inline:var(--gutter,20px);}
  .avis-card{padding:22px 20px;}
  .avis-list{grid-template-columns:1fr;}
  .avis-btns .btn{width:100%;justify-content:center;}
}
</style>"""

def repl(s, tag, new):
    a, b = '<!-- avis:%s -->' % tag, '<!-- /avis:%s -->' % tag
    return re.sub(re.escape(a) + r'.*?' + re.escape(b), lambda m: new, s, flags=re.S)

def with_css(s):
    s = re.sub(r'<style id="avis-css">.*?</style>\n?', '', s, flags=re.S)
    return s.replace('</head>', CSS + '\n</head>', 1)

def jsonld(s):
    """Nœud RealEstateAgent de la fiche Google « Shawez Ali — Agent immobilier » (distinct de celui de l'agence),
    avec aggregateRating et review uniquement s'il y a des avis réels dans avis.json."""
    def fix(m):
        d = json.loads(m.group(1))
        g = d.get('@graph')
        if g is None or not any(x.get('@id') == 'https://shawez-immo.com/#shawez' for x in g):
            return m.group(0)
        g[:] = [x for x in g if x.get('@id') != 'https://shawez-immo.com/#fiche-google']
        if AVIS:
            g.append({'@type': 'RealEstateAgent', '@id': 'https://shawez-immo.com/#fiche-google', 'name': F['nom'],
                      'url': 'https://shawez-immo.com/', 'telephone': '+33767579228', 'image': 'https://shawez-immo.com/assets/shawez-ali-portrait-costume-rose.webp',
                      'areaServed': {'@type': 'City', 'name': 'Dijon'}, 'founder': {'@id': 'https://shawez-immo.com/#shawez'},
                      'parentOrganization': {'@id': 'https://shawez-immo.com/#gravelin'}, 'sameAs': [F['lien_avis']],
                      'aggregateRating': {'@type': 'AggregateRating', 'ratingValue': F['note'], 'reviewCount': F['nombre'], 'bestRating': 5, 'worstRating': 1},
                      'review': [{'@type': 'Review', 'author': {'@type': 'Person', 'name': court(a['auteur'])}, 'datePublished': a['date'],
                                  'reviewRating': {'@type': 'Rating', 'ratingValue': int(a['note']), 'bestRating': 5},
                                  'reviewBody': ' '.join(a['texte'].split())} for a in AVIS]})
        return '<script type="application/ld+json">%s</script>' % json.dumps(d, ensure_ascii=False)
    return re.sub(r'<script type="application/ld\+json">(.*?)</script>', fix, s, flags=re.S)

# ---------- accueil ----------
p = 'index.html'; s = open(p, encoding='utf-8').read()
if '<!-- avis:accueil -->' not in s:   # premier passage : remplace le bloc d'attente
    s, n = re.subn(r'<div class="avis-empty rv">.*?</div>\s*</div>(\s*</div>\s*<!-- 3.11)', lambda m: '<!-- avis:accueil --><!-- /avis:accueil -->' + m.group(1), s, count=1, flags=re.S)
    assert n == 1, 'bloc d\'attente introuvable'
s = repl(s, 'accueil', bloc_accueil())
s = with_css(jsonld(s))
open(p, 'w', encoding='utf-8').write(s)

# ---------- page /avis/ ----------
p = 'avis/index.html'; s = open(p, encoding='utf-8').read()
if '<!-- avis:page -->' not in s:
    s, n = re.subn(r'<div class="card rv" style="max-width:720px;">\s*<p class="body"[^>]*>Les avis Google me concernant.*?</p>\s*',
                   '<!-- avis:page --><!-- /avis:page -->\n    <div class="card rv" style="max-width:720px;margin-top:40px;">\n      ', s, count=1, flags=re.S)
    assert n == 1, 'page avis : bloc introuvable'
    s = s.replace('<a class="link ext" href="https://www.opinionsystem.fr/fr-fr/certificate/12511" target="_blank" rel="noopener">Avis de l\'agence GRAVELIN IMMO sur Opinion System</a>',
                  '<p class="body" style="margin:0 0 10px;font-size:.96rem;">Les avis de l\'agence GRAVELIN IMMO dans son ensemble sont collectés par un organisme indépendant :</p><a class="link ext" href="https://www.opinionsystem.fr/fr-fr/certificate/12511" target="_blank" rel="noopener">Avis de l\'agence GRAVELIN IMMO sur Opinion System</a>')
s = repl(s, 'page', bloc_page())
s = with_css(s)
open(p, 'w', encoding='utf-8').write(s)
print('%d avis · fiche Shawez %s/5 sur %d avis · agence %s/5 sur %d avis' % (len(AVIS), fr(F['note']), F['nombre'], fr(D['preuve_agence']['note']), D['preuve_agence']['nombre']))

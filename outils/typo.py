"""Typographie seule : Familjen Grotesk (titres, avec italique) + Schibsted Grotesk (texte) à la place de Fraunces + Manrope.
Polices, tailles, graisses, interlignages. Ne touche ni aux textes, ni aux couleurs, ni aux mots en italique, ni aux surtitres. Relançable.

    python3 outils/typo.py
"""
import re, subprocess

PRELOAD = ('<link rel="preload" href="/assets/fonts/familjen.woff2" as="font" type="font/woff2" crossorigin>\n'
           '<link rel="preload" href="/assets/fonts/schibsted.woff2" as="font" type="font/woff2" crossorigin>\n'
           '<link rel="preload" href="/assets/fonts/familjen-italic.woff2" as="font" type="font/woff2" crossorigin>')

# Replis calibrés sur Arial / Liberation Sans : pas de saut au chargement.
FACES = """@font-face{font-family:'Familjen Grotesk';font-style:normal;font-weight:400 700;font-display:swap;src:url(/assets/fonts/familjen.woff2) format('woff2');}
@font-face{font-family:'Familjen Grotesk';font-style:italic;font-weight:400 700;font-display:swap;src:url(/assets/fonts/familjen-italic.woff2) format('woff2');}
@font-face{font-family:'Schibsted Grotesk';font-style:normal;font-weight:400 700;font-display:swap;src:url(/assets/fonts/schibsted.woff2) format('woff2');}
@font-face{font-family:'Familjen Repli';font-style:normal;src:local('Arial'),local('ArialMT'),local('Liberation Sans'),local('LiberationSans');size-adjust:91%;ascent-override:112.6%;descent-override:24.7%;line-gap-override:0%;}
@font-face{font-family:'Familjen Repli';font-style:italic;src:local('Arial Italic'),local('Arial-ItalicMT'),local('Liberation Sans Italic'),local('LiberationSans-Italic');size-adjust:91%;ascent-override:112.6%;descent-override:24.7%;line-gap-override:0%;}
@font-face{font-family:'Schibsted Repli';src:local('Arial'),local('ArialMT'),local('Liberation Sans'),local('LiberationSans');size-adjust:104%;ascent-override:93.9%;descent-override:24.8%;line-gap-override:0%;}"""

DISPLAY = "--font-display:'Familjen Grotesk','Familjen Repli',Arial,sans-serif;"
TEXT = "--font-text:'Schibsted Grotesk','Schibsted Repli',-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;"

TITRES = """.display,.t,.q,.proof-v,.why-card h3,.reel figcaption b,.beliefs b,.map-card b,.card h3,.gnote .big,.way b,.block h3,.block h2,
.steps .n,.steps h3,.faq summary,.legal h2,.cway b,.step-t h2,.est-who b,.est-side .how li b,.post h3,.article h2,.bareme td:last-child,
.sim-big,.sim-kv dd,.sim-peek b,#biens .biens-t,.proof-grid.facts4 .fact b,.proof-grid.facts4 .fact,.tips a,.yt-band .yt-t,.est-now h2,.est-or,
.gets li b,.crew .card h3,.tips-cards b,#hero h1,#menu li a,.who-ov b,#sortie p strong,.avis-note .n,.an-t,#equipe .why-card h3,
.biens-row .reel figcaption b,.sec-head .display,.sec-m .display.d-l,.sec-m .display.d-xl,.avis-card .who,.pod .t,.ep-t,.final .display"""

# Tailles, graisses et interlignages de la typographie v9. Les couleurs, les mots en italique et les surtitres restent ceux d'origine.
CSS = """<style id="typo-v9">
*{font-variation-settings:normal!important;}
body{font-family:var(--font-text);font-kerning:normal;text-rendering:optimizeLegibility;}
%s{font-family:var(--font-display);font-weight:600!important;letter-spacing:-.02em;}
.display{letter-spacing:-.028em;line-height:1.04;}
#hero h1{letter-spacing:-.03em;line-height:1.02;}
.display em,.t em,.q em,h1 em,h2 em,h3 em,.who-ov em{font-weight:inherit!important;}
.article blockquote{font-weight:500;font-size:1.15rem;}
#menu li a{font-weight:600!important;letter-spacing:-.025em;}
@media(max-width:767px){#hero h1{font-size:clamp(34px,9.6vw,42px)!important;}}
@media(min-width:768px){#hero h1{font-size:clamp(2.6rem,4.6vw,4.2rem)!important;}}
.btn,.btn-primary,button{font-family:var(--font-text);font-weight:600;letter-spacing:0;}
.body,.lede,p{font-feature-settings:"kern","liga";}
</style>""" % TITRES

def patch(s, gabarit=False):
    if gabarit:   # scripts Python qui fabriquent des pages : seulement les noms de police
        s = s.replace('/assets/fonts/manrope.woff2', '/assets/fonts/schibsted.woff2')
        s = s.replace("@font-face{{font-family:'Manrope';", "@font-face{{font-family:'Schibsted Grotesk';")
    else:
        s = re.sub(r'<link rel="preload" href="/assets/fonts/(?:fraunces-roman|fraunces-italic|manrope|familjen|familjen-italic|schibsted)\.woff2"[^>]*>\n?', '', s)
    if not gabarit and ('/assets/fonts/' in s or 'var(--font-' in s):
        s = s.replace('<link rel="icon" href="/favicon.ico"', PRELOAD + '\n<link rel="icon" href="/favicon.ico"', 1)
    had = bool(re.search(r"@font-face\s*\{\s*font-family:\s*'(?:Fraunces|Manrope|Familjen Grotesk)'", s))
    s = re.sub(r"@font-face\s*\{\s*font-family:\s*'(?:Fraunces|Manrope|Fraunces Repli|Fraunces Repli Texte|Manrope Repli|Familjen Grotesk|Schibsted Grotesk|Familjen Repli|Schibsted Repli)'[^}]*\}\n?", '', s)
    if had and not gabarit:
        s = re.sub(r'(<style[^>]*>)\s*', lambda m: m.group(1) + '\n' + FACES + '\n', s, count=1)
    s = s.replace('font-family="Manrope,sans-serif"', 'font-family="Schibsted Grotesk,Arial,sans-serif"')
    s = re.sub(r"--font-display:[^;]*;", DISPLAY, s)
    s = re.sub(r"--font-text:[^;]*;", TEXT, s)
    s = s.replace("'Fraunces','Fraunces Repli Texte',Georgia,serif", 'var(--font-display)')
    s = s.replace("'Manrope',-apple-system", "'Schibsted Grotesk',-apple-system")
    s = s.replace("'Manrope',sans-serif", "'Schibsted Grotesk',sans-serif").replace("'Fraunces',serif", "'Familjen Grotesk',sans-serif")
    if not gabarit and '--font-display' in s:
        s = re.sub(r'<style id="typo-v9">.*?</style>\n?', '', s, flags=re.S)
        s = s.replace('</head>', CSS + '\n</head>', 1)
    return s

if __name__ == '__main__':
    fs = [f for f in subprocess.check_output(['git', 'ls-files', '*.html', 'outils/*.py']).decode().split()
          if not f.startswith('de-claude/') and f != 'outils/typo.py']
    for f in fs:
        s = open(f, encoding='utf-8').read(); n = patch(s, f.endswith('.py'))
        if n != s:
            open(f, 'w', encoding='utf-8').write(n); print('ok', f)

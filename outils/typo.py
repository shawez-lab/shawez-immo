"""Typographie v9 : Familjen Grotesk (titres) + Schibsted Grotesk (texte), sur toutes les pages.
Relançable : remplace les anciennes déclarations (Fraunces, Manrope) et réécrit le bloc <style id="typo-v9">.

    python3 outils/typo.py
"""
import re, subprocess

PRELOAD = ('<link rel="preload" href="/assets/fonts/familjen.woff2" as="font" type="font/woff2" crossorigin>\n'
           '<link rel="preload" href="/assets/fonts/schibsted.woff2" as="font" type="font/woff2" crossorigin>')

# Replis calibrés sur Arial / Liberation Sans (largeurs mesurées dans Chrome) : pas de saut au chargement.
FACES = """@font-face{font-family:'Familjen Grotesk';font-style:normal;font-weight:400 700;font-display:swap;src:url(/assets/fonts/familjen.woff2) format('woff2');}
@font-face{font-family:'Schibsted Grotesk';font-style:normal;font-weight:400 700;font-display:swap;src:url(/assets/fonts/schibsted.woff2) format('woff2');}
@font-face{font-family:'Familjen Repli';font-weight:400 700;src:local('Arial Bold'),local('Arial-BoldMT'),local('Liberation Sans Bold'),local('LiberationSans-Bold');size-adjust:91%;ascent-override:112.6%;descent-override:24.7%;line-gap-override:0%;}
@font-face{font-family:'Schibsted Repli';font-weight:400 500;src:local('Arial'),local('ArialMT'),local('Liberation Sans'),local('LiberationSans');size-adjust:104%;ascent-override:93.9%;descent-override:24.8%;line-gap-override:0%;}
@font-face{font-family:'Schibsted Repli';font-weight:600 700;src:local('Arial Bold'),local('Arial-BoldMT'),local('Liberation Sans Bold'),local('LiberationSans-Bold');size-adjust:99.8%;ascent-override:97.9%;descent-override:25.8%;line-gap-override:0%;}"""

DISPLAY = "--font-display:'Familjen Grotesk','Familjen Repli',Arial,sans-serif;"
TEXT = "--font-text:'Schibsted Grotesk','Schibsted Repli',-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;"

TITRES = """.display,.t,.q,.proof-v,.why-card h3,.reel figcaption b,.beliefs b,.map-card b,.card h3,.gnote .big,.way b,.block h3,.block h2,
.steps .n,.steps h3,.faq summary,.legal h2,.cway b,.step-t h2,.est-who b,.est-side .how li b,.post h3,.article h2,.bareme td:last-child,
.sim-big,.sim-kv dd,.sim-peek b,#biens .biens-t,.proof-grid.facts4 .fact b,.proof-grid.facts4 .fact,.tips a,.yt-band .yt-t,.est-now h2,.est-or,
.gets li b,.crew .card h3,.tips-cards b,#hero h1,#menu li a,.who-ov b,#sortie p strong,.avis-note .n,.an-t,#equipe .why-card h3,
.biens-row .reel figcaption b,.sec-head .display,.sec-m .display.d-l,.sec-m .display.d-xl,.avis-card .who,.pod .t,.ep-t,.final .display"""

CSS = """<style id="typo-v9">
/* v9 : Familjen Grotesk pour les titres, Schibsted Grotesk pour le texte. Pas d'italique, pas de mot en couleur dans les titres. */
*{font-variation-settings:normal!important;}
body{font-family:var(--font-text);font-kerning:normal;text-rendering:optimizeLegibility;}
%s{font-family:var(--font-display);font-weight:600!important;font-style:normal!important;letter-spacing:-.02em;}
.display{letter-spacing:-.028em;line-height:1.04;}
#hero h1{letter-spacing:-.03em;line-height:1.02;}
.display em,.t em,.q em,h1 em,h2 em,h3 em,.hero-tag em,.who-ov em{font-style:normal!important;font-weight:inherit!important;color:inherit!important;}
.q,.hero-tag,#hero .hero-tag,#biens .biens-t,.article blockquote,.proof-v .sfx,.why-img .n,em.ph{font-style:normal!important;}
.hero-tag,#hero .hero-tag{font-family:var(--font-text)!important;font-weight:500!important;letter-spacing:0;}
.article blockquote{font-family:var(--font-text);font-weight:500;font-size:1.15rem;}
#menu li a{font-weight:600!important;letter-spacing:-.025em;}
.label,.tips-cards em,.an-st{text-transform:none!important;letter-spacing:0!important;}
.label{font-size:14px!important;font-weight:600;}
.tips-cards em{font-size:13px;font-weight:600;}
#curtain .c-name{letter-spacing:.2em;}
.brand small,.hero-vid figcaption,.who-img .cap,.agency,.map-wrap .legend,.strip figcaption,.eps small,.steps .get b,.ft h4,.ft .ft-h,.ft .soon small,
.post .meta,.article th,.bareme th,.sim-kv dt,.sim-peek span,.film .film-play span{text-transform:none!important;letter-spacing:0!important;font-size:13px!important;}
.strip figcaption,.who-img .cap,.film .film-play span{font-size:14px!important;font-weight:600!important;}
.ft .ft-h,.ft h4{font-size:14px!important;}
.sec-head{max-width:none!important;}.sec-head p,.sec-head .body,.sec-head .lede{max-width:38em;}
h2.display,.sec-head .display,.sec-head h2{max-width:16em!important;}
@media(max-width:767px){#hero h1{font-size:clamp(34px,9.6vw,42px)!important;}}
@media(min-width:768px){#hero h1{font-size:clamp(2.6rem,4.6vw,4.2rem)!important;}}
.btn,.btn-primary,button{font-family:var(--font-text);font-weight:600;letter-spacing:0;}
.body,.lede,p{font-feature-settings:"kern","liga";}
</style>""" % TITRES

def patch(s):
    s = re.sub(r'<link rel="preload" href="/assets/fonts/(?:fraunces-roman|fraunces-italic|manrope|familjen|schibsted)\.woff2"[^>]*>\n?', '', s)
    s = s.replace('<link rel="icon" href="/favicon.ico"', PRELOAD + '\n<link rel="icon" href="/favicon.ico"', 1) if PRELOAD not in s else s
    s = re.sub(r"@font-face\s*\{\s*font-family:\s*'(?:Fraunces|Manrope|Fraunces Repli|Fraunces Repli Texte|Manrope Repli|Familjen Grotesk|Schibsted Grotesk|Familjen Repli|Schibsted Repli)'[^}]*\}\n?", '', s)
    s = re.sub(r"@font-face\{font-family:'Manrope';[^}]*\}\}?", '', s)   # pages sas (accolades doublées du gabarit)
    # les nouvelles déclarations, en tête du premier <style>
    s = re.sub(r'(<style[^>]*>)\s*', lambda m: m.group(1) + '\n' + FACES + '\n', s, count=1)
    s = s.replace('font-family="Manrope,sans-serif"', 'font-family="Schibsted Grotesk,Arial,sans-serif"')
    s = re.sub(r"--font-display:[^;]*;", DISPLAY, s)
    s = re.sub(r"--font-text:[^;]*;", TEXT, s)
    s = s.replace("'Fraunces','Fraunces Repli Texte',Georgia,serif", 'var(--font-display)')
    s = s.replace("font-family:'Manrope',-apple-system", "font-family:'Schibsted Grotesk','Schibsted Repli',-apple-system")
    s = s.replace("var(--font-text,'Manrope',sans-serif)", "var(--font-text)").replace("var(--font-display,'Fraunces',serif)", "var(--font-display)")
    s = re.sub(r'<style id="typo-v9">.*?</style>\n?', '', s, flags=re.S)
    s = s.replace('</head>', CSS + '\n</head>', 1)
    # les petits titres au-dessus des titres (« surtitres ») disparaissent
    s = re.sub(r'<p class="label[^"]*"[^>]*>[^<]*</p>\s*(?=<h[12])', '', s)
    s = re.sub(r'(<div class="sec-head[^"]*">\s*(?:<div>)?\s*)<p class="label[^"]*"[^>]*>[^<]*</p>\s*', r'\1', s)
    s = re.sub(r'<p class="label[^"]*hero-kicker[^"]*"[^>]*>.*?</p>\s*', '', s)
    return s

if __name__ == '__main__':
    fs = [f for f in subprocess.check_output(['git', 'ls-files', '*.html']).decode().split() if not f.startswith('de-claude/')]
    for f in fs:
        s = open(f, encoding='utf-8').read(); n = patch(s)
        if n != s:
            open(f, 'w', encoding='utf-8').write(n); print('ok', f)

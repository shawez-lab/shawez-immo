"""Police seule : Familjen Grotesk (titres, avec italique) + Schibsted Grotesk (texte) à la place de Fraunces + Manrope.
Ne touche ni aux textes, ni aux couleurs, ni aux mots en italique, ni aux surtitres. Relançable.

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
    return s

if __name__ == '__main__':
    fs = [f for f in subprocess.check_output(['git', 'ls-files', '*.html', 'outils/*.py']).decode().split()
          if not f.startswith('de-claude/') and f != 'outils/typo.py']
    for f in fs:
        s = open(f, encoding='utf-8').read(); n = patch(s, f.endswith('.py'))
        if n != s:
            open(f, 'w', encoding='utf-8').write(n); print('ok', f)

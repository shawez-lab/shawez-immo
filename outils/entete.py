#!/usr/bin/env python3
"""En-tête « vague 3 » sur toutes les pages qui ont l'en-tête du site (actions 24 et 30 du plan).

Sur téléphone : monogramme, bouton téléphone 44 px et « Estimer » dès le premier écran ;
partout : lien d'évitement « Aller au contenu ».
La référence est /avis/index.html (déjà à jour) : on recopie ses morceaux dans les pages qui ne les ont pas
(fiches /biens/, pages prix-immobilier-*, nouvelles pages Conseils…). Sans effet sur une page déjà à jour.
Appelé par outils/build.py à chaque construction (donc aussi après la synchro des annonces).
"""
import os, re

RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REF = os.path.join(RACINE, 'avis', 'index.html')

LOGO_SEUL = ('<img class="lg-ivory" src="/assets/logo-horiz-ivory.webp" alt="" width="1259" height="176" '
             'decoding="async" aria-hidden="true"></a>')
CTA_ANCIENS = ('<a class="btn btn-primary" href="/estimer/"><span>Estimer mon bien</span></a>',)


def morceaux():
    s = open(REF, encoding='utf-8').read()
    style = re.search(r'<style id="v3-entete">.*?</style>\n', s, re.S).group(0)
    skip = '<a class="skip" href="#main">Aller au contenu</a>\n'
    assert skip in s
    i = s.index('<a class="nav-tel-ico"')
    tel = s[i:s.index('</a>', i) + 4]
    j = s.index('<img class="lg-ink lgm"')
    mono = s[j:s.index('</a>', j)]
    cta = re.search(r'<a class="btn btn-primary" href="/estimer/" aria-label="Estimer mon bien">.*?</a>', s).group(0)
    return style, skip, tel, mono, cta


def appliquer(s, m=None):
    """Renvoie la page avec l'en-tête vague 3 ; inchangée si elle l'a déjà ou n'a pas l'en-tête du site."""
    if '<header id="nav">' not in s or 'id="v3-entete"' in s:
        return s
    style, skip, tel, mono, cta = m or morceaux()
    a_tel, a_mono = 'nav-tel-ico' in s, 'lg-ink lgm' in s     # avant d'ajouter le style, qui contient ces noms
    s = s.replace('</head>', style + '</head>', 1)
    if 'class="skip"' not in s:
        s = s.replace('<header id="nav">', skip + '<header id="nav">', 1)
    if not a_mono:
        s = s.replace(LOGO_SEUL, LOGO_SEUL[:-4] + mono + '</a>', 1)
    if not a_tel:
        s = re.sub(r'(<div class="nav-cta">.*?)(<a class="nav-compte"|<a class="btn btn-primary" href="/estimer/")', lambda x: x.group(1) + tel + '\n    ' + x.group(2),
                   s, count=1, flags=re.S)
    for a in CTA_ANCIENS:
        k = s.find('<div class="nav-cta">')
        if k >= 0 and a in s[k:k + 4000]:
            s = s[:k] + s[k:k + 4000].replace(a, cta, 1) + s[k + 4000:]
    if 'id="main"' not in s:      # cible du lien d'évitement
        s = s.replace('<main>', '<main id="main">', 1)
    return s


def tout(fichiers):
    m = morceaux()
    n = 0
    for f in fichiers:
        p = os.path.join(RACINE, f)
        s = open(p, encoding='utf-8').read()
        t = appliquer(s, m)
        if t != s:
            open(p, 'w', encoding='utf-8').write(t)
            n += 1
    return n


if __name__ == '__main__':
    import subprocess
    fs = [f for f in subprocess.check_output(['git', 'ls-files', '*.html'], cwd=RACINE).decode().split()
          if not f.startswith(('outils/', 'tests', 'node_modules'))]
    print('en-tête vague 3 :', tout(fs), 'page(s) mise(s) à jour')

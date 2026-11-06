#!/usr/bin/env python3
"""En-tête « vague 3 » sur toutes les pages qui ont l'en-tête du site (actions 24 et 30 du plan).

Sur téléphone (< 481 px) : monogramme, bouton téléphone 44 px et « Estimer » dès le premier écran
(masqué sur /estimer/) ; partout : lien d'évitement « Aller au contenu ».
Les morceaux sont écrits ici (plus de page de référence) : relancer ce script ne change rien à une page déjà à jour.
Appelé par outils/build.py à chaque construction (donc aussi après la synchro des annonces et les pages SEO).
"""
import os, re, subprocess

RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

STYLE = '<style id="v3-entete">\n/* Vague 3 — action 24 : sur téléphone, « Estimer » + téléphone dans l\'en-tête dès le premier écran ; action 30 : lien d\'évitement */\n.skip{position:absolute;left:12px;top:-60px;z-index:300;padding:12px 18px;border-radius:999px;background:#0F0E0C;color:#F3EFE6;font-weight:600;text-decoration:none;transition:top .2s;}\n.skip:focus{top:12px;outline:2px solid #E2B33C;outline-offset:3px;}\n.nav-tel-ico{display:none;}\n.brand .lgm{height:34px;width:auto;}\n.cta-court{display:none;}\n@media(min-width:481px){.brand .lgm{display:none!important;}}\n@media(max-width:480px){\n  .brand img:not(.lgm){display:none!important;}\n  #nav .nav-cta{gap:8px;}\n  #nav .nav-cta .btn-primary{display:inline-flex!important;align-items:center;min-height:44px;padding-inline:16px;font-size:.92rem;}\n  #nav .cta-long{display:none;} #nav .cta-court{display:inline;}\n  #nav .nav-tel-ico{display:inline-flex;align-items:center;justify-content:center;width:44px;height:44px;flex:0 0 auto;border:1px solid currentColor;border-radius:999px;color:inherit;}\n  #nav .nav-compte,#nav #burger{height:44px;} #nav .nav-compte{width:44px;}\n  body[data-route^="/estimer"] #nav .nav-cta .btn-primary{display:none!important;}\n}\n@media(max-width:350px){#nav #burger{padding:0 12px;}}\n</style>\n'
SKIP = '<a class="skip" href="#main">Aller au contenu</a>\n'
TEL = '<a class="nav-tel-ico" href="tel:+33767579228" aria-label="Appeler Shawez au 07 67 57 92 28"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.6a2 2 0 0 1-.5 2.1L8 9.7a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.8.3 1.7.5 2.6.7a2 2 0 0 1 1.7 2z"/></svg></a>'
MONO = '<img class="lg-ink lgm" src="/assets/logo-mono-ink.webp" alt="" width="369" height="338" decoding="async" aria-hidden="true"><img class="lg-ivory lgm" src="/assets/logo-mono-ivory.webp" alt="" width="369" height="338" decoding="async" aria-hidden="true">'
CTA = '<a class="btn btn-primary" href="/estimer/" aria-label="Estimer mon bien"><span class="cta-long">Estimer mon bien</span><span class="cta-court">Estimer</span></a>'
LOGO_SEUL = ('<img class="lg-ivory" src="/assets/logo-horiz-ivory.webp" alt="" width="1259" height="176" '
             'decoding="async" aria-hidden="true"></a>')
CTA_ANCIEN = '<a class="btn btn-primary" href="/estimer/"><span>Estimer mon bien</span></a>'


def appliquer(s):
    """Renvoie la page avec l'en-tête vague 3 ; inchangée si elle l'a déjà ou n'a pas l'en-tête du site."""
    if '<header id="nav">' not in s or 'id="v3-entete"' in s:
        return s
    a = s.index('<header id="nav">')
    b = s.index('</header>', a)
    tete = s[a:b]
    if 'class="nav-tel-ico"' not in tete:
        tete = re.sub(r'(<div class="nav-cta">.*?)(<a class="nav-compte"|<a class="btn btn-primary" href="/estimer/")',
                      lambda x: x.group(1) + TEL + '\n    ' + x.group(2), tete, count=1, flags=re.S)
    if 'lgm' not in tete and LOGO_SEUL in tete:
        tete = tete.replace(LOGO_SEUL, LOGO_SEUL[:-4] + MONO + '</a>', 1)
    tete = tete.replace(CTA_ANCIEN, CTA, 1)
    s = s[:a] + tete + s[b:]
    if 'class="skip"' not in s:
        s = s.replace('<header id="nav">', SKIP + '<header id="nav">', 1)
    if 'id="main"' not in s:      # cible du lien d'évitement
        s = re.sub(r'<main(?=[\s>])', '<main id="main"', s, count=1)
    s = s.replace('</head>', STYLE + '</head>', 1)
    return s


def tout(fichiers):
    n = 0
    for f in fichiers:
        p = os.path.join(RACINE, f)
        s = open(p, encoding='utf-8').read()
        t = appliquer(s)
        if t != s:
            open(p, 'w', encoding='utf-8').write(t)
            n += 1
    return n


if __name__ == '__main__':
    fs = [f for f in subprocess.check_output(['git', 'ls-files', '*.html'], cwd=RACINE).decode().split()
          if not f.startswith(('outils/', 'tests', 'node_modules', 'de-claude/'))]
    print('en-tête vague 3 :', tout(fs), 'page(s) mise(s) à jour')

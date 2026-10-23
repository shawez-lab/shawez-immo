#!/usr/bin/env python3
"""Maillage interne contextuel : ajoute à chaque page publique un petit bloc « Pages liées » vers les pages
piliers et les pages sœurs (prix ↔ location d'une même commune, commerces ↔ immobilier professionnel…).
Relançable : le bloc est entre <!-- maillage --> et <!-- /maillage --> et refait à chaque passage.
Un lien déjà présent dans le contenu de la page n'est pas répété.

    python3 outils/seo/maillage.py
"""
import html, os, re, subprocess

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DEB, FIN = '<!-- maillage -->', '<!-- /maillage -->'

T = {  # libellés des pages cibles
    '/agent-immobilier-dijon/': 'Agent immobilier à Dijon',
    '/estimation-immobiliere-dijon/': 'Estimation immobilière à Dijon',
    '/vendre-bien-immobilier-dijon/': 'Vendre un bien à Dijon',
    '/prix-immobilier-dijon/': 'Prix immobilier à Dijon',
    '/prix-immobilier-cote-d-or/': "Prix immobilier en Côte-d'Or",
    '/biens-a-vendre-dijon/': 'Biens à vendre',
    '/chateau-a-vendre-bourgogne/': 'Châteaux et biens de prestige',
    '/fonds-de-commerce-a-vendre-dijon/': 'Fonds de commerce à vendre',
    '/vendre-commerce-dijon/': 'Céder votre commerce',
    '/immobilier-professionnel-dijon/': 'Murs, bureaux et locaux',
    '/location-immobiliere-dijon/': 'Mettre en location à Dijon',
    '/estimation-loyer-dijon/': 'Estimer le loyer',
    '/louer-appartement-dijon/': 'Louer un appartement à Dijon',
    '/secteurs-dijon-nuits-saint-georges-beaune/': 'Mon secteur',
    '/agent-immobilier-beaune/': 'Agent immobilier à Beaune',
    '/immobilier-nuits-saint-georges/': 'Immobilier à Nuits-Saint-Georges',
    '/immobilier-fontaine-les-dijon/': 'Immobilier à Fontaine-lès-Dijon',
    '/conseils-vendeurs/acheter-fonds-de-commerce-dijon/': 'Acheter un fonds de commerce',
    '/conseils-vendeurs/acheter-murs-commerciaux-dijon/': 'Acheter des murs commerciaux',
    '/conseils-vendeurs/choisir-agent-immobilier-dijon/': 'Choisir un agent immobilier',
    '/simulateur-pret-immobilier-dijon/': 'Simulateur de prêt',
    '/videos-immobilier-dijon/': 'Les films des biens',
    '/avis/': 'Avis clients',
    '/plan-du-site/': 'Plan du site',
}

FIXES = {
    '/vendre-bien-immobilier-dijon/': ['/agent-immobilier-dijon/', '/prix-immobilier-dijon/', '/chateau-a-vendre-bourgogne/', '/immobilier-professionnel-dijon/', '/biens-a-vendre-dijon/', '/conseils-vendeurs/choisir-agent-immobilier-dijon/'],
    '/estimation-immobiliere-dijon/': ['/agent-immobilier-dijon/', '/prix-immobilier-dijon/', '/prix-immobilier-cote-d-or/', '/vendre-bien-immobilier-dijon/', '/chateau-a-vendre-bourgogne/', '/estimation-loyer-dijon/'],
    '/vendre-commerce-dijon/': ['/fonds-de-commerce-a-vendre-dijon/', '/immobilier-professionnel-dijon/', '/conseils-vendeurs/acheter-fonds-de-commerce-dijon/', '/conseils-vendeurs/acheter-murs-commerciaux-dijon/', '/agent-immobilier-dijon/'],
    '/biens-a-vendre-dijon/': ['/agent-immobilier-dijon/', '/chateau-a-vendre-bourgogne/', '/fonds-de-commerce-a-vendre-dijon/', '/immobilier-professionnel-dijon/', '/simulateur-pret-immobilier-dijon/', '/prix-immobilier-dijon/'],
    '/shawez-ali-agent-immobilier-dijon/': ['/agent-immobilier-dijon/', '/vendre-bien-immobilier-dijon/', '/chateau-a-vendre-bourgogne/', '/fonds-de-commerce-a-vendre-dijon/', '/location-immobiliere-dijon/', '/avis/'],
    '/secteurs-dijon-nuits-saint-georges-beaune/': ['/agent-immobilier-dijon/', '/prix-immobilier-cote-d-or/', '/chateau-a-vendre-bourgogne/', '/estimation-immobiliere-dijon/'],
    '/location-immobiliere-dijon/': ['/agent-immobilier-dijon/', '/prix-immobilier-dijon/', '/louer-appartement-dijon/', '/immobilier-professionnel-dijon/'],
    '/videos-immobilier-dijon/': ['/agent-immobilier-dijon/', '/biens-a-vendre-dijon/', '/chateau-a-vendre-bourgogne/', '/fonds-de-commerce-a-vendre-dijon/', '/vendre-bien-immobilier-dijon/', '/avis/'],
    '/avis/': ['/agent-immobilier-dijon/', '/estimation-immobiliere-dijon/', '/vendre-bien-immobilier-dijon/', '/videos-immobilier-dijon/'],
    '/contact/': ['/agent-immobilier-dijon/', '/estimation-immobiliere-dijon/', '/vendre-bien-immobilier-dijon/', '/location-immobiliere-dijon/', '/fonds-de-commerce-a-vendre-dijon/'],
    '/podcast/': ['/agent-immobilier-dijon/', '/prix-immobilier-dijon/', '/conseils-vendeurs/choisir-agent-immobilier-dijon/', '/videos-immobilier-dijon/'],
    '/honoraires/': ['/agent-immobilier-dijon/', '/estimation-immobiliere-dijon/', '/vendre-bien-immobilier-dijon/', '/conseils-vendeurs/choisir-agent-immobilier-dijon/'],
    '/simulateur-pret-immobilier-dijon/': ['/biens-a-vendre-dijon/', '/prix-immobilier-dijon/', '/agent-immobilier-dijon/', '/immobilier-professionnel-dijon/'],
    '/prix-immobilier-dijon/': ['/agent-immobilier-dijon/', '/prix-immobilier-cote-d-or/', '/estimation-immobiliere-dijon/', '/vendre-bien-immobilier-dijon/'],
    '/prix-immobilier-cote-d-or/': ['/agent-immobilier-dijon/', '/prix-immobilier-dijon/', '/chateau-a-vendre-bourgogne/', '/estimation-immobiliere-dijon/'],
    '/agent-immobilier-beaune/': ['/prix-immobilier-beaune/', '/agent-immobilier-dijon/', '/chateau-a-vendre-bourgogne/', '/location-immobiliere-beaune/', '/prix-immobilier-cote-d-or/'],
    '/immobilier-nuits-saint-georges/': ['/prix-immobilier-nuits-saint-georges/', '/agent-immobilier-dijon/', '/chateau-a-vendre-bourgogne/', '/agent-immobilier-beaune/', '/prix-immobilier-gevrey-chambertin/'],
    '/immobilier-fontaine-les-dijon/': ['/prix-immobilier-fontaine-les-dijon/', '/agent-immobilier-dijon/', '/location-immobiliere-fontaine-les-dijon/', '/prix-immobilier-talant/', '/prix-immobilier-dijon/'],
    '/conseils-vendeurs/': ['/agent-immobilier-dijon/', '/estimation-immobiliere-dijon/', '/fonds-de-commerce-a-vendre-dijon/', '/immobilier-professionnel-dijon/', '/conseils-vendeurs/acheter-fonds-de-commerce-dijon/', '/conseils-vendeurs/acheter-murs-commerciaux-dijon/'],
    '/estimation-loyer-dijon/': ['/location-immobiliere-dijon/', '/agent-immobilier-dijon/', '/prix-immobilier-dijon/'],
    '/location-meublee-dijon/': ['/location-immobiliere-dijon/', '/agent-immobilier-dijon/', '/estimation-loyer-dijon/'],
    '/location-etudiante-dijon/': ['/location-immobiliere-dijon/', '/agent-immobilier-dijon/', '/estimation-loyer-dijon/'],
    '/louer-appartement-dijon/': ['/location-immobiliere-dijon/', '/biens-a-vendre-dijon/', '/agent-immobilier-dijon/'],
}


def libelle(u):
    if u in T:
        return T[u]
    m = re.match(r'/prix-immobilier-(.+)/$', u)
    if m:
        return 'Prix immobilier à ' + COMMUNES.get(m.group(1), m.group(1))
    m = re.match(r'/location-immobiliere-(.+)/$', u)
    if m:
        return 'Mettre en location à ' + COMMUNES.get(m.group(1), m.group(1))
    return u


def existe(u):
    return os.path.isfile(os.path.join(ROOT, u.strip('/'), 'index.html'))


def communes():
    out = {}
    for d in os.listdir(ROOT):
        m = re.match(r'prix-immobilier-(.+)$', d)
        f = os.path.join(ROOT, d, 'index.html')
        if m and os.path.isfile(f):
            h1 = re.search(r'<title>Prix immobilier (?:à |en )?(.*?)(?: au m²| :|\s*\()', open(f, encoding='utf-8').read())
            if h1:
                out[m.group(1)] = html.unescape(h1.group(1)).strip()
    return out


COMMUNES = {}


def cibles(chemin):
    if chemin in FIXES:
        return FIXES[chemin]
    m = re.match(r'/prix-immobilier-(.+)/$', chemin)
    if m:
        c = m.group(1)
        return ['/location-immobiliere-%s/' % c, '/agent-immobilier-dijon/', '/estimation-immobiliere-dijon/', '/vendre-bien-immobilier-dijon/', '/prix-immobilier-dijon/']
    m = re.match(r'/location-immobiliere-(.+)/$', chemin)
    if m:
        c = m.group(1)
        return ['/prix-immobilier-%s/' % c, '/agent-immobilier-dijon/', '/louer-appartement-dijon/', '/estimation-loyer-dijon/']
    if chemin.startswith('/conseils-vendeurs/'):
        if any(k in chemin for k in ('commerce', 'murs')):
            return ['/fonds-de-commerce-a-vendre-dijon/', '/immobilier-professionnel-dijon/', '/vendre-commerce-dijon/', '/agent-immobilier-dijon/']
        if any(k in chemin for k in ('louer', 'locat', 'location', 'documents')):
            return ['/location-immobiliere-dijon/', '/estimation-loyer-dijon/', '/agent-immobilier-dijon/']
        return ['/agent-immobilier-dijon/', '/estimation-immobiliere-dijon/', '/vendre-bien-immobilier-dijon/', '/prix-immobilier-dijon/']
    return []


def bloc(chemin, s):
    sans = re.sub(re.escape(DEB) + '.*?' + re.escape(FIN), '', s, flags=re.S)
    m = re.search(r'<main\b.*?</main>', sans, re.S)
    deja = set(re.findall(r'href="([^"#?]+)', m.group(0))) if m else set()
    liens = [u for u in cibles(chemin) if u != chemin and u not in deja and existe(u)]
    return liens


def poser(chemin, s):
    s = re.sub(r'\s*' + re.escape(DEB) + '.*?' + re.escape(FIN), '', s, flags=re.S)
    liens = bloc(chemin, s)
    if not liens:
        return s
    a = ''.join('<a class="link" href="%s">%s</a>' % (u, html.escape(libelle(u))) for u in liens)
    if '<aside class="art-side">' in s and '</aside>' in s:
        card = '%s<div class="card"><h3>Pages utiles</h3>%s</div>%s' % (DEB, a, FIN)
        i = s.index('</aside>', s.index('<aside class="art-side">'))
        return s[:i] + card + '\n      ' + s[i:]
    # pages sans colonne : bloc discret en fin de contenu
    lis = ''.join('<li><a class="link" href="%s">%s</a></li>' % (u, html.escape(libelle(u))) for u in liens)
    nav = ('%s<nav class="shell maillage" aria-label="Pages liées" style="padding-block:clamp(32px,5vw,64px);">'
           '<p class="label">Pages liées</p><ul style="list-style:none;margin:14px 0 0;padding:0;display:flex;flex-wrap:wrap;gap:10px 28px;">%s</ul></nav>%s'
           % (DEB, lis, FIN))
    i = s.rfind('</main>')
    if i < 0:
        return s
    return s[:i] + nav + '\n' + s[i:]


def pages():
    out = subprocess.check_output(['git', 'ls-files', '--cached', '--others', '--exclude-standard', '*index.html'], cwd=ROOT).decode().split()
    return sorted(set(f for f in out if not f.startswith(('admin/', 'mon-espace/', 'outils/', 'de-claude/', 'biens/', 'posts-images/', 'annonces/'))
                      and os.path.exists(os.path.join(ROOT, f))))


if __name__ == '__main__':
    COMMUNES.update(communes())
    n = 0
    for f in pages():
        chemin = '/' + f[:-len('index.html')]
        p = os.path.join(ROOT, f)
        s = open(p, encoding='utf-8').read()
        if 'noindex' in (re.search(r'<meta name="robots" content="([^"]*)"', s) or [None, ''])[1]:
            continue
        t = poser(chemin, s)
        if t != s:
            open(p, 'w', encoding='utf-8').write(t)
            n += 1
    print('pages avec bloc « Pages liées » mis à jour :', n)

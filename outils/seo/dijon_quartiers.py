#!/usr/bin/env python3
"""Pages de quartier : uniquement les ventes DVF locales, dans les contours officiels.

Relançable hors réseau. Ne publie ni voie, ni coordonnées, ni jour exact de vente.
python3 outils/seo/dijon_quartiers.py
"""
import argparse
import calendar
import hashlib
import html
import json
import re
import statistics
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SITE = 'https://shawez-immo.com'
PILIER = '/estimation-immobiliere-dijon/'
PREFIXE = 'estimation-immobiliere-dijon/'
CSS = '<link rel="stylesheet" href="/assets/dijon-quartiers.css">'
SOURCE_DVF = 'https://www.data.gouv.fr/datasets/demandes-de-valeurs-foncieres-geolocalisees'
PHOTO = '/assets/shawez-ali-portrait-veste-verte.webp'
MINIMUM = 5
ARTICLES = {
 'choisir-agent-immobilier-dijon': None,
 'montchapet-marmuzots-estimation-maison-differences': 'montchapet',
 'bourroches-port-canal-valendons-montagne-sainte-anne-vendre': 'bourroches-port-du-canal-valendons-montagne-sainte-anne',
 'maladiere-drapeau-clemenceau-trois-histoires-vendre': 'maladiere-drapeau-clemenceau',
 'prix-affiche-prix-signe-dijon': None,
 'centre-ville-dijon-distribution-copropriete-appartement': 'centre-ville',
 'chevreul-parc-jardin-balcon-cour-vendre-dijon': 'chevreul-parc',
 'gresilles-dijon-dossier-immeuble-vendre-logement': 'gresilles',
 'universite-dijon-vendre-maison-appartement-usages': 'universite',
 'varennes-toison-or-joffre-dijon-localisation-vendre': 'varennes-toison-d-or-joffre',
}


def normal(s):
    return ''.join(c for c in unicodedata.normalize('NFD', s) if not unicodedata.combining(c)).lower()


def slug(s):
    return re.sub('[^a-z0-9]+', '-', normal(s)).strip('-')


def e(s):
    return html.escape(str(s), quote=True)


def fr(n):
    if n is None:
        return 'Échantillon insuffisant'
    # Valeur exacte conservée dans le manifeste ; affichage arrondi à l’euro.
    from decimal import Decimal, ROUND_HALF_UP
    return f'{int(Decimal(str(n)).quantize(Decimal(1), rounding=ROUND_HALF_UP)):,}'.replace(',', '\u202f')


def anneau(x, y, points):
    """Ray casting avec inclusion du bord ; les trous sont retirés par contient()."""
    dedans = False
    for (ax, ay), (bx, by) in zip(points, points[1:] + points[:1]):
        cross = (x - ax) * (by - ay) - (y - ay) * (bx - ax)
        if abs(cross) < 1e-12 and min(ax, bx) <= x <= max(ax, bx) and min(ay, by) <= y <= max(ay, by):
            return True
        if (ay > y) != (by > y) and x < (bx - ax) * (y - ay) / (by - ay) + ax:
            dedans = not dedans
    return dedans


def contient(geom, x, y):
    if geom['type'] not in ('Polygon', 'MultiPolygon'):
        raise ValueError('Contour non polygonal')
    polygones = [geom['coordinates']] if geom['type'] == 'Polygon' else geom['coordinates']
    return any(anneau(x, y, p[0]) and not any(anneau(x, y, trou) for trou in p[1:]) for p in polygones)


def charger(root=ROOT):
    index = json.loads((root / 'donnees-dvf/index.json').read_text())
    contours = json.loads((root / 'outils/seo/dijon-quartiers.geojson').read_text())
    quartiers = [{'nom': {'Gresilles': 'Grésilles'}.get(f['properties']['nom'], f['properties']['nom']), 'slug': slug(f['properties']['nom']),
                  'geometrie': f['geometry'], 'ventes': []} for f in contours['features']]
    ville, ambigus, hors_contours = [], 0, 0
    empreinte = hashlib.sha256()
    for tuile in sorted(index['tuiles']):
        brut = (root / f'donnees-dvf/t/{tuile}.json').read_bytes()
        detail = (root / f'donnees-dvf/d/{tuile}.txt').read_bytes()
        empreinte.update(tuile.encode() + b'\0' + brut + b'\0' + detail)
        points = json.loads(brut)
        lignes = [json.loads(l) for l in detail.decode().splitlines()]
        if len(points) != len(lignes):
            raise ValueError(f'Tuile désalignée : {tuile}')
        for point, d in zip(points, lignes):
            if normal(d[2]).strip() != 'dijon':
                continue
            if len(point) < 8 or point[2] not in (0, 1) or point[3] <= 0 or point[4] <= 0 or d[0] <= 0:
                raise ValueError(f'Vente DVF invalide : {tuile}')
            vente = {'type': point[2], 'surface': point[3], 'prix_m2': point[4], 'mois': point[5], 'prix': d[0], 'pieces': point[6], 'jour': d[3]}
            ville.append(vente)
            matches = [q for q in quartiers if contient(q['geometrie'], point[1], point[0])]
            if len(matches) == 1:
                matches[0]['ventes'].append(vente)
            elif matches:
                ambigus += 1  # pas de double compte sur une limite partagée
            else:
                hors_contours += 1
    if not ville:
        raise ValueError('Aucune vente Dijon : arrêt, aucune page remplacée')
    meta = {**index, 'contours_source': contours['source'], 'contours_collecte_le': contours['collecte_le'],
            'empreinte_dvf_sha256': empreinte.hexdigest(), 'ventes_dijon': len(ville),
            'ventes_limite_ambigue': ambigus, 'ventes_hors_contours': hors_contours}
    return meta, ville, [q for q in quartiers if q['ventes']]


def stats(ventes):
    return {'ventes': len(ventes),
            'median_m2': statistics.median(v['prix_m2'] for v in ventes) if len(ventes) >= MINIMUM else None,
            'median_prix': statistics.median(v['prix'] for v in ventes) if len(ventes) >= MINIMUM else None}


def par_annee(ventes):
    return {str(an): {str(t): stats([v for v in ventes if v['mois'] // 100 == an and v['type'] == t])
                     for t in (0, 1)} for an in sorted({v['mois'] // 100 for v in ventes})}


def evolution(ancien, nouveau):
    if ancien and nouveau and ancien['median_m2'] is not None and nouveau['median_m2'] is not None:
        return (nouveau['median_m2'] / ancien['median_m2'] - 1) * 100
    return None


def url(q):
    return PILIER + q['slug'] + '/'


def bilan(ventes, an):
    s = stats([v for v in ventes if v['mois'] // 100 == an])
    return ('<div class="dq-stats">'
            f'<p><strong>{fr(s["median_m2"])}'+ (' €/m²' if s['median_m2'] is not None else '') + f'</strong><span>Prix médian au m² · {an}</span></p>'
            f'<p><strong>{fr(s["ventes"])}</strong><span>Ventes simples · {an}</span></p>'
            f'<p><strong>{fr(s["median_prix"])}'+ (' €' if s['median_prix'] is not None else '') + f'</strong><span>Prix de vente médian · {an}</span></p></div>')


def tableau(ventes, an):
    annuels = par_annee(ventes)
    rows = []
    for type_, label in ((0, 'Appartements'), (1, 'Maisons')):
        ancien = annuels.get(str(an - 1), {}).get(str(type_))
        actuel = annuels.get(str(an), {}).get(str(type_), stats([]))
        ev = evolution(ancien, actuel)
        euros = lambda d: fr(d['median_m2']) + (' €/m²' if d['median_m2'] is not None else '') if d else 'Échantillon insuffisant'
        variation = f'{ev:+.1f} %'.replace('.', ',') if ev is not None else 'Non calculable'
        rows.append(f'<tr><th scope="row">{label}</th><td>{fr(actuel["ventes"])}</td><td>{euros(ancien)}</td><td>{euros(actuel)}</td><td>{variation}</td></tr>')
    return (f'<div class="dq-scroll" role="region" aria-label="Prix et évolution par type de logement" tabindex="0"><table><caption>Médianes DVF en euros par m². Évolution {an - 1}–{an}, à type de logement séparé.</caption>'
            f'<thead><tr><th scope="col">Logement</th><th scope="col">Ventes {an}</th><th scope="col">Médiane {an - 1}</th><th scope="col">Médiane {an}</th><th scope="col">Évolution</th></tr></thead><tbody>{"".join(rows)}</tbody></table></div>'
            '<p class="dq-note">Une évolution de médiane compare deux ensembles de ventes différents. Elle ne mesure pas la variation du prix du même bien. Moins de cinq ventes dans une période : aucune médiane ni évolution publiée.</p>')


def cartes(quartiers, an, courant=None):
    cards = []
    for q in quartiers:
        if q['slug'] == courant:
            continue
        s = stats([v for v in q['ventes'] if v['mois'] // 100 == an])
        prix = fr(s['median_m2']) + (' €/m²' if s['median_m2'] is not None else '')
        cards.append(f'<article class="dq-card"><h3>{e(q["nom"])}</h3><p class="dq-price">{prix}</p><p>{s["ventes"]} ventes simples en {an} · appartements et maisons réunis</p><a href="{url(q)}">Voir les ventes et l’évolution <span aria-hidden="true">→</span></a></article>')
    return '<div class="dq-grid">' + ''.join(cards) + '</div>'


def methode(meta):
    return (f'<div class="dq-method"><p>Source : <a href="{SOURCE_DVF}">Demandes de valeurs foncières géolocalisées, DGFiP / Etalab</a>, Licence Ouverte 2.0. '
            f'Millésimes {min(meta["annees"])}–{max(meta["annees"])} ; dernière vente du département : {meta["derniere_vente"]}. Données préparées le {meta["genere_le"]}.</p>'
            '<ul><li>Ventes simples : un appartement ou une maison par mutation, avec dépendances éventuelles, sans local d’activité. Surface bâtie de 9 à 1 000 m² et prix au m² de 300 à 12 000 €, selon le filtre du jeu local.</li>'
            '<li>Le prix médian partage les ventes en deux groupes de même taille. Le prix au m² médian est la médiane des prix au m² de chaque vente, pas le prix total divisé par la surface totale. Les maisons sont rapportées à leur surface bâtie, sans le terrain.</li>'
            f'<li>Rattachement spatial aux <a href="{e(meta["contours_source"])}">neuf conseils de quartier de Dijon Métropole</a>, contours collectés le {meta["contours_collecte_le"]}. Seules les ventes dont la commune DVF est Dijon et le quartier non ambigu sont rattachées. Aucun quartier déduit d’un rayon ou du nom d’une rue.</li>'
            '<li>La base DVF est publiée avec retard. Ces chiffres décrivent la période indiquée, pas les prix d’aujourd’hui. L’état, l’étage, le DPE et les travaux ne sont pas détaillés ici : une visite reste nécessaire pour estimer votre logement.</li></ul></div>')


def cta():
    return (f'<section class="dq-cta" aria-labelledby="dq-estimation"><div><p class="dq-kicker">Votre bien mérite son propre avis de valeur</p><h2 id="dq-estimation">Passons du quartier à votre logement.</h2>'
            '<p>Je suis Shawez Ali, agent immobilier à Dijon chez GRAVELIN IMMO. Nous regardons les ventes comparables, l’état du bien et votre projet pour établir un prix argumenté.</p>'
            '<a class="dq-button" href="/estimer/">Demander mon estimation offerte →</a><p>Offerte et sans engagement · <a href="tel:+33767579228">07 67 57 92 28</a></p></div>'
            f'<img src="{PHOTO}" width="190" height="225" alt="Shawez Ali, agent immobilier à Dijon" loading="lazy"></section>')


def page(q, quartiers, meta, an, root=ROOT):
    from search_quartiers import passage, autres
    nom = q['nom']
    court = nom if len(nom) < 26 else nom.split(' - ')[0]
    court = {'Gresilles': 'Grésilles'}.get(court, court)
    title = f'{court} Dijon : prix DVF, estimation offerte'
    desc = f'Ventes DVF à {court}, Dijon : prix médian, nombre de ventes et évolution. Votre estimation offerte avec Shawez Ali, agent immobilier.'
    canon = SITE + url(q)
    dernier_mois = max(v['mois'] for v in q['ventes'])
    premier_mois = min(v['mois'] for v in q['ventes'])
    temporal = f'{premier_mois // 100}-{premier_mois % 100:02d}-01/{dernier_mois // 100}-{dernier_mois % 100:02d}-{calendar.monthrange(dernier_mois // 100, dernier_mois % 100)[1]}'
    exemples = sorted(q['ventes'], key=lambda v: (v['mois'], v['jour'], v['type'], v['surface'], v['prix']), reverse=True)[:8]
    lignes = ''.join(f'<tr><td>{v["mois"] % 100:02d}/{v["mois"] // 100}</td><td>{"Appartement" if v["type"] == 0 else "Maison"}</td><td>{fr(v["surface"])} m²</td><td>{fr(v["prix"])} €</td><td>{fr(v["prix_m2"])} €/m²</td></tr>' for v in exemples)
    faq = [('Comment estimer mon bien dans ce quartier ?', 'Les ventes signées donnent un repère. Shawez Ali compare ensuite votre logement à des biens proches, puis examine son état, ses caractéristiques et les travaux. Vous pouvez demander une estimation offerte et sans engagement.'),
           ('Les données DVF reflètent-elles les prix d’aujourd’hui ?', f'Non. La dernière vente publiée dans le jeu départemental date du {meta["derniere_vente"]}. Ces montants sont des prix signés publiés avec retard, pas un relevé des prix d’annonce en temps réel.')]
    graph = [
      {'@type': 'RealEstateAgent', '@id': SITE + '/#agent', 'name': 'Shawez Ali — Agent immobilier à Dijon', 'url': SITE + '/', 'telephone': '+33767579228', 'areaServed': {'@type': 'City', 'name': 'Dijon'}, 'image': SITE + PHOTO},
      {'@type': 'WebPage', '@id': canon + '#page', 'url': canon, 'name': title, 'description': desc, 'inLanguage': 'fr-FR', 'dateModified': max(meta['genere_le'], meta['contours_collecte_le']), 'about': {'@type': 'Place', 'name': nom + ', Dijon'}, 'mainEntity': {'@id': canon + '#donnees'}},
      {'@type': 'Dataset', '@id': canon + '#donnees', 'name': 'Ventes DVF — ' + nom + ', Dijon', 'description': 'Statistiques agrégées de ventes simples, sans adresse ni identité de client. Méthode et période visibles sur la page.', 'url': canon, 'license': 'https://www.etalab.gouv.fr/licence-ouverte-open-licence/', 'creator': {'@type': 'Organization', 'name': 'DGFiP / Etalab'}, 'isBasedOn': SOURCE_DVF, 'spatialCoverage': {'@type': 'Place', 'name': nom + ', Dijon'}, 'temporalCoverage': temporal, 'variableMeasured': ['Nombre de ventes', 'Prix médian au m²', 'Prix de vente médian']},
      {'@type': 'Service', 'name': 'Estimation immobilière à ' + nom + ', Dijon', 'serviceType': 'Estimation immobilière', 'provider': {'@id': SITE + '/#agent'}, 'areaServed': {'@type': 'Place', 'name': nom + ', Dijon'}, 'offers': {'@type': 'Offer', 'price': '0', 'priceCurrency': 'EUR', 'description': 'Estimation offerte et sans engagement', 'url': SITE + '/estimer/'}},
      {'@type': 'BreadcrumbList', 'itemListElement': [{'@type': 'ListItem', 'position': i + 1, 'name': n, 'item': u} for i, (n, u) in enumerate([('Accueil', SITE + '/'), ('Estimation immobilière Dijon', SITE + PILIER), (nom, canon)])]},
      {'@type': 'FAQPage', 'mainEntity': [{'@type': 'Question', 'name': question, 'acceptedAnswer': {'@type': 'Answer', 'text': reponse}} for question, reponse in faq]},
    ]
    ld = json.dumps({'@context': 'https://schema.org', '@graph': graph}, ensure_ascii=False).replace('</', '<\\/')
    contenu = f'''<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>{e(title)}</title><meta name="description" content="{e(desc)}"><meta name="robots" content="index,follow,max-image-preview:large">
<link rel="canonical" href="{canon}">{CSS}<link rel="icon" href="/favicon.ico">
<meta property="og:type" content="website"><meta property="og:locale" content="fr_FR"><meta property="og:title" content="{e(title)}"><meta property="og:description" content="{e(desc)}"><meta property="og:url" content="{canon}"><meta property="og:image" content="{SITE + PHOTO}">
<meta name="twitter:card" content="summary_large_image"><script type="application/ld+json">{ld}</script></head>
<body class="dq"><a class="dq-skip" href="#main">Aller au contenu</a>
<header class="dq-header"><div class="dq-shell"><a class="dq-brand" href="/">SHAWEZ ALI<small>Agent immobilier · Dijon</small></a><nav aria-label="Navigation principale"><a href="{PILIER}">Estimer à Dijon</a><a href="/biens-a-vendre-dijon/">Les biens</a><a href="/contact/">Contact</a></nav></div></header>
<main id="main" class="dq-shell"><ol class="dq-crumb" aria-label="Fil d’Ariane"><li><a href="/">Accueil</a> /</li><li><a href="{PILIER}">Estimation Dijon</a> /</li><li aria-current="page">{e(nom)}</li></ol>
<section class="dq-hero"><p class="dq-kicker">Dijon · Ventes signées · DVF {an}</p><h1>Estimation immobilière<br>{e(nom)}<br>à Dijon.</h1>
{passage(q, an)}
<div class="dq-actions"><a class="dq-button" href="/estimer/">Obtenir mon estimation offerte →</a><a href="#ventes">Voir les ventes DVF</a></div>{bilan(q['ventes'], an)}<p class="dq-note">Appartements et maisons réunis. Un repère de marché, à préciser selon votre bien. Dernière vente du jeu départemental : {meta['derniere_vente']}.</p></section>
<section class="dq-section" id="evolution"><p class="dq-kicker">Comparer ce qui est comparable</p><h2>Appartements et maisons : deux lectures du quartier.</h2>{tableau(q['ventes'], an)}</section>
<section class="dq-section" id="ventes"><p class="dq-kicker">Les ventes derrière les chiffres</p><h2>Des transactions signées, pas des prix d’annonce.</h2><div class="dq-scroll" role="region" aria-label="Exemples de ventes DVF" tabindex="0"><table><caption>Huit dernières ventes disponibles au plus, anonymisées et sans adresse. Prix signés tels que publiés dans DVF ; le détail des honoraires n’est pas connu.</caption><thead><tr><th scope="col">Mois</th><th scope="col">Type</th><th scope="col">Surface bâtie</th><th scope="col">Prix signé</th><th scope="col">Prix au m²</th></tr></thead><tbody>{lignes}</tbody></table></div></section>
<section class="dq-section" id="methode"><p class="dq-kicker">Sources et périmètre</p><h2>Des chiffres que vous pouvez vérifier.</h2><p>Source : DVF, ventes simples géolocalisées rattachées au conseil de quartier officiel. Dernière vente du jeu départemental : {meta['derniere_vente']}. <a href="{PILIER}#prix-reels">Méthode complète, filtres, source et limites</a>. Ces ventes ne sont pas un relevé des prix d’annonce.</p></section>
{cta()}<section class="dq-section"><h2>Vos questions sur l’estimation.</h2>{''.join(f'<h3>{e(a)}</h3><p>{e(b)}</p>' for a, b in faq)}</section>
<section class="dq-section"><p class="dq-kicker">Dijon, quartier par quartier</p><h2>Regardez aussi les autres quartiers.</h2><a href="{PILIER}#quartiers">Toute l’estimation immobilière à Dijon</a>{autres(quartiers, q['slug'])}</section></main>
<footer class="dq-shell dq-footer"><p>Shawez Ali · Agent immobilier · GRAVELIN IMMO · Dijon</p><nav aria-label="Pied de page"><a href="/honoraires/">Honoraires</a><a href="/mentions-legales/">Mentions légales</a><a href="/politique-de-confidentialite/">Confidentialité</a><a href="/plan-du-site/">Plan du site</a></nav></footer></body></html>
'''
    from search_reponses import appliquer, balisage
    return appliquer(contenu, url(q), root) if (Path(root) / 'avis.json').exists() else balisage(contenu, url(q))


def bloc(s, ident, contenu, avant='</main>'):
    debut, fin = f'<!-- {ident} -->', f'<!-- /{ident} -->'
    nouveau = debut + contenu + fin
    if debut in s:
        return re.sub(re.escape(debut) + '.*?' + re.escape(fin), lambda _: nouveau, s, count=1, flags=re.S)
    if avant not in s:
        raise ValueError(f'Point d’insertion absent : {avant}')
    return s.replace(avant, nouveau + '\n' + avant, 1)


def css(s):
    return s if CSS in s else s.replace('</head>', CSS + '\n</head>', 1)


def ecrire(path, contenu):
    path.parent.mkdir(parents=True, exist_ok=True)
    if not path.exists() or path.read_text() != contenu:
        path.write_text(contenu)


def mailler(root, quartiers, an):
    accueil = root / 'index.html'
    s = accueil.read_text()
    intro = ('<section class="shell dq dq-section"><p class="dq-kicker">Le marché réel, près de chez vous</p><h2>À Dijon, votre quartier fait la différence.</h2>'
             '<p>Prix médians, ventes signées et évolution : consultez les repères DVF de votre quartier avant de demander votre estimation offerte.</p>'
             f'<a class="dq-button" href="{PILIER}#quartiers">Voir les prix par quartier à Dijon →</a></section>')
    ecrire(accueil, bloc(css(s), 'dijon-quartiers-accueil', intro, '<!-- CE QUE VOUS AVEZ AVEC SHAWEZ'))
    plan = root / 'plan-du-site/index.html'
    if plan.exists():
        liens = ''.join(f'<li><a href="{url(q)}">{e(q["nom"])}</a></li>' for q in quartiers)
        ecrire(plan, bloc(plan.read_text(), 'dijon-quartiers-plan', '<section class="shell"><h2>Estimation et prix par quartier de Dijon</h2><ul>' + liens + '</ul></section>'))
    par_slug = {q['slug']: q for q in quartiers}
    for article, cible in ARTICLES.items():
        path = root / 'conseils-vendeurs' / article / 'index.html'
        if not path.exists():
            continue
        q = par_slug.get(cible)
        lien = f'<a href="{url(q)}">Les ventes DVF de {e(q["nom"])}</a> · ' if q else ''
        contenu = f'<nav class="shell dq dq-section" aria-label="Prix et estimation à Dijon"><h2>Du conseil aux ventes réelles.</h2><p>{lien}<a href="{PILIER}#quartiers">Prix et évolution dans tous les quartiers de Dijon</a></p><a class="dq-button" href="/estimer/">Demander mon estimation offerte</a></nav>'
        ecrire(path, bloc(css(path.read_text()), 'dijon-quartiers-article', contenu))
    from search_quartiers import secteurs
    secteurs(root, quartiers, an)
    # S’applique aussi aux fiches existantes ; le générateur reçoit le même lien pour les suivantes.
    for path in (root / 'biens').glob('*/index.html'):
        s = path.read_text()
        if re.search(r'<meta name="robots" content="[^"]*noindex', s):
            continue
        ld = re.search(r'<script type="application/ld\+json">(.*?)</script>', s, re.S)
        annonces = json.loads(ld[1]).get('@graph', []) if ld else []
        dijon = any(n.get('@type') == 'RealEstateListing' and n.get('about', {}).get('address', {}).get('addressLocality') == 'Dijon' for n in annonces)
        if dijon:
            ecrire(path, bloc(s, 'dijon-quartiers-fiche', lien_fiche()))
        elif '<!-- dijon-quartiers-fiche -->' in s:
            ecrire(path, re.sub(r'<!-- dijon-quartiers-fiche -->.*?<!-- /dijon-quartiers-fiche -->\n?', '', s, flags=re.S))


def lien_fiche():
    return ('<nav class="shell bf-sec" aria-label="Estimation à Dijon"><h2>Vous vendez aussi à Dijon ?</h2><p>'
            f'<a class="link" href="{PILIER}#quartiers">Consultez les prix DVF par quartier et demandez votre estimation offerte.</a></p></nav>')


def sitemap(root, quartiers, date):
    p = root / 'sitemap.xml'
    s = p.read_text()
    chemins = {PILIER, *(url(q) for q in quartiers)}
    modifies = {'/', '/plan-du-site/'} | {'/conseils-vendeurs/' + a + '/' for a in ARTICLES}
    modifies |= {'/' + str(p.relative_to(root)).replace('index.html', '') for p in (root / 'biens').glob('*/index.html') if '<!-- dijon-quartiers-fiche -->' in p.read_text()}
    for b in re.findall(r'\s*<url>.*?</url>', s, re.S):
        loc = re.search(r'<loc>(.*?)</loc>', b)
        if loc and (loc[1] == SITE + PILIER or loc[1].startswith(SITE + PILIER) and loc[1] != SITE + PILIER):
            s = s.replace(b, '')
        elif loc and loc[1].removeprefix(SITE) in modifies:
            nouveau = re.sub(r'<lastmod>.*?</lastmod>', '<lastmod>' + date + '</lastmod>', b)
            if '<lastmod>' not in nouveau:
                nouveau = nouveau.replace('</loc>', '</loc><lastmod>' + date + '</lastmod>')
            s = s.replace(b, nouveau)
    ajouts = ''.join(f'  <url><loc>{SITE + c}</loc><lastmod>{date}</lastmod></url>\n' for c in sorted(chemins))
    ecrire(p, s.replace('</urlset>', ajouts + '</urlset>'))


def construire(root=ROOT):
    meta, ville, quartiers = charger(root)
    # Dernier millésime publié entièrement couvert par la source locale, jamais l’année courante inventée.
    derniere_annee, dernier_mois = map(int, meta['derniere_vente'][:7].split('-'))
    complets = [a for a in meta['annees'] if a < derniere_annee or (a == derniere_annee and dernier_mois == 12)]
    if not complets:
        raise ValueError('Aucun millésime complet : comparaison annuelle impossible')
    an = max(complets)
    date = max(meta['genere_le'], meta['contours_collecte_le'])
    manifeste = {'source': SOURCE_DVF, 'methode_version': 1, 'annee_reference': an,
                 'donnees': {k: meta[k] for k in ('annees', 'derniere_vente', 'genere_le', 'empreinte_dvf_sha256', 'contours_source', 'contours_collecte_le', 'ventes_dijon', 'ventes_limite_ambigue', 'ventes_hors_contours')},
                 'quartiers': [{'nom': q['nom'], 'slug': q['slug'], 'url': url(q), 'par_annee': par_annee(q['ventes'])} for q in quartiers]}
    for q in quartiers:
        ecrire(root / url(q).strip('/') / 'index.html', page(q, quartiers, meta, an, root))
    # Ne conserver aucune ancienne page générée si le quartier n’a plus de ventes.
    valides = {q['slug'] for q in quartiers}
    for path in (root / PREFIXE).glob('*/index.html'):
        if path.parent.name not in valides and '<body class="dq">' in path.read_text():
            path.unlink()
    ecrire(root / 'donnees-dvf/quartiers-dijon.json', json.dumps(manifeste, ensure_ascii=False, indent=2) + '\n')
    pilier = root / PREFIXE / 'index.html'
    s = pilier.read_text()
    appartements = [v for v in ville if v['type'] == 0 and v['mois'] // 100 == an]
    maisons = [v for v in ville if v['type'] == 1 and v['mois'] // 100 == an]
    t3 = [v for v in appartements if v['pieces'] == 3]
    faq_dvf = [f'En {an}, le prix médian est de {fr(stats(appartements)["median_m2"])} €/m² sur {len(appartements)} ventes d’appartements, et de {fr(stats(maisons)["median_m2"])} €/m² sur {len(maisons)} ventes de maisons à Dijon. Source : DVF, ventes simples du jeu local.',
               f'En {an}, les appartements de trois pièces vendus à Dijon ont une surface médiane de {fr(statistics.median(v["surface"] for v in t3))} m² et un prix de vente médian de {fr(stats(t3)["median_prix"])} €, soit un prix au m² médian de {fr(stats(t3)["median_m2"])} €/m². Ces repères DVF ne remplacent pas une visite.']
    for question, reponse in zip(('Quel est le prix au m² à Dijon', 'Combien vaut un T3 à Dijon'), faq_dvf):
        s = re.sub(r'(<details><summary>' + re.escape(question) + r'.*?</summary><div class="a"><p>).*?(</p>)', lambda m: m[1] + e(reponse) + m[2], s, count=1, flags=re.S)
    contenu = (f'<section class="shell dq dq-section" id="prix-reels" aria-labelledby="dvf-t"><p class="dq-kicker">Dijon · DVF {an}</p><h2 id="dvf-t">Ce qui s’est réellement vendu à Dijon.</h2>'
               + bilan(ville, an) + tableau(ville, an) + f'<div id="quartiers"><p class="dq-kicker">Votre quartier, ses ventes, son évolution</p><h2>Une estimation immobilière ancrée dans chaque quartier de Dijon.</h2>'
               + cartes(quartiers, an) + '</div><p><a class="dq-button" href="/estimer/">Demander mon estimation offerte →</a></p>'
               + methode(meta) + '</section>')
    if '<!-- dijon-quartiers-pilier -->' in s:
        s = bloc(s, 'dijon-quartiers-pilier', contenu)
    else:
        s, nombre = re.subn(r'<section class="shell dvf" id="prix-reels".*?</section>', lambda _: '<!-- dijon-quartiers-pilier -->' + contenu + '<!-- /dijon-quartiers-pilier -->', s, count=1, flags=re.S)
        if nombre != 1:
            raise ValueError('Section DVF du pilier absente')
    # Conserver les entités existantes et déclarer les quartiers accessibles depuis le pilier.
    def ld(match):
        data = json.loads(match[1])
        graph = data['@graph']
        graph[:] = [n for n in graph if n.get('@id') != SITE + PILIER + '#quartiers']
        graph.append({'@type': 'ItemList', '@id': SITE + PILIER + '#quartiers', 'name': 'Estimation immobilière par quartier de Dijon',
                      'itemListElement': [{'@type': 'ListItem', 'position': i + 1, 'name': q['nom'], 'url': SITE + url(q)} for i, q in enumerate(quartiers)]})
        for n in graph:
            if n.get('@type') == 'WebPage':
                n['hasPart'] = [{'@id': SITE + url(q) + '#page'} for q in quartiers]
                n['dateModified'] = date
            if n.get('@type') == 'FAQPage':
                for question, reponse in zip(n['mainEntity'][:2], faq_dvf):
                    question['acceptedAnswer']['text'] = reponse
        return '<script type="application/ld+json">' + json.dumps(data, ensure_ascii=False).replace('</', '<\\/') + '</script>'
    s = re.sub(r'<script type="application/ld\+json">(.*?)</script>', ld, s, count=1, flags=re.S)
    from search_reponses import appliquer
    ecrire(pilier, appliquer(css(s), PILIER, root) if (root / 'avis.json').exists() else css(s))
    mailler(root, quartiers, an)
    sitemap(root, quartiers, date)
    if (root / 'prix-immobilier-dijon/index.html').exists():
        from search_prix import construire as prix_dijon
        prix_dijon(root)
    return manifeste


if __name__ == '__main__':
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--racine', type=Path, default=ROOT)
    args = ap.parse_args()
    m = construire(args.racine)
    print(f'{len(m["quartiers"])} quartiers · {m["donnees"]["ventes_dijon"]} ventes Dijon · référence {m["annee_reference"]}')

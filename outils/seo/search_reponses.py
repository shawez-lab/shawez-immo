"""Réponses éditoriales vérifiables, partagées par les constructeurs du site.

Les faits absents restent dans SUIVI-SEARCH, jamais remplacés par une promesse.
"""
import html
import json
import re
from functools import lru_cache
from pathlib import Path

NOM = 'Shawez Ali, agent immobilier chez GRAVELIN IMMO à Dijon'
MANDAT = ('Je prends uniquement des mandats exclusifs en vente. Votre bien garde un seul prix affiché, '
          'une présentation cohérente et un seul responsable pour les photos, le film, la diffusion et le suivi. '
          'Vous avez un seul interlocuteur et un point écrit chaque semaine.')
DELAI = ('Il faut habituellement compter environ trois mois entre le compromis et l’acte authentique, '
         'selon le financement, les conditions suspensives et la préparation du dossier ; ce n’est pas un délai légal fixe. '
         'Le temps nécessaire pour trouver l’acheteur dépend du bien et du prix de départ.')
FIABILITE = ('Une estimation en ligne donne une fourchette indicative à partir des ventes DVF autour de l’adresse. '
             'Elle ne voit pas directement l’état, la lumière, la vue, les travaux ni les charges de copropriété ; '
             'une visite permet de préciser l’avis de valeur.')
LANGUES = ['fr', 'en', 'hi', 'ur', 'pa', 'fa', 'el', 'ar']
MAP = 'https://www.google.com/maps/search/?api=1&query=Shawez%20Ali&query_place_id=ChIJqQpGAKPcg6gRg_CLthoGaP8'
SITE = 'https://shawez-immo.com'
TITRES = {
    '/vendre-bien-immobilier-dijon/': ('Vendre sa maison ou son appartement à Dijon | Shawez Ali', 'Vendre votre maison ou votre appartement à Dijon, au bon prix'),
    '/vendre-commerce-dijon/': ('Vendre un fonds de commerce à Dijon, en toute discrétion | Shawez Ali', 'Vendre votre fonds de commerce à Dijon, au bon prix et en toute discrétion'),
}


@lru_cache(maxsize=4)
def donnees(root):
    from search_prix import reference
    return reference(Path(root))


@lru_cache(maxsize=4)
def reponses(root):
    from dijon_quartiers import fr, stats
    from search_prix import reponse
    meta, ville, quartiers, an = donnees(str(Path(root).resolve()))
    ap, ma = [stats([v for v in ville if v['type'] == t and v['mois'] // 100 == an]) for t in (0, 1)]
    note = json.loads((Path(root) / 'avis.json').read_text())['fiche']
    score = str(note['note']).replace('.', ',')
    preuve = (f'La fiche Google de Shawez Ali affiche {score}/5 sur {note["nombre"]} avis au relevé du '
              f'{note["releve_le"]} ; ce relevé daté ne donne pas le nombre d’avis d’aujourd’hui.')
    tous = stats([v for v in ville if v['mois'] // 100 == an])
    prix_ap = f'{fr(ap["median_m2"])} €/m² sur {ap["ventes"]} ventes d’appartements'
    prix_ma = f'{fr(ma["median_m2"])} €/m² sur {ma["ventes"]} ventes de maisons'
    mont = next(q for q in quartiers if q['slug'] == 'montchapet')
    sm = stats([v for v in mont['ventes'] if v['mois'] // 100 == an])
    centre = next(q for q in quartiers if q['slug'] == 'centre-ville')
    sc = stats([v for v in centre['ventes'] if v['mois'] // 100 == an and v['type'] == 0])
    choix = ('Pour choisir, comparez l’avis de valeur écrit, les moyens de présentation et le suivi proposé. '
             f'{NOM}, vous reçoit à l’agence, 30 rue Bannelier, et accompagne Dijon, sa métropole et Beaune : estimation offerte, photos, film, drone pour les maisons et propriétés et point écrit chaque semaine ; il parle français, anglais, hindi, ourdou, pendjabi, persan, grec et arabe. ' + preuve)
    return {
      '/conseils-vendeurs/choisir-agent-immobilier-dijon/': [
        ('Meilleur agent immobilier à Dijon', choix),
        ('Quelle agence immobilière choisir pour vendre à Dijon ?',
         'Comparez des engagements concrets : estimation écrite, présentation du bien et retours sur les visites. '
         f'{NOM}, vous accompagne avec un seul interlocuteur, les moyens de l’agence et une estimation offerte.')],
      '/agent-immobilier-dijon/': [('Choisir un agent immobilier à Dijon', choix)],
      '/avis/': [('Agent immobilier à Dijon : les avis', preuve + f' Les avis de {NOM} se lisent dans leur texte réel sur sa fiche Google.')],
      '/estimation-immobiliere-dijon/': [
        ('Estimation immobilière à Dijon', f'À Dijon, la médiane des ventes simples DVF de {an} est de {fr(tous["median_m2"])} €/m², appartements et maisons réunis ; les deux types séparés donnent {prix_ap} et {prix_ma}. {NOM}, part de ces ventes et visite votre bien pour vous remettre un avis de valeur écrit, offert et sans engagement.'),
        ('Estimation d’une maison à Dijon', f'L’estimation d’une maison à Dijon est offerte et sans engagement. {NOM}, visite la maison, examine le terrain, les travaux et le DPE puis remet un avis de valeur écrit ; le repère DVF communal de {an} est de {prix_ma}.'),
        ('Combien vaut mon appartement à Dijon ?', f'Le repère communal est de {prix_ap} en {an}, et le prix de votre appartement dépend de son état, de l’étage, de la lumière et de la copropriété. {NOM}, compare les ventes proches et les caractéristiques du logement dans un avis de valeur écrit offert.'),
        ('Une estimation immobilière en ligne est-elle fiable ?', FIABILITE + f' {NOM}, propose cette visite offerte et sans engagement.')],
      '/prix-immobilier-dijon/': [('Prix au m² à Dijon en 2026', reponse(ville, an))],
      '/vendre-bien-immobilier-dijon/': [
        ('Vendre sa maison rapidement à Dijon', 'Un prix argumenté par les ventes réelles, un dossier préparé et une présentation claire sont les leviers pour vendre. ' + f'{NOM}, réalise l’estimation offerte, organise les photos et le film, puis suit les visites et la négociation sans promettre un délai de recherche d’acheteur.'),
        ('Combien de temps pour vendre une maison à Dijon ?', DELAI + f' {NOM}, suit le dossier jusqu’à la signature chez le notaire.')],
      '/honoraires/': [('Honoraires d’agence immobilière à Dijon', 'Pour la vente, le barème publié va de 5,5 % à 7 % TTC selon la tranche, avec un forfait de 4 500 € sous 70 000 € et un forfait distinct pour un garage ou une cave. ' + f'{NOM}, applique le barème de l’agence ; les honoraires de vente ne sont dus que si la vente se réalise.')],
      '/conseils-vendeurs/mandat-exclusif-ou-mandat-simple/': [('Mandat exclusif ou mandat simple ?', f'{NOM}, prend uniquement des mandats exclusifs en vente. Cela permet un seul prix, une présentation cohérente, un interlocuteur et un point écrit chaque semaine ; un mandat simple permet de confier la vente à plusieurs agences.')],
      '/agent-immobilier-beaune/': [('Agent immobilier à Beaune', f'L’estimation et la vente à Beaune sont proposées par {NOM}, avec les moyens de l’agence pour les photos, le film et le suivi. L’estimation est offerte et sans engagement ; la page distingue les exemples de présentation des références de ventes conclues.')],
      '/vendre-commerce-dijon/': [('Vendre un fonds de commerce à Dijon', f'La cession se prépare avec le bail, les comptes et les éléments de l’activité, dans le respect de la confidentialité. {NOM}, étudie le dossier et présente l’affaire aux repreneurs ; les conditions d’honoraires doivent être précisées avant tout engagement.')],
      '/chateau-a-vendre-bourgogne/': [('Vendre une propriété de prestige en Côte-d’Or', f'L’estimation d’une propriété est offerte et tient compte des ventes comparables, de l’état, du terrain et des dépendances. {NOM}, organise la présentation par photos, film et drone, avec une diffusion discrète si vous la demandez.')],
      '/estimation-immobiliere-dijon/montchapet/': [('Prix immobilier à Montchapet, Dijon', f'À Montchapet, dans le périmètre officiel du conseil de quartier, la médiane DVF de {an} est de {fr(sm["median_m2"])} €/m² sur {sm["ventes"]} ventes, appartements et maisons réunis. {NOM}, s’appuie sur les ventes et les caractéristiques de votre logement pour une estimation offerte.')],
      '/estimation-immobiliere-dijon/centre-ville/': [('Vendre un appartement dans le centre-ville de Dijon', f'Dans le conseil de quartier Centre-Ville, la médiane des appartements vendus en {an} est de {fr(sc["median_m2"])} €/m² sur {sc["ventes"]} ventes simples. {NOM}, examine l’étage, l’ascenseur, la lumière, les charges et les travaux votés avant l’estimation et la présentation du bien.')],
    }


def bloc_reponses(s, chemin, root):
    s = re.sub(r'<!-- search-reponses -->.*?<!-- /search-reponses -->', '', s, flags=re.S)
    items = reponses(root).get(chemin, [])
    if not items:
        return s
    contenu = '<!-- search-reponses --><div class="search-reponses">' + ''.join(
        f'<div class="search-reponse"><p class="label">{html.escape(q)}</p><p>{html.escape(a)}</p></div>' for q, a in items
    ) + '</div><!-- /search-reponses -->'
    if '/assets/search-reponses.css' not in s:
        s = s.replace('</head>', '<link rel="stylesheet" href="/assets/search-reponses.css"></head>', 1)
    return re.sub(r'(<h1\b[^>]*>.*?</h1>)', lambda m: m[1] + contenu, s, count=1, flags=re.S)


def balisage(s, chemin=''):
    from search_finitions import CYLEX, PRESTIGE
    def fix(match):
        data = json.loads(match[1])
        original = json.dumps(data, ensure_ascii=False)
        graph = data.get('@graph', [data])
        for n in graph:
            ident = n.get('@id', '')
            if ident == SITE + '/#agent':
                n['name'] = 'Shawez Ali'
                n['alternateName'] = 'Shawez Ali Immobilier'
            if ident in (SITE + '/#agent', SITE + '/#shawez'):
                n['name'] = 'Shawez Ali'
                n['knowsLanguage'] = LANGUES
                for c in n.get('contactPoint', []) if isinstance(n.get('contactPoint'), list) else [n.get('contactPoint', {})]:
                    if c:
                        c['availableLanguage'] = LANGUES
                if n.get('hasMap'):
                    n['hasMap'] = MAP
                if n.get('sameAs'):
                    n['sameAs'] = list(dict.fromkeys(MAP if 'query_place_id=ChIJqQpGAKPcg6gRg_CLthoGaP8' in u else u for u in n['sameAs'] if '@gravelinimmo' not in u))
                n['sameAs'] = list(dict.fromkeys(n.get('sameAs', []) + [CYLEX]))
            if ident == SITE + '/#gravelin':
                n.pop('openingHoursSpecification', None)
                n.pop('openingHours', None)
            if n.get('@type') == 'WebPage':
                if chemin == '/chateau-a-vendre-bourgogne/':
                    n['name'] = PRESTIGE
                if chemin in TITRES:
                    n['name'] = TITRES[chemin][0]
                about = n.get('about', [])
                about = about if isinstance(about, list) else [about]
                if not any(a.get('@id') == SITE + '/#agent' for a in about if isinstance(a, dict)):
                    about.append({'@id': SITE + '/#agent'})
                n['about'] = about[0] if len(about) == 1 else about
            if n.get('@type') == 'FAQPage':
                for q in n.get('mainEntity', []):
                    if 'Mandat exclusif ou mandat simple' in q.get('name', ''):
                        q['acceptedAnswer']['text'] = MANDAT
        if chemin == '/contact/' and not any(n.get('@id') == SITE + '/#agent' for n in graph):
            graph.append({'@type': 'RealEstateAgent', '@id': SITE + '/#agent', 'name': 'Shawez Ali',
                          'alternateName': 'Shawez Ali Immobilier', 'url': SITE + '/', 'telephone': '+33767579228',
                          'email': 'shawez@gravelin-immo.com', 'image': SITE + '/assets/shawez-ali-portrait-veste-verte.webp',
                          'address': {'@type': 'PostalAddress', 'streetAddress': '30 rue Bannelier', 'postalCode': '21000', 'addressLocality': 'Dijon', 'addressCountry': 'FR'},
                          'parentOrganization': {'@id': SITE + '/#gravelin'}, 'founder': {'@id': SITE + '/#shawez'},
                          'knowsLanguage': LANGUES, 'hasMap': MAP, 'sameAs': [MAP]})
        # Ne pas reformater les blocs inchangés, notamment les VideoObject.
        if json.dumps(data, ensure_ascii=False) == original:
            return match[0]
        return '<script type="application/ld+json">' + json.dumps(data, ensure_ascii=False).replace('</', '<\\/') + '</script>'
    return re.sub(r'<script type="application/ld\+json">(.*?)</script>', fix, s, flags=re.S)


def appliquer(s, chemin, root):
    from search_finitions import appliquer as finitions
    s = finitions(s, chemin)
    s = s.replace('Neuilly-lès-Dijon', 'Neuilly-Crimolois').replace('/prix-immobilier-neuilly-les-dijon/', '/prix-immobilier-neuilly-crimolois/')
    if chemin in TITRES:
        titre, h1 = TITRES[chemin]
        s = re.sub(r'<title>.*?</title>', lambda _: '<title>' + html.escape(titre) + '</title>', s, count=1, flags=re.S)
        s = re.sub(r'(<h1\b[^>]*>).*?(</h1>)', lambda m: m[1] + html.escape(h1) + m[2], s, count=1, flags=re.S)
        for attr in ('property="og:title"', 'name="twitter:title"'):
            s = re.sub(r'(<meta ' + attr + r' content=")[^"]*(")', lambda m: m[1] + html.escape(titre, quote=True) + m[2], s)
    s = re.sub(r'<!-- search-prix-intro -->.*?<!-- /search-prix-intro -->', '', s, flags=re.S)
    s = s.replace('Le mandat</strong>, simple ou exclusif : je vous explique les deux, vous choisissez.', 'Le mandat exclusif</strong> : je prends uniquement des mandats exclusifs en vente, pour un seul prix et un suivi cohérent.')
    s = balisage(s, chemin)
    if 'Mandat exclusif ou mandat simple' in s:
        s = re.sub(r'(<details><summary>Mandat exclusif ou mandat simple.*?</summary><div class="a"><p>).*?(</p>)', lambda m: m[1] + MANDAT + m[2], s, flags=re.S)
    s = questions(s, chemin, root)
    if chemin == '/immobilier-fontaine-les-dijon/':
        from search_local import EXEMPLES
        contenu = '<!-- search-dossier-local --><section class="shell sec-mid"><h2>Un dossier cité à Fontaine-lès-Dijon</h2><p>' + EXEMPLES['Fontaine-lès-Dijon'] + ' <a href="/secteurs-dijon-nuits-saint-georges-beaune/">Voir la page Secteurs</a>.</p></section><!-- /search-dossier-local -->'
        if '<!-- search-dossier-local -->' in s:
            s = re.sub(r'<!-- search-dossier-local -->.*?<!-- /search-dossier-local -->', lambda _: contenu, s, flags=re.S)
        else:
            s = s.replace('</main>', contenu + '</main>', 1)
    s = liens(s, chemin)
    return bloc_reponses(s, chemin, root)


def questions(s, chemin, root):
    ajouts = []
    if chemin == '/estimation-immobiliere-dijon/':
        rep = reponses(root)[chemin]
        ajouts = [('Faire estimer sa maison à Dijon, ça coûte combien ?', rep[1][1]),
                  ('Une estimation en ligne est-elle fiable ?', rep[3][1])]
    elif chemin == '/vendre-bien-immobilier-dijon/':
        from search_finitions import HONORAIRES
        ajouts = [('Mandat exclusif ou mandat simple ?', MANDAT), ('Combien de temps prend une vente ?', DELAI), ('Combien coûtent les honoraires ?', HONORAIRES)]
    elif chemin == '/vendre-commerce-dijon/':
        ajouts = [('Combien de temps pour vendre un fonds de commerce à Dijon ?', 'Le délai dépend du dossier, de l’activité et du projet du repreneur. Il est étudié avant la mise en vente, sans promesse de durée chiffrée.'),
                  ('Quels documents préparer ?', 'Préparez le bail commercial, les comptes, l’inventaire et les informations sur l’activité déjà disponibles. Le dossier précis est vérifié avec vous avant sa présentation aux repreneurs.'),
                  ('Combien coûtent vos honoraires pour un fonds ?', 'Les conditions d’honoraires de la cession sont à préciser avant tout engagement. Le barème résidentiel du site ne permet pas de conclure au tarif applicable à votre fonds.')]
    elif chemin == '/conseils-vendeurs/choisir-agent-immobilier-dijon/':
        ajouts = [('Qui est le meilleur agent immobilier à Dijon ?', reponses(root)[chemin][0][1])]
    if not ajouts:
        return s
    for q, a in ajouts:
        motif = r'<details><summary>' + re.escape(html.escape(q)) + r'</summary>.*?</details>'
        lien = ' <a class="link" href="/honoraires/">Consulter le barème complet</a>.' if q == 'Combien coûtent les honoraires ?' else ''
        bloc = '<details><summary>' + html.escape(q) + '</summary><div class="a"><p>' + html.escape(a) + lien + '</p></div></details>'
        if re.search(motif, s, re.S):
            s = re.sub(motif, lambda _: bloc, s, count=1, flags=re.S)
        else:
            # Insérer dans la FAQ existante, ou un bloc distinct avant la fin du main.
            faq = re.search(r'<div class="faq"[^>]*>', s)
            if faq:
                s = s[:faq.end()] + bloc + s[faq.end():]
            else:
                s = s.replace('</main>', '<section class="shell"><h2>Questions fréquentes</h2><div class="faq">' + bloc + '</div></section></main>', 1)
    def ld(m):
        data = json.loads(m[1])
        graph = data.get('@graph', [data])
        faq = next((n for n in graph if n.get('@type') == 'FAQPage'), None)
        if faq is None:
            faq = {'@type': 'FAQPage', '@id': SITE + chemin + '#faq', 'mainEntity': []}
            graph.append(faq)
        for q, a in ajouts:
            courant = next((n for n in faq['mainEntity'] if n.get('name') == q), None)
            if courant:
                courant['acceptedAnswer']['text'] = a
            else:
                faq['mainEntity'].append({'@type': 'Question', 'name': q, 'acceptedAnswer': {'@type': 'Answer', 'text': a}})
        return '<script type="application/ld+json">' + json.dumps(data, ensure_ascii=False).replace('</', '<\\/') + '</script>'
    return re.sub(r'<script type="application/ld\+json">(.*?)</script>', ld, s, count=1, flags=re.S)


def liens(s, chemin):
    cibles = {
        '/': [('Choisir un agent immobilier à Dijon', '/conseils-vendeurs/choisir-agent-immobilier-dijon/')],
        '/agent-immobilier-dijon/': [('Choisir un agent immobilier à Dijon', '/conseils-vendeurs/choisir-agent-immobilier-dijon/')],
        '/avis/': [('Choisir un agent immobilier à Dijon', '/conseils-vendeurs/choisir-agent-immobilier-dijon/')],
        '/vendre-bien-immobilier-dijon/': [('Vendre sa maison à Dijon', '/vendre-maison-dijon/'), ('Vendre son appartement à Dijon', '/vendre-appartement-dijon/'), ('Vendre un immeuble à Dijon', '/vendre-immeuble-dijon/'), ('Pourquoi le mandat exclusif ?', '/conseils-vendeurs/mandat-exclusif-ou-mandat-simple/')],
        '/immobilier-professionnel-dijon/': [('Vendre un immeuble à Dijon', '/vendre-immeuble-dijon/')],
    }
    if chemin not in cibles:
        return s
    bloc = '<!-- search-liens --><nav class="shell sec-mid" aria-label="Conseils et services"><h2>Pour votre projet</h2><ul>' + ''.join('<li><a class="link" href="' + u + '">' + html.escape(n) + '</a></li>' for n, u in cibles[chemin]) + '</ul></nav><!-- /search-liens -->'
    if '<!-- search-liens -->' in s:
        return re.sub(r'<!-- search-liens -->.*?<!-- /search-liens -->', lambda _: bloc, s, flags=re.S)
    return s.replace('</main>', bloc + '</main>', 1)


def tout(root):
    root = Path(root)
    n = 0
    for p in root.rglob('*.html'):
        rel = p.relative_to(root)
        if rel.parts[0] in ('outils', 'de-claude', 'admin', 'mon-espace', '.git', 'node_modules'):
            continue
        chemin = '/' + str(rel).removesuffix('index.html')
        s = p.read_text()
        t = appliquer(s, chemin, root)
        if t != s:
            p.write_text(t)
            n += 1
    return n

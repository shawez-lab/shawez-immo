"""Une seule référence DVF pour Dijon, calculée depuis le jeu local."""
import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path


def reference(root):
    from dijon_quartiers import charger, stats
    meta, ville, quartiers = charger(Path(root))
    an, mois = map(int, meta['derniere_vente'][:7].split('-'))
    an = max(a for a in meta['annees'] if a < an or mois == 12)
    return meta, ville, quartiers, an


def reponse(ville, an):
    from dijon_quartiers import stats, fr
    prix = [fr(stats([v for v in ville if v['type'] == t and v['mois'] // 100 == an])['median_m2']) for t in (0, 1)]
    return (f'En 2026, le dernier repère annuel complet de notre jeu DVF est celui des ventes de {an} : '
            f'{prix[0]} €/m² pour un appartement et {prix[1]} €/m² pour une maison dans la commune de Dijon. '
            'Notre jeu local ne contient pas encore de ventes de 2026 ; il ne permet pas d’en donner un prix annuel. '
            'Shawez Ali, agent immobilier chez GRAVELIN IMMO à Dijon, utilise ces ventes comme repère pour votre avis de valeur.')


def spec(root):
    from dijon_quartiers import stats, fr, tableau, cartes, methode, e, url
    meta, ville, quartiers, an = reference(root)
    centre = next(q for q in quartiers if q['slug'] == 'centre-ville')
    s = stats([v for v in centre['ventes'] if v['type'] == 0 and v['mois'] // 100 == an])
    eligibles = [(stats([v for v in q['ventes'] if v['type'] == 0 and v['mois'] // 100 == an]), q) for q in quartiers]
    smax, qmax = max(((s, q) for s, q in eligibles if s['median_m2'] is not None), key=lambda x: x[0]['median_m2'])
    return dict(
        id='prix-dijon', path='/prix-immobilier-dijon/', date='2026-11-18', date_fr='18 novembre 2026',
        title='Prix immobilier à Dijon en 2026 : les repères DVF',
        description='Prix médians DVF dans la commune de Dijon, appartements et maisons, ventes par quartier et évolution. Dernier millésime complet et limites du calcul.',
        label='Prix immobilier à Dijon', h1='Prix immobilier à Dijon en 2026 : <em>les ventes comme repère.</em>',
        h1_plain='Prix immobilier à Dijon en 2026 : les ventes comme repère', lede=reponse(ville, an),
        image='/assets/dijon-eglise-saint-michel.webp', image_alt='L’église Saint-Michel à Dijon',
        crumbs=[('Prix immobilier à Dijon', '/prix-immobilier-dijon/')],
        intro='Ces médianes proviennent uniquement des ventes simples du jeu DVF local. Une médiane partage les ventes en deux groupes de même taille ; elle ne remplace pas l’avis de valeur de votre logement.',
        sections=[
            ('le-repere-a-l-echelle-de-la-ville', f'Commune de Dijon : appartements et maisons en {an}', tableau(ville, an)),
            ('secteur-par-secteur', f'Les neuf quartiers de Dijon : médianes {an}',
             '<p>Les quartiers suivent les contours des conseils de quartier officiels. Chaque carte réunit appartements et maisons ; les pages détaillées séparent les deux types.</p>' + cartes(quartiers, an)),
            ('ce-qui-fait-varier-le-prix', 'Ce qui fait varier le prix de votre bien',
             '<p>Étage, ascenseur, lumière, extérieur, stationnement, état, travaux et DPE modifient la comparaison. En copropriété, les charges et les travaux votés comptent aussi ; pour une maison, il faut examiner le terrain.</p>'),
            ('methode', 'Sources et limites du calcul', methode(meta)),
            ('votre-prix-a-vous', 'Un avis de valeur pour votre maison ou votre appartement',
             '<p>Shawez Ali, agent immobilier chez GRAVELIN IMMO, compare les ventes réelles et les caractéristiques de votre bien. <a href="/estimer/">Demandez votre estimation offerte et sans engagement</a>.</p>')],
        faq=[('Quel est le prix au m² à Dijon en 2026 ?', reponse(ville, an)),
             ('Quel est le prix d’un appartement dans le centre de Dijon ?',
              f'Dans le quartier officiel Centre-Ville, la médiane des appartements est de {fr(s["median_m2"])} €/m² sur {s["ventes"]} ventes simples en {an}. Ce périmètre est celui du conseil de quartier, sans rayon autour du centre.'),
             ('Quel est le quartier le plus cher de Dijon ?',
              f'Pour les appartements vendus en {an}, {qmax["nom"]} a la médiane la plus élevée des neuf quartiers : {fr(smax["median_m2"])} €/m² sur {smax["ventes"]} ventes simples. Cette comparaison de médianes ne classe pas la qualité des quartiers et dépend des biens vendus.'),
             ('Les prix baissent-ils à Dijon ?', 'Le tableau distingue appartements et maisons et compare les médianes annuelles sur le même périmètre communal. Des biens différents se vendent chaque année : cette évolution n’est pas un indice à bien constant.')],
        links=[('Estimation immobilière à Dijon', '/estimation-immobiliere-dijon/'), ('Choisir un agent immobilier', '/conseils-vendeurs/choisir-agent-immobilier-dijon/')])


def construire(root):
    root = Path(root)
    with tempfile.TemporaryDirectory() as tmp:
        p = Path(tmp) / 'prix.json'
        p.write_text(json.dumps([spec(root)], ensure_ascii=False))
        subprocess.run([sys.executable, str(root / 'outils/seo/gen_pages.py'), str(root), str(p)], check=True)

    article = root / 'conseils-vendeurs/prix-affiche-prix-signe-dijon/index.html'
    if article.exists():
        meta, ville, quartiers, an = reference(root)
        texte = '<p>Pour donner un repère à l’échelle de la ville : ' + reponse(ville, an) + '</p>'
        contenu = re.sub(r'<p>Pour donner un repère à l[’\']échelle de la ville.*?</p>', lambda _: texte, article.read_text(), count=1, flags=re.S)
        article.write_text(contenu)

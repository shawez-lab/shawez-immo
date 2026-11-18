"""Textes propres aux neuf quartiers : DVF et guides déjà publiés, sans extrapolation."""
import html
import re
import statistics

# Chaque entrée conserve le guide d’où viennent ses seuls repères locaux.
GUIDES = {
 'centre-ville': ('centre-ville-dijon-distribution-copropriete-appartement',
   'Dans le Centre-Ville, la diversité des maisons anciennes et des hôtels particuliers appelle une lecture du plan de chaque appartement. Une pièce traversée pour en atteindre une autre ne se décrit pas comme une pièce indépendante ; une cave ou une annexe à un autre étage doit être présentée séparément.',
   'Avant les photos et le film, je prépare un parcours lisible entre l’entrée, les pièces de vie et les chambres. Les charges, les travaux votés et les documents de copropriété complètent ce que les images montrent. La distribution réelle compte davantage qu’une possibilité de transformation non vérifiée.'),
 'montchapet': ('montchapet-marmuzots-estimation-maison-differences',
   'Montchapet réunit des histoires de construction différentes : le guide distingue Jouvence, marqué par le développement industriel, des villas et immeubles autour de Victor-Hugo. Le parcours des Marmuzots vers le parc des Carrières-Bacquin fournit un autre repère, sans placer toutes les propriétés au bord du parc.',
   'Pour comparer deux maisons, je regarde la distribution, les extensions, le jardin et les accès, avant de comparer les surfaces. Un accès latéral ou une dépendance ne joue pas le même rôle dans chaque projet. Un plan et les documents de travaux permettent d’expliquer ce qui distingue votre maison sans attribuer une valeur automatique au nom d’une rue.'),
 'gresilles': ('gresilles-dijon-dossier-immeuble-vendre-logement',
   'Le guide des Grésilles revient sur les logements construits après-guerre, les réhabilitations engagées à partir des années 1980 et le renouvellement urbain des années 2000. Cette histoire situe le quartier ; elle ne prouve pas qu’un immeuble donné a bénéficié de tous ces travaux.',
   'Pour une vente, je repars de la chronologie du bâtiment : interventions sur les parties communes, équipements remplacés et travaux propres au logement. Les factures et les comptes rendus d’assemblée permettent de distinguer les réalisations des projets encore discutés. Depuis les fenêtres, les photographies doivent montrer la vue réelle et la relation avec les espaces extérieurs.'),
 'universite': ('universite-dijon-vendre-maison-appartement-usages',
   'Université ne se résume pas aux studios proches du campus. Le guide distingue l’histoire ferroviaire de Porte-Neuve, les logements de Mirande et de Montmuzard, puis le développement autour du campus et de l’hôpital du Bocage. Ces pôles n’impliquent pas le même bâtiment ni le même usage pour chaque logement.',
   'Je décris d’abord les pièces indépendantes, les circulations, les rangements et les annexes. La proximité d’un équipement ne suffit pas à promettre un locataire ou un rendement, et un passé industriel ne se déduit pas d’une grande fenêtre. Si le logement est occupé, son dossier et les conditions de présentation doivent rester clairs avant la visite.'),
 'chevreul-parc': ('chevreul-parc-jardin-balcon-cour-vendre-dijon',
   'Chevreul - Parc associe notamment les Allées du Parc et la Colombière, le Petit-Cîteaux et le Jardin des Maraîchers. Le guide montre pourquoi ces repères n’annoncent pas un seul modèle de logement : une demeure avec jardin, une cour et un appartement avec balcon posent des questions différentes.',
   'Je distingue l’environnement du quartier de l’extérieur réellement vendu. Depuis quelle pièce rejoint-on le jardin, faut-il descendre un escalier, où se situe la terrasse ? Un plan des accès et des photographies prises depuis le logement donnent une réponse concrète. La lumière et les dimensions se montrent dans le bien ; la proximité d’un parc ne les remplace pas.'),
 'maladiere-drapeau-clemenceau': ('maladiere-drapeau-clemenceau-trois-histoires-vendre',
   'Maladière - Drapeau - Clemenceau regroupe plusieurs trajectoires. Le guide décrit les pavillons et équipements de la Maladière, l’histoire des casernes et reconversions du Drapeau, dont Junot, et les transports puis les nouvelles constructions de Clemenceau. Un intitulé commun ne rend pas ces bâtiments interchangeables.',
   'Pour une maison transformée, je rapproche le plan actuel des extensions, des dépendances et des documents disponibles. Pour un logement dans un site reconverti, l’histoire annoncée doit être documentée. En appartement, la position dans le bâtiment, les ouvertures et les espaces extérieurs permettent ensuite de comprendre les caractéristiques propres au bien.'),
 'bourroches-port-du-canal-valendons-montagne-sainte-anne': ('bourroches-port-canal-valendons-montagne-sainte-anne-vendre',
   'Le Port du Canal, les Bourroches, les Valendons et la Montagne Sainte-Anne ne se présentent pas comme un seul décor. Le guide relie le canal à l’histoire portuaire, les Bourroches aux transports et aux logements des salariés, et les deux derniers secteurs au développement résidentiel après 1950.',
   'Pour une annonce proche de l’eau, je précise si le canal se voit depuis le séjour, depuis une chambre, ou s’il constitue une promenade à rejoindre. Une maison demande aussi de montrer la parcelle et ses accès ; pour un appartement, le parcours depuis l’entrée et la relation aux annexes sont essentiels. Le film doit relier ces espaces plutôt que juxtaposer des images du quartier.'),
 'varennes-toison-d-or-joffre': ('varennes-toison-or-joffre-dijon-localisation-vendre',
   'Varennes - Toison d’Or - Joffre réunit des générations de logements différentes : les lotissements des Varennes, le boulevard Joffre sur un ancien terrain militaire, puis l’opération de la Toison d’Or. Le guide évoque aussi les Coteaux du Suzon, le Clos de Pouilly et Valmy, sans attribuer la même histoire à chaque bâtiment.',
   'Dire « Dijon nord » ne suffit pas pour préparer une vente. Je montre l’entrée, les accès au jardin, le stationnement et les dépendances pour une maison ; pour un appartement, sa position et ses ouvertures dans l’immeuble. Les équipements servent à situer le bien sur une carte, tandis que le plan et les documents expliquent sa construction et ses transformations.'),
}
DOSSIERS = {
 'centre-ville': 'La page Secteurs cite un loft meublé en mandat exclusif dans le centre. Il s’agit d’un dossier présenté, sans affirmation de vente conclue.',
 'montchapet': 'La page Secteurs cite à Montchapet un studio rénové et filmé. Ce travail de présentation ne constitue pas une affirmation de vente conclue.',
 'gresilles': 'La page Secteurs cite aux Grésilles l’estimation d’un T2 avec terrasse et jardin. Aucune vente conclue n’est déduite de cette estimation.',
 'maladiere-drapeau-clemenceau': 'La page Secteurs cite dans le secteur Drapeau-Maladière l’estimation d’un T4 avec une grande terrasse. Le statut indiqué reste une estimation.',
}


def passage(q, an):
    from dijon_quartiers import e, fr, stats
    ventes = [v for v in q['ventes'] if v['mois'] // 100 == an]
    ap = [v for v in ventes if v['type'] == 0]
    ma = [v for v in ventes if v['type'] == 1]
    intro = f'À {e(q["nom"])}, le jeu DVF compte {len(ap)} ventes simples d’appartements et {len(ma)} ventes de maisons en {an}.'
    textes = GUIDES.get(q['slug'])
    if textes:
        guide, a, b = textes
        corps = f'<p>{e(a)}</p><p>{e(b)}</p><p><a href="/conseils-vendeurs/{guide}/">Lire le guide de ce quartier et préparer votre dossier</a>.</p>'
    else:
        # Fontaine d’Ouche : aucun guide existant. Le texte vient exclusivement du jeu DVF.
        dominant = ap if len(ap) >= len(ma) else ma
        genre = 'appartements' if dominant is ap else 'maisons'
        pieces = {}
        for v in dominant:
            if v['pieces'] > 0:
                pieces[v['pieces']] = pieces.get(v['pieces'], 0) + 1
        mode = max(pieces, key=pieces.get) if pieces else None
        corps = ('<p>Fontaine d’Ouche - Faubourg Raines - Larrey - Motte Giron est le périmètre municipal utilisé ici : les chiffres réunissent ces secteurs, sans attribuer à chacun la médiane de l’ensemble. '
                 f'En {an}, les {genre} représentent {len(dominant)} des {len(ventes)} ventes simples recensées dans ce contour.</p>')
        if mode:
            corps += f'<p>Dans les {genre}, la catégorie de {mode} pièces est la plus représentée dans ces ventes : {pieces[mode]} transactions. Cela décrit les logements vendus, pas tous les logements du quartier, ni le profil des acheteurs.</p>'
        corps += '<p>Le tableau sépare les maisons des appartements pour éviter de comparer leurs médianes comme s’il s’agissait du même type de bien. L’évolution annuelle dépend aussi de la composition des ventes ; les huit exemples anonymisés permettent de voir des surfaces et des prix signés sans publier d’adresse. Pour votre logement, il faut ensuite rapprocher les ventes comparables et ses caractéristiques réelles.</p>'
    chiffres = []
    for nom, selection in [('appartements', ap), ('maisons', ma)]:
        if len(selection) >= 5:
            chiffres.append(f'Les {nom} vendus ont une surface bâtie médiane de {fr(statistics.median(v["surface"] for v in selection))} m², et une médiane de {fr(stats(selection)["median_m2"])} €/m².')
    corps += '<p>' + ' '.join(chiffres) + ' Ces deux types sont comparés séparément dans le tableau ci-dessous.</p>'
    if q['slug'] in DOSSIERS:
        corps += '<p>' + e(DOSSIERS[q['slug']]) + ' <a href="/secteurs-dijon-nuits-saint-georges-beaune/">Voir les dossiers cités par secteur</a>.</p>'
    return '<p class="dq-intro">' + intro + '</p><section class="dq-section"><h2>Comprendre ce quartier avant de fixer votre prix</h2>' + corps + '</section>'


def autres(quartiers, courant):
    from dijon_quartiers import e, url
    return '<ul>' + ''.join(f'<li><a href="{url(q)}">{e(q["nom"])}</a></li>' for q in quartiers if q['slug'] != courant) + '</ul>'


def secteurs(root, quartiers, an):
    from dijon_quartiers import bloc, e, ecrire, url
    p = root / 'secteurs-dijon-nuits-saint-georges-beaune/index.html'
    if not p.exists():
        return
    lignes = ''.join(f'<li><a href="{url(q)}">{e(q["nom"])}</a><span>{e(DOSSIERS.get(q["slug"], "Ventes DVF et repères pour votre estimation"))}</span></li>' for q in quartiers)
    s = re.sub(r'(<ul class="terr-list">).*?(</ul>)', lambda m: m[1] + lignes + m[2], p.read_text(), count=1, flags=re.S)
    s = s.replace('Neuilly-lès-Dijon', 'Neuilly-Crimolois')
    ecrire(p, s)

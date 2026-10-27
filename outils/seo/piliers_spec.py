#!/usr/bin/env python3
"""Pages piliers (22/10/2026) : agent immobilier à Dijon, châteaux et prestige, fonds de commerce à vendre,
immobilier professionnel. Même gabarit que les autres pages SEO (outils/seo/gen_pages.py).

    python3 outils/seo/piliers_spec.py /tmp/piliers.json && python3 outils/seo/gen_pages.py . /tmp/piliers.json

Règles : aucun chiffre ni prix inventé. Les prix cités sont ceux des fiches du site (outils/biens, annonces de
l'agence) ou des pages du site, avec leur date ; les règles de droit renvoient à service-public.fr.
"""
import json, sys

DATE, DATE_FR = "2026-10-22", "22 octobre 2026"

L = lambda href, txt: '<a class="link" href="%s">%s</a>' % (href, txt)
SP = lambda href, txt: '<a class="link" href="%s" target="_blank" rel="noopener">%s</a>' % (href, txt)

P = []

# ---------------------------------------------------------------------------------------------- 1. AGENT IMMOBILIER À DIJON
P.append(dict(
  id="agent-dijon", path="/agent-immobilier-dijon/", date="2026-10-26", date_fr="26 octobre 2026",
  service="Agent immobilier à Dijon : vente, estimation et mise en location", service_type="Transaction immobilière", city="Dijon",
  service_desc="Estimation offerte, vente d'appartements, de maisons, de biens de prestige, d'immeubles, de terrains, de fonds de commerce et de murs commerciaux, mise en location sans gestion, à Dijon et en Côte-d'Or.",
  title="Agent immobilier à Dijon : Shawez Ali, GRAVELIN IMMO",
  description="Shawez Ali, agent immobilier à Dijon à l'agence GRAVELIN IMMO, 30 rue Bannelier : estimation offerte, vente, commerces, prestige, location sans gestion.",
  label="Agent immobilier à Dijon",
  h1="Agent immobilier à Dijon&nbsp;: <em>un seul interlocuteur, toute une équipe.</em>",
  h1_plain="Agent immobilier à Dijon : un seul interlocuteur, toute une équipe",
  lede="Je suis Shawez Ali, agent immobilier à l'agence GRAVELIN IMMO, 30 rue Bannelier, au centre de Dijon. J'estime, je vends et je mets en location, de l'appartement au château, du studio au fonds de commerce.",
  image="/assets/shawez-ali-portrait-sourire-720.webp", image_alt="Shawez Ali, agent immobilier à Dijon", img_w=720, img_h=900,
  crumbs=[("Agent immobilier à Dijon", "/agent-immobilier-dijon/")],
  intro="Vous cherchez un agent immobilier à Dijon pour vendre, acheter ou louer ? Voici, en clair, qui je suis, ce que je vends, où je travaille et comment se passe une vente avec moi. Tout ce qui est écrit ici se vérifie : sur les fiches des biens, dans les vidéos et dans les avis Google.",
  sections=[
    ("qui-je-suis", "Qui je suis",
     "<p>Je m'appelle Shawez Ali. Je suis agent immobilier, avec le statut d'agent commercial en immobilier, rattaché à l'agence GRAVELIN IMMO (30 rue Bannelier, 21000 Dijon), titulaire de la carte professionnelle. Les mandats sont signés au nom de l'agence ; moi, je suis votre interlocuteur du premier appel jusqu'à la signature chez le notaire. " + L("/shawez-ali-agent-immobilier-dijon/", "En savoir plus sur moi et mon équipe") + ".</p>"
     "<p>Je fais moi-même l'estimation, les visites et la négociation. Pour présenter votre bien, une équipe prend le relais : Robin, photographe et pilote de drone, Jason, vidéaste, et une équipe de montage et de diffusion. Les acheteurs arrivent en visite en ayant déjà vu le bien.</p>"
     "<p>Je travaille en français et en anglais, et je parle aussi couramment l'hindi, l'ourdou et le pendjabi, "
     "très bien le persan, et bien le grec et l'arabe. Acheteurs et vendeurs étrangers&nbsp;: "
     "<a class=\"link\" href=\"/en/\" lang=\"en\">my page in English</a>.</p>"),
    ("ce-que-je-vends", "Ce que je vends",
     "<ul>"
     "<li><strong>Appartements et maisons</strong> à Dijon et dans la métropole : " + L("/vendre-bien-immobilier-dijon/", "vendre votre bien à Dijon") + ", " + L("/biens-a-vendre-dijon/", "les biens à vendre") + ".</li>"
     "<li><strong>Châteaux, propriétés et biens de prestige</strong> en Bourgogne : " + L("/chateau-a-vendre-bourgogne/", "châteaux et demeures à vendre") + ".</li>"
     "<li><strong>Fonds de commerce</strong> (restaurants, hôtels, boutiques) : " + L("/fonds-de-commerce-a-vendre-dijon/", "les fonds de commerce à vendre") + " pour les repreneurs, " + L("/vendre-commerce-dijon/", "céder votre commerce") + " pour les vendeurs.</li>"
     "<li><strong>Murs commerciaux, bureaux, locaux et immeubles</strong> : " + L("/immobilier-professionnel-dijon/", "l'immobilier professionnel à Dijon") + ".</li>"
     "<li><strong>Terrains à bâtir</strong> : ils sont dans " + L("/biens-a-vendre-dijon/", "la liste des biens") + ", avec leur surface et leur prix.</li>"
     "<li><strong>Mise en location, sans gestion</strong> : je trouve le locataire, je prépare le bail et je fais l'état des lieux d'entrée, puis vous gardez la main. " + L("/location-immobiliere-dijon/", "Mettre en location à Dijon") + ".</li>"
     "</ul>"),
    ("agence-immobiliere-dijon", "Une agence immobilière au centre de Dijon",
     "<p>Derrière moi, il y a une vraie agence immobilière à Dijon : GRAVELIN IMMO, 30 rue Bannelier, à deux pas des Halles. Vous pouvez y passer du lundi au vendredi, de 9 h à 19 h, ou appeler l'agence au 03 45 34 35 31. Mon numéro direct reste le 07 67 57 92 28. Les visites des biens se font du lundi au samedi.</p>"
     "<p>Agent ou agence, quelle différence pour vous ? Les honoraires sont ceux du " + L("/honoraires/", "barème de l'agence") + ", dus seulement si la vente se fait. La différence, c'est que vous parlez toujours à la même personne, qui connaît votre dossier par cœur.</p>"),
    ("ou-j-interviens", "Où j'interviens",
     "<p><strong>Dijon et ses quartiers</strong> : centre historique, Montchapet, République, Grésilles, Drapeau-Maladière, Montmuzard… Les prix réels, quartier par quartier, sont sur la page " + L("/prix-immobilier-dijon/", "prix immobilier à Dijon") + ".</p>"
     "<p><strong>La métropole</strong> : " + L("/prix-immobilier-talant/", "Talant") + ", " + L("/immobilier-fontaine-les-dijon/", "Fontaine-lès-Dijon") + ", " + L("/prix-immobilier-chenove/", "Chenôve") + ", " + L("/prix-immobilier-quetigny/", "Quetigny") + ", " + L("/prix-immobilier-longvic/", "Longvic") + ", " + L("/prix-immobilier-chevigny-saint-sauveur/", "Chevigny-Saint-Sauveur") + ", " + L("/prix-immobilier-saint-apollinaire/", "Saint-Apollinaire") + ", " + L("/prix-immobilier-marsannay-la-cote/", "Marsannay-la-Côte") + ", " + L("/prix-immobilier-plombieres-les-dijon/", "Plombières-lès-Dijon") + ", " + L("/prix-immobilier-neuilly-les-dijon/", "Neuilly-lès-Dijon") + ".</p>"
     "<p><strong>La Côte et le reste de la Côte-d'Or</strong> : " + L("/prix-immobilier-gevrey-chambertin/", "Gevrey-Chambertin") + ", " + L("/immobilier-nuits-saint-georges/", "Nuits-Saint-Georges") + ", " + L("/agent-immobilier-beaune/", "Beaune") + ", et les communes plus éloignées : " + L("/prix-immobilier-cote-d-or/", "les prix commune par commune") + ". Pour une demeure de caractère, je vais plus loin en Bourgogne. " + L("/secteurs-dijon-nuits-saint-georges-beaune/", "Voir mon secteur sur la carte") + ".</p>"),
    ("comment-je-travaille", "Comment se passe une vente avec moi",
     "<p><strong>Le même service pour tous les biens.</strong> Un studio, un T2, un bureau de tabac, un plateau de bureaux ou un château : chaque bien que l'on me confie a son photographe, son vidéaste, son film monté et son home staging virtuel, quel que soit son prix. Les films sont publiés sur la chaîne YouTube de l'agence GRAVELIN IMMO, ouverte il y a plus de dix ans.</p>"
     "<ol>"
     "<li><strong>L'estimation, chez vous, offerte.</strong> Je visite, puis je compare avec les ventes réellement signées autour de chez vous (base publique DVF). Vous recevez un avis de valeur écrit. " + L("/estimation-immobiliere-dijon/", "Demander l'estimation") + " ou " + L("/estimer/", "obtenir une première fourchette en ligne") + ".</li>"
     "<li><strong>Le mandat</strong>, simple ou exclusif : je vous explique les deux, vous choisissez.</li>"
     "<li><strong>Les photos, le film et le drone</strong>, puis la diffusion sur Leboncoin, SeLoger, Bien'ici, Instagram, TikTok, YouTube et LinkedIn (et Figaro Immobilier pour les biens d'exception).</li>"
     "<li><strong>Les visites</strong>, avec des acheteurs qui ont déjà vu le film, et un retour après chacune.</li>"
     "<li><strong>L'offre, le compromis, l'acte</strong> : je vérifie le financement de l'acheteur et je suis le dossier jusqu'au notaire.</li>"
     "</ol>"),
    ("les-preuves", "Les preuves, à vérifier vous-même",
     "<p>Les " + L("/videos-immobilier-dijon/", "films des biens") + " tournés pour mes vendeurs, " + L("/biens-a-vendre-dijon/", "les biens en vente") + ", " + L("/avis/", "les avis Google") + " de mes clients, et le " + L("/podcast/", "podcast") + " où je parle du marché dijonnais sans jargon.</p>"),
  ],
  faq=[
    ("Combien coûte une estimation ?", "Rien : l'estimation est offerte et sans engagement. Je viens chez vous, puis je vous remets un avis de valeur écrit, appuyé sur les ventes réelles du secteur."),
    ("Le service est-il le même pour un petit appartement ?", "Oui. Un studio a droit au même service qu'un château : photographe, vidéaste, film monté, home staging virtuel et diffusion sur les portails et les réseaux. Le drone, lui, sert pour les maisons et les propriétés, et pour un commerce, le film et le dossier sont montrés sous engagement de confidentialité."),
    ("Quels sont vos honoraires ?", "Ce sont ceux du barème de l'agence GRAVELIN IMMO, publiés sur la page <a class=\"link\" href=\"/honoraires/\">Honoraires</a>. Ils ne sont dus que si la vente se réalise."),
    ("Êtes-vous une agence immobilière ?", "Je suis agent immobilier, rattaché à l'agence immobilière GRAVELIN IMMO, 30 rue Bannelier à Dijon, qui détient la carte professionnelle. Vous avez donc une agence derrière vous, et une seule personne en face de vous."),
    ("Faites-vous la gestion locative ?", "Non. Je fais la mise en location : loyer conseillé, annonce, visites, vérification du dossier, bail et état des lieux d'entrée. Ensuite, vous gérez vous-même votre location."),
    ("Dans quelles communes intervenez-vous ?", "Dijon et sa métropole, la Côte de Nuits, Beaune et le reste de la Côte-d'Or. Pour un château ou une demeure de caractère, partout en Bourgogne."),
    ("Comment vous joindre ?", "Au 07 67 57 92 28, par WhatsApp, par e-mail à shawez@gravelin-immo.com, ou à l'agence, 30 rue Bannelier, du lundi au vendredi de 9 h à 19 h."),
  ],
  side_title="Mes pages principales",
  links=[("Estimation immobilière à Dijon", "/estimation-immobiliere-dijon/"), ("Vendre un bien à Dijon", "/vendre-bien-immobilier-dijon/"),
         ("Prix immobilier à Dijon", "/prix-immobilier-dijon/"), ("Biens à vendre", "/biens-a-vendre-dijon/"),
         ("Châteaux et biens de prestige", "/chateau-a-vendre-bourgogne/"), ("Fonds de commerce à vendre", "/fonds-de-commerce-a-vendre-dijon/"),
         ("Murs, bureaux et locaux", "/immobilier-professionnel-dijon/"), ("Mise en location à Dijon", "/location-immobiliere-dijon/"),
         ("Choisir un agent immobilier", "/conseils-vendeurs/choisir-agent-immobilier-dijon/")],
))

# ---------------------------------------------------------------------------------------------- 2. CHÂTEAUX ET PRESTIGE
P.append(dict(
  id="prestige", path="/chateau-a-vendre-bourgogne/", date=DATE, date_fr=DATE_FR,
  service="Vente de châteaux et de biens de prestige en Bourgogne", service_type="Transaction immobilière de prestige", city="Bourgogne", area_type="AdministrativeArea",
  title="Château à vendre en Bourgogne et biens de prestige",
  description="Châteaux, propriétés et demeures de caractère à vendre en Bourgogne et en Côte-d'Or, filmés et présentés avec discrétion par Shawez Ali, agent immobilier.",
  label="Châteaux et prestige",
  h1="Château à vendre en Bourgogne&nbsp;: <em>des demeures filmées, présentées avec discrétion.</em>",
  h1_plain="Château à vendre en Bourgogne : des demeures filmées, présentées avec discrétion",
  lede="Château, propriété viticole, maison de maître ou maison d'architecte : un bien d'exception ne se vend pas comme un appartement. Les acheteurs viennent souvent de loin et veulent tout voir avant de se déplacer.",
  image="/assets/chateau-facade-allee.webp", image_alt="Façade d'un château et son allée, en Bourgogne", img_w=720, img_h=900,
  crumbs=[("Châteaux et biens de prestige", "/chateau-a-vendre-bourgogne/")],
  intro="Je vends des châteaux, des propriétés et des maisons de caractère en Côte-d'Or et en Bourgogne. Voici les biens de prestige en vente en ce moment, ce que je fais pour les présenter, et ce que je vérifie pour un acheteur.",
  sections=[
    ("en-vente", "En vente en ce moment",
     "<p>Au 22 octobre 2026, d'après les fiches du site (prix honoraires inclus, sauf mention contraire sur la fiche) :</p><ul>"
     "<li><strong>Un château à Saint-Gervais-en-Vallière</strong>, à quinze minutes de Beaune : 520 m², 18 pièces dont 7 chambres, un domaine de 15 hectares dont 10 de bois, vue dégagée sur la Côte de Beaune. 1 600 000 €. " + L("/biens/438-chateau-saint-gervais-en-valliere/", "Voir la fiche du château") + ".</li>"
     "<li><strong>Une maison d'architecte à Plombières-lès-Dijon</strong>, construite en 2023, 153 m², 770 m² de terrain, DPE A. 429 500 €. " + L("/biens/441-maison-plombieres-les-dijon/", "Voir la fiche") + ".</li>"
     "<li><strong>Une propriété avec parc et piscine à Allerey-sur-Saône</strong>, à vingt minutes de Beaune : 206 m², terrain clos et arboré de 5 039 m², grange aménagée. 415 000 €. " + L("/biens/500a-maison-allerey-sur-saone/", "Voir la fiche") + ".</li>"
     "<li><strong>Une propriété ancienne rénovée à Couchey</strong>, sur la Côte des vins : deux maisons vendues ensemble, 141 m², cave voûtée. 370 000 €. " + L("/biens/509-propriete-couchey/", "Voir la fiche") + ".</li>"
     "</ul><p>La liste change : " + L("/biens-a-vendre-dijon/", "tous les biens à vendre") + ", mis à jour chaque matin. Vous cherchez un bien de caractère précis ? Dites-moi ce que vous cherchez : je vous appelle dès qu'un bien correspondant arrive.</p>"),
    ("vendre-une-demeure", "Vendre un château ou une demeure de caractère",
     "<p><strong>Le film d'abord.</strong> Pour un domaine, le drone montre ce qu'aucune photo ne montre : le parc, les bois, les dépendances, la vue. Le film est tourné par mon vidéaste, puis diffusé sur les portails, les réseaux et, pour les biens d'exception, sur Figaro Immobilier. " + L("/videos-immobilier-dijon/", "Voir les films") + ".</p>"
     "<p><strong>La discrétion, si vous la voulez.</strong> Pas d'adresse dans l'annonce, visites réservées aux acheteurs dont le financement est vérifié, et une diffusion ciblée si vous ne voulez pas de publicité.</p>"
     "<p><strong>Un prix défendable.</strong> Il se vend peu de châteaux, et aucun ne ressemble à un autre : une moyenne ne veut rien dire. Je pars des ventes réelles de biens comparables, puis de ce que coûte l'entretien du bien (toitures, chauffage, parc), parce que c'est ce que l'acheteur et sa banque calculeront. " + L("/estimation-immobiliere-dijon/", "Demander l'estimation de votre propriété") + ", offerte.</p>"
     "<p><strong>Un dossier complet dès le départ</strong> : diagnostics, plans, surfaces, factures des gros travaux, servitudes, et, si le bien est protégé au titre des monuments historiques ou situé dans un périmètre protégé, les règles qui s'appliquent aux travaux.</p>"),
    ("acheter", "Acheter : ce que je vérifie avec vous",
     "<ul><li>L'état des toitures, de la charpente et des façades, et ce qui a été refait.</li>"
     "<li>Le chauffage et le DPE : sur une grande surface, c'est le premier poste de dépenses.</li>"
     "<li>Le terrain : surface exacte au cadastre, bois, accès, servitudes, assainissement.</li>"
     "<li>Les dépendances : ce qui est habitable, ce qui peut le devenir, ce qu'autorise la mairie.</li>"
     "<li>Le financement : " + L("/simulateur-pret-immobilier-dijon/", "simulez votre prêt") + " avant de visiter.</li></ul>"),
    ("ou", "Où",
     "<p>La Côte de Nuits et la Côte de Beaune, les villages viticoles de la Route des Grands Crus, l'arrière-côte, la vallée de la Saône et l'Auxois. Les prix des communes proches de Dijon sont sur la page " + L("/prix-immobilier-cote-d-or/", "prix immobilier en Côte-d'Or") + " ; pour Beaune, " + L("/agent-immobilier-beaune/", "agent immobilier à Beaune") + " ; pour Nuits, " + L("/immobilier-nuits-saint-georges/", "immobilier à Nuits-Saint-Georges") + ".</p>"),
  ],
  faq=[
    ("Quel est le prix d'un château en Bourgogne ?", "Il n'existe pas de prix moyen fiable : il s'en vend trop peu, et chacun est unique (surface, état, terrain, dépendances). À titre d'exemple, le château de Saint-Gervais-en-Vallière que je présente, 520 m² sur 15 hectares, est proposé à 1 600 000 € honoraires inclus (octobre 2026)."),
    ("Peut-on vendre une demeure sans publicité ?", "Oui. Je peux la présenter uniquement à des acheteurs dont le projet et le financement sont vérifiés, sans annonce publique et sans adresse."),
    ("Puis-je visiter à distance avant de me déplacer ?", "Oui. Chaque bien que je vends est filmé : vous voyez la maison, le parc et les abords avant de vous déplacer, puis je vous fais visiter sur place."),
    ("L'estimation d'une propriété est-elle payante ?", "Non, elle est offerte. Je visite, puis je vous remets un avis de valeur écrit, appuyé sur des ventes comparables."),
    ("Travaillez-vous en dehors de la Côte-d'Or ?", "Oui pour les biens de caractère : le château de Saint-Gervais-en-Vallière et la propriété d'Allerey-sur-Saône sont en Saône-et-Loire, près de Beaune."),
  ],
  side_title="À voir aussi",
  links=[("Le château de Saint-Gervais-en-Vallière", "/biens/438-chateau-saint-gervais-en-valliere/"), ("Tous les biens à vendre", "/biens-a-vendre-dijon/"),
         ("Les films des biens", "/videos-immobilier-dijon/"), ("Agent immobilier à Beaune", "/agent-immobilier-beaune/"),
         ("Agent immobilier à Dijon", "/agent-immobilier-dijon/"), ("Estimer ma propriété", "/estimation-immobiliere-dijon/")],
))

# ---------------------------------------------------------------------------------------------- 3. FONDS DE COMMERCE À VENDRE
P.append(dict(
  id="fonds", path="/fonds-de-commerce-a-vendre-dijon/", date=DATE, date_fr=DATE_FR,
  service="Vente de fonds de commerce à Dijon", service_type="Cession de fonds de commerce", city="Dijon",
  title="Fonds de commerce à vendre à Dijon : reprendre une affaire",
  description="Restaurant, hôtel, boutique : les fonds de commerce à vendre à Dijon et la reprise avec Shawez Ali, agent immobilier. Dossier sous confidentialité.",
  label="Fonds de commerce",
  h1="Fonds de commerce à vendre <em>à Dijon.</em>",
  h1_plain="Fonds de commerce à vendre à Dijon",
  lede="Vous voulez reprendre un restaurant, un hôtel ou une boutique à Dijon ? Les affaires en vente, et la façon dont je travaille avec les repreneurs : dossier complet sous confidentialité, visite discrète, offre financée.",
  image="/assets/shawez-ali-hotel-commerce-dijon.webp", image_alt="Shawez Ali dans la réception d'un hôtel à vendre à Dijon", img_w=720, img_h=900,
  crumbs=[("Fonds de commerce à vendre à Dijon", "/fonds-de-commerce-a-vendre-dijon/")],
  intro="Reprendre un commerce, c'est acheter une activité qui tourne déjà : un emplacement, une clientèle, un bail, souvent une équipe. Cette page s'adresse aux repreneurs. Si vous vendez votre affaire, c'est par ici : " + L("/vendre-commerce-dijon/", "céder votre commerce à Dijon") + ".",
  sections=[
    ("les-affaires-en-vente", "Les affaires en vente",
     "<p>En octobre 2026, à l'agence GRAVELIN IMMO :</p><ul>"
     "<li><strong>Un hôtel de 21 chambres en plein Dijon</strong>, murs et fonds, en mandat exclusif : 892 500 € honoraires inclus. Présenté en vidéo sur la page " + L("/videos-immobilier-dijon/", "Vidéos") + ".</li>"
     "<li><strong>Un restaurant bistronomique de 155 m²</strong> près de la place des Cordeliers : 99 000 €.</li>"
     "<li><strong>Un commerce de trottinettes électriques de 120 m²</strong> : 120 000 €.</li></ul>"
     "<p>D'autres affaires ne sont pas publiées : le vendeur ne veut pas que ses clients, ses salariés ou ses fournisseurs l'apprennent par une annonce. Dites-moi ce que vous cherchez (activité, budget, apport, secteur) et je vous les présente si elles correspondent. Les prix changent et les affaires partent vite : appelez-moi pour la liste du jour.</p>"),
    ("le-dossier", "Recevoir le dossier complet",
     "<p>Vous recevez tout de suite les informations publiques : activité, surface, prix, loyer. Pour les chiffres détaillés (bilans, chiffre d'affaires, bail, liste du personnel, inventaire), je vous envoie un engagement de confidentialité à signer, avec une copie de votre pièce d'identité. Dès qu'il me revient signé, je vous envoie le dossier, sans attendre.</p>"),
    ("comment-se-passe-une-reprise", "Comment se passe une reprise",
     "<ol><li><strong>Un premier échange</strong> : votre projet, votre expérience du métier, votre apport.</li>"
     "<li><strong>Le dossier</strong>, sous confidentialité, que vous faites relire par votre expert-comptable.</li>"
     "<li><strong>La visite</strong>, discrète, souvent hors des heures d'ouverture.</li>"
     "<li><strong>Le financement</strong> : la banque regarde votre apport, votre expérience et un prévisionnel. Une offre déjà financée passe devant les autres.</li>"
     "<li><strong>L'offre</strong>, argumentée, puis la promesse et l'acte de cession, avec votre avocat ou votre notaire.</li></ol>"
     "<p>Les six points que je vérifie avec chaque repreneur (bail, chiffres réels, matériel et normes, salariés, financement, prix) sont détaillés dans le guide " + L("/conseils-vendeurs/acheter-fonds-de-commerce-dijon/", "acheter un fonds de commerce à Dijon") + ".</p>"),
    ("ce-que-dit-la-loi", "Deux règles à connaître",
     "<p><strong>Le bail commercial suit le fonds.</strong> En achetant le fonds, vous reprenez le bail en cours : sa durée restante, son loyer et l'activité qu'il autorise font partie du prix. (Code de commerce, articles L145-1 et suivants).</p>"
     "<p><strong>Les salariés sont informés avant la vente.</strong> Dans les entreprises de moins de 250 salariés, le vendeur doit informer ses salariés de son projet de cession, pour qu'ils puissent faire une offre (Code de commerce, articles L141-23 et suivants). C'est au vendeur de le faire, mais cela compte dans le calendrier de votre reprise.</p>"),
    ("fonds-ou-murs", "Le fonds, les murs, ou les deux",
     "<p>Le fonds, c'est l'activité ; les murs, c'est le local. On peut acheter l'un sans l'autre. Si vous cherchez aussi les murs, ou des murs loués pour investir, voyez " + L("/immobilier-professionnel-dijon/", "l'immobilier professionnel à Dijon") + " et le guide " + L("/conseils-vendeurs/acheter-murs-commerciaux-dijon/", "acheter des murs commerciaux") + ".</p>"),
  ],
  faq=[
    ("Comment obtenir les chiffres d'un commerce à vendre ?", "Je vous donne tout de suite les informations publiques. Pour les bilans et le bail, vous signez un engagement de confidentialité, avec votre pièce d'identité ; je vous envoie le dossier dès qu'il me revient."),
    ("Comment se calcule le prix d'un fonds de commerce ?", "Sur ce que l'affaire rapporte vraiment (résultat et chiffre d'affaires des derniers exercices), sur le bail et sur l'emplacement, pas sur le prix d'une autre affaire de la même rue. Je vous aide à construire une offre argumentée."),
    ("Puis-je visiter sans que le personnel le sache ?", "Oui. Les visites se font en accord avec le vendeur, souvent hors des heures d'ouverture, et rien n'est dit aux salariés ni aux clients."),
    ("Faut-il un apport pour reprendre un commerce ?", "La banque le demandera presque toujours, avec votre expérience dans le métier et un prévisionnel. Préparez ce dossier avant de faire une offre."),
    ("Vous vendez aussi des commerces pour les propriétaires ?", "Oui : <a class=\"link\" href=\"/vendre-commerce-dijon/\">céder votre commerce à Dijon</a>, avec un accord de confidentialité avant tout chiffre."),
  ],
  side_title="À lire aussi",
  links=[("Acheter un fonds de commerce : 6 points", "/conseils-vendeurs/acheter-fonds-de-commerce-dijon/"), ("Acheter des murs commerciaux", "/conseils-vendeurs/acheter-murs-commerciaux-dijon/"),
         ("Murs, bureaux et locaux à Dijon", "/immobilier-professionnel-dijon/"), ("Céder votre commerce", "/vendre-commerce-dijon/"),
         ("Vendre un commerce : le guide", "/conseils-vendeurs/vendre-un-commerce-dijon/"), ("Agent immobilier à Dijon", "/agent-immobilier-dijon/")],
))

# ---------------------------------------------------------------------------------------------- 4. IMMOBILIER PROFESSIONNEL
P.append(dict(
  id="pro", path="/immobilier-professionnel-dijon/", date=DATE, date_fr=DATE_FR,
  service="Vente de murs commerciaux, de bureaux, de locaux et d'immeubles à Dijon", service_type="Immobilier d'entreprise", city="Dijon",
  title="Immobilier professionnel à Dijon : murs, bureaux, locaux",
  description="Murs commerciaux, bureaux, locaux d'activité et immeubles de rapport à Dijon : vendre, acheter pour investir ou pour votre activité, avec Shawez Ali.",
  label="Immobilier professionnel",
  h1="Murs commerciaux, bureaux et locaux <em>à Dijon.</em>",
  h1_plain="Murs commerciaux, bureaux et locaux à Dijon",
  lede="Un local loué ne se vend pas et ne s'achète pas comme un appartement : sa valeur tient d'abord à son bail et à son locataire. Ce que je fais pour les propriétaires et pour les investisseurs.",
  image="/assets/immeuble-ancien-angle-bourgogne.webp", image_alt="Immeuble ancien à l'angle de deux rues, en Bourgogne", img_w=720, img_h=900,
  crumbs=[("Immobilier professionnel à Dijon", "/immobilier-professionnel-dijon/")],
  intro="Murs de boutique ou de restaurant, bureaux, local d'activité, immeuble de rapport : je vends et je fais acheter l'immobilier professionnel à Dijon et dans la métropole. Pour l'achat d'une activité (le fonds), voyez " + L("/fonds-de-commerce-a-vendre-dijon/", "les fonds de commerce à vendre") + ".",
  sections=[
    ("vendre-des-murs", "Vendre des murs commerciaux",
     "<p><strong>Murs loués</strong> : l'acheteur achète un loyer. Il regarde le bail (durée restante, loyer, charges refacturées), le locataire (ancienneté, régularité des paiements) et l'emplacement. Je prépare ces pièces avant la mise en vente : bail et avenants, trois derniers avis de taxe foncière, état des loyers payés, règlement de copropriété s'il y en a un.</p>"
     "<p><strong>Murs libres</strong> : ils intéressent les commerçants qui veulent s'installer chez eux et les investisseurs prêts à chercher un locataire. Ce qui compte : la vitrine, la surface utile, l'accessibilité, l'extraction pour un restaurant, et ce que permet le règlement de copropriété.</p>"
     "<p>L'estimation est offerte : " + L("/estimation-immobiliere-dijon/", "demandez un avis de valeur") + ".</p>"),
    ("acheter-pour-investir", "Acheter pour investir ou pour votre activité",
     "<p>Crédit professionnel, société civile immobilière, crédit-bail : le montage se décide avec votre expert-comptable. Le rendement se calcule sur le loyer net, après taxe foncière non refacturée, assurance, charges et vacance possible. Le détail est dans le guide " + L("/conseils-vendeurs/acheter-murs-commerciaux-dijon/", "acheter des murs commerciaux à Dijon") + ".</p>"),
    ("le-bail-commercial", "Le bail commercial en quelques règles",
     "<ul><li>Il dure au moins neuf ans ; le locataire peut en principe donner congé à chaque période de trois ans.</li>"
     "<li>À son terme, le locataire a en principe droit à son renouvellement ; le refus du propriétaire peut l'obliger à verser une indemnité d'éviction.</li>"
     "<li>Le bail doit dire quelles charges, impôts et travaux sont payés par le locataire ; certaines dépenses, comme les grosses réparations, ne peuvent pas lui être imputées.</li></ul>"
     "<p>Sources : Code de commerce, articles L145-4 (durée et congé), L145-14 (indemnité d'éviction), L145-40-2 et R145-35 (charges et travaux). Faites toujours relire le bail par votre notaire ou votre avocat.</p>"),
    ("bureaux-et-immeubles", "Bureaux, locaux et immeubles de rapport",
     "<p>Je vends aussi des bureaux, des locaux d'activité et des immeubles entiers, avec des logements, des commerces ou les deux. En ce moment, par exemple, " + L("/biens/452immeuble-immeuble-dijon/", "un immeuble de 222 m² à Dijon") + ", proposé à 645 000 € honoraires inclus (fiche du 22 octobre 2026). Tous les biens en vente : " + L("/biens-a-vendre-dijon/", "les biens à vendre") + ".</p>"),
    ("dijon", "À Dijon",
     "<p>L'hypercentre, les axes passants et les quartiers en développement n'ont ni les mêmes loyers ni les mêmes risques. Je connais les rues où les commerces durent et celles où les vitrines changent souvent : c'est la première chose dont nous parlerons. Le marché du logement, lui, est sur la page " + L("/prix-immobilier-dijon/", "prix immobilier à Dijon") + ".</p>"),
  ],
  faq=[
    ("Comment estimer des murs commerciaux loués ?", "À partir du loyer, du bail et du locataire, puis en comparant avec les ventes de locaux comparables. Je vous remets un avis de valeur écrit, offert."),
    ("Peut-on vendre les murs sans le fonds ?", "Oui. Les murs et le fonds sont deux biens différents : on peut vendre l'un, l'autre, ou les deux au même acheteur."),
    ("La taxe foncière peut-elle être payée par le locataire ?", "Oui si le bail le prévoit expressément. Le bail commercial doit lister les charges, impôts et taxes refacturés au locataire."),
    ("Vous occupez-vous de la location de locaux commerciaux ?", "Je vends l'immobilier professionnel. Pour les logements, je fais la mise en location, sans gestion. Pour un local commercial à louer, appelez-moi : je vous dirai ce que je peux faire."),
    ("Faut-il passer par une société pour acheter des murs ?", "Ce n'est pas obligatoire. La SCI est souvent utilisée quand on achète les murs de sa propre entreprise ; le choix se fait avec votre expert-comptable."),
  ],
  side_title="À lire aussi",
  links=[("Acheter des murs commerciaux", "/conseils-vendeurs/acheter-murs-commerciaux-dijon/"), ("Fonds de commerce à vendre", "/fonds-de-commerce-a-vendre-dijon/"),
         ("Céder votre commerce", "/vendre-commerce-dijon/"), ("Simulateur de prêt", "/simulateur-pret-immobilier-dijon/"),
         ("Agent immobilier à Dijon", "/agent-immobilier-dijon/"), ("Estimation offerte", "/estimation-immobiliere-dijon/")],
))

if __name__ == '__main__':
    json.dump(P, open(sys.argv[1], 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(len(P), 'pages')

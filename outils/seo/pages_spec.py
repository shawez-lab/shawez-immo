#!/usr/bin/env python3
# Contenu des 5 pages de la vague 1 SEO. Chiffres : DVF (Etalab, DGFiP), calcul du 9/10/2026 sur donnees-dvf/ du dépôt.
import json, sys

DATE, DATE_FR = "2026-10-09", "9 octobre 2026"
SRC = ("Source : ventes « Demandes de valeurs foncières » (DVF géolocalisées, Etalab, DGFiP, licence ouverte), "
       "ventes d'un seul logement, données arrêtées au 30 décembre 2025, calcul de Shawez Ali le 9 octobre 2026. "
       "Ce sont des médianes : la moitié des ventes se fait au-dessus, l'autre moitié en dessous.")

def table(rows, caption):
    li = ''.join('<li><strong>%s</strong> — %s : <strong>%s/m²</strong> (%s ventes)</li>' % (r[0], r[1].lower() + 's', r[2], r[3]) for r in rows)
    return '<p><strong>' + caption + '</strong></p><ul>' + li + '</ul>'

CITY_LINKS = [("Prix immobilier à Dijon au m²", "/prix-immobilier-dijon/"),
              ("Agent immobilier à Beaune", "/agent-immobilier-beaune/"),
              ("Immobilier à Fontaine-lès-Dijon", "/immobilier-fontaine-les-dijon/"),
              ("Immobilier à Nuits-Saint-Georges", "/immobilier-nuits-saint-georges/"),
              ("Vendre une maison en succession", "/conseils-vendeurs/vendre-maison-succession-dijon/"),
              ("Tous les secteurs", "/secteurs-dijon-nuits-saint-georges-beaune/")]

def links(exclude):
    return [l for l in CITY_LINKS if l[1] != exclude][:5]

P = []

# 1. PRIX AU M² DIJON
P.append(dict(
  id="prix-dijon", path="/prix-immobilier-dijon/", date=DATE, date_fr=DATE_FR,
  title="Prix immobilier à Dijon au m² : les repères 2025",
  description="Prix au m² à Dijon en 2025 d'après les ventes réelles (DVF) : appartements, maisons, centre-ville, communes voisines. Méthode, limites, et votre prix à vous.",
  label="Prix du marché", h1="Prix au m² à Dijon : <em>ce que disent les ventes réelles.</em>", h1_plain="Prix au m² à Dijon : ce que disent les ventes réelles",
  lede="Pas d'estimation au doigt mouillé : des médianes calculées sur les ventes signées chez le notaire, secteur par secteur, avec la méthode et les limites.",
  image="/assets/dijon-eglise-saint-michel.webp", image_alt="L'église Saint-Michel, dans le centre historique de Dijon",
  crumbs=[("Prix immobilier à Dijon", "/prix-immobilier-dijon/")],
  intro="Quand on me demande « combien vaut le mètre carré à Dijon ? », je réponds toujours avec les ventes réellement signées, pas avec les prix affichés sur les annonces. Voici les repères que je tire de la base publique DVF, et la façon de les lire sans se tromper.",
  sections=[
    ("le-repere-a-l-echelle-de-la-ville", "Le repère à l'échelle de la ville",
     "<p>Sur l'année 2025, le prix médian des appartements vendus à Dijon ressort à environ 2 782 €/m², pour 2 884 ventes (base DVF de la DGFiP, chiffres consolidés par immovrai.com, consultés le 21 septembre 2026). C'est un repère, pas un prix : entre deux quartiers, deux immeubles ou deux étages, l'écart dépasse largement l'écart d'une année sur l'autre.</p>"),
    ("secteur-par-secteur", "Secteur par secteur : les médianes 2025",
     "<p>J'ai refait le calcul sur les ventes DVF de 2025, en ne gardant que les ventes d'un seul logement (un appartement ou une maison, avec au plus une cave ou un garage), dans un rayon autour du centre de chaque secteur.</p>" +
     table([("Dijon, centre (1,2 km autour de la place de la Libération)", "Appartement", "2 870 €", "1 089"),
            ("Dijon et première couronne (4 km)", "Appartement", "2 660 €", "2 766"),
            ("Dijon et première couronne (4 km)", "Maison", "3 230 €", "582"),
            ("Fontaine-lès-Dijon (1,3 km autour du centre)", "Maison", "3 440 €", "121"),
            ("Talant (1,2 km)", "Maison", "3 050 €", "69"),
            ("Chenôve (1,5 km)", "Maison", "2 500 €", "82"),
            ("Quetigny (1,4 km)", "Appartement", "2 070 €", "60"),
            ("Beaune (2 km)", "Appartement", "2 610 €", "203"),
            ("Nuits-Saint-Georges (1,5 km)", "Maison", "2 440 €", "40")],
           "Prix médian au m² des ventes signées en 2025") +
     "<p style=\"font-size:.9em;opacity:.8;\">" + SRC + " Un rayon ne suit pas exactement les limites d'une commune : ces chiffres décrivent un secteur, pas une adresse.</p>"),
    ("ce-qui-fait-varier-le-prix", "Ce qui fait varier le prix de votre bien",
     "<p>Deux biens de même surface, dans la même rue, peuvent se vendre à des prix très différents. Ce que je regarde en premier : l'étage et l'ascenseur, la lumière, l'extérieur (balcon, terrasse, jardin), le stationnement, l'état et les travaux à prévoir, le diagnostic de performance énergétique, et, en copropriété, les charges et les travaux votés. Une maison se juge aussi sur son terrain : en 2025, la moitié des maisons vendues autour de Dijon avaient moins de 400 m² de terrain.</p>"),
    ("comment-les-prix-ont-evolue", "Comment les prix ont évolué depuis 2023",
     "<p>Sur les appartements vendus dans un rayon de 4 km autour du centre de Dijon, la médiane est passée de 2 640 €/m² en 2023 à 2 530 €/m² en 2024, puis 2 660 €/m² en 2025. Pour les maisons : 3 290, 3 180, puis 3 230 €/m². Autrement dit, un marché qui a marqué le pas en 2024 et qui s'est stabilisé en 2025. " + "Les données de 2026 ne sont pas encore publiées dans leur totalité.</p>"),
    ("votre-prix-a-vous", "Votre prix à vous",
     "<p>Une médiane ne dit pas ce que vaut votre bien. Pour cela, il faut partir des ventes les plus proches et les plus comparables, puis ajuster. C'est ce que fait l'<a class=\"link\" href=\"/estimer/\">estimation en ligne</a> du site (une fourchette indicative, à partir des ventes DVF autour de votre adresse), et c'est ce que je fais à la main lors d'une visite, avant de vous remettre un avis de valeur écrit. L'estimation est offerte et sans engagement.</p>"),
  ],
  faq=[
    ("Quel est le prix moyen du m² à Dijon ?", "Sur 2025, le prix médian des appartements vendus à Dijon est d'environ 2 782 €/m² (DVF, DGFiP, via immovrai.com). Pour les maisons, mon calcul sur les ventes à moins de 4 km du centre donne 3 230 €/m². Ce sont des médianes : votre bien peut être nettement au-dessus ou en dessous."),
    ("Quel est le prix d'un appartement dans le centre de Dijon ?", "Pour les appartements vendus en 2025 à moins de 1,2 km de la place de la Libération, la médiane est de 2 870 €/m² (1 089 ventes, DVF). La moitié des ventes se situe entre 2 320 et 3 430 €/m²."),
    ("Quel est le quartier le plus cher de Dijon ?", "Je ne publie pas de classement de quartiers : les écarts se font souvent rue par rue et immeuble par immeuble. Les ventes réelles d'une rue sont consultables gratuitement sur app.dvf.etalab.gouv.fr, et je peux vous les commenter pour votre bien."),
    ("Les prix de l'immobilier baissent-ils à Dijon ?", "D'après les ventes DVF, la médiane des appartements autour de Dijon est passée de 2 640 €/m² en 2023 à 2 530 €/m² en 2024, puis 2 660 €/m² en 2025 : une baisse en 2024, puis une stabilisation."),
    ("Comment connaître le prix de vente réel d'un bien près de chez moi ?", "Toutes les ventes signées chez le notaire sont publiées dans la base DVF, consultable adresse par adresse sur app.dvf.etalab.gouv.fr. Vous pouvez aussi utiliser l'<a class=\"link\" href=\"/estimer/\">estimation en ligne</a>, qui s'appuie sur ces ventes."),
  ],
  links=[("Prix affiché, prix signé à Dijon", "/conseils-vendeurs/prix-affiche-prix-signe-dijon/")] + links("/prix-immobilier-dijon/")[:4],
))

# 2. AGENT IMMOBILIER BEAUNE
P.append(dict(
  id="beaune", path="/agent-immobilier-beaune/", date=DATE, date_fr=DATE_FR, service="Estimation et vente immobilière à Beaune", city="Beaune",
  title="Agent immobilier à Beaune : estimer et vendre | Shawez Ali",
  description="Vendre une maison ou un appartement à Beaune : prix réels 2025 (DVF), méthode, film et drone compris, estimation offerte par Shawez Ali, agent immobilier.",
  label="Beaune", h1="Agent immobilier <em>à Beaune.</em>", h1_plain="Agent immobilier à Beaune",
  lede="Maisons de ville, appartements du centre, maisons de village vers la Côte : j'estime et je vends à Beaune avec les mêmes outils qu'à Dijon.",
  image="/assets/maison-pierre-volets-rouges-beaune.webp", image_alt="Maison en pierre aux volets rouges, à Beaune",
  crumbs=[("Secteurs", "/secteurs-dijon-nuits-saint-georges-beaune/"), ("Beaune", "/agent-immobilier-beaune/")],
  intro="Je suis agent immobilier, rattaché à l'agence GRAVELIN IMMO, 30 rue Bannelier à Dijon, à environ 45 km de Beaune. Je me déplace à Beaune et dans les villages autour pour estimer, filmer, faire visiter et suivre la vente jusqu'au notaire.",
  sections=[
    ("le-marche-a-beaune", "Le marché à Beaune en chiffres",
     "<p>En 2025, les appartements vendus dans un rayon de 2 km autour du centre de Beaune se sont signés à 2 610 €/m² en médiane (203 ventes), et les maisons à 2 590 €/m² (99 ventes, avec un terrain médian d'environ 650 m²). En 2024, les médianes étaient de 2 480 €/m² pour les appartements et 2 650 €/m² pour les maisons.</p><p style=\"font-size:.9em;opacity:.8;\">" + SRC + "</p>"),
    ("qui-achete-a-beaune", "Qui achète à Beaune",
     "<p>Beaune attire des acheteurs du secteur et d'autres qui viennent de plus loin, attirés par la Côte et les vignobles. Beaucoup découvrent le bien à distance. C'est pour eux que je filme chaque bien : une visite en vidéo, des photos soignées et, pour une maison, des vues au drone qui montrent le terrain et l'environnement.</p>"),
    ("ce-que-je-fais-pour-votre-vente", "Ce que je fais pour votre vente",
     "<ul><li>Une estimation offerte, à partir des ventes réelles autour de chez vous, remise sous forme d'avis de valeur écrit.</li><li>Les photos, le film et le drone pour les maisons, compris dans le mandat.</li><li>La diffusion sur les portails et les réseaux, avec l'agence GRAVELIN IMMO.</li><li>Les visites, les retours après chaque visite, la vérification du financement des acheteurs.</li><li>Le suivi jusqu'à la signature chez le notaire.</li></ul><p>Les honoraires sont ceux du <a class=\"link\" href=\"/honoraires/\">barème de l'agence</a>, dus seulement si la vente se fait.</p>"),
    ("les-points-a-preparer", "Les points à préparer avant de vendre à Beaune",
     "<p>Le diagnostic de performance énergétique est obligatoire dès l'annonce, et les acheteurs le lisent de près pour une maison ancienne. Pour un bien situé dans le périmètre protégé du centre ancien, certains travaux dépendent de l'avis de l'architecte des Bâtiments de France : mieux vaut le savoir avant de fixer le prix. Enfin, rassemblez les titres de propriété, les factures de travaux et, en copropriété, les trois derniers procès-verbaux d'assemblée générale.</p>"),
  ],
  faq=[
    ("Quel est le prix au m² à Beaune ?", "En 2025, d'après les ventes DVF à moins de 2 km du centre de Beaune : environ 2 610 €/m² en médiane pour un appartement et 2 590 €/m² pour une maison. Le prix de votre bien dépend ensuite de son état, de son extérieur et de son emplacement exact."),
    ("Combien coûte une estimation à Beaune ?", "Rien. Je me déplace à Beaune, je visite le bien et je vous remets un avis de valeur écrit. L'estimation est offerte et sans engagement."),
    ("Comment savoir la valeur actuelle de ma maison ?", "Partez des ventes réelles autour de chez vous (base DVF, sur app.dvf.etalab.gouv.fr), puis ajustez selon l'état, le terrain et les travaux. Pour une première fourchette, utilisez l'<a class=\"link\" href=\"/estimer/\">estimation en ligne</a> ; pour un prix de mise en vente, une visite reste nécessaire."),
    ("Existe-t-il un outil pour estimer ma maison moi-même ?", "Oui : l'<a class=\"link\" href=\"/estimer/\">estimation en ligne</a> du site donne une fourchette indicative à partir des ventes DVF proches de votre adresse, partout en Côte-d'Or. Elle indique le nombre de ventes utilisées et la date des données."),
    ("Vous déplacez-vous dans les villages autour de Beaune ?", "Oui, à Beaune et sur la Côte, de Nuits-Saint-Georges aux villages voisins. Appelez-moi au 07 67 57 92 28 pour fixer un rendez-vous."),
  ],
  links=links("/agent-immobilier-beaune/"),
))

# 3. FONTAINE-LÈS-DIJON
P.append(dict(
  id="fontaine", path="/immobilier-fontaine-les-dijon/", date=DATE, date_fr=DATE_FR, service="Estimation et vente immobilière à Fontaine-lès-Dijon", city="Fontaine-lès-Dijon",
  title="Immobilier à Fontaine-lès-Dijon : estimer et vendre",
  description="Vendre une maison ou un appartement à Fontaine-lès-Dijon : prix réels 2025 (DVF), ce que regardent les acheteurs, estimation offerte par Shawez Ali.",
  label="Fontaine-lès-Dijon", h1="Vendre à Fontaine-lès-Dijon, <em>au bon prix.</em>", h1_plain="Vendre à Fontaine-lès-Dijon, au bon prix",
  lede="Sur les hauteurs au nord-ouest de Dijon, la demande porte surtout sur des maisons avec jardin. Voici les prix réels et ce qui fait la différence.",
  image="/assets/maison-pierre-terrasse-jardin.webp", image_alt="Maison en pierre avec terrasse et jardin",
  crumbs=[("Secteurs", "/secteurs-dijon-nuits-saint-georges-beaune/"), ("Fontaine-lès-Dijon", "/immobilier-fontaine-les-dijon/")],
  intro="Fontaine-lès-Dijon touche Dijon et garde un air de village. Ceux qui y achètent cherchent souvent une maison avec un jardin, à quelques minutes du centre. Je vous donne les repères de prix et la façon dont je prépare une vente ici.",
  sections=[
    ("les-prix-a-fontaine-les-dijon", "Les prix à Fontaine-lès-Dijon",
     "<p>En 2025, les maisons vendues dans un rayon de 1,3 km autour du centre de Fontaine-lès-Dijon se sont signées à 3 440 €/m² en médiane (121 ventes, surface médiane 120 m², terrain médian d'environ 600 m²). Les appartements : 2 680 €/m² en médiane (158 ventes). En 2024, les médianes étaient de 3 320 €/m² pour les maisons et 2 520 €/m² pour les appartements.</p><p style=\"font-size:.9em;opacity:.8;\">" + SRC + " Le rayon déborde un peu sur Dijon et Talant.</p>"),
    ("ce-que-regardent-les-acheteurs", "Ce que regardent les acheteurs",
     "<p>Le terrain et son exposition, la vue, l'état de la maison et son diagnostic énergétique, le stationnement, et le trajet vers le centre de Dijon. Une photo ne montre ni le jardin entier ni la vue : c'est là qu'un film et des prises de vue au drone font la différence, et ils sont compris quand vous me confiez votre bien.</p>"),
    ("comment-je-prepare-la-vente", "Comment je prépare la vente",
     "<p>Je visite, je compare avec les ventes réelles les plus proches, puis je vous remets un avis de valeur écrit qui explique le chiffre. Ensuite : photos, film, drone, mise en ligne avec l'agence GRAVELIN IMMO, visites, retour après chaque visite, vérification du financement des acheteurs, et suivi jusqu'au notaire. Un seul interlocuteur du début à la fin.</p>"),
  ],
  faq=[
    ("Quel est le prix d'une maison à Fontaine-lès-Dijon ?", "En 2025, la médiane des maisons vendues autour du centre de Fontaine-lès-Dijon est de 3 440 €/m² (DVF, 121 ventes). La moitié des ventes s'est faite entre 2 950 et 4 010 €/m²."),
    ("Quel est le prix d'un appartement à Fontaine-lès-Dijon ?", "Environ 2 680 €/m² en médiane pour les appartements vendus en 2025 autour du centre de la commune (DVF, 158 ventes)."),
    ("Combien de temps faut-il pour vendre une maison à Fontaine-lès-Dijon ?", "Cela dépend d'abord du prix de départ. Un bien au bon prix trouve en général ses acheteurs dans les premières semaines ; je vous donne un ordre de grandeur réaliste pour votre maison lors de l'estimation."),
    ("L'estimation est-elle payante ?", "Non. L'estimation est offerte et sans engagement : visite, comparaison avec les ventes réelles et avis de valeur écrit."),
    ("Puis-je avoir une première idée du prix en ligne ?", "Oui : l'<a class=\"link\" href=\"/estimer/\">estimation en ligne</a> donne une fourchette indicative à partir des ventes DVF proches de votre adresse. Elle se confirme ensuite par une visite."),
  ],
  links=links("/immobilier-fontaine-les-dijon/"),
))

# 4. NUITS-SAINT-GEORGES
P.append(dict(
  id="nuits", path="/immobilier-nuits-saint-georges/", date=DATE, date_fr=DATE_FR, service="Estimation et vente immobilière à Nuits-Saint-Georges", city="Nuits-Saint-Georges",
  title="Immobilier à Nuits-Saint-Georges : estimer et vendre",
  description="Vendre à Nuits-Saint-Georges et sur la Côte de Nuits : prix réels 2025 (DVF), maisons de village, méthode et estimation offerte par Shawez Ali.",
  label="Nuits-Saint-Georges", h1="Vendre à Nuits-Saint-Georges <em>et sur la Côte.</em>", h1_plain="Vendre à Nuits-Saint-Georges et sur la Côte",
  lede="Maisons de village, maisons de caractère, biens près des vignes : un marché à part, avec des acheteurs qui viennent souvent de loin.",
  image="/assets/shawez-ali-terrain-maison-pierre.webp", image_alt="Shawez Ali devant une maison en pierre",
  crumbs=[("Secteurs", "/secteurs-dijon-nuits-saint-georges-beaune/"), ("Nuits-Saint-Georges", "/immobilier-nuits-saint-georges/")],
  intro="Entre Dijon et Beaune, sur la Route des Grands Crus, Nuits-Saint-Georges a son propre marché. Je vous donne les repères de prix tirés des ventes réelles et la façon dont je présente un bien ici.",
  sections=[
    ("les-prix-a-nuits-saint-georges", "Les prix à Nuits-Saint-Georges",
     "<p>En 2025, les maisons vendues dans un rayon de 1,5 km autour du centre de Nuits-Saint-Georges se sont signées à 2 440 €/m² en médiane (40 ventes) ; les appartements à 1 980 €/m² (30 ventes). Avec aussi peu de ventes, ces chiffres bougent vite d'une année à l'autre : ils donnent un ordre de grandeur, pas un prix.</p><p style=\"font-size:.9em;opacity:.8;\">" + SRC + "</p>"),
    ("un-marche-a-part", "Un marché à part",
     "<p>Ici, beaucoup de biens sont des maisons de village anciennes, parfois avec cour, cave ou dépendances. Une partie des acheteurs vient de plus loin que la Côte. Ils découvrent le bien à distance avant de se déplacer : le film, les photos et le drone comptent autant que l'annonce elle-même.</p>"),
    ("comment-je-travaille", "Comment je travaille sur la Côte de Nuits",
     "<p>Je viens de Dijon, je visite, et je vous remets un avis de valeur écrit appuyé sur les ventes comparables. Si vous me confiez le bien : photos, film, drone, diffusion avec l'agence GRAVELIN IMMO, visites, retours après chaque visite et suivi jusqu'au notaire. J'interviens aussi à Gevrey-Chambertin et dans les villages voisins.</p>"),
  ],
  faq=[
    ("Quel est le prix au m² à Nuits-Saint-Georges ?", "En 2025, d'après les ventes DVF autour du centre : environ 2 440 €/m² en médiane pour une maison et 1 980 €/m² pour un appartement. Peu de ventes chaque année : à confirmer pour votre bien par une estimation."),
    ("Vous déplacez-vous à Nuits-Saint-Georges ?", "Oui, à Nuits-Saint-Georges, à Gevrey-Chambertin et dans les villages de la Côte. Appelez-moi au 07 67 57 92 28."),
    ("Combien coûte une estimation ?", "Rien : l'estimation est offerte et sans engagement, avec un avis de valeur écrit."),
    ("Comment vendre une maison de village ancienne ?", "Avec un dossier complet dès le départ : diagnostics à jour, factures de travaux, plan, et une présentation qui montre les volumes, la cour ou le jardin et l'environnement. C'est ce qui rassure un acheteur qui vient de loin."),
    ("Puis-je estimer mon bien en ligne ?", "Oui, l'<a class=\"link\" href=\"/estimer/\">estimation en ligne</a> fonctionne partout en Côte-d'Or. Quand il y a trop peu de ventes comparables, elle ne donne pas de fourchette et je vous rappelle."),
  ],
  links=links("/immobilier-nuits-saint-georges/"),
))

# 5. SUCCESSION
P.append(dict(
  id="succession", path="/conseils-vendeurs/vendre-maison-succession-dijon/", date=DATE, date_fr=DATE_FR, article=True, og_type="article",
  title="Vendre une maison en succession à Dijon : le guide",
  description="Héritiers d'accord ou non, vente avant la fin de la succession, notaire, délais, plus-value : vendre une maison reçue en héritage à Dijon, étape par étape.",
  label="Guide", h1="Vendre une maison <em>reçue en héritage.</em>", h1_plain="Vendre une maison reçue en héritage",
  lede="Qui doit être d'accord, quand on peut mettre en vente, ce que fait le notaire, et comment fixer le bon prix. Les étapes, dans l'ordre.",
  image="/assets/immeuble-ancien-angle-bourgogne.webp", image_alt="Immeuble ancien en pierre de Bourgogne",
  crumbs=[("Conseils", "/conseils-vendeurs/"), ("Vendre une maison en succession", "/conseils-vendeurs/vendre-maison-succession-dijon/")],
  intro="Vendre la maison d'un parent disparu, c'est souvent la première vente pour des héritiers qui ne vivent pas tous à Dijon. Les règles sont claires, mais il faut les prendre dans le bon ordre. Ce guide résume ce que prévoit la loi (sources : service-public.fr et Code civil) et ce que je fais concrètement. Il ne remplace pas le conseil de votre notaire.",
  sections=[
    ("1-qui-doit-etre-d-accord", "1. Qui doit être d'accord pour vendre",
     "<p>Tant que le partage n'est pas fait, la maison appartient à tous les héritiers en indivision. Pour la vendre, il faut l'accord de tous (article 815-3 du Code civil). Si l'un d'eux refuse ou ne répond pas, les héritiers qui détiennent au moins les deux tiers des droits peuvent demander au tribunal judiciaire l'autorisation de vendre (article 815-5-1). Si le conjoint survivant a l'usufruit, la vente demande aussi son accord.</p>"),
    ("2-peut-on-vendre-avant-la-fin", "2. Peut-on vendre avant la fin de la succession ?",
     "<p>Oui, on peut faire estimer la maison, signer un mandat et chercher un acheteur sans attendre. En revanche, la vente définitive chez le notaire suppose que le notaire ait établi l'attestation de propriété immobilière, qui transfère officiellement le bien aux héritiers. En pratique, on prévient le notaire dès le départ pour que les deux calendriers avancent ensemble.</p>"),
    ("3-le-role-du-notaire", "3. Le rôle du notaire et les délais",
     "<p>Le notaire règle la succession : acte de notoriété, attestation de propriété, déclaration de succession. Celle-ci doit en principe être déposée dans les six mois du décès quand il a eu lieu en France métropolitaine. Il n'existe pas de délai légal pour vendre la maison : c'est aux héritiers de choisir le moment.</p>"),
    ("4-fixer-le-bon-prix", "4. Fixer le bon prix dès le départ",
     "<p>La valeur de la maison est déclarée dans la succession, et c'est cette valeur qui sert de base si la vente dégage une plus-value. Une estimation juste dès le départ évite deux pièges : des droits calculés sur une valeur trop haute, ou une plus-value imposable si la valeur déclarée est trop basse. Je remets un avis de valeur écrit, appuyé sur les ventes réelles (DVF) autour de la maison, que vous pouvez transmettre au notaire.</p>"),
    ("5-vider-preparer-montrer", "5. Vider, préparer, montrer",
     "<p>Une maison de famille est souvent pleine. Il n'est pas toujours nécessaire de tout vider avant la mise en vente, mais un intérieur dégagé se photographie mieux et se visite mieux. Les diagnostics obligatoires sont à faire réaliser avant l'annonce. Ensuite, je m'occupe des photos, du film, du drone pour une maison, des visites et des retours, et je tiens tous les héritiers au courant, y compris ceux qui ne vivent pas à Dijon.</p>"),
  ],
  faq=[
    ("Est-ce que tous les héritiers doivent être d'accord pour vendre ?", "Oui, en principe la vente d'un bien en indivision demande l'accord de tous. Si l'un d'eux s'y oppose, les héritiers qui détiennent au moins les deux tiers des droits peuvent demander au tribunal judiciaire l'autorisation de vendre."),
    ("Est-il possible de mettre en vente une maison avant la fin d'une succession ?", "Oui : estimation, mandat et recherche d'acheteur peuvent commencer tout de suite. La signature de l'acte de vente suppose que le notaire ait établi l'attestation de propriété immobilière."),
    ("Quel est le délai pour vendre une maison après un décès ?", "Aucun délai légal n'impose de vendre. Seule la déclaration de succession a un délai : en principe six mois après le décès s'il a eu lieu en France métropolitaine."),
    ("Faut-il payer un impôt sur la plus-value en vendant une maison héritée ?", "Une plus-value peut être imposable si le prix de vente dépasse la valeur déclarée dans la succession, sauf exonération (par exemple si la maison est la résidence principale du vendeur). Votre notaire fait le calcul ; une estimation juste au départ limite les surprises."),
    ("Combien coûte l'estimation d'une maison de succession ?", "Rien : je me déplace, je visite et je vous remets un avis de valeur écrit, offert et sans engagement, que vous pouvez transmettre au notaire."),
  ],
  links=[("Choisir un agent immobilier à Dijon", "/conseils-vendeurs/choisir-agent-immobilier-dijon/"), ("Prix immobilier à Dijon au m²", "/prix-immobilier-dijon/"), ("Les trois premières semaines décident de votre vente", "/conseils-vendeurs/trois-premieres-semaines-vente/"), ("Le barème des honoraires", "/honoraires/")],
))

json.dump(P, open(sys.argv[1], 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print(len(P), 'pages')

#!/usr/bin/env python3
"""Blog international, articles en français (/conseils-vendeurs/) : acheteurs étrangers, Belges, Suisses,
Français de l'étranger, vendeurs qui veulent toucher la clientèle internationale. Sources citées et datées."""
from blog_commun import fr, L, X, LANGUES_FR

N_2024 = X("https://www.notaires.fr/fr/article/les-etrangers-non-residents-acquereurs-de-logements-en-france-metropolitaine",
           "étude des Notaires de France publiée en 2024")
CAPI = X("https://www.mysweetimmo.com/2026/07/07/immobilier-les-acheteurs-etrangers-font-leur-retour-en-france-qui-sont-ils/",
         "baromètre Capifrance des ventes 2025, juillet 2026")
CCF = X("https://www.boursorama.com/immobilier/actualites/achat-de-residences-secondaires-en-france-les-belges-detronent-les-britanniques-647f1b549b1c03c6b8885a608c938fa0",
        "étude CCF sur les ventes 2023, juillet 2024")
SELOGER = X("https://edito.seloger.com/actualites/france/immobilier-en-france-les-etrangers-representent-pres-de-6-des-acheteurs-article-30257.html",
            "chiffres des Notaires de France repris par SeLoger, janvier 2019")
PV_NR = X("https://www.impots.gouv.fr/international-particulier/questions/je-vends-un-bien-immobilier-comment-et-quel-taux-suis-je-impose",
          "impots.gouv.fr, page mise à jour le 27 janvier 2026")
NR_FICHE = X("https://www.impots.gouv.fr/sites/default/files/media/1_metier/5_international/actualite/fiches-relais/fiche_les-particularites-de-la-fiscalite-des-nr_vd_03-2026.pdf",
             "fiche impots.gouv.fr sur les non-résidents, mars 2026")
WA = '<a class="link" href="https://wa.me/33767579228">WhatsApp, 07 67 57 92 28</a>'

# --------------------------------------------------------------------------------------------- 1. CHIFFRES CLÉS
fr(
  id="fr-chiffres", path="/conseils-vendeurs/acheteurs-etrangers-chiffres-cles/",
  title="Acheteurs étrangers en France : les chiffres clés",
  description="Combien d'étrangers achètent en France, d'où ils viennent, avec quel budget : les chiffres sourcés des notaires, et ce qu'ils changent pour vendre.",
  label="Clientèle internationale", meta="Marché", crumb="Acheteurs étrangers : les chiffres",
  card="Acheteurs étrangers : les chiffres clés",
  card_desc="Combien, d'où, avec quel budget, et ce que ça change pour vendre en Bourgogne.",
  h1="Acheteurs étrangers en France : <em>les chiffres clés.</em>",
  h1_plain="Acheteurs étrangers en France : les chiffres clés",
  lede="On entend beaucoup de chiffres sur les acheteurs étrangers. Voici ceux qui ont une source, avec leur date, et "
       "ce que j'en retiens comme agent immobilier à Dijon.",
  image="/assets/shawez-ali-explique-prix-m2-dijon.webp", image_alt="Shawez Ali explique les chiffres du marché",
  img_w=512, img_h=640,
  intro="Chaque année, des dizaines de milliers de logements sont achetés en France par des étrangers, qui vivent "
        "en France ou à l'étranger. Pour un vendeur, c'est une clientèle à part entière, à condition de savoir lui "
        "parler.",
  sections=[
    ("part", "Quelle part des acheteurs ?",
     "<ul>"
     "<li><strong>Tous les acheteurs étrangers</strong>, résidents ou non : 5,4 % des acquéreurs de logements anciens en "
     "2017 et 5,9 % au premier semestre 2018 (" + SELOGER + ").</li>"
     "<li><strong>Les étrangers non-résidents</strong> seuls : 1,8 % des ventes de logements anciens en 2022, après "
     "1,3 % en 2021 et un pic à 2 % en 2015 (" + N_2024 + ").</li>"
     "</ul>"
     "<p>On cite souvent dans la profession environ 60 000 achats par an, 165 par jour, un budget moyen de 300 000 euros "
     "et 18 milliards d'euros par an. Ces ordres de grandeur collent avec une part d'environ 6 % d'un marché proche du "
     "million de ventes, mais je n'ai pas trouvé de publication officielle qui les donne tels quels. Je préfère donc "
     "vous montrer les chiffres des notaires, datés.</p>"),
    ("qui", "D'où ils viennent",
     "<ul>"
     "<li><strong>2022, non-résidents</strong> : Belges 19 %, Britanniques 17 %, Allemands 11 %, Néerlandais 10 % "
     "(" + N_2024 + ").</li>"
     "<li><strong>2023</strong> : Belges 19,5 %, Britanniques 16,4 % (" + CCF + ").</li>"
     "<li><strong>2025, ventes d'un réseau</strong> : Suisses 22 %, Belges 19 %, Britanniques 12 %, Américains 11 %, "
     "Néerlandais 8 %, Allemands 6 %, Golfe et monde arabe 5 %, Asie 4 % (" + CAPI + ").</li>"
     "</ul>"),
    ("budgets", "Leurs budgets",
     "<p>Dans le même baromètre 2025, 15 % des acheteurs étrangers ont dépensé moins de 100 000 euros, 34 % entre "
     "100 000 et 250 000, 33 % entre 250 000 et 500 000, 18 % entre 500 000 et 2,5 millions. Budgets moyens : environ "
     "370 000 euros pour les Suisses, 340 000 pour les Belges, 400 000 pour les Américains, 570 000 pour les acheteurs "
     "venus d'Asie (" + CAPI + ").</p>"
     "<p>Les notaires ont aussi observé qu'un non-résident paie en moyenne environ 13 % de plus qu'un résident pour une "
     "maison ancienne en province (" + N_2024 + ") : il choisit souvent des biens de caractère, et il connaît moins les "
     "prix locaux.</p>"),
    ("bourgogne", "Et en Bourgogne ?",
     "<p>Le baromètre 2025 note un intérêt croissant pour la Saône-et-Loire, le sud de la Bourgogne, notamment chez les "
     "Suisses et les Américains (" + CAPI + "). Les villages viticoles, les maisons de caractère, Dijon à une heure et "
     "demie de Paris : la Bourgogne a de quoi plaire. " + L("/conseils-vendeurs/pourquoi-les-etrangers-achetent-en-bourgogne/",
     "Pourquoi les étrangers achètent en Bourgogne") + ".</p>"),
    ("vendeur", "Ce que ça change si vous vendez",
     "<p>Un acheteur étranger regarde d'abord le film et les photos, depuis chez lui. Il veut des documents clairs, une "
     "réponse rapide et quelqu'un qui lui explique tout dans sa langue. C'est ce que je fais : film, visite vidéo en "
     "direct, et échanges en anglais ou dans sa langue. " + LANGUES_FR + "</p>"),
    ("sources", "Sources",
     "<ul><li>" + N_2024 + ".</li><li>" + CCF + ".</li><li>" + CAPI + ".</li><li>" + SELOGER + ".</li></ul>"),
  ],
  faq=[
    ("Combien d'étrangers achètent un logement en France ?",
     "Environ 5 à 6 % des acquéreurs de logements anciens en comptant les étrangers qui vivent en France (notaires, "
     "2017 et 2018), et 1,8 % pour les seuls non-résidents en 2022."),
    ("Quelles nationalités achètent le plus ?",
     "Chez les non-résidents, les Belges et les Britanniques depuis des années ; les Suisses et les Américains sont très "
     "présents dans les baromètres récents."),
    ("Les 60 000 achats par an, c'est vrai ?",
     "C'est un ordre de grandeur cohérent avec les études, mais je n'ai pas trouvé de source officielle qui le publie "
     "tel quel."),
    ("Un acheteur étranger paie-t-il plus cher ?",
     "Les notaires ont mesuré qu'un non-résident paie en moyenne environ 13 % de plus pour une maison ancienne en "
     "province, souvent parce qu'il choisit des biens de caractère."),
  ],
  links=[("Vendre à un acheteur étranger", "/conseils-vendeurs/vendre-a-un-acheteur-etranger/"),
         ("Les portails des acheteurs étrangers", "/conseils-vendeurs/portails-immobiliers-acheteurs-etrangers/"),
         ("Foreign buyers: the key figures (English)", "/en/foreign-buyers-in-france-key-figures/"),
         ("Estimer mon bien", "/estimer/")],
)

# --------------------------------------------------------------------------------------------- 2. VENDRE À UN ÉTRANGER
fr(
  id="fr-vendre-etranger", path="/conseils-vendeurs/vendre-a-un-acheteur-etranger/",
  title="Vendre à un acheteur étranger : ce qui change",
  description="Financement, origine des fonds, procuration, langue, délais : ce qui change quand votre acheteur vit à l'étranger ou ne parle pas français.",
  label="Clientèle internationale", meta="Vendre", crumb="Vendre à un acheteur étranger",
  card="Vendre à un acheteur étranger",
  card_desc="Financement, origine des fonds, procuration, langue : ce qui change pour vous.",
  h1="Vendre à un acheteur étranger : <em>ce qui change pour vous.</em>",
  h1_plain="Vendre à un acheteur étranger : ce qui change pour vous",
  lede="Un acheteur belge, suisse ou américain s'intéresse à votre maison. Bonne nouvelle. Voici ce qui change, et ce "
       "qui ne change pas.",
  image="/assets/shawez-ali-conseil-vendeur-dijon.webp", image_alt="Shawez Ali conseille un vendeur à Dijon",
  img_w=512, img_h=640,
  intro="La vente suit exactement les mêmes règles qu'avec un acheteur français : offre, compromis, délai de "
        "rétractation, acte chez le notaire. Ce qui change, c'est la distance, la langue et parfois le financement.",
  sections=[
    ("serieux", "Vérifier le sérieux de l'acheteur",
     "<p>Avant une visite, je demande à l'acheteur son plan de financement : apport, accord de principe d'une banque, ou "
     "justificatif de fonds s'il paie comptant. Un non-résident obtient un crédit en France, mais souvent avec plus "
     "d'apport et un peu plus de délai.</p>"),
    ("fonds", "L'origine des fonds",
     "<p>Le notaire, la banque et l'agence doivent vérifier l'identité de l'acheteur et l'origine de son argent, au "
     "titre de la lutte contre le blanchiment. L'argent arrive par virement sur le compte du notaire, jamais chez vous "
     "directement. C'est une protection pour vous.</p>"),
    ("distance", "Signer à distance",
     "<p>Le compromis se signe souvent électroniquement. Pour l'acte, l'acheteur peut donner procuration. Si l'acheteur "
     "ne parle pas français, le notaire peut demander un interprète, souvent assermenté, le jour de la signature, ou des "
     "documents traduits : prévoyez-le dès le compromis.</p>"),
    ("delais", "Les délais",
     "<p>Comptez les mêmes trois mois environ entre l'offre et l'acte. Ce qui peut retarder : une procuration à faire "
     "légaliser à l'étranger, un crédit de non-résident, un virement international. Un calendrier écrit dès l'offre "
     "évite les surprises.</p>"),
    ("langue", "Parler sa langue",
     "<p>Un acheteur étranger qui comprend chaque étape signe plus sereinement, et négocie moins sur la peur. "
     + LANGUES_FR + " J'explique le compromis, les diagnostics et la copropriété à l'acheteur, et je vous rends compte de "
     "tout, par écrit.</p>"),
  ],
  faq=[
    ("Un étranger peut-il acheter ma maison sans venir en France ?",
     "Oui : visite vidéo, compromis signé électroniquement, acte par procuration. La plupart viennent quand même une "
     "fois voir le bien."),
    ("Est-ce plus risqué de vendre à un non-résident ?",
     "Non, si son financement est vérifié avant la visite. L'argent passe par le notaire, qui contrôle aussi son "
     "origine."),
    ("Faut-il traduire le compromis ?",
     "Si l'acheteur ne parle pas français, le notaire peut demander un interprète ou des traductions. Prévoyez-le tôt."),
    ("Les délais sont-ils plus longs ?",
     "Souvent les mêmes, environ trois mois, à condition d'anticiper la procuration et le crédit."),
  ],
  links=[("Acheteurs étrangers : les chiffres", "/conseils-vendeurs/acheteurs-etrangers-chiffres-cles/"),
         ("Agent immobilier qui parle anglais à Dijon", "/conseils-vendeurs/agent-immobilier-qui-parle-anglais-dijon/"),
         ("Visiter à distance : ma méthode", "/conseils-vendeurs/visiter-un-bien-a-distance-video/"),
         ("Estimer mon bien", "/estimer/")],
)

# --------------------------------------------------------------------------------------------- 3. PORTAILS
fr(
  id="fr-portails", path="/conseils-vendeurs/portails-immobiliers-acheteurs-etrangers/",
  title="Les portails immobiliers des acheteurs étrangers",
  description='Rightmove, Green-Acres, Kyero, Properstar, Propriétés Le Figaro : où les acheteurs étrangers cherchent un bien en France, et ce qui compte.',
  label="Clientèle internationale", meta="Vendre", crumb="Les portails internationaux",
  card="Les portails des acheteurs étrangers",
  card_desc="Où cherchent les étrangers, et ce qui fait la différence dans une annonce.",
  h1="Les portails des acheteurs étrangers, <em>et ce qui fait la différence.</em>",
  h1_plain="Les portails des acheteurs étrangers, et ce qui fait la différence",
  lede="Un acheteur anglais ou suisse ne cherche pas forcément sur les mêmes sites qu'un Dijonnais. Voici où il "
       "cherche, et ce qu'il regarde.",
  image="/assets/shawez-ali-telephone-costume-bleu.webp", image_alt="Shawez Ali au téléphone avec un acheteur",
  img_w=1200, img_h=1500,
  intro="Les acheteurs étrangers commencent presque toujours sur un portail dans leur langue. Certains sites sont "
        "britanniques, d'autres internationaux, d'autres français mais très lus à l'étranger.",
  sections=[
    ("portails", "Les principaux portails",
     "<ul>"
     "<li><strong>Rightmove</strong> et <strong>Zoopla</strong> : les grands portails britanniques, avec leurs rubriques "
     "de biens à l'étranger.</li>"
     "<li><strong>Green-Acres</strong> : un portail consacré à l'immobilier français pour les acheteurs étrangers, en "
     "plusieurs langues.</li>"
     "<li><strong>Properstar</strong> : un portail international en de nombreuses langues.</li>"
     "<li><strong>Kyero</strong> : né pour l'Espagne, il publie aussi des biens en France.</li>"
     "<li><strong>French-Property.com</strong> et <strong>A Place in the Sun</strong> : des sites en anglais, le second "
     "lié à l'émission de télévision britannique.</li>"
     "<li><strong>ListGlobally</strong> : un réseau qui transmet les annonces des agences à des portails partenaires à "
     "l'étranger.</li>"
     "<li><strong>Propriétés Le Figaro</strong> et <strong>Résidences Immobilier</strong> : les sites français des biens "
     "de prestige.</li>"
     "</ul>"),
    ("doublons", "Le piège des doublons",
     "<p>Quand un bien est confié à plusieurs agences, il apparaît plusieurs fois, parfois à des prix différents, et "
     "parfois converti en livres ou en francs suisses. Pour un acheteur à distance, c'est un mauvais signal : il se "
     "demande quel est le vrai prix. Une annonce unique, claire, avec le prix honoraires inclus et les diagnostics, "
     "rassure.</p>"),
    ("ce-qui-compte", "Ce que regarde un acheteur étranger",
     "<ul>"
     "<li>Le film et les photos, avant tout : il ne peut pas passer « juste voir ».</li>"
     "<li>Le prix clair, la surface, le DPE, la taxe foncière.</li>"
     "<li>Les distances : la gare TGV, l'aéroport, Beaune, les commerces.</li>"
     "<li>Une réponse rapide, dans sa langue.</li>"
     "</ul>"),
    ("vitesse", "Les bons biens partent avant",
     "<p>Un bien au bon prix se vend souvent avant d'avoir fait le tour des portails étrangers. C'est pour ça que je "
     "garde le contact avec les acheteurs qui cherchent depuis l'étranger, et que je leur envoie le film dès qu'un bien "
     "correspond.</p>"),
    ("moi", "Ce que je fais pour votre bien",
     "<p>Chaque bien a son film, ses photos, sa visite virtuelle et, pour les maisons, des vues de drone. Je présente "
     "votre bien aux acheteurs étrangers en anglais ou dans leur langue, en visite vidéo en direct. " + LANGUES_FR + "</p>"),
  ],
  faq=[
    ("Où les étrangers cherchent-ils un bien en France ?",
     "Sur des portails comme Green-Acres, Properstar, Rightmove, Zoopla, Kyero, French-Property.com ou A Place in the "
     "Sun, et sur les sites français de prestige."),
    ("Faut-il confier mon bien à plusieurs agences pour toucher les étrangers ?",
     "Les doublons à des prix différents inquiètent les acheteurs à distance. Une annonce unique et claire inspire plus "
     "confiance."),
    ("Mon annonce doit-elle être en anglais ?",
     "Elle doit surtout être claire, avec un film. Ensuite, ce qui compte, c'est de pouvoir parler à l'acheteur dans sa "
     "langue."),
    ("Vous parlez quelles langues ?",
     "Le français et l'anglais tous les jours, et aussi le hindi, l'ourdou, le pendjabi, le persan, le grec et "
     "l'arabe : je peux parler à l'acheteur dans sa langue."),
  ],
  links=[("Acheteurs étrangers : les chiffres", "/conseils-vendeurs/acheteurs-etrangers-chiffres-cles/"),
         ("La première photo décide", "/conseils-vendeurs/premiere-photo-annonce-immobiliere/"),
         ("Vendre à un acheteur étranger", "/conseils-vendeurs/vendre-a-un-acheteur-etranger/"),
         ("Estimer mon bien", "/estimer/")],
)

# --------------------------------------------------------------------------------------------- 4. BELGIQUE
fr(
  id="fr-belgique", path="/conseils-vendeurs/acheter-en-bourgogne-depuis-la-belgique/",
  title="Acheter en Bourgogne quand on vit en Belgique",
  description='Les Belges sont les premiers acheteurs étrangers en France. Notaire, rétractation, impôts, distances : le guide pour acheter en Bourgogne.',
  label="Clientèle internationale", meta="Belgique", crumb="Acheter depuis la Belgique",
  card="Acheter en Bourgogne depuis la Belgique",
  card_desc="Notaire, compromis, rétractation, impôts et distances : le guide pour les Belges.",
  h1="Acheter en Bourgogne <em>quand on vit en Belgique.</em>",
  h1_plain="Acheter en Bourgogne quand on vit en Belgique",
  lede="Une maison de pierre près de Beaune, à une journée de route de Bruxelles : beaucoup de Belges en rêvent, et "
       "beaucoup le font.",
  image="/assets/maison-pierre-terrasse-jardin.webp", image_alt="Maison de pierre avec terrasse et jardin en Bourgogne",
  intro="En 2022, les Belges représentaient 19 % des achats des étrangers non-résidents en France, devant les "
        "Britanniques (" + N_2024 + "), et ils restaient premiers en 2023 avec 19,5 % (" + CCF + ").",
  sections=[
    ("proche", "Un système proche du vôtre",
     "<p>Comme en Belgique, la vente se signe devant un notaire, officier public. Les étapes ressemblent aux vôtres : "
     "offre, compromis, acte authentique. Deux différences à connaître : en France, l'acheteur particulier dispose de "
     "dix jours de rétractation après le compromis, et l'acte est signé en général deux à trois mois après.</p>"),
    ("frais", "Les frais",
     "<p>En plus du prix, l'acheteur paie les frais de notaire, surtout des taxes : de l'ordre de 7 à 8 % pour un bien "
     "ancien, beaucoup moins dans le neuf. Les honoraires d'agence sont indiqués dans l'annonce.</p>"),
    ("impots", "Les impôts",
     "<p>Les revenus et les plus-values d'un bien situé en France sont en principe imposés en France ; la Belgique en "
     "tient compte selon ses propres règles et la convention fiscale. Votre conseiller belge vous dira comment. À la "
     "revente, comme vous vivez dans l'Union européenne, pas besoin de représentant fiscal, et si vous êtes affilié à la "
     "sécurité sociale belge, seul le prélèvement de solidarité de 7,5 % s'ajoute aux 19 % d'impôt (" + PV_NR + ").</p>"),
    ("distance", "Les distances",
     "<p>Comptez environ cinq à six heures de route depuis Bruxelles. La Bourgogne se prête bien à une résidence "
     "secondaire pour les week-ends prolongés et les vacances.</p>"),
    ("biens", "Ce que cherchent les Belges",
     "<p>Les notaires ont observé que les acheteurs belges, néerlandais et britanniques achètent surtout des maisons, "
     "souvent grandes, pour moitié à la campagne (" + SELOGER + "). En Bourgogne : maisons de village avec terrain, "
     "corps de ferme dans les Hautes-Côtes ou l'Auxois, maisons de maître, et parfois un château. "
     + L("/chateau-a-vendre-bourgogne/", "Châteaux et biens de prestige") + ".</p>"),
    ("moi", "Avec moi",
     "<p>Je vous envoie les films des biens, je vous les montre en direct en vidéo, et je prépare une journée de visites "
     "pour que vous ne fassiez qu'un aller-retour. " + LANGUES_FR + "</p>"),
  ],
  faq=[
    ("Un Belge peut-il acheter en France comme un Français ?",
     "Oui, exactement aux mêmes conditions."),
    ("Y a-t-il un délai de rétractation en France ?",
     "Oui, dix jours pour l'acheteur particulier d'un logement, après la remise du compromis signé."),
    ("Faut-il un représentant fiscal pour revendre ?",
     "Non, si vous vivez dans l'Union européenne."),
    ("Combien de temps depuis Bruxelles ?",
     "Environ cinq à six heures de route."),
  ],
  links=[("Acheter en Bourgogne depuis la Suisse", "/conseils-vendeurs/acheter-en-bourgogne-depuis-la-suisse/"),
         ("Acheteurs étrangers : les chiffres", "/conseils-vendeurs/acheteurs-etrangers-chiffres-cles/"),
         ("Buying from Benelux and Germany (English)", "/en/buying-in-burgundy-from-benelux-and-germany/"),
         ("Biens à vendre", "/biens-a-vendre-dijon/")],
)

# --------------------------------------------------------------------------------------------- 5. SUISSE
fr(
  id="fr-suisse", path="/conseils-vendeurs/acheter-en-bourgogne-depuis-la-suisse/",
  title="Acheter en Bourgogne quand on vit en Suisse",
  description='Distances, francs suisses, crédit, impôts, revente et représentant fiscal : le guide pour acheter en Bourgogne quand on vit en Suisse.',
  label="Clientèle internationale", meta="Suisse", crumb="Acheter depuis la Suisse",
  card="Acheter en Bourgogne depuis la Suisse",
  card_desc="Distances, francs suisses, crédit, impôts et revente : le guide pour les Suisses.",
  h1="Acheter en Bourgogne <em>quand on vit en Suisse.</em>",
  h1_plain="Acheter en Bourgogne quand on vit en Suisse",
  lede="De Genève ou de Lausanne, la Bourgogne est à quelques heures. Pour une résidence secondaire ou un projet de vie, "
       "voici l'essentiel.",
  image="/assets/chateau-xixe-parc-topiaires.webp", image_alt="Château du XIXe siècle et son parc en Bourgogne",
  intro="Dans le baromètre 2025 d'un grand réseau, les Suisses arrivent en tête des acheteurs étrangers avec 22 % des "
        "ventes et un budget moyen d'environ 370 000 euros. Ils privilégient les départements proches de la frontière, "
        "dont la Saône-et-Loire, au sud de la Bourgogne (" + CAPI + ").",
  sections=[
    ("distance", "Les distances",
     "<p>Genève est à environ deux heures et demie à trois heures de route de Dijon. En train, on rejoint Lausanne puis "
     "Genève. Beaune est à quarante minutes de Dijon.</p>"),
    ("change", "Francs suisses et euros",
     "<p>Le taux de change peut faire varier votre budget entre l'offre et l'acte. Comparez les virements et demandez "
     "s'il est possible de fixer un taux à l'avance. L'argent passe par le compte du notaire, jamais chez le vendeur.</p>"),
    ("credit", "Le crédit",
     "<p>Pour financer un bien situé en France, comparez une banque française habituée aux résidents suisses et les "
     "possibilités de votre banque. Un courtier fait gagner du temps. Le compromis prévoit une condition de prêt qui "
     "vous protège.</p>"),
    ("impots", "Les impôts et la revente",
     "<p>Les revenus d'un bien en France sont en principe imposés en France, la Suisse en tenant compte selon la "
     "convention fiscale. À la revente : 19 % d'impôt sur la plus-value, et seulement le prélèvement de solidarité de "
     "7,5 % si vous êtes affilié à la sécurité sociale suisse. La Suisse ne fait pas partie des pays dispensés : un "
     "représentant fiscal est nécessaire si le prix dépasse 150 000 euros par vendeur, sauf exonération totale "
     "(" + PV_NR + ").</p>"),
    ("biens", "Ce que vous trouverez",
     "<p>Villages viticoles de la Côte de Nuits et de la Côte de Beaune, maisons de maître, châteaux, appartements de "
     "caractère à Dijon et à Beaune. " + L("/chateau-a-vendre-bourgogne/", "Châteaux et biens de prestige") + ".</p>"),
    ("moi", "Avec moi",
     "<p>Films, visites vidéo en direct, et une journée de visites organisée pour un seul aller-retour. "
     + LANGUES_FR + "</p>"),
  ],
  faq=[
    ("Un Suisse peut-il acheter en France ?",
     "Oui, sans restriction, aux mêmes conditions qu'un Français."),
    ("Faut-il un représentant fiscal pour revendre depuis la Suisse ?",
     "Oui si le prix dépasse 150 000 euros par vendeur, sauf si la plus-value est totalement exonérée."),
    ("Quels prélèvements sociaux à la revente ?",
     "Seulement le prélèvement de solidarité de 7,5 % si vous êtes affilié à la sécurité sociale suisse."),
    ("Combien de temps depuis Genève ?",
     "Environ deux heures et demie à trois heures de route jusqu'à Dijon."),
  ],
  links=[("Acheter en Bourgogne depuis la Belgique", "/conseils-vendeurs/acheter-en-bourgogne-depuis-la-belgique/"),
         ("Pourquoi les étrangers achètent en Bourgogne", "/conseils-vendeurs/pourquoi-les-etrangers-achetent-en-bourgogne/"),
         ("Châteaux et biens de prestige", "/chateau-a-vendre-bourgogne/"),
         ("Biens à vendre", "/biens-a-vendre-dijon/")],
)

# --------------------------------------------------------------------------------------------- 6. EXPATRIÉS
fr(
  id="fr-expatrie", path="/conseils-vendeurs/francais-expatrie-acheter-a-dijon/",
  title="Français expatrié : acheter à Dijon depuis l'étranger",
  description="Crédit de non-résident, impôts, procuration, visites vidéo : comment un Français de l'étranger achète à Dijon, avant son retour ou pour investir.",
  label="Clientèle internationale", meta="Expatriés", crumb="Français de l'étranger",
  card="Français expatrié : acheter à Dijon",
  card_desc="Crédit, impôts, procuration et visites vidéo pour les Français de l'étranger.",
  h1="Français de l'étranger : <em>acheter à Dijon sans être là.</em>",
  h1_plain="Français de l'étranger : acheter à Dijon sans être là",
  lede="Vous vivez à Londres, Montréal ou Dubaï et vous préparez votre retour, ou un investissement. Voici comment "
       "acheter à Dijon à distance.",
  image="/assets/appartement-ancien-salon-lumineux.webp", image_alt="Salon lumineux d'un appartement ancien à Dijon",
  intro="Pour l'administration fiscale, un Français qui vit à l'étranger est un non-résident. Cela change le crédit et "
        "les impôts, pas le droit d'acheter.",
  sections=[
    ("credit", "Le crédit de non-résident",
     "<p>Les banques françaises prêtent aux Français de l'étranger, en général avec un apport plus important et des "
     "revenus vérifiés avec prudence quand ils sont en devises. Un courtier habitué aux expatriés fait gagner du temps. "
     "Pour une première idée des mensualités : " + L("/simulateur-pret-immobilier-dijon/", "mon simulateur de prêt")
     + ".</p>"),
    ("impots", "Les impôts si vous louez",
     "<p>Les loyers d'un bien en France sont imposés en France, à un taux minimum de 20 % jusqu'à 29 579 euros de revenus "
     "perçus en 2025, puis 30 %, sauf si le taux moyen calculé sur vos revenus mondiaux est plus favorable (" + NR_FICHE
     + "). S'y ajoutent les prélèvements sociaux, réduits à 7,5 % si vous êtes affilié à la sécurité sociale d'un pays "
     "de l'Union européenne, de l'Espace économique européen ou de Suisse.</p>"),
    ("retour", "Si vous comptez revenir",
     "<p>Acheter avant le retour permet de choisir sans urgence. Le bien deviendra votre résidence principale quand vous "
     "y habiterez. À la revente d'un bien en France, des exonérations existent pour les anciens résidents, sous "
     "conditions strictes : demandez au notaire avant d'acheter.</p>"),
    ("distance", "Acheter à distance",
     "<p>Films, visites vidéo en direct, compromis signé électroniquement, acte par procuration : vous pouvez tout faire "
     "depuis l'étranger. " + L("/conseils-vendeurs/visiter-un-bien-a-distance-video/", "Ma méthode de visite à distance")
     + ".</p>"),
    ("dijon", "Pourquoi Dijon",
     "<p>Une heure et demie de Paris en TGV, une ville à taille humaine, des prix sans commune mesure avec Paris, et les "
     "vignes au bout de la rue. " + L("/prix-immobilier-dijon/", "Les prix réels à Dijon") + ". " + LANGUES_FR + "</p>"),
  ],
  faq=[
    ("Un Français expatrié peut-il obtenir un crédit en France ?",
     "Oui, en général avec un apport plus important. Un courtier habitué aux expatriés aide beaucoup."),
    ("Comment sont imposés les loyers d'un expatrié ?",
     "En France, à un taux minimum de 20 % puis 30 %, ou au taux moyen s'il est plus favorable, plus les prélèvements "
     "sociaux."),
    ("Peut-on tout faire depuis l'étranger ?",
     "Oui : visite vidéo, compromis électronique, acte par procuration."),
    ("Que se passe-t-il quand je reviens habiter le bien ?",
     "Il devient votre résidence principale. Faites le point avec le notaire sur les règles qui s'appliqueront."),
  ],
  links=[("Visiter à distance : ma méthode", "/conseils-vendeurs/visiter-un-bien-a-distance-video/"),
         ("Vendre son bien depuis l'étranger", "/conseils-vendeurs/vendre-son-bien-en-vivant-a-l-etranger/"),
         ("Simulateur de prêt", "/simulateur-pret-immobilier-dijon/"),
         ("Prix immobilier à Dijon", "/prix-immobilier-dijon/")],
)

# --------------------------------------------------------------------------------------------- 7. VISITE À DISTANCE
fr(
  id="fr-visite-distance", path="/conseils-vendeurs/visiter-un-bien-a-distance-video/",
  title="Visiter un bien à distance : ma méthode en vidéo",
  description="Film, drone, visite WhatsApp en direct, documents envoyés avant : comment je fais visiter un bien à un acheteur qui vit à l'étranger.",
  label="Clientèle internationale", meta="Méthode", crumb="Visiter à distance",
  card="Visiter un bien à distance : ma méthode",
  card_desc="Film, drone, visite vidéo en direct : comment un acheteur choisit sans se déplacer.",
  h1="Visiter un bien à distance : <em>ma méthode.</em>",
  h1_plain="Visiter un bien à distance : ma méthode",
  lede="La plupart de mes acheteurs de l'étranger ne se déplacent qu'une fois, pour le bien qu'ils ont déjà choisi. "
       "Voici comment ils choisissent depuis chez eux.",
  image="/assets/equipe-03-shawez-videaste-appartement-trepied-800.webp",
  image_alt="Tournage du film d'un appartement par l'équipe de Shawez Ali", img_w=800, img_h=1067,
  intro="Un acheteur à distance a besoin de voir, de comprendre et de faire confiance. Trois étapes, toujours les "
        "mêmes.",
  sections=[
    ("film", "1. Le film du bien",
     "<p>Chaque bien que je vends a son film monté, ses photos, sa visite virtuelle quand elle existe et, pour les "
     "maisons, des vues de drone : la toiture, le terrain, les environs. " + L("/videos-immobilier-dijon/",
     "Les films des biens") + ".</p>"),
    ("direct", "2. La visite en direct",
     "<p>Ensuite, je fais la visite en direct sur WhatsApp en vidéo : l'acheteur me demande d'ouvrir un placard, de "
     "montrer la vue, d'aller à la cave, d'écouter le bruit de la rue. Il pose ses questions sur le moment, dans sa "
     "langue.</p>"),
    ("documents", "3. Les documents avant de se décider",
     "<p>Avant toute offre, j'envoie les diagnostics, la dernière taxe foncière, et pour un appartement les "
     "procès-verbaux d'assemblée générale et les charges. L'acheteur décide sur pièces, pas sur une impression.</p>"),
    ("limites", "Ce qu'une vidéo ne montre pas",
     "<p>L'odeur, l'humidité d'une cave, le voisinage un samedi soir, un chantier prévu à côté : je le dis à l'acheteur, "
     "même quand ce n'est pas flatteur. C'est ce qui rend la visite à distance fiable.</p>"),
    ("vendeur", "Pour vous, vendeur",
     "<p>Un bien bien filmé est vu par des acheteurs qui n'auraient jamais fait le déplacement. Et les visites physiques "
     "sont moins nombreuses, mais plus sérieuses. " + LANGUES_FR + "</p>"),
  ],
  faq=[
    ("Peut-on acheter un bien sans l'avoir visité ?",
     "C'est possible après une visite vidéo détaillée et l'étude des documents, mais la plupart de mes acheteurs "
     "viennent une fois avant l'acte."),
    ("Sur quelle application faites-vous les visites vidéo ?",
     "Sur WhatsApp, en direct, dans la langue de l'acheteur."),
    ("Quels documents recevez-vous avant de faire une offre ?",
     "Les diagnostics, la taxe foncière et, pour un appartement, les procès-verbaux d'assemblée et les charges."),
    ("Est-ce que ça sert aussi au vendeur ?",
     "Oui : le bien est vu par plus d'acheteurs, et les visites physiques sont plus sérieuses."),
  ],
  links=[("Les films des biens", "/videos-immobilier-dijon/"),
         ("Vendre à un acheteur étranger", "/conseils-vendeurs/vendre-a-un-acheteur-etranger/"),
         ("Français expatrié : acheter à Dijon", "/conseils-vendeurs/francais-expatrie-acheter-a-dijon/"),
         ("Estimer mon bien", "/estimer/")],
)

# --------------------------------------------------------------------------------------------- 8. POURQUOI LA BOURGOGNE
fr(
  id="fr-pourquoi", path="/conseils-vendeurs/pourquoi-les-etrangers-achetent-en-bourgogne/",
  title="Pourquoi les étrangers achètent en Bourgogne",
  description='Les vins et les Climats, les maisons de caractère, le TGV, la Suisse à quelques heures, les prix : ce qui attire les étrangers en Bourgogne.',
  label="Clientèle internationale", meta="Marché", crumb="Pourquoi la Bourgogne",
  card="Pourquoi les étrangers achètent en Bourgogne",
  card_desc="Les vins, les maisons de caractère, l'accès et les prix : ce qui les attire.",
  h1="Pourquoi les étrangers <em>achètent en Bourgogne.</em>",
  h1_plain="Pourquoi les étrangers achètent en Bourgogne",
  lede="Moins connue à l'étranger que la Provence, la Bourgogne attire pourtant des acheteurs du monde entier. Voici "
       "pourquoi, et ce que ça change pour vendre.",
  image="/assets/st-village.webp", image_alt="Toits d'un village de Bourgogne vus du ciel", img_w=720, img_h=1280,
  intro="Quand un acheteur étranger me dit pourquoi il cherche ici, ce sont presque toujours les mêmes raisons.",
  sections=[
    ("vin", "Le vin et les paysages",
     "<p>Les Climats du vignoble de Bourgogne, de Dijon au sud de Beaune, sont inscrits au patrimoine mondial de "
     "l'Unesco depuis 2015. La Route des Grands Crus, la vente des Hospices de Beaune chaque novembre, la Cité "
     "internationale de la gastronomie et du vin à Dijon depuis 2022 : la région parle aux amateurs du monde entier.</p>"),
    ("maisons", "Les maisons de caractère",
     "<p>Maisons vigneronnes avec cave voûtée, maisons de maître avec jardin clos, corps de ferme dans les Hautes-Côtes, "
     "châteaux : des biens qu'on trouve rarement ailleurs à ce prix.</p>"),
    ("acces", "L'accès",
     "<p>Paris à une heure et demie en TGV, Lyon à deux heures, Genève à deux heures et demie à trois heures de route, "
     "la Belgique et le Luxembourg à une journée : une résidence secondaire en Bourgogne reste facile à rejoindre.</p>"),
    ("prix", "Les prix",
     "<p>À surface égale, les prix restent loin de Paris, de la Côte d'Azur ou des Alpes. " + L("/prix-immobilier-cote-d-or/",
     "Les prix réels en Côte-d'Or") + ", d'après les ventes enregistrées chez les notaires.</p>"),
    ("tendance", "Une tendance qui se confirme",
     "<p>Le baromètre 2025 d'un grand réseau note un intérêt croissant pour la Saône-et-Loire, chez les Suisses et les "
     "Américains notamment (" + CAPI + "). " + L("/conseils-vendeurs/acheteurs-etrangers-chiffres-cles/",
     "Les chiffres clés des acheteurs étrangers") + ".</p>"),
    ("vendre", "Ce que ça change pour vendre",
     "<p>Si votre bien a du caractère, un acheteur étranger fait peut-être partie de vos acheteurs. Il faut alors un "
     "film, des documents clairs et quelqu'un qui lui parle dans sa langue. " + LANGUES_FR + "</p>"),
  ],
  faq=[
    ("Les étrangers achètent-ils beaucoup en Bourgogne ?",
     "La région est moins connue à l'étranger que la Provence, mais elle attire des acheteurs suisses, belges, "
     "britanniques et américains, notamment pour les villages viticoles."),
    ("Qu'est-ce qui les attire ?",
     "Le vin et les paysages, les maisons de caractère, l'accès à Paris et à la Suisse, et des prix raisonnables."),
    ("Mon bien peut-il intéresser un acheteur étranger ?",
     "S'il a du caractère, oui. Il faut alors le présenter avec un film et des documents clairs."),
    ("Parlez-vous anglais ?",
     "Oui, tous les jours, comme le français. Je parle aussi le hindi, l'ourdou, le pendjabi, le persan, le grec et "
     "l'arabe."),
  ],
  links=[("Acheteurs étrangers : les chiffres", "/conseils-vendeurs/acheteurs-etrangers-chiffres-cles/"),
         ("Agent immobilier qui parle anglais", "/conseils-vendeurs/agent-immobilier-qui-parle-anglais-dijon/"),
         ("Where foreigners buy in France (English)", "/en/where-foreigners-buy-in-france/"),
         ("Estimer mon bien", "/estimer/")],
)

# --------------------------------------------------------------------------------------------- 9. AGENT QUI PARLE ANGLAIS
fr(
  id="fr-anglais", path="/conseils-vendeurs/agent-immobilier-qui-parle-anglais-dijon/",
  title="Agent immobilier qui parle anglais à Dijon",
  description='Anglais, hindi, ourdou, pendjabi, persan, grec, arabe : pourquoi je me spécialise dans la clientèle internationale à Dijon, et ce que ça change.',
  label="Clientèle internationale", meta="Mon parcours", crumb="Agent qui parle anglais",
  card="Un agent immobilier qui parle anglais à Dijon",
  card_desc="Mes langues, et pourquoi je me spécialise dans la clientèle internationale.",
  h1="Un agent immobilier qui parle anglais, <em>et six autres langues.</em>",
  h1_plain="Un agent immobilier qui parle anglais, et six autres langues",
  lede="Je m'appelle Shawez Ali, agent immobilier à Dijon. Je parle plusieurs langues, et j'en ai fait une partie de "
       "mon métier.",
  image="/assets/shawez-ali-portrait-sourire-720.webp", image_alt="Shawez Ali, agent immobilier à Dijon",
  intro="Vendre ou acheter un bien, c'est signer des documents qui engagent pour des années. Quand on ne maîtrise pas "
        "la langue, chaque ligne inquiète. C'est là que je peux aider.",
  sections=[
    ("langues", "Mes langues",
     "<p>" + LANGUES_FR + " Je peux donc expliquer un compromis, un diagnostic ou un procès-verbal de copropriété "
     "directement dans la langue de mon interlocuteur.</p>"),
    ("vendeurs", "Pour vous, vendeur",
     "<p>Un acheteur qui comprend tout négocie moins sur la peur et va au bout plus sereinement. Quand votre acheteur "
     "est anglais, américain, indien, pakistanais, iranien ou vient du Golfe, je lui parle dans sa langue ; sinon, en "
     "anglais. Et je vous rends compte de tout par écrit, en français.</p>"),
    ("couples", "Pour les couples et les familles",
     "<p>Beaucoup de mes clients à Dijon sont des couples où l'un des deux ne parle pas encore bien français. Je "
     "m'assure que les deux comprennent ce qu'ils signent, chez moi comme chez le notaire.</p>"),
    ("pourquoi", "Pourquoi je me spécialise",
     "<p>Parce que la Bourgogne mérite d'être connue au-delà de la France, et parce qu'un acheteur étranger qui cherche "
     "ici devrait trouver un interlocuteur qui lui parle sa langue. J'ai écrit pour eux des guides en anglais : "
     + L("/en/guides/", "Guides for international buyers") + ".</p>"),
    ("contact", "Me joindre",
     "<p>Sur " + WA + ", par téléphone, par e-mail, ou à l'agence GRAVELIN IMMO, 30 rue Bannelier à Dijon.</p>"),
  ],
  faq=[
    ("Quelles langues parlez-vous ?", LANGUES_FR),
    ("Pouvez-vous expliquer le compromis à un acheteur anglophone ?",
     "Oui, ligne par ligne, et je vous en rends compte en français."),
    ("Travaillez-vous avec des acheteurs qui vivent à l'étranger ?",
     "Oui : films, visites vidéo en direct, signature électronique et procuration pour l'acte."),
    ("Où vous trouver ?",
     "À l'agence GRAVELIN IMMO, 30 rue Bannelier à Dijon, ou sur WhatsApp au 07 67 57 92 28."),
  ],
  links=[("Guides for international buyers (English)", "/en/guides/"),
         ("Vendre à un acheteur étranger", "/conseils-vendeurs/vendre-a-un-acheteur-etranger/"),
         ("Qui suis-je", "/shawez-ali-agent-immobilier-dijon/"),
         ("Estimer mon bien", "/estimer/")],
)

# --------------------------------------------------------------------------------------------- 10. VENDRE DEPUIS L'ÉTRANGER
fr(
  id="fr-vendre-depuis-etranger", path="/conseils-vendeurs/vendre-son-bien-en-vivant-a-l-etranger/",
  title="Vendre son bien à Dijon quand on vit à l'étranger",
  description="Estimation, procuration, plus-value des non-résidents et représentant fiscal : comment vendre votre bien en Bourgogne en vivant à l'étranger.",
  label="Clientèle internationale", meta="Vendre", crumb="Vendre depuis l'étranger",
  card="Vendre son bien en vivant à l'étranger",
  card_desc="Estimation, procuration, plus-value des non-résidents et représentant fiscal.",
  h1="Vendre son bien à Dijon <em>en vivant à l'étranger.</em>",
  h1_plain="Vendre son bien à Dijon en vivant à l'étranger",
  lede="Vous êtes parti vivre ailleurs, et votre appartement ou votre maison est resté en Bourgogne. Voici comment je le "
       "vends pour vous, sans que vous ayez à revenir.",
  image="/assets/ph-balcon.webp", image_alt="Shawez Ali sur un balcon avec un panneau à vendre GRAVELIN IMMO",
  img_w=1100, img_h=1815,
  intro="Vendre à distance fonctionne quand une seule personne s'occupe de tout sur place et vous tient informé par "
        "écrit. C'est mon rôle.",
  sections=[
    ("etapes", "Les étapes",
     "<ol>"
     "<li><strong>L'estimation</strong>, offerte et sans engagement, avec les ventes réelles autour du bien.</li>"
     "<li><strong>Le mandat</strong>, signé électroniquement, et les diagnostics que je commande.</li>"
     "<li><strong>Le film, les photos, les visites</strong> : vous pouvez me laisser un jeu de clés.</li>"
     "<li><strong>Les offres</strong>, que je vous transmets avec mon avis.</li>"
     "<li><strong>Le compromis</strong> signé électroniquement, puis <strong>l'acte</strong> par procuration.</li>"
     "</ol>"),
    ("impot", "L'impôt sur la plus-value",
     "<p>Un non-résident paie 19 % d'impôt sur la plus-value, plus des prélèvements sociaux : 17,2 % hors Union "
     "européenne, Espace économique européen et Suisse, ou seulement le prélèvement de solidarité de 7,5 % pour les "
     "personnes affiliées à la sécurité sociale de ces pays. Des abattements s'appliquent selon la durée de détention : "
     "exonération d'impôt après 22 ans et de prélèvements sociaux après 30 ans (" + PV_NR + ").</p>"),
    ("representant", "Le représentant fiscal",
     "<p>Il n'est pas nécessaire si vous vivez dans l'Union européenne, en Islande ou en Norvège, si le prix ne dépasse "
     "pas 150 000 euros par vendeur, ou si la plus-value est totalement exonérée. Sinon, le notaire vous orientera vers "
     "un représentant accrédité.</p>"),
    ("exonerations", "Les exonérations pour les anciens résidents",
     "<p>Si le bien était votre résidence principale avant votre départ, ou dans certaines limites, des exonérations "
     "existent sous conditions strictes. Le notaire les vérifie avant la vente : posez-lui la question dès "
     "l'estimation.</p>"),
    ("argent", "L'argent",
     "<p>Le notaire paie l'impôt et, s'il y en a un, le solde du crédit, puis vous vire le reste. Je vous tiens informé à "
     "chaque étape. " + LANGUES_FR + "</p>"),
  ],
  faq=[
    ("Peut-on vendre sans revenir en France ?",
     "Oui : mandat et compromis signés électroniquement, acte par procuration."),
    ("Quel impôt paie un non-résident sur la plus-value ?",
     "19 % plus 17,2 % de prélèvements sociaux, ou 7,5 % pour les affiliés à une sécurité sociale de l'Union européenne, "
     "de l'Espace économique européen ou de Suisse, avec des abattements pour durée de détention."),
    ("Ai-je besoin d'un représentant fiscal ?",
     "Pas si vous vivez dans l'Union européenne, en Islande ou en Norvège, si le prix est d'au plus 150 000 euros par "
     "vendeur, ou si la plus-value est totalement exonérée."),
    ("L'estimation est-elle payante ?",
     "Non, elle est offerte et sans engagement."),
  ],
  links=[("Estimer mon bien", "/estimer/"),
         ("Vendre une maison en succession", "/conseils-vendeurs/vendre-maison-succession-dijon/"),
         ("Selling from abroad (English)", "/en/selling-your-burgundy-property-from-abroad/"),
         ("Honoraires", "/honoraires/")],
)

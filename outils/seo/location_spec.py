#!/usr/bin/env python3
"""Pages « location » de shawez-immo.com (mise en location, sans gestion locative).

    python3 outils/seo/location_spec.py /tmp/location.json && python3 outils/seo/gen_pages.py . /tmp/location.json

Règles : aucun chiffre sans source officielle citée sur la page ; aucun loyer moyen (pas d'observatoire local
des loyers pour Dijon dans le réseau officiel, ANIL, édition février 2026) ; honoraires = barème publié sur
/honoraires/ ; jamais de gestion locative proposée. Sources consultées le 21 octobre 2026.
"""
import json, re, sys

DATE, DATE_FR = "2026-10-21", "21 octobre 2026"
SP = "https://www.service-public.gouv.fr/particuliers/"

S = {
    'encadrement': ("Service-public.fr, « En quoi consiste l'encadrement des loyers à respecter en zone tendue ? » (vérifié le 1er août 2026)", SP + "vosdroits/F1314"),
    'zt_simu': ("Service-public.fr, simulateur « Savoir si un logement est situé en zone tendue »", "https://www.service-public.gouv.fr/simulateur/calcul/zones-tendues"),
    'decret_zt': ("décret n° 2013-392 du 10 mai 2013 modifié (liste des communes en zone tendue)", "https://www.legifrance.gouv.fr/loda/id/JORFTEXT000027399823"),
    'honoraires': ("Service-public.fr, « Frais d'agence immobilière à la location d'un logement » (vérifié le 12 janvier 2026)", SP + "vosdroits/F375"),
    'decret_hono': ("décret n° 2014-890 du 1er août 2014 (plafonds des honoraires de location)", "https://www.legifrance.gouv.fr/loda/id/JORFTEXT000029337625"),
    'depot': ("Service-public.fr, « Dépôt de garantie dans un bail d'habitation » (vérifié le 9 juin 2026)", SP + "vosdroits/F31269"),
    'videmeuble': ("Service-public.fr, « Quelles sont les différences entre location vide et location meublée ? »", SP + "vosdroits/F1165"),
    'preavis': ("Service-public.fr, « Préavis et formalités du congé donné par le locataire » (vérifié le 16 avril 2026)", SP + "vosdroits/F1168"),
    'diag': ("Service-public.fr, « Quels sont les diagnostics immobiliers que le bailleur doit fournir au locataire ? » (vérifié le 20 février 2026)", SP + "vosdroits/F33463"),
    'dpe': ("Service-public.fr, « Diagnostic de performance énergétique (DPE) » (vérifié le 1er janvier 2026)", SP + "vosdroits/F16096"),
    'g2025': ("Service-public.fr, actualité du 3 janvier 2025 sur les logements classés G", SP + "actualites/A17975"),
    'dpe2027': ("Service-public.fr, actualité du 1er septembre 2026 sur le nouveau calcul du DPE", SP + "actualites/A18446"),
    'pieces': ("Service-public.fr, « Futur locataire d'un logement privé : justificatifs à fournir au propriétaire »", SP + "vosdroits/F1169"),
    'mobilite': ("Service-public.fr, « Quelles sont les règles du bail mobilité ? » (vérifié le 6 juin 2025)", SP + "vosdroits/F34759"),
    'visale': ("Service-public.fr, actualité du 21 janvier 2026 sur la garantie Visale", SP + "actualites/A17759"),
    'visalefr': ("visale.fr, conditions pour les locataires de 30 ans ou moins", "https://www.visale.fr/vos-questions/faq-locataires/locataire-de-30-ans-ou-moins-suis-je-eligible/"),
    'anil_loyer': ("ANIL, « Fixation du loyer au moment de la mise en location »", "https://www.anil.org/votre-besoin/louer/le-loyer/fixation-du-loyer-au-moment-de-la-mise-en-location/"),
    'anil_fg': ("ANIL, « Logement énergivore et location : est-il possible d'augmenter un loyer ? »", "https://www.anil.org/parole-expert-logement-energivore-location-loyer/"),
    'anil_oll': ("ANIL, « Les loyers du parc privé en France », février 2026 (Dijon ne fait pas partie des territoires observés)", "https://www.anil.org/"),
    'carte': ("Ministère chargé du Logement, « Carte des loyers »", "https://www.ecologie.gouv.fr/politiques-publiques/carte-loyers"),
    'adil': ("ADIL de la Côte-d'Or", "https://www.anil.org/adil-21/"),
}


def src(*keys):
    li = ' ; '.join('<a class="link" href="%s" target="_blank" rel="noopener">%s</a>' % (S[k][1], S[k][0]) for k in keys)
    return '<p style="font-size:.9em;opacity:.8;">Sources : %s.</p>' % li


def ul(*items):
    return '<ul>' + ''.join('<li>%s</li>' % i for i in items) + '</ul>'


def ol(*items):
    return '<ol>' + ''.join('<li>%s</li>' % i for i in items) + '</ol>'


def A(href, txt):
    return '<a class="link" href="%s">%s</a>' % (href, txt)


WA = "https://wa.me/33767579228?text=Bonjour%20Shawez%2C%20je%20souhaite%20mettre%20mon%20logement%20en%20location."
CTA_PROPRIO = ('<div class="btn-row" style="margin-top:32px;"><a class="btn btn-primary btn-lg" href="/contact/">Confier ma mise en location <span class="arw">→</span></a>'
               '<a class="btn" href="tel:+33767579228">Appeler Shawez</a><a class="btn" href="%s" target="_blank" rel="noopener">WhatsApp</a></div>' % WA)
CTA_LOYER = ('<div class="btn-row" style="margin-top:32px;"><a class="btn btn-primary btn-lg" href="/contact/">Demander mon avis sur le loyer <span class="arw">→</span></a>'
             '<a class="btn" href="tel:+33767579228">Appeler Shawez</a></div>')
CTA_LOCATAIRE = ('<div class="btn-row" style="margin-top:32px;"><a class="btn btn-primary btn-lg" href="https://www.gravelin-immo.com/?utm_source=shawez-immo" data-sortie="agence">Voir le site de l\'agence <span class="arw">→</span></a>'
                 '<a class="btn" href="/contact/">Écrire à Shawez</a></div>')

# liens
L_MAIN = ("Mettre en location à Dijon", "/location-immobiliere-dijon/")
L_LOYER = ("Estimer le loyer de votre bien", "/estimation-loyer-dijon/")
L_MEUBLE = ("Location meublée à Dijon", "/location-meublee-dijon/")
L_ETUD = ("Louer à des étudiants", "/location-etudiante-dijon/")
L_LOCAT = ("Louer un appartement à Dijon (locataires)", "/louer-appartement-dijon/")
L_A1 = ("Louer son appartement : le guide du propriétaire", "/conseils-vendeurs/louer-appartement-dijon-guide-proprietaire/")
L_A2 = ("Location meublée ou vide : que choisir", "/conseils-vendeurs/location-meublee-ou-vide-dijon/")
L_A3 = ("Les documents obligatoires pour louer", "/conseils-vendeurs/documents-obligatoires-location/")
L_A4 = ("Trouver un bon locataire : la méthode", "/conseils-vendeurs/trouver-bon-locataire/")
L_HONO = ("Le barème des honoraires", "/honoraires/")

COMMUNES = [  # slug, nom
    ("chenove", "Chenôve"), ("talant", "Talant"), ("fontaine-les-dijon", "Fontaine-lès-Dijon"),
    ("quetigny", "Quetigny"), ("chevigny-saint-sauveur", "Chevigny-Saint-Sauveur"), ("longvic", "Longvic"),
    ("saint-apollinaire", "Saint-Apollinaire"), ("beaune", "Beaune"),
]

SANS_GESTION = "mise en location, sans gestion : vous gardez la main ensuite"

P = []

# =====================================================================================
# 1. PAGE PRINCIPALE
# =====================================================================================
P.append(dict(
  id="location", route="/location", path="/location-immobiliere-dijon/", date=DATE, date_fr=DATE_FR,
  title="Mise en location à Dijon : trouver le bon locataire",
  description="Propriétaire à Dijon ? Shawez Ali, agent immobilier, trouve votre locataire : loyer, annonce, visites, dossier, bail, état des lieux. Sans gestion.",
  label="Location", h1="Mettre en location à Dijon <em>avec un agent immobilier.</em>", h1_plain="Mettre en location à Dijon avec un agent immobilier",
  lede="Je trouve votre locataire, je prépare le bail et je fais l'état des lieux. Ensuite, c'est vous qui gérez : je ne fais pas de gestion locative.",
  image="/assets/appartement-dijon-cuisine-lumineuse.webp", image_alt="Shawez Ali dans la cuisine d'un appartement à Dijon", img_w=720, img_h=900,
  crumbs=[("Location", "/location-immobiliere-dijon/")],
  service="Mise en location à Dijon", service_type="Mise en location (recherche de locataire), sans gestion locative", city="Dijon",
  service_desc="Conseil sur le loyer, annonce, visites, vérification du dossier, bail et état des lieux d'entrée. Pas de gestion locative ni d'encaissement des loyers.",
  intro="Vous avez un appartement ou une maison à louer à Dijon ou autour. Vous voulez un locataire sérieux, un loyer juste et un bail propre, mais vous voulez garder la relation avec votre locataire. C'est exactement ce que je fais : une " + SANS_GESTION + ".",
  sections=[
    ("ce-que-je-fais", "Ce que je fais pour vous",
     "<p>Je m'occupe de tout ce qui se passe entre le moment où le logement est libre et la remise des clés au nouveau locataire.</p>" +
     ul("<strong>Le loyer</strong> : je visite le logement et je vous dis à quel loyer il se louera, avec mes raisons. Voir " + A("/estimation-loyer-dijon/", "comment j'estime un loyer") + ".",
        "<strong>Les diagnostics</strong> : je vérifie que le dossier de diagnostics est complet et à jour avant l'annonce.",
        "<strong>L'annonce</strong> : photos soignées, texte clair, toutes les mentions obligatoires, diffusion avec l'agence GRAVELIN IMMO.",
        "<strong>Les visites</strong> : je trie les demandes, je fais visiter, je réponds aux questions.",
        "<strong>Le dossier</strong> : je vérifie les pièces du candidat et de son garant, dans le respect de la liste légale.",
        "<strong>Le bail</strong> : je rédige le bail et je réunis les annexes obligatoires.",
        "<strong>L'état des lieux d'entrée</strong> : pièce par pièce, avec photos, et l'inventaire si le logement est meublé.")),
    ("ce-que-je-ne-fais-pas", "Ce que je ne fais pas : la gestion",
     "<p>Je ne fais pas de gestion locative. C'est un choix clair : " + SANS_GESTION + ".</p>" +
     ul("Je n'encaisse pas les loyers et je ne fais pas les quittances.",
        "Je ne fais pas la régularisation des charges ni la révision du loyer.",
        "Je ne suis pas les travaux et je ne fais pas de syndic.") +
     "<p>Une fois le bail signé, vous êtes en contact direct avec votre locataire. Beaucoup de propriétaires préfèrent cela : ils connaissent leur locataire et ne paient pas de frais de gestion chaque mois. Si vous voulez savoir ce qui vous attend ensuite, lisez " + A(L_A1[1], "le guide du propriétaire") + ".</p>"),
    ("les-etapes", "Les étapes, de la première visite à la remise des clés",
     ol("<strong>Premier appel</strong> : vous me décrivez le logement, sa date de disponibilité et ce que vous attendez.",
        "<strong>Visite</strong> : je vois le logement, je vous donne mon avis sur le loyer, vide ou meublé, et sur ce qu'il faut préparer.",
        "<strong>Préparation</strong> : diagnostics, petites réparations, ménage, liste du mobilier si c'est un meublé.",
        "<strong>Annonce et visites</strong> : mise en ligne, tri des demandes, visites.",
        "<strong>Choix du locataire</strong> : je vous présente les dossiers vérifiés ; c'est vous qui choisissez.",
        "<strong>Signature et entrée</strong> : bail, état des lieux, remise des clés.") +
     "<p>Le délai dépend surtout du loyer demandé et de l'état du logement. Un loyer juste et un dossier complet dès l'annonce font gagner des semaines.</p>"),
    ("le-dossier-locataire", "Le dossier du locataire : ce qu'on peut demander",
     "<p>La loi fixe la liste des pièces qu'un propriétaire peut demander. Pour le candidat : une pièce d'identité, un justificatif de domicile, des justificatifs de sa situation professionnelle et de ses ressources. Pour le garant, la même logique. Rien d'autre.</p>"
     "<p>Demander une pièce qui n'est pas sur la liste expose à une amende pouvant aller jusqu'à 3 000 € pour un particulier et 15 000 € pour une société. Je m'en tiens donc à la liste, et je vérifie surtout la cohérence du dossier. Ma méthode est détaillée dans " + A(L_A4[1], "trouver un bon locataire") + ".</p>"
     "<p>Le candidat n'a pas de garant ? La garantie Visale d'Action Logement peut le remplacer. Elle est sans frais pour le locataire comme pour le propriétaire, et elle couvre les loyers impayés et les dégradations.</p>" +
     src('pieces', 'visale')),
    ("le-bail-et-l-etat-des-lieux", "Le bail, le dépôt de garantie, l'état des lieux",
     ul("<strong>Durée du bail</strong> : 3 ans au minimum pour un logement vide loué par un particulier ; 1 an pour un meublé, ou 9 mois pour un étudiant.",
        "<strong>Dépôt de garantie</strong> : au plus 1 mois de loyer hors charges pour un logement vide, 2 mois pour un meublé.",
        "<strong>Restitution</strong> : 1 mois après la remise des clés si l'état des lieux de sortie est conforme à celui d'entrée, 2 mois sinon. Chaque mois de retard commencé coûte 10 % du loyer mensuel hors charges.",
        "<strong>Diagnostics</strong> : ils sont annexés au bail. La liste est dans " + A(L_A3[1], "les documents obligatoires pour louer") + ".") +
     "<p>L'état des lieux d'entrée est le document qui vous protège le plus. Je le fais en détail, avec photos, parce que c'est lui qui sert de référence le jour du départ.</p>" +
     src('videmeuble', 'depot', 'diag')),
    ("regles-a-dijon", "Les règles à connaître à Dijon",
     ul("<strong>Pas d'encadrement des loyers.</strong> Il s'applique à Paris, Lille, Lyon, Villeurbanne, Montpellier, Bordeaux, une partie de Grenoble-Alpes Métropole, au Pays basque et dans deux territoires de Seine-Saint-Denis. Dijon n'en fait pas partie.",
        "<strong>Loyer fixé librement.</strong> Dijon n'est pas classée en zone tendue : le loyer se fixe librement entre propriétaire et locataire, à la première location comme entre deux locataires.",
        "<strong>Sauf pour les logements classés F ou G</strong> : depuis le 24 août 2022, leur loyer ne peut plus augmenter, ni entre deux locataires, ni au renouvellement, ni en cours de bail.",
        "<strong>Logements interdits à la location</strong> : les logements classés G pour tout bail signé ou renouvelé depuis le 1er janvier 2025, puis les F au 1er janvier 2028 et les E au 1er janvier 2034.",
        "<strong>Préavis du locataire</strong> : 3 mois pour un logement vide, réduit à 1 mois dans certains cas (premier emploi, mutation, perte d'emploi, raisons de santé…) ; 1 mois pour un meublé.") +
     "<p>Pour une commune voisine, vérifiez son classement sur le " + A(S['zt_simu'][1], "simulateur officiel des zones tendues") + " : il change le préavis du locataire et les règles d'évolution du loyer.</p>" +
     src('encadrement', 'decret_zt', 'anil_loyer', 'anil_fg', 'g2025', 'preavis')),
    ("les-quartiers", "Louer dans les quartiers de Dijon",
     "<p>Chaque quartier a ses locataires. Ce n'est pas une règle, mais c'est ce qu'il faut avoir en tête pour écrire l'annonce et fixer le loyer.</p>" +
     ul("<strong>Centre historique, Darcy, République</strong> : des appartements anciens, recherchés par des actifs et des étudiants qui veulent tout faire à pied. La lumière, le calme et le chauffage comptent beaucoup.",
        "<strong>Montmuzard et le campus</strong> : studios et petits meublés pour étudiants, avec une forte demande avant la rentrée. Voir " + A("/location-etudiante-dijon/", "louer à des étudiants") + ".",
        "<strong>Le long de la ligne T1</strong> (gare, centre, campus, CHU, Quetigny) : étudiants, personnel hospitalier, jeunes actifs sans voiture.",
        "<strong>Montchapet, Drapeau-Maladière, Port du Canal</strong> : des familles et des couples qui cherchent plus grand, un extérieur ou un garage.",
        "<strong>Toison d'Or, Valmy, Grésilles, Fontaine d'Ouche</strong> : des résidences plus récentes ou rénovées, où les charges et le stationnement font souvent la différence.")),
    ("dans-la-metropole", "Dans la métropole et jusqu'à Beaune",
     "<p>Je fais aussi la mise en location autour de Dijon. Chaque commune a sa page, avec ce qui compte pour y louer :</p>" +
     ul(*[A("/location-immobiliere-%s/" % s, "Mise en location à %s" % n) for s, n in COMMUNES])),
    ("honoraires", "Les honoraires",
     "<p>Les honoraires sont ceux du barème de l'agence GRAVELIN IMMO, publié sur la page " + A("/honoraires/", "honoraires") + " : 8 € TTC par m² pour la visite, la constitution du dossier et la rédaction du bail, et 3 € TTC par m² pour l'état des lieux.</p>"
     "<p>La loi les partage entre le propriétaire et le locataire : la part du locataire ne peut pas dépasser celle du propriétaire, ni des plafonds fixés par m². En 2026, hors zone tendue, ces plafonds sont de 8,07 € par m² pour la visite, le dossier et le bail, et de 3,03 € par m² pour l'état des lieux.</p>" +
     src('honoraires', 'decret_hono')),
  ],
  faq=[
    ("Faites-vous la gestion locative ?", "Non. Je fais la mise en location, sans gestion : je trouve le locataire, je prépare le bail et je fais l'état des lieux d'entrée. Ensuite, vous gérez directement avec votre locataire."),
    ("Combien coûte une mise en location ?", "Le barème de l'agence GRAVELIN IMMO est publié sur la page honoraires : 8 € TTC par m² pour la visite, le dossier et le bail, et 3 € TTC par m² pour l'état des lieux. La part payée par le locataire reste dans les plafonds légaux."),
    ("L'encadrement des loyers s'applique-t-il à Dijon ?", "Non. Dijon ne fait pas partie des territoires où l'encadrement des loyers s'applique (liste de service-public.fr vérifiée le 1er août 2026). Le loyer se fixe librement, sauf pour les logements classés F ou G, dont le loyer ne peut plus augmenter."),
    ("Puis-je louer un logement classé G ?", "Non, pas pour un nouveau bail. Depuis le 1er janvier 2025, un logement classé G ne peut plus être loué pour un bail signé ou renouvelé. Les logements classés F suivront au 1er janvier 2028, puis les E au 1er janvier 2034."),
    ("Qui choisit le locataire ?", "Vous. Je vous présente les dossiers complets et vérifiés, avec mon avis. La décision finale vous appartient."),
    ("Combien de temps faut-il pour trouver un locataire ?", "Cela dépend surtout du loyer demandé, de l'état du logement et de la période de l'année. Un loyer juste et un dossier de diagnostics complet dès l'annonce font gagner beaucoup de temps."),
  ],
  links=[L_LOYER, L_MEUBLE, L_ETUD, L_LOCAT, L_A1, L_A2, L_A3, L_A4, L_HONO], side_title="Pour aller plus loin",
  cta_html=CTA_PROPRIO, og_type="website",
))

# =====================================================================================
# 2. ESTIMATION DU LOYER
# =====================================================================================
P.append(dict(
  id="loyer", route="/location", path="/estimation-loyer-dijon/", date=DATE, date_fr=DATE_FR,
  title="Estimation de loyer à Dijon : fixer le bon loyer",
  description="Quel loyer demander à Dijon ? Encadrement (non applicable), règles du DPE, charges, meublé : la méthode de Shawez Ali, agent immobilier, pour un loyer juste.",
  label="Location · loyer", h1="Estimer le loyer de votre bien <em>à Dijon.</em>", h1_plain="Estimer le loyer de votre bien à Dijon",
  lede="À Dijon, le loyer est libre. C'est une bonne nouvelle, mais c'est aussi un piège : trop haut, le logement reste vide ; trop bas, vous perdez de l'argent chaque mois pendant des années.",
  image="/assets/appartement-centre-historique-dijon-sejour.webp", image_alt="Séjour d'un appartement ancien dans le centre historique de Dijon", img_w=720, img_h=900,
  crumbs=[("Location", "/location-immobiliere-dijon/"), ("Estimation du loyer", "/estimation-loyer-dijon/")],
  intro="Fixer un loyer, ce n'est pas copier l'annonce du voisin. C'est regarder le logement tel qu'il est, connaître les règles qui s'appliquent, et savoir ce que les locataires sont prêts à payer aujourd'hui. Voici comment je fais.",
  sections=[
    ("pas-d-encadrement", "L'encadrement des loyers ne s'applique pas à Dijon",
     "<p>L'encadrement des loyers, avec un loyer de référence à ne pas dépasser, ne concerne que quelques territoires : Paris, Est Ensemble et Plaine Commune en Seine-Saint-Denis, Lille, Hellemmes et Lomme, Lyon et Villeurbanne, Montpellier, Bordeaux, une partie de Grenoble-Alpes Métropole et l'agglomération du Pays basque. Dijon n'en fait pas partie.</p>"
     "<p>Dijon n'est pas non plus classée en zone tendue. Conséquence : le loyer se fixe librement, à la première mise en location comme entre deux locataires. Libre ne veut pas dire sans limite : c'est le marché qui tranche, et un loyer trop haut se paie en semaines de logement vide.</p>" +
     src('encadrement', 'decret_zt', 'anil_loyer')),
    ("la-limite-dpe", "La vraie limite : le diagnostic énergétique",
     ul("Pour un logement classé F ou G, le loyer ne peut plus augmenter depuis le 24 août 2022 : ni entre deux locataires, ni au renouvellement du bail, ni lors de la révision annuelle.",
        "Un logement classé G ne peut plus être loué pour un bail signé ou renouvelé depuis le 1er janvier 2025. Les F suivront au 1er janvier 2028, les E au 1er janvier 2034.",
        "Le DPE doit être fait par un diagnostiqueur certifié. Ceux réalisés entre le 1er janvier 2018 et le 30 juin 2021 ne sont plus valables depuis le 1er janvier 2025.") +
     "<p>Bon à savoir : au 1er janvier 2027, le calcul du DPE change pour les logements chauffés à l'électricité. Certains pourraient gagner une classe. Avant de fixer le loyer d'un logement classé F ou G, vérifiez ce point.</p>" +
     src('anil_fg', 'g2025', 'dpe', 'dpe2027')),
    ("ce-qui-fait-le-loyer", "Ce qui fait le loyer",
     ul("<strong>L'emplacement et les trajets</strong> : distance à pied du centre, du campus ou du CHU, proximité du tram.",
        "<strong>La surface et le plan</strong> : une chambre séparée, une vraie cuisine, des rangements valent souvent plus que quelques mètres carrés.",
        "<strong>L'étage, l'ascenseur, la lumière, le calme.</strong>",
        "<strong>Un extérieur et le stationnement</strong> : balcon, terrasse, cave, garage ou place de parking.",
        "<strong>L'état</strong> : cuisine équipée, salle d'eau récente, sols, peintures.",
        "<strong>La facture d'énergie</strong> : le DPE et le mode de chauffage, que les locataires regardent de plus en plus.",
        "<strong>Vide ou meublé</strong> : un meublé se loue plus cher, mais demande du mobilier et change plus souvent de locataire. Voir " + A("/location-meublee-dijon/", "la location meublée") + ".")),
    ("ma-methode", "Ma méthode pour fixer le loyer",
     ol("<strong>Je visite le logement.</strong> Sur photo, on ne voit ni le bruit, ni la lumière, ni l'état réel.",
        "<strong>Je regarde les logements comparables</strong> actuellement proposés à la location dans le même secteur : même type, même surface, même niveau de prestations. Une annonce donne un prix demandé, pas un loyer signé : je regarde aussi depuis combien de temps elle est en ligne.",
        "<strong>Je croise avec les repères publics</strong>, comme la carte des loyers du ministère chargé du Logement, calculée commune par commune à partir d'annonces. C'est un repère d'ensemble, pas le loyer de votre logement.",
        "<strong>Je vous donne un loyer et ses raisons</strong>, par écrit, avec les charges et le dépôt de garantie qui vont avec.",
        "<strong>J'ajuste si besoin</strong> d'après les premiers retours de visites.") +
     "<p>Il n'existe pas aujourd'hui d'observatoire local des loyers pour Dijon dans le réseau officiel : c'est pour cela que je ne donne pas de « loyer moyen » au mètre carré sur cette page. Un chiffre global ne dirait rien de votre logement.</p>" +
     src('carte', 'anil_oll')),
    ("loyer-et-charges", "Loyer, charges et dépôt de garantie",
     ul("<strong>Charges</strong> : pour un logement vide, elles sont payées par provisions, avec une régularisation chaque année. Pour un meublé, vous pouvez choisir entre provisions et forfait.",
        "<strong>Dépôt de garantie</strong> : au plus 1 mois de loyer hors charges pour un logement vide, 2 mois pour un meublé.",
        "<strong>Révision</strong> : si le bail le prévoit, le loyer peut être révisé une fois par an selon l'indice de référence des loyers publié par l'Insee, sauf pour les logements classés F ou G.") +
     src('videmeuble', 'depot', 'anil_fg')),
    ("trop-cher-pas-assez", "Trop cher ou pas assez : ce que ça coûte vraiment",
     "<p>Un mois sans locataire, c'est un mois de loyer perdu. Pour perdre autant en baissant le loyer, il faudrait le baisser d'un douzième pendant un an. Un loyer juste fait donc souvent gagner plus qu'un loyer ambitieux.</p>"
     "<p>À l'inverse, un loyer trop bas attire beaucoup de dossiers, mais il vous coûte chaque mois, et vous ne pourrez le rattraper que lentement. Le bon loyer est celui qui attire plusieurs bons dossiers dans les premières semaines.</p>"),
  ],
  faq=[
    ("Quel est le loyer moyen à Dijon ?", "Il n'existe pas d'observatoire local des loyers pour Dijon dans le réseau officiel. Le ministère chargé du Logement publie une carte des loyers calculée à partir d'annonces, utile comme repère. Pour votre logement, le plus fiable reste de comparer avec les logements équivalents proposés dans le même secteur."),
    ("L'encadrement des loyers s'applique-t-il à Dijon ?", "Non. Dijon ne figure pas parmi les territoires où l'encadrement des loyers s'applique. Le loyer se fixe librement entre propriétaire et locataire."),
    ("Puis-je augmenter le loyer entre deux locataires à Dijon ?", "Oui, en principe, puisque Dijon n'est pas en zone tendue. Sauf si le logement est classé F ou G : depuis le 24 août 2022, son loyer ne peut plus augmenter."),
    ("Un meublé se loue-t-il plus cher ?", "En général oui, parce que le locataire n'a pas à s'équiper. En contrepartie, il faut fournir et entretenir le mobilier obligatoire, et les locataires restent souvent moins longtemps."),
    ("Comment réviser le loyer en cours de bail ?", "Seulement si le bail contient une clause de révision : une fois par an, selon l'indice de référence des loyers publié par l'Insee. Pour un logement classé F ou G, la révision est interdite."),
  ],
  links=[L_MAIN, L_MEUBLE, L_ETUD, L_A2, L_A3, ("Prix immobilier à Dijon au m²", "/prix-immobilier-dijon/"), L_HONO], side_title="Pour aller plus loin",
  cta_html=CTA_LOYER,
))

# =====================================================================================
# 3. LOCATION MEUBLÉE
# =====================================================================================
P.append(dict(
  id="meuble", route="/location", path="/location-meublee-dijon/", date=DATE, date_fr=DATE_FR,
  title="Location meublée à Dijon : règles et conseils",
  description="Louer en meublé à Dijon : mobilier obligatoire, bail d'un an ou de 9 mois, bail mobilité, dépôt de garantie, préavis. Les règles et les conseils de Shawez Ali.",
  label="Location · meublé", h1="Louer en meublé à Dijon : <em>les règles, sans surprise.</em>", h1_plain="Louer en meublé à Dijon : les règles, sans surprise",
  lede="Un meublé se loue vite à Dijon, surtout près du campus et du centre. Mais un meublé, ce n'est pas un logement avec trois meubles : la loi fixe une liste précise.",
  image="/assets/shawez-ali-studio-meuble-visite.webp", image_alt="Shawez Ali pendant la visite d'un studio meublé à Dijon", img_w=720, img_h=900,
  crumbs=[("Location", "/location-immobiliere-dijon/"), ("Location meublée", "/location-meublee-dijon/")],
  intro="La location meublée a ses propres règles : un bail plus court, un préavis plus court, un dépôt de garantie plus élevé, un régime fiscal différent. Voici ce qu'il faut savoir avant de choisir, et ce que je vérifie avant de mettre un meublé en location.",
  sections=[
    ("le-mobilier-obligatoire", "Le mobilier obligatoire",
     "<p>Le décret n° 2015-981 du 31 juillet 2015 fixe la liste des éléments qu'un logement meublé doit contenir :</p>" +
     ul("une literie avec couette ou couverture ;",
        "des volets ou rideaux occultants dans les chambres ;",
        "des plaques de cuisson ;",
        "un four ou un four à micro-ondes ;",
        "un réfrigérateur avec un compartiment congélation, ou un congélateur ;",
        "la vaisselle pour prendre les repas et les ustensiles de cuisine ;",
        "une table et des sièges ;",
        "des étagères de rangement ;",
        "des luminaires ;",
        "le matériel d'entretien ménager adapté au logement.") +
     "<p>S'il manque un élément, le locataire peut demander que le bail soit traité comme un bail de logement vide, avec un bail de 3 ans et un préavis différent. Je fais l'inventaire avec vous avant l'annonce, puis avec le locataire le jour de l'entrée.</p>" +
     src('videmeuble')),
    ("le-bail-meuble", "Le bail meublé en un coup d'œil",
     ul("<strong>Durée</strong> : 1 an au minimum, ou 9 mois si le locataire est étudiant (sans reconduction automatique).",
        "<strong>Préavis du locataire</strong> : 1 mois, sans avoir à se justifier.",
        "<strong>Préavis du propriétaire</strong> : au moins 3 mois avant la fin du bail, pour un motif prévu par la loi.",
        "<strong>Dépôt de garantie</strong> : au plus 2 mois de loyer hors charges.",
        "<strong>Charges</strong> : par provisions avec régularisation, ou au forfait.",
        "<strong>Impôts</strong> : les loyers d'un meublé relèvent des bénéfices industriels et commerciaux (BIC), et non des revenus fonciers. Faites le point avec votre comptable ou votre notaire.") +
     src('videmeuble', 'preavis', 'depot')),
    ("le-bail-mobilite", "Le bail mobilité : pour les séjours courts",
     "<p>Le bail mobilité est un bail meublé de 1 à 10 mois, non renouvelable. Il est réservé aux locataires en formation professionnelle, en études supérieures, en apprentissage, en stage, en service civique, en mutation ou en mission temporaire.</p>" +
     ul("Pas de dépôt de garantie.",
        "Le locataire peut avoir un garant, ou la garantie Visale.",
        "À la fin, si vous signez un nouveau bail avec le même locataire pour le même logement, ce sera un bail meublé classique.") +
     "<p>À Dijon, il colle bien aux stagiaires, aux alternants et aux personnes en mission ou en mutation, par exemple autour du CHU.</p>" +
     src('mobilite')),
    ("qui-loue-en-meuble", "Qui cherche un meublé à Dijon",
     ul("<strong>Les étudiants</strong>, surtout près du campus de Montmuzard et le long de la ligne T1. Voir " + A("/location-etudiante-dijon/", "louer à des étudiants") + ".",
        "<strong>Les jeunes actifs</strong> qui arrivent pour un premier emploi et ne veulent pas acheter de meubles tout de suite.",
        "<strong>Les personnes en mutation ou en mission</strong>, qui cherchent un logement prêt à vivre pour quelques mois.") +
     "<p>Ce sont des locataires qui bougent plus : prévoyez des changements de locataire plus fréquents qu'en vide, et donc plus d'états des lieux.</p>"),
    ("ce-que-je-fais", "Ce que je fais pour votre meublé",
     "<p>Je vérifie la liste du mobilier, je vous conseille sur ce qui manque ou ce qui est en trop, je fixe le loyer avec vous, je fais les photos et l'annonce, les visites, le dossier, le bail et l'état des lieux avec inventaire. C'est une " + SANS_GESTION + ".</p>"
     "<p>Une location de courte durée pour des touristes obéit à d'autres règles : cette page parle d'un meublé loué comme résidence principale.</p>"),
  ],
  faq=[
    ("Quels meubles sont obligatoires dans un meublé ?", "La liste du décret du 31 juillet 2015 : literie avec couette ou couverture, occultation des fenêtres des chambres, plaques de cuisson, four ou micro-ondes, réfrigérateur avec congélation, vaisselle et ustensiles, table et sièges, étagères, luminaires et matériel d'entretien ménager."),
    ("Quelle est la durée d'un bail meublé ?", "1 an au minimum, ou 9 mois pour un étudiant. Le bail mobilité, lui, dure de 1 à 10 mois et n'est pas renouvelable."),
    ("Quel dépôt de garantie pour un meublé ?", "Au plus 2 mois de loyer hors charges. Aucun dépôt de garantie n'est possible pour un bail mobilité."),
    ("Quel préavis pour un locataire en meublé ?", "1 mois, sans justification. Le propriétaire, lui, doit prévenir au moins 3 mois avant la fin du bail."),
    ("Meublé ou vide : que choisir ?", "Cela dépend du logement, du secteur et du temps que vous voulez y consacrer. J'ai fait un comparatif complet dans l'article sur la location meublée ou vide à Dijon."),
  ],
  links=[L_A2, L_MAIN, L_LOYER, L_ETUD, L_A3, L_HONO], side_title="Pour aller plus loin",
  cta_html=CTA_PROPRIO,
))

# =====================================================================================
# 4. LOCATION ÉTUDIANTE
# =====================================================================================
P.append(dict(
  id="etudiant", route="/location", path="/location-etudiante-dijon/", date=DATE, date_fr=DATE_FR,
  title="Location étudiante à Dijon : louer près du campus",
  description="Louer à des étudiants à Dijon : secteurs près du campus et du tram, bail de 9 mois, colocation, garant ou Visale. Les conseils de Shawez Ali, agent immobilier.",
  label="Location · étudiants", h1="Louer à des étudiants à Dijon, <em>sans mauvaise surprise.</em>", h1_plain="Louer à des étudiants à Dijon, sans mauvaise surprise",
  lede="Studio, petit meublé ou colocation : la demande étudiante à Dijon est forte avant la rentrée. Le bon bail, le bon garant et le bon emplacement font toute la différence.",
  image="/assets/appartement-sous-les-toits-chambre.webp", image_alt="Chambre sous les toits dans un appartement à Dijon", img_w=720, img_h=900,
  crumbs=[("Location", "/location-immobiliere-dijon/"), ("Location étudiante", "/location-etudiante-dijon/")],
  intro="Dijon est une ville universitaire, avec un grand campus à l'est de la ville et des écoles jusque dans le centre. Louer à des étudiants a ses règles propres : un bail qui peut durer 9 mois, des garants souvent parents, et un calendrier très marqué.",
  sections=[
    ("ou-louer", "Où les étudiants cherchent à Dijon",
     ul("<strong>Autour du campus de Montmuzard</strong> : studios et petits meublés, à pied des cours.",
        "<strong>Le long de la ligne T1 du tram</strong>, qui relie la gare et le centre au campus, au CHU et à Quetigny : c'est le premier critère pour un étudiant sans voiture.",
        "<strong>Le centre historique et le secteur de la gare</strong> : pour ceux qui veulent la vie du centre, ou qui rentrent souvent chez leurs parents en train.") +
     "<p>Ce que regarde un étudiant, dans l'ordre : le temps de trajet jusqu'aux cours, le loyer charges comprises, une connexion internet fiable, et un logement meublé prêt à vivre.</p>"),
    ("le-bon-bail", "Le bon bail pour un étudiant",
     ul("<strong>Bail meublé de 9 mois</strong> : réservé aux étudiants, il suit l'année universitaire et ne se reconduit pas tout seul.",
        "<strong>Bail meublé d'un an</strong> : reconduit automatiquement, préavis d'un mois pour le locataire.",
        "<strong>Bail mobilité</strong> (1 à 10 mois) : pour un stage, une alternance ou un semestre ; pas de dépôt de garantie.") +
     "<p>Le bail de 9 mois laisse le logement libre l'été : à vous de voir si vous préférez un locataire à l'année. Le détail des règles est sur la page " + A("/location-meublee-dijon/", "location meublée") + ".</p>" +
     src('videmeuble', 'mobilite')),
    ("la-colocation", "La colocation",
     "<p>Pour un grand appartement près du campus, la colocation peut être une bonne solution. Deux formules :</p>" +
     ul("<strong>Un bail unique</strong> signé par tous les colocataires, souvent avec une clause de solidarité : chacun peut être tenu de payer tout le loyer. Quand un colocataire part, sa solidarité s'arrête quand un nouveau colocataire le remplace, et au plus tard six mois après la fin de son préavis.",
        "<strong>Un bail par colocataire</strong>, pour une chambre et l'usage des parties communes : plus souple, mais plus de documents et d'états des lieux.") +
     "<p>Dans les deux cas, je vérifie chaque dossier et chaque garant un par un.</p>"),
    ("garant-et-visale", "Garant, parents ou Visale",
     "<p>La plupart des étudiants ont un parent garant. Ceux qui n'en ont pas peuvent demander la garantie Visale d'Action Logement : les étudiants et les alternants y ont accès, et elle est sans frais pour le locataire comme pour le propriétaire. Elle couvre les loyers impayés et les dégradations. Depuis janvier 2026, elle couvre les trois premières années d'occupation.</p>"
     "<p>Pour le garant, vous ne pouvez demander que les pièces prévues par la loi : identité, domicile, situation professionnelle, ressources.</p>" +
     src('visalefr', 'visale', 'pieces')),
    ("le-calendrier", "Le calendrier : tout se joue avant la rentrée",
     "<p>La demande étudiante se concentre au printemps et pendant l'été, quand les résultats d'admission tombent. Un studio libéré en novembre se loue moins facilement qu'un studio libéré fin juin. Si votre locataire actuel part, anticipez : les photos et l'annonce peuvent être prêtes avant même son départ.</p>"),
  ],
  faq=[
    ("Peut-on faire un bail de 9 mois à un étudiant ?", "Oui, pour un logement meublé loué à un étudiant. Le bail dure 9 mois et ne se reconduit pas automatiquement."),
    ("Un étudiant sans garant peut-il louer ?", "Oui, avec la garantie Visale d'Action Logement, ouverte aux étudiants et aux alternants. Elle est sans frais pour le locataire et pour le propriétaire."),
    ("Quel dépôt de garantie demander à un étudiant ?", "Comme pour tout meublé : au plus 2 mois de loyer hors charges. Aucun dépôt de garantie n'est possible avec un bail mobilité."),
    ("Où louer pour des étudiants à Dijon ?", "Près du campus de Montmuzard, le long de la ligne T1 du tram, et dans le centre. Le temps de trajet jusqu'aux cours compte souvent plus que quelques mètres carrés."),
  ],
  links=[L_MEUBLE, L_MAIN, L_LOYER, L_A4, ("Mise en location à Quetigny", "/location-immobiliere-quetigny/"), L_HONO], side_title="Pour aller plus loin",
  cta_html=CTA_PROPRIO,
))

# =====================================================================================
# 5. CÔTÉ LOCATAIRES
# =====================================================================================
P.append(dict(
  id="locataire", route="/location", path="/louer-appartement-dijon/", date=DATE, date_fr=DATE_FR,
  title="Louer un appartement à Dijon : dossier et conseils",
  description="Vous cherchez un logement à Dijon ? Dossier, pièces demandées, garant ou Visale, frais d'agence plafonnés, dépôt de garantie : ce qu'il faut savoir pour louer.",
  label="Locataires", h1="Louer un appartement à Dijon : <em>un dossier qui passe.</em>", h1_plain="Louer un appartement à Dijon : un dossier qui passe",
  lede="Vous cherchez un logement à louer à Dijon ou autour. Voici ce que regarde un propriétaire, ce qu'il a le droit de vous demander, et ce que vous allez payer.",
  image="/assets/appartement-dijon-couloir-parquet.webp", image_alt="Couloir avec parquet dans un appartement à Dijon", img_w=720, img_h=900,
  crumbs=[("Location", "/location-immobiliere-dijon/"), ("Louer un appartement", "/louer-appartement-dijon/")],
  intro="Je fais visiter des logements et je reçois des dossiers toutes les semaines. Un dossier complet, clair et honnête passe presque toujours devant un dossier plus solide mais incomplet. Voici comment préparer le vôtre.",
  sections=[
    ("ou-chercher", "Où chercher à Dijon",
     "<p>Commencez par vos trajets : travail, études, école des enfants. À Dijon, les deux lignes de tram structurent la ville : la T1 relie la gare et le centre au campus, au CHU et à Quetigny ; la T2 relie le nord de la ville (Valmy) au centre et à Chenôve. Habiter près d'une station change le quotidien.</p>"
     "<p>Les logements que l'agence GRAVELIN IMMO met en location sont publiés sur son site. Pour la métropole, chaque commune a sa page : " +
     ', '.join(A("/location-immobiliere-%s/" % s, n) for s, n in COMMUNES) + ".</p>"),
    ("le-dossier", "Le dossier : ce qu'on peut vous demander",
     "<p>La liste est fixée par la loi. Pour vous comme pour votre garant :</p>" +
     ul("une pièce d'identité ;",
        "un justificatif de domicile (par exemple vos trois dernières quittances de loyer) ;",
        "un ou plusieurs justificatifs de situation professionnelle (contrat de travail, carte d'étudiant…) ;",
        "un ou plusieurs justificatifs de ressources (trois derniers bulletins de salaire, dernier avis d'imposition…).") +
     "<p>Un propriétaire ou une agence ne peut rien demander d'autre. Préparez tout en un seul fichier PDF, lisible, dans l'ordre : c'est le premier signe de sérieux.</p>" +
     src('pieces')),
    ("garant-ou-visale", "Pas de garant ? La garantie Visale",
     "<p>La garantie Visale d'Action Logement remplace le garant. Elle est ouverte notamment aux jeunes de 18 à 30 ans inclus, aux étudiants et aux alternants, et à certains salariés selon leurs revenus. Elle est sans frais pour vous comme pour le propriétaire. Faites la demande avant les visites : le visa Visale se joint au dossier.</p>" +
     src('visalefr', 'visale')),
    ("ce-que-vous-allez-payer", "Ce que vous allez payer à l'entrée",
     ul("<strong>Le dépôt de garantie</strong> : au plus 1 mois de loyer hors charges pour un logement vide, 2 mois pour un meublé, rien pour un bail mobilité.",
        "<strong>Les honoraires d'agence</strong>, s'il y a une agence : seulement pour la visite, le dossier, le bail et l'état des lieux, jamais plus que la part du propriétaire, et dans la limite de plafonds par m². En 2026, hors zone tendue : 8,07 € par m² pour la visite, le dossier et le bail, 3,03 € par m² pour l'état des lieux. Le barème de l'agence est sur la page " + A("/honoraires/", "honoraires") + ".",
        "<strong>Le premier loyer</strong> et l'assurance habitation, que le locataire doit souscrire.") +
     src('depot', 'honoraires')),
    ("pendant-la-visite", "Pendant la visite : les bonnes questions",
     ul("Quelle est la classe du DPE, et combien coûte le chauffage ?",
        "Que comprennent les charges ? Comment sont-elles régularisées ?",
        "Le logement est-il vide ou meublé ? Quel bail, et quel préavis ?",
        "Quand le logement est-il disponible ?") +
     "<p>Un logement classé G ne peut plus faire l'objet d'un nouveau bail depuis le 1er janvier 2025. Pour un logement classé F ou G, le loyer ne peut pas être plus élevé que celui du locataire précédent.</p>" +
     src('g2025', 'anil_fg')),
    ("votre-preavis", "Et votre préavis actuel ?",
     "<p>Si vous quittez un logement vide, votre préavis est de 3 mois, ou de 1 mois dans certains cas : logement en zone tendue, premier emploi, mutation, perte d'emploi, nouvel emploi après une perte d'emploi, raisons de santé, bénéficiaires du RSA ou de l'AAH. En meublé, c'est 1 mois. Comptez-le avant de signer ailleurs : vous risquez de payer deux loyers.</p>" +
     src('preavis')),
  ],
  faq=[
    ("Quels documents fournir pour louer à Dijon ?", "Une pièce d'identité, un justificatif de domicile, des justificatifs de situation professionnelle et de ressources, et les mêmes catégories de pièces pour votre garant. La liste est fixée par la loi : on ne peut rien vous demander d'autre."),
    ("Combien coûtent les frais d'agence pour un locataire ?", "Ils sont plafonnés par m² et ne peuvent pas dépasser la part du propriétaire. En 2026, hors zone tendue : 8,07 € par m² pour la visite, le dossier et le bail, et 3,03 € par m² pour l'état des lieux."),
    ("Je n'ai pas de garant, que faire ?", "Demandez la garantie Visale d'Action Logement, ouverte notamment aux 18-30 ans, aux étudiants et aux alternants. Elle est sans frais pour vous comme pour le propriétaire."),
    ("Quel dépôt de garantie à Dijon ?", "Au plus 1 mois de loyer hors charges pour un logement vide, 2 mois pour un meublé, et aucun pour un bail mobilité."),
    ("Les loyers sont-ils encadrés à Dijon ?", "Non. L'encadrement des loyers ne s'applique pas à Dijon. En revanche, le loyer d'un logement classé F ou G ne peut pas augmenter par rapport au locataire précédent."),
  ],
  links=[L_MAIN, L_ETUD, L_MEUBLE, ("Simulateur de prêt immobilier", "/simulateur-pret-immobilier-dijon/"), L_HONO], side_title="Pour aller plus loin",
  cta_html=CTA_LOCATAIRE,
))

# =====================================================================================
# 6. PAGES PAR COMMUNE
# =====================================================================================
DVF_SRC = ("Source : ventes « Demandes de valeurs foncières » (DVF géolocalisées, Etalab, DGFiP, licence ouverte), "
           "détail et méthode sur la page %s.")


def commune(slug, nom, title, desc, h1, lede, image, image_alt, intro, contexte, cherchent, achat, faq, voisines, prix_href, prix_label):
    sections = [
        ("louer-a-" + slug, "Louer à %s : ce qu'il faut savoir" % nom, contexte),
        ("ce-que-cherchent-les-locataires", "Ce que cherchent les locataires ici", cherchent),
        ("acheter-pour-louer", "Acheter pour louer à %s" % nom, achat + '<p style="font-size:.9em;opacity:.8;">' + DVF_SRC % A(prix_href, prix_label) + '</p>'),
        ("comment-je-m-en-occupe", "Comment je m'occupe de votre mise en location",
         "<p>Je visite le logement, je vous donne mon avis sur le loyer, je vérifie les diagnostics, je fais les photos et l'annonce avec l'agence GRAVELIN IMMO, les visites, la vérification des dossiers, le bail et l'état des lieux d'entrée. "
         "C'est une " + SANS_GESTION + ". Le détail est sur la page " + A("/location-immobiliere-dijon/", "mettre en location à Dijon") + ", et les honoraires sur la page " + A("/honoraires/", "honoraires") + ".</p>"),
        ("les-regles-a-verifier", "Les règles à vérifier avant de louer",
         ul("<strong>Le DPE</strong> : un logement classé G ne peut plus être loué pour un nouveau bail depuis le 1er janvier 2025 ; les F suivront au 1er janvier 2028. Le loyer d'un logement classé F ou G ne peut plus augmenter.",
            "<strong>La zone tendue</strong> : vérifiez le classement de %s sur le %s. Il change le préavis du locataire d'un logement vide et les règles d'évolution du loyer entre deux locataires." % (nom, A(S['zt_simu'][1], "simulateur officiel")),
            "<strong>L'encadrement des loyers</strong> : il ne s'applique pas en Côte-d'Or ; la liste des territoires concernés est sur service-public.fr.") +
         src('g2025', 'anil_fg', 'encadrement')),
    ]
    links = [L_MAIN, L_LOYER] + voisines + [(prix_label[0].upper() + prix_label[1:], prix_href), L_A4]
    return dict(
        id="location-" + slug, route="/location", path="/location-immobiliere-%s/" % slug, date=DATE, date_fr=DATE_FR,
        title=title, description=desc, label="Location · " + nom, h1=h1, h1_plain=h1.replace('<em>', '').replace('</em>', ''),
        lede=lede, image=image, image_alt=image_alt, img_w=720, img_h=900,
        crumbs=[("Location", "/location-immobiliere-dijon/"), (nom, "/location-immobiliere-%s/" % slug)],
        service="Mise en location à " + nom, service_type="Mise en location (recherche de locataire), sans gestion locative", city=nom,
        service_desc="Recherche de locataire à %s : loyer, annonce, visites, dossier, bail et état des lieux. Pas de gestion locative." % nom,
        intro=intro, sections=sections, faq=faq, links=links, side_title="Autour de " + nom, cta_html=CTA_PROPRIO,
    )


def V(slug):
    nom = dict(COMMUNES)[slug]
    return ("Mise en location à " + nom, "/location-immobiliere-%s/" % slug)


FAQ_GESTION = lambda nom: ("Faites-vous la gestion locative à %s ?" % nom, "Non. Je trouve le locataire, je prépare le bail et je fais l'état des lieux d'entrée. Ensuite, vous gérez directement avec votre locataire : c'est une mise en location, sans gestion.")

P.append(commune(
  "chenove", "Chenôve",
  "Mise en location à Chenôve : trouver un locataire",
  "Louer à Chenôve : tram T2, profils de locataires, loyer, règles du DPE. Mise en location par Shawez Ali, agent immobilier, sans gestion.",
  "Mettre en location à Chenôve, <em>au bout de la ligne T2.</em>",
  "Au sud de Dijon, Chenôve est reliée au centre par le tram T2. Ici, les locataires comparent surtout le loyer, les charges et le temps de trajet.",
  "/assets/appartement-t3-dijon-cuisine-visite.webp", "Cuisine d'un appartement T3 pendant une visite",
  "Chenôve touche Dijon par le sud, au pied de la côte viticole. Une grande partie des logements sont des appartements en résidence, à côté de quartiers de maisons. Pour un propriétaire, c'est un marché où le bon loyer se joue à peu de chose : les locataires comparent avec Dijon, à quelques stations de tram.",
  "<p>Le terminus Chenôve Centre de la ligne T2 met la commune à quelques minutes du centre de Dijon sans voiture. C'est le premier argument d'une annonce ici. La commune a aussi beaucoup changé avec la rénovation de ses quartiers d'habitat collectif : un logement rénové et bien isolé s'y distingue nettement.</p>"
  "<p>Les locataires sont souvent des actifs qui travaillent dans la métropole, des familles qui cherchent plus de surface pour leur budget, et des étudiants qui acceptent un trajet en tram contre un loyer plus doux qu'au centre.</p>",
  ul("Un trajet simple vers Dijon : la distance à pied jusqu'au tram compte.",
     "Des charges maîtrisées : dans une résidence avec chauffage collectif, les locataires demandent le montant des charges dès le premier appel.",
     "Un stationnement, pour les familles qui ont une voiture.",
     "Un logement rénové, avec un bon diagnostic énergétique.") +
  "<p>Mettez ces informations dans l'annonce : vous éviterez des visites inutiles.</p>",
  "<p>À Chenôve, les prix d'achat sont parmi les plus bas de la métropole. Sur les ventes de 2023 à 2025, le prix médian au m² des appartements est de 1 200 €/m² (290 ventes), celui des maisons de 2 580 €/m² (116 ventes). Un prix d'achat bas ne fait pas à lui seul un bon investissement : regardez les charges de copropriété, les travaux votés et le DPE, qui conditionnent la possibilité de louer.</p>",
  [("Les locataires de Chenôve travaillent-ils à Dijon ?", "Beaucoup, oui. Le tram T2 relie Chenôve au centre de Dijon : la distance jusqu'à une station est l'un des premiers critères des locataires."),
   ("Quel loyer demander à Chenôve ?", "Il dépend du logement : surface, étage, état, charges et DPE. Je vous donne mon avis après la visite, en comparant avec les logements équivalents proposés dans le secteur."),
   ("Un logement classé F peut-il encore être loué à Chenôve ?", "Oui, jusqu'au 1er janvier 2028 pour un nouveau bail, mais son loyer ne peut pas augmenter. Les logements classés G ne peuvent plus être loués pour un nouveau bail depuis le 1er janvier 2025."),
   FAQ_GESTION("Chenôve")],
  [V("longvic"), V("talant")], "/prix-immobilier-chenove/", "prix immobilier à Chenôve"))

P.append(commune(
  "talant", "Talant",
  "Mise en location à Talant : trouver un locataire",
  "Louer à Talant, sur les hauteurs de Dijon : calme, vue, familles. Loyer, dossier, bail et état des lieux par Shawez Ali, agent immobilier. Sans gestion.",
  "Mettre en location à Talant, <em>sur les hauteurs.</em>",
  "À l'ouest de Dijon, au-dessus du lac Kir, Talant attire des locataires qui cherchent le calme et la verdure, sans s'éloigner de la ville.",
  "/assets/appartement-ancien-salon-lumineux.webp", "Salon lumineux d'un appartement",
  "Talant domine Dijon et le lac Kir. On y trouve un vieux village perché, des quartiers de maisons et des résidences avec vue. Les locataires qui choisissent Talant le font rarement par hasard : ils veulent du calme et de l'espace.",
  "<p>Talant n'est pas desservie par le tram : les locataires viennent souvent avec une voiture, ou acceptent le bus pour rejoindre le centre de Dijon. La pente compte aussi pour ceux qui se déplacent à vélo.</p>"
  "<p>Ce sont surtout des familles et des couples, parfois des personnes plus âgées qui quittent une maison pour un appartement plus simple. Ils restent souvent longtemps : un bon locataire à Talant, c'est un locataire que l'on garde.</p>",
  ul("Le stationnement : un garage ou une place, presque toujours demandé.",
     "La vue et la lumière, à montrer sur les photos.",
     "Un extérieur : balcon, terrasse ou jardin.",
     "La proximité des écoles et des commerces du quotidien.") +
  "<p>Pour un logement vide loué à une famille, comptez sur un bail long : soignez l'état des lieux d'entrée, il servira plusieurs années plus tard.</p>",
  "<p>Sur les ventes de 2023 à 2025, le prix médian au m² des appartements à Talant est de 2 300 €/m² (251 ventes), celui des maisons de 3 110 €/m² (134 ventes). Pour un investissement locatif, les appartements avec vue, ascenseur et stationnement sont les plus faciles à louer.</p>",
  [("Qui loue à Talant ?", "Surtout des familles et des couples qui cherchent le calme, la vue et un extérieur, à quelques minutes du centre de Dijon."),
   ("Faut-il un parking pour louer à Talant ?", "Ce n'est pas obligatoire, mais c'est souvent l'une des premières questions. Sans tram, beaucoup de locataires ont une voiture."),
   ("Quel loyer pour un appartement à Talant ?", "Il dépend de la vue, de l'étage, de l'extérieur, du stationnement et du DPE. Je vous le donne après la visite, avec mes raisons."),
   FAQ_GESTION("Talant")],
  [V("fontaine-les-dijon"), V("chenove")], "/prix-immobilier-talant/", "prix immobilier à Talant"))

P.append(commune(
  "fontaine-les-dijon", "Fontaine-lès-Dijon",
  "Location à Fontaine-lès-Dijon : trouver un locataire",
  "Mettre en location à Fontaine-lès-Dijon : maisons, familles, écoles. Loyer, dossier, bail et état des lieux par Shawez Ali, agent immobilier. Sans gestion.",
  "Mettre en location à Fontaine-lès-Dijon, <em>entre ville et village.</em>",
  "Au nord-ouest de Dijon, Fontaine-lès-Dijon garde un air de village. Les locataires y cherchent surtout de l'espace et un cadre calme pour leurs enfants.",
  "/assets/maison-pierre-terrasse-jardin.webp", "Maison en pierre avec terrasse et jardin",
  "Fontaine-lès-Dijon, village natal de saint Bernard, touche Dijon tout en gardant son vieux bourg sur la colline. Les biens à louer y sont plus rares qu'à Dijon, et ils attirent des locataires qui comptent rester.",
  "<p>La commune est collée aux quartiers nord-ouest de Dijon : le centre-ville est à quelques minutes en voiture ou en bus. La demande porte sur des maisons avec jardin et des appartements familiaux, dans des rues calmes.</p>"
  "<p>Les locataires sont surtout des familles, des cadres qui arrivent dans la région pour leur travail et qui veulent tester le secteur avant d'acheter, et des couples qui veulent un extérieur.</p>",
  ul("Un jardin ou une terrasse.",
     "Un garage et de la place pour stationner.",
     "Les écoles et le trajet vers Dijon.",
     "Un logement bien isolé : pour une maison, la facture de chauffage pèse lourd dans la décision.") +
  "<p>Pour une maison louée vide, précisez dans le bail qui entretient le jardin : l'entretien courant est en principe à la charge du locataire, et mieux vaut l'écrire noir sur blanc.</p>",
  "<p>En 2025, les maisons vendues autour du centre de Fontaine-lès-Dijon se sont signées à 3 440 €/m² en médiane (121 ventes) et les appartements à 2 680 €/m² (158 ventes). Des prix d'achat élevés : un investissement locatif ici se raisonne sur la durée et la qualité du locataire plus que sur le rendement immédiat.</p>",
  [("Qui loue à Fontaine-lès-Dijon ?", "Surtout des familles et des actifs qui veulent un cadre calme et un extérieur, à quelques minutes de Dijon. Beaucoup louent avant d'acheter dans le secteur."),
   ("Peut-on louer une maison meublée à Fontaine-lès-Dijon ?", "Oui, mais la demande pour une maison porte surtout sur la location vide, avec des locataires qui restent longtemps. Le meublé se prête mieux aux petites surfaces."),
   ("Qui entretient le jardin d'une maison louée ?", "L'entretien courant du jardin revient en principe au locataire. Le mieux est de le préciser dans le bail et de bien le décrire à l'état des lieux."),
   FAQ_GESTION("Fontaine-lès-Dijon")],
  [V("talant"), V("saint-apollinaire")], "/immobilier-fontaine-les-dijon/", "immobilier à Fontaine-lès-Dijon"))

P.append(commune(
  "quetigny", "Quetigny",
  "Mise en location à Quetigny : trouver un locataire",
  "Louer à Quetigny, au bout de la ligne T1 : étudiants, personnel du CHU, familles. Loyer, dossier, bail, état des lieux par Shawez Ali. Sans gestion.",
  "Mettre en location à Quetigny, <em>sur la ligne T1.</em>",
  "À l'est de Dijon, Quetigny est le terminus de la ligne T1, qui passe par le campus, le CHU, le centre et la gare. C'est un atout fort pour louer.",
  "/assets/appartement-centre-historique-dijon-salon.webp", "Salon d'un appartement",
  "Quetigny est une ville de la métropole, avec ses commerces, ses services et des quartiers résidentiels. Sa force pour un propriétaire : le tram T1 relie la commune au campus universitaire, au CHU, au centre de Dijon et à la gare, sans changement.",
  "<p>Cette ligne de tram élargit beaucoup le nombre de locataires possibles : étudiants qui veulent un loyer plus doux qu'à côté du campus, personnel hospitalier qui travaille en horaires décalés, jeunes actifs sans voiture. Les familles, elles, apprécient les écoles et les commerces sur place.</p>",
  ul("Le temps à pied jusqu'à la station de tram la plus proche.",
     "Pour les étudiants : un meublé prêt à vivre et une connexion internet.",
     "Pour les familles : une chambre de plus, un balcon, un stationnement.",
     "Partout : des charges claires et un DPE correct.") +
  "<p>Selon le logement, un meublé pour un étudiant ou un salarié en mission peut se louer plus vite qu'un logement vide. Voir " + A("/location-meublee-dijon/", "la location meublée") + ".</p>",
  "<p>Sur les ventes de 2023 à 2025, le prix médian au m² des appartements à Quetigny est de 1 940 €/m² (140 ventes), celui des maisons de 2 660 €/m² (91 ventes). Un studio ou un deux-pièces proche du tram vise un public large : étudiants, internes, jeunes actifs.</p>",
  [("Peut-on louer à des étudiants à Quetigny ?", "Oui. Le tram T1 relie Quetigny au campus universitaire sans changement : c'est un bon secteur pour un meublé étudiant, avec un bail de 9 mois ou d'un an."),
   ("Le tram compte-t-il pour louer à Quetigny ?", "Beaucoup. La distance à pied jusqu'à une station de la ligne T1 est l'une des premières questions des locataires sans voiture."),
   ("Meublé ou vide à Quetigny ?", "Meublé pour un studio ou un deux-pièces visé par des étudiants ou des salariés en mission ; vide pour un logement familial. Je vous conseille après la visite."),
   FAQ_GESTION("Quetigny")],
  [V("chevigny-saint-sauveur"), V("saint-apollinaire")], "/prix-immobilier-quetigny/", "prix immobilier à Quetigny"))

P.append(commune(
  "chevigny-saint-sauveur", "Chevigny-Saint-Sauveur",
  "Location à Chevigny-Saint-Sauveur : trouver un locataire",
  "Mettre en location à Chevigny-Saint-Sauveur : appartements en résidence, maisons, familles. Loyer, dossier, bail et état des lieux par Shawez Ali. Sans gestion.",
  "Mettre en location à Chevigny-Saint-Sauveur, <em>pour les familles.</em>",
  "Au sud-est de Dijon, à côté de Quetigny, Chevigny-Saint-Sauveur est une commune résidentielle où l'on trouve beaucoup d'appartements en résidence et de maisons avec jardin.",
  "/assets/shawez-ali-depart-visite-dijon.webp", "Shawez Ali part faire une visite",
  "Chevigny-Saint-Sauveur compte beaucoup d'appartements en résidence : sur 2023 à 2025, il s'en est vendu 352, plus qu'à Chenôve ou à Talant. Pour un propriétaire bailleur, c'est un marché actif, avec une vraie concurrence entre logements.",
  "<p>La commune est proche de Quetigny et de ses commerces, et reliée à Dijon par la route et le bus. Les locataires sont en majorité des familles et des actifs qui travaillent dans l'est de la métropole et veulent un cadre calme.</p>"
  "<p>Avec de nombreux logements comparables, la différence se fait sur la présentation, le loyer et la réactivité : une annonce claire et des visites rapides attirent les dossiers les plus solides.</p>",
  ul("Un balcon, une terrasse ou un rez-de-jardin.",
     "Une place de parking ou un garage.",
     "Des charges de résidence connues et raisonnables.",
     "Pour une maison : le jardin, les écoles, le trajet vers le travail.") +
  "<p>Dans une résidence, donnez le montant des charges et ce qu'elles comprennent dès l'annonce : c'est la question qui revient à chaque visite.</p>",
  "<p>Sur les ventes de 2023 à 2025, le prix médian au m² des appartements à Chevigny-Saint-Sauveur est de 2 570 €/m² (352 ventes), celui des maisons de 2 860 €/m² (143 ventes). Pour louer, un appartement avec extérieur et stationnement se démarque dans un marché où l'offre est abondante.</p>",
  [("Qui loue à Chevigny-Saint-Sauveur ?", "Surtout des familles et des actifs qui travaillent dans l'est de la métropole et cherchent un cadre calme, avec un extérieur et un stationnement."),
   ("Comment se démarquer à Chevigny-Saint-Sauveur ?", "Par un loyer juste, des photos soignées, des charges indiquées clairement dès l'annonce et des visites organisées vite."),
   ("Quel dépôt de garantie demander ?", "Au plus 1 mois de loyer hors charges pour un logement vide, 2 mois pour un meublé. C'est la loi, partout en France."),
   FAQ_GESTION("Chevigny-Saint-Sauveur")],
  [V("quetigny"), V("longvic")], "/prix-immobilier-chevigny-saint-sauveur/", "prix immobilier à Chevigny-Saint-Sauveur"))

P.append(commune(
  "longvic", "Longvic",
  "Mise en location à Longvic : trouver un locataire",
  "Louer à Longvic, au sud-est de Dijon : zones d'activités, aéroport, salariés et familles. Mise en location par Shawez Ali, agent immobilier. Sans gestion.",
  "Mettre en location à Longvic, <em>près des zones d'emploi.</em>",
  "Au sud-est de Dijon, Longvic accueille l'aéroport Dijon-Bourgogne et de grandes zones d'activités. Beaucoup de locataires y cherchent un logement proche de leur travail.",
  "/assets/immeuble-ancien-angle-bourgogne.webp", "Immeuble ancien à l'angle de deux rues en Bourgogne",
  "Longvic est une commune de la métropole traversée par le canal de Bourgogne, avec l'aéroport Dijon-Bourgogne et des zones d'activités importantes. Pour un propriétaire, cela donne un public de locataires salariés, qui veulent limiter leurs trajets.",
  "<p>Les locataires sont des salariés des entreprises du secteur, des familles qui cherchent plus de surface pour leur budget qu'à Dijon, et des jeunes actifs. Une partie travaille en horaires décalés : la tranquillité du logement compte.</p>"
  "<p>Le centre de Dijon est accessible en bus et en voiture. Un stationnement facile est un vrai plus pour louer.</p>",
  ul("La proximité de leur lieu de travail.",
     "Un stationnement, souvent indispensable.",
     "Un logement calme, bien isolé du bruit.",
     "Pour les familles : un extérieur et les écoles.") +
  "<p>Selon l'emplacement, le logement peut se trouver dans une zone de bruit liée à l'aérodrome : dans ce cas, un document d'information sur le bruit fait partie du dossier de diagnostics à remettre au locataire.</p>" + src('diag'),
  "<p>Sur les ventes de 2023 à 2025, le prix médian au m² des appartements à Longvic est de 2 180 €/m² (171 ventes), celui des maisons de 2 710 €/m² (105 ventes). Pour louer à des salariés, un logement simple, bien entretenu et facile à garer se loue mieux qu'un logement surdimensionné.</p>",
  [("Qui loue à Longvic ?", "Beaucoup de salariés qui travaillent dans les zones d'activités du secteur, des familles et des jeunes actifs qui veulent limiter leurs trajets."),
   ("Faut-il un diagnostic bruit à Longvic ?", "Seulement si le logement est situé dans une zone d'exposition au bruit d'un aérodrome. Dans ce cas, ce document fait partie du dossier de diagnostics joint au bail."),
   ("Quel loyer demander à Longvic ?", "Il dépend de la surface, de l'état, du stationnement et du DPE. Je vous donne mon avis après la visite, en comparant avec les logements équivalents du secteur."),
   FAQ_GESTION("Longvic")],
  [V("chenove"), V("chevigny-saint-sauveur")], "/prix-immobilier-longvic/", "prix immobilier à Longvic"))

P.append(commune(
  "saint-apollinaire", "Saint-Apollinaire",
  "Location à Saint-Apollinaire : trouver un locataire",
  "Mettre en location à Saint-Apollinaire, à l'est de Dijon : familles, actifs, extérieur. Loyer, dossier, bail et état des lieux par Shawez Ali. Sans gestion.",
  "Mettre en location à Saint-Apollinaire, <em>aux portes de Dijon.</em>",
  "À l'est de Dijon, Saint-Apollinaire est une commune résidentielle recherchée, où les prix d'achat des appartements sont parmi les plus élevés de la première couronne.",
  "/assets/appartement-dijon-cuisine-lumineuse.webp", "Shawez Ali dans la cuisine d'un appartement",
  "Saint-Apollinaire prolonge Dijon vers l'est. On y trouve des maisons, des résidences récentes et des commerces. Pour un propriétaire, c'est un secteur où des logements de bonne qualité attirent des locataires solides.",
  "<p>Les locataires sont surtout des actifs et des familles qui travaillent à Dijon ou dans l'est de la métropole. Ils comparent avec les quartiers est de Dijon : à loyer proche, ils choisissent Saint-Apollinaire pour le calme, l'extérieur et le stationnement.</p>",
  ul("Un logement récent ou rénové, avec un bon DPE.",
     "Un balcon, une terrasse ou un jardin.",
     "Un stationnement fermé.",
     "Le trajet vers le travail et les écoles.") +
  "<p>Dans les résidences récentes, mettez en avant les atouts que l'on ne voit pas sur les photos : isolation, faibles charges de chauffage, ascenseur, local à vélos.</p>",
  "<p>Sur les ventes de 2023 à 2025, le prix médian au m² des appartements à Saint-Apollinaire est de 2 950 €/m² (140 ventes), celui des maisons de 2 970 €/m² (166 ventes). Des prix d'achat élevés pour la première couronne : le loyer doit être fixé avec soin, ni trop haut pour ne pas laisser le logement vide, ni trop bas pour ne pas peser sur la rentabilité.</p>",
  [("Qui loue à Saint-Apollinaire ?", "Des actifs et des familles qui travaillent à Dijon ou dans l'est de la métropole, et qui veulent un logement calme avec extérieur et stationnement."),
   ("Un logement récent se loue-t-il mieux ?", "Souvent, oui : un bon DPE et des charges de chauffage faibles rassurent les locataires. Encore faut-il le montrer clairement dans l'annonce."),
   ("Quel préavis pour mon locataire ?", "Pour un logement vide : 3 mois, ou 1 mois dans certains cas prévus par la loi, dont la zone tendue. Pour un meublé : 1 mois. Vérifiez le classement de la commune sur le simulateur officiel."),
   FAQ_GESTION("Saint-Apollinaire")],
  [V("quetigny"), V("fontaine-les-dijon")], "/prix-immobilier-saint-apollinaire/", "prix immobilier à Saint-Apollinaire"))

P.append(commune(
  "beaune", "Beaune",
  "Mise en location à Beaune : trouver un locataire",
  "Louer à Beaune : salariés de la vigne et du tourisme, centre ancien, gare. Loyer, dossier, bail, état des lieux par Shawez Ali, agent immobilier. Sans gestion.",
  "Mettre en location à Beaune, <em>au cœur des vignes.</em>",
  "Capitale des vins de Bourgogne, Beaune a son propre marché locatif : des salariés de la vigne, du négoce et du tourisme, et des logements anciens dans un centre protégé.",
  "/assets/maison-pierre-volets-rouges-beaune.webp", "Maison en pierre aux volets rouges à Beaune",
  "Beaune est à environ 45 km au sud de Dijon, sur la ligne de train Dijon-Lyon. Son économie, tournée vers le vin et le tourisme, fait venir des salariés toute l'année et des saisonniers au moment des vendanges. Je m'y déplace pour la mise en location comme pour la vente.",
  "<p>Les locataires sont des salariés du vin, du négoce, de l'hôtellerie et de la restauration, des familles, et des personnes qui travaillent à Dijon ou à Chalon-sur-Saône et prennent le train. La gare est un vrai argument pour un logement proche.</p>"
  "<p>Dans le centre ancien, une partie des travaux dépend de l'avis de l'architecte des Bâtiments de France : à prévoir avant une rénovation qui précède une mise en location.</p>",
  ul("Le centre ancien, à pied des commerces, pour les personnes seules et les couples.",
     "La proximité de la gare pour ceux qui travaillent ailleurs.",
     "Pour les familles : une maison avec jardin dans les quartiers résidentiels ou les villages autour.",
     "Partout : un bon DPE, car beaucoup de logements anciens sont difficiles à chauffer.") +
  "<p>La location de courte durée aux touristes obéit à d'autres règles et passe par la mairie : cette page parle de la location d'un logement comme résidence principale du locataire.</p>",
  "<p>En 2025, les appartements vendus dans un rayon de 2 km autour du centre de Beaune se sont signés à 2 610 €/m² en médiane (203 ventes), les maisons à 2 590 €/m² (99 ventes). Dans l'ancien, faites vérifier le DPE avant d'acheter pour louer : un logement classé G ne peut plus être loué pour un nouveau bail.</p>",
  [("Qui loue à Beaune ?", "Des salariés du vin, du négoce, de l'hôtellerie et de la restauration, des familles, et des personnes qui travaillent ailleurs et prennent le train depuis la gare de Beaune."),
   ("Peut-on louer à des saisonniers à Beaune ?", "Oui, avec un bail adapté : un bail mobilité, de 1 à 10 mois, convient à une mission temporaire. La location touristique de courte durée relève d'autres règles."),
   ("Vous déplacez-vous à Beaune ?", "Oui. Je viens visiter le logement, faire les photos, les visites avec les candidats et l'état des lieux d'entrée."),
   FAQ_GESTION("Beaune")],
  [("Immobilier à Nuits-Saint-Georges", "/immobilier-nuits-saint-georges/")], "/agent-immobilier-beaune/", "agent immobilier à Beaune"))

# =====================================================================================
# 7. ARTICLES (section Conseils : flux RSS via outils/build.py)
# =====================================================================================
CTA_ART = ('<div class="btn-row" style="margin-top:32px;"><a class="btn btn-primary btn-lg" href="/location-immobiliere-dijon/">Mettre mon logement en location <span class="arw">→</span></a>'
           '<a class="btn" href="/contact/">Écrire à Shawez</a></div>')


def article(slug, short, **kw):
    path = "/conseils-vendeurs/%s/" % slug
    d = dict(id="guide-" + slug, route="/conseils", path=path, date=DATE, date_fr=DATE_FR, article=True, og_type="article",
             label="Guide location", crumbs=[("Conseils", "/conseils-vendeurs/"), (short, path)],
             img_w=720, img_h=900, cta_html=CTA_ART, side_title="À lire ensuite")
    d.update(kw)
    return d


P.append(article(
  "louer-appartement-dijon-guide-proprietaire", "Louer son appartement à Dijon",
  title="Louer son appartement à Dijon : guide du propriétaire",
  description="Avant, pendant et après la signature : ce qu'un propriétaire doit savoir pour louer son appartement à Dijon et garder la main, sans gestion locative.",
  h1="Louer son appartement à Dijon : <em>le guide du propriétaire.</em>", h1_plain="Louer son appartement à Dijon : le guide du propriétaire",
  lede="Vous avez décidé de louer. Voici, dans l'ordre, ce qu'il faut préparer, ce qu'il faut signer, et ce qui vous revient une fois le locataire installé.",
  image="/assets/appartement-centre-historique-dijon-salon.webp", image_alt="Salon d'un appartement ancien dans le centre de Dijon",
  intro="Je fais de la mise en location sans gestion : je trouve le locataire, je prépare le bail, je fais l'état des lieux, puis le propriétaire reprend la main. Ce guide sert justement à cela : savoir ce qui vous attend avant, pendant et après, pour louer sereinement.",
  sections=[
    ("avant-de-louer", "Avant de louer : trois décisions",
     ol("<strong>Vide ou meublé.</strong> Le bail, le préavis, le dépôt de garantie et les impôts changent. J'ai détaillé le choix dans " + A(L_A2[1], "location meublée ou vide") + ".",
        "<strong>Le loyer.</strong> À Dijon, il est libre, sauf pour les logements classés F ou G, dont le loyer ne peut plus augmenter. Voir " + A("/estimation-loyer-dijon/", "estimer le loyer") + ".",
        "<strong>L'état du logement.</strong> Il doit être décent : pas de risque pour la sécurité ou la santé, des équipements qui fonctionnent, une pièce principale d'au moins 9 m² sous 2,20 m de plafond (ou 20 m³), et un niveau de performance énergétique minimal.") +
     "<p>Ce dernier point est devenu le plus important : un logement classé G ne peut plus être loué pour un nouveau bail depuis le 1er janvier 2025, les F suivront au 1er janvier 2028 et les E au 1er janvier 2034. Faites faire le DPE avant tout le reste.</p>" +
     '<p style="font-size:.9em;opacity:.8;">Décence : décret n° 2002-120 du 30 janvier 2002.</p>' + src('anil_fg', 'g2025')),
    ("les-assurances", "Les assurances",
     ul("<strong>Votre locataire</strong> doit assurer le logement contre les risques locatifs et vous en donner l'attestation, à l'entrée puis chaque année.",
        "<strong>Vous</strong>, si le logement est en copropriété, devez être assuré en responsabilité civile en tant que copropriétaire non occupant. Une assurance propriétaire non occupant couvre en général ce risque et d'autres : faites le point avec votre assureur.")),
    ("la-signature", "La signature : le bail et ses annexes",
     "<p>Le bail d'un logement loué comme résidence principale suit un modèle fixé par la loi. On y joint le dossier de diagnostics, une notice d'information sur les droits et devoirs de chacun, l'état des lieux d'entrée et, pour un meublé, l'inventaire du mobilier. La liste complète est dans " + A(L_A3[1], "les documents obligatoires pour louer") + ".</p>"
     "<p>Le jour de l'entrée : état des lieux, relevé des compteurs, remise des clés et des badges, et encaissement du dépôt de garantie et du premier loyer.</p>"),
    ("apres-la-signature", "Après la signature : ce qui vous revient",
     ul("<strong>Encaisser le loyer</strong> et, si votre locataire le demande, lui remettre une quittance, sans frais.",
        "<strong>Régulariser les charges</strong> une fois par an pour un logement vide : comparer les provisions versées aux dépenses réelles, et tenir les justificatifs à disposition du locataire.",
        "<strong>Réviser le loyer</strong> si le bail le prévoit, une fois par an, selon l'indice de référence des loyers publié par l'Insee, sauf pour un logement classé F ou G.",
        "<strong>Faire les réparations</strong> qui vous incombent : gros entretien et remplacement des équipements usés. Le menu entretien et les petites réparations reviennent au locataire.",
        "<strong>Demander l'attestation d'assurance</strong> chaque année.",
        "<strong>Déclarer vos loyers</strong> : revenus fonciers pour un logement vide, bénéfices industriels et commerciaux pour un meublé.") +
     "<p>Rien de tout cela n'est compliqué si c'est fait régulièrement. Un tableau avec les dates d'échéance suffit souvent.</p>" + src('videmeuble', 'anil_fg')),
    ("le-depart", "Le départ du locataire",
     ul("<strong>Préavis</strong> : 3 mois pour un logement vide, réduit à 1 mois dans certains cas (premier emploi, mutation, perte d'emploi, santé…) ; 1 mois pour un meublé. Le congé doit arriver par lettre recommandée, acte de commissaire de justice ou remise en main propre contre signature.",
        "<strong>État des lieux de sortie</strong> : il se compare à celui d'entrée, pièce par pièce. L'usure normale n'est pas à la charge du locataire.",
        "<strong>Dépôt de garantie</strong> : à rendre sous 1 mois si l'état des lieux de sortie est conforme, sous 2 mois sinon, diminué des sommes justifiées. Chaque mois de retard commencé coûte 10 % du loyer mensuel hors charges.") +
     "<p>C'est aussi le moment de préparer la relocation : je peux faire les photos et publier l'annonce avant même que le logement soit libre.</p>" + src('preavis', 'depot')),
    ("sans-gestion", "Louer sans gestion : pour qui ?",
     "<p>La mise en location sans gestion convient au propriétaire qui habite dans la région, qui veut connaître son locataire et qui préfère ne pas payer de frais de gestion chaque mois. Le moment délicat, c'est le choix du locataire et le bail : c'est là que j'interviens. Ensuite, " + SANS_GESTION + ".</p>"
     "<p>Pour une question juridique précise, l'" + A(S['adil'][1], "ADIL de la Côte-d'Or") + " donne des conseils neutres et sans frais aux propriétaires comme aux locataires.</p>"),
  ],
  faq=[
    ("Que doit faire un propriétaire après la signature du bail ?", "Encaisser le loyer, remettre une quittance si le locataire la demande, régulariser les charges chaque année pour un logement vide, réviser le loyer si le bail le prévoit, faire les grosses réparations, demander l'attestation d'assurance et déclarer les loyers."),
    ("Peut-on louer un logement classé G à Dijon ?", "Non pour un nouveau bail : depuis le 1er janvier 2025, un logement classé G ne peut plus être loué pour un bail signé ou renouvelé."),
    ("La quittance de loyer est-elle payante ?", "Non. Le propriétaire doit la remettre sans frais au locataire qui la demande."),
  ],
  links=[L_MAIN, L_A2, L_A3, L_A4, L_LOYER],
))

TABLE = ('<div style="overflow-x:auto;"><table><thead><tr><th scope="col"></th><th scope="col">Vide</th><th scope="col">Meublé</th></tr></thead><tbody>'
         '<tr><td>Durée du bail</td><td>3 ans (propriétaire particulier)</td><td>1 an, ou 9 mois pour un étudiant</td></tr>'
         '<tr><td>Préavis du locataire</td><td>3 mois, ou 1 mois dans certains cas</td><td>1 mois</td></tr>'
         '<tr><td>Préavis du bailleur</td><td>6 mois avant la fin du bail</td><td>3 mois avant la fin du bail</td></tr>'
         '<tr><td>Dépôt de garantie</td><td>1 mois de loyer hors charges au plus</td><td>2 mois de loyer hors charges au plus</td></tr>'
         '<tr><td>Charges</td><td>Provisions et régularisation annuelle</td><td>Provisions ou forfait</td></tr>'
         '<tr><td>Impôt sur le revenu</td><td>Revenus fonciers</td><td>Bénéfices industriels et commerciaux</td></tr>'
         '</tbody></table></div>')

P.append(article(
  "location-meublee-ou-vide-dijon", "Meublé ou vide à Dijon",
  title="Location meublée ou vide à Dijon : que choisir ?",
  description="Bail, préavis, dépôt de garantie, charges, impôts, profil des locataires : le comparatif pour choisir entre location meublée et vide à Dijon.",
  h1="Location meublée ou vide à Dijon : <em>que choisir ?</em>", h1_plain="Location meublée ou vide à Dijon : que choisir",
  lede="Ce n'est pas qu'une question de meubles. Le choix change la durée du bail, le préavis, le dépôt de garantie, vos impôts et le type de locataire qui va vous appeler.",
  image="/assets/loft-charpente-cuisine.webp", image_alt="Cuisine ouverte sous une charpente apparente",
  intro="C'est l'une des premières questions que l'on me pose quand on veut louer à Dijon. Il n'y a pas de bonne réponse en général, mais il y a presque toujours une bonne réponse pour un logement donné. Voici les règles, puis la façon dont je raisonne.",
  sections=[
    ("les-regles-cote-a-cote", "Les règles, côte à côte",
     TABLE + "<p>Un meublé doit contenir la liste d'équipements fixée par le décret du 31 juillet 2015 : literie, occultation des chambres, plaques, four ou micro-ondes, réfrigérateur avec congélation, vaisselle et ustensiles, table et sièges, rangements, luminaires, matériel d'entretien. Le détail est sur la page " + A("/location-meublee-dijon/", "location meublée à Dijon") + ".</p>" +
     src('videmeuble', 'preavis', 'depot')),
    ("le-logement-decide", "Le logement décide souvent pour vous",
     ul("<strong>Un studio ou un deux-pièces</strong> près du campus, du centre ou du tram : le meublé s'impose presque, car les étudiants et les jeunes actifs n'ont pas de meubles.",
        "<strong>Un trois-pièces ou plus</strong>, une maison : la location vide attire des familles qui restent longtemps et s'installent avec leurs propres meubles.",
        "<strong>Un logement à rénover</strong> : mieux vaut faire les travaux avant de choisir. Un meublé fatigué se loue mal.")),
    ("votre-temps", "Votre temps et votre tranquillité",
     "<p>Un meublé change plus souvent de locataire : plus d'états des lieux, plus de périodes de relocation, du mobilier à entretenir et à remplacer. En échange, vous récupérez plus facilement votre logement et le loyer est en général plus élevé.</p>"
     "<p>Un logement vide demande moins d'interventions, mais le bail dure au moins 3 ans et le propriétaire ne peut donner congé qu'à son échéance, pour vendre, pour habiter le logement ou pour un motif sérieux.</p>"),
    ("les-impots", "Les impôts : à voir avant, pas après",
     "<p>Les loyers d'un logement vide sont des revenus fonciers ; ceux d'un meublé relèvent des bénéfices industriels et commerciaux. Les règles et les abattements diffèrent, et ils évoluent avec les lois de finances. Faites une simulation avec votre comptable ou votre notaire avant de choisir : selon votre situation, l'écart peut être important.</p>"),
    ("mon-conseil", "Mon conseil",
     "<p>Partez du logement et du secteur, pas de l'impôt seul. Un meublé mal placé restera vide ; un grand logement familial meublé attirera peu de monde. Quand j'hésite, je regarde qui appelle pour les logements comparables du secteur : c'est l'indication la plus fiable.</p>"),
  ],
  faq=[
    ("Quelle est la différence de dépôt de garantie entre vide et meublé ?", "Au plus 1 mois de loyer hors charges pour un logement vide, au plus 2 mois pour un meublé."),
    ("Le préavis est-il plus court en meublé ?", "Oui pour le locataire : 1 mois en meublé, contre 3 mois en vide (ou 1 mois dans certains cas). Pour le propriétaire : 3 mois avant la fin du bail en meublé, 6 mois en vide."),
    ("Meublé ou vide pour un studio à Dijon ?", "Le plus souvent meublé : les studios sont loués à des étudiants et à des jeunes actifs qui n'ont pas de meubles. Un bail de 9 mois est possible pour un étudiant."),
  ],
  links=[L_MEUBLE, L_ETUD, L_A1, L_LOYER, L_MAIN],
))

P.append(article(
  "documents-obligatoires-location", "Documents obligatoires pour louer",
  title="Les documents obligatoires pour louer un logement",
  description="Diagnostics, bail type, notice d'information, état des lieux, inventaire, mentions de l'annonce : la liste des documents obligatoires pour louer un logement.",
  h1="Les documents obligatoires <em>pour louer un logement.</em>", h1_plain="Les documents obligatoires pour louer un logement",
  lede="Un bail sans ses annexes, c'est un bail fragile. Voici ce qu'il faut réunir avant l'annonce, puis le jour de la signature.",
  image="/assets/shawez-ali-conseil-vendeur-dijon.webp", image_alt="Shawez Ali, agent immobilier à Dijon", img_w=512, img_h=640,
  intro="Quand je prépare une mise en location, je commence toujours par les documents. Un diagnostic manquant ou périmé peut retarder la signature, ou fragiliser le bail plus tard. Voici la liste, avec ce que dit la loi.",
  sections=[
    ("avant-l-annonce", "Avant l'annonce : le DPE",
     "<p>Le diagnostic de performance énergétique doit être fait avant de publier l'annonce : ses classes énergie et climat doivent y figurer, avec une estimation des dépenses annuelles d'énergie. Si le logement est classé F ou G, l'annonce doit indiquer « logement à consommation énergétique excessive ».</p>" +
     ul("Un DPE est valable 10 ans.",
        "Les DPE réalisés entre le 1er janvier 2018 et le 30 juin 2021 ne sont plus valables depuis le 1er janvier 2025.",
        "Au 1er janvier 2027, le calcul change pour les logements chauffés à l'électricité : certains gagneront une classe. Un DPE existant pourra être mis à jour sans frais sur le site de l'observatoire de l'Ademe, sans nouvelle visite.") +
     src('dpe', 'dpe2027')),
    ("le-dossier-de-diagnostics", "Le dossier de diagnostics techniques",
     "<p>Il est annexé au bail à la signature et à chaque renouvellement. Il comprend, selon le logement :</p>" +
     ul("<strong>le DPE</strong> ;",
        "<strong>le constat de risque d'exposition au plomb</strong>, si l'immeuble a été construit avant le 1er janvier 1949 ;",
        "<strong>l'état de l'installation intérieure d'électricité</strong>, si elle a plus de 15 ans ;",
        "<strong>l'état de l'installation intérieure de gaz</strong>, si elle a plus de 15 ans ;",
        "<strong>l'état des risques</strong> (naturels, miniers, technologiques, sismiques, radon), si le logement est dans une zone concernée ;",
        "<strong>le diagnostic bruit</strong>, si le logement est dans une zone d'exposition au bruit d'un aérodrome ;",
        "<strong>le diagnostic amiante</strong> : il fait partie du dossier, mais il n'est pas joint au bail ; le locataire peut le consulter sur demande.") +
     "<p>Les diagnostics sont faits par un diagnostiqueur certifié, sauf l'état des risques et le diagnostic bruit, que le propriétaire peut remplir lui-même.</p>" + src('diag')),
    ("le-bail-et-ses-annexes", "Le bail et ses annexes",
     ul("<strong>Le bail</strong>, rédigé selon le modèle type fixé par décret pour un logement loué comme résidence principale, vide ou meublé.",
        "<strong>La notice d'information</strong> sur les droits et obligations du propriétaire et du locataire.",
        "<strong>L'état des lieux d'entrée</strong>, fait ensemble, pièce par pièce.",
        "<strong>L'inventaire du mobilier</strong>, pour un meublé.",
        "<strong>Les extraits du règlement de copropriété</strong> qui concernent l'usage du logement et des parties communes, et la répartition des charges.",
        "<strong>Le dossier de diagnostics</strong> décrit plus haut.") +
     "<p>Côté locataire, vous recevez l'attestation d'assurance habitation à l'entrée, puis chaque année.</p>" + src('videmeuble')),
    ("le-dossier-du-candidat", "Ce que vous pouvez demander au candidat",
     "<p>La liste est fermée : une pièce d'identité, un justificatif de domicile, des justificatifs de situation professionnelle et de ressources, et les mêmes catégories de pièces pour le garant. Demander autre chose expose à une amende pouvant aller jusqu'à 3 000 € pour un particulier, 15 000 € pour une société.</p>" + src('pieces')),
    ("a-dijon", "À Dijon, en pratique",
     "<p>Je vérifie le dossier de diagnostics dès la première visite, avant les photos. Dans le centre historique, beaucoup d'immeubles datent d'avant 1949 : le constat plomb est alors obligatoire. Et dans les immeubles anciens, l'installation électrique a souvent plus de 15 ans.</p>"
     "<p>Certaines communes imposent aussi une autorisation ou une déclaration avant de louer dans certains quartiers (le « permis de louer ») : renseignez-vous auprès de la mairie avant de signer.</p>"),
  ],
  faq=[
    ("Quels diagnostics sont obligatoires pour louer ?", "Le DPE, et selon le logement : le constat plomb (immeuble d'avant 1949), l'état des installations d'électricité et de gaz (plus de 15 ans), l'état des risques, le diagnostic bruit près d'un aérodrome. Le diagnostic amiante fait partie du dossier, consultable sur demande."),
    ("Combien de temps un DPE est-il valable ?", "10 ans. Les DPE réalisés entre le 1er janvier 2018 et le 30 juin 2021 ne sont plus valables depuis le 1er janvier 2025."),
    ("Le DPE doit-il figurer dans l'annonce ?", "Oui : les classes énergie et climat, l'estimation des dépenses annuelles d'énergie, et la mention « logement à consommation énergétique excessive » pour un logement classé F ou G."),
  ],
  links=[L_A1, L_A4, L_MAIN, L_MEUBLE, L_HONO],
))

P.append(article(
  "trouver-bon-locataire", "Trouver un bon locataire",
  title="Trouver un bon locataire : la méthode",
  description="Annonce, premier appel, visite, dossier, garant ou Visale, choix final : la méthode de Shawez Ali, agent immobilier à Dijon, pour trouver un bon locataire.",
  h1="Trouver un bon locataire : <em>la méthode.</em>", h1_plain="Trouver un bon locataire : la méthode",
  lede="Un bon locataire, ce n'est pas seulement un gros salaire. C'est un dossier cohérent, un projet qui tient, et une personne qui va prendre soin du logement.",
  image="/assets/shawez-ali-telephone-costume-bleu.webp", image_alt="Shawez Ali au téléphone avec un candidat locataire", img_w=1200, img_h=1500,
  intro="Choisir un locataire, c'est la décision la plus importante d'une location. Une erreur se paie pendant des mois ; un bon choix vous fait oublier la location pendant des années. Voici la méthode que j'applique à chaque mise en location.",
  sections=[
    ("une-annonce-qui-trie", "1. Une annonce qui trie déjà",
     "<p>Une annonce précise attire moins d'appels, mais des appels plus utiles. Loyer, charges, dépôt de garantie, disponibilité, vide ou meublé, DPE, stationnement, étage : tout doit y être. Le candidat qui appelle sait déjà que le logement lui convient.</p>"),
    ("le-premier-appel", "2. Le premier appel",
     "<p>Quelques questions simples avant de proposer une visite : date d'entrée souhaitée, raison du déménagement, situation professionnelle, garant ou Visale. Pas pour juger, mais pour éviter une visite qui n'aboutira pas, pour le candidat comme pour vous.</p>"),
    ("la-visite", "3. La visite",
     "<p>Je montre le logement tel qu'il est, défauts compris, et j'écoute les questions. Un candidat qui demande le montant des charges, le mode de chauffage ou la date de la dernière régularisation est un candidat qui se projette sérieusement.</p>"),
    ("le-dossier", "4. Le dossier : complet, cohérent, vrai",
     ul("<strong>Complet</strong> : uniquement les pièces prévues par la loi, mais toutes.",
        "<strong>Cohérent</strong> : le contrat, les bulletins de salaire et l'avis d'imposition racontent la même histoire.",
        "<strong>Vrai</strong> : l'avis d'imposition peut être contrôlé sur le service officiel de vérification des avis d'impôt de l'administration fiscale, à partir de son numéro fiscal et de sa référence.") +
     "<p>Beaucoup de propriétaires demandent des revenus d'environ trois fois le loyer. Ce n'est pas une règle légale, c'est un repère : un dossier un peu en dessous avec un garant solide ou la garantie Visale peut valoir plus qu'un dossier au-dessus mais incohérent.</p>" + src('pieces')),
    ("garant-visale-assurance", "5. Garant, Visale ou assurance loyers impayés",
     ul("<strong>Un garant</strong> : une personne qui s'engage à payer à la place du locataire. Vous pouvez demander pour lui les mêmes catégories de pièces.",
        "<strong>La garantie Visale</strong> d'Action Logement : sans frais pour le locataire et pour le propriétaire, elle couvre les loyers impayés et les dégradations. Depuis janvier 2026, elle couvre les trois premières années d'occupation.",
        "<strong>Une assurance loyers impayés</strong> : si vous en souscrivez une, vous ne pouvez pas, en principe, demander en plus un garant, sauf si le locataire est étudiant ou apprenti.") + src('visale')),
    ("le-choix", "6. Le choix, sans discrimination",
     "<p>Le choix vous appartient, mais il doit reposer sur la solvabilité et le sérieux du dossier. Refuser un candidat pour son origine, son nom, son lieu de résidence, son âge, sa situation de famille, son état de santé, son handicap ou ses opinions est une discrimination interdite par la loi.</p>"
     "<p>Quand je présente les dossiers à un propriétaire, je les classe sur des critères objectifs : ressources, stabilité, garantie, date d'entrée, et ce que la visite m'a appris. Ensuite, c'est vous qui décidez.</p>"),
    ("l-entree", "7. L'entrée dans les lieux",
     "<p>Un bon départ évite bien des litiges : bail clair, état des lieux détaillé avec photos, relevé des compteurs, attestation d'assurance reçue avant la remise des clés. C'est la dernière étape de ma mission : " + SANS_GESTION + ".</p>"),
  ],
  faq=[
    ("Quels revenus demander à un locataire ?", "Aucune loi ne fixe de seuil. Beaucoup de propriétaires prennent comme repère des revenus d'environ trois fois le loyer, mais un garant solide ou la garantie Visale compte autant que le salaire."),
    ("Peut-on vérifier un avis d'imposition ?", "Oui, avec le service officiel de vérification des avis d'impôt de l'administration fiscale, à partir du numéro fiscal et de la référence de l'avis."),
    ("Peut-on cumuler un garant et une assurance loyers impayés ?", "En principe non, sauf si le locataire est étudiant ou apprenti."),
    ("Qui choisit le locataire quand je passe par vous ?", "Vous. Je vous présente les dossiers vérifiés et classés sur des critères objectifs ; la décision finale vous appartient."),
  ],
  links=[L_A3, L_A1, L_MAIN, L_LOCAT, L_HONO],
))


def insecables(x):
    """Espaces insécables dans les nombres (3 000 €, 8,07 €, 9 m²) pour qu'ils ne se coupent pas en fin de ligne."""
    if isinstance(x, str):
        x = re.sub(r'(\d) (\d{3})', '\\1\u00a0\\2', x)
        return re.sub(r'(\d) (€|%|m²|m³|km|mois|ans?\b)', '\\1\u00a0\\2', x)
    if isinstance(x, list):
        return [insecables(i) for i in x]
    if isinstance(x, tuple):
        return tuple(insecables(i) for i in x)
    if isinstance(x, dict):
        return {k: (v if k in ('path', 'id', 'route', 'image', 'crumbs', 'links') else insecables(v)) for k, v in x.items()}
    return x


if __name__ == '__main__':
    P = insecables(P)
    out = sys.argv[1] if len(sys.argv) > 1 else '/tmp/location.json'
    json.dump(P, open(out, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(len(P), 'pages ->', out)

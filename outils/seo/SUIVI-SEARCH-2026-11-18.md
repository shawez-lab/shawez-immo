# Suivi des corrections Search — 18 novembre 2026

Les changements sont proposés en quatre PR successives : high (#56), services et identité (#57), quartiers et communes (#58), puis finitions (la PR de cette branche). Elles ne sont ni fusionnées ni publiées sur main. Les paragraphes de réponse aux 17 questions françaises sont définis dans `search_reponses.py`, posés immédiatement après le H1 et vérifiés par les tests.

## Sources et décisions

- Prix : exclusivement `donnees-dvf/`, même filtre de ventes simples et même périmètre communal. Pour 2025 à Dijon : appartements 2 680 €/m² (2 488 ventes), maisons 3 259 €/m² (381 ventes), ensemble 2 750 €/m². Les médianes exactes restent dans le manifeste ; l’affichage est arrondi à l’euro. Le jeu local ne contient pas de ventes 2026, donc aucun prix 2026 n’est extrapolé.
- Quartiers : contours municipaux existants, huit guides déjà publiés, et quatre dossiers déjà cités sur la page Secteurs, sans transformation d’une estimation ou d’un film en vente conclue. Fontaine d’Ouche est décrit uniquement depuis DVF.
- Communes voisines : segments de frontière partagés dans la réponse officielle de geo.api.gouv.fr, source/date/empreinte dans `communes-voisines.json`. Neuilly-Crimolois : contour officiel conservé et 70 ventes locales sous l’ancien libellé vérifiées à l’intérieur ; aucun autre point du jeu n’a été trouvé dans ce contour. Cela ne prétend pas compter toutes les mutations, puisque le filtre des ventes simples demeure.
- Mandats : uniquement exclusifs en vente, suivant la consigne explicite de Shawez. Aucun « vous choisissez » entre simple et exclusif.
- Identité : « Shawez Ali » partout dans son entité, même si S38 du fichier d’origine contredit S18/S33. La consigne explicite de Shawez prévaut. Huit langues : fr en hi ur pa fa el ar. Horaires retirés de l’entité de l’agence et libellés « Mes horaires » sur Contact.
- Avis : `avis.json` ne contient aucun texte de témoignage. Les notes restent datées du vrai relevé d’octobre ; elles ne sont pas transformées en relevé du jour. Aucun avis, nom de client ni résumé de témoignages n’a été fabriqué.
- Annuaire confirmé : [profil Cylex](https://www.cylex-locale.fr/entreprises/shawez-ali-%E2%80%94-agent-immobilier-34684176.html), vérifié le 18 novembre, nom/téléphone/site concordants. Il est ajouté aux profils de Shawez ; aucun profil hypothétique n’est créé.
- Délai : environ trois mois du compromis à l’acte, comme demandé et expliqué par les [Notaires de France](https://www.notaires.fr/fr/immobilier-fiscalite/achat-et-vente-les-etapes/les-delais-apres-signature). Ce repère habituel n’est pas présenté comme une durée légale fixe, ni comme le délai de recherche d’un acheteur.

## S1 à S41

| Correction | État et résultat |
|---|---|
| S1 high | Fait : source DVF commune partagée, prix/estimation/FAQ/guide cohérents, réponse 2026 en tête, comparaison par type et quartier explicitée. |
| S2 high | Fait : title et H1 maison/appartement à Dijon, introduction Dijon/métropole/Beaune. |
| S3 high | Laissé de côté : mentions indépendantes et démarches auprès de vrais partenaires, hors corrections du dépôt ; aucune relation ni publication extérieure inventée. Voir faits manquants. |
| S4 medium | Fait : pages maison et appartement, estimation offerte, documents, barème, rendez-vous ; délai réel non inventé. |
| S5 medium | Fait : page immeuble, loyers/baux/charges/travaux, estimation et honoraires, liens depuis vente et professionnel. |
| S6 medium | Guide dédié et position exclusive faits ; durée et sortie du mandat réel laissées de côté faute de contrat de l’agence. |
| S7 medium | Fait : réponse de choix en tête, agence/adresse professionnelle, note datée, secteurs, langues, liens depuis accueil et agent. |
| S8 medium | Fait : médianes communales en tête et paragraphes de quartier fondés sur DVF ; arrondis cohérents. |
| S9 medium | Fait : réponse et FAQ estimation de maison, coût offert, avis écrit, terrain/travaux/DPE et médiane locale. |
| S10 medium | Réponse factuelle et liens faits ; nombre de ventes laissé de côté. |
| S11 medium | Réponse et FAQ commerce ajoutées sans promettre une évaluation offerte ni appliquer le barème résidentiel aux fonds ; tarif et offre réels laissés de côté. |
| S12 medium | Repère compromis/acte d’environ trois mois ajouté en tête et FAQ ; délai de recherche d’acheteur propre à Shawez laissé de côté. |
| S13 medium | Limites de l’outil, DVF, visite et avis offert expliqués en tête, FAQ et source du formulaire ; écart habituel mesuré et largeur habituelle non inventés. |
| S14 medium | Preuves et nom en tête du guide et de la page agent, suivi hebdomadaire et moyens de présentation ; chiffres d’activité propres à Shawez laissés de côté. |
| S15 medium | Extraits et synthèse des avis laissés de côté : aucun texte réel dans la source ; notes datées et lien Google conservés. |
| S16 medium | Fait : intitulé 2026 avec millésime réel 2025 explicite, source DVF locale seulement, pas de faux prix annuel 2026. |
| S17 medium | Fait : title et H1 « vendre un fonds de commerce à Dijon ». |
| S18 medium | Fait : nom exact, autre nom, langues et rattachement cohérents dans les générateurs et les sorties. |
| S19 medium | Profil Cylex confirmé ajouté ; adresses des autres fiches laissées de côté tant qu’elles ne sont pas vérifiées. |
| S20 medium | Fait : neuf passages propres, huit liens de guides et quatre dossiers prouvés ; aucun repère ni dossier inventé pour combler les manques. |
| S21 medium | Fait : 15 pages prioritaires en version complète, données DVF par type/pièces/rues/année/FAQ, intervention depuis Dijon explicitée. |
| S22 medium | Fait : voisins limitrophes issus des frontières officielles, jamais de l’ordre d’une liste ni de distances entre centres. |
| S23 medium | Fait : neuf liens et noms cohérents sur prix Dijon et Secteurs ; réponse sur la comparaison des quartiers corrigée. |
| S24 medium | Dossiers de Talant, Fontaine-lès-Dijon, Saint-Apollinaire, Chenôve et Neuilly-Crimolois repris avec leurs seuls faits prouvés ; dossiers/datations/rôle du collègue manquants laissés de côté. |
| S25 low | Fait : barème résumé dans la FAQ vente avec lien, forfaits et exigibilité seulement à la vente. |
| S26 low | Maison/appartement et avis écrit offert en tête faits ; délai de remise de l’avis laissé de côté. |
| S27 low | H1 et réponse de barème faits ; trous des tranches et tarif des fonds laissés de côté, sans modifier des honoraires contractuels par supposition. |
| S28 low | Trois FAQ commerce ajoutées à partir des pièces déjà citées ; délais, frais et liste exacte propres à l’agence laissés de côté. |
| S29 low | Prix des appartements du Centre-Ville et critères de vente en tête, lien au guide ; profil des acheteurs selon les ventes de Shawez laissé de côté. |
| S30 low | Fait : title prestige/Côte-d’Or/vendre-acheter, bouton d’estimation et téléphone près du haut. |
| S31 low | Fait : H1 honoraires vente et location à Dijon, barème de GRAVELIN IMMO. |
| S32 low | Fait : nom actuel Neuilly-Crimolois, contrôle spatial des ventes disponibles, page canonique et ancien chemin en 301. |
| S33 low | Fait : nom de l’entité « Shawez Ali ». |
| S34 low | Fait : huit langues dans knowsLanguage et les points de contact existants. |
| S35 low | Fait : horaires retirés du bloc agence, « Mes horaires » sur Contact et clarification de llms.txt. |
| S36 low | Fait : bloc personnel d’activité sur Contact et lien about vers l’entité agent sur les WebPage. |
| S37 low | Chaîne de l’agence retirée des profils personnels et lien Maps actualisé ; éventuel Facebook personnel laissé de côté faute d’URL vérifiée. |
| S38 low | Fait : llms.txt « Fiche Google : Shawez Ali » et nom canonique conforme à la consigne explicite. |
| S39 low | Non vérifié : le réglage est documenté par Google, mais les outils navigateur expirent avant l’ouverture de la propriété. Aucun réglage modifié. |
| S40 low | Fait : prix affichés arrondis à l’euro et Grésilles accentué partout dans les pages générées. |
| S41 low | Code fait et testé : héros sans autoplay/preload auto initial, sources différées après load et deux frames, affiche seule si économie de données ou animations réduites. Mesure PageSpeed du résultat non réalisée : la version corrigée n’est pas publiée, et l’accès navigateur est indisponible. |

## Faits laissés de côté

Chaque marqueur ci-dessous désigne une information manquante ; il n’a pas été publié comme une promesse commerciale.

- S3 : [À DEMANDER À SHAWEZ] vrais partenaires, réseaux auxquels il appartient et histoire concrète à proposer. Aucune sollicitation ni inscription extérieure envoyée.
- S6 : [À DEMANDER À SHAWEZ] modèle de mandat réellement utilisé, durée, période minimale et modalités de sortie. Le guide renvoie à la lecture du contrat sans les inventer.
- S10/S14 : [À DEMANDER À SHAWEZ] nombre de ventes sur 12 mois, périmètre, écart affiché/signé et échantillon. Aucun chiffre de performance ajouté.
- S11/S28/S27 : [À DEMANDER À SHAWEZ] évaluation d’un fonds offerte ou non, honoraires de cession, délai constaté et liste exacte de pièces. Le barème résidentiel n’est pas assimilé à celui des fonds.
- S12 : [À DEMANDER À SHAWEZ] délai réel entre mise en vente et acheteur, période et nombre de ventes. Seul le repère compromis/acte est chiffré.
- S13 : [À DEMANDER À SHAWEZ] largeur habituelle et écart observé entre estimation en ligne et avis final, avec échantillon.
- S15 : [À DEMANDER À SHAWEZ] textes réels des avis, liens, dates et droit de réutilisation, ainsi qu’un nouveau relevé de notes. Aucun nom de client n’est publié par le générateur, même si de vrais textes sont ajoutés ensuite.
- S19/S37 : [À DEMANDER À SHAWEZ] URL vérifiée de chaque autre profil publié, dont Mappy et un éventuel Facebook personnel. Le seul nouvel annuaire confirmé est Cylex.
- S20/S24 : [À DEMANDER À SHAWEZ] dossiers réels et datations manquantes, notamment Beaune et Nuits-Saint-Georges, rôle exact du collègue éventuel, et matière d’un guide de Fontaine d’Ouche. Les cinq communes et quatre quartiers déjà documentés ne valent pas preuve d’activité dans toutes les autres communes.
- S26 : [À DEMANDER À SHAWEZ] délai habituel de remise de l’avis de valeur écrit.
- S27 : [À DEMANDER À SHAWEZ] barème de l’agence validé sans trous entre les tranches ; les limites monétaires existantes n’ont pas été corrigées par supposition.
- S29 : [À DEMANDER À SHAWEZ] profil des acheteurs du centre d’après ses ventes réelles.
- S39 : contrôle de « Include » laissé de côté pour accès navigateur indisponible. [Documentation Google](https://support.google.com/webmasters/answer/16908024?hl=en).
- S41 : mesure PageSpeed de la version corrigée laissée de côté avant publication ; aucun score annoncé.

## Validation et préservation

- Tests SEO de géométrie, données DVF, partition, confidentialité, prix communaux, noms, langues, FAQ, profils, voisinages, 58 pages hors zone, redirection, neuf textes distincts, maillage et régénération.
- Tests du constructeur et quatre scénarios Node du héros (mobile, bureau, économie de données, animations réduites).
- Aucun secret modifié. Aucun lecteur, média ou système vidéo de fiche modifié ; le changement de chargement ne concerne que le héros d’accueil.
- Pas de nouvelle image de synthèse ni de nouvel avis ; les visuels existants sont réutilisés.
- La copie de travail est textuelle : les fichiers média ne sont pas téléchargés. Le flux RSS conserve les enclosures connues et le sitemap vidéo est conservé ; aucun résultat PageSpeed n’est déduit de cette copie.

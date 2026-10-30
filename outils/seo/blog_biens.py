#!/usr/bin/env python3
"""Blog international : maisons, villages, domaines et commerces (aucun prix inventé ; prix réels = pages DVF)."""
from blog_commun import en, L, X, LANGUES_EN

LE_MEUR = X("https://www.actu-juridique.fr/fiscalite/fiscal-finances/locations-touristiques-ce-que-change-la-loi-le-meur/",
            "Actu-Juridique")
FRANCE_RENOV = X("https://france-renov.gouv.fr/", "France Rénov'")

# --------------------------------------------------------------------------------------------- 1. CÔTE DE NUITS
en(
  id="en-grands-crus", path="/en/homes-on-the-route-des-grands-crus/", theme="homes",
  title="Homes on the Route des Grands Crus (Côte de Nuits)",
  description="From Marsannay to Nuits-Saint-Georges: the wine villages of the Côte de Nuits, the houses you find "
              "there, and how to buy one with a local agent.",
  label="Homes and estates", meta="Wine villages", crumb="Route des Grands Crus",
  card="Homes on the Route des Grands Crus",
  card_desc="The Côte de Nuits villages, from Marsannay to Nuits-Saint-Georges, and their houses.",
  h1="A home on the Route des Grands Crus, <em>village by village.</em>",
  h1_plain="A home on the Route des Grands Crus, village by village",
  lede="South of Dijon, the most famous red wines of Burgundy grow along a single road. Living there is possible, if "
       "you know the villages.",
  image="/assets/st-cave.webp", image_alt="Bottles of Burgundy wine in a cellar", img_w=720, img_h=1280,
  intro="The Route des Grands Crus links the wine villages of the Côte de Nuits, between the vineyards and the "
        "wooded slopes. The villages are small, the houses are old, and the good ones rarely reach the market.",
  sections=[
    ("villages", "The villages, from north to south",
     "<ul>"
     "<li><strong>" + L("/prix-immobilier-marsannay-la-cote/", "Marsannay-la-Côte") + "</strong> and "
     + L("/prix-immobilier-couchey/", "Couchey") + ": at the gates of Dijon, with more choice and newer houses.</li>"
     "<li><strong>Fixin and Brochon</strong>: quiet villages at the foot of the slope.</li>"
     "<li><strong>" + L("/prix-immobilier-gevrey-chambertin/", "Gevrey-Chambertin") + "</strong>: a lively village with "
     "shops and schools, and a world-famous name.</li>"
     "<li><strong>Morey-Saint-Denis, Chambolle-Musigny, Vougeot and Vosne-Romanée</strong>: very small villages, with "
     "few sales a year.</li>"
     "<li><strong>" + L("/prix-immobilier-nuits-saint-georges/", "Nuits-Saint-Georges") + "</strong>: the small town of "
     "the Côte de Nuits, with all services. " + L("/immobilier-nuits-saint-georges/", "More about Nuits-Saint-Georges")
     + ".</li>"
     "<li><strong>South of Nuits</strong>, villages such as " + L("/prix-immobilier-corgoloin/", "Corgoloin")
     + " offer more space.</li>"
     "</ul>"),
    ("houses", "The houses you find",
     "<p>Winegrowers' houses built around a courtyard, with a vaulted cellar and sometimes a former press house; stone "
     "village houses; a few maisons de maître with walled gardens; and modern houses on the edge of the villages. Vines "
     "are a separate, specialised market: " + L("/en/buying-vines-or-a-wine-estate-in-burgundy/",
     "buying vines in Burgundy") + ".</p>"),
    ("checks", "What to check here",
     "<ul>"
     "<li>The real sales in the village, often few: I look at the neighbouring villages too.</li>"
     "<li>The cellar: damp is normal, flooding is not.</li>"
     "<li>Protected areas around historic monuments, for any exterior work.</li>"
     "<li>Traffic on the main road and the harvest season, if the house is on the Route itself.</li>"
     "</ul>"),
    ("living", "Living there",
     "<p>Dijon is fifteen to thirty minutes away depending on the village, Beaune a little more. Gevrey-Chambertin and "
     "Nuits-Saint-Georges have schools, doctors and shops. In the smaller villages, a car is essential.</p>"),
    ("how-i-help", "How I help",
     "<p>I live and work twenty minutes from these villages. When a house comes up, I film it and send it to the buyers "
     "who are looking, so they can decide quickly. " + LANGUES_EN + "</p>"),
  ],
  faq=[
    ("Can I buy a house in Gevrey-Chambertin or Vosne-Romanée?",
     "Yes, but few houses are sold each year in the smallest villages. Tell me what you are looking for, so I can send "
     "you a property as soon as it comes up."),
    ("Are houses with vines common?",
     "No. Vines are usually sold separately, in a specialised market."),
    ("How far are these villages from Dijon?",
     "Fifteen to thirty minutes by car, depending on the village."),
    ("Where can I see the real prices?",
     "On my price pages, commune by commune, from the official DVF data."),
  ],
  links=[("The Côte de Beaune villages", "/en/cote-de-beaune-villages-buying-a-home/"),
         ("The Hautes-Côtes", "/en/hautes-cotes-burgundy-villages/"),
         ("Buying a house in Beaune", "/en/buying-a-house-in-beaune/"),
         ("All guides", "/en/guides/")],
)

# --------------------------------------------------------------------------------------------- 2. CÔTE DE BEAUNE
en(
  id="en-cote-beaune", path="/en/cote-de-beaune-villages-buying-a-home/", theme="homes",
  title="The Côte de Beaune villages: buying a home",
  description="Savigny, Pommard, Volnay, Meursault, Puligny and their neighbours: the villages around Beaune, the "
              "houses for sale, and the plain to the east for more space.",
  label="Homes and estates", meta="Wine villages", crumb="Côte de Beaune villages",
  card="The Côte de Beaune villages",
  card_desc="Around Beaune: the wine villages, their houses, and the plain for more space.",
  h1="The Côte de Beaune villages: <em>finding your house.</em>",
  h1_plain="The Côte de Beaune villages: finding your house",
  lede="Around Beaune, the white wines take over from the reds. The villages are just as pretty, and just as small.",
  image="/assets/st-village.webp", image_alt="Roofs of a Burgundy village seen from above", img_w=720, img_h=1280,
  intro="The Côte de Beaune runs from Ladoix to Santenay, with Beaune in the middle. Some villages are famous worldwide, "
        "others are quieter and more affordable. Here is the lay of the land.",
  sections=[
    ("north", "North of Beaune",
     "<p>" + L("/prix-immobilier-ladoix-serrigny/", "Ladoix-Serrigny") + ", Aloxe-Corton, at the foot of the Corton hill, "
     "and " + L("/prix-immobilier-savigny-les-beaune/", "Savigny-lès-Beaune") + ", with its château and its valley: "
     "villages close to Beaune, with a mix of old and newer houses.</p>"),
    ("south", "South of Beaune",
     "<p>Pommard and Volnay for the reds; " + L("/prix-immobilier-meursault/", "Meursault") + ", Puligny-Montrachet and "
     "Chassagne-Montrachet for the great whites; then Santenay. Meursault, with its shops and services, is the most "
     "lived-in of them. Further west, towards " + L("/prix-immobilier-nolay/", "Nolay") + ", the landscape opens up.</p>"),
    ("plain", "The plain, for more space",
     "<p>East of Beaune, villages such as " + L("/prix-immobilier-bligny-les-beaune/", "Bligny-lès-Beaune") + " or "
     + L("/prix-immobilier-sainte-marie-la-blanche/", "Sainte-Marie-la-Blanche") + " offer more land and more modern "
     "houses for the budget, ten minutes from Beaune.</p>"),
    ("beaune", "Beaune itself",
     "<p>Inside and around the ramparts, apartments and town houses; around them, residential streets with houses and "
     "gardens. " + L("/en/buying-a-house-in-beaune/", "Buying a house in Beaune") + " and "
     + L("/agent-immobilier-beaune/", "my page on Beaune") + " (in French).</p>"),
    ("how-i-help", "How I help",
     "<p>The good houses in these villages go fast. Tell me your village, your budget and what you cannot live "
     "without: I send you the properties as soon as they come up, with their film and the real prices around them. "
     + LANGUES_EN + "</p>"),
  ],
  faq=[
    ("Which Côte de Beaune village should I choose?",
     "It depends on what you want: Meursault and Beaune have the most services; the smaller villages are quieter. "
     "Visit at different times of the year."),
    ("Are there more affordable areas near Beaune?",
     "Yes, the villages of the plain to the east, such as Bligny-lès-Beaune, offer more space for the budget."),
    ("How fast do houses sell around Beaune?",
     "Good houses at the right price can sell within weeks. Being ready to decide helps."),
    ("Do you cover Beaune and its villages?",
     "Yes, Beaune and the whole Côte de Beaune."),
  ],
  links=[("Buying a house in Beaune", "/en/buying-a-house-in-beaune/"),
         ("Homes on the Route des Grands Crus", "/en/homes-on-the-route-des-grands-crus/"),
         ("The Hautes-Côtes", "/en/hautes-cotes-burgundy-villages/"),
         ("Agent immobilier à Beaune (français)", "/agent-immobilier-beaune/"),
         ("All guides", "/en/guides/")],
)

# --------------------------------------------------------------------------------------------- 3. HAUTES-CÔTES
en(
  id="en-hautes-cotes", path="/en/hautes-cotes-burgundy-villages/", theme="homes",
  title="The Hautes-Côtes: more space behind the vineyards",
  description="Behind the famous slopes, the Hautes-Côtes de Nuits and de Beaune offer green valleys, stone villages "
              "and more land for the budget. A guide for buyers.",
  label="Homes and estates", meta="Villages", crumb="The Hautes-Côtes",
  card="The Hautes-Côtes",
  card_desc="Green valleys and stone villages behind the slopes, with more land for the budget.",
  h1="The Hautes-Côtes: <em>more space, behind the vineyards.</em>",
  h1_plain="The Hautes-Côtes: more space, behind the vineyards",
  lede="Ten or twenty minutes behind the great vineyards, the landscape becomes greener, the villages quieter, and the "
       "gardens bigger.",
  image="/assets/maison-pierre-terrasse-jardin.webp", image_alt="Stone house with a garden in the Burgundy hills",
  intro="The Hautes-Côtes are the plateaus and valleys above the Côte de Nuits and the Côte de Beaune. Vines, "
        "blackcurrant fields, woods and stone villages: buyers who want a garden and calm often end up here.",
  sections=[
    ("what", "What you find",
     "<p>Farmhouses, village houses with barns, a few manors, and more land than on the famous slopes. Many houses need "
     "work: it is part of the appeal, and of the budget. " + L("/en/renovating-an-old-stone-house-in-burgundy/",
     "Renovating a stone house") + ".</p>"),
    ("where", "Where",
     "<ul>"
     "<li><strong>The Hautes-Côtes de Nuits</strong>, behind Nuits-Saint-Georges and Gevrey-Chambertin.</li>"
     "<li><strong>The Hautes-Côtes de Beaune</strong>, behind Beaune and towards La Rochepot and its château.</li>"
     "<li><strong>Towards the Ouche valley</strong>, with " + L("/prix-immobilier-bligny-sur-ouche/", "Bligny-sur-Ouche")
     + ", and further west " + L("/prix-immobilier-arnay-le-duc/", "Arnay-le-Duc") + ".</li>"
     "</ul>"),
    ("life", "Daily life",
     "<p>A car is essential. Shops and doctors are in the bigger villages or in Beaune and Nuits-Saint-Georges. The "
     "winters are a little colder up here. The reward: views, walks, and silence.</p>"),
    ("checks", "What to check",
     "<ul>"
     "<li>The drainage: most houses have their own septic system.</li>"
     "<li>Internet: check the fibre and mobile coverage at the address.</li>"
     "<li>Heating: a big old house with a barn costs a lot to heat.</li>"
     "<li>The access in winter, if the house is at the end of a lane.</li>"
     "</ul>"),
    ("how-i-help", "How I help",
     "<p>I film these houses with a drone, so you can see the land, the roofs and the surroundings before travelling. "
     + LANGUES_EN + "</p>"),
  ],
  faq=[
    ("What are the Hautes-Côtes?",
     "The plateaus and valleys above the Côte de Nuits and the Côte de Beaune, greener and quieter than the famous "
     "slopes."),
    ("Are houses cheaper in the Hautes-Côtes?",
     "For the same budget, you usually get more land and space than on the main slopes. Check the real sales."),
    ("Do I need a car there?",
     "Yes. Services are in the bigger villages and in Beaune or Nuits-Saint-Georges."),
    ("Can you show me the land before I visit?",
     "Yes, with drone footage and a live video call."),
  ],
  links=[("Homes on the Route des Grands Crus", "/en/homes-on-the-route-des-grands-crus/"),
         ("The Côte de Beaune villages", "/en/cote-de-beaune-villages-buying-a-home/"),
         ("Renovating a stone house", "/en/renovating-an-old-stone-house-in-burgundy/"),
         ("All guides", "/en/guides/")],
)

# --------------------------------------------------------------------------------------------- 4. LOCATION TOURISTIQUE
en(
  id="en-holiday-let", path="/en/holiday-rental-rules-burgundy/", theme="homes",
  title="Letting a holiday home in Burgundy: the rules",
  description="Registration, energy rating, tax allowances, town hall and copropriété rules: letting a furnished "
              "holiday home in Burgundy after the Le Meur law.",
  label="Homes and estates", meta="Letting", crumb="Holiday lets",
  card="Letting a holiday home: the rules",
  card_desc="Registration, energy rating, tax and local rules after the Le Meur law.",
  h1="Letting a holiday home in Burgundy: <em>the new rules.</em>",
  h1_plain="Letting a holiday home in Burgundy: the new rules",
  lede="A gîte near Beaune can pay part of its costs. Since the Le Meur law of November 2024, the rules are stricter. "
       "Here they are.",
  image="/assets/loft-charpente-mezzanine.webp", image_alt="Loft with a timber frame and a mezzanine",
  intro="Furnished holiday lets, called meublés de tourisme, are popular in the wine country. The law of 19 November "
        "2024, known as the Le Meur law, changed their tax treatment and gave mayors more powers (" + LE_MEUR + ").",
  sections=[
    ("registration", "Registration",
     "<p>The law extends the registration number to all furnished holiday lets, main or second homes, with a national "
     "online service due by May 2026 at the latest. Mayors can check compliance and suspend a number. Ask the town hall "
     "of your commune what applies there.</p>"),
    ("energy", "The energy rating",
     "<p>A DPE becomes compulsory for holiday lets. The minimum is set at F in 2025 for new lets in the areas that "
     "require a change-of-use authorisation, E from 2028, and every holiday let must be rated between A and D from "
     "2034. Check the rating before you buy with a letting plan.</p>"),
    ("tax", "The tax allowances",
     "<p>For income from 2025, under the simplified regime, an unclassified holiday let gets a 30% allowance up to "
     "15,000 euros of rent a year; a classified one, from one to five stars, gets 50% up to 77,700 euros. The tourist "
     "tax is collected from guests. " + L("/en/renting-out-french-property-as-a-non-resident/",
     "Rental income tax for non-residents") + ".</p>"),
    ("local", "Local rules",
     "<p>Communes can limit the letting of a main home to 90 days a year instead of 120, and those with many second "
     "homes can set quotas. In a copropriété, the rules may ban holiday lets, and a two-thirds majority can now add "
     "such a ban in some cases.</p>"),
    ("how-i-help", "Buying with a letting plan",
     "<p>Before an offer, I check the energy rating, the copropriété rules if any, and I ask the town hall about local "
     "limits. A house that can be let is worth knowing as such. " + LANGUES_EN + "</p>"),
  ],
  faq=[
    ("Do I need to register a holiday let in France?",
     "Yes, the Le Meur law extends the registration number to all furnished holiday lets. Ask the town hall what "
     "applies in your commune."),
    ("Can I let a house rated F or G to tourists?",
     "The minimum rating rises over time: F in 2025 in some areas, E from 2028, and between A and D for every holiday "
     "let from 2034."),
    ("How is holiday rental income taxed?",
     "Under the simplified regime, with a 30% allowance up to 15,000 euros for unclassified lets, or 50% up to 77,700 "
     "euros for classified ones, for income from 2025."),
    ("Can my copropriété ban holiday lets?",
     "It can, depending on its rules, and a two-thirds majority can now add such a ban in some cases."),
  ],
  links=[("Running a B&B in Burgundy", "/en/running-a-b-and-b-in-burgundy/"),
         ("Rental income tax", "/en/renting-out-french-property-as-a-non-resident/"),
         ("The energy rating (DPE)", "/en/french-energy-rating-dpe-explained/"),
         ("All guides", "/en/guides/")],
)

# --------------------------------------------------------------------------------------------- 5. CHAMBRES D'HÔTES
en(
  id="en-bnb", path="/en/running-a-b-and-b-in-burgundy/", theme="homes",
  title="Running a B&B (chambres d'hôtes) in Burgundy",
  description="Five rooms and fifteen guests at most, declaration at the town hall, breakfast, tax and the house to "
              "look for: running chambres d'hôtes in Burgundy.",
  label="Homes and estates", meta="Business", crumb="Chambres d'hôtes",
  card="Running a B&B in Burgundy",
  card_desc="The legal limits, the declaration, the tax, and the house to look for.",
  h1="Running chambres d'hôtes <em>in the wine country.</em>",
  h1_plain="Running chambres d'hôtes in the wine country",
  lede="Many buyers dream of welcoming guests in an old Burgundy house. Here is the legal frame, and what makes a house "
       "suitable.",
  image="/assets/chateau-facade-allee.webp", image_alt="Façade of a château with a tree-lined drive",
  intro="Chambres d'hôtes are guest rooms in the owner's home, with breakfast included. French law defines them "
        "precisely; beyond those limits, it becomes a hotel, with other rules.",
  sections=[
    ("limits", "The legal limits",
     "<ul>"
     "<li>At most five rooms and fifteen guests at the same time.</li>"
     "<li>The rooms are in the home of the owner, who welcomes the guests.</li>"
     "<li>Breakfast is included in the price.</li>"
     "</ul>"),
    ("declare", "Declaring the activity",
     "<p>Chambres d'hôtes must be declared at the town hall before opening. The tourist tax is collected from guests. "
     "Serving meals with alcohol, the table d'hôtes, requires a licence: ask the town hall.</p>"),
    ("tax", "Tax",
     "<p>Under the simplified regime, income from chambres d'hôtes benefits from a 50% allowance up to 77,700 euros a "
     "year, for income from 2025 (" + LE_MEUR + "). Above certain amounts, social contributions apply: an accountant "
     "will set up the right status.</p>"),
    ("house", "The house to look for",
     "<ul>"
     "<li>Rooms that can each have their own bathroom.</li>"
     "<li>A separate entrance or wing for the guests, and space for your private life.</li>"
     "<li>Parking, and a garden or a courtyard for breakfast in summer.</li>"
     "<li>A location guests look for: a wine village, Beaune, or near the Route des Grands Crus.</li>"
     "</ul>"
     "<p>A château or a large maison de maître often fits: " + L("/en/buying-a-chateau-in-burgundy/",
     "buying a château in Burgundy") + ".</p>"),
    ("how-i-help", "How I help",
     "<p>I look for houses that can be adapted, I check the planning rules with the town hall, and I help you estimate "
     "the works before the offer. " + LANGUES_EN + "</p>"),
  ],
  faq=[
    ("How many rooms can chambres d'hôtes have?",
     "At most five rooms and fifteen guests at the same time."),
    ("Must I live in the house?",
     "Yes. Chambres d'hôtes are in the owner's home."),
    ("Do I need a licence to serve wine at dinner?",
     "Yes, serving alcohol with meals requires a licence. Ask the town hall."),
    ("How is the income taxed?",
     "Under the simplified regime, with a 50% allowance up to 77,700 euros a year, for income from 2025."),
  ],
  links=[("Letting a holiday home", "/en/holiday-rental-rules-burgundy/"),
         ("Buying a château in Burgundy", "/en/buying-a-chateau-in-burgundy/"),
         ("Buying a restaurant or hotel", "/en/buying-a-restaurant-or-hotel-in-france/"),
         ("All guides", "/en/guides/")],
)

# --------------------------------------------------------------------------------------------- 6. RESTAURANT / HÔTEL
en(
  id="en-business", path="/en/buying-a-restaurant-or-hotel-in-france/", theme="homes",
  title="Buying a restaurant or hotel in France as a foreigner",
  description="Business or premises, the commercial lease, the accounts, the licence, the staff, the residence permit: "
              "buying a restaurant or a hotel in France.",
  label="Homes and estates", meta="Business", crumb="Restaurants and hotels",
  card="Buying a restaurant or hotel in France",
  card_desc="The business and the premises, the lease, the licence, the staff, the permit.",
  h1="Buying a restaurant or a hotel <em>in France.</em>",
  h1_plain="Buying a restaurant or a hotel in France",
  lede="Burgundy lives from food, wine and tourism. Buying a business here follows French rules that surprise many "
       "foreign buyers. Here they are.",
  image="/assets/shawez-ali-hotel-commerce-dijon.webp", image_alt="Shawez Ali in a hotel business in Dijon",
  intro="I sell businesses as well as homes: restaurants, hotels, bars and shops in Dijon and Burgundy. The first thing "
        "to understand is what you are actually buying.",
  sections=[
    ("what", "The business and the premises",
     "<p>In France, the business, the fonds de commerce, is sold separately from the building. The fonds includes the "
     "name, the customers, the right to the lease, the equipment and sometimes the licences. The building, the murs, "
     "belongs to a landlord, or can be bought too. " + L("/fonds-de-commerce-a-vendre-dijon/", "Businesses for sale")
     + " and " + L("/immobilier-professionnel-dijon/", "commercial property") + " (in French).</p>"),
    ("lease", "The commercial lease",
     "<p>Most businesses occupy their premises under a commercial lease, usually for nine years, which the tenant can "
     "end every three years and has the right to renew. Read the lease first: the rent, the activities allowed, the "
     "remaining term, who pays for the works.</p>"),
    ("accounts", "The accounts and the licence",
     "<p>Ask for the accounts of the last three years, the turnover month by month, and the staff costs. To sell "
     "alcohol, a licence is needed, and the operator must follow a compulsory training, the permis d'exploitation. A "
     "hotel can be classified from one to five stars.</p>"),
    ("staff", "The staff",
     "<p>The employees' contracts transfer automatically to the buyer of the business, under the French Labour Code. "
     "Know them before you sign: their number, their seniority and their contracts.</p>"),
    ("permit", "Your right to work in France",
     "<p>European citizens can run a business freely. Others need a residence permit allowing them to run a business, "
     "such as the « entrepreneur » card or a talent passport, applied for at the French consulate. Plan it before the "
     "purchase.</p>"),
    ("process", "The process",
     "<p>The sale is signed before a notaire or a lawyer, then published; the price is held in escrow for a while to "
     "protect the seller's creditors. I accompany buyers from the first visit to the signing. "
     + L("/conseils-vendeurs/acheter-fonds-de-commerce-dijon/", "Buying a business in Dijon") + " (in French). "
     + LANGUES_EN + "</p>"),
  ],
  faq=[
    ("Can a foreigner buy a restaurant in France?",
     "Yes. Non-Europeans also need a residence permit allowing them to run a business."),
    ("What is a fonds de commerce?",
     "The business itself: name, customers, right to the lease, equipment and licences, sold separately from the "
     "building."),
    ("Do the employees stay with the business?",
     "Yes, their contracts transfer automatically to the buyer."),
    ("Do I need a licence to serve alcohol?",
     "Yes, and the operator must follow the compulsory permis d'exploitation training."),
  ],
  links=[("Businesses for sale (in French)", "/fonds-de-commerce-a-vendre-dijon/"),
         ("Running a B&B", "/en/running-a-b-and-b-in-burgundy/"),
         ("Agent who speaks Hindi, Urdu, Punjabi", "/en/agent-speaking-hindi-urdu-punjabi-france/"),
         ("All guides", "/en/guides/")],
)

# --------------------------------------------------------------------------------------------- 7. ÉTUDIANTS
en(
  id="en-students", path="/en/investing-in-student-flats-in-dijon/", theme="homes",
  title="Investing in student flats in Dijon",
  description="Who rents, where to buy, which lease, the energy rating and the furniture list: a practical guide to "
              "investing in student flats in Dijon.",
  label="Homes and estates", meta="Investment", crumb="Student flats",
  card="Investing in student flats in Dijon",
  card_desc="Who rents, where to buy, the right lease, and what to check.",
  h1="Investing in student flats <em>in Dijon.</em>",
  h1_plain="Investing in student flats in Dijon",
  lede="Dijon is a university city. Small furnished flats near the campus and the tram are a classic investment. Here "
       "is how to do it well.",
  image="/assets/shawez-ali-studio-meuble-visite.webp", image_alt="Shawez Ali visiting a furnished studio in Dijon",
  intro="Students in Dijon attend " + X("https://www.ube.fr/", "Université Bourgogne Europe") + ", the Burgundy School "
        "of Business, the Sciences Po campus or the Institut Agro, among others. They look for studios and small flats, "
        "furnished, close to their school or a tram line.",
  sections=[
    ("where", "Where to buy",
     "<p>Near the campus in the east of the city, in the centre, and along the tram lines that reach the university "
     "quickly. A studio ten minutes from the campus by tram can let as well as one next door. "
     + L("/en/where-to-live-in-dijon/", "Where to live in Dijon") + ".</p>"),
    ("lease", "Which lease",
     "<ul>"
     "<li><strong>The furnished lease</strong>, for a year, renewable.</li>"
     "<li><strong>The student lease</strong>, furnished, for nine months, matching the academic year.</li>"
     "<li><strong>The mobility lease</strong>, from one to ten months, for students and interns.</li>"
     "</ul>"
     "<p>A furnished home must include a list of equipment set by law: bed, table, chairs, cooking plates, fridge, "
     "crockery and so on.</p>"),
    ("energy", "The energy rating",
     "<p>Small flats are often poorly rated by the DPE. A home rated G can no longer be let on a new lease, and the ban "
     "extends to F in 2028. Check the rating before you buy, and the cost of the works if needed. "
     + L("/en/french-energy-rating-dpe-explained/", "The energy rating") + ".</p>"),
    ("rent-security", "Securing the rent",
     "<p>Many students have a parent as guarantor, or the Visale scheme from Action Logement, which costs them "
     "nothing and which landlords can accept. I check the files of the tenants I place.</p>"),
    ("how-i-help", "How I help",
     "<p>I find the flat, then the tenant: I prepare the lease and do the check-in, then you keep the management or "
     "hand it to a property manager. " + L("/location-etudiante-dijon/", "Student letting in Dijon") + " (in French). "
     + LANGUES_EN + "</p>"),
  ],
  faq=[
    ("Is Dijon a good city for student rentals?",
     "It is a university city with several schools. Results depend on the location, the condition and the price paid."),
    ("What lease suits students?",
     "The furnished lease for a year, the student lease for nine months, or the mobility lease from one to ten months."),
    ("Can I let a flat rated G?",
     "Not on a new lease. F follows in 2028 under the current law."),
    ("Do you manage the flat after letting it?",
     "No. I find the tenant, prepare the lease and do the check-in; the management stays with you."),
  ],
  links=[("Investing in rental property in Dijon", "/en/rental-investment-dijon/"),
         ("Buying a flat in a copropriété", "/en/buying-an-apartment-in-a-french-copropriete/"),
         ("Buying a new build off-plan", "/en/buying-off-plan-vefa-france/"),
         ("Rental income tax", "/en/renting-out-french-property-as-a-non-resident/"),
         ("Student letting (in French)", "/location-etudiante-dijon/"),
         ("All guides", "/en/guides/")],
)

# --------------------------------------------------------------------------------------------- 8. VIGNES
en(
  id="en-vines", path="/en/buying-vines-or-a-wine-estate-in-burgundy/", theme="homes",
  title="Buying vines or a wine estate in Burgundy",
  description="Why Burgundy vines rarely come to market, the SAFER, rural leases, shares in a vineyard company, and how "
              "to combine a house and a wine project.",
  label="Homes and estates", meta="Wine estates", crumb="Vines and estates",
  card="Buying vines or a wine estate",
  card_desc="A rare market: the SAFER, rural leases, vineyard shares, and the house that goes with it.",
  h1="Buying vines or a wine estate <em>in Burgundy.</em>",
  h1_plain="Buying vines or a wine estate in Burgundy",
  lede="Owning a few rows in Burgundy is a dream for many wine lovers. It is possible, with patience and the right "
       "advisers.",
  image="/assets/shawez-ali-terrain-maison-pierre.webp", image_alt="Shawez Ali on the land of a stone house",
  intro="Burgundy vineyards are divided into small plots, the climats, and families rarely sell them. The most famous "
        "appellations reach very high prices and change hands very rarely. Here is how the market works.",
  sections=[
    ("rare", "A rare market",
     "<p>Vines are mostly passed down within winegrowing families. When a plot is sold, local winegrowers are often "
     "the first to know. The prices depend on the appellation, from regional wines to the grands crus, and vary "
     "enormously.</p>"),
    ("safer", "The SAFER",
     "<p>The SAFER, the rural land agency, is informed of sales of agricultural land and vines, and may have a right of "
     "first refusal, to support farming. The notaire handles this step. It adds time, and sometimes a surprise.</p>"),
    ("lease", "Vines that are let",
     "<p>Many vines are worked by a winegrower under a rural lease, which gives the tenant strong rights and a long "
     "duration. Buying let vines is an investment, not a way to make your own wine.</p>"),
    ("shares", "Owning shares instead",
     "<p>Groupements fonciers viticoles, vineyard companies, sell shares in vines worked by a domaine. It is a way to "
     "own a piece of Burgundy with a smaller budget, with specific tax rules to check with an adviser.</p>"),
    ("house", "The house, my part of the project",
     "<p>Most of my wine-loving buyers start with a house in a wine village, and build their links with the winegrowers "
     "from there. I find the house; for the vines, specialised advisers and the SAFER are the right contacts. "
     + L("/en/homes-on-the-route-des-grands-crus/", "Homes on the Route des Grands Crus") + ". " + LANGUES_EN + "</p>"),
  ],
  faq=[
    ("Can a foreigner buy vines in Burgundy?",
     "Yes, under the same rules as a French buyer, including the SAFER's right of first refusal."),
    ("Why are Burgundy vines so hard to buy?",
     "Plots are small, families keep them, and the most famous appellations are very rarely sold."),
    ("Can I make my own wine from let vines?",
     "Not while the rural lease runs: the tenant works the vines."),
    ("Is there a way to own vines with a smaller budget?",
     "Shares in a vineyard company, a groupement foncier viticole, are one way. Check the tax rules with an adviser."),
  ],
  links=[("Homes on the Route des Grands Crus", "/en/homes-on-the-route-des-grands-crus/"),
         ("Planning and legal checks", "/en/planning-and-legal-checks-before-buying-france/"),
         ("Buying a château in Burgundy", "/en/buying-a-chateau-in-burgundy/"),
         ("All guides", "/en/guides/")],
)

# --------------------------------------------------------------------------------------------- 9. RÉNOVATION
en(
  id="en-renovation", path="/en/renovating-an-old-stone-house-in-burgundy/", theme="homes",
  title="Renovating an old stone house in Burgundy",
  description="Permits, protected areas, lime rather than cement, insulation, insured craftsmen and grants: what to "
              "know before renovating an old stone house in Burgundy.",
  label="Homes and estates", meta="Renovation", crumb="Renovating a stone house",
  card="Renovating an old stone house",
  card_desc="Permits, materials, craftsmen and grants: what to know before the works.",
  h1="Renovating an old stone house <em>in Burgundy.</em>",
  h1_plain="Renovating an old stone house in Burgundy",
  lede="Thick walls, beams, a vaulted cellar: old Burgundy houses are built to last, if they are renovated the right "
       "way.",
  image="/assets/st-poutres.webp", image_alt="Exposed beams in a renovated stone house", img_w=720, img_h=1280,
  intro="Many buyers fall for a house that needs work. Here is what to know before the offer: the permits, the "
        "materials that suit old stone, the craftsmen and the grants.",
  sections=[
    ("permits", "Permits",
     "<ul>"
     "<li>Changing the façade, the windows or the roof usually needs a declaration at the town hall.</li>"
     "<li>A larger extension needs a building permit, and an architect is compulsory above 150 square metres of total "
     "floor area.</li>"
     "<li>Near a historic monument, the Architectes des Bâtiments de France must approve the exterior works.</li>"
     "</ul>"),
    ("materials", "Materials that suit old stone",
     "<p>Old stone walls need to breathe. Lime mortars and plasters let the moisture out, where cement traps it and "
     "damages the walls. For insulation, natural materials such as wood fibre or hemp are often used in old houses. Ask "
     "craftsmen used to old buildings.</p>"),
    ("craftsmen", "Craftsmen",
     "<p>Ask each craftsman for their ten-year insurance certificate, and for energy works, the RGE label, needed for "
     "most grants. Good craftsmen are booked months ahead: plan early.</p>"),
    ("grants", "Grants and VAT",
     "<p>French renovation grants mostly concern main homes, and their rules change often: check "
     + FRANCE_RENOV + ". Renovation works on homes over two years old benefit from reduced VAT rates.</p>"),
    ("before-offer", "Before the offer",
     "<p>For a house with works, I organise a second visit with a builder or a craftsman, so that the price you offer "
     "takes the works into account. " + LANGUES_EN + "</p>"),
  ],
  faq=[
    ("Do I need a permit to change my windows?",
     "Usually a declaration at the town hall, and the approval of the Architectes des Bâtiments de France near a "
     "historic monument."),
    ("Why avoid cement on old stone walls?",
     "Cement traps moisture in the walls; lime lets it out."),
    ("Can I get grants for a second home?",
     "Most French renovation grants concern main homes. Check the current rules on France Rénov'."),
    ("Can a builder visit before I make an offer?",
     "Yes. I can organise a second visit with a craftsman for an estimate."),
  ],
  links=[("The Hautes-Côtes", "/en/hautes-cotes-burgundy-villages/"),
         ("The energy rating (DPE)", "/en/french-energy-rating-dpe-explained/"),
         ("Planning and legal checks", "/en/planning-and-legal-checks-before-buying-france/"),
         ("All guides", "/en/guides/")],
)

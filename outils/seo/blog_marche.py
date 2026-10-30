#!/usr/bin/env python3
"""Blog international : le marché et les chiffres (sources citées et datées dans chaque page)."""
from blog_commun import en, L, X, LANGUES_EN

N_2024 = X("https://www.notaires.fr/fr/article/les-etrangers-non-residents-acquereurs-de-logements-en-france-metropolitaine",
           "Notaires de France study on non-resident buyers, published in 2024")
CAPI = X("https://www.mysweetimmo.com/2026/07/07/immobilier-les-acheteurs-etrangers-font-leur-retour-en-france-qui-sont-ils/",
         "Capifrance barometer of 2025 sales, reported in July 2026")
CCF = X("https://www.boursorama.com/immobilier/actualites/achat-de-residences-secondaires-en-france-les-belges-detronent-les-britanniques-647f1b549b1c03c6b8885a608c938fa0",
        "CCF study of 2023 sales, July 2024")
SELOGER = X("https://edito.seloger.com/actualites/france/immobilier-en-france-les-etrangers-representent-pres-de-6-des-acheteurs-article-30257.html",
            "Notaires de France figures reported by SeLoger, January 2019")
JDA = X("https://www.journaldelagence.com/1159347-le-point-sur-les-investissements-immobiliers-effectues-pas-les-etrangers-en-france",
        "Journal de l'Agence, February 2019")
DVF = X("https://app.dvf.etalab.gouv.fr/", "official DVF map")

# --------------------------------------------------------------------------------------------- 1. CHIFFRES CLÉS
en(
  id="en-key-figures", path="/en/foreign-buyers-in-france-key-figures/", theme="market",
  title="Foreign buyers in France: the key figures for 2026",
  description="How many foreigners buy property in France, from which countries and with which budgets: the notaries' "
              "and market figures, each with its source.",
  label="The market", meta="Market", crumb="Key figures",
  card="Foreign buyers in France: the key figures",
  card_desc="How many, from where, with which budgets, and what it changes when you buy in Burgundy.",
  h1="Foreign buyers in France: <em>the key figures.</em>",
  h1_plain="Foreign buyers in France: the key figures",
  lede="Before choosing a region or a budget, it helps to know who is buying around you. Here are the figures that "
       "matter, where they come from, and what I read in them as an agent in Dijon.",
  image="/assets/shawez-ali-explique-prix-m2-dijon.webp", image_alt="Shawez Ali explaining property figures in Dijon",
  img_w=512, img_h=640,
  intro="Every year, tens of thousands of homes in France are bought by people who are not French. Some already live "
        "here; others buy from abroad, for a second home, a future retirement or an investment. The figures below come "
        "from notaries' studies and market barometers. Each one is dated, because they move.",
  sections=[
    ("share", "How many buyers are foreigners?",
     "<p>The notaries count two groups: foreigners who live in France, and foreigners who live abroad, called "
     "non-residents.</p>"
     "<ul>"
     "<li><strong>All foreign buyers together</strong> made up 5.4% of the buyers of existing homes in 2017, and 5.9% "
     "in the first half of 2018 (" + SELOGER + ").</li>"
     "<li><strong>Non-resident foreigners</strong> alone made up 1.8% of the sales of existing homes in 2022, after "
     "1.3% in 2021 and a peak of 2% in 2015 (" + N_2024 + ").</li>"
     "</ul>"
     "<p>France records from several hundred thousand to more than a million sales of existing homes a year, depending "
     "on the year, so even these small percentages add up to tens of thousands of purchases.</p>"
     "<p>You may have heard other round figures in the profession: about 60,000 purchases a year by foreigners, an "
     "average budget of 300,000 euros, 18 billion euros a year. They are consistent with a foreign share of around 6% "
     "of a market close to a million sales, but I have not found an official publication giving them as such. That is "
     "why I prefer to show you the notaries' figures, with their dates.</p>"),
    ("who", "Where they come from",
     "<ul>"
     "<li><strong>2022, non-resident buyers</strong>: Belgians 19%, British 17%, Germans 11%, Dutch 10%. The British "
     "share has been falling since 2016 (" + N_2024 + ").</li>"
     "<li><strong>2023</strong>: Belgians 19.5%, British 16.4% (" + CCF + ").</li>"
     "<li><strong>2025, one network's sales to foreign buyers</strong> (416 sales): Swiss 22%, Belgians 19%, British 12%, "
     "Americans 11%, Dutch 8%, Germans 6%, buyers from the Gulf and the Arab world 5%, from Asia 4% (" + CAPI + ").</li>"
     "</ul>"
     "<p>The last source is a single network, not the whole market, but it shows the trend: Swiss and American buyers "
     "are more present than ten years ago. More in "
     + L("/en/who-buys-property-in-france-by-nationality/", "who buys property in France") + ".</p>"),
    ("budgets", "What they spend",
     "<p>In the same 2025 barometer, 15% of foreign buyers spent less than 100,000 euros, 34% between 100,000 and "
     "250,000 euros, 33% between 250,000 and 500,000 euros, and 18% between 500,000 euros and 2.5 million euros. Average "
     "budgets were about 370,000 euros for Swiss buyers, 340,000 for Belgians, 235,000 for the British, 400,000 for "
     "Americans and 570,000 for buyers from Asia (" + CAPI + ").</p>"
     "<p>One more figure deserves your attention: according to the notaries, non-resident buyers paid on average about "
     "13% more than residents for an old house in the provinces, and about 16% more for an apartment (" + N_2024 + "). "
     "Part of it is the type of property they choose, part of it is not knowing the local prices. The real sales are "
     "public in France: " + L("/en/real-sale-prices-france-dvf/", "here is how to check them") + ".</p>"),
    ("where", "Where they buy",
     "<p>Provence-Alpes-Côte d'Azur remains a classic, with 3.8% of its sales going to non-residents in 2022 "
     "(" + N_2024 + "). Over 2007 to 2017, non-residents bought around one home in ten in the Creuse, the Dordogne and the "
     "Alpes-Maritimes (" + JDA + "). Recent barometers also point to growing interest in Haute-Savoie and in the "
     "Saône-et-Loire, the southern department of Burgundy (" + CAPI + "). More in "
     + L("/en/where-foreigners-buy-in-france/", "where foreigners buy in France") + ".</p>"),
    ("burgundy", "What it means if you buy in Burgundy",
     "<p>Burgundy is a small market where good village houses and well-placed apartments do not stay long on sale. "
     "Buyers from Switzerland, Belgium or Paris often visit the same properties as you. Two things make the difference: "
     "knowing the real prices before you visit, and being able to decide quickly.</p>"
     "<p>That is how I work with buyers abroad: you tell me what you are looking for, I send you the film of each "
     "property as soon as it comes in, I show it to you live on a WhatsApp video call, and I tell you what the sales "
     "around it really fetched. " + LANGUES_EN + "</p>"),
    ("sources", "Sources",
     "<ul><li>" + N_2024 + ".</li><li>" + CCF + ".</li><li>" + CAPI + ".</li><li>" + SELOGER + ".</li><li>" + JDA
     + ".</li></ul>"),
  ],
  faq=[
    ("What share of buyers in France are foreigners?",
     "Around 5 to 6% of the buyers of existing homes when foreigners living in France are included (notaries, 2017 "
     "and 2018), and 1.8% for non-residents alone in 2022."),
    ("Which nationalities buy the most property in France?",
     "Among non-residents, Belgians and British have led for years. Swiss and American buyers are very present in the "
     "most recent barometers."),
    ("Do foreign buyers pay more?",
     "On average, non-residents paid about 13% more than residents for old houses in the provinces and about 16% more "
     "for apartments, according to a notaries' study published in 2024. Checking the real sales around a property "
     "avoids overpaying."),
    ("Are these figures available for Dijon?",
     "Not by nationality. For prices, I use the official DVF data of notarised sales, commune by commune."),
  ],
  links=[("Who buys property in France", "/en/who-buys-property-in-france-by-nationality/"),
         ("Where foreigners buy in France", "/en/where-foreigners-buy-in-france/"),
         ("Checking real sale prices (DVF)", "/en/real-sale-prices-france-dvf/"),
         ("All guides for international buyers", "/en/guides/"),
         ("English-speaking agent in Dijon", "/en/")],
)

# --------------------------------------------------------------------------------------------- 2. NATIONALITÉS
en(
  id="en-nationalities", path="/en/who-buys-property-in-france-by-nationality/", theme="market",
  title="Who buys property in France? The top nationalities",
  description="Belgians, British, Swiss, Germans, Dutch, Americans: who buys French property, what each group tends to "
              "look for, and how it plays out in Burgundy.",
  label="The market", meta="Market", crumb="Top nationalities",
  card="Who buys property in France?",
  card_desc="The ranking by nationality, and what each group of buyers tends to look for.",
  h1="Who buys property in France? <em>The top nationalities.</em>",
  h1_plain="Who buys property in France? The top nationalities",
  lede="Each nationality has its habits: some want a big country house, others a flat in town. Knowing them helps you "
       "understand the market you are entering, as a buyer or as a seller.",
  image="/assets/st-village.webp", image_alt="Stone village street in Burgundy", img_w=720, img_h=1280,
  intro="The ranking of foreign buyers changes slowly, but it changes. For years the British led; today Belgians and "
        "Swiss are often at the top, and Americans are back. Here is what the studies say, and how it shows in Burgundy.",
  sections=[
    ("ranking", "The ranking, study by study",
     "<ul>"
     "<li><strong>Non-resident buyers in 2022</strong>: Belgians 19%, British 17%, Germans 11%, Dutch 10%. It was the "
     "first time the British share fell below 20% (" + N_2024 + ").</li>"
     "<li><strong>2023</strong>: Belgians 19.5%, British 16.4%. Purchases by British residents fell by 20% in number "
     "and 28% in value over the year (" + CCF + ").</li>"
     "<li><strong>2025, one network</strong>: Swiss 22%, Belgians 19%, British 12%, Americans 11%, Dutch 8%, Germans 6%, "
     "Gulf and Arab world 5%, Asia 4% (" + CAPI + ").</li>"
     "</ul>"),
    ("habits", "What each group tends to look for",
     "<p>Over 2007 to 2017, the notaries observed that Dutch, British and Belgian buyers mainly bought houses, often "
     "with six rooms or more, about half of them in rural areas. Italian buyers, on the contrary, bought apartments "
     "almost exclusively, nine times out of ten in towns (" + SELOGER + ").</p>"
     "<p>The 2025 barometer describes the regions each group favours: the Swiss in the departments close to the "
     "border, including the Saône-et-Loire in southern Burgundy; the Belgians in the Var, Corsica and the Alps; the "
     "British, long attached to the Dordogne, the Charente and Normandy, now looking further east and towards the "
     "mountains; the Americans in Brittany, the Dordogne and around Paris, with rising interest in Haute-Savoie and the "
     "Saône-et-Loire; buyers from Asia in Paris, Bordeaux and Nice (" + CAPI + ").</p>"),
    ("burgundy", "In Burgundy",
     "<p>What draws buyers from abroad to my area is usually one of three things: the wine villages of the Côte de "
     "Nuits and the Côte de Beaune, a stone house or a château with character, or an apartment in the historic centre "
     "of Dijon, an hour and a half from Paris by train. The guides "
     + L("/en/buying-a-house-in-beaune/", "buying a house in Beaune") + " and "
     + L("/en/buying-a-chateau-in-burgundy/", "buying a château in Burgundy") + " go into the details.</p>"),
    ("language", "Being served in your language",
     "<p>Whatever your nationality, the process and the costs are exactly the same as for a French buyer. What changes "
     "is the comfort of understanding every step. " + LANGUES_EN + " There are also guides written for "
     + L("/en/buying-in-burgundy-from-the-uk/", "buyers from the UK") + ", "
     + L("/en/buying-property-in-france-as-an-american/", "American buyers") + ", "
     + L("/en/buying-in-burgundy-from-benelux-and-germany/", "buyers from Belgium, the Netherlands and Germany") + ", "
     + L("/en/agent-speaking-hindi-urdu-punjabi-france/", "Hindi, Urdu and Punjabi speakers") + " and "
     + L("/en/agent-speaking-arabic-persian-france/", "Arabic and Persian speakers") + ".</p>"),
    ("sources", "Sources",
     "<ul><li>" + N_2024 + ".</li><li>" + CCF + ".</li><li>" + CAPI + ".</li><li>" + SELOGER + ".</li></ul>"),
  ],
  faq=[
    ("Who are the main foreign buyers in France?",
     "Among non-residents, Belgians and British (19% and 17% in 2022, according to the notaries). In a 2025 network "
     "barometer, Swiss buyers came first with 22%."),
    ("Are British buyers still buying in France after Brexit?",
     "Yes, but less than before: their share among non-resident buyers has fallen since 2016, and fell below 20% in "
     "2022."),
    ("Do Americans buy property in France?",
     "Yes: they made 11% of the sales to foreign buyers in the 2025 Capifrance barometer, with an average budget of "
     "about 400,000 euros."),
    ("Do foreigners pay the same taxes when they buy?",
     "Yes. The buying costs are the same whatever your nationality; your tax situation afterwards depends on where you "
     "live."),
  ],
  links=[("Foreign buyers: the key figures", "/en/foreign-buyers-in-france-key-figures/"),
         ("Where foreigners buy in France", "/en/where-foreigners-buy-in-france/"),
         ("Buying in Burgundy from the UK", "/en/buying-in-burgundy-from-the-uk/"),
         ("Buying in France as an American", "/en/buying-property-in-france-as-an-american/"),
         ("All guides", "/en/guides/")],
)

# --------------------------------------------------------------------------------------------- 3. RÉGIONS
en(
  id="en-regions", path="/en/where-foreigners-buy-in-france/", theme="market",
  title="Where foreigners buy in France, and why Burgundy",
  description="The French regions foreign buyers prefer, what draws them there, and why Burgundy, Dijon and Beaune "
              "deserve a place on your list.",
  label="The market", meta="Market", crumb="Where foreigners buy",
  card="Where foreigners buy in France",
  card_desc="The classic regions, the new trends, and the honest case for Burgundy.",
  h1="Where foreigners buy in France, <em>and why Burgundy.</em>",
  h1_plain="Where foreigners buy in France, and why Burgundy",
  lede="The Côte d'Azur, the Alps, the Dordogne, Paris: foreign buyers have their classics. Burgundy is less talked "
       "about abroad, and that is part of its charm.",
  image="/assets/maison-piscine-vue-aerienne.webp", image_alt="Aerial view of a house with a pool in Burgundy",
  intro="Here is the map of foreign buying in France, then the case for Burgundy, without exaggeration: what it offers, "
        "and what it does not.",
  sections=[
    ("classics", "The classic destinations",
     "<ul>"
     "<li><strong>Provence and the Côte d'Azur</strong>: 3.8% of the sales of existing homes went to non-residents in "
     "2022, against 5.2% in 2015 (" + N_2024 + ").</li>"
     "<li><strong>The rural South-West and the centre</strong>: over 2007 to 2017, non-residents bought around one home "
     "in ten in the Creuse and the Dordogne, as in the Alpes-Maritimes (" + JDA + ").</li>"
     "<li><strong>The Alps</strong>, for skiing and the lakes, and <strong>Paris</strong>, where many foreign buyers "
     "already live in France.</li>"
     "</ul>"),
    ("trends", "What is changing",
     "<p>The 2025 barometer of one large network notes rising interest in Haute-Savoie, the Saône-et-Loire and rural "
     "areas in general. British buyers are looking further east than before, and Swiss buyers favour the departments "
     "within reach of the border (" + CAPI + "). The Saône-et-Loire is the southern department of Burgundy, just south "
     "of the Côte de Beaune.</p>"),
    ("why-burgundy", "Why Burgundy",
     "<ul>"
     "<li><strong>The wine and the landscape</strong>: the Climats of the Burgundy vineyards, from Dijon to the south of "
     "Beaune, are a UNESCO World Heritage site since 2015.</li>"
     "<li><strong>Access</strong>: Dijon is about an hour and a half from Paris by TGV, motorways lead to Lyon and "
     "Switzerland, and Beaune is forty minutes from Dijon by car.</li>"
     "<li><strong>The houses</strong>: stone village houses with cellars, maisons de maître with walled gardens, "
     "winegrowers' houses around a courtyard, and châteaux.</li>"
     "<li><strong>The prices</strong>: for the same space, a fraction of Paris or the Côte d'Azur. Check the real sales "
     "on " + L("/prix-immobilier-cote-d-or/", "my price pages") + " (in French).</li>"
     "<li><strong>Daily life</strong>: a city of human size with a university hospital, a university, a TGV station "
     "and the Cité internationale de la gastronomie et du vin, opened in 2022.</li>"
     "</ul>"
     "<p>What Burgundy does not offer: the sea, and the winters are cold. A big stone house needs a heating budget.</p>"),
    ("where-in-burgundy", "Where in Burgundy",
     "<ul>"
     "<li><strong>Dijon</strong>, for city life: " + L("/en/where-to-live-in-dijon/", "where to live in Dijon") + ".</li>"
     "<li><strong>The Côte de Nuits</strong>, from Marsannay to Nuits-Saint-Georges: "
     + L("/en/homes-on-the-route-des-grands-crus/", "homes on the Route des Grands Crus") + ".</li>"
     "<li><strong>Beaune and the Côte de Beaune</strong>: "
     + L("/en/cote-de-beaune-villages-buying-a-home/", "the Côte de Beaune villages") + ".</li>"
     "<li><strong>The Hautes-Côtes</strong>, quieter and greener: "
     + L("/en/hautes-cotes-burgundy-villages/", "the Hautes-Côtes") + ".</li>"
     "<li><strong>The Auxois</strong>, with Semur-en-Auxois and the Burgundy canal, for more land: "
     + L("/prix-immobilier-semur-en-auxois/", "prices in Semur-en-Auxois") + " (in French).</li>"
     "</ul>"),
    ("how-i-help", "How I help",
     "<p>I am based in Dijon, at the GRAVELIN IMMO agency, 30 rue Bannelier, and I cover Dijon, the Côte de Nuits and "
     "the Beaune area. If you hesitate between several regions, I will tell you honestly whether mine fits your plan. "
     + LANGUES_EN + "</p>"),
  ],
  faq=[
    ("Which French regions do foreign buyers prefer?",
     "Provence and the Côte d'Azur, the Alps, the rural South-West such as the Dordogne, Normandy, Brittany and Paris. "
     "Recent barometers also note growing interest in Haute-Savoie and the Saône-et-Loire."),
    ("Is Burgundy popular with foreign buyers?",
     "It is less famous abroad than Provence, but it attracts wine lovers and many Swiss, Belgian and Parisian buyers, "
     "for its villages, its houses and its access to Paris."),
    ("How far is Dijon from Paris?",
     "About an hour and a half by TGV from Paris Gare de Lyon."),
    ("Can I see real prices before visiting?",
     "Yes. The prices actually paid at the notaire's are public in France, and I publish them commune by commune."),
  ],
  links=[("Foreign buyers: the key figures", "/en/foreign-buyers-in-france-key-figures/"),
         ("Homes on the Route des Grands Crus", "/en/homes-on-the-route-des-grands-crus/"),
         ("Buying a house in Beaune", "/en/buying-a-house-in-beaune/"),
         ("Living in Dijon", "/en/living-in-dijon/"),
         ("All guides", "/en/guides/")],
)

# --------------------------------------------------------------------------------------------- 4. PORTAILS
en(
  id="en-portals", path="/en/french-property-portals-for-international-buyers/", theme="market",
  title="French property portals for international buyers",
  description="Rightmove, Green-Acres, Kyero, Properstar, A Place in the Sun and others: how buyers abroad search for "
              "French homes, and the traps to avoid.",
  label="The market", meta="Market", crumb="International portals",
  card="The international property portals",
  card_desc="Where buyers abroad search, how to read the listings, and what the portals do not show.",
  h1="Searching for a French home online: <em>the international portals.</em>",
  h1_plain="Searching for a French home online: the international portals",
  lede="Most buyers abroad start on a property portal in their own language. That is a good start, as long as you know "
       "how these sites work.",
  image="/assets/shawez-ali-telephone-costume-bleu.webp", image_alt="Shawez Ali on the phone with a buyer",
  img_w=1200, img_h=1500,
  intro="The same house can appear five times, with three different prices, on sites in four languages. Here are the "
        "main portals used by international buyers, how to read what they show, and what they do not.",
  sections=[
    ("portals", "The main portals",
     "<ul>"
     "<li><strong>Rightmove</strong> and <strong>Zoopla</strong>: the large British portals, with sections for "
     "property abroad.</li>"
     "<li><strong>Green-Acres</strong>: a portal dedicated to French property for international buyers, in several "
     "languages.</li>"
     "<li><strong>Properstar</strong>: an international portal in many languages.</li>"
     "<li><strong>Kyero</strong>: born for Spain, it also lists homes in France and other countries.</li>"
     "<li><strong>French-Property.com</strong>: an English-language site about French property.</li>"
     "<li><strong>A Place in the Sun</strong>: the British site and magazine linked to the TV programme.</li>"
     "<li><strong>ListGlobally</strong>: a network that passes agencies' listings on to partner portals abroad.</li>"
     "<li><strong>Propriétés Le Figaro</strong> and <strong>Résidences Immobilier</strong>: French sites for prestige "
     "properties, read by many buyers abroad.</li>"
     "</ul>"),
    ("asking-prices", "Asking prices, duplicates and old listings",
     "<p>In France, a seller can give the sale to several agencies at once, so the same house appears several times, "
     "sometimes with different prices: one agency shows the fee included, another has not updated a price reduction, "
     "a third converts it into your currency. Some listings stay online after the sale.</p>"
     "<p>An asking price is only a starting point. The prices actually paid at the notaire's are public: "
     + L("/en/real-sale-prices-france-dvf/", "how to check them") + ".</p>"),
    ("check-agency", "Check who is behind the listing",
     "<ul>"
     "<li>A French agency must hold a professional licence, the carte professionnelle, and show its number on its "
     "documents and website.</li>"
     "<li>Look for a real address and call it. GRAVELIN IMMO is at 30 rue Bannelier in Dijon.</li>"
     "<li>Never transfer money to a seller or to a private person met online. In France, the purchase money goes "
     "through the notaire.</li>"
     "</ul>"),
    ("not-shown", "What the portals do not show",
     "<p>The good properties at the right price often sell before they reach the foreign portals, or within days. "
     "Some sellers prefer a discreet sale and never publish their property. That is why it pays to tell a local agent "
     "exactly what you want: when a property that matches comes in, I send the film to the buyers already looking, "
     "so they can decide quickly.</p>"),
    ("how-i-help", "Searching with me from abroad",
     "<p>Send me your criteria, your budget and your timing on WhatsApp or by email. I answer with the properties that "
     "fit, their films, the real prices around them, and the questions to ask. " + LANGUES_EN + "</p>"),
  ],
  faq=[
    ("Which websites list French property in English?",
     "Green-Acres, Properstar, French-Property.com, A Place in the Sun, Kyero, and the overseas sections of Rightmove "
     "and Zoopla, among others."),
    ("Why is the same house listed at different prices?",
     "Several agencies may sell it, one may include its fee and another not, or a price reduction may not be updated "
     "everywhere."),
    ("Is the price on a portal the market price?",
     "It is an asking price. The prices really paid are in the official DVF data of notarised sales."),
    ("How do I know an agency is genuine?",
     "It must hold a carte professionnelle and show its number. Check its address and call it before sending any "
     "documents."),
  ],
  links=[("Checking real sale prices (DVF)", "/en/real-sale-prices-france-dvf/"),
         ("How estate agency fees work", "/en/how-estate-agency-fees-work-in-france/"),
         ("Making an offer in France", "/en/making-an-offer-on-a-french-property/"),
         ("Properties for sale (in French)", "/biens-a-vendre-dijon/"),
         ("All guides", "/en/guides/")],
)

# --------------------------------------------------------------------------------------------- 5. DVF
en(
  id="en-dvf", path="/en/real-sale-prices-france-dvf/", theme="market",
  title="How to check real sale prices in France (DVF)",
  description="Asking prices are not sale prices. How to use France's official DVF data of notarised sales before an "
              "offer, and how I read it for Dijon and Burgundy.",
  label="The market", meta="Prices", crumb="Real sale prices",
  card="Checking real sale prices (DVF)",
  card_desc="France publishes the prices actually paid. How to use them before you make an offer.",
  h1="Real sale prices in France: <em>how to read the DVF data.</em>",
  h1_plain="Real sale prices in France: how to read the DVF data",
  lede="In France, the prices actually paid for homes are public. Few countries offer that. Here is how to use it, and "
       "its limits.",
  image="/assets/shawez-ali-quartiers-dijon.webp", image_alt="Shawez Ali talking about Dijon neighbourhoods",
  img_w=512, img_h=640,
  intro="A listing tells you what a seller hopes for. A notarised deed tells you what a buyer paid. Between the two, "
        "the gap can be large, and the notaries found that non-resident buyers paid on average more than residents. "
        "The official DVF data is the simplest way to avoid that.",
  sections=[
    ("what", "What DVF is",
     "<p>DVF, for demandes de valeurs foncières, is the database of property sales published by the French tax "
     "administration from the notarised deeds. For each sale you find the date, the price, the type of property, the "
     "commune and the plot, and often the floor area and the number of rooms. It covers the last five years, with a "
     "delay of a few months. You can explore it on the " + DVF + ".</p>"),
    ("how", "How to use it",
     "<ol>"
     "<li>Find the sales in the same street or the same few streets, over the last two years.</li>"
     "<li>Keep comparable properties only: same type, similar size, house with or without land.</li>"
     "<li>Look at the price per square metre, and set aside the oddities: a sale between relatives, a house sold with "
     "several hectares, a flat sold with a shop.</li>"
     "<li>Compare with the asking price of the property you like, and ask why it is higher or lower.</li>"
     "</ol>"),
    ("limits", "The limits",
     "<ul>"
     "<li>DVF does not say anything about the condition, the view, the floor or the works needed.</li>"
     "<li>The most recent months are missing.</li>"
     "<li>In a small village, there may be only a handful of sales a year.</li>"
     "<li>Alsace, the Moselle and Mayotte are not covered, as their land registry works differently.</li>"
     "</ul>"),
    ("my-pages", "My price pages",
     "<p>I publish the medians of the real sales, commune by commune, with the method and the period: "
     + L("/prix-immobilier-dijon/", "Dijon") + ", " + L("/prix-immobilier-beaune/", "Beaune") + ", "
     + L("/prix-immobilier-gevrey-chambertin/", "Gevrey-Chambertin") + ", "
     + L("/prix-immobilier-nuits-saint-georges/", "Nuits-Saint-Georges") + ", "
     + L("/prix-immobilier-meursault/", "Meursault") + " and "
     + L("/prix-immobilier-cote-d-or/", "the whole Côte-d'Or") + " (in French, the figures speak for themselves).</p>"),
    ("offer", "Using it in a negotiation",
     "<p>An offer backed by real sales is taken seriously by a seller, because it is not an opinion. For each property "
     "my buyers like, I prepare that comparison: the sales around it, what they had and did not have, and the price "
     "that makes sense. See also " + L("/en/making-an-offer-on-a-french-property/", "how to make an offer") + ".</p>"),
  ],
  faq=[
    ("Is the DVF data reliable?",
     "It comes from the notarised deeds, so the prices are real. It does not describe the condition of the property, "
     "which is why it has to be read with care."),
    ("How recent is the DVF data?",
     "It is published with a delay of a few months and covers the last five years."),
    ("Does DVF cover the whole of France?",
     "No: Alsace, the Moselle and Mayotte are not included."),
    ("Can you give me the real prices around a specific property?",
     "Yes. Send me the listing and I will tell you what the comparable sales around it fetched."),
  ],
  links=[("Making an offer in France", "/en/making-an-offer-on-a-french-property/"),
         ("Foreign buyers: the key figures", "/en/foreign-buyers-in-france-key-figures/"),
         ("Prices in Dijon (in French)", "/prix-immobilier-dijon/"),
         ("Prices in the Côte-d'Or (in French)", "/prix-immobilier-cote-d-or/"),
         ("All guides", "/en/guides/")],
)

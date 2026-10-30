#!/usr/bin/env python3
"""Blog international : vivre à Dijon et en Bourgogne (faits vérifiables seulement ; aucun classement de quartier)."""
from blog_commun import en, L, X, LANGUES_EN

UBE = X("https://www.ube.fr/", "Université Bourgogne Europe")
FRANCE_VISAS = X("https://france-visas.gouv.fr/", "France-Visas")
AMELI = X("https://www.ameli.fr/", "ameli.fr")
SNCF = X("https://www.sncf-connect.com/", "SNCF Connect")
DIVIA = X("https://www.divia.fr/", "Divia")

# --------------------------------------------------------------------------------------------- 1. QUARTIERS
en(
  id="en-where-dijon", path="/en/where-to-live-in-dijon/", theme="living",
  title="Where to live in Dijon: a neighbourhood guide",
  description="The historic centre, the station area, Montchapet, the east, the lake and the suburbs: what kind of "
              "home you find where in Dijon, from a local agent.",
  label="Living in Burgundy", meta="Dijon", crumb="Where to live in Dijon",
  card="Where to live in Dijon",
  card_desc="Area by area: the type of homes, the daily life, and how to choose.",
  h1="Where to live in Dijon: <em>area by area.</em>",
  h1_plain="Where to live in Dijon: area by area",
  lede="Dijon is compact: from almost anywhere, the centre is a short tram or bike ride away. What changes from one "
       "area to the next is the type of home, and the life around it.",
  image="/assets/dijon-eglise-saint-michel.webp", image_alt="Saint-Michel church in Dijon's historic centre",
  intro="Rather than ranking neighbourhoods, here is what you find in each part of the city and around it, so you can "
        "match an area to the way you want to live. For the real prices, street by street, ask me: I work from the "
        "official sales.",
  sections=[
    ("centre", "The historic centre",
     "<p>Around the Palace of the Dukes, Les Halles market, Notre-Dame and the rue de la Liberté: pedestrian streets, "
     "restaurants, the owl trail. The homes are mostly apartments in old buildings, many in a protected sector, often "
     "without lifts or parking. Ideal if you want to do everything on foot.</p>"),
    ("station", "Around the station and the Darcy garden",
     "<p>Close to the TGV station and the start of the tram lines, with handsome 19th-century buildings. A practical "
     "choice if you commute to Paris or travel often: " + L("/en/living-in-dijon-working-in-paris/",
     "living in Dijon, working in Paris") + ".</p>"),
    ("west", "Montchapet and the north-west",
     "<p>Residential streets with houses and gardens, and apartment buildings with space, a short distance from the "
     "centre. Families like the calm and the schools nearby. Further west, the Lac Kir and the Ouche valley offer "
     "walks and water sports.</p>"),
    ("east", "The east: République, the university, the Toison d'Or",
     "<p>Around the Place de la République, apartment buildings and quick access to the tram. Further east, the "
     "university campus, with many small flats, then the Toison d'Or area with its shopping centre and more recent "
     "developments. Good areas to look at for " + L("/en/investing-in-student-flats-in-dijon/",
     "a student flat investment") + ".</p>"),
    ("south", "The south-east: the canal and the parks",
     "<p>Around the port of the Burgundy canal and towards the Colombière park, a mix of old houses, small buildings "
     "and newer homes, with green spaces close by.</p>"),
    ("suburbs", "The towns around Dijon",
     "<ul>"
     "<li><strong>On the hills to the west</strong>: " + L("/immobilier-fontaine-les-dijon/", "Fontaine-lès-Dijon")
     + " and " + L("/prix-immobilier-talant/", "Talant") + ", with a village feel and views over the city.</li>"
     "<li><strong>To the south</strong>: " + L("/prix-immobilier-marsannay-la-cote/", "Marsannay-la-Côte") + ", the first "
     "wine village of the Côte de Nuits, and " + L("/prix-immobilier-chenove/", "Chenôve") + ".</li>"
     "<li><strong>To the east</strong>: " + L("/prix-immobilier-quetigny/", "Quetigny") + ", Chevigny-Saint-Sauveur and "
     "Saint-Apollinaire, with family houses, gardens and shops.</li>"
     "<li><strong>Along the Ouche</strong>: " + L("/prix-immobilier-plombieres-les-dijon/", "Plombières-lès-Dijon")
     + ", between the river and the canal.</li>"
     "</ul>"),
    ("choose", "How I help you choose",
     "<p>Tell me how you want to live: on foot or by car, flat or house, near the station or near a school. I suggest "
     "two or three areas, show you the real prices, and film the streets for you if you are still abroad. "
     + LANGUES_EN + "</p>"),
  ],
  faq=[
    ("Which area of Dijon suits families?",
     "It depends on the school, the budget and the type of home you want. Many families choose Montchapet, the hills "
     "of Fontaine-lès-Dijon and Talant, or the towns to the east for a house with a garden."),
    ("Can I live in Dijon without a car?",
     "In the centre and along the tram lines, yes: two tram lines, buses and many cycle paths."),
    ("Where should I live if I commute to Paris?",
     "Close to the station, or along a tram line that reaches it quickly."),
    ("Can you film a street for me before I visit?",
     "Yes. I can show you the street and the surroundings live on a WhatsApp video call."),
  ],
  links=[("Living in Dijon", "/en/living-in-dijon/"),
         ("Schools in Dijon", "/en/schools-and-universities-in-dijon/"),
         ("Getting to Dijon", "/en/getting-to-dijon-trains-airports-roads/"),
         ("Buying a flat in a copropriété", "/en/buying-an-apartment-in-a-french-copropriete/"),
         ("Buying a new build off-plan", "/en/buying-off-plan-vefa-france/"),
         ("Prices in Dijon (in French)", "/prix-immobilier-dijon/"),
         ("All guides", "/en/guides/")],
)

# --------------------------------------------------------------------------------------------- 2. ÉCOLES
en(
  id="en-schools", path="/en/schools-and-universities-in-dijon/", theme="living",
  title="Schools and universities in Dijon for newcomers",
  description="How French schools work, enrolling your children in Dijon, the international section, support for "
              "pupils learning French, and the universities.",
  label="Living in Burgundy", meta="Families", crumb="Schools in Dijon",
  card="Schools and universities in Dijon",
  card_desc="The French school system, enrolment, the international section, the universities.",
  h1="Schools and universities in Dijon, <em>for families from abroad.</em>",
  h1_plain="Schools and universities in Dijon, for families from abroad",
  lede="For many families, the school decides the area. Here is how French schools work, and what Dijon offers.",
  image="/assets/appartement-sous-les-toits-chambre.webp", image_alt="Bedroom under the eaves in an apartment",
  intro="French state schools charge no fees and are organised by age. In Dijon, a university city, children and students find a "
        "full range of schools close to home. Here are the basics for families arriving from abroad.",
  sections=[
    ("system", "How French schools work",
     "<ul>"
     "<li><strong>École maternelle</strong>, from 3 to 6 years old, then <strong>école élémentaire</strong>, from 6 to 11: "
     "enrolment at the town hall, according to your address.</li>"
     "<li><strong>Collège</strong>, from 11 to 15, then <strong>lycée</strong>, from 15 to 18, ending with the "
     "baccalauréat.</li>"
     "<li>State schools charge no fees; private schools under contract with the State follow the same curriculum.</li>"
     "</ul>"),
    ("arriving", "Arriving without speaking French",
     "<p>State schools have special classes to help newly arrived pupils learn French while following lessons, called "
     "UPE2A. The education authority of the académie de Dijon assesses each child on arrival and directs them to the "
     "right school.</p>"),
    ("international", "The international section",
     "<p>In Dijon, the Lycée européen Charles de Gaulle offers an international section at lycée level. Ask the school "
     "directly about the languages, the places and the admission tests, as they change from year to year.</p>"),
    ("higher", "Universities and higher education",
     "<p>Dijon is home to " + UBE + ", the Burgundy School of Business, a campus of Sciences Po, and the Institut Agro "
     "Dijon, among others. The university also teaches French as a foreign language to adults, useful for parents.</p>"),
    ("area", "Choosing the area with the school",
     "<p>For a primary school, the address decides the school, so it is worth checking before you buy. I tell my "
     "buyers which school a property depends on, and the time to the collège and the lycée. "
     + L("/en/where-to-live-in-dijon/", "Where to live in Dijon") + ". " + LANGUES_EN + "</p>"),
  ],
  faq=[
    ("Do state schools charge fees in France?",
     "No tuition fees. You pay for meals, after-school care and some activities."),
    ("How do I enrol my child in primary school in Dijon?",
     "At the town hall, with proof of address and your child's documents. The address decides the school."),
    ("Is there an international school in Dijon?",
     "The Lycée européen Charles de Gaulle has an international section at lycée level. Ask the school for the "
     "languages and admission conditions."),
    ("What if my child does not speak French?",
     "State schools have classes to help newly arrived pupils learn French while following lessons."),
  ],
  links=[("Where to live in Dijon", "/en/where-to-live-in-dijon/"),
         ("Moving to Burgundy: the checklist", "/en/moving-to-burgundy-checklist/"),
         ("Living in Dijon", "/en/living-in-dijon/"),
         ("All guides", "/en/guides/")],
)

# --------------------------------------------------------------------------------------------- 3. ACCÈS
en(
  id="en-access", path="/en/getting-to-dijon-trains-airports-roads/", theme="living",
  title="Getting to Dijon: trains, airports and roads",
  description="TGV to Paris, trains to Lyon and Switzerland, the airports within reach, the motorways: how Dijon and "
              "Beaune connect to the rest of Europe.",
  label="Living in Burgundy", meta="Practical", crumb="Getting to Dijon",
  card="Getting to Dijon",
  card_desc="TGV, airports and motorways: how Dijon connects to Paris, Lyon and Switzerland.",
  h1="Getting to Dijon: <em>trains, airports and roads.</em>",
  h1_plain="Getting to Dijon: trains, airports and roads",
  lede="For a second home or a new life, access matters. Dijon sits on the main line between Paris, Lyon and "
       "Switzerland.",
  image="/assets/shawez-ali-depart-visite-dijon.webp", image_alt="Shawez Ali leaving for a visit in Dijon",
  intro="Dijon has been a crossroads since the Dukes of Burgundy. Today, it is a TGV station, a motorway junction, and "
        "a short drive from several airports.",
  sections=[
    ("train", "By train",
     "<ul>"
     "<li><strong>Paris</strong>: about an hour and a half by TGV to Paris Gare de Lyon.</li>"
     "<li><strong>Lyon</strong>: about two hours by train.</li>"
     "<li><strong>Switzerland</strong>: trains towards Lausanne, then Geneva.</li>"
     "<li><strong>Beaune</strong>: around twenty minutes by regional train.</li>"
     "</ul>"
     "<p>Timetables and tickets: " + SNCF + ".</p>"),
    ("air", "By air",
     "<p>Dijon has no regular commercial flights. The airports used by my buyers are Paris Charles-de-Gaulle and Orly, "
     "Lyon-Saint-Exupéry, Geneva and Basel-Mulhouse, all within a few hours by train or car, and the small Dole-Jura "
     "airport, about fifty kilometres away, with a few low-cost routes.</p>"),
    ("road", "By road",
     "<p>Motorways lead from Dijon towards Paris, Lyon, Nancy and Luxembourg, Besançon and Switzerland, and Germany. "
     "Count around three hours to Paris, two hours to Lyon and two and a half to three hours to Geneva, depending on "
     "traffic.</p>"),
    ("local", "Getting around locally",
     "<p>In Dijon, two tram lines and a bus network (" + DIVIA + "), and many cycle paths. Beaune is about forty minutes "
     "by car, and the wine villages of the Côte de Nuits start at the edge of the city.</p>"),
    ("choose", "What it means for your home",
     "<p>If you travel often, being close to the station or a tram line saves hours each month. For a second home in the "
     "villages, check the drive to the station. I tell my buyers the real travel times from each property. "
     + LANGUES_EN + "</p>"),
  ],
  faq=[
    ("How long is the train from Paris to Dijon?",
     "About an hour and a half by TGV from Paris Gare de Lyon."),
    ("Which airport is closest to Dijon?",
     "Dole-Jura is the closest, about fifty kilometres away, with few routes. Most international travellers use Paris, "
     "Lyon, Geneva or Basel-Mulhouse."),
    ("How far is Beaune from Dijon?",
     "About forty minutes by car, or around twenty minutes by regional train."),
    ("Can I reach Switzerland easily from Dijon?",
     "Yes, by motorway or by train towards Lausanne and Geneva."),
  ],
  links=[("Living in Dijon, working in Paris", "/en/living-in-dijon-working-in-paris/"),
         ("Where to live in Dijon", "/en/where-to-live-in-dijon/"),
         ("Owning a second home in Burgundy", "/en/owning-a-second-home-in-burgundy/"),
         ("All guides", "/en/guides/")],
)

# --------------------------------------------------------------------------------------------- 4. PARIS
en(
  id="en-paris", path="/en/living-in-dijon-working-in-paris/", theme="living",
  title="Living in Dijon and working in Paris",
  description="The TGV commute, hybrid work, more space for the price, and the areas to choose near the station: a "
              "practical look at living in Dijon with a job in Paris.",
  label="Living in Burgundy", meta="Dijon", crumb="Dijon and Paris",
  card="Living in Dijon, working in Paris",
  card_desc="The TGV commute, hybrid work, and where to live near the station.",
  h1="Living in Dijon <em>with a job in Paris.</em>",
  h1_plain="Living in Dijon with a job in Paris",
  lede="An hour and a half by TGV, several times the space for the same budget, and the vineyards at the end of the "
       "street. Here is how it works in practice.",
  image="/assets/appartement-centre-historique-dijon-salon.webp",
  image_alt="Living room of an apartment in Dijon's historic centre",
  intro="Since hybrid work became common, many people living in Paris, including international families, look at "
        "Dijon. The city offers what Paris cannot: space, calm, and a lower price per square metre, without losing the "
        "capital.",
  sections=[
    ("commute", "The commute",
     "<p>The TGV links Dijon to Paris Gare de Lyon in about an hour and a half. With two or three days a week in Paris, "
     "the train becomes a working time. Season tickets exist for regular travellers: compare them on "
     + SNCF + ".</p>"),
    ("space", "More space for your budget",
     "<p>For the price of a small Paris flat, you can find a large apartment in Dijon, or a house with a garden on the "
     "edge of the city. Look at the real prices on " + L("/prix-immobilier-dijon/", "my Dijon price page")
     + " (in French), from the official DVF data.</p>"),
    ("where", "Where to live",
     "<p>Near the station, every minute counts: the streets around the Darcy garden, the historic centre, or an area "
     "along a tram line that reaches the station quickly. " + L("/en/where-to-live-in-dijon/", "Where to live in Dijon")
     + ".</p>"),
    ("life", "Life in Dijon",
     "<p>A city of human size, the capital of a wine region, with a university hospital, a university, a lively centre "
     "and Beaune forty minutes away. The winters are colder than in Paris, the summers are sunny.</p>"),
    ("how-i-help", "Searching from Paris",
     "<p>Many of my buyers live in Paris during their search. I send them the films, I show the properties live on video "
     "calls, and I organise their visits on a single day in Dijon. " + LANGUES_EN + "</p>"),
  ],
  faq=[
    ("Can I commute from Dijon to Paris every day?",
     "Some people do, but most combine two or three days in Paris with remote work."),
    ("How long does the TGV take from Dijon to Paris?",
     "About an hour and a half to Paris Gare de Lyon."),
    ("Is Dijon cheaper than Paris?",
     "Yes, by a wide margin per square metre. The real prices are public in the DVF data."),
    ("Can you organise all my visits on one day?",
     "Yes. I prepare a day of visits so that you only travel once."),
  ],
  links=[("Getting to Dijon", "/en/getting-to-dijon-trains-airports-roads/"),
         ("Where to live in Dijon", "/en/where-to-live-in-dijon/"),
         ("Real sale prices (DVF)", "/en/real-sale-prices-france-dvf/"),
         ("All guides", "/en/guides/")],
)

# --------------------------------------------------------------------------------------------- 5. SANTÉ
en(
  id="en-health", path="/en/healthcare-in-dijon-for-newcomers/", theme="living",
  title="Healthcare in Dijon for newcomers",
  description="Joining the French health system, the carte Vitale, complementary insurance, finding a doctor, and the "
              "hospitals in Dijon: the basics for newcomers.",
  label="Living in Burgundy", meta="Practical", crumb="Healthcare",
  card="Healthcare in Dijon for newcomers",
  card_desc="Joining the French system, insurance, finding a doctor, the hospitals.",
  h1="Healthcare in Dijon, <em>for newcomers.</em>",
  h1_plain="Healthcare in Dijon, for newcomers",
  lede="Dijon has a university hospital and a regional cancer centre. Here is how to join the French health system "
       "when you move here.",
  image="/assets/maison-230m2-dressing.webp", image_alt="Bright room in a family house",
  intro="French public health insurance covers residents, whatever their nationality, once they live in France in a "
        "stable and regular way. Until then, travellers rely on their own cover.",
  sections=[
    ("join", "Joining the French system",
     "<p>After three months of stable and regular residence in France, you can apply to the local health insurance "
     "office (CPAM) to join the public system, called PUMa. You then receive a social security number and a carte "
     "Vitale. Workers in France are covered through their job. Official information: " + AMELI + ".</p>"),
    ("mutuelle", "Complementary insurance",
     "<p>The public system reimburses part of the costs. A complementary insurance, the mutuelle, covers most of the "
     "rest. Employers offer one to their employees; others choose their own.</p>"),
    ("doctor", "Finding a doctor",
     "<p>Choose a regular GP, the médecin traitant, and declare them: you are then better reimbursed. In many parts of "
     "France, GPs are in short supply, so start looking as soon as you arrive. Pharmacists are a good first point of "
     "contact for small problems.</p>"),
    ("hospitals", "Hospitals in Dijon",
     "<p>Dijon has the CHU Dijon Bourgogne, the university hospital, the Centre Georges-François Leclerc, a regional "
     "cancer centre, and several private clinics. For emergencies, call 15, or 112 from any phone.</p>"),
    ("visitors", "Before you are a resident",
     "<p>European visitors use their European Health Insurance Card; British visitors their GHIC; others need private "
     "travel insurance. Pensioners from the EU or the UK may be covered through the S1 form. "
     + L("/en/retiring-to-burgundy/", "Retiring to Burgundy") + ". " + LANGUES_EN + "</p>"),
  ],
  faq=[
    ("Can foreigners use the French health system?",
     "Yes, once they live in France in a stable and regular way, usually after three months, or through their job."),
    ("What is the carte Vitale?",
     "The French health insurance card, used to be reimbursed directly."),
    ("Is there a university hospital in Dijon?",
     "Yes, the CHU Dijon Bourgogne, and a regional cancer centre, the Centre Georges-François Leclerc."),
    ("What number do I call in an emergency?",
     "15 for medical emergencies, or 112 from any phone."),
  ],
  links=[("Retiring to Burgundy", "/en/retiring-to-burgundy/"),
         ("Moving to Burgundy: the checklist", "/en/moving-to-burgundy-checklist/"),
         ("Living in Dijon", "/en/living-in-dijon/"),
         ("All guides", "/en/guides/")],
)

# --------------------------------------------------------------------------------------------- 6. RETRAITE
en(
  id="en-retire", path="/en/retiring-to-burgundy/", theme="living",
  title="Retiring to Burgundy: a practical guide",
  description="Visas for non-Europeans, healthcare, choosing a home you can grow old in, Dijon or the villages: a "
              "practical guide to retiring in Burgundy.",
  label="Living in Burgundy", meta="Retirement", crumb="Retiring to Burgundy",
  card="Retiring to Burgundy",
  card_desc="Visas, healthcare, and choosing a home you can live in for twenty years.",
  h1="Retiring to Burgundy, <em>the practical side.</em>",
  h1_plain="Retiring to Burgundy, the practical side",
  lede="Wine, food, calm and culture, with Paris at an hour and a half: Burgundy is a fine place to retire. Here is how "
       "to prepare it.",
  image="/assets/shawez-ali-verger-maison-pierre.webp", image_alt="Shawez Ali in the orchard of a stone house",
  intro="Retiring abroad is a project of several years. Three questions come first: your right to stay, your "
        "healthcare, and a home you can live in comfortably for the next twenty years.",
  sections=[
    ("visa", "Your right to stay",
     "<p>Citizens of the European Union, the EEA and Switzerland can settle freely. Others, including British and "
     "American citizens, need a long-stay visa for stays over 90 days, often the « visitor » visa for retirees, which "
     "requires proof of resources and health insurance. Owning a home does not give a right to stay. Details on "
     + FRANCE_VISAS + ".</p>"),
    ("health", "Healthcare",
     "<p>Once resident, you can join the French system; some pensioners are covered through the S1 form from their "
     "country. " + L("/en/healthcare-in-dijon-for-newcomers/", "Healthcare in Dijon") + ".</p>"),
    ("home", "A home for the next twenty years",
     "<ul>"
     "<li>A bedroom and a bathroom on the ground floor, or a lift.</li>"
     "<li>Shops, a pharmacy and a doctor within reach, without depending on the car.</li>"
     "<li>A garden you can maintain, or someone to help.</li>"
     "<li>Reasonable heating costs: check the energy rating and the real bills.</li>"
     "</ul>"),
    ("where", "Dijon or a village?",
     "<p>A village of the Côte has the charm, but services are further. Dijon, Beaune and the larger villages offer "
     "both. Many retirees choose an apartment in Dijon or Beaune, or a house in a village with a pharmacy and a "
     "doctor.</p>"),
    ("plan", "Plan your estate too",
     "<p>Retiring in France changes your tax residence and the law of your succession. See a notaire and a tax adviser "
     "before moving. " + L("/en/french-inheritance-rules-for-foreign-owners/", "Inheritance rules")
     + ". " + LANGUES_EN + "</p>"),
  ],
  faq=[
    ("Can I retire to France if I am not European?",
     "Yes, with a long-stay visa, often the visitor visa, which requires proof of resources and health insurance."),
    ("Does buying a house give me a right to live in France?",
     "No. Your right to stay depends on your nationality and your visa, not on owning a home."),
    ("Is healthcare available for retirees?",
     "Yes, once resident; some pensioners are covered through the S1 form from their country."),
    ("Which homes suit retirement?",
     "A home with a bedroom on the ground floor or a lift, close to shops and a doctor, with reasonable heating costs."),
  ],
  links=[("Healthcare in Dijon", "/en/healthcare-in-dijon-for-newcomers/"),
         ("Inheritance rules", "/en/french-inheritance-rules-for-foreign-owners/"),
         ("Buying a house in Beaune", "/en/buying-a-house-in-beaune/"),
         ("All guides", "/en/guides/")],
)

# --------------------------------------------------------------------------------------------- 7. DÉMÉNAGEMENT
en(
  id="en-moving", path="/en/moving-to-burgundy-checklist/", theme="living",
  title="Moving to Burgundy: the practical checklist",
  description="Bank, insurance, energy, internet, schools, health, driving licence, car, taxes: the checklist for "
              "settling in Dijon or Burgundy after buying.",
  label="Living in Burgundy", meta="Practical", crumb="Moving checklist",
  card="Moving to Burgundy: the checklist",
  card_desc="Everything to set up after the keys: bank, insurance, energy, schools, car.",
  h1="Moving to Burgundy: <em>the checklist.</em>",
  h1_plain="Moving to Burgundy: the checklist",
  lede="The keys are the beginning. Here is what to set up in the first weeks, in a sensible order.",
  image="/assets/st-cour.webp", image_alt="House with a garden in autumn", img_w=720, img_h=1280,
  intro="French administration has a reputation. In practice, most steps are now online. The secret is to do them in "
        "the right order, starting before the move.",
  sections=[
    ("before", "Before the move",
     "<ul>"
     "<li>Your visa or residence documents, if you are not European.</li>"
     "<li>A euro bank account: useful for the direct debits that follow.</li>"
     "<li>Home insurance from the day of the deed, compulsory in a copropriété.</li>"
     "</ul>"),
    ("home", "The home",
     "<ul>"
     "<li>Electricity and gas: choose a supplier and give the meter readings of the day of the deed.</li>"
     "<li>Water: usually managed by the commune or its grouping.</li>"
     "<li>Internet: check fibre coverage at the address before you buy.</li>"
     "<li>Redirect your mail and register your new address with the tax office.</li>"
     "</ul>"),
    ("family", "The family",
     "<ul>"
     "<li>Schools: enrol at the town hall for primary school. "
     + L("/en/schools-and-universities-in-dijon/", "Schools in Dijon") + ".</li>"
     "<li>Health: join the French system when you are eligible, and find a GP. "
     + L("/en/healthcare-in-dijon-for-newcomers/", "Healthcare in Dijon") + ".</li>"
     "</ul>"),
    ("car", "The car",
     "<p>A European driving licence remains valid. Holders of some other licences must exchange them within a year of "
     "settling: check on the official ANTS website. A car imported from abroad must be registered in France.</p>"),
    ("taxes", "Taxes",
     "<p>Your first French income tax return is filed the year after your arrival. Declare how your home is used in the "
     "online space for owners. " + L("/en/property-taxes-in-france-for-owners/", "Yearly property taxes") + ".</p>"),
    ("help", "Who to ask",
     "<p>After the sale, my buyers keep my number: if you do not know who to call for a boiler, a chimney sweep or an "
     "estimate, ask me. " + LANGUES_EN + "</p>"),
  ],
  faq=[
    ("Is home insurance compulsory in France?",
     "It is compulsory for tenants and for owners in a copropriété, and strongly advised for everyone."),
    ("Do I need to exchange my driving licence?",
     "Not if it is European. Holders of some other licences must exchange it within a year of settling in France."),
    ("When do I file my first French tax return?",
     "The year after your arrival, online on impots.gouv.fr."),
    ("Can you help after the purchase?",
     "Yes. If you need a contact for the home, ask me."),
  ],
  links=[("Schools in Dijon", "/en/schools-and-universities-in-dijon/"),
         ("Healthcare in Dijon", "/en/healthcare-in-dijon-for-newcomers/"),
         ("Yearly property taxes", "/en/property-taxes-in-france-for-owners/"),
         ("All guides", "/en/guides/")],
)

# --------------------------------------------------------------------------------------------- 8. RÉSIDENCE SECONDAIRE
en(
  id="en-second-home", path="/en/owning-a-second-home-in-burgundy/", theme="living",
  title="Owning a second home in Burgundy: what to plan",
  description="Taxes, insurance, winter, a caretaker, letting it when you are away, and the 90-day rule for "
              "non-Europeans: owning a second home in Burgundy.",
  label="Living in Burgundy", meta="Second homes", crumb="Second home",
  card="Owning a second home in Burgundy",
  card_desc="Taxes, insurance, winter, a caretaker, and letting it when you are away.",
  h1="A second home in Burgundy: <em>what to plan.</em>",
  h1_plain="A second home in Burgundy: what to plan",
  lede="A house in the vineyards for the holidays is a joy, if it is organised. Here is what to plan before the first "
       "winter.",
  image="/assets/maison-pierre-volets-rouges-beaune.webp", image_alt="Stone house with red shutters near Beaune",
  intro="A second home lives without you most of the year. The budget, the winter and the people who keep an eye on it "
        "matter as much as the charm.",
  sections=[
    ("budget", "The yearly budget",
     "<ul>"
     "<li>The property tax and the taxe d'habitation on second homes, with a possible surcharge in some communes: "
     + L("/en/property-taxes-in-france-for-owners/", "yearly property taxes") + ".</li>"
     "<li>Insurance: check the clauses on unoccupied periods.</li>"
     "<li>Energy, water, internet, even when you are away.</li>"
     "<li>The garden, the gutters, the chimney sweep.</li>"
     "</ul>"),
    ("winter", "Winter",
     "<p>Burgundy winters can freeze. Keep minimum heating, know where the water stopcock is, and ask someone to check "
     "the house after a cold spell. Old stone houses do not like being closed and cold for months.</p>"),
    ("caretaker", "Someone on site",
     "<p>A neighbour, a caretaking service or a local company can open the shutters, check after a storm and let in a "
     "craftsman. It is worth organising from the first year.</p>"),
    ("letting", "Letting it when you are away",
     "<p>Letting to holidaymakers helps with the costs, but the rules have tightened: registration, energy rating, tax. "
     + L("/en/holiday-rental-rules-burgundy/", "Letting a holiday home in Burgundy") + ".</p>"),
    ("stays", "How long you can stay",
     "<p>Europeans come and go freely. British, American and other non-European owners can stay 90 days in any 180 "
     "without a visa; beyond that, a long-stay visa is needed. Owning a home does not change this rule. "
     + LANGUES_EN + "</p>"),
  ],
  faq=[
    ("Do I pay taxe d'habitation on a second home?",
     "Yes. It remains for second homes, with a possible surcharge in some communes."),
    ("Can I stay longer than 90 days if I own a home?",
     "Not without a visa if you are not European: owning a home does not change the 90-day rule."),
    ("Can I let my second home to tourists?",
     "Yes, following the rules on registration, energy rating and tax."),
    ("Who looks after the house when I am away?",
     "A neighbour, a caretaking service or a local company. Organise it from the first year."),
  ],
  links=[("Yearly property taxes", "/en/property-taxes-in-france-for-owners/"),
         ("Letting a holiday home", "/en/holiday-rental-rules-burgundy/"),
         ("Buying in Burgundy from the UK", "/en/buying-in-burgundy-from-the-uk/"),
         ("All guides", "/en/guides/")],
)

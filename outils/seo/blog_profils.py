#!/usr/bin/env python3
"""Blog international : vendre depuis l'étranger, et guides par pays ou par langue (langues de Shawez)."""
from blog_commun import en, L, X, LANGUES_EN

PV_NR = X("https://www.impots.gouv.fr/international-particulier/questions/je-vends-un-bien-immobilier-comment-et-quel-taux-suis-je-impose",
          "impots.gouv.fr")
GOVUK = X("https://www.gov.uk/foreign-travel-advice/france/entry-requirements", "GOV.UK")
UK_SRC = X("https://easyfrancenow.com/uk/how-long-can-uk-citizens-stay-in-france-without-a-visa",
           "summary of the GOV.UK and France-Visas rules, 2026")
FRANCE_VISAS = X("https://france-visas.gouv.fr/", "France-Visas")
N_2024 = X("https://www.notaires.fr/fr/article/les-etrangers-non-residents-acquereurs-de-logements-en-france-metropolitaine",
           "Notaires de France, 2024")
CCF = X("https://www.boursorama.com/immobilier/actualites/achat-de-residences-secondaires-en-france-les-belges-detronent-les-britanniques-647f1b549b1c03c6b8885a608c938fa0",
        "CCF study, July 2024")
CAPI = X("https://www.mysweetimmo.com/2026/07/07/immobilier-les-acheteurs-etrangers-font-leur-retour-en-france-qui-sont-ils/",
         "Capifrance barometer, July 2026")
WA = '<a class="link" href="https://wa.me/33767579228">WhatsApp, +33 7 67 57 92 28</a>'

# --------------------------------------------------------------------------------------------- 1. VENDRE DEPUIS L'ÉTRANGER
en(
  id="en-sell-abroad", path="/en/selling-your-burgundy-property-from-abroad/", theme="selling",
  title="Selling your Burgundy property from abroad",
  description='Valuation, surveys, keys, visits, offers, power of attorney, tax and transfer of the money: how I sell in Burgundy for owners who live abroad.',
  label="Selling from abroad", meta="Selling", crumb="Selling from abroad",
  card="Selling your property from abroad",
  card_desc="From the valuation to the money on your account: how a sale works when you live abroad.",
  h1="Selling your Burgundy property <em>while you live abroad.</em>",
  h1_plain="Selling your Burgundy property while you live abroad",
  lede="You live in London, Brussels, Dubai or Montreal, and your house is in Burgundy. Here is how I sell it for you, "
       "step by step.",
  image="/assets/ph-balcon.webp", image_alt="Shawez Ali on a balcony with a GRAVELIN IMMO for sale sign",
  img_w=1100, img_h=1815,
  intro="Selling from a distance works well when one person on site handles everything, and keeps you informed in "
        "writing. That is my role.",
  sections=[
    ("valuation", "1. The valuation",
     "<p>I visit the property, study the real sales around it, and send you a written valuation with my reasoning. It is "
     "complimentary and without commitment. " + L("/estimation-immobiliere-dijon/", "Request a valuation")
     + " (form in French, I answer in English).</p>"),
    ("preparation", "2. The preparation",
     "<p>The mandate is signed electronically. I order the compulsory surveys, gather the documents with the notaire, "
     "and organise the film, the photos, the virtual home staging and the drone views. You can leave me a set of "
     "keys.</p>"),
    ("visits", "3. The visits and the offers",
     "<p>I check every buyer's file and financing before a visit, I do the visits, and I send you each offer with my "
     "opinion. You decide, from where you are.</p>"),
    ("signing", "4. The signing",
     "<p>The compromis can be signed electronically. For the final deed, a power of attorney lets the notaire's staff "
     "sign for you. " + L("/en/power-of-attorney-buying-property-france/", "How a power of attorney works") + ".</p>"),
    ("tax", "5. The tax and the money",
     "<p>The notaire calculates the tax on the gain, pays it out of the price and transfers the rest to your account. "
     "Depending on your country and the price, a fiscal representative may be needed: "
     + L("/en/selling-french-property-as-a-non-resident-tax/", "the tax for non-residents") + ".</p>"),
    ("contact", "Talk to me",
     "<p>" + LANGUES_EN + " Write to me on " + WA + ", or call me.</p>"),
  ],
  faq=[
    ("Can I sell my French property without travelling?",
     "Yes. The mandate and the compromis can be signed electronically, and the deed through a power of attorney."),
    ("How much does your valuation cost?",
     "Nothing: it is complimentary and without commitment."),
    ("Who keeps the keys during the sale?",
     "You can leave me a set of keys; I do all the visits myself."),
    ("When do I receive the money?",
     "After the final deed, once the notaire has paid the taxes and any mortgage, by transfer to your account."),
  ],
  links=[("Capital gains tax for non-residents", "/en/selling-french-property-as-a-non-resident-tax/"),
         ("Inherited a property in France?", "/en/inherited-a-property-in-france/"),
         ("Request a valuation (in French)", "/estimation-immobiliere-dijon/"),
         ("All guides", "/en/guides/")],
)

# --------------------------------------------------------------------------------------------- 2. SUCCESSION
en(
  id="en-inherited", path="/en/inherited-a-property-in-france/", theme="selling",
  title="You have inherited a property in France: next steps",
  description="The notaire, the deadlines, the heirs who must agree, keeping or selling, and the taxes: what to do "
              "when you inherit a house or a flat in Burgundy from abroad.",
  label="Selling from abroad", meta="Inheritance", crumb="Inherited property",
  card="Inherited a property in France?",
  card_desc="The notaire, the deadlines, the heirs, and keeping or selling.",
  h1="You have inherited a property in France: <em>what now?</em>",
  h1_plain="You have inherited a property in France: what now?",
  lede="A parent's house in Burgundy, and you live far away. Here are the steps, in order, without pressure.",
  image="/assets/maison-pierre-volets-rouges-beaune.webp", image_alt="Stone house with red shutters in Burgundy",
  intro="Inheriting a property abroad brings grief, paperwork and decisions at the same time. In France, the notaire "
        "guides the succession. Here is what happens, and what you will have to decide.",
  sections=[
    ("notaire", "The notaire handles the succession",
     "<p>The family chooses a notaire, often the one of the deceased. The notaire identifies the heirs, lists the "
     "assets, prepares the inheritance tax return and the deed that makes the heirs owners of the property.</p>"),
    ("deadlines", "The deadlines",
     "<p>The inheritance must be declared within six months when the death occurs in mainland France, and within "
     "twelve months when it occurs abroad. Inheritance tax depends on the family link. "
     + L("/en/french-inheritance-rules-for-foreign-owners/", "Inheritance rules") + ".</p>"),
    ("heirs", "The heirs must agree",
     "<p>Until the succession is settled, the heirs own the property together. To sell, they usually sign together; "
     "if one of them blocks, French law offers solutions through the notaire and the court. Talking early avoids most "
     "conflicts.</p>"),
    ("keep-or-sell", "Keep, let or sell",
     "<p>An empty house costs money every year: taxes, insurance, heating, upkeep. Before deciding, I give the heirs a "
     "complimentary valuation of the property, so everyone discusses the same figure. "
     + L("/conseils-vendeurs/vendre-maison-succession-dijon/", "Selling an inherited house") + " (in French).</p>"),
    ("abroad", "From abroad",
     "<p>The heirs can sign by power of attorney, and I take care of the house on site: visits, surveys, emptying it if "
     "needed. " + L("/en/selling-your-burgundy-property-from-abroad/", "Selling from abroad") + ". " + LANGUES_EN + "</p>"),
  ],
  faq=[
    ("How long do heirs have to declare an inheritance in France?",
     "Six months when the death occurs in mainland France, twelve months when it occurs abroad."),
    ("Can we sell before the succession is settled?",
     "The sale can be prepared, but the notaire must first establish who owns the property."),
    ("What if one heir does not want to sell?",
     "Discuss it first; if needed, French law offers solutions through the notaire and the court."),
    ("Can you value the house for all the heirs?",
     "Yes, a complimentary written valuation, so that everyone discusses the same figure."),
  ],
  links=[("Inheritance rules", "/en/french-inheritance-rules-for-foreign-owners/"),
         ("Selling from abroad", "/en/selling-your-burgundy-property-from-abroad/"),
         ("Capital gains tax for non-residents", "/en/selling-french-property-as-a-non-resident-tax/"),
         ("All guides", "/en/guides/")],
)

# --------------------------------------------------------------------------------------------- 3. ROYAUME-UNI
en(
  id="en-uk", path="/en/buying-in-burgundy-from-the-uk/", theme="you",
  title="Buying in Burgundy from the UK after Brexit",
  description="The 90/180-day rule, long-stay visas, EES and ETIAS, money transfers, tax when you sell: what British "
              "buyers need to know before buying in Burgundy.",
  label="Wherever you come from", meta="United Kingdom", crumb="From the UK",
  card="Buying in Burgundy from the UK",
  card_desc="The 90-day rule, visas, EES and ETIAS, money, tax when you sell.",
  h1="Buying in Burgundy <em>from the United Kingdom.</em>",
  h1_plain="Buying in Burgundy from the United Kingdom",
  lede="Brexit did not change your right to buy in France. It changed how long you can stay. Here is what British "
       "buyers need to know.",
  image="/assets/shawez-ali-portrait-exterieur.webp", image_alt="Shawez Ali outdoors in Dijon", img_w=1066, img_h=1333,
  intro="British buyers have long loved France, and they remain among the main foreign buyers, even if their share "
        "has fallen since 2016 (" + N_2024 + "). Burgundy is a natural choice: Eurostar to Paris, then the TGV.",
  sections=[
    ("buying", "Buying is unchanged",
     "<p>A British buyer buys exactly like a French one: same contract, same notaire, same costs. "
     + L("/en/buying-property-in-france-from-abroad/", "Buying from abroad") + ".</p>"),
    ("stays", "How long you can stay",
     "<p>British citizens can stay up to 90 days in any 180-day period in the Schengen area without a visa, and owning "
     "a home does not extend it. For longer stays, second-home owners can apply for a temporary long-stay visitor visa "
     "for three to six months, or a long-stay visa valid as a residence permit beyond six months (" + UK_SRC + ").</p>"),
    ("borders", "EES and ETIAS",
     "<p>The European Entry/Exit System, which records your entries and exits, started on 12 October 2025. ETIAS, a "
     "travel authorisation costing 20 euros, was expected from autumn 2026 but was not yet in operation in October "
     "2026: beware of websites selling it. Check " + GOVUK + " before travelling.</p>"),
    ("money", "Money and mortgages",
     "<p>Compare currency transfers before the deposit and the balance: the pound-euro rate can move your budget. Some "
     "French banks lend to UK residents, usually with a larger deposit. "
     + L("/en/french-mortgage-for-non-residents/", "Mortgages for non-residents") + ".</p>"),
    ("selling", "When you sell",
     "<p>As a UK resident, you pay 19% income tax on the gain plus the 7.5% solidarity levy, according to the tax "
     "administration (" + PV_NR + "). As the UK is outside the EU, a fiscal representative is needed when the price "
     "exceeds 150,000 euros per seller, unless the gain is fully exempt.</p>"),
    ("travel", "Getting here",
     "<p>Eurostar to Paris, then about an hour and a half by TGV from the Gare de Lyon. By car, count five and a half to "
     "six hours from Calais. " + LANGUES_EN + "</p>"),
  ],
  faq=[
    ("Can British citizens still buy property in France?",
     "Yes, on exactly the same terms as before Brexit."),
    ("Can I stay more than 90 days if I own a French home?",
     "Not without a visa: owning a home does not extend the 90/180-day rule."),
    ("Do I need ETIAS to travel to France?",
     "It was expected from autumn 2026 but not yet in operation in October 2026. Check GOV.UK before travelling."),
    ("What tax do UK residents pay when selling?",
     "19% on the gain plus the 7.5% solidarity levy, with allowances for the years of ownership."),
  ],
  links=[("Owning a second home in Burgundy", "/en/owning-a-second-home-in-burgundy/"),
         ("Capital gains tax for non-residents", "/en/selling-french-property-as-a-non-resident-tax/"),
         ("Getting to Dijon", "/en/getting-to-dijon-trains-airports-roads/"),
         ("All guides", "/en/guides/")],
)

# --------------------------------------------------------------------------------------------- 4. ÉTATS-UNIS
en(
  id="en-us", path="/en/buying-property-in-france-as-an-american/", theme="you",
  title="Buying property in France as an American",
  description="Visas, banks and US reporting rules, mortgages, tax treaties, selling: what American buyers should know "
              "before buying a home in Burgundy.",
  label="Wherever you come from", meta="United States", crumb="As an American",
  card="Buying in France as an American",
  card_desc="Visas, banks and US reporting rules, tax treaties, selling.",
  h1="Buying property in France <em>as an American.</em>",
  h1_plain="Buying property in France as an American",
  lede="Americans are back among the main foreign buyers in France. Here is what is specific to US citizens.",
  image="/assets/shawez-ali-portrait-costume-rose.webp", image_alt="Shawez Ali, real estate agent in Dijon",
  img_w=1280, img_h=1600,
  intro="In a 2025 barometer of sales to foreign buyers, Americans made 11% of the sales, with an average budget of "
        "about 400,000 euros (" + CAPI + "). Burgundy appeals to them for the wine, the history and the food.",
  sections=[
    ("rights", "Your right to buy and to stay",
     "<p>There is no restriction on Americans buying in France. Staying longer than 90 days in any 180 requires a "
     "long-stay visa, such as the visitor visa, applied for before leaving the US: " + FRANCE_VISAS + ". Owning a home "
     "does not give a right to stay.</p>"),
    ("banks", "Banks and US reporting",
     "<p>Because of US reporting rules, some French banks are reluctant to open accounts for US persons. You do not "
     "need a French account to buy, as the money goes through the notaire, but plan one for the running costs. For a "
     "mortgage, a broker used to American clients saves time.</p>"),
    ("tax", "Tax",
     "<p>US citizens remain taxed by the United States on their worldwide income, and France taxes French property "
     "income and gains. Tax treaties between France and the US limit double taxation, including for estates. A "
     "cross-border tax adviser is worth the fee.</p>"),
    ("selling", "When you sell",
     "<p>As a resident of the US, you pay 19% income tax on the gain plus 17.2% social charges, with allowances for the "
     "years of ownership, and a fiscal representative is needed when the price exceeds 150,000 euros per seller, unless "
     "the gain is fully exempt (" + PV_NR + ").</p>"),
    ("travel", "Getting here",
     "<p>Fly to Paris, then about an hour and a half by TGV; Lyon and Geneva are other options. "
     + L("/en/getting-to-dijon-trains-airports-roads/", "Getting to Dijon") + ". " + LANGUES_EN + "</p>"),
  ],
  faq=[
    ("Can Americans buy property in France?",
     "Yes, with no restriction, on the same terms as French buyers."),
    ("Do I need a visa to live in my French home?",
     "Yes, for stays over 90 days in any 180: a long-stay visa, such as the visitor visa."),
    ("Is it hard for Americans to open a French bank account?",
     "Some banks are reluctant because of US reporting rules. You do not need one to buy, but it helps afterwards."),
    ("Will I be taxed twice?",
     "Tax treaties between France and the US limit double taxation. Ask a cross-border tax adviser."),
  ],
  links=[("Getting a French mortgage", "/en/french-mortgage-for-non-residents/"),
         ("Retiring to Burgundy", "/en/retiring-to-burgundy/"),
         ("Who buys property in France", "/en/who-buys-property-in-france-by-nationality/"),
         ("All guides", "/en/guides/")],
)

# --------------------------------------------------------------------------------------------- 5. BENELUX, ALLEMAGNE
en(
  id="en-benelux", path="/en/buying-in-burgundy-from-benelux-and-germany/", theme="you",
  title="Buying in Burgundy from Belgium, the Netherlands or Germany",
  description="Belgians, Dutch and German buyers in France: the figures, the distances, a notaire system you already "
              "know, and the points to check for tax.",
  label="Wherever you come from", meta="Benelux and Germany", crumb="Benelux and Germany",
  card="From Belgium, the Netherlands or Germany",
  card_desc="The figures, the distances, a familiar notaire system, the tax points to check.",
  h1="Buying in Burgundy from Belgium, <em>the Netherlands or Germany.</em>",
  h1_plain="Buying in Burgundy from Belgium, the Netherlands or Germany",
  lede="Belgians are the first foreign buyers in France, and Dutch and German buyers are not far behind. Burgundy is "
       "within a day's drive.",
  image="/assets/maison-piscine-vue-aerienne.webp", image_alt="Aerial view of a village house with a pool",
  intro="In 2022, Belgians made 19% of the purchases by non-resident foreigners in France, Germans 11% and the Dutch 10% "
        "(" + N_2024 + "); in 2023, Belgians were still first with 19.5% (" + CCF + "). Many look for a big house in the "
        "countryside, for holidays first and sometimes for retirement.",
  sections=[
    ("familiar", "A system you already know",
     "<p>Like in Belgium, the Netherlands and Germany, a property sale in France is signed before a notaire. The steps "
     "are close to yours: offer, preliminary contract, final deed. The main differences are the 10-day cooling-off "
     "period and the role of the agent. " + L("/en/compromis-de-vente-explained/", "The compromis explained") + ".</p>"),
    ("distance", "The distances",
     "<p>Luxembourg is around three and a half hours away by motorway, Brussels around five to six hours, and Germany "
     "is reached through Alsace or Lorraine. A weekend in Burgundy is easy, which suits a second home.</p>"),
    ("tax", "Tax: the points to check",
     "<p>Under the tax treaties, rental income and gains from a French property are generally taxed in France, and your "
     "country takes them into account under its own rules. As you live in the EU, no fiscal representative is needed "
     "when you sell, and if you are covered by your country's social security, the reduced 7.5% levy applies instead "
     "of 17.2%. " + L("/en/selling-french-property-as-a-non-resident-tax/", "Tax when you sell") + ".</p>"),
    ("houses", "The houses you like",
     "<p>The notaries observed that Belgian, Dutch and British buyers mainly buy houses, often large ones, half of them "
     "in the countryside. In Burgundy, that means village houses with land, farmhouses in the Hautes-Côtes or the "
     "Auxois, and maisons de maître. " + L("/en/hautes-cotes-burgundy-villages/", "The Hautes-Côtes") + ".</p>"),
    ("language", "In English, or in French",
     "<p>I work in English and in French every day, so French-speaking Belgians and everyone comfortable in English "
     "are at home with me. " + LANGUES_EN + "</p>"),
  ],
  faq=[
    ("Who are the main foreign buyers in France?",
     "Belgians, with 19% of the purchases by non-resident foreigners in 2022, ahead of the British, Germans and Dutch."),
    ("Do I need a fiscal representative when I sell?",
     "Not if you live in the European Union."),
    ("How far is Burgundy from Brussels?",
     "Around five to six hours by road, and Luxembourg around three and a half hours."),
    ("Is the French notaire like ours?",
     "Yes, the principle is the same: the sale is signed before a notaire, a public officer."),
  ],
  links=[("Who buys property in France", "/en/who-buys-property-in-france-by-nationality/"),
         ("Acheter en Bourgogne depuis la Belgique (français)", "/conseils-vendeurs/acheter-en-bourgogne-depuis-la-belgique/"),
         ("The Hautes-Côtes", "/en/hautes-cotes-burgundy-villages/"),
         ("All guides", "/en/guides/")],
)

# --------------------------------------------------------------------------------------------- 6. HINDI, OURDOU, PENDJABI
en(
  id="en-south-asia", path="/en/agent-speaking-hindi-urdu-punjabi-france/", theme="you",
  title="An agent in France who speaks Hindi, Urdu and Punjabi",
  description="Buying a home, a restaurant or an investment in Dijon and Burgundy, explained in Hindi, Urdu or Punjabi "
              "by a local agent: the steps, the documents, the visas.",
  label="Wherever you come from", meta="Hindi · Urdu · Punjabi", crumb="Hindi, Urdu, Punjabi",
  card="An agent who speaks Hindi, Urdu and Punjabi",
  card_desc="Buying in France explained in your language: the steps, the documents, the visas.",
  h1="Buying in France, <em>explained in Hindi, Urdu or Punjabi.</em>",
  h1_plain="Buying in France, explained in Hindi, Urdu or Punjabi",
  lede="A French contract is easier to sign when someone explains it in the language you think in. I speak Hindi, Urdu "
       "and Punjabi fluently.",
  image="/assets/shawez-ali-portrait-sourire-720.webp", image_alt="Shawez Ali, real estate agent in Dijon",
  intro="Families from India and Pakistan, and from the diaspora in the UK, the Gulf, Canada or the US, contact me for "
        "a home, an investment flat or a business in France. The rules are the same for everyone; the comfort of "
        "understanding every line is not.",
  sections=[
    ("hello", "Talk to me in your language",
     "<p lang=\"hi\">आप मुझसे हिंदी में बात कर सकते हैं।</p>"
     "<p lang=\"ur\" dir=\"rtl\">آپ مجھ سے اردو میں بات کر سکتے ہیں۔</p>"
     "<p lang=\"pa\">ਤੁਸੀਂ ਮੇਰੇ ਨਾਲ ਪੰਜਾਬੀ ਵਿੱਚ ਗੱਲ ਕਰ ਸਕਦੇ ਹੋ।</p>"
     "<p>Write to me on " + WA + ", by voice note or text, in the language you prefer.</p>"),
    ("rules", "The rules are the same for everyone",
     "<p>There is no restriction on foreigners buying property in France: same contract, same notaire, same costs. "
     "Buying a home does not give a right to live in France, which depends on your visa. "
     + L("/en/buying-property-in-france-from-abroad/", "Buying from abroad") + ".</p>"),
    ("documents", "The documents for your funds",
     "<p>French anti-money-laundering rules require proof of the origin of the money: bank statements, salary slips, "
     "business accounts, the deed of a property sold, or the proof of a family gift. The funds must come by bank "
     "transfer from an account in your name. Prepare them early, it avoids delays. "
     + L("/en/paying-for-french-property-from-abroad/", "Paying from abroad") + ".</p>"),
    ("business", "Restaurants and businesses",
     "<p>Many families want to buy a restaurant, a shop or a hotel. I sell businesses as well as homes, and I explain the "
     "commercial lease, the accounts and the licences in your language. "
     + L("/en/buying-a-restaurant-or-hotel-in-france/", "Buying a restaurant or hotel") + ".</p>"),
    ("family", "Buying as a family",
     "<p>Parents and children, brothers, partners: buying together needs clear shares, sometimes a company. "
     + L("/en/buying-through-an-sci-in-france/", "Buying through an SCI") + ". I make sure everyone understands what "
     "they sign. " + LANGUES_EN + "</p>"),
  ],
  faq=[
    ("Do you really speak Hindi, Urdu and Punjabi?",
     "Yes, fluently, as well as English and French. You can call me or send voice notes in your language."),
    ("Can someone from India or Pakistan buy property in France?",
     "Yes. There is no restriction on buying; living in France depends on your visa."),
    ("Which documents prove the origin of my funds?",
     "Bank statements, salary slips, business accounts, a property sale deed or the proof of a family gift."),
    ("Can you help me buy a restaurant?",
     "Yes. I sell businesses as well as homes, in Dijon and Burgundy."),
  ],
  links=[("Buying a restaurant or hotel", "/en/buying-a-restaurant-or-hotel-in-france/"),
         ("Paying from abroad", "/en/paying-for-french-property-from-abroad/"),
         ("An agent who speaks Arabic and Persian", "/en/agent-speaking-arabic-persian-france/"),
         ("All guides", "/en/guides/")],
)

# --------------------------------------------------------------------------------------------- 7. ARABE, PERSAN
en(
  id="en-arabic-persian", path="/en/agent-speaking-arabic-persian-france/", theme="you",
  title="An agent in France who speaks Arabic and Persian",
  description="Buying a home, a château or a business in Dijon and Burgundy with an agent who speaks Arabic and "
              "Persian: the steps, the documents, buying with your own funds.",
  label="Wherever you come from", meta="Arabic · Persian", crumb="Arabic and Persian",
  card="An agent who speaks Arabic and Persian",
  card_desc="Buying in Burgundy with an agent who speaks your language: steps, documents, funds.",
  h1="Buying in Burgundy, <em>in Arabic or in Persian.</em>",
  h1_plain="Buying in Burgundy, in Arabic or in Persian",
  lede="I speak Persian very well and good Arabic, along with English and French. Here is how I work with buyers from "
       "the Gulf, the Middle East and Iran.",
  image="/assets/shawez-ali-portrait-costume-bleu.webp", image_alt="Shawez Ali, real estate agent in Dijon",
  img_w=560, img_h=700,
  intro="Buyers from the Gulf and the Arab world made 5% of the sales to foreign buyers in a 2025 barometer (" + CAPI
        + "). Many look for a prestige home, a château or an investment, and value being able to talk directly with "
        "their agent.",
  sections=[
    ("hello", "Talk to me in your language",
     "<p lang=\"ar\" dir=\"rtl\">يمكنكم التحدث معي باللغة العربية.</p>"
     "<p lang=\"fa\" dir=\"rtl\">می‌توانید با من به فارسی صحبت کنید.</p>"
     "<p>Write to me on " + WA + ", by voice note or text.</p>"),
    ("process", "The process, in short",
     "<p>Offer, preliminary contract, 10-day cooling-off period, then the final deed before a notaire, usually two to "
     "three months later. Most steps can be done from abroad. "
     + L("/en/how-long-does-it-take-to-buy-a-house-in-france/", "How long it takes to buy") + ".</p>"),
    ("funds", "Buying with your own funds",
     "<p>Some buyers prefer to pay without a mortgage, which makes the purchase simpler and faster. The notaire still "
     "checks the origin of the funds: prepare bank statements and the documents showing where the money comes from. "
     "The transfer goes to the notaire's account, never to the seller.</p>"),
    ("prestige", "Prestige properties and châteaux",
     "<p>Burgundy offers châteaux, manor houses and townhouses in Beaune and Dijon. For these properties, discretion "
     "matters: I present them to serious buyers first, with their film and their file. "
     + L("/en/buying-a-chateau-in-burgundy/", "Buying a château in Burgundy") + ".</p>"),
    ("stay", "Staying in France",
     "<p>Owning a home does not give a right to stay. For long stays, a visa is needed, applied for at the French "
     "consulate. " + LANGUES_EN + "</p>"),
  ],
  faq=[
    ("Do you speak Arabic and Persian?",
     "Yes: Persian very well and good Arabic, along with English and French."),
    ("Can I buy a property in France without a mortgage?",
     "Yes. The notaire still checks the origin of the funds, which must arrive by bank transfer."),
    ("Can you show me châteaux discreetly?",
     "Yes. I present prestige properties to serious buyers first, with their film and file."),
    ("Does buying a home give me a French visa?",
     "No. Your right to stay depends on your visa, not on owning a home."),
  ],
  links=[("Buying a château in Burgundy", "/en/buying-a-chateau-in-burgundy/"),
         ("Paying from abroad", "/en/paying-for-french-property-from-abroad/"),
         ("An agent who speaks Hindi, Urdu, Punjabi", "/en/agent-speaking-hindi-urdu-punjabi-france/"),
         ("All guides", "/en/guides/")],
)

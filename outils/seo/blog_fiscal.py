#!/usr/bin/env python3
"""Blog international : argent, impôts et droit (règles générales, sources officielles citées ; le conseiller fiscal
ou le notaire les confirme pour chaque cas)."""
from blog_commun import en, L, X, LANGUES_EN

PV_NR = X("https://www.impots.gouv.fr/international-particulier/questions/je-vends-un-bien-immobilier-comment-et-quel-taux-suis-je-impose",
          "impots.gouv.fr, page updated on 27 January 2026")
NR_FICHE = X("https://www.impots.gouv.fr/sites/default/files/media/1_metier/5_international/actualite/fiches-relais/fiche_les-particularites-de-la-fiscalite-des-nr_vd_03-2026.pdf",
             "impots.gouv.fr fact sheet for non-residents, March 2026")
NR_PORTAIL = X("https://www.impots.gouv.fr/international-particulier", "the non-residents' section of impots.gouv.fr")
CSG = X("https://www.lafinancepourtous.com/2026/01/20/csg-quels-sont-les-placements-concernes-par-la-hausse-de-la-contribution-sociale-generalisee/",
        "La finance pour tous, January 2026")
IFI = X("https://ateispatrimoine.com/?p=13124", "summary of the 2026 finance law")
LE_MEUR = X("https://www.actu-juridique.fr/fiscalite/fiscal-finances/locations-touristiques-ce-que-change-la-loi-le-meur/",
            "Actu-Juridique")

# --------------------------------------------------------------------------------------------- 1. IMPÔTS LOCAUX
en(
  id="en-local-taxes", path="/en/property-taxes-in-france-for-owners/", theme="money",
  title="Yearly property taxes in France for foreign owners",
  description="Taxe foncière, taxe d'habitation on second homes, the occupancy declaration: the yearly taxes of a "
              "property owner in France, and how to pay them from abroad.",
  label="Money, tax and the law", meta="Tax", crumb="Yearly property taxes",
  card="Yearly property taxes in France",
  card_desc="Taxe foncière, the tax on second homes, and the declaration every owner must make.",
  h1="The yearly taxes <em>of a property owner in France.</em>",
  h1_plain="The yearly taxes of a property owner in France",
  lede="Once you own a home in France, two local taxes may come every autumn. Here is which ones, who pays them, and "
       "how.",
  image="/assets/maison-pierre-terrasse-jardin.webp", image_alt="Stone house with a garden terrace in Burgundy",
  intro="Local taxes in France are set by the communes and their groupings, so the amounts vary from one village to "
        "the next. Before buying, ask the seller for the last tax notices: it is the only reliable figure.",
  sections=[
    ("fonciere", "The taxe foncière",
     "<p>Every owner pays the taxe foncière, the property tax, for each property owned on 1 January of the year. The "
     "notice arrives in late summer and is due in the autumn. It often includes the charge for household waste "
     "collection. When a property is sold during the year, the notaire usually shares the tax between seller and buyer "
     "pro rata.</p>"),
    ("habitation", "The taxe d'habitation on second homes",
     "<p>The taxe d'habitation has been abolished for main homes, but it remains for second homes, paid by whoever "
     "occupies the home on 1 January. In some communes where housing is scarce, the town can add a surcharge, from 5% to "
     "60%. Ask the town hall or check the last notice.</p>"),
    ("declaration", "The occupancy declaration",
     "<p>Every owner must tell the tax administration how each home is used, as a main home, a second home, a let home "
     "or a vacant one, in the online space « Gérer mes biens immobiliers » on impots.gouv.fr, and update it when the "
     "situation changes. Without it, the right tax cannot be calculated.</p>"),
    ("abroad", "Paying from abroad",
     "<p>You create your tax account on impots.gouv.fr, receive the notices online, and can pay by direct debit from a "
     "euro account. Non-residents have their own section: " + NR_PORTAIL + ".</p>"),
    ("budget", "The budget, before buying",
     "<p>For a big house or a château, the property tax is a real line in the yearly budget, with insurance, heating "
     "and maintenance. I ask the sellers for their notices, so my buyers know the figures before the offer. "
     + LANGUES_EN + "</p>"),
  ],
  faq=[
    ("Do foreign owners pay property tax in France?",
     "Yes. Every owner pays the taxe foncière, whatever their nationality or country of residence."),
    ("Is there still a taxe d'habitation in France?",
     "Not for main homes. It remains for second homes, with a possible surcharge in some communes."),
    ("When is the property tax paid?",
     "The notice arrives in late summer and the tax is due in the autumn."),
    ("How much is the property tax on a given house?",
     "It depends on the commune and the property. Ask the seller for the last notice before making an offer."),
  ],
  links=[("French property buying costs", "/en/french-property-buying-costs/"),
         ("Owning a second home in Burgundy", "/en/owning-a-second-home-in-burgundy/"),
         ("Renting out from abroad: tax", "/en/renting-out-french-property-as-a-non-resident/"),
         ("All guides", "/en/guides/")],
)

# --------------------------------------------------------------------------------------------- 2. REVENUS LOCATIFS
en(
  id="en-rental-tax", path="/en/renting-out-french-property-as-a-non-resident/", theme="money",
  title="Renting out your French property from abroad: tax",
  description="How rental income from a French property is taxed when you live abroad: the declaration, the minimum "
              "rates, social charges, furnished or unfurnished lets.",
  label="Money, tax and the law", meta="Tax", crumb="Rental income tax",
  card="Rental income tax for non-residents",
  card_desc="The declaration, the minimum rates, social charges, furnished or unfurnished.",
  h1="Renting out your French property <em>when you live abroad.</em>",
  h1_plain="Renting out your French property when you live abroad",
  lede="Rental income from a French property is taxed in France, wherever you live. Here are the general rules, to "
       "check with a tax adviser for your case.",
  image="/assets/appartement-dijon-couloir-parquet.webp", image_alt="Apartment corridor with a parquet floor in Dijon",
  intro="Tax treaties generally let France tax the income from property located in France. Your country of residence "
        "then takes it into account under its own rules and the treaty, usually to avoid double taxation.",
  sections=[
    ("declare", "Declaring the income",
     "<p>You declare your French rental income every year online on impots.gouv.fr, as a non-resident. Unfurnished "
     "lets are taxed as property income (revenus fonciers); furnished lets are taxed as business profits for "
     "non-professional landlords (the LMNP status).</p>"),
    ("rates", "The minimum rates",
     "<p>For non-residents, French-source income is taxed at a minimum rate of 20% up to a threshold, set at 29,579 "
     "euros for the income received in 2025, and 30% above it. You can ask for the average rate instead, calculated on "
     "your worldwide income, when it is lower; it is then applied only to the French income (" + NR_FICHE + ").</p>"),
    ("social", "Social charges",
     "<p>Rental income also bears social charges: 17.2% for unfurnished lets. The 2026 social security law raised the "
     "rate on furnished rental income to 18.6% (" + CSG + "). If you are covered by the social security of a country of "
     "the European Union, the European Economic Area or Switzerland, a reduced 7.5% solidarity levy applies instead: "
     "check your own case.</p>"),
    ("furnished", "Furnished or unfurnished, long or short term",
     "<p>A long-term furnished let often gives a better allowance on the income. Short-term holiday lets follow "
     "stricter rules since the Le Meur law of 2024: for income from 2025, the simplified regime gives a 30% allowance "
     "up to 15,000 euros for unclassified holiday lets, and 50% up to 77,700 euros for classified ones (" + LE_MEUR
     + "). See " + L("/en/holiday-rental-rules-burgundy/", "letting a holiday home in Burgundy") + ".</p>"),
    ("advice", "Get the right advice",
     "<p>These rules change often. A French accountant who works with non-residents will choose the most suitable regime with "
     "you. My role is to find the property and the tenant: I find tenants, prepare the lease and do the check-in, then "
     "you or a property manager take over. " + LANGUES_EN + "</p>"),
  ],
  faq=[
    ("Is rental income from French property taxed in France?",
     "Yes, generally, even if you live abroad. Your country of residence then applies its own rules and the tax "
     "treaty."),
    ("What is the minimum tax rate for non-residents?",
     "20% up to 29,579 euros of income received in 2025, and 30% above, unless the average rate on your worldwide "
     "income is lower."),
    ("Do non-residents pay French social charges on rental income?",
     "Yes: 17.2% for unfurnished lets, 18.6% for furnished lets since 2026, or a 7.5% levy for people covered by an EU, "
     "EEA or Swiss social security scheme."),
    ("Do you manage rental properties?",
     "No. I find the tenant, prepare the lease and do the check-in; the management stays with you."),
  ],
  links=[("Investing in rental property in Dijon", "/en/rental-investment-dijon/"),
         ("Letting a holiday home", "/en/holiday-rental-rules-burgundy/"),
         ("Student flats in Dijon", "/en/investing-in-student-flats-in-dijon/"),
         ("All guides", "/en/guides/")],
)

# --------------------------------------------------------------------------------------------- 3. PLUS-VALUE NON-RÉSIDENT
en(
  id="en-cgt", path="/en/selling-french-property-as-a-non-resident-tax/", theme="money",
  title="Selling a French property as a non-resident: the tax",
  description="Capital gains tax for non-residents in France: the 19% rate, social charges, the holding-period "
              "allowances, the fiscal representative, and who pays at the sale.",
  label="Money, tax and the law", meta="Tax", crumb="Capital gains tax",
  card="Capital gains tax for non-residents",
  card_desc="The rate, the allowances for holding time, the fiscal representative, and who pays.",
  h1="Selling a French property <em>as a non-resident: the tax.</em>",
  h1_plain="Selling a French property as a non-resident: the tax",
  lede="When you sell a French property from abroad, the tax on the gain is paid at the sale, through the notaire. "
       "Here are the official rules.",
  image="/assets/shawez-ali-conseil-vendeur-dijon.webp", image_alt="Shawez Ali advising a seller in Dijon",
  img_w=512, img_h=640,
  intro="The gain is the difference between the sale price and the purchase price, adjusted for costs and certain "
        "works. It is taxed in France, with allowances that grow with the years of ownership. The rules below come "
        "from the tax administration (" + PV_NR + ").",
  sections=[
    ("rate", "The rate",
     "<p>Non-residents pay income tax of 19% on the gain, plus social charges. The social charges are 17.2% for people "
     "living outside the European Union, the European Economic Area and Switzerland. People covered by the social "
     "security of an EU or EEA country or of Switzerland do not pay the CSG and CRDS, only the 7.5% solidarity levy; "
     "the administration states that the levy still applies to residents of the United Kingdom. A surtax applies to "
     "gains above 50,000 euros.</p>"),
    ("allowances", "The allowances for holding time",
     "<p>For the income tax, the gain is reduced by 6% a year from the sixth to the twenty-first year of ownership, and "
     "4% in the twenty-second: after 22 years, it is exempt. For the social charges, the allowance is slower, and the "
     "exemption is reached after 30 years.</p>"),
    ("exemptions", "Exemptions",
     "<p>Two exemptions can concern people who once lived in France: the sale of their former main home, and an "
     "exemption up to 150,000 euros of gain. Both have strict conditions, which the notaire checks.</p>"),
    ("representative", "The fiscal representative",
     "<p>A non-resident seller must usually appoint an accredited fiscal representative in France, who answers for the "
     "tax. No representative is needed if you live in the European Union, Iceland or Norway, if the price is 150,000 "
     "euros or less per seller, or if the gain is fully exempt. Otherwise, the notaire will point you to accredited "
     "companies.</p>"),
    ("payment", "Who pays, and when",
     "<p>The notaire calculates the tax, files the return and pays it out of the sale price at the signing. You receive "
     "the net amount. If you have other French income, the gain is also mentioned on your income tax return.</p>"),
    ("how-i-help", "Selling with me from abroad",
     "<p>I handle the sale on site, from the valuation to the deed, and I put you in touch with the notaire early so the "
     "tax is known before you accept an offer. " + L("/en/selling-your-burgundy-property-from-abroad/",
     "Selling your Burgundy property from abroad") + ". " + LANGUES_EN + "</p>"),
  ],
  faq=[
    ("What is the capital gains tax rate for non-residents in France?",
     "19% income tax plus social charges: 17.2%, or 7.5% for people covered by an EU, EEA or Swiss social security "
     "scheme. A surtax applies above 50,000 euros of gain."),
    ("When is a gain exempt?",
     "After 22 years of ownership for the income tax and 30 years for the social charges, or under the specific "
     "exemptions for former residents."),
    ("Do I need a fiscal representative?",
     "Not if you live in the EU, Iceland or Norway, if the price is 150,000 euros or less per seller, or if the gain is "
     "fully exempt. Otherwise, yes."),
    ("Who pays the tax?",
     "The notaire pays it out of the sale price at the signing."),
  ],
  links=[("Selling from abroad", "/en/selling-your-burgundy-property-from-abroad/"),
         ("Inherited a French property?", "/en/inherited-a-property-in-france/"),
         ("Request a valuation (in French)", "/estimation-immobiliere-dijon/"),
         ("All guides", "/en/guides/")],
)

# --------------------------------------------------------------------------------------------- 4. IFI
en(
  id="en-ifi", path="/en/french-property-wealth-tax-ifi-for-non-residents/", theme="money",
  title="French property wealth tax (IFI) for non-residents",
  description="The IFI in 2026: the 1.3 million euro threshold, the rates, what counts for a non-resident, and what "
              "the 2026 finance law changed, or did not.",
  label="Money, tax and the law", meta="Tax", crumb="Wealth tax (IFI)",
  card="The French property wealth tax (IFI)",
  card_desc="The threshold, the rates, and what counts when you live abroad.",
  h1="The French property wealth tax, <em>for non-residents.</em>",
  h1_plain="The French property wealth tax, for non-residents",
  lede="Buying a château or several homes in France? Above a certain value, a yearly wealth tax on property applies. "
       "Here is how it works in 2026.",
  image="/assets/chateau-salon.webp", image_alt="Salon of a château in Burgundy",
  intro="The impôt sur la fortune immobilière, or IFI, replaced the old wealth tax in 2018. It only concerns property. "
        "For people living abroad, it only counts their property located in France.",
  sections=[
    ("threshold", "The threshold and the rates",
     "<p>The IFI applies when the net taxable value of your property assets exceeds 1.3 million euros on 1 January. "
     "The rates are progressive, from 0.5% to 1.5%, with a reduction for values just above the threshold.</p>"),
    ("non-residents", "What counts for a non-resident",
     "<p>A non-resident is taxed only on property located in France, held directly or through companies, minus the "
     "debts that can be deducted under the rules. Tax treaties may change the picture for some countries: a French tax "
     "adviser will check yours.</p>"),
    ("2026", "What the 2026 finance law changed",
     "<p>During the debates on the 2026 budget, the National Assembly voted to turn the IFI into a tax on « unproductive "
     "wealth », and the Senate proposed another version. Neither was kept: the final law, adopted in February 2026, "
     "left the IFI unchanged, with the same threshold and rates (" + IFI + ").</p>"),
    ("declaration", "Declaring",
     "<p>The IFI is declared once a year, with the income tax return, on a specific form. A wealth tax adviser or a "
     "notaire can help value the properties.</p>"),
    ("how-i-help", "Before buying a large property",
     "<p>For a château or an estate, the IFI is one more yearly cost to add to the property tax, the insurance and the "
     "upkeep. I help my buyers gather these figures before the offer, so the decision is taken with the whole budget. "
     + L("/en/buying-a-chateau-in-burgundy/", "Buying a château in Burgundy") + ". " + LANGUES_EN + "</p>"),
  ],
  faq=[
    ("What is the IFI threshold in 2026?",
     "1.3 million euros of net taxable property assets on 1 January, unchanged by the 2026 finance law."),
    ("Do non-residents pay the IFI?",
     "Yes, on their property located in France, if its net value exceeds the threshold, subject to tax treaties."),
    ("What are the IFI rates?",
     "Progressive, from 0.5% to 1.5%."),
    ("Did the 2026 budget replace the IFI?",
     "No. The proposals debated in late 2025 were not kept in the final law."),
  ],
  links=[("Buying a château in Burgundy", "/en/buying-a-chateau-in-burgundy/"),
         ("Buying through an SCI", "/en/buying-through-an-sci-in-france/"),
         ("Yearly property taxes", "/en/property-taxes-in-france-for-owners/"),
         ("All guides", "/en/guides/")],
)

# --------------------------------------------------------------------------------------------- 5. SUCCESSION
en(
  id="en-inheritance", path="/en/french-inheritance-rules-for-foreign-owners/", theme="money",
  title="French inheritance rules for foreign property owners",
  description="Which law applies to your French property when you die, children's protected shares, French "
              "inheritance tax, and the tools to plan ahead, explained simply.",
  label="Money, tax and the law", meta="Law", crumb="Inheritance rules",
  card="Inheritance and your French property",
  card_desc="Which law applies, children's shares, French inheritance tax, and how to plan.",
  h1="Inheritance and your French property: <em>plan ahead.</em>",
  h1_plain="Inheritance and your French property: plan ahead",
  lede="Few buyers think about it when they fall for a house. A notaire's advice at the right time avoids a lot of "
       "trouble for your family.",
  image="/assets/ph-cour.webp", image_alt="Shawez Ali in the courtyard of a stone building", img_w=1100, img_h=1550,
  intro="When the owner of a French property dies, two questions arise: which law decides who inherits, and which "
        "country taxes the inheritance. The answers depend on where you live, your nationality and your will. Here are "
        "the principles; your notaire applies them to your case.",
  sections=[
    ("law", "Which law applies",
     "<p>Since 17 August 2015, the European Succession Regulation decides the law applicable to a succession in most EU "
     "countries, including France: in principle, the law of the country where the deceased last lived. A person can "
     "choose instead, in a will, the law of their nationality.</p>"),
    ("children", "Children's protected shares",
     "<p>French law reserves a share of the estate to children: the réserve héréditaire. If a foreign law applies "
     "that does not protect children in the same way, a French rule adopted in 2021 can, in some cases, allow children "
     "to claim their share on the assets located in France. This is precisely where a notaire's advice matters.</p>"),
    ("tax", "French inheritance tax",
     "<p>Property located in France is generally subject to French inheritance tax, whoever the heirs are, subject to "
     "the tax treaties between France and some countries. The rates depend on the family link: lower between parents "
     "and children, much higher between unrelated people.</p>"),
    ("deadlines", "Deadlines",
     "<p>The inheritance must be declared in France within six months when the death occurs in mainland France, and "
     "within twelve months when it occurs abroad. The notaire prepares the documents that make the heirs owners.</p>"),
    ("tools", "Tools to plan ahead",
     "<ul>"
     "<li>A will, and possibly the choice of the law of your nationality.</li>"
     "<li>For a couple, a tontine clause in the deed, or the choice of the matrimonial property regime.</li>"
     "<li>A property company (SCI), to organise the shares: "
     + L("/en/buying-through-an-sci-in-france/", "buying through an SCI") + ".</li>"
     "</ul>"
     "<p>Ask the notaire about these before you sign, not after. I introduce my buyers to notaires used to international "
     "files. " + LANGUES_EN + "</p>"),
  ],
  faq=[
    ("Which law applies to my French property when I die?",
     "In principle, the law of the country where you last lived, unless you chose the law of your nationality in a "
     "will, under the European Succession Regulation."),
    ("Can I leave my French house to anyone I want?",
     "French law protects children's shares, and in some cases this protection applies to assets in France even under "
     "a foreign law. Ask a notaire."),
    ("Is French inheritance tax due if my heirs live abroad?",
     "Property located in France is generally taxed in France, subject to the tax treaties."),
    ("How long do heirs have to declare the inheritance?",
     "Six months when the death occurs in mainland France, twelve months when it occurs abroad."),
  ],
  links=[("Buying through an SCI", "/en/buying-through-an-sci-in-france/"),
         ("Buying as a couple", "/en/buying-property-in-france-as-a-couple/"),
         ("Inherited a French property?", "/en/inherited-a-property-in-france/"),
         ("All guides", "/en/guides/")],
)

# --------------------------------------------------------------------------------------------- 6. SCI
en(
  id="en-sci", path="/en/buying-through-an-sci-in-france/", theme="money",
  title="Buying through an SCI, a French property company",
  description="What an SCI is, why families and foreign buyers use it, its costs and limits, and the questions to ask "
              "a notaire before buying through a company.",
  label="Money, tax and the law", meta="Law", crumb="Buying through an SCI",
  card="Buying through an SCI",
  card_desc="What a French property company is, why it is used, its costs and its limits.",
  h1="Buying through an SCI, <em>a French property company.</em>",
  h1_plain="Buying through an SCI, a French property company",
  lede="Some buyers hold their French home through a small company. It can make sense for a family; it is not a "
       "magic solution.",
  image="/assets/st-maison.webp", image_alt="Aerial view of a house among autumn trees", img_w=720, img_h=1280,
  intro="A société civile immobilière, or SCI, is a company whose purpose is to own and manage property. Its partners "
        "hold shares, and the company owns the house. It is common in France for families and for people who buy "
        "together.",
  sections=[
    ("why", "Why buyers use it",
     "<ul>"
     "<li>To buy with several people, children or friends, with clear rules on decisions.</li>"
     "<li>To pass the property on gradually, by giving shares over time.</li>"
     "<li>To organise who manages the property, through the articles of the company.</li>"
     "</ul>"),
    ("costs", "Costs and obligations",
     "<p>An SCI needs articles drafted by a professional, a registration, accounts, a yearly meeting of the partners "
     "and tax returns. It is an annual cost and some paperwork, to weigh against the benefits.</p>"),
    ("tax", "Tax: the points to check",
     "<p>By default, the SCI's income is taxed in the hands of its partners. It can opt for corporate tax, which "
     "changes everything, especially when the property is sold. Furnished letting through an SCI raises specific tax "
     "issues. For a non-resident, the shares of an SCI owning French property are treated as French property for "
     "several taxes.</p>"),
    ("inheritance", "And inheritance",
     "<p>An SCI does not escape the rules of inheritance, but it can help organise them. Whether it fits your family, "
     "your country of residence and your plans is a question for a notaire, before the compromis is signed, because "
     "the buyer named in the compromis must be the company or must be allowed to substitute it.</p>"),
    ("how-i-help", "How I help",
     "<p>If you consider an SCI, tell me before the offer: I make sure the compromis allows the purchase through a "
     "company, and I put you in touch with a notaire who handles international families. " + LANGUES_EN + "</p>"),
  ],
  faq=[
    ("Can a foreigner create an SCI in France?",
     "Yes. Partners can live abroad and have any nationality."),
    ("Is an SCI useful for a second home?",
     "It can be, for a family that buys together or wants to pass the property on gradually. It has a yearly cost."),
    ("Can I buy through an SCI after signing the compromis?",
     "Only if the compromis allows the substitution. Say it before signing."),
    ("Does an SCI avoid French inheritance tax?",
     "No, but it can help organise the transmission. Ask a notaire."),
  ],
  links=[("Inheritance rules", "/en/french-inheritance-rules-for-foreign-owners/"),
         ("Buying as a couple", "/en/buying-property-in-france-as-a-couple/"),
         ("The French wealth tax (IFI)", "/en/french-property-wealth-tax-ifi-for-non-residents/"),
         ("All guides", "/en/guides/")],
)

# --------------------------------------------------------------------------------------------- 7. COUPLE
en(
  id="en-couple", path="/en/buying-property-in-france-as-a-couple/", theme="money",
  title="Buying property in France as a couple",
  description="Married, in a civil partnership or not: how a couple can hold a French property, the shares in the "
              "deed, the tontine clause, and what the notaire will ask you.",
  label="Money, tax and the law", meta="Law", crumb="Buying as a couple",
  card="Buying as a couple in France",
  card_desc="Shares in the deed, marriage regimes, the tontine clause: what the notaire asks.",
  h1="Buying in France <em>as a couple.</em>",
  h1_plain="Buying in France as a couple",
  lede="Two names on the deed, but in which shares, and what happens if one of you dies? Here is what to settle with "
       "the notaire.",
  image="/assets/ph-rose.webp", image_alt="Shawez Ali, real estate agent in Dijon", img_w=1100, img_h=1619,
  intro="How a couple holds a property depends on their situation: married, in a civil partnership, or neither. For "
        "international couples, it also depends on the country where they married and the law of their marriage.",
  sections=[
    ("unmarried", "Not married",
     "<p>An unmarried couple buys in joint ownership (indivision), with the shares written in the deed, usually in "
     "proportion to what each one pays. A tontine clause can provide that the survivor is considered the sole owner "
     "from the start; it has tax consequences to check with the notaire.</p>"),
    ("married", "Married",
     "<p>For a married couple, the matrimonial property regime decides who owns what. For marriages since 29 January "
     "2019, a European regulation sets the law that applies; for earlier marriages, other rules apply. The notaire "
     "will ask for your marriage certificate, and your marriage contract if you have one, and will state your regime "
     "in the deed.</p>"),
    ("pacs", "In a civil partnership",
     "<p>Partners in a French PACS own separately by default and usually buy in joint ownership, with their shares in "
     "the deed. A partnership registered abroad is examined by the notaire.</p>"),
    ("protect", "Protecting the survivor",
     "<p>Depending on your situation, a will, the choice of a law, a tontine clause or a company can protect the "
     "surviving partner. " + L("/en/french-inheritance-rules-for-foreign-owners/", "Inheritance rules")
     + " explains the principles. These choices are made before signing.</p>"),
    ("how-i-help", "How I help",
     "<p>When a couple buys with me, I tell the notaire early about your situation, so that the right questions are "
     "asked before the compromis. Many of my international buyers are couples where one partner does not speak French: "
     "I explain everything to both. " + LANGUES_EN + "</p>"),
  ],
  faq=[
    ("Can we buy in different shares, such as 60/40?",
     "Yes. The shares are written in the deed, usually in proportion to each person's contribution."),
    ("What is a tontine clause?",
     "A clause by which the survivor is considered the sole owner from the start. It has tax consequences to check with "
     "the notaire."),
    ("Is a foreign marriage recognised by the notaire?",
     "Yes. The notaire determines the law of your marriage and states your regime in the deed."),
    ("Should we decide before the compromis?",
     "Yes. The way you buy is set in the compromis and the deed."),
  ],
  links=[("Inheritance rules", "/en/french-inheritance-rules-for-foreign-owners/"),
         ("Buying through an SCI", "/en/buying-through-an-sci-in-france/"),
         ("The notaire explained", "/en/the-notaire-in-france-explained/"),
         ("All guides", "/en/guides/")],
)

#!/usr/bin/env python3
"""Blog international : acheter en France, étape par étape (règles générales, le notaire les confirme)."""
from blog_commun import en, L, X, LANGUES_EN

RETRACT = X("https://www.lafinancepourtous.com/2015/09/02/immobilier-10-jours-pour-renoncer-a-un-achat/",
            "La finance pour tous")
PROCU = X("https://www.lemag-juridique.com/fiches-pratiques/articles/procuration-matiere-vente-immobiliere-cas-lacheteur-residant-letranger-10789.htm",
          "Le Mag Juridique")
ADEME = X("https://observatoire-dpe-audit.ademe.fr/", "ADEME observatory")
GEORISQUES = X("https://www.georisques.gouv.fr/", "Géorisques")
HELLIO = X("https://particulier.hellio.com/blog/actualites/reforme-dpe-coefficient-conversion", "Hellio, 2026")
SIMU = L("/simulateur-pret-immobilier-dijon/", "mortgage simulator")

# --------------------------------------------------------------------------------------------- 1. OFFRE
en(
  id="en-offer", path="/en/making-an-offer-on-a-french-property/", theme="buying",
  title="How to make an offer on a French property",
  description="Written offer, price, conditions, validity: how an offer works in France, what never to pay at this "
              "stage, and how to negotiate with real sale prices.",
  label="Buying, step by step", meta="Buying", crumb="Making an offer",
  card="How to make an offer in France",
  card_desc="The written offer, the conditions to include, and how to negotiate with real prices.",
  h1="Making an offer on a French property, <em>the right way.</em>",
  h1_plain="Making an offer on a French property, the right way",
  lede="In France, an offer is a short written document, but it already commits the seller who accepts it. Here is "
       "how to write it, and how to back up your price.",
  image="/assets/shawez-ali-trois-verites-acheteurs.webp", image_alt="Shawez Ali advising buyers in Dijon",
  img_w=560, img_h=700,
  intro="You have visited, in person or by video, and you want the property. The next step is the offer, the offre "
        "d'achat. It is quick to write, but a few rules protect you, and a well-argued price makes the difference with "
        "other buyers.",
  sections=[
    ("written", "Always in writing",
     "<p>An offer is made in writing, signed and dated, and sent to the agent or the seller; an email or an electronic "
     "signature is enough. It states the property, the price you offer, how you will pay, with or without a mortgage, "
     "and how long the offer stays valid, often a few days.</p>"
     "<p>In principle, a seller who accepts your offer in writing at that price is committed to you. The details are "
     "then set out in the preliminary contract, the " + L("/en/compromis-de-vente-explained/", "compromis de vente")
     + ".</p>"),
    ("no-money", "Never pay anything with an offer",
     "<p>French law voids any commitment to buy a property for which money is demanded from the buyer at this stage "
     "(article 1589-1 of the Civil Code). The deposit comes later, with the compromis, and it is held by the notaire or "
     "by a professional allowed to hold funds. If someone asks you for a transfer to reserve a house, stop there.</p>"),
    ("conditions", "The conditions to write down",
     "<ul>"
     "<li><strong>Your mortgage</strong>, if you borrow: the purchase will depend on obtaining it.</li>"
     "<li><strong>What is included</strong>: a fitted kitchen, furniture, a parking space, a cellar.</li>"
     "<li><strong>Your timing</strong>: a signing date that suits you, especially if you sell elsewhere first.</li>"
     "</ul>"),
    ("price", "How much to offer",
     "<p>Do not start from the asking price, start from the real sales. In France, the prices actually paid at the "
     "notaire's are public: " + L("/en/real-sale-prices-france-dvf/", "here is how to read them") + ". Then adjust for "
     "what makes this property different: the condition, the works to plan, the energy rating, the floor, the garden, "
     "the view.</p>"
     "<p>A low offer without arguments often closes the door. An offer explained in three lines, with the comparable "
     "sales and the quotes for the works, is read differently by a seller.</p>"),
    ("how-i-help", "How I help",
     "<p>When one of my buyers wants to make an offer, I prepare the comparison with the real sales, I tell the buyer "
     "honestly where the price stands, and I present the offer to the seller myself, with its arguments. If several "
     "buyers are interested, I tell you so. " + LANGUES_EN + "</p>"),
  ],
  faq=[
    ("Is an offer binding in France?",
     "Once the seller accepts it in writing, the seller is in principle committed to you at that price. As a private "
     "buyer of a home, you keep a 10-day cooling-off period after signing the compromis."),
    ("Do I need to pay a deposit with my offer?",
     "No. Any commitment to buy for which money is demanded at this stage is void under French law. The deposit comes "
     "with the compromis."),
    ("How long should my offer stay valid?",
     "Usually a few days, enough for the seller to answer, not so long that you stay tied while you look elsewhere."),
    ("Can I make an offer without visiting?",
     "Yes, after a detailed video visit, but most buyers prefer to see the property once before the final deed."),
  ],
  links=[("The compromis de vente explained", "/en/compromis-de-vente-explained/"),
         ("Checking real sale prices (DVF)", "/en/real-sale-prices-france-dvf/"),
         ("How long it takes to buy", "/en/how-long-does-it-take-to-buy-a-house-in-france/"),
         ("French property buying costs", "/en/french-property-buying-costs/"),
         ("All guides", "/en/guides/")],
)

# --------------------------------------------------------------------------------------------- 2. COMPROMIS
en(
  id="en-compromis", path="/en/compromis-de-vente-explained/", theme="buying",
  title="The compromis de vente explained for foreign buyers",
  description="What the French preliminary contract contains, the conditions that protect you, the deposit, and what "
              "happens if the buyer or the seller pulls out.",
  label="Buying, step by step", meta="Buying", crumb="The compromis",
  card="The compromis de vente explained",
  card_desc="The preliminary contract: what it contains, the conditions that protect you, the deposit.",
  h1="The compromis de vente, <em>explained clause by clause.</em>",
  h1_plain="The compromis de vente, explained clause by clause",
  lede="The compromis is the real commitment in a French purchase. Here is what is in it, and what to read twice.",
  image="/assets/shawez-ali-conseils-achat-dijon.webp", image_alt="Shawez Ali giving buying advice in Dijon",
  img_w=512, img_h=640,
  intro="Between the accepted offer and the final deed, buyer and seller sign a preliminary contract. It fixes the "
        "price and the conditions of the sale, two or three months before the keys. It is drafted by the notaire or by "
        "the agency, and it can often be signed electronically.",
  sections=[
    ("two-forms", "Compromis or promesse de vente",
     "<p>The <strong>compromis de vente</strong> commits both sides: the seller to sell, the buyer to buy, subject to "
     "the conditions written in it. The <strong>promesse unilatérale de vente</strong> commits only the seller, who "
     "reserves the property for you for a set time; you pay an option fee, often around 10% of the price, which you "
     "lose if you do not buy without a valid reason. Both are common; the compromis is the most frequent in my "
     "area.</p>"),
    ("contents", "What it contains",
     "<ul>"
     "<li>The identities of the parties, the description of the property and of what is included.</li>"
     "<li>The price, the agency fee and who pays it, and the date planned for the final deed.</li>"
     "<li>The surveys (diagnostics), the planning information and, for an apartment, the copropriété documents.</li>"
     "<li>The deposit, usually between 5 and 10% of the price, paid to the notaire.</li>"
     "<li>The conditions precedent (conditions suspensives).</li>"
     "</ul>"),
    ("conditions", "The conditions that protect you",
     "<ul>"
     "<li><strong>The mortgage condition</strong>: if you borrow, the purchase depends on obtaining your loan within a "
     "set time. If the bank refuses despite a genuine application, you get your deposit back.</li>"
     "<li><strong>Pre-emption rights</strong>: the commune, and the SAFER for agricultural land, may have priority to "
     "buy. The notaire asks them.</li>"
     "<li><strong>No mortgage or charge exceeding the price</strong>, and a clear title.</li>"
     "<li><strong>Any specific condition</strong> you need, such as a planning permission for an extension, if it is "
     "written in.</li>"
     "</ul>"),
    ("withdrawal", "Who can withdraw, and when",
     "<p>As a private buyer of a home, you have a " + L("/en/cooling-off-period-buying-property-france/",
     "10-day cooling-off period") + " after the signed contract is delivered to you. The seller has no such right. "
     "After the cooling-off period, if every condition is met and you refuse to buy, you lose your deposit. If the "
     "seller refuses to sign, you can go to court to force the sale or claim damages.</p>"),
    ("tips", "What to read twice",
     "<ul>"
     "<li>The deadline of the mortgage condition: make sure it leaves your bank enough time.</li>"
     "<li>The list of furniture and fittings included, with their value if any.</li>"
     "<li>Works voted in a copropriété, and who pays them.</li>"
     "<li>The planned date of the final deed, if you have to travel.</li>"
     "</ul>"
     "<p>If anything is unclear, ask before signing. I go through the compromis with my buyers in their language, line "
     "by line. " + LANGUES_EN + "</p>"),
  ],
  faq=[
    ("Is the compromis legally binding?",
     "Yes, for both sides, subject to its conditions and to the buyer's 10-day cooling-off period."),
    ("How much is the deposit?",
     "Usually between 5 and 10% of the price. It is paid to the notaire and counts towards the price at the final "
     "deed."),
    ("Can I sign the compromis from abroad?",
     "Often yes, by electronic signature, or through a power of attorney."),
    ("What if my mortgage is refused?",
     "If the compromis includes the mortgage condition and you applied in good faith, the sale is cancelled and your "
     "deposit is returned."),
  ],
  links=[("The 10-day cooling-off period", "/en/cooling-off-period-buying-property-france/"),
         ("Making an offer", "/en/making-an-offer-on-a-french-property/"),
         ("French mortgage for non-residents", "/en/french-mortgage-for-non-residents/"),
         ("The notaire explained", "/en/the-notaire-in-france-explained/"),
         ("All guides", "/en/guides/")],
)

# --------------------------------------------------------------------------------------------- 3. RÉTRACTATION
en(
  id="en-cooling-off", path="/en/cooling-off-period-buying-property-france/", theme="buying",
  title="The 10-day cooling-off period when buying in France",
  description="When the 10 days start, how to withdraw, what happens to your deposit, and who can use the cooling-off "
              "right when buying a home in France.",
  label="Buying, step by step", meta="Buying", crumb="Cooling-off period",
  card="The 10-day cooling-off period",
  card_desc="When it starts, how to withdraw, and what happens to your deposit.",
  h1="The 10-day cooling-off period, <em>day by day.</em>",
  h1_plain="The 10-day cooling-off period, day by day",
  lede="French law gives a private buyer ten days to change their mind after signing for a home. Here is how it works "
       "in practice.",
  image="/assets/appartement-ancien-salon-lumineux.webp", image_alt="Bright living room in an old apartment",
  intro="The cooling-off period (délai de rétractation) is one of the strongest protections for buyers in France. It "
        "applies to private buyers of a home, new or old, whether the contract is signed at an agency, between "
        "individuals or at the notaire's office.",
  sections=[
    ("start", "When the ten days start",
     "<p>The ten days start the day after the signed contract is delivered to you: the day after the first "
     "presentation of the registered letter, or after the contract is handed to you when it is signed at the "
     "notaire's. If the last day falls on a Saturday, a Sunday or a public holiday, the period runs until the next "
     "working day (" + RETRACT + ").</p>"),
    ("how", "How to withdraw",
     "<p>You send a registered letter with acknowledgement of receipt before the end of the period, or use the "
     "electronic registered method offered by the notaire or the agency. You do not have to give a reason. Keep the "
     "proof of sending.</p>"),
    ("money", "Your deposit",
     "<p>If you withdraw within the ten days, the money you paid is returned to you, within 21 days of the withdrawal "
     "under the Construction and Housing Code. No one may receive money from a private buyer before the end of the "
     "period, except a notaire or a professional allowed to hold funds.</p>"),
    ("who", "Who can use it",
     "<ul>"
     "<li>Private buyers of a home, whatever their nationality or country of residence.</li>"
     "<li>Not the seller: once the contract is signed, the seller is committed.</li>"
     "<li>Not the buyer of a business or commercial premises bought for professional use.</li>"
     "</ul>"
     "<p>The final deed cannot be signed during the ten days.</p>"),
    ("advice", "My advice",
     "<p>Use these ten days well: read the surveys again, call your bank or broker, check the costs of the works. If you "
     "live abroad, plan them with me before the signature, so that a question does not arrive on day nine. "
     + LANGUES_EN + "</p>"),
  ],
  faq=[
    ("Does the cooling-off period apply to foreign buyers?",
     "Yes. It applies to every private buyer of a home in France, whatever their nationality."),
    ("Can the seller withdraw during the ten days?",
     "No. Only the buyer has this right."),
    ("Do I lose money if I withdraw?",
     "No. The sums paid are returned to you, within 21 days of the withdrawal."),
    ("Does it apply when I buy a restaurant or a shop?",
     "No, not for a business or commercial premises bought for professional use."),
  ],
  links=[("The compromis de vente explained", "/en/compromis-de-vente-explained/"),
         ("How long it takes to buy", "/en/how-long-does-it-take-to-buy-a-house-in-france/"),
         ("Buying in France from abroad", "/en/buying-property-in-france-from-abroad/"),
         ("All guides", "/en/guides/")],
)

# --------------------------------------------------------------------------------------------- 4. PROCURATION
en(
  id="en-poa", path="/en/power-of-attorney-buying-property-france/", theme="buying",
  title="Buying in France without travelling: power of attorney",
  description="How a power of attorney lets you sign a French purchase from abroad: language, apostille or consulate, "
              "remote signing by video with a notaire, and delays.",
  label="Buying, step by step", meta="Buying from abroad", crumb="Power of attorney",
  card="Signing without travelling",
  card_desc="Power of attorney, apostille, remote signing by video: how to sign from abroad.",
  h1="Signing a French purchase <em>without travelling.</em>",
  h1_plain="Signing a French purchase without travelling",
  lede="Many of my buyers abroad come once, to see the property. For the rest, a power of attorney does the travelling "
       "for them.",
  image="/assets/shawez-ali-portrait-costume-bleu.webp", image_alt="Shawez Ali, real estate agent in Dijon",
  img_w=560, img_h=700,
  intro="A power of attorney (procuration) allows someone to sign in your name, usually a member of the notaire's "
        "staff. French law applies to a French property, so the document must meet French requirements even if you "
        "sign it abroad.",
  sections=[
    ("form", "The form of the document",
     "<ul>"
     "<li>It is written in French, or accompanied by an official translation.</li>"
     "<li>If you sign it abroad, your signature must be authenticated in a way recognised in France: an apostille if "
     "your country is a party to the Hague Convention of 5 October 1961, otherwise legalisation by the French consulate "
     "(" + PROCU + ").</li>"
     "<li>The notaire tells you whether a notarised (authentic) power is needed. It is usually the case when a mortgage "
     "secures your loan.</li>"
     "</ul>"),
    ("remote", "Signing remotely by video",
     "<p>Since a decree of 20 November 2020, a French notaire can receive a notarised power of attorney at a distance, "
     "by videoconference, without you travelling (" + PROCU + "). Ask the notaire handling your purchase whether it "
     "can be organised in your case.</p>"),
    ("timing", "Plan the delays",
     "<p>An apostille, a consular appointment or a translation takes time: from a few days to several weeks depending "
     "on the country. As soon as the compromis is signed, ask the notaire for the draft power of attorney, so that it "
     "is ready well before the final deed.</p>"),
    ("compromis", "And the compromis?",
     "<p>The compromis can often be signed electronically, without a power of attorney. The power is mostly needed for "
     "the final deed, and sometimes for the loan.</p>"),
    ("how-i-help", "How I help",
     "<p>I coordinate with the notaire so that you know exactly which document to sign, where and when, and I visit the "
     "property for you before the deed, to check that it is in the agreed condition. " + LANGUES_EN + "</p>"),
  ],
  faq=[
    ("Who signs for me with a power of attorney?",
     "Usually a member of the notaire's staff, or a person you trust and name in the document."),
    ("Must the power of attorney be in French?",
     "Yes, or accompanied by an official translation."),
    ("What is an apostille?",
     "A certificate issued in your country that authenticates your signature for use in France, between countries "
     "party to the Hague Convention of 1961. Elsewhere, the French consulate legalises the document."),
    ("Can I sign the power of attorney by video?",
     "A French notaire can receive a notarised power of attorney by videoconference since 2020. Ask the notaire "
     "whether it is possible in your case."),
  ],
  links=[("Buying in France from abroad", "/en/buying-property-in-france-from-abroad/"),
         ("The notaire explained", "/en/the-notaire-in-france-explained/"),
         ("Paying from abroad", "/en/paying-for-french-property-from-abroad/"),
         ("All guides", "/en/guides/")],
)

# --------------------------------------------------------------------------------------------- 5. NOTAIRE
en(
  id="en-notaire", path="/en/the-notaire-in-france-explained/", theme="buying",
  title="The French notaire: role, costs and how to choose",
  description="What a French notaire does in a property purchase, what the notaire's costs pay for, and why you can "
              "have your own notaire at no extra cost.",
  label="Buying, step by step", meta="Buying", crumb="The notaire",
  card="The French notaire explained",
  card_desc="Role, costs, and why you can choose your own notaire at no extra cost.",
  h1="The French notaire, <em>explained to buyers from abroad.</em>",
  h1_plain="The French notaire, explained to buyers from abroad",
  lede="No property changes hands in France without a notaire. Here is what they do for you, and what they do not.",
  image="/assets/immeuble-ancien-angle-bourgogne.webp", image_alt="Old stone building on a street corner in Burgundy",
  intro="In many countries, each side hires a lawyer. In France, the sale of a property is signed before a notaire, a "
        "lawyer appointed by the State as a public officer. The notaire is responsible for the legal security of the deed, "
        "for both parties.",
  sections=[
    ("role", "What the notaire does",
     "<ul>"
     "<li>Checks the seller's title and the history of the property.</li>"
     "<li>Asks for the planning information, the mortgages registered and the pre-emption rights.</li>"
     "<li>Drafts the final deed (acte authentique) and has it signed.</li>"
     "<li>Receives your money on an account held at the Caisse des Dépôts, pays the seller, the taxes and the "
     "agency.</li>"
     "<li>Registers the sale and records you as the new owner.</li>"
     "</ul>"),
    ("not-role", "What the notaire does not do",
     "<p>The notaire does not visit the property for you, does not check the condition of the roof or the boiler, and "
     "does not negotiate the price. That is the role of the surveys, of your own checks, and of your agent.</p>"),
    ("costs", "The notaire's costs",
     "<p>The notaire's costs are mostly taxes collected for the State and the local authorities. The notaire's own fee "
     "is set by law. For an existing home, the total is roughly 7 to 8% of the price, much less for a new build. "
     "Details in " + L("/en/french-property-buying-costs/", "French property buying costs") + ".</p>"),
    ("own-notaire", "Your own notaire, at no extra cost",
     "<p>You can choose your own notaire, even if the seller already has one. The two notaires then work together and "
     "share the fee: it costs you nothing more. Some notaires speak English; the notaires.fr directory helps you find "
     "an office.</p>"),
    ("how-i-help", "How I work with notaires",
     "<p>I send the notaire the complete file as soon as the offer is accepted, I follow every document, and I keep "
     "you informed in writing. When the notaire needs something from you, I explain it in your language. "
     + LANGUES_EN + "</p>"),
  ],
  faq=[
    ("Is a notaire compulsory to buy a property in France?",
     "Yes. The sale of a property is signed by notarised deed and registered by the notaire."),
    ("Who chooses the notaire?",
     "Each side can have its own notaire. If you have none, the seller's notaire handles the sale for both."),
    ("Does having two notaires cost more?",
     "No. The two notaires share the same regulated fee."),
    ("Does the notaire check the condition of the house?",
     "No. The condition is covered by the surveys and by your own visit and checks."),
  ],
  links=[("French property buying costs", "/en/french-property-buying-costs/"),
         ("The compromis de vente explained", "/en/compromis-de-vente-explained/"),
         ("Power of attorney", "/en/power-of-attorney-buying-property-france/"),
         ("All guides", "/en/guides/")],
)

# --------------------------------------------------------------------------------------------- 6. PAYER DEPUIS L'ÉTRANGER
en(
  id="en-paying", path="/en/paying-for-french-property-from-abroad/", theme="buying",
  title="Paying for a French property from abroad",
  description="How the money moves in a French purchase: the notaire's account, the origin of funds checks, currency "
              "exchange and the payment fraud to avoid.",
  label="Buying, step by step", meta="Buying from abroad", crumb="Paying from abroad",
  card="Paying for a property from abroad",
  card_desc="The notaire's account, the origin of funds checks, currency, and the fraud to avoid.",
  h1="Paying for a French property <em>from abroad, safely.</em>",
  h1_plain="Paying for a French property from abroad, safely",
  lede="The money is where buyers from abroad worry most. In France, it follows a simple path. Here it is.",
  image="/assets/shawez-ali-devant-agence-gravelin-immo.webp", image_alt="Shawez Ali in front of the GRAVELIN IMMO agency",
  img_w=480, img_h=600,
  intro="In a French purchase, you never pay the seller directly. The deposit and the balance go to the notaire, who "
        "pays everyone at the signing. A few precautions make this path completely safe.",
  sections=[
    ("path", "The path of the money",
     "<ol>"
     "<li>With the compromis, the deposit is paid to the notaire.</li>"
     "<li>A few days before the final deed, you transfer the balance and the costs to the notaire's account, held at "
     "the Caisse des Dépôts.</li>"
     "<li>At the signing, the notaire pays the seller, the taxes and the agency, and returns any surplus to you.</li>"
     "</ol>"),
    ("fraud", "The fraud to avoid",
     "<p>Fraudsters send fake emails that look like the notaire's, with new bank details. Before any transfer, call the "
     "notaire's office on a number you found yourself, and confirm the details by voice. Never trust a change of bank "
     "details received by email.</p>"),
    ("origin", "The origin of your funds",
     "<p>Anti-money-laundering rules require the notaire, the bank and the agency to check who you are and where the "
     "money comes from. Prepare your bank statements, the deed of a property you sold, a loan offer or the proof of a "
     "gift or an inheritance. The funds must come from an account in your name. Cash is not accepted for a property "
     "purchase.</p>"),
    ("currency", "Currency exchange",
     "<p>If your money is in pounds, dollars, francs or dirhams, the exchange rate can change your budget by thousands "
     "of euros between the offer and the deed. Compare your bank's rate with specialist currency providers, and ask "
     "whether you can fix a rate in advance. Transfer in time: an international transfer can take several days.</p>"),
    ("account", "Do you need a French bank account?",
     "<p>Not to buy. For the running costs afterwards, such as the property tax, insurance and energy, a French or euro "
     "account is practical. " + LANGUES_EN + "</p>"),
  ],
  faq=[
    ("Do I pay the seller directly?",
     "No. In France, the money goes through the notaire, who pays the seller at the signing."),
    ("How do I avoid payment fraud?",
     "Always confirm the notaire's bank details by phone, on a number you found yourself, before any transfer."),
    ("Which documents prove the origin of my funds?",
     "Bank statements, the deed of a property you sold, a loan offer, or proof of a gift or an inheritance."),
    ("Can I pay in cash?",
     "No. The funds must arrive by bank transfer from an account in your name."),
  ],
  links=[("Getting a French mortgage", "/en/french-mortgage-for-non-residents/"),
         ("The notaire explained", "/en/the-notaire-in-france-explained/"),
         ("Buying in France from abroad", "/en/buying-property-in-france-from-abroad/"),
         ("All guides", "/en/guides/")],
)

# --------------------------------------------------------------------------------------------- 7. CRÉDIT NON-RÉSIDENT
en(
  id="en-mortgage", path="/en/french-mortgage-for-non-residents/", theme="buying",
  title="Getting a French mortgage as a non-resident",
  description="Can a non-resident borrow in France? What French banks look at, the deposit, the insurance, the 10-day "
              "reflection period on the loan offer, and the timing.",
  label="Buying, step by step", meta="Financing", crumb="Mortgage for non-residents",
  card="A French mortgage as a non-resident",
  card_desc="What banks look at, the insurance, the loan offer, and the timing to plan.",
  h1="A French mortgage <em>when you live abroad.</em>",
  h1_plain="A French mortgage when you live abroad",
  lede="Yes, French banks lend to buyers who live abroad. Here is what they look at, and how to prepare your file.",
  image="/assets/shawez-ali-appartement-investissement.webp", image_alt="Shawez Ali visiting an investment apartment",
  img_w=480, img_h=600,
  intro="Borrowing in France as a non-resident is possible, but the conditions are usually stricter than for a "
        "resident, and fewer banks take these files. A broker who knows non-resident lending often saves time.",
  sections=[
    ("what-banks-look-at", "What French banks look at",
     "<ul>"
     "<li><strong>Your income</strong> and its stability, often converted with a safety margin when it is in another "
     "currency.</li>"
     "<li><strong>Your debts</strong>: French banks apply strict affordability rules, with repayments generally capped "
     "at about a third of income, insurance included.</li>"
     "<li><strong>Your personal contribution</strong>: non-residents are usually asked for a larger deposit than "
     "residents.</li>"
     "<li><strong>Your country of residence</strong> and the documents the bank can check.</li>"
     "</ul>"),
    ("insurance", "The borrower's insurance",
     "<p>French banks usually require a borrower's insurance covering death and disability. You may choose an insurer "
     "other than the bank's, if the cover is equivalent. Depending on the amount and your age, a health questionnaire "
     "may be required.</p>"),
    ("offer", "The loan offer and its 10-day reflection period",
     "<p>Once the bank agrees, it sends you a formal loan offer. The law gives you ten days of reflection: you cannot "
     "accept it before the eleventh day after receiving it. Take this into account in your timetable.</p>"),
    ("timing", "The timing",
     "<p>Start before you find the property: a bank's agreement in principle makes your offer stronger. Once the "
     "compromis is signed with a mortgage condition, you usually have a few weeks to obtain the loan. If it is refused "
     "despite a genuine application, the condition protects your deposit.</p>"),
    ("simulate", "Simulate first",
     "<p>To get an idea of the monthly payments, try my " + SIMU + " (in French, the figures are easy to read). Then "
     "speak to a bank or a broker for your own situation. " + LANGUES_EN + "</p>"),
  ],
  faq=[
    ("Can a foreigner get a mortgage in France?",
     "Yes. French banks lend to non-residents, usually with stricter conditions such as a larger deposit."),
    ("Is borrower's insurance compulsory?",
     "Banks generally require it. You can choose another insurer if the cover is equivalent."),
    ("When can I accept the loan offer?",
     "Not before the eleventh day after receiving it: the law gives ten days of reflection."),
    ("What happens if my loan is refused?",
     "If the compromis includes a mortgage condition and you applied in good faith, the sale is cancelled and your "
     "deposit is returned."),
  ],
  links=[("Mortgage simulator (in French)", "/simulateur-pret-immobilier-dijon/"),
         ("The compromis de vente explained", "/en/compromis-de-vente-explained/"),
         ("Paying from abroad", "/en/paying-for-french-property-from-abroad/"),
         ("All guides", "/en/guides/")],
)

# --------------------------------------------------------------------------------------------- 8. DIAGNOSTICS
en(
  id="en-surveys", path="/en/french-property-surveys-diagnostics/", theme="buying",
  title="French property surveys (diagnostics) explained",
  description="Energy rating, asbestos, lead, termites, electrics, gas, risks, drainage, floor area: the surveys a "
              "seller must provide in France, and how to read them.",
  label="Buying, step by step", meta="Buying", crumb="Property surveys",
  card="The French property surveys",
  card_desc="Which surveys the seller must provide, when, and what to look at in each one.",
  h1="French property surveys, <em>in plain English.</em>",
  h1_plain="French property surveys, in plain English",
  lede="In France, the seller pays for the surveys and gives them to you before you sign. Here is what each one tells "
       "you.",
  image="/assets/maison-230m2-cuisine-ilot.webp", image_alt="Kitchen with an island in a large house",
  intro="The surveys are gathered in a file called the dossier de diagnostic technique. Some are always required, "
        "others depend on the age of the building, its location or its equipment. They are carried out by certified "
        "professionals.",
  sections=[
    ("always", "Always required",
     "<ul>"
     "<li><strong>The energy rating (DPE)</strong>, from A to G: " + L("/en/french-energy-rating-dpe-explained/",
     "what it means for buyers") + ".</li>"
     "<li><strong>The risks report</strong> (état des risques): flooding, clay soils, earthquakes, radon, industrial "
     "risks, noise around airports. You can check an address yourself on " + GEORISQUES + ".</li>"
     "</ul>"),
    ("age", "Depending on the age of the building",
     "<ul>"
     "<li><strong>Asbestos</strong>: when the building permit was issued before 1 July 1997.</li>"
     "<li><strong>Lead</strong>: for homes built before 1949.</li>"
     "<li><strong>Electrics and gas</strong>: when the installation is more than fifteen years old.</li>"
     "</ul>"),
    ("location", "Depending on the location and the equipment",
     "<ul>"
     "<li><strong>Termites</strong> and <strong>dry rot</strong>, in the areas defined by the prefecture.</li>"
     "<li><strong>Private drainage</strong>: for a house not connected to the sewers, the inspection of the septic "
     "system. If it is not compliant, the buyer has a year to do the works.</li>"
     "<li><strong>The floor area</strong> under the Carrez law, for a lot in a copropriété.</li>"
     "<li><strong>The energy audit</strong>, for the sale of a house rated poorly on the DPE.</li>"
     "</ul>"),
    ("read", "How to read them",
     "<p>A survey describes, it does not judge. A report mentioning asbestos in a garage roof is not a reason to "
     "refuse a house, but it is a reason to ask for a quote. Read the conclusions first, then the photos, then ask "
     "what each remark would cost to fix. I go through them with my buyers before the compromis.</p>"),
    ("how-i-help", "How I help",
     "<p>I ask for the surveys as soon as a property comes in, so you can read them before you visit. For an old house, "
     "I also tell you what the surveys do not cover, such as the roof or the walls, and when a builder's visit is "
     "worth it. " + LANGUES_EN + "</p>"),
  ],
  faq=[
    ("Who pays for the surveys in France?",
     "The seller, before the sale."),
    ("When do I receive the surveys?",
     "They are attached to the compromis, but you can ask for them before making an offer."),
    ("Do the surveys cover the roof and the structure?",
     "No. For an old or large building, a builder or a surveyor can inspect the structure before you sign."),
    ("What happens if the septic system is not compliant?",
     "The buyer must bring it into compliance within a year of the purchase. It is a point to negotiate."),
  ],
  links=[("The energy rating (DPE)", "/en/french-energy-rating-dpe-explained/"),
         ("Planning and legal checks", "/en/planning-and-legal-checks-before-buying-france/"),
         ("Renovating a stone house", "/en/renovating-an-old-stone-house-in-burgundy/"),
         ("All guides", "/en/guides/")],
)

# --------------------------------------------------------------------------------------------- 9. DPE
en(
  id="en-dpe", path="/en/french-energy-rating-dpe-explained/", theme="buying",
  title="France's energy rating (DPE): what buyers must know",
  description="The DPE from A to G, the 2026 change for electric heating, the letting bans for poorly rated homes, and "
              "how the rating affects price and works.",
  label="Buying, step by step", meta="Energy", crumb="Energy rating (DPE)",
  card="The French energy rating (DPE)",
  card_desc="From A to G: what it measures, what changed in 2026, and the letting bans.",
  h1="The French energy rating, <em>from A to G.</em>",
  h1_plain="The French energy rating, from A to G",
  lede="The DPE is on every listing. For a buyer, it says a lot about the bills, the works, and whether the home can "
       "be let.",
  image="/assets/loft-poutres-lumiere.webp", image_alt="Loft with exposed beams and natural light",
  intro="The diagnostic de performance énergétique rates a home from A, the most efficient, to G. It combines the "
        "energy used and the greenhouse gas emitted. Since 2021, it is legally binding on the seller.",
  sections=[
    ("what", "What it measures",
     "<p>The DPE estimates the energy used for heating, hot water and cooling, for a standard use of the home, and the "
     "greenhouse gas emissions. The worse of the two decides the letter. It also gives an estimate of the yearly "
     "energy costs.</p>"),
    ("2026", "What changed in 2026",
     "<p>On 1 January 2026, the DPE started counting electricity with a lower conversion factor, 1.9 instead of 2.3. "
     "Many electrically heated homes moved up a class. Existing DPEs remain valid, and owners can download an updated "
     "certificate from the " + ADEME + " (" + HELLIO + ").</p>"),
    ("letting", "If you plan to let the home",
     "<p>Under the Climate and Resilience law, homes rated G can no longer be let on new leases since 2025; the ban "
     "extends to F in 2028 and to E in 2034. Rents cannot be raised for homes rated F or G. This calendar has been "
     "debated, so check the rules in force before buying to let.</p>"),
    ("selling", "When the seller has a poor rating",
     "<p>For the sale of a house or a building owned by one person, an energy audit is required when the DPE is F or G, "
     "and since 2025 when it is E. It proposes a works plan with costs. For a buyer, it is a useful document to "
     "negotiate and plan.</p>"),
    ("price", "The rating and the price",
     "<p>A poor rating is not a reason to refuse an old stone house, but it has a price: the works, the bills, and a "
     "smaller pool of buyers when you sell. I always look at the DPE with my buyers, and at the real bills of the last "
     "winters. " + LANGUES_EN + "</p>"),
  ],
  faq=[
    ("What does DPE stand for?",
     "Diagnostic de performance énergétique, the French energy performance rating, from A to G."),
    ("Can I let a home rated G?",
     "Not on a new lease since 2025. Homes rated F follow in 2028 and E in 2034, under the current law."),
    ("Did the 2026 reform change ratings?",
     "Yes, for electrically heated homes: electricity is counted with a lower conversion factor since 1 January 2026, "
     "so many of them improved by one class."),
    ("Is the DPE valid forever?",
     "No. It is valid ten years, and the older versions made before July 2021 are no longer valid."),
  ],
  links=[("French property surveys", "/en/french-property-surveys-diagnostics/"),
         ("Renovating a stone house", "/en/renovating-an-old-stone-house-in-burgundy/"),
         ("Investing in rental property in Dijon", "/en/rental-investment-dijon/"),
         ("All guides", "/en/guides/")],
)

# --------------------------------------------------------------------------------------------- 10. COPROPRIÉTÉ
en(
  id="en-copro", path="/en/buying-an-apartment-in-a-french-copropriete/", theme="buying",
  title="Buying a flat in a French copropriété: what to check",
  description="Service charges, general meeting minutes, works voted, the works plan and the rules: what to check "
              "before buying an apartment in a French building.",
  label="Buying, step by step", meta="Apartments", crumb="Copropriété",
  card="Buying a flat in a copropriété",
  card_desc="Charges, minutes, works voted and rules: the documents to read before you sign.",
  h1="Buying a flat in a French copropriété: <em>what to check.</em>",
  h1_plain="Buying a flat in a French copropriété: what to check",
  lede="When you buy an apartment in France, you also buy a share of a building. Here are the documents that tell you "
       "how it is run.",
  image="/assets/appartement-centre-historique-dijon-sejour.webp",
  image_alt="Living room of an apartment in Dijon's historic centre",
  intro="A copropriété is a building divided into lots, each with its private part and a share of the common parts. "
        "The owners decide together at a yearly general meeting, and a syndic, often a professional, manages the "
        "building.",
  sections=[
    ("documents", "The documents to read",
     "<ul>"
     "<li><strong>The rules</strong> (règlement de copropriété): what you may do in the flat, including letting it to "
     "tourists.</li>"
     "<li><strong>The minutes of the last three general meetings</strong>: works voted, disputes, unpaid charges.</li>"
     "<li><strong>The service charges</strong> of the last two years, and the budget.</li>"
     "<li><strong>The summary sheet</strong> of the building and its maintenance book.</li>"
     "<li><strong>The works plan</strong> over several years, now required for buildings over fifteen years old, and "
     "the works fund.</li>"
     "<li><strong>The floor area</strong> under the Carrez law.</li>"
     "</ul>"),
    ("works", "Works voted and works to come",
     "<p>A facade, a roof or a lift can cost each owner several thousand euros. Read the minutes for works voted and "
     "works discussed. By default, the owner at the date each payment is called pays it, but the compromis can share "
     "the cost differently: discuss it before signing.</p>"),
    ("letting", "If you want to let it",
     "<p>Check the rules before buying for short-term letting: since the Le Meur law of November 2024, a copropriété "
     "can more easily ban tourist lets in some cases, and new rules must state whether they are allowed. More in "
     + L("/en/holiday-rental-rules-burgundy/", "letting a holiday home in Burgundy") + ".</p>"),
    ("dijon", "In Dijon",
     "<p>Many apartments in the historic centre are in old buildings, some in a protected sector, where the facades and "
     "the windows follow strict rules. It is charming, and it has a cost: look closely at the works plan. "
     + L("/en/where-to-live-in-dijon/", "Where to live in Dijon") + ".</p>"),
    ("how-i-help", "How I help",
     "<p>I gather the copropriété documents before you make an offer, I read the minutes for you, and I tell you what "
     "they mean for your budget. " + LANGUES_EN + "</p>"),
  ],
  faq=[
    ("What are the service charges in a French building?",
     "Your share of the building's costs: cleaning, insurance, the syndic, maintenance and sometimes heating. Ask for "
     "the last two years."),
    ("Who pays for works voted before the sale?",
     "By default, the owner at the date each payment is called, but the compromis can share the cost differently."),
    ("Can I let my apartment on short-term rental sites?",
     "It depends on the copropriété rules and on the commune. Check both before buying."),
    ("What is the Carrez floor area?",
     "The private floor area of a lot, measured under strict rules. If it is more than 5% smaller than stated, the "
     "buyer can claim a price reduction within a year of the deed."),
  ],
  links=[("Where to live in Dijon", "/en/where-to-live-in-dijon/"),
         ("French property surveys", "/en/french-property-surveys-diagnostics/"),
         ("Letting a holiday home", "/en/holiday-rental-rules-burgundy/"),
         ("All guides", "/en/guides/")],
)

# --------------------------------------------------------------------------------------------- 11. URBANISME
en(
  id="en-planning", path="/en/planning-and-legal-checks-before-buying-france/", theme="buying",
  title="Planning and legal checks before buying in France",
  description="Local plan, easements, boundaries, pre-emption rights, works done without permission, pools: the checks "
              "to make before buying a house in France.",
  label="Buying, step by step", meta="Buying", crumb="Planning checks",
  card="Planning and legal checks",
  card_desc="Local plan, easements, boundaries, pre-emption, works without permission.",
  h1="Planning and legal checks <em>before you buy.</em>",
  h1_plain="Planning and legal checks before you buy",
  lede="A house is also a plot of land with rules. Here are the checks that avoid bad surprises, especially in the "
       "countryside.",
  image="/assets/shawez-ali-terrain-maison-pierre.webp", image_alt="Shawez Ali on the land of a stone house",
  intro="The notaire checks the legal situation of the property before the deed. But some points are better known "
        "before you make an offer, especially if you plan works, an extension or a pool.",
  sections=[
    ("plan", "The local plan",
     "<p>Each commune has planning rules, usually a local plan (PLU), which says what can be built and where. If you "
     "plan an extension, a new building or a change of use, ask the town hall, or the notaire, for a planning "
     "certificate (certificat d'urbanisme) before committing.</p>"),
    ("permits", "Works done without permission",
     "<p>Ask for the permits of past works: an extension, a converted barn, a veranda. Works done without the required "
     "permission can cause problems when you sell or insure. The notaire checks the permits mentioned, but only those "
     "he is told about.</p>"),
    ("easements", "Easements and boundaries",
     "<p>An easement (servitude) can give a neighbour a right of way across your land, or limit what you can build. "
     "They are listed in the title deeds. If the boundaries are unclear, a land surveyor (géomètre-expert) can mark "
     "them.</p>"),
    ("preemption", "Pre-emption rights",
     "<p>In many communes, the town has a right of first refusal on sales: the notaire informs it, and it has two "
     "months to answer. For agricultural land and vines, the SAFER may have such a right. In practice, most sales go "
     "through, but the delay must be planned.</p>"),
    ("protected", "Protected areas and pools",
     "<p>Near a historic monument, exterior works need the approval of the Architectes des Bâtiments de France. An "
     "in-ground pool must have a safety device by law, and building one usually needs a declaration at the town hall. "
     "I check these points with my buyers before the offer. " + LANGUES_EN + "</p>"),
  ],
  faq=[
    ("What is a certificat d'urbanisme?",
     "A document from the town hall stating the planning rules for a plot, and whether a project is feasible."),
    ("Can the town hall stop my purchase?",
     "In many communes, it has a right of first refusal and two months to use it. It rarely does for an ordinary "
     "house."),
    ("What is the SAFER?",
     "The rural land agency, which may have a right of first refusal on agricultural land and vines."),
    ("Does the notaire check everything?",
     "The notaire checks the legal situation, but not the physical condition, and only the works he is told about."),
  ],
  links=[("French property surveys", "/en/french-property-surveys-diagnostics/"),
         ("Renovating a stone house", "/en/renovating-an-old-stone-house-in-burgundy/"),
         ("Buying vines in Burgundy", "/en/buying-vines-or-a-wine-estate-in-burgundy/"),
         ("All guides", "/en/guides/")],
)

# --------------------------------------------------------------------------------------------- 12. VEFA
en(
  id="en-vefa", path="/en/buying-off-plan-vefa-france/", theme="buying",
  title="Buying a new-build off-plan (VEFA) in France",
  description="Reservation contract, staged payments set by law, lower notaire costs, handover and builders' liability: "
              "how buying off-plan works in France.",
  label="Buying, step by step", meta="New builds", crumb="Buying off-plan",
  card="Buying a new build off-plan",
  card_desc="Reservation, staged payments set by law, handover and the builders' liability.",
  h1="Buying a new build <em>off-plan in France.</em>",
  h1_plain="Buying a new build off-plan in France",
  lede="A new apartment in Dijon, delivered in two years, with lower buying costs: here is how off-plan buying works.",
  image="/assets/appartement-dijon-cuisine-lumineuse.webp", image_alt="Bright kitchen in a new apartment in Dijon",
  intro="Buying off-plan, vente en l'état futur d'achèvement or VEFA, means buying a home before it is built. The law "
        "frames each step, from the reservation to the handover.",
  sections=[
    ("reservation", "The reservation contract",
     "<p>You first sign a reservation contract with the developer. The deposit is limited by law: at most 5% of the "
     "price if the sale is signed within a year, 2% within two years, nothing beyond. As a private buyer, you have the "
     "10-day cooling-off period.</p>"),
    ("payments", "Staged payments set by law",
     "<p>You pay as the building progresses, with caps set by law: up to 35% when the foundations are finished, 70% "
     "when the building is weather-tight, 95% when it is completed, and the balance at handover.</p>"),
    ("costs", "Lower buying costs",
     "<p>The notaire's costs on a new build are much lower than on an existing home, around 2 to 3% of the price, "
     "because the price already includes VAT. The new homes follow the current environmental standard, which helps the "
     "bills.</p>"),
    ("handover", "The handover and the builders' liability",
     "<p>At handover, you walk through the home and note any defect in writing. Then the builder is liable for a year "
     "for the defects reported, two years for the equipment, and ten years for the structure, the décennale liability. "
     "Keep every document.</p>"),
    ("how-i-help", "How I help",
     "<p>I compare new builds with existing apartments for my buyers, with the real prices of both, so the choice is "
     "made on numbers. " + LANGUES_EN + "</p>"),
  ],
  faq=[
    ("How much deposit for an off-plan reservation?",
     "At most 5% if the sale is signed within a year, 2% within two years, and nothing beyond."),
    ("When do I pay for an off-plan home?",
     "In stages, capped by law: 35% at the foundations, 70% when weather-tight, 95% at completion, the balance at "
     "handover."),
    ("Are the notaire's costs lower for a new build?",
     "Yes, around 2 to 3% of the price instead of 7 to 8% for an existing home."),
    ("What if there are defects after handover?",
     "Report them in writing: the builder is liable one year for reported defects, two years for equipment and ten "
     "years for the structure."),
  ],
  links=[("French property buying costs", "/en/french-property-buying-costs/"),
         ("Investing in student flats in Dijon", "/en/investing-in-student-flats-in-dijon/"),
         ("Where to live in Dijon", "/en/where-to-live-in-dijon/"),
         ("All guides", "/en/guides/")],
)

# --------------------------------------------------------------------------------------------- 13. HONORAIRES
en(
  id="en-fees", path="/en/how-estate-agency-fees-work-in-france/", theme="buying",
  title="How estate agency fees work in France",
  description="Who pays the agency fee in France, how it is shown in the listing, when it is due, and how it changes "
              "the notaire's costs. Clear rules, no surprises.",
  label="Buying, step by step", meta="Buying", crumb="Agency fees",
  card="How agency fees work in France",
  card_desc="Who pays, how it is shown, when it is due, and its effect on the notaire's costs.",
  h1="Estate agency fees in France, <em>clearly.</em>",
  h1_plain="Estate agency fees in France, clearly",
  lede="In France, agency fees follow precise rules on display and payment. Here they are, from the listing to the "
       "deed.",
  image="/assets/shawez-ali-portrait-costume-rose-800.webp", image_alt="Shawez Ali, real estate agent in Dijon",
  img_w=800, img_h=1000,
  intro="An agency acts under a written mandate from the seller, sometimes from the buyer. Its fee is set freely by "
        "each agency, but it must be shown in advance and it is only due when the sale is completed.",
  sections=[
    ("display", "Shown in advance",
     "<p>Every agency must display its scale of fees, in the agency and on its website. Each listing shows who pays the "
     "fee. When the buyer pays it, the listing shows the price with the fee included and the fee as a percentage. Mine "
     "are on the " + L("/honoraires/", "fees page") + " (in French).</p>"),
    ("who-pays", "Who pays",
     "<p>The fee is paid by the seller or by the buyer, as written in the mandate and the listing. There is no rule "
     "that one side must pay; what matters is that it is stated clearly, and that the total price is the one you "
     "agreed.</p>"),
    ("when", "When it is due",
     "<p>The fee is due only when the sale is completed by the final deed. No money is due to the agency for a visit, "
     "an offer or a compromis that does not go through.</p>"),
    ("notaire", "The effect on the notaire's costs",
     "<p>When the buyer pays the fee and it is written in the contract, the transfer taxes are calculated on the price "
     "without the fee, which lowers the buyer's notaire's costs a little.</p>"),
    ("licence", "Check the licence",
     "<p>An agency must hold a professional licence, the carte professionnelle, insurance and, when it holds funds, a "
     "financial bond. I work with the GRAVELIN IMMO agency, 30 rue Bannelier in Dijon; the mandates are signed in "
     "its name. " + LANGUES_EN + "</p>"),
  ],
  faq=[
    ("Who pays the estate agent in France?",
     "The seller or the buyer, as stated in the mandate and in the listing."),
    ("When is the agency fee paid?",
     "Only when the sale is completed by the final deed, through the notaire."),
    ("Is the agency fee included in the price?",
     "When the buyer pays it, the listing shows the price with the fee included and the fee as a percentage."),
    ("Can I negotiate the agency fee?",
     "The scale of fees is set by each agency. What you negotiate in practice is the total price."),
  ],
  links=[("French property buying costs", "/en/french-property-buying-costs/"),
         ("Making an offer", "/en/making-an-offer-on-a-french-property/"),
         ("International property portals", "/en/french-property-portals-for-international-buyers/"),
         ("All guides", "/en/guides/")],
)

# --------------------------------------------------------------------------------------------- 14. DÉLAIS
en(
  id="en-timeline", path="/en/how-long-does-it-take-to-buy-a-house-in-france/", theme="buying",
  title="How long does it take to buy a house in France?",
  description="From the offer to the keys, step by step: the usual delays in France, what slows a purchase down, and "
              "how to plan from abroad.",
  label="Buying, step by step", meta="Buying", crumb="How long it takes",
  card="How long it takes to buy in France",
  card_desc="From the offer to the keys: the usual delays, and how to plan them from abroad.",
  h1="How long it takes to buy <em>a house in France.</em>",
  h1_plain="How long it takes to buy a house in France",
  lede="Count about three months from the accepted offer to the keys, sometimes four. Here is where the time goes.",
  image="/assets/st-couloir.webp", image_alt="Corridor of an old house in Burgundy", img_w=720, img_h=1280,
  intro="A French purchase is not fast, but it is predictable. Each delay has a reason, and most of them can be "
        "planned, even from abroad.",
  sections=[
    ("steps", "The steps and their usual delays",
     "<ol>"
     "<li><strong>Offer and acceptance</strong>: a few days.</li>"
     "<li><strong>Compromis</strong>: one to three weeks, the time to gather the surveys and, for an apartment, the "
     "copropriété documents.</li>"
     "<li><strong>Cooling-off period</strong>: ten days after the signed contract is delivered to you.</li>"
     "<li><strong>Mortgage</strong>: a few weeks, set in the compromis.</li>"
     "<li><strong>Pre-emption</strong>: the commune has two months to answer the notaire.</li>"
     "<li><strong>Final deed</strong>: usually two to three months after the compromis.</li>"
     "</ol>"),
    ("slower", "What slows a purchase down",
     "<ul>"
     "<li>A mortgage file sent late, or a bank that asks for more documents.</li>"
     "<li>A power of attorney signed abroad at the last minute.</li>"
     "<li>A missing document: a permit for past works, a copropriété paper, an inheritance not settled.</li>"
     "<li>Holidays, especially in August.</li>"
     "</ul>"),
    ("faster", "What can make it faster",
     "<p>Buying without a mortgage, a complete file from the start, and a power of attorney prepared as soon as the "
     "compromis is signed. The commune's two months remain, unless it answers sooner.</p>"),
    ("abroad", "Planning from abroad",
     "<p>Most of my buyers abroad travel once, to see the property before the compromis or before the deed. I give them "
     "a timetable with dates as soon as the offer is accepted, and I tell them early if something slips. "
     + LANGUES_EN + "</p>"),
  ],
  faq=[
    ("How long from offer to keys in France?",
     "About three months in most cases, sometimes four."),
    ("Can a purchase be faster without a mortgage?",
     "Yes, a little, but the pre-emption delay of the commune and the preparation of the deed remain."),
    ("When do I get the keys?",
     "The day of the final deed, once the money has reached the notaire."),
    ("Do I have to be in France for the signing?",
     "No, a power of attorney can be used."),
  ],
  links=[("Making an offer", "/en/making-an-offer-on-a-french-property/"),
         ("The compromis de vente explained", "/en/compromis-de-vente-explained/"),
         ("Power of attorney", "/en/power-of-attorney-buying-property-france/"),
         ("All guides", "/en/guides/")],
)

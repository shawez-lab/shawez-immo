#!/usr/bin/env python3
"""Pages pour la clientèle internationale (27/10/2026, demande de Shawez : attirer les acheteurs et vendeurs
étrangers ; il parle anglais, français, hindi, ourdou, pendjabi, persan, grec et arabe).
Même gabarit que les autres pages SEO (outils/seo/gen_pages.py), puis traduction des éléments fixes du gabarit.

    python3 outils/seo/international_spec.py /tmp/intl.json && python3 outils/seo/gen_pages.py . /tmp/intl.json \
      && python3 outils/seo/international_spec.py --post .

Règles : aucun chiffre ni prix inventé ; les règles d'achat en France restent générales (le notaire les détaille) ;
« complimentary » pour « offert » ; jamais « the best », « number one », ni comparaison avec un confrère.
Une page = une vraie question d'acheteur étranger. Pas de pages en série.
"""
import json, os, re, sys

L = lambda href, txt: '<a class="link" href="%s">%s</a>' % (href, txt)
X = lambda href, txt: '<a class="link" href="%s" target="_blank" rel="noopener">%s</a>' % (href, txt)

LANGUES = ["en", "fr", "hi", "ur", "pa", "fa", "el", "ar"]
LANGUES_EN = ("I work in English and French every day. I also speak Hindi, Urdu and Punjabi fluently, "
              "Persian (Farsi) very well, and good Greek and Arabic.")
CTA_EN = ('<div class="btn-row" style="margin-top:32px;"><a class="btn btn-primary btn-lg" '
          'href="https://wa.me/33767579228">Message me on WhatsApp <span class="arw">→</span></a>'
          '<a class="btn" href="/estimation-immobiliere-dijon/">Request a valuation</a></div>')
EN = dict(lang="en", locale="en_GB", date="2026-10-27", date_fr="27 October 2026", side_title="Read next",
          cta_html=CTA_EN)

GUIDES = [
  ("/en/buying-a-house-in-beaune/", "Buying a house in Beaune and the wine villages"),
  ("/en/buying-a-chateau-in-burgundy/", "Buying a château in Burgundy: what to check first"),
  ("/en/french-property-buying-costs/", "French property buying costs, explained simply"),
  ("/en/buying-property-in-france-from-abroad/", "Buying in France from abroad"),
  ("/en/living-in-dijon/", "Living in Dijon: a guide for newcomers"),
  ("/en/rental-investment-dijon/", "Investing in rental property in Dijon"),
]

P = []


def guide(**kw):
    d = dict(EN)
    d.update(kw)
    d['article'] = True
    d['crumbs'] = [("English", "/en/"), (kw['h1_plain'], kw['path'])]
    P.append(d)


# --------------------------------------------------------------------------------------------- /en/ : page d'accueil anglaise
P.append(dict(EN,
  id="en", path="/en/",
  service="International real estate services in Dijon and Burgundy", service_type="Real estate agent", city="Dijon",
  service_desc="Property search, sale and letting for international clients in Dijon, Beaune and Burgundy, in English, "
               "French, Hindi, Urdu, Punjabi, Persian, Greek and Arabic. Complimentary valuation.",
  title="English-speaking real estate agent in Dijon | Shawez Ali",
  description="Shawez Ali, real estate agent at GRAVELIN IMMO in Dijon. Buy or sell in Dijon, Beaune and the Burgundy "
              "wine villages, in English. Complimentary valuation.",
  label="English-speaking real estate agent",
  h1="A real estate agent in Dijon <em>who speaks your language.</em>",
  h1_plain="A real estate agent in Dijon who speaks your language",
  lede="I am Shawez Ali, real estate agent at GRAVELIN IMMO, 30 rue Bannelier, in the centre of Dijon. I help "
       "international buyers and sellers in Dijon, Beaune and across Burgundy, from the first call to the signing at "
       "the notaire's office.",
  image="/assets/shawez-ali-portrait-sourire-720.webp", image_alt="Shawez Ali, real estate agent in Dijon",
  img_w=720, img_h=900,
  crumbs=[("English", "/en/")],
  intro="Buying or selling a home in France from another country raises the same three questions: who can I trust, "
        "how does it work, and can I do it from abroad? Here are clear answers, and the way I work with international "
        "clients.",
  sections=[
    ("about", "Who I am",
     "<p>My name is Shawez Ali. I am a real estate agent (agent commercial en immobilier) working with the GRAVELIN "
     "IMMO agency, 30 rue Bannelier, 21000 Dijon, a few steps from Les Halles. Mandates are signed in the agency's "
     "name, under its professional licence, and I am your single point of contact from the first call to the final "
     "signing. " + L("/shawez-ali-agent-immobilier-dijon/", "More about me and my team (in French)") + ".</p>"
     "<p>Every property I take on gets the same service, from a studio to a château: a photographer, a videographer, "
     "an edited film and virtual home staging, plus drone footage for houses. The films are published on the GRAVELIN "
     "IMMO YouTube channel, opened more than ten years ago. For a buyer who lives abroad, it means you can shortlist "
     "properties seriously before you travel.</p>"),
    ("languages", "The languages I work in",
     "<p>" + LANGUES_EN + " You can call me, send a voice note or write to me on WhatsApp in the language you "
     "prefer.</p>"),
    ("what-i-sell", "What I can find or sell for you",
     "<ul>"
     "<li><strong>Apartments and houses</strong> in Dijon and its suburbs: " + L("/biens-a-vendre-dijon/", "the properties for sale") + " (in French).</li>"
     "<li><strong>Homes in the wine villages</strong> of the Côte de Nuits and around Beaune: "
     + L("/prix-immobilier-gevrey-chambertin/", "Gevrey-Chambertin") + ", "
     + L("/immobilier-nuits-saint-georges/", "Nuits-Saint-Georges") + ", "
     + L("/agent-immobilier-beaune/", "Beaune") + " and the villages around them.</li>"
     "<li><strong>Châteaux, mansions (maisons de maître) and estates</strong> in Burgundy: "
     + L("/chateau-a-vendre-bourgogne/", "châteaux and prestige homes") + ".</li>"
     "<li><strong>Businesses and commercial property</strong>: restaurants, hotels and shops, "
     + L("/fonds-de-commerce-a-vendre-dijon/", "businesses for sale") + ", and offices, retail units and buildings, "
     + L("/immobilier-professionnel-dijon/", "commercial property") + ".</li>"
     "<li><strong>Letting</strong>: I find the tenant, prepare the lease and do the check-in inventory, then you keep "
     "the management. " + L("/location-immobiliere-dijon/", "Letting in Dijon") + " (in French).</li>"
     "</ul>"),
    ("buying-in-france", "Buying in France as a foreigner: the steps",
     "<p>There is no restriction on foreigners buying property in France: the process and the costs are the same "
     "whatever your nationality or your country of residence.</p>"
     "<ol>"
     "<li><strong>The offer.</strong> After your visit, you make a written offer (offre d'achat). Once the seller "
     "accepts it, the price is agreed.</li>"
     "<li><strong>The preliminary contract (compromis de vente).</strong> It sets the price, the timetable and the "
     "conditions, for example obtaining your mortgage. A deposit is usually paid at this stage, often up to 10% of the "
     "price. The seller provides the mandatory surveys (diagnostics: energy rating, asbestos, lead, electrics and so "
     "on).</li>"
     "<li><strong>The 10-day cooling-off period.</strong> For a home, a private buyer can withdraw within 10 days "
     "after receiving the signed contract, without giving a reason, and gets the deposit back.</li>"
     "<li><strong>The notaire.</strong> A notaire is a public officer: he checks the title, the planning situation "
     "and the financing, and prepares the deed.</li>"
     "<li><strong>The final deed (acte authentique).</strong> It is usually signed two to three months after the "
     "compromis. You receive the keys the same day.</li>"
     "</ol>"
     "<p><strong>Buying costs.</strong> On top of the price, the buyer pays the notaire's costs, which are mostly "
     "taxes: roughly 7 to 8% of the price for an existing property, much less for a new build. The agency fee is "
     "shown in every listing. Details in " + L("/en/french-property-buying-costs/", "French property buying costs")
     + ". Official information, in French, is on " + X("https://www.notaires.fr/", "notaires.fr") + ".</p>"),
    ("from-abroad", "Buying from abroad",
     "<p>You do not have to fly in for every step. You watch the film of the property, then I can show it to you live "
     "on a WhatsApp video call and answer your questions on the spot. The compromis can often be signed "
     "electronically, and if you cannot travel for the final signing, the notaire can arrange for you to sign through "
     "a power of attorney. I keep you informed in writing at every step. "
     + L("/en/buying-property-in-france-from-abroad/", "How buying from abroad works") + ".</p>"),
    ("selling", "Selling to international buyers",
     "<p>Whether you own a property in Dijon or in Burgundy, or you live abroad and want to sell, I handle everything "
     "on site: the valuation, the film, the visits, the negotiation and the follow-up with the notaire. Your property "
     "is presented with the same care whatever its price, and I can talk to buyers in their own language. The "
     "valuation is complimentary and without commitment: "
     + L("/estimation-immobiliere-dijon/", "request a valuation") + " (form in French, I answer in English).</p>"),
    ("why-dijon", "Why Dijon and Burgundy",
     "<p>Dijon, the historic capital of the Dukes of Burgundy, is about an hour and a half from Paris by TGV. Its "
     "historic centre, the town of Beaune and the vineyards of the Côte de Nuits and the Côte de Beaune are part of "
     "the Climats of Burgundy, a UNESCO World Heritage site since 2015. Beaune and its Hospices are about forty "
     "minutes from Dijon by car. Real sale prices, town by town, are on "
     + L("/prix-immobilier-cote-d-or/", "the price pages") + " (in French), based on the official DVF data of "
     "notarised sales.</p>"),
    ("guides", "Guides for international buyers",
     "<ul>" + "".join("<li>" + L(u, t) + "</li>" for u, t in GUIDES) + "</ul><p>"
     + L("/en/guides/", "All the guides for international buyers") + ": the buying steps, the tax, the villages, "
     "daily life, and guides for buyers from the UK, the US, Benelux, South Asia and the Middle East.</p>"),
  ],
  faq=[
    ("Can a foreigner buy property in France?",
     "Yes. There is no restriction based on nationality or residence: the process and the costs are the same as for "
     "a French buyer."),
    ("Do I need to come to France to buy?",
     "Not for every step. You can watch the film and a live video tour, often sign the compromis electronically, "
     "and sign the final deed through a power of attorney arranged by the notaire."),
    ("How much are the buying costs?",
     "Mainly the notaire's costs, which are largely taxes: roughly 7 to 8% of the price for an existing property, "
     "less for a new build. The agency fee is shown in every listing."),
    ("Which languages do you speak?", LANGUES_EN),
    ("How much does a valuation cost?",
     "Nothing. The valuation of your property is complimentary and without commitment."),
    ("How can I contact you?",
     "On WhatsApp or by phone at +33 7 67 57 92 28, by email at shawez@gravelin-immo.com, or at the agency, "
     "30 rue Bannelier in Dijon, Monday to Friday, 9am to 7pm."),
  ],
  links=[("All guides for international buyers", "/en/guides/"),
         ("Properties for sale (in French)", "/biens-a-vendre-dijon/"),
         ("Châteaux and prestige homes", "/chateau-a-vendre-bourgogne/"),
         ("Businesses for sale", "/fonds-de-commerce-a-vendre-dijon/"),
         ("Real estate agent in Beaune", "/agent-immobilier-beaune/"),
         ("Property prices in Dijon", "/prix-immobilier-dijon/"),
         ("Agent immobilier à Dijon (français)", "/agent-immobilier-dijon/")],
))

# --------------------------------------------------------------------------------------------- 1. BEAUNE ET LES VILLAGES
guide(
  id="en-beaune", path="/en/buying-a-house-in-beaune/",
  title="Buying a house in Beaune and the Burgundy wine villages",
  description="How to buy a house in Beaune, Nuits-Saint-Georges or Gevrey-Chambertin: what is for sale, real prices, "
              "the checks to make, with an English-speaking agent.",
  label="Guide for international buyers",
  h1="Buying a house in Beaune <em>and the wine villages.</em>",
  h1_plain="Buying a house in Beaune and the wine villages",
  lede="Stone village houses, maisons de maître with walled gardens, winegrowers' houses with a cellar: here is how "
       "buying works in Beaune and along the Côte de Nuits, explained by a local agent who speaks your language.",
  image="/assets/maison-pierre-volets-rouges-beaune.webp", image_alt="Stone house with red shutters near Beaune",
  img_w=720, img_h=900,
  intro="Beaune and the villages of the Côte de Nuits and the Côte de Beaune attract buyers from all over the world, "
        "for the wine, the stone houses and the quality of life. The market is small and good houses rarely stay long "
        "on sale, so it pays to know what to look for before you start.",
  sections=[
    ("what-is-for-sale", "What you find for sale",
     "<ul>"
     "<li><strong>Village houses in stone</strong>, often with a vaulted cellar, a courtyard and a small garden.</li>"
     "<li><strong>Maisons de maître</strong>: larger 19th-century houses with high ceilings, a walled garden and "
     "outbuildings, in Beaune and in the bigger villages.</li>"
     "<li><strong>Winegrowers' houses</strong> (maisons vigneronnes), built around a courtyard, with a cellar and "
     "sometimes a former press house.</li>"
     "<li><strong>Modern houses</strong> on the edge of the villages, easier to heat and to maintain.</li>"
     "<li><strong>Châteaux and estates</strong>, rarer: see "
     + L("/en/buying-a-chateau-in-burgundy/", "buying a château in Burgundy") + ".</li>"
     "</ul>"
     "<p>Vineyard land is a separate, specialised market. The SAFER, the rural land agency, can have a pre-emption "
     "right on agricultural land and vines: when a sale includes them, the notaire checks it.</p>"),
    ("where", "Beaune and the villages around it",
     "<p><strong>Beaune</strong> is the wine capital of Burgundy, with its ramparts, the Hospices and the charity wine "
     "auction held every November. Homes inside the old town are rare; the residential streets around the ramparts "
     "offer more choice.</p>"
     "<p>North of Beaune, the <strong>Côte de Nuits</strong> runs up to Dijon through "
     + L("/immobilier-nuits-saint-georges/", "Nuits-Saint-Georges") + ", Vosne-Romanée, Vougeot, Chambolle-Musigny and "
     + L("/prix-immobilier-gevrey-chambertin/", "Gevrey-Chambertin") + ". South of Beaune, the <strong>Côte de "
     "Beaune</strong> includes Pommard, Volnay, " + L("/prix-immobilier-meursault/", "Meursault") + " and the villages "
     "down to Santenay. Behind the slopes, the <strong>Hautes-Côtes</strong> are quieter and greener.</p>"),
    ("real-prices", "Real prices, not asking prices",
     "<p>In France, the prices actually paid at the notaire's office are public: it is the DVF database, published by "
     "the tax administration a few months after each sale. Listing prices are asking prices, and they are often "
     "higher. Before making an offer, look at the sales really signed around the house: I publish them commune by "
     "commune, for example for " + L("/prix-immobilier-beaune/", "Beaune") + " (in French).</p>"),
    ("checks", "Points to check before you buy",
     "<ul>"
     "<li><strong>The surveys (diagnostics)</strong> provided by the seller: energy rating, asbestos, lead, electrics, "
     "gas, termites where relevant, and the natural risks report (flooding, clay soils and so on).</li>"
     "<li><strong>Drainage</strong>: in the villages, many houses have their own septic system, and its inspection "
     "report is part of the surveys.</li>"
     "<li><strong>Protected areas</strong>: near historic monuments and in protected sectors, exterior works such as "
     "windows, roofs or façades need the approval of the Architectes des Bâtiments de France.</li>"
     "<li><strong>Heating and insulation</strong>: thick stone walls keep the house cool in summer, but large old "
     "houses are expensive to heat. Ask for the actual bills.</li>"
     "<li><strong>Letting plans</strong>: since 2025, homes with the lowest energy rating (G) can no longer be let "
     "on new leases. If you plan to rent the house out, check the rating first.</li>"
     "</ul>"),
    ("how-i-help", "How I help",
     "<p>I am based at the GRAVELIN IMMO agency, 30 rue Bannelier in Dijon, about forty minutes from Beaune by car. "
     "I visit the houses, film them, show them to you live on a WhatsApp video call, negotiate and follow the file "
     "with the notaire until you get the keys. " + LANGUES_EN + "</p>"),
  ],
  faq=[
    ("Do you work in Beaune and the villages?",
     "Yes: Beaune, the Côte de Nuits, the Côte de Beaune and the Hautes-Côtes. I am based in Dijon, about forty "
     "minutes away."),
    ("Can I buy a house with vines?",
     "Vineyard land is a specialised market and the SAFER can have a pre-emption right on it. A house with a garden "
     "or a courtyard is a simple purchase; when vines are included, the notaire checks the SAFER's rights before "
     "the sale."),
    ("How fast do houses sell around Beaune?",
     "The market is small, and good houses at the right price can go quickly. That is why I send the film to buyers "
     "as soon as a property comes in, so they can decide fast."),
    ("Who pays the agency fee?",
     "The listing says it: the seller or the buyer. The fee is only due if the sale actually goes through."),
  ],
  links=[("English-speaking agent in Dijon", "/en/"),
         ("Buying a château in Burgundy", "/en/buying-a-chateau-in-burgundy/"),
         ("French property buying costs", "/en/french-property-buying-costs/"),
         ("Buying from abroad", "/en/buying-property-in-france-from-abroad/"),
         ("Agent immobilier à Beaune (français)", "/agent-immobilier-beaune/")],
)

# --------------------------------------------------------------------------------------------- 2. CHÂTEAU
guide(
  id="en-chateau", path="/en/buying-a-chateau-in-burgundy/",
  title="Buying a château in Burgundy: what to check first",
  description="Roof, heating, listed status, land and running costs: what to check before buying a château or a "
              "manor house in Burgundy, from a local agent.",
  label="Guide for international buyers",
  h1="Buying a château in Burgundy: <em>what to check first.</em>",
  h1_plain="Buying a château in Burgundy: what to check first",
  lede="A château is a dream purchase, and a big building to look after. Here are the points I check with my buyers "
       "before an offer, from the roof to the running costs.",
  image="/assets/chateau-xixe-parc-topiaires.webp", image_alt="19th-century château with a topiary park in Burgundy",
  img_w=720, img_h=900,
  intro="In France, the word château covers very different properties: a medieval fortress, an 18th-century "
        "residence, a 19th-century country house with a park, or a manor (manoir, gentilhommière). Burgundy has many "
        "of them, often sold with outbuildings and land. Here is what to check before you fall in love.",
  sections=[
    ("structure", "The building: roof, walls, timber",
     "<ul>"
     "<li><strong>The roof</strong> comes first: slate or tiles over large surfaces, gutters, chimneys. Ask when it "
     "was last redone, and for the invoices.</li>"
     "<li><strong>Walls and damp</strong>: look at the cellars, the base of the walls and the ground-floor rooms.</li>"
     "<li><strong>Timber</strong>: beams, floors and roof frames. The termite report is compulsory in the areas "
     "designated by the prefecture.</li>"
     "<li><strong>Windows and drainage</strong>: often the second budget after the roof.</li>"
     "</ul>"
     "<p>For a large or old building, have it inspected by a specialist, an architect or a building surveyor, before "
     "signing the compromis, or agree with the seller on a condition in it.</p>"),
    ("listed", "Listed buildings and protected surroundings",
     "<p>A château can be listed as a historic monument (classé or inscrit). Works then require an authorisation and, "
     "for a classified monument, the supervision of the heritage services. Around a historic monument, exterior works "
     "also need the approval of the Architectes des Bâtiments de France. Specific tax rules exist for owners of "
     "historic monuments: your notaire or a tax adviser will tell you whether they apply.</p>"),
    ("running-costs", "Running costs",
     "<ul>"
     "<li><strong>Heating</strong> large volumes: ask for the actual consumption over several winters.</li>"
     "<li><strong>Property tax</strong> (taxe foncière): ask for the last notice.</li>"
     "<li><strong>Insurance</strong> for a historic building and its outbuildings.</li>"
     "<li><strong>The park and the land</strong>: mowing, trees, walls, ponds.</li>"
     "<li><strong>Maintenance</strong>: a reserve every year, for the roof, the windows and the unexpected.</li>"
     "</ul>"),
    ("uses", "Living there, letting, receiving guests",
     "<p>Many owners combine a family home with gîtes, guest rooms (chambres d'hôtes) or events such as weddings. "
     "Before you buy with that plan, check the local planning rules with the town hall, and the safety and "
     "accessibility rules for buildings open to the public. Income from guests can help with the costs, but it has to "
     "be studied with real figures, not hopes.</p>"),
    ("how-i-help", "How I help",
     "<p>Every château I sell is filmed and photographed, with drone views of the roof, the park and the land, so you "
     "can judge it before travelling. I visit with you or for you, I gather the documents (surveys, invoices, tax "
     "notices) and I follow the sale with the notaire. "
     + L("/chateau-a-vendre-bourgogne/", "Châteaux and prestige homes for sale") + " (in French).</p>"),
  ],
  faq=[
    ("Can a foreigner buy a château in France?",
     "Yes, on the same terms as a French buyer. If the property includes agricultural land or woods, the notaire "
     "checks the pre-emption rights that may apply."),
    ("Do French banks lend to non-residents?",
     "Many do, usually with stricter conditions, such as a larger personal contribution. A mortgage broker can "
     "compare offers for you."),
    ("Is a château a good investment?",
     "It is above all a lifestyle purchase. The running costs are high, so look at the whole budget, the price, the "
     "works and the yearly costs, before deciding."),
    ("Can I visit by video first?",
     "Yes. I send the film, then I can walk you through the château live on a WhatsApp video call, room by room."),
  ],
  links=[("Châteaux for sale in Burgundy (in French)", "/chateau-a-vendre-bourgogne/"),
         ("Buying a house in Beaune", "/en/buying-a-house-in-beaune/"),
         ("French property buying costs", "/en/french-property-buying-costs/"),
         ("Buying from abroad", "/en/buying-property-in-france-from-abroad/"),
         ("English-speaking agent in Dijon", "/en/")],
)

# --------------------------------------------------------------------------------------------- 3. FRAIS D'ACHAT
guide(
  id="en-costs", path="/en/french-property-buying-costs/",
  title="French property buying costs explained (notaire, agency)",
  description="What you pay on top of the price when you buy a home in France: the notaire's costs and taxes, the "
              "agency fee, mortgage costs, then the yearly property tax.",
  label="Guide for international buyers",
  h1="French property buying costs, <em>explained simply.</em>",
  h1_plain="French property buying costs, explained simply",
  lede="The price in the listing is not the whole bill. Here is what a buyer pays in France, who receives it, and "
       "which amounts are set by law.",
  image="/assets/shawez-ali-explique-prix-m2-dijon.webp", image_alt="Shawez Ali explaining property prices in Dijon",
  img_w=512, img_h=640,
  intro="When you buy a home in France, three kinds of costs come on top of the price: the notaire's costs, which are "
        "mostly taxes, the agency fee when an agency is involved, and the costs of your mortgage if you borrow. After "
        "the purchase, the owner pays a yearly property tax.",
  sections=[
    ("notaire", "The notaire's costs (frais de notaire)",
     "<p>Everyone calls them notaire's fees, but most of the amount is made of transfer taxes collected for the State "
     "and the local authorities. The notaire's own remuneration is set by law and is the smaller part.</p>"
     "<ul>"
     "<li><strong>Existing property</strong> (ancien): roughly 7 to 8% of the price.</li>"
     "<li><strong>New build</strong> (neuf, including off-plan): roughly 2 to 3% of the price.</li>"
     "</ul>"
     "<p>Example: for an existing house bought at 300,000 €, the notaire's costs come to about 21,000 to 24,000 €. "
     "Your notaire gives you the exact figure before the signing.</p>"),
    ("agency", "The agency fee",
     "<p>Each agency sets its own fee scale and must display it. The listing states who pays the fee, the seller or "
     "the buyer; when the buyer pays it, the listing shows the price with and without the fee. The fee is only due "
     "if the sale actually goes through. Our scale is on the " + L("/honoraires/", "fees page") + " (in French).</p>"),
    ("surveys", "The surveys (diagnostics)",
     "<p>The mandatory surveys are paid by the seller and attached to the contract. If you want a full building "
     "survey on top of them, it is at your expense, and it is a good idea for an old or large property.</p>"),
    ("mortgage", "If you borrow",
     "<p>A mortgage adds the bank's arrangement fee, the cost of the guarantee (a guarantee company or a mortgage "
     "registered by the notaire) and borrower insurance, which French banks require in practice. A mortgage broker "
     "can compare these costs for you.</p>"),
    ("after", "After the purchase",
     "<ul>"
     "<li><strong>Property tax</strong> (taxe foncière): paid every year by the owner. Ask for the seller's last "
     "notice.</li>"
     "<li><strong>Taxe d'habitation</strong>: it no longer exists for main homes, but it still applies to second "
     "homes.</li>"
     "<li><strong>Co-ownership charges</strong> in an apartment building: ask for the minutes of the last general "
     "meetings and the yearly budget.</li>"
     "</ul>"),
  ],
  faq=[
    ("Are the notaire's costs negotiable?",
     "The taxes are not: they are set by law. The notaire's own fee is also regulated, so the total varies very "
     "little from one notaire to another."),
    ("Who pays the agency fee in France?",
     "It depends on the listing: the seller or the buyer. The listing says it clearly, and the fee is only due if "
     "the sale goes through."),
    ("Do I lose the deposit if I withdraw?",
     "For a home, a private buyer can withdraw within the 10-day cooling-off period and gets the deposit back. After "
     "that, the conditions written in the compromis apply, for example if your mortgage is refused."),
    ("Is there VAT on an existing home?",
     "No. VAT applies to new builds and is included in their price; an existing home bought from a private seller "
     "has no VAT, only the transfer taxes."),
  ],
  links=[("English-speaking agent in Dijon", "/en/"),
         ("Buying from abroad", "/en/buying-property-in-france-from-abroad/"),
         ("Buying a house in Beaune", "/en/buying-a-house-in-beaune/"),
         ("Agency fees (in French)", "/honoraires/")],
)

# --------------------------------------------------------------------------------------------- 4. ACHETER DEPUIS L'ÉTRANGER
guide(
  id="en-abroad", path="/en/buying-property-in-france-from-abroad/",
  title="Buying property in France from abroad: how it works",
  description="Video tours, electronic signature, power of attorney, payments through the notaire: how to buy a home "
              "in Burgundy without flying in for every step.",
  label="Guide for international buyers",
  h1="Buying in France <em>from abroad.</em>",
  h1_plain="Buying in France from abroad",
  lede="Most of my international buyers come to France once, to see the property they have already chosen. Here is "
       "how the rest is done from home, safely.",
  image="/assets/shawez-ali-depart-visite-dijon.webp", image_alt="Shawez Ali leaving for a property visit in Dijon",
  img_w=720, img_h=900,
  intro="Buying a property in another country feels risky. In France, the process is closely framed: a notaire, a "
        "public officer, handles the contract and the money, and every step is in writing. With good videos and a "
        "reliable agent on site, you can do most of it from where you live.",
  sections=[
    ("shortlist", "Choosing without travelling",
     "<p>Every property I sell has its film, its photos and its virtual home staging. Once you have shortlisted, I "
     "visit for you and show you the property live on a WhatsApp video call: the light, the noise, the view, the "
     "cellar and the roof. I also tell you what a film does not show, such as the street, the parking or works "
     "planned next door.</p>"),
    ("offer", "The offer and the compromis",
     "<p>Your offer is made in writing, and an email is enough to start. Once it is accepted, the compromis de vente "
     "is prepared and can often be signed electronically. The 10-day cooling-off period starts after you receive the "
     "signed contract.</p>"),
    ("money", "Paying safely",
     "<p>In France, the money for a purchase goes through the notaire: the balance is transferred to the notaire's "
     "account, never to the seller or to the agency. Before any transfer, always confirm the bank details by phone "
     "with the notaire's office: fraudsters send fake emails with false bank details. The notaire and the agent must "
     "also check your identity and the origin of the funds, as required by anti-money-laundering rules, so have your "
     "bank statements ready.</p>"),
    ("signing", "Signing without coming",
     "<p>If you cannot travel for the final deed, the notaire prepares a power of attorney, and someone from the "
     "notaire's office signs on your behalf. The notaire tells you which form is needed and where to sign it, and in "
     "some cases the signing can be organised remotely by video.</p>"),
    ("after", "After the keys",
     "<p>Insure the home from the day you own it; in an apartment building, liability insurance is compulsory. "
     "Transfer the utilities, keep the notaire's documents, and plan for the property tax, due every autumn.</p>"),
  ],
  faq=[
    ("Do I need a French bank account to buy?",
     "Not to buy: the funds are transferred to the notaire. For the running costs, a French or euro account is "
     "practical."),
    ("Can the whole purchase be done remotely?",
     "In many cases, yes: video visits, electronic signature of the compromis and a power of attorney for the deed. "
     "Most buyers still come once, to see the property before committing."),
    ("How do I know the agency is genuine?",
     "In France, an agency must hold a professional licence (carte professionnelle) and show it on its documents. "
     "GRAVELIN IMMO is at 30 rue Bannelier in Dijon: you can call the agency or visit it."),
    ("Which languages can we use?", LANGUES_EN),
  ],
  links=[("English-speaking agent in Dijon", "/en/"),
         ("French property buying costs", "/en/french-property-buying-costs/"),
         ("Buying a château in Burgundy", "/en/buying-a-chateau-in-burgundy/"),
         ("Living in Dijon", "/en/living-in-dijon/")],
)

# --------------------------------------------------------------------------------------------- 5. VIVRE À DIJON
guide(
  id="en-living", path="/en/living-in-dijon/",
  title="Living in Dijon: a property guide for newcomers",
  description="Neighbourhoods, transport and real prices: what newcomers should know before buying or renting a home "
              "in Dijon, from a local English-speaking agent.",
  label="Guide for newcomers",
  h1="Living in Dijon: <em>a guide for newcomers.</em>",
  h1_plain="Living in Dijon: a guide for newcomers",
  lede="A historic city of human size, an hour and a half from Paris, with vineyards at its gates: here is how to "
       "choose your area in Dijon, from someone who sells homes there.",
  image="/assets/dijon-eglise-saint-michel.webp", image_alt="Saint-Michel church in the historic centre of Dijon",
  img_w=720, img_h=900,
  intro="Dijon is the capital of Burgundy and of the Bourgogne-Franche-Comté region. People move here for a job, for "
        "the university, for the quality of life or for the wine country nearby. Here are the main areas, the "
        "practical points and where to find the real prices.",
  sections=[
    ("areas", "The main areas",
     "<ul>"
     "<li><strong>The historic centre</strong>: the Palace of the Dukes, Les Halles market, the owl trail and "
     "pedestrian streets. Mostly apartments in old buildings, many in a protected sector.</li>"
     "<li><strong>Montchapet and the west of the city</strong>: residential streets, houses and family apartments, "
     "close to the centre.</li>"
     "<li><strong>République and the east</strong>: around the Place de la République, with apartment buildings and "
     "quick access to the tram.</li>"
     "<li><strong>The university area</strong>, in the east of the city: student flats and investment apartments.</li>"
     "<li><strong>The suburbs</strong>: " + L("/immobilier-fontaine-les-dijon/", "Fontaine-lès-Dijon") + " and "
     + L("/prix-immobilier-talant/", "Talant") + " for a village feel on the hills; Chenôve, Quetigny, "
     "Chevigny-Saint-Sauveur or Saint-Apollinaire for more space and gardens.</li>"
     "</ul>"),
    ("transport", "Getting around",
     "<p>Dijon has two tram lines and a bus network run by Divia, and many residents cycle. The TGV reaches Paris in "
     "about an hour and a half, and motorways lead towards Paris, Lyon and Switzerland. Beaune and the vineyards are "
     "about forty minutes away by car.</p>"),
    ("rent-or-buy", "Renting first, or buying straight away",
     "<p>Many newcomers rent for a few months before buying, to get to know the areas. The rentals I let are on the "
     + L("/location-immobiliere-dijon/", "renting page") + " (in French), and I can help you buy when you are ready. "
     "If you already know what you want, I can show you properties by video before you arrive.</p>"),
    ("prices", "Real prices",
     "<p>Asking prices are not sale prices. The prices actually paid at the notaire's, from the official DVF data, "
     "are on my price pages: " + L("/prix-immobilier-dijon/", "prices in Dijon") + " and "
     + L("/prix-immobilier-cote-d-or/", "prices in the Côte-d'Or") + " (in French).</p>"),
    ("daily-life", "Daily life",
     "<p>Dijon is known for its food and wine: the covered market of Les Halles, the Cité internationale de la "
     "gastronomie et du vin, opened in 2022, and the vineyards of the Côte de Nuits starting at the edge of the city. "
     "The historic centre is part of the Climats of Burgundy, a UNESCO World Heritage site.</p>"),
  ],
  faq=[
    ("Is Dijon a good place to buy?",
     "It depends on your plan and your budget. Look at the real sales in the area you like, and visit at different "
     "times of the day before deciding."),
    ("Which area suits a family?",
     "Families often look at the west of Dijon, Fontaine-lès-Dijon, Talant or the eastern suburbs, for space and "
     "gardens. The right choice depends on your work and your budget: let's talk about it."),
    ("Can you help me rent before buying?",
     "Yes. The rentals I let are on the renting page, and when you are ready to buy, I help you find and negotiate "
     "your home."),
    ("Do you speak my language?", LANGUES_EN),
  ],
  links=[("English-speaking agent in Dijon", "/en/"),
         ("Buying from abroad", "/en/buying-property-in-france-from-abroad/"),
         ("Investing in rental property in Dijon", "/en/rental-investment-dijon/"),
         ("Prices in Dijon (in French)", "/prix-immobilier-dijon/")],
)

# --------------------------------------------------------------------------------------------- 6. INVESTISSEMENT LOCATIF
guide(
  id="en-invest", path="/en/rental-investment-dijon/",
  title="Investing in rental property in Dijon: a practical guide",
  description="Student flats, family apartments, furnished lets and energy rules: what an investor should know before "
              "buying a rental property in Dijon.",
  label="Guide for investors",
  h1="Investing in rental property <em>in Dijon.</em>",
  h1_plain="Investing in rental property in Dijon",
  lede="Dijon is a university city and a regional capital, with tenants of every kind. The difference between a good "
       "and a bad investment is in the details, and the details are here.",
  image="/assets/appartement-centre-historique-dijon-salon.webp",
  image_alt="Living room of an apartment in the historic centre of Dijon", img_w=720, img_h=900,
  intro="Investors look at Dijon for its students, its hospitals and administrations, and for prices lower than in "
        "the largest French cities. Before you buy, check four things: the tenant you are targeting, the energy "
        "rating, the tax regime and who will manage the property.",
  sections=[
    ("tenants", "Which tenant are you targeting?",
     "<ul>"
     "<li><strong>Students</strong>: studios and one-bedroom flats near the campus or the tram, often furnished.</li>"
     "<li><strong>Young professionals</strong>: well-located one- and two-bedroom apartments in the centre or near "
     "the station.</li>"
     "<li><strong>Families</strong>: larger apartments and houses, longer leases, fewer changes of tenant.</li>"
     "</ul>"),
    ("energy", "The energy rating decides what you can let",
     "<p>Since 2025, homes rated G on the energy performance certificate (DPE) can no longer be let on new leases. "
     "Homes rated F follow in 2028, and those rated E in 2034. Before you buy, check the rating, and if works are "
     "needed, include them in your budget.</p>"),
    ("tax", "Furnished or unfurnished",
     "<p>Furnished lettings have their own tax rules in France, different from unfurnished ones, and these rules "
     "change regularly. Have your project checked by a French accountant before you buy: the right regime can change "
     "your net return.</p>"),
    ("management", "Who will manage it?",
     "<p>I find the tenant, prepare the lease and do the check-in inventory; I do not manage properties day to day. "
     "If you live abroad, you can manage it yourself with online tools or appoint a property manager. Decide before "
     "you buy, because it changes your net return.</p>"),
    ("prices", "Real prices and rents",
     "<p>Buy on real sale prices, not asking prices: the notarised sales are on my "
     + L("/prix-immobilier-dijon/", "price pages") + ". For rents, compare with the rentals actually on the market and "
     "with my " + L("/estimation-loyer-dijon/", "rent estimate") + " (in French).</p>"),
  ],
  faq=[
    ("Can a non-resident invest in rental property in France?",
     "Yes. Rental income from a French property is generally taxable in France, and a tax treaty may apply depending "
     "on your country: ask a French accountant."),
    ("Is Dijon a rent-controlled area?",
     "Rent rules depend on the commune and change over time: I check them for each property before you buy."),
    ("Do you manage rental properties?",
     "No. I find the tenant, prepare the lease and do the check-in, then you or a property manager take over."),
    ("What budget do I need?",
     "It depends on the type of flat and the area. Tell me your budget and your target tenant, and I will show you "
     "what it buys, with the real prices."),
  ],
  links=[("English-speaking agent in Dijon", "/en/"),
         ("Living in Dijon", "/en/living-in-dijon/"),
         ("French property buying costs", "/en/french-property-buying-costs/"),
         ("Rent estimate (in French)", "/estimation-loyer-dijon/")],
)

# Éléments fixes du gabarit français, traduits page par page.
FIXE = {
  "en": [('<html lang="fr"', '<html lang="en"'),
         ('aria-label="Fil d\'Ariane"', 'aria-label="Breadcrumb"'),
         ('<li><a href="/">Accueil</a></li>', '<li><a href="/">Home</a></li>'),
         ('<span>Par Shawez Ali</span><span>Mis à jour le ', '<span>By Shawez Ali</span><span>Updated '),
         ('<summary>Sommaire</summary>', '<summary>Contents</summary>'),
         ('<li><a href="#questions">Questions fréquentes</a></li>', '<li><a href="#questions">Frequently asked questions</a></li>'),
         ('<h2 id="questions">Questions fréquentes</h2>', '<h2 id="questions">Frequently asked questions</h2>')],
}


def post(root):
    """Traduit les éléments fixes du gabarit, règle la langue et ajoute les langues parlées dans les données."""
    for p in P:
        f = os.path.join(root, p['path'].strip('/'), 'index.html')
        h = open(f, encoding='utf-8').read()
        for a, b in FIXE[p['lang']]:
            assert a in h, (f, a)
            h = h.replace(a, b, 1)
        h = re.sub(r'(<meta property="og:locale" content=")[^"]*(")', lambda m: m.group(1) + p['locale'] + m.group(2), h, count=1)
        m = re.search(r'<script type="application/ld\+json">(.*?)</script>', h, re.S)
        d = json.loads(m.group(1))
        for n in d['@graph']:
            if n.get('@type') in ('WebPage', 'FAQPage', 'Article'):
                n['inLanguage'] = p['lang']
            if n.get('@type') == 'BreadcrumbList':
                n['itemListElement'][0]['name'] = 'Home'
            if n.get('@type') == 'Person':
                n['knowsLanguage'] = LANGUES
                if isinstance(n.get('contactPoint'), dict):
                    n['contactPoint']['availableLanguage'] = LANGUES
        ld = json.dumps(d, ensure_ascii=False)
        h = h[:m.start(1)] + ld + h[m.end(1):]
        open(f, 'w', encoding='utf-8').write(h)
        print('post', p['path'])


if __name__ == '__main__':
    if sys.argv[1] == '--post':
        post(sys.argv[2])
    else:
        json.dump(P, open(sys.argv[1], 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

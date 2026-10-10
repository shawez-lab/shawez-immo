/* Pages « Biens à vendre » : /biens/ (la liste), /biens/<ville>-<type>-<réf>/ (la fiche), /biens/sitemap.xml.
   Rendues à la demande depuis la table D1 « biens » (functions/_lib/biens.js), dans l'habillage du site
   (/assets/biens-gabarit.html, fabriqué par outils/biens.py). Une fiche n'existe (statut 200, indexable) que si
   toutes ses mentions obligatoires sont saisies ; sinon 404. Aperçu pour l'agence : ?apercu=1 avec la session admin. */
import { db, compteSession, estAdmin } from '../_lib/base.js';
import { introuvable } from '../_lib/interne.js';
import {
  baseBiens, synchroniser, manque, visible, slug, urlBien, estTerrain, nettoyerDescription, honorairesTexte, compter, robot,
  esc, euros, LETTRES, TEL, TEL_AFFICHE, WHATSAPP,
} from '../_lib/biens.js';

const SITE = 'https://shawez-immo.com';

export async function onRequestGet(context) {
  const { request, env, params } = context;
  const url = new URL(request.url);
  const morceaux = [].concat(params.path || []).filter(Boolean);
  try {
    await db(env);
    const B = await baseBiens(env.DB);
    await synchroniser(env, url.origin);
    const tous = (await B.prepare('SELECT * FROM biens').all()).results || [];
    if (morceaux.length === 0) return page(env, url, liste(tous.filter((b) => visible(b))));
    if (morceaux.length === 1 && morceaux[0] === 'sitemap.xml') return sitemap(tous.filter((b) => visible(b)));
    if (morceaux.length !== 1) return introuvable(context);
    if (!url.pathname.endsWith('/')) return Response.redirect(`${url.origin}${url.pathname}/${url.search}`, 301);
    const b = tous.find((x) => slug(x) === morceaux[0]);
    if (!b) return introuvable(context);
    let apercu = null;
    if (!visible(b)) {
      if (url.searchParams.get('apercu') !== '1') return introuvable(context);
      const c = await compteSession(request, env);
      if (!estAdmin(c, env)) return introuvable(context);
      apercu = manque(b);
    } else if (!robot(request)) {
      context.waitUntil(compter(env, b.id, 'vue').catch(() => {}));
    }
    return page(env, url, fiche(b, apercu));
  } catch (e) {
    console.log('erreur pages biens', e && e.stack);
    return introuvable(context);
  }
}

/* ---------- Habillage ---------- */
async function page(env, url, p) {
  const r = await env.ASSETS.fetch(new URL('/assets/biens-gabarit.html', url.origin));
  let s = await r.text();
  const canon = SITE + p.chemin;
  const rep = {
    '__TITRE__': esc(p.titre), '__DESCRIPTION__': esc(p.description), '__CANONICAL__': canon, '__ROBOTS__': p.robots || 'index,follow,max-image-preview:large',
    '__IMAGE__': p.image ? SITE + p.image : `${SITE}/hero-poster.webp`, '__ROUTE__': p.route,
  };
  for (const [k, v] of Object.entries(rep)) s = s.split(k).join(v);
  s = s.replace('<!--BIENS-JSONLD-->', p.jsonld ? `<script type="application/ld+json">${JSON.stringify(p.jsonld).replace(/</g, '\\u003c')}</script>` : '');
  s = s.replace('<!--BIENS-MAIN-->', p.main);
  return new Response(s, {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': p.prive ? 'no-store' : 'public, max-age=300',
      ...(p.prive ? { 'x-robots-tag': 'noindex, nofollow' } : {}),
    },
  });
}

const photo = (b, f) => `/annonces/${encodeURIComponent(b.id)}/${encodeURIComponent(f)}`;
const photos = (b) => { try { return JSON.parse(b.photos || '[]'); } catch (e) { return []; } };
const premiere = (b) => (photos(b).length ? `/annonces/${encodeURIComponent(b.id)}/1-600.webp` : null);
function etiquettes(b) { try { return JSON.parse(b.etiquettes || '[]'); } catch (e) { return []; } }
const resume = (b) => [b.surface ? `${String(b.surface).replace('.', ',')} m²` : '', b.pieces ? `${b.pieces} pièce${b.pieces > 1 ? 's' : ''}` : '', b.chambres ? `${b.chambres} chambre${b.chambres > 1 ? 's' : ''}` : ''].filter(Boolean).join(' · ');
const titreBien = (b) => `${b.type} à ${b.commune}${b.surface ? ` — ${String(b.surface).replace('.', ',')} m²` : ''}`;

function carte(b) {
  const img = premiere(b);
  const sous = etiquettes(b).find((e) => /sous-offre|accord/i.test(e));
  return `<li class="bv-carte"><a href="${urlBien(b)}">
  <span class="bv-img">${img ? `<img src="${img}" alt="${esc(titreBien(b))}" loading="lazy" decoding="async" width="600" height="400">` : ''}${sous ? '<span class="bv-badge">Sous offre</span>' : ''}</span>
  <span class="bv-txt"><b class="bv-prix">${esc(euros(b.prix))}</b><span class="bv-t">${esc(b.type)} · ${esc(b.commune)}</span><span class="bv-r">${esc(resume(b))}</span></span>
</a></li>`;
}

function liste(biens) {
  biens.sort((a, b) => String(b.premier_le || '').localeCompare(String(a.premier_le || '')));
  const main = `
<section class="shell bv-tete">
  <p class="label">Biens à vendre</p>
  <h1>Les biens à vendre <em>avec Shawez.</em></h1>
  <p class="bv-chapo">Dijon, son agglomération, la Côte de Nuits et Beaune. Chaque bien a sa fiche complète ; pour visiter, choisissez un créneau, je vous rappelle au plus vite pour le confirmer.</p>
</section>
<section class="shell">
  ${biens.length ? `<ul class="bv-grille">${biens.map(carte).join('\n')}</ul>`
    : `<div class="bv-vide"><p><b>Les fiches arrivent.</b> Chaque bien est publié ici dès que toutes ses informations obligatoires (DPE, honoraires, copropriété) sont vérifiées.</p><p>En attendant, dites-moi ce que vous cherchez : je vous envoie les biens qui correspondent.</p></div>`}
  <div class="bv-actions">
    <a class="btn btn-primary" href="https://wa.me/${WHATSAPP}?text=${encodeURIComponent('Bonjour Shawez, je cherche un bien à acheter : ')}" data-mesure-lien="whatsapp">Me dire ce que vous cherchez (WhatsApp)</a>
    <a class="btn" href="tel:${TEL}">Appeler ${TEL_AFFICHE}</a>
  </div>
  <aside class="bv-similaire"><p class="label">Vous vendez ?</p><h2>Vous avez un bien à vendre ?</h2><p>Votre fourchette de prix en 2 minutes, calculée sur les ventes réelles autour de chez vous.</p><a class="btn btn-primary" href="/estimer/">Estimer mon bien</a></aside>
</section>`;
  return {
    chemin: '/biens/', route: '/biens', titre: 'Biens à vendre à Dijon et en Côte-d\'Or — Shawez Ali', main,
    description: 'Appartements, maisons et terrains à vendre à Dijon, dans l\'agglomération, en Côte de Nuits et à Beaune, avec Shawez Ali, agent immobilier chez Gravelin Immo.',
    image: biens[0] ? premiere(biens[0]) : null,
    jsonld: {
      '@context': 'https://schema.org', '@type': 'ItemList', name: 'Biens à vendre avec Shawez Ali',
      itemListElement: biens.map((b, i) => ({ '@type': 'ListItem', position: i + 1, url: SITE + urlBien(b), name: titreBien(b) })),
    },
  };
}

const COULEURS = { A: '#009C6D', B: '#52B153', C: '#A5CC74', D: '#F4E70F', E: '#F0B50F', F: '#EB8235', G: '#D7221F' };
function echelle(nom, lettre, valeur) {
  return `<div class="bv-dpe" role="img" aria-label="${esc(nom)} : classe ${esc(lettre)}"><span class="bv-dpe-n">${esc(nom)}</span><span class="bv-dpe-l">${LETTRES.map((l) => `<span class="${l === lettre ? 'on' : ''}" style="background:${COULEURS[l]}">${l}</span>`).join('')}</span>${valeur ? `<span class="bv-dpe-v">${esc(valeur)}</span>` : ''}</div>`;
}

function fiche(b, apercu) {
  const ph = photos(b);
  const titre = titreBien(b);
  const desc = nettoyerDescription(b.description);
  const url = urlBien(b);
  const lesFaits = [
    ['Prix', euros(b.prix) + (b.honoraires_charge === 'acquereur' ? ' honoraires inclus' : '')],
    ['Type', b.type], ['Ville', `${b.commune}${b.cp ? ` (${b.cp})` : ''}`],
    b.surface ? ['Surface', `${String(b.surface).replace('.', ',')} m²`] : null,
    b.pieces ? ['Pièces', b.pieces] : null, b.chambres ? ['Chambres', b.chambres] : null,
  ].filter(Boolean);
  let energie = '';
  if (!estTerrain(b)) {
    if (b.dpe === 'vierge' || b.dpe === 'non_soumis') energie = `<p>${b.dpe === 'vierge' ? 'DPE vierge.' : 'Bien non soumis au DPE.'}</p>`;
    else {
      energie = echelle('Énergie (DPE)', b.dpe, b.dpe_kwh ? `${b.dpe_kwh} kWh/m²/an` : '') + echelle('Climat (GES)', b.ges, b.ges_kg ? `${b.ges_kg} kg CO₂/m²/an` : '');
      energie += `<p>Montant estimé des dépenses annuelles d'énergie pour un usage standard : entre ${esc(euros(b.energie_min))} et ${esc(euros(b.energie_max))} par an, prix moyens des énergies indexés au 1<sup>er</sup> janvier ${esc(b.energie_annee)}.</p>`;
      if (b.dpe === 'F' || b.dpe === 'G') energie += '<p><b>Logement à consommation énergétique excessive</b> (classe ' + esc(b.dpe) + ').</p>';
    }
  }
  const copro = b.copro === 1
    ? `<p>Bien en copropriété : ${esc(b.copro_lots)} lots. Charges courantes : ${esc(euros(b.copro_charges))} par an en moyenne (quote-part du vendeur). ${b.copro_procedure === 'procédure en cours' ? 'Une procédure est en cours contre le syndicat des copropriétaires.' : 'Pas de procédure en cours contre le syndicat des copropriétaires.'}</p>`
    : '';
  const video = b.video
    ? `<figure class="bv-video"><button type="button" class="bv-lire" data-video="${esc(b.video)}" aria-label="Lire la vidéo du bien">${b.video_affiche ? `<img src="${esc(b.video_affiche)}" alt="" loading="lazy" width="360" height="640">` : ''}<span class="bv-play" aria-hidden="true">▶</span><span class="bv-lire-t">Voir la vidéo</span></button></figure>` : '';
  const wa = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(`Bonjour Shawez, je souhaite visiter le bien réf. ${b.id} (${b.type} à ${b.commune}) : ${SITE}${url}`)}`;
  const carteUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${b.commune} ${b.cp || ''}`)}`;
  const main = `
${apercu ? `<div class="bv-apercu" role="status"><b>Aperçu agence — fiche NON publiée.</b> Il manque : ${esc(apercu.join(', ') || '—')}. Complétez dans <a href="/admin/biens/">/admin/biens/</a>.</div>` : ''}
<article class="bv-fiche" data-bien="${esc(b.id)}">
  <nav class="shell bv-fil" aria-label="Fil d'Ariane"><a href="/">Accueil</a> › <a href="/biens/">Biens à vendre</a> › <span>${esc(b.type)} à ${esc(b.commune)}</span></nav>
  <div class="bv-galerie" role="region" tabindex="0" aria-label="Photos du bien (faire défiler)">
    ${ph.map((f, i) => `<img src="${i === 0 ? premiere(b) : photo(b, f)}" ${i === 0 ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async" alt="${esc(titre)} — photo ${i + 1} sur ${ph.length}" width="1200" height="800">`).join('\n    ')}
  </div>
  <p class="shell bv-nbph">${ph.length} photo${ph.length > 1 ? 's' : ''} — faites glisser pour les voir</p>
  <div class="shell bv-corps">
    <div class="bv-principal">
      <p class="label">Réf. ${esc(b.id)}</p>
      <h1>${esc(b.type)} à ${esc(b.commune)}</h1>
      <p class="bv-prix-g">${esc(euros(b.prix))}</p>
      <p class="bv-resume">${esc(resume(b))}</p>
      <div class="bv-cta">
        <a class="btn btn-primary btn-lg" href="#visiter" data-mesure="visite_clic">Visiter ce bien</a>
        <a class="btn" href="${wa}" data-mesure-lien="whatsapp">WhatsApp</a>
        <a class="btn" href="tel:${TEL}" data-mesure-lien="tel">Appeler</a>
      </div>
      ${video}
      <h2>Le bien</h2>
      <p class="bv-desc">${esc(desc)}</p>
      <dl class="bv-faits">${lesFaits.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
      ${energie ? `<h2>Énergie</h2>${energie}` : ''}
      ${copro ? `<h2>Copropriété</h2>${copro}` : ''}
      <h2>Prix et honoraires</h2>
      <p>Prix : ${esc(euros(b.prix))}${b.honoraires_charge === 'acquereur' ? ' honoraires inclus' : ''}. ${esc(honorairesTexte(b))} <a class="link" href="/honoraires/">Barème des honoraires</a>.</p>
      <h2>Le secteur</h2>
      <p>${esc(b.commune)}${b.cp ? ` (${esc(b.cp)})` : ''}. L'adresse exacte est donnée à la visite. <a class="link" href="${carteUrl}" rel="noopener" target="_blank">Voir le secteur sur la carte</a>.</p>
      <p class="bv-petit">Les informations sur les risques auxquels ce bien est exposé sont disponibles sur le site Géorisques : <a class="link" href="https://www.georisques.gouv.fr" rel="noopener" target="_blank">www.georisques.gouv.fr</a>.</p>
      <p class="bv-petit">Annonce publiée par Shawez Ali, agent commercial immobilier de GRAVELIN IMMO, 30 rue Bannelier, 21000 Dijon.</p>
    </div>
    <aside class="bv-cote" id="visiter" aria-labelledby="visiter-t">
      <h2 id="visiter-t">Visiter ce bien</h2>
      <p class="bv-petit">1. Choisissez un créneau. 2. Laissez votre prénom et votre téléphone. Je vous rappelle au plus vite pour confirmer.</p>
      <div class="bv-creneaux" data-creneaux><p class="bv-petit">Chargement des créneaux…</p></div>
      <form class="bv-form" data-visite hidden novalidate>
        <p class="bv-choisi" data-choisi></p>
        <label>Prénom <input name="prenom" autocomplete="given-name" required maxlength="60"></label>
        <label>Téléphone <input name="telephone" type="tel" autocomplete="tel" inputmode="tel" required maxlength="30"></label>
        <label>E-mail (facultatif) <input name="email" type="email" autocomplete="email" maxlength="160"></label>
        <label class="bv-cache" aria-hidden="true">Site web <input name="site_web" tabindex="-1" autocomplete="off"></label>
        <label class="bv-consent"><input type="checkbox" name="consentement" required> J'accepte d'être recontacté au sujet de ce bien. <a class="link" href="/politique-de-confidentialite/">Confidentialité</a></label>
        <button class="btn btn-primary" type="submit">Confirmer ma demande de visite</button>
        <p class="bv-msg" data-msg role="alert"></p>
      </form>
      <div class="bv-ok" data-ok hidden tabindex="-1"></div>
      <p class="bv-petit">Aucun créneau ne vous convient ? <a class="link" href="${wa}" data-mesure-lien="whatsapp">Écrivez-moi sur WhatsApp</a> ou appelez le <a class="link" href="tel:${TEL}" data-mesure-lien="tel">${TEL_AFFICHE}</a>.</p>
    </aside>
  </div>
  <aside class="shell bv-similaire"><p class="label">Vous vendez ?</p><h2>Vous avez un bien similaire ?</h2><p>Découvrez sa valeur en 2 minutes, calculée sur les ventes réelles autour de chez vous.</p><a class="btn btn-primary" href="/estimer/" data-mesure-lien="estimer">Estimer mon bien</a></aside>
  <div class="bv-barre"><a class="btn btn-primary" href="#visiter" data-mesure="visite_clic">Visiter</a><a class="btn" href="${wa}" data-mesure-lien="whatsapp" aria-label="WhatsApp">WhatsApp</a><a class="btn" href="tel:${TEL}" data-mesure-lien="tel" aria-label="Appeler">Appeler</a></div>
</article>
<script src="/assets/biens.js" defer></script>`;
  const genre = /maison|propriét|château|villa/i.test(b.type) ? 'SingleFamilyResidence' : /appartement|studio|duplex|loft/i.test(b.type) ? 'Apartment' : 'Place';
  const jsonld = {
    '@context': 'https://schema.org', '@type': 'RealEstateListing', name: titre, url: SITE + url,
    description: desc.slice(0, 500), datePosted: b.premier_le || undefined, image: ph.slice(0, 6).map((f) => SITE + photo(b, f)),
    offers: { '@type': 'Offer', price: b.prix, priceCurrency: 'EUR', availability: 'https://schema.org/InStock', url: SITE + url,
      offeredBy: { '@type': 'RealEstateAgent', name: 'Shawez Ali — GRAVELIN IMMO', telephone: '+33 7 67 57 92 28', address: { '@type': 'PostalAddress', streetAddress: '30 rue Bannelier', postalCode: '21000', addressLocality: 'Dijon', addressCountry: 'FR' } } },
    about: { '@type': genre, address: { '@type': 'PostalAddress', addressLocality: b.commune, postalCode: b.cp || undefined, addressCountry: 'FR' },
      ...(b.surface ? { floorSize: { '@type': 'QuantitativeValue', value: b.surface, unitCode: 'MTK' } } : {}),
      ...(b.pieces ? { numberOfRooms: b.pieces } : {}) },
  };
  return {
    chemin: url, route: '/biens/fiche', titre: `${titre} — ${euros(b.prix)} — Shawez Ali`, main, image: premiere(b), jsonld,
    description: `${b.type} à vendre à ${b.commune} : ${resume(b)}, ${euros(b.prix)}. Photos, ${b.video ? 'vidéo, ' : ''}DPE, honoraires ; visite en 2 clics avec Shawez Ali, Gravelin Immo.`,
    robots: apercu ? 'noindex,nofollow' : undefined, prive: !!apercu,
  };
}

function sitemap(biens) {
  const lignes = [`  <url><loc>${SITE}/biens/</loc><changefreq>daily</changefreq><priority>0.8</priority></url>`]
    .concat(biens.map((b) => `  <url><loc>${SITE}${urlBien(b)}</loc><lastmod>${String(b.saisi_le || b.vu_le || '').slice(0, 10) || new Date().toISOString().slice(0, 10)}</lastmod><changefreq>weekly</changefreq><priority>0.7</priority></url>`));
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${lignes.join('\n')}\n</urlset>\n`, {
    headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=3600' },
  });
}

/* Estimation partout en France (hors Côte-d'Or, dont les ventes sont déjà dans donnees-dvf/).

   Les mêmes ventes que outils/dvf.py : DVF géolocalisées d'Etalab (DGFiP, Licence Ouverte 2.0), lues à la demande,
   commune par commune : https://files.data.gouv.fr/geo-dvf/latest/csv/<année>/communes/<département>/<commune>.csv
   Ventes retenues, comme pour la Côte-d'Or : nature « Vente », un seul logement (un appartement OU une maison), au plus
   des dépendances, aucun local d'activité, coordonnées connues, surface bâtie de 9 à 1 000 m² ; prix au m² admis de 300
   à 30 000 € (Paris, Neuilly, côte d'Azur dépassent les 12 000 € de la Côte-d'Or).
   Les ventes d'une commune pour une année sont gardées un mois dans le cache de Cloudflare : chaque commune n'est lue
   qu'une fois. Quand la commune seule ne donne pas assez de ventes, les communes voisines du même département (centre
   à portée du rayon de recherche, 6 au plus) sont ajoutées (liste des communes : geo.api.gouv.fr).
   Pas de DVF en Alsace-Moselle (livre foncier) ni à Mayotte : on le dit, sans inventer de prix. */

const SOURCE = 'https://files.data.gouv.fr/geo-dvf/latest/csv';
const GEO = 'https://geo.api.gouv.fr/communes';
const ENTETES = { 'User-Agent': 'shawez-immo.com (estimation en ligne)' };
const UN_MOIS = 2592000;
const VOISINES = 6;
export const SANS_DVF = /^(57|67|68|976)/;
export const PM2_MAX_FRANCE = 30000;

/* Code commune (INSEE) du bien : celui de la Base Adresse Nationale ; Paris, Marseille et Lyon sont comptés par
   arrondissement dans DVF (75115, 13208, 69383…), retrouvé au besoin par le code postal. */
export function inseeDe(r) {
  let c = String(r.citycode || '').trim().toUpperCase();
  const cp = String(r.code_postal || '').trim();
  if ((c === '75056' || (!c && /^75/.test(cp))) && /^75(0\d\d|116)$/.test(cp)) c = '751' + String(cp === '75116' ? 16 : +cp.slice(3)).padStart(2, '0');
  else if ((c === '13055' || (!c && /^130/.test(cp))) && /^130(0[1-9]|1[0-6])$/.test(cp)) c = '132' + cp.slice(3);
  else if ((c === '69123' || (!c && /^6900/.test(cp))) && /^6900[1-9]$/.test(cp)) c = '6938' + cp.slice(4);
  return /^(\d{5}|2[AB]\d{3})$/.test(c) ? c : '';
}

export const departementDe = (insee) => (insee.startsWith('97') ? insee.slice(0, 3) : insee.slice(0, 2));

function champs(l) {
  if (l.indexOf('"') < 0) return l.split(',');
  const out = [];
  let cur = '', q = false;
  for (let i = 0; i < l.length; i++) {
    const ch = l[i];
    if (q) {
      if (ch === '"') { if (l[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch;
    } else if (ch === '"') q = true;
    else if (ch === ',') { out.push(cur); cur = ''; } else cur += ch;
  }
  out.push(cur);
  return out;
}

const propre = (s) => String(s || '').replace(/\s+/g, ' ').trim();

/* Ventes simples d'un fichier geo-dvf (une commune, une année). Une vente :
   [lat, lon, type (0 appartement, 1 maison), surface, prix_m2, aaaamm, pieces, terrain, prix, voie, commune, jour]
   (les 8 premières colonnes comme les tuiles de donnees-dvf/, puis le détail des ventes citées dans l'avis de valeur).
   Seules les lignes d'un logement ou d'un local d'activité sont découpées : les autres ne changent rien au tri. */
export function ventesCsv(txt, pm2Max = PM2_MAX_FRANCE, zone = null) {
  const fin0 = txt.indexOf('\n');
  if (fin0 < 0) return [];
  const tete = champs(txt.slice(0, fin0).replace(/\r$/, '')).map((s) => s.trim());
  const c = (n) => tete.indexOf(n);
  const I = {
    id: c('id_mutation'), date: c('date_mutation'), nature: c('nature_mutation'), valeur: c('valeur_fonciere'),
    voie: c('adresse_nom_voie'), commune: c('nom_commune'), parcelle: c('id_parcelle'), lot1: c('lot1_numero'),
    type: c('type_local'), surf: c('surface_reelle_bati'), pieces: c('nombre_pieces_principales'),
    lon: c('longitude'), lat: c('latitude'),
  };
  if (Object.values(I).some((v) => v < 0)) return [];
  // Grande commune : on ne garde que les lignes de la zone (latitude et longitude sont les deux dernières colonnes,
  // lues sans découper la ligne) ; c'est ce qui coûte le moins de temps de calcul.
  const rapide = zone && I.lat === tete.length - 1 && I.lon === tete.length - 2;
  const mutations = new Map();
  const n = txt.length;
  let pos = fin0 + 1;
  while (pos < n) {
    let fin = txt.indexOf('\n', pos);
    if (fin < 0) fin = n;
    if (rapide) {
      const bout = txt.charCodeAt(fin - 1) === 13 ? fin - 1 : fin;
      const v2 = txt.lastIndexOf(',', bout - 1);
      const la = +txt.slice(v2 + 1, bout);
      if (!(la >= zone.lat0 && la <= zone.lat1)) { pos = fin + 1; continue; }
      const v1 = txt.lastIndexOf(',', v2 - 1);
      const lo = +txt.slice(v1 + 1, v2);
      if (!(lo >= zone.lon0 && lo <= zone.lon1)) { pos = fin + 1; continue; }
    }
    let l = txt.slice(pos, fin);
    pos = fin + 1;
    if (l.endsWith('\r')) l = l.slice(0, -1);
    if (!l || (l.indexOf('Maison') < 0 && l.indexOf('Appartement') < 0 && l.indexOf('Local industriel') < 0)) continue;
    const f = champs(l);
    const t = f[I.type];
    let m = mutations.get(f[I.id]);
    if (!m) { m = { exclu: false, locaux: new Map() }; mutations.set(f[I.id], m); }
    if (t === 'Maison' || t === 'Appartement') m.locaux.set(`${f[I.parcelle]}|${t}|${f[I.surf]}|${f[I.pieces]}|${f[I.lot1]}`, f);
    else if (t && t !== 'Dépendance') m.exclu = true;
  }
  const ventes = [];
  for (const m of mutations.values()) {
    if (m.exclu || m.locaux.size !== 1) continue;
    const f = m.locaux.values().next().value;
    if (f[I.nature] !== 'Vente') continue;
    const valeur = parseFloat(f[I.valeur]);
    const surf = parseFloat(f[I.surf]);
    const lat = parseFloat(f[I.lat]);
    const lon = parseFloat(f[I.lon]);
    if (!(valeur > 0) || !(surf >= 9 && surf <= 1000) || !Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    const pm2 = valeur / surf;
    if (pm2 < 300 || pm2 > pm2Max) continue;
    const d = f[I.date] || '';
    ventes.push([Math.round(lat * 1e5) / 1e5, Math.round(lon * 1e5) / 1e5, f[I.type] === 'Maison' ? 1 : 0, Math.round(surf),
      Math.round(pm2), +(d.slice(0, 4) + d.slice(5, 7)) || 0, parseInt(f[I.pieces], 10) || 0, 0,
      Math.round(valeur), propre(f[I.voie]), propre(f[I.commune]), +d.slice(8, 10) || 0]);
  }
  return ventes;
}

/* Cache de Cloudflare : clés sur le domaine du site, jamais servies au public (aucune route ne les lit). */
async function cacheLire(base, cle) {
  try {
    const r = await caches.default.match(new Request(new URL(cle, base)));
    return r ? await r.json() : null;
  } catch (e) { return null; }
}
async function cacheEcrire(base, cle, obj) {
  try {
    await caches.default.put(new Request(new URL(cle, base)), new Response(JSON.stringify(obj), {
      headers: { 'Content-Type': 'application/json', 'Cache-Control': `public, max-age=${UN_MOIS}` },
    }));
  } catch (e) { /* sans cache, la commune sera relue la prochaine fois */ }
}

/* Ventes simples d'une commune pour une année (fichier absent = aucune vente cette année-là).
   Commune ordinaire : toutes ses ventes, gardées en cache. Grande ville (fichier de plus de GRAND octets) : seulement
   la zone autour du bien (case de 0,05° élargie du rayon « zone »), gardée en cache pour cette case : moins de calcul. */
const GRAND = 1200000;
export async function ventesCommune(base, insee, an, pres = null) {
  const cle = `/__dvf/v1/${an}/${insee}.json`;
  const deja = await cacheLire(base, cle);
  if (deja) return deja;
  let zone = null, cleZone = null;
  if (pres) {
    const cy = Math.floor(pres.lat / 0.05), cx = Math.floor(pres.lon / 0.05);
    const dLat = pres.rayon / 111320, dLon = pres.rayon / (111320 * Math.cos((pres.lat * Math.PI) / 180));
    zone = { lat0: cy * 0.05 - dLat, lat1: (cy + 1) * 0.05 + dLat, lon0: cx * 0.05 - dLon, lon1: (cx + 1) * 0.05 + dLon };
    cleZone = `/__dvf/v1/${an}/${insee}/z${Math.round(pres.rayon)}_${cy}_${cx}.json`;
    const z = await cacheLire(base, cleZone);
    if (z) return z;
  }
  const r = await fetch(`${SOURCE}/${an}/communes/${departementDe(insee)}/${insee}.csv`, {
    headers: ENTETES, cf: { cacheTtl: UN_MOIS, cacheEverything: true },
  });
  if (r.status === 404) { await cacheEcrire(base, cle, []); return []; }
  if (!r.ok) throw new Error(`dvf ${insee} ${an} : ${r.status}`);
  const txt = await r.text();
  if (zone && txt.length > GRAND) {
    const v = ventesCsv(txt, PM2_MAX_FRANCE, zone);
    await cacheEcrire(base, cleZone, v);
    return v;
  }
  const v = ventesCsv(txt);
  await cacheEcrire(base, cle, v);
  return v;
}

/* Communes du département avec leur centre : [[code, lat, lon], …] ; arrondissements pour Paris, Marseille, Lyon. */
async function communesDuDepartement(base, dep) {
  const cle = `/__dvf/v1/communes/${dep}.json`;
  const deja = await cacheLire(base, cle);
  if (deja) return deja;
  const urls = [`${GEO}?codeDepartement=${dep}&fields=code,centre&format=json`];
  if (dep === '75' || dep === '13' || dep === '69') urls.push(`${GEO}?codeDepartement=${dep}&type=arrondissement-municipal&fields=code,centre&format=json`);
  const liste = [];
  for (const u of urls) {
    try {
      const r = await fetch(u, { headers: ENTETES, cf: { cacheTtl: UN_MOIS, cacheEverything: true } });
      if (!r.ok) continue;
      for (const x of await r.json()) {
        const p = x && x.centre && x.centre.coordinates;
        if (p && x.code !== '75056' && x.code !== '13055' && x.code !== '69123') liste.push([x.code, Math.round(p[1] * 1e4) / 1e4, Math.round(p[0] * 1e4) / 1e4]);
      }
    } catch (e) { /* liste incomplète : la commune du bien suffit souvent */ }
  }
  if (liste.length) await cacheEcrire(base, cle, liste);
  return liste;
}

/* Recherche des ventes hors Côte-d'Or. comparer(lignes) applique la même règle que pour la Côte-d'Or (type, surface,
   rayon qui s'élargit) et rend { comps, recherche } ; ici on lui fournit les ventes de la commune, puis des voisines. */
export async function chercherFrance(base, idx, r, { rayonMax, rayonZone, vise, comparer, distance }) {
  const insee = inseeDe(r);
  if (!insee) return { raison: 'adresse' };
  if (SANS_DVF.test(insee)) return { raison: 'sans_dvf' };
  const annees = idx && Array.isArray(idx.annees) && idx.annees.length ? idx.annees : [];
  if (!annees.length) return { raison: 'donnees_absentes' };
  const pres = { lat: r.lat, lon: r.lon, rayon: rayonZone || rayonMax };
  const lire = async (code) => (await Promise.all(annees.map((an) => ventesCommune(base, code, an, pres)))).flat();
  let lignes;
  try { lignes = await lire(insee); } catch (e) { console.log('dvf france', e && e.message); return { raison: 'donnees_indisponibles' }; }
  let res = comparer(lignes);
  if (res.comps.length >= vise) return res;
  try {
    const proches = (await communesDuDepartement(base, departementDe(insee)))
      .filter((x) => x[0] !== insee)
      .map((x) => [x[0], distance(r.lat, r.lon, x[1], x[2])])
      .filter((x) => x[1] <= rayonMax + 3000)
      .sort((a, b) => a[1] - b[1])
      .slice(0, VOISINES);
    if (proches.length) {
      const plus = await Promise.all(proches.map((x) => lire(x[0]).catch(() => [])));
      lignes = lignes.concat(...plus);
      res = comparer(lignes);
    }
  } catch (e) { console.log('dvf voisines', e && e.message); }
  return res;
}

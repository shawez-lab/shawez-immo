/* Fourchette indicative à partir des ventes réelles DVF (donnees-dvf/, produit par outils/dvf.py).

   1. Comparables : même type (appartement / maison), surface comparable, vendus dans les 3 dernières années
      publiées, les plus proches de l'adresse. Le rayon s'élargit tant qu'il y a moins de 12 ventes.
   2. Prix au m² de référence : la médiane des comparables.
   3. Ajustements bornés selon l'état, l'étage et l'ascenseur, l'extérieur, le stationnement, l'époque.
   4. Fourchette : ± la moitié de l’écart interquartile (entre 5 et 10 %), arrondie.
   Moins de 5 comparables, ou un bien hors de la Côte-d'Or : pas de fourchette, on annonce un rappel. */

const RAYONS = {
  appartement: [300, 500, 800, 1200, 2000, 3000, 5000],
  maison: [500, 1000, 2000, 3000, 5000, 8000, 12000],
};
const VISE = 12;
const MINI = 5;

const tuiles = new Map();
let index = null;

async function lireJson(env, base, chemin) {
  const r = await env.ASSETS.fetch(new URL(chemin, base));
  if (!r.ok) return null;
  return r.json();
}

async function chargerIndex(env, base) {
  if (!index) index = await lireJson(env, base, '/donnees-dvf/index.json');
  return index;
}

async function tuile(env, base, nom) {
  if (!tuiles.has(nom)) tuiles.set(nom, index.tuiles.includes(nom) ? (await lireJson(env, base, `/donnees-dvf/t/${nom}.json`)) || [] : []);
  return tuiles.get(nom);
}

function distance(lat1, lon1, lat2, lon2) {
  const k = Math.PI / 180;
  const x = (lon2 - lon1) * k * Math.cos(((lat1 + lat2) / 2) * k);
  const y = (lat2 - lat1) * k;
  return Math.sqrt(x * x + y * y) * 6371000;
}

function quantile(tri, q) {
  const p = (tri.length - 1) * q;
  const b = Math.floor(p);
  return tri[b] + (tri[Math.min(b + 1, tri.length - 1)] - tri[b]) * (p - b);
}

function arrondi(v) {
  const pas = v >= 500000 ? 5000 : 1000;
  return Math.round(v / pas) * pas;
}

export function ajustements(r) {
  const lignes = [];
  const add = (libelle, v) => { if (v) lignes.push([libelle, v]); };
  const etat = { travaux: -0.12, rafraichir: -0.05, bon: 0, neuf: 0.06 }[r.etat] || 0;
  add('État général', etat);
  const epoque = { avant1948: 0, '1948-1974': -0.03, '1975-2000': 0, '2001-2012': 0.02, apres2012: 0.04 }[r.epoque] || 0;
  add('Époque de construction', epoque);
  if (r.type === 'appartement') {
    const et = r.etage ?? 0;
    if (et === 0) add('Rez-de-chaussée', -0.05);
    if (et >= 3 && !r.ascenseur) add('Étage élevé sans ascenseur', -Math.min(0.08, 0.03 * (et - 2)));
    if (et >= 4 && r.ascenseur) add('Étage élevé avec ascenseur', 0.02);
    if (et > 0 && r.etages_immeuble && et >= r.etages_immeuble) add('Dernier étage', 0.02);
    if (r.terrasse) add('Terrasse', 0.05); else if (r.balcon) add('Balcon', 0.02);
    if (r.parking_box) add('Garage ou box', 0.03); else if (r.parking) add('Place de parking', 0.02);
    if (r.cave) add('Cave', 0.01);
    if (r.gardien) add('Gardien', 0.01);
  } else {
    if (r.piscine) add('Piscine', 0.04);
    if (r.garage) add('Garage', 0.03);
    if (r.plain_pied) add('Plain-pied', 0.02);
    if (r.terrasse) add('Terrasse', 0.02);
    if ((r.terrain || 0) >= 1500) add('Grand terrain', 0.03);
    else if (r.terrain != null && r.terrain < 150) add('Petit terrain', -0.03);
  }
  let total = lignes.reduce((s, [, v]) => s + v, 0);
  total = Math.max(-0.25, Math.min(0.18, total));
  return { total, lignes };
}

export async function estimer(env, requestUrl, r) {
  const base = new URL(requestUrl).origin;
  const idx = await chargerIndex(env, base);
  const meta = idx ? { donnees_du: idx.derniere_vente, annees: idx.annees, source: idx.source } : { donnees_du: null };
  const sans = (raison) => ({ fourchette: false, raison, ...meta });

  if (!idx) return sans('donnees_absentes');
  if (r.type !== 'appartement' && r.type !== 'maison') return sans('type');
  if (r.lat == null || r.lon == null || !r.surface) return sans('adresse');
  if (!String(r.code_postal || '').startsWith(idx.departement)) return sans('hors_zone');

  const t = r.type === 'maison' ? 1 : 0;
  const [smin, smax] = t ? [0.6, 1.7] : [0.6, 1.6];
  const pas = idx.tuile;
  let comps = [];
  let rayon = 0;
  for (const rr of RAYONS[r.type]) {
    rayon = rr;
    const dLat = rr / 111320;
    const dLon = rr / (111320 * Math.cos((r.lat * Math.PI) / 180));
    const noms = [];
    for (let x = Math.floor((r.lon - dLon) / pas); x <= Math.floor((r.lon + dLon) / pas); x++)
      for (let y = Math.floor((r.lat - dLat) / pas); y <= Math.floor((r.lat + dLat) / pas); y++) noms.push(`${x}_${y}`);
    comps = [];
    for (const nom of noms) {
      for (const v of await tuile(env, base, nom)) {
        if (v[2] !== t) continue;
        const ratio = v[3] / r.surface;
        if (ratio < smin || ratio > smax) continue;
        const d = distance(r.lat, r.lon, v[0], v[1]);
        if (d <= rr) comps.push({ d, pm2: v[4], surface: v[3], mois: v[5] });
      }
    }
    if (comps.length >= VISE) break;
  }
  if (comps.length < MINI) return { ...sans('peu_de_ventes'), comparables: comps.length, rayon };

  // au plus les 40 ventes les plus proches
  comps.sort((a, b) => a.d - b.d);
  comps = comps.slice(0, 40);
  const pm2 = comps.map((c) => c.pm2).sort((a, b) => a - b);
  const med = quantile(pm2, 0.5);
  const iqr = quantile(pm2, 0.75) - quantile(pm2, 0.25);
  let marge = Math.max(0.05, Math.min(0.1, iqr / 2 / med));
  if (comps.length < 10) marge = Math.min(0.12, marge + 0.02);
  const aj = ajustements(r);
  const m2 = med * (1 + aj.total);
  const centre = m2 * r.surface;
  return {
    fourchette: true,
    bas: arrondi(centre * (1 - marge)),
    haut: arrondi(centre * (1 + marge)),
    prix_m2: Math.round(m2),
    m2_quartier: Math.round(med),
    comparables: comps.length,
    rayon,
    ajustements: aj.lignes.map(([l, v]) => ({ libelle: l, pct: Math.round(v * 100) })),
    ...meta,
  };
}

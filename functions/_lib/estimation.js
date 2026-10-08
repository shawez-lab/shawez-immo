/* Fourchette indicative à partir des ventes réelles DVF (donnees-dvf/, produit par outils/dvf.py).

   1. Comparables : même type (appartement / maison), surface comparable, vendus dans les 3 dernières années
      publiées, les plus proches de l'adresse. Le rayon s'élargit tant qu'il y a moins de 12 ventes.
   2. Prix au m² de référence : la médiane des comparables.
   3. Ajustements bornés selon l'état, l'étage et l'ascenseur, l'extérieur, le stationnement, l'époque.
   4. Fourchette : ± la moitié de l’écart interquartile (entre 5 et 10 % ; jusqu'à 12 % s'il y a peu de ventes
      ou s'il a fallu les chercher loin), arrondie. Le rayon affiché est la distance de la vente retenue la plus éloignée.
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

/* Recherche des ventes comparables autour du bien. Rend { comps, recherche } (comps : toutes les ventes du dernier
   rayon essayé, avec la tuile et le rang de chacune pour retrouver son détail), ou { raison } quand on ne cherche pas. */
async function chercher(env, base, idx, r) {
  if (r.type !== 'appartement' && r.type !== 'maison') return { raison: 'type' };
  if (r.lat == null || r.lon == null || !r.surface) return { raison: 'adresse' };
  if (!String(r.code_postal || '').startsWith(idx.departement)) return { raison: 'hors_zone' };
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
      const lignes = await tuile(env, base, nom);
      for (let i = 0; i < lignes.length; i++) {
        const v = lignes[i];
        if (v[2] !== t) continue;
        const ratio = v[3] / r.surface;
        if (ratio < smin || ratio > smax) continue;
        const d = distance(r.lat, r.lon, v[0], v[1]);
        if (d <= rr) comps.push({ d, pm2: v[4], surface: v[3], mois: v[5], pieces: v[6], terrain: v[7], nom, i });
      }
    }
    if (comps.length >= VISE) break;
  }
  comps.sort((a, b) => a.d - b.d);
  return { comps, recherche: rayon };
}

export async function estimer(env, requestUrl, r) {
  const base = new URL(requestUrl).origin;
  const idx = await chargerIndex(env, base);
  const meta = idx ? { donnees_du: idx.derniere_vente, annees: idx.annees, source: idx.source } : { donnees_du: null };
  const sans = (raison) => ({ fourchette: false, raison, ...meta });

  if (!idx) return sans('donnees_absentes');
  const trouve = await chercher(env, base, idx, r);
  if (trouve.raison) return sans(trouve.raison);
  let { comps } = trouve;
  const recherche = trouve.recherche;
  if (comps.length < MINI) return { ...sans('peu_de_ventes'), comparables: comps.length, rayon: recherche };

  // au plus les 40 ventes les plus proches
  comps = comps.slice(0, 40);
  // rayon affiché : la distance réelle de la vente retenue la plus éloignée (arrondie aux 50 m supérieurs),
  // pas le rayon de recherche — on ne dit pas « à moins de 300 m » si tout est à moins de 150 m, ni l'inverse
  const rayon = Math.min(recherche, Math.max(50, Math.ceil(comps[comps.length - 1].d / 50) * 50));
  const pm2 = comps.map((c) => c.pm2).sort((a, b) => a - b);
  const med = quantile(pm2, 0.5);
  const iqr = quantile(pm2, 0.75) - quantile(pm2, 0.25);
  let marge = Math.max(0.05, Math.min(0.1, iqr / 2 / med));
  // peu de ventes, ou ventes cherchées loin : la fourchette s'élargit
  const loin = recherche >= RAYONS[r.type][4];
  if (comps.length < 10 || loin) marge = Math.min(0.12, marge + 0.02);
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

/* ---------- Ventes comparables détaillées, pour l'avis de valeur ----------
   Les mêmes ventes que l'estimation (même recherche), dont on garde les « n » plus proches du bien par la distance,
   la surface et la date, avec leur détail réel publié par DVF : mois de la vente, voie (sans numéro), commune,
   surface, pièces, prix signé, prix au m². Aucune valeur calculée ni arrondie : si le détail d'une vente manque,
   son prix reste vide. Rend aussi le marché (nombre de ventes, rayon, médiane) et « assez » (au moins 5 ventes). */
const details = new Map();
async function detail(env, base, nom) {
  if (!details.has(nom)) details.set(nom, (await lireJson(env, base, `/donnees-dvf/d/${nom}.json`)) || null);
  return details.get(nom);
}

const PETITS = new Set(['de', 'du', 'des', 'la', 'le', 'les', 'aux', 'au', 'en', 'sur', 'sous', 'et', 'a', 'l', 'd']);
export function voieLisible(v) {
  const abr = { R: 'Rue', RUE: 'Rue', AV: 'Avenue', AVE: 'Avenue', BD: 'Boulevard', BLD: 'Boulevard', PL: 'Place', IMP: 'Impasse', ALL: 'Allée', CHE: 'Chemin', CRS: 'Cours', QU: 'Quai', QUAI: 'Quai', RTE: 'Route', SQ: 'Square', PAS: 'Passage', LOT: 'Lotissement', RES: 'Résidence', CITE: 'Cité', HAM: 'Hameau', VLA: 'Villa', RPT: 'Rond-point', PROM: 'Promenade', SEN: 'Sente', TRA: 'Traverse', MTE: 'Montée', FG: 'Faubourg', CR: 'Chemin rural', VC: 'Voie communale', ZA: 'ZA' };
  const mots = String(v || '').trim().split(/\s+/).filter(Boolean);
  return mots.map((m, i) => {
    if (i === 0 && abr[m.toUpperCase()]) return abr[m.toUpperCase()];
    const bas = m.toLowerCase();
    if (i > 0 && PETITS.has(bas.replace(/['’]$/, ''))) return bas;
    return bas.replace(/(^|[-'’])([a-zà-ÿ])/g, (_, s, c) => s + c.toUpperCase());
  }).join(' ').replace(/(^| )([dl]) (?=[aeiouyhéèàâêîôûAEIOUYHÉÈÀÂÊÎÔÛ])/g, (_, a, c) => `${a}${c}'`);
}
const communeLisible = (c) => String(c || '').toLowerCase().replace(/(^|[\s-])(?!(?:de|du|des|la|le|les|sur|sous|en|et|aux?|lès|lez)(?:[\s-]|$))([a-zà-ÿ])/g, (_, s, x) => s + x.toUpperCase()).replace(/^./, (x) => x.toUpperCase());

export async function ventesComparables(env, requestUrl, r, { n = 12, candidats = 20, choix = null } = {}) {
  const base = new URL(requestUrl).origin;
  const idx = await chargerIndex(env, base);
  const marche = idx ? { donnees_du: idx.derniere_vente, annees: idx.annees, source: idx.source } : { donnees_du: null };
  if (!idx) return { ventes: [], candidats: [], assez: false, raison: 'donnees_absentes', marche };
  const trouve = await chercher(env, base, idx, r);
  if (trouve.raison) return { ventes: [], candidats: [], assez: false, raison: trouve.raison, marche };
  const comps = trouve.comps.slice(0, 40);
  // ventes atypiques : prix au m² très loin des autres (au-delà de 1,5 fois l'écart interquartile) ; elles restent
  // comptées et proposées, mais ne sont pas citées d'office
  let bornes = [0, Infinity];
  if (comps.length) {
    const pm2 = comps.map((c) => c.pm2).sort((a, b) => a - b);
    const q1 = quantile(pm2, 0.25), q3 = quantile(pm2, 0.75);
    if (comps.length >= MINI) bornes = [q1 - 1.5 * (q3 - q1), q3 + 1.5 * (q3 - q1)];
    Object.assign(marche, {
      comparables: comps.length, m2_median: Math.round(quantile(pm2, 0.5)), m2_bas: Math.round(q1), m2_haut: Math.round(q3),
      rayon: Math.min(trouve.recherche, Math.max(50, Math.ceil(comps[comps.length - 1].d / 50) * 50)),
    });
  } else Object.assign(marche, { comparables: 0, rayon: trouve.recherche });
  // les plus proches du bien : distance, écart de surface, ancienneté de la vente
  const dmax = Math.max(1, comps.length ? comps[comps.length - 1].d : 1);
  const dernier = idx.derniere_vente ? +idx.derniere_vente.slice(0, 4) * 12 + +idx.derniere_vente.slice(5, 7) : 0;
  const note = (c) => c.d / dmax + 1.5 * Math.abs(Math.log(c.surface / r.surface)) + 0.5 * Math.max(0, dernier - (Math.floor(c.mois / 100) * 12 + (c.mois % 100))) / 36;
  const proches = comps.map((c) => ({ c, s: note(c) })).sort((a, b) => a.s - b.s).slice(0, candidats).map((x) => x.c);
  const liste = [];
  for (const c of proches) {
    const d = await detail(env, base, c.nom);
    const l = d && d[c.i];
    const mois = `${Math.floor(c.mois / 100)}-${String(c.mois % 100).padStart(2, '0')}`;
    const v = {
      mois, surface: c.surface, pieces: c.pieces || null, terrain: r.type === 'maison' ? c.terrain || null : null,
      prix: l ? l[0] : null, prix_m2: c.pm2, voie: l ? voieLisible(l[1]) : '', commune: l ? communeLisible(l[2]) : '', distance: Math.round(c.d / 10) * 10,
      atypique: c.pm2 < bornes[0] || c.pm2 > bornes[1],
    };
    v.cle = [v.mois, v.prix ?? v.prix_m2, v.surface, v.voie].join('|');
    liste.push(v);
  }
  // ventes citées : celles que l'agent a choisies, sinon les « n » plus proches hors ventes atypiques
  const voulu = Array.isArray(choix) && choix.length ? new Set(choix) : null;
  let cites = 0;
  for (const v of liste) {
    v.retenue = voulu ? voulu.has(v.cle) && cites < n : !v.atypique && cites < n;
    if (v.retenue) cites++;
  }
  if (voulu && !cites) for (const v of liste) { v.retenue = !v.atypique && cites < n; if (v.retenue) cites++; }   // choix périmé (données refaites)
  const parDate = (a, b) => (a.mois < b.mois ? 1 : a.mois > b.mois ? -1 : a.distance - b.distance);
  return { ventes: liste.filter((v) => v.retenue).sort(parDate), candidats: liste.slice().sort(parDate), assez: comps.length >= MINI, marche };
}

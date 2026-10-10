/* « Biens à vendre » : une seule base des biens (D1 « espace-estimation »), servant shawez-immo.com et, plus tard,
   le site de l'agence (colonne « sites » : style/site d'affichage). Chantier « Mes biens », lignes 58-64 du plan.

   - Les données de l'agence (annonces.json, synchronisé chaque jour par outils/sync_annonces.py) sont recopiées dans la
     table « biens » (colonnes « agence »). Les mentions que l'agence ne publie pas en texte lisible (DPE, GES, charge des
     honoraires, année des prix de l'énergie…) sont saisies dans /admin/biens/ (colonnes « saisies ») et ne sont jamais
     écrasées par la synchronisation.
   - Règle légale : une fiche n'est affichée que si TOUTES les mentions obligatoires sont présentes (manque(b) vide).
   - Mesures sans cookie ni adresse IP gardée : compteurs par bien, par jour (biens_mesures).
*/
import { Erreur } from './base.js';

export const VERSION_BIENS = '1';
export const TEL = '+33767579228';
export const TEL_AFFICHE = '07 67 57 92 28';
export const WHATSAPP = '33767579228';

const SCHEMA_BIENS = `
CREATE TABLE IF NOT EXISTS biens (
  id TEXT PRIMARY KEY,
  sites TEXT NOT NULL DEFAULT 'shawez,gravelin',
  source TEXT NOT NULL DEFAULT 'agence',
  statut TEXT NOT NULL DEFAULT 'en vente',
  type TEXT, commune TEXT, cp TEXT,
  prix INTEGER, surface REAL, pieces INTEGER, chambres INTEGER,
  description TEXT, carac TEXT, photos TEXT, energie TEXT, etiquettes TEXT, chemin_agence TEXT,
  vu_le TEXT, premier_le TEXT, synchro_le TEXT,
  dpe TEXT, ges TEXT, dpe_kwh INTEGER, ges_kg INTEGER,
  energie_min INTEGER, energie_max INTEGER, energie_annee INTEGER,
  honoraires_charge TEXT, honoraires_pct REAL, prix_hors_hon INTEGER,
  copro INTEGER, copro_lots INTEGER, copro_charges INTEGER, copro_procedure TEXT,
  video TEXT, video_affiche TEXT,
  masque INTEGER NOT NULL DEFAULT 0,
  saisi_le TEXT, saisi_par TEXT
);
CREATE INDEX IF NOT EXISTS biens_statut ON biens(statut);
CREATE TABLE IF NOT EXISTS biens_medias (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bien_id TEXT NOT NULL,
  genre TEXT NOT NULL,
  url TEXT NOT NULL,
  affiche TEXT,
  ordre INTEGER NOT NULL DEFAULT 0,
  cree_le TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS biens_medias_bien ON biens_medias(bien_id);
CREATE TABLE IF NOT EXISTS biens_mesures (
  bien_id TEXT NOT NULL,
  quoi TEXT NOT NULL,
  jour TEXT NOT NULL,
  n INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (bien_id, quoi, jour)
);
CREATE TABLE IF NOT EXISTS biens_visites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bien_id TEXT NOT NULL,
  prenom TEXT NOT NULL, nom TEXT, telephone TEXT NOT NULL, email TEXT,
  creneau TEXT, message TEXT,
  statut TEXT NOT NULL DEFAULT 'demandee',
  test INTEGER NOT NULL DEFAULT 0,
  alerte TEXT,
  cree_le TEXT NOT NULL,
  maj_le TEXT
);
CREATE INDEX IF NOT EXISTS biens_visites_bien ON biens_visites(bien_id);
`;

let pret = false;
export async function baseBiens(baseDb) {
  if (pret) return baseDb;
  let v = null;
  try { v = (await baseDb.prepare("SELECT valeur FROM reglages WHERE cle = 'schema_biens'").first())?.valeur; } catch (e) { /* */ }
  if (v !== VERSION_BIENS) {
    await baseDb.batch(SCHEMA_BIENS.split(';').map((s) => s.trim()).filter(Boolean).map((s) => baseDb.prepare(s)));
    await baseDb.prepare("INSERT INTO reglages (cle, valeur) VALUES ('schema_biens', ?1) ON CONFLICT(cle) DO UPDATE SET valeur = ?1").bind(VERSION_BIENS).run();
  }
  pret = true;
  return baseDb;
}

/* ---------- Petits outils ---------- */
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const euros = (n) => (n == null || n === '' ? '' : Math.round(Number(n)).toLocaleString('fr-FR').replace(/[  ]/g, ' ') + ' €');
const nombre = (s) => { const m = String(s ?? '').replace(/[\s  ]/g, '').replace(',', '.').match(/-?\d+(?:\.\d+)?/); return m ? Number(m[0]) : null; };
export function slugifier(s) {
  return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}
export const slug = (b) => `${slugifier(b.commune)}-${slugifier(b.type)}-${slugifier(b.id)}`;
export const urlBien = (b) => `/biens/${slug(b)}/`;
export const estTerrain = (b) => /terrain/i.test(b.type || '');
export const LETTRES = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
const DPE_SPECIAL = { vierge: 'DPE vierge', non_soumis: 'Non soumis au DPE' };

/* Texte de l'agence : on retire les coordonnées d'autres conseillers et les numéros techniques (« 2.16.1.2 »). */
export function nettoyerDescription(t) {
  let s = String(t || '');
  s = s.replace(/[^.!?]*\b(?:contact(?:ez|er)|appel(?:ez|er))\b[^.!?]*(?:\d[\d\s/.O]{7,}\d|[A-ZÉ][a-zé]+ [A-Z]{3,})[^.!?]*[.!?]?/g, ' ');
  s = s.replace(/[^.!?]*(?:demandes? de (?:renseignements?|visites?)|toutes demandes)[^.!?]*\b(?:au|à)\b[^.!?]*\d[^.!?]*[.!?]?/gi, ' ');
  s = s.replace(/\b\d\.\d{1,2}\.\d\.\d\b/g, ' ');
  s = s.replace(/Les (?:informations sur les )?risques auxquels ce bien est exposé[^.]*(?:\.[a-z]{2,4}[^.]*)*\.?/gi, ' ');
  return s.replace(/\s+/g, ' ').trim();
}

/* ---------- Synchronisation depuis annonces.json (servi par le site) ---------- */
let cacheSynchro = { quand: 0, empreinte: null };
const STATUTS_AGENCE = { 'en vente': 'en vente', 'sous compromis': 'sous compromis', 'retirée': 'retire' };

export async function synchroniser(env, origine, { forcer = false } = {}) {
  const base = await baseBiens(env.DB);
  if (!forcer && Date.now() - cacheSynchro.quand < 5 * 60000) return { faite: false };
  let brut;
  try {
    const r = await env.ASSETS.fetch(new URL('/annonces.json', origine));
    if (!r.ok) return { faite: false, erreur: 'annonces_absentes' };
    brut = await r.text();
  } catch (e) { return { faite: false, erreur: 'annonces_illisibles' }; }
  const empreinte = brut.length + ':' + brut.slice(0, 40) + brut.slice(-200);
  const deja = (await base.prepare("SELECT valeur FROM reglages WHERE cle = 'biens_empreinte'").first())?.valeur;
  cacheSynchro.quand = Date.now();
  if (!forcer && deja === empreinte) { cacheSynchro.empreinte = empreinte; return { faite: false }; }
  const donnees = JSON.parse(brut);
  const annonces = Object.values(donnees.annonces || {});
  const now = new Date().toISOString();
  const ordres = [];
  for (const a of annonces) {
    const id = String(a.ref || a.id || '').trim();
    if (!id || !a.type) continue;                       // annonce incomplète : jamais reprise
    const c = a.caracteristiques || {};
    const en = String(a.energie || '').match(/entre\s*([\d\s  ]+)\s*€\s*et\s*([\d\s  ]+)\s*€/i);
    const copro = c.copropriete === 'OUI' ? 1 : c.copropriete === 'NON' ? 0 : null;
    ordres.push(base.prepare(
      `INSERT INTO biens (id, statut, type, commune, cp, prix, surface, pieces, chambres, description, carac, photos, energie, etiquettes,
         chemin_agence, vu_le, premier_le, synchro_le, energie_min, energie_max, copro, copro_lots, copro_charges, copro_procedure)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21, ?22, ?23, ?24)
       ON CONFLICT(id) DO UPDATE SET statut = ?2, type = ?3, commune = ?4, cp = ?5, prix = ?6, surface = ?7, pieces = ?8, chambres = ?9,
         description = ?10, carac = ?11, photos = ?12, energie = ?13, etiquettes = ?14, chemin_agence = ?15, vu_le = ?16, premier_le = ?17,
         synchro_le = ?18,
         energie_min = COALESCE(biens.energie_min, ?19), energie_max = COALESCE(biens.energie_max, ?20),
         copro = COALESCE(biens.copro, ?21), copro_lots = COALESCE(biens.copro_lots, ?22),
         copro_charges = COALESCE(biens.copro_charges, ?23), copro_procedure = COALESCE(biens.copro_procedure, ?24)
       WHERE biens.source = 'agence'`
    ).bind(
      id, STATUTS_AGENCE[a.status] || 'retire', a.type, a.commune || null, a.cp || c.cp || null,
      a.prix != null ? Math.round(a.prix) : null, a.surface ?? null, a.pieces ?? nombre(c.nbpiecees), nombre(c.nbchambres),
      a.description_expurgee || '', JSON.stringify(c), JSON.stringify((a.photos && a.photos.fichiers) || []), a.energie || null,
      JSON.stringify(a.mentions_agence || []), a.chemin || null, a.last_seen || null, a.first_seen || null, now,
      en ? nombre(en[1]) : null, en ? nombre(en[2]) : null, copro,
      nombre(c.copropriete_nb_lot), nombre(c.copropriete_quote_part), c.copropriete_statut_syndicat || null,
    ));
  }
  // un bien de l'agence absent du fichier n'est plus en vente
  const ids = annonces.map((a) => String(a.ref || a.id || '')).filter(Boolean);
  for (let i = 0; i < ordres.length; i += 50) await base.batch(ordres.slice(i, i + 50));
  if (ids.length) {
    await base.prepare(`UPDATE biens SET statut = 'retire' WHERE source = 'agence' AND id NOT IN (SELECT value FROM json_each(?1))`).bind(JSON.stringify(ids)).run();
  }
  await base.prepare("INSERT INTO reglages (cle, valeur) VALUES ('biens_empreinte', ?1) ON CONFLICT(cle) DO UPDATE SET valeur = ?1").bind(empreinte).run();
  await base.prepare("INSERT INTO reglages (cle, valeur) VALUES ('biens_synchro_le', ?1) ON CONFLICT(cle) DO UPDATE SET valeur = ?1").bind(now).run();
  cacheSynchro.empreinte = empreinte;
  return { faite: true, n: ordres.length };
}

/* ---------- Mentions obligatoires : rien n'est affiché s'il en manque une ----------
   Prix honoraires inclus et charge des honoraires (arrêté du 10 janvier 2017) ; si l'acquéreur paie : % TTC et prix hors
   honoraires ; DPE et GES (lettres) sauf terrain ; dépenses annuelles d'énergie (fourchette + année des prix) pour un DPE
   de A à G ; copropriété : nombre de lots, charges annuelles moyennes, procédure en cours ou non (loi ALUR). */
export function manque(b) {
  const m = [];
  if (!(b.prix > 0)) m.push('prix');
  if (!['vendeur', 'acquereur'].includes(b.honoraires_charge)) m.push('charge des honoraires');
  if (b.honoraires_charge === 'acquereur') {
    if (!(b.honoraires_pct > 0)) m.push('% des honoraires');
    if (!(b.prix_hors_hon > 0)) m.push('prix hors honoraires');
  }
  if (!estTerrain(b)) {
    const special = b.dpe && DPE_SPECIAL[b.dpe];
    if (!special && !LETTRES.includes(b.dpe)) m.push('DPE');
    if (!special && !LETTRES.includes(b.ges)) m.push('GES');
    if (LETTRES.includes(b.dpe)) {
      if (!(b.energie_min > 0 && b.energie_max > 0)) m.push('dépenses d\'énergie');
      if (!(b.energie_annee >= 2021)) m.push('année des prix de l\'énergie');
    }
  }
  if (b.copro == null && !estTerrain(b)) m.push('copropriété oui/non');
  if (b.copro === 1) {
    if (!(b.copro_lots > 0)) m.push('nombre de lots');
    if (b.copro_charges == null) m.push('charges de copropriété');
    if (!b.copro_procedure) m.push('procédure (copropriété)');
  }
  return m;
}
export const visible = (b, site = 'shawez') => b.statut === 'en vente' && !b.masque && String(b.sites || '').split(',').includes(site) && manque(b).length === 0;

/* Ce que l'on peut deviner du texte de l'agence (proposé dans /admin/biens/, jamais publié sans enregistrement) */
export function suggestions(b) {
  const s = {};
  const t = String(b.description || '');
  const d = t.match(/\bDPE\s*:?\s*([A-G])\b/) || t.match(/\bclasse\s+([A-G])\b/i) || t.match(/\bDPE\s+([A-G])\b/);
  if (d) s.dpe = d[1].toUpperCase();
  let c = {};
  try { c = JSON.parse(b.carac || '{}'); } catch (e) { /* */ }
  if ('honoraires_vendeur' in c || 'prix_vente' in c) s.honoraires_charge = 'vendeur';
  else if ('prix_honoraires_inclus' in c) s.honoraires_charge = 'acquereur';
  return s;
}

export function honorairesTexte(b) {
  if (b.honoraires_charge === 'vendeur') return 'Honoraires à la charge du vendeur.';
  if (b.honoraires_charge === 'acquereur') {
    const pct = String(Number(b.honoraires_pct).toFixed(2)).replace(/\.?0+$/, '').replace('.', ',');
    return `Honoraires : ${pct} % TTC du prix hors honoraires, à la charge de l'acquéreur. Prix hors honoraires : ${euros(b.prix_hors_hon)}.`;
  }
  return '';
}

/* ---------- Mesures (sans cookie) ---------- */
export const MESURES = ['vue', 'visite_clic', 'video', 'whatsapp', 'tel', 'estimer', 'visite_demande'];
export function jourParis(d = new Date()) {
  return new Intl.DateTimeFormat('fr-CA', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}
export async function compter(env, bienId, quoi) {
  if (!MESURES.includes(quoi)) throw new Erreur(400, 'mesure_inconnue');
  const base = await baseBiens(env.DB);
  await base.prepare(
    `INSERT INTO biens_mesures (bien_id, quoi, jour, n) VALUES (?1, ?2, ?3, 1)
     ON CONFLICT(bien_id, quoi, jour) DO UPDATE SET n = n + 1`
  ).bind(String(bienId).slice(0, 40), quoi, jourParis()).run();
}
export const robot = (request) => /bot|crawl|spider|slurp|lighthouse|headless|preview|facebookexternalhit|curl|wget/i.test(request.headers.get('User-Agent') || '');

/* Outils communs de l'API de l'espace estimation (Pages Functions + D1).
   Base D1 liée sous le nom DB. Les tables sont créées au premier appel si elles n'existent pas (schema.sql). */

export const SCHEMA = `
CREATE TABLE IF NOT EXISTS comptes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  mdp TEXT NOT NULL,
  civilite TEXT, prenom TEXT, nom TEXT, telephone TEXT,
  verifie INTEGER NOT NULL DEFAULT 0,
  source TEXT,
  consentement_le TEXT,
  cree_le TEXT NOT NULL,
  derniere_connexion TEXT
);
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  compte_id INTEGER NOT NULL,
  expire INTEGER NOT NULL,
  cree_le TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_compte ON sessions(compte_id);
CREATE TABLE IF NOT EXISTS demandes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reference TEXT NOT NULL UNIQUE,
  compte_id INTEGER,
  source TEXT NOT NULL,
  type TEXT NOT NULL,
  adresse TEXT, code_postal TEXT, commune TEXT, lat REAL, lon REAL,
  reponses TEXT NOT NULL,
  contact TEXT NOT NULL,
  prix_bas INTEGER, prix_haut INTEGER, prix_m2 INTEGER,
  comparables INTEGER, rayon INTEGER, donnees_du TEXT,
  statut TEXT NOT NULL DEFAULT 'recue',
  notes TEXT NOT NULL DEFAULT '',
  cree_le TEXT NOT NULL,
  maj_le TEXT
);
CREATE INDEX IF NOT EXISTS demandes_compte ON demandes(compte_id);
CREATE INDEX IF NOT EXISTS demandes_date ON demandes(cree_le);
CREATE TABLE IF NOT EXISTS jetons (
  id TEXT PRIMARY KEY,
  compte_id INTEGER NOT NULL,
  usage TEXT NOT NULL,
  expire INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS limites (
  cle TEXT PRIMARY KEY,
  n INTEGER NOT NULL,
  fin INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS fichiers (
  id TEXT PRIMARY KEY,
  demande_id INTEGER NOT NULL,
  compte_id INTEGER,
  role TEXT NOT NULL,
  nom TEXT NOT NULL,
  type TEXT NOT NULL,
  taille INTEGER NOT NULL,
  blocs INTEGER NOT NULL DEFAULT 0,
  stockage TEXT NOT NULL DEFAULT 'd1',
  depose_par TEXT NOT NULL,
  cree_le TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS fichiers_demande ON fichiers(demande_id);
CREATE TABLE IF NOT EXISTS fichiers_blocs (
  fichier_id TEXT NOT NULL,
  n INTEGER NOT NULL,
  data BLOB NOT NULL,
  PRIMARY KEY (fichier_id, n)
);
CREATE TABLE IF NOT EXISTS reglages (
  cle TEXT PRIMARY KEY,
  valeur TEXT NOT NULL
);
`;

/* Colonnes ajoutées après la première mise en service (ALTER TABLE si elles manquent). */
const COLONNES = [
  ['demandes', 'rappel_le', 'TEXT'],                       // « rappeler avant le » (AAAA-MM-JJ)
  ['demandes', 'en_attente', 'INTEGER NOT NULL DEFAULT 0'], // rattachée à un compte dont l'e-mail n'est pas encore prouvé
  ['demandes', 'cle', 'TEXT'],                              // clé d'idempotence du navigateur (double envoi, réseau lent)
  ['demandes', 'suspect', 'INTEGER NOT NULL DEFAULT 0'],    // robot probable : gardée, mais sans alerte ni compte
  ['demandes', 'resultat', 'TEXT'],                         // résultat complet affiché au client (JSON)
  ['sessions', 'prouve', 'INTEGER NOT NULL DEFAULT 0'],     // session ouverte avec une preuve (lien reçu par e-mail, mot de passe)
];
const VERSION_SCHEMA = '3';

/* Système parfait (étapes 2 à 4) : tables ajoutées à côté des premières, sans rien changer à celles-ci.
   Leur version est notée à part (réglage « schema_sp ») : le site en ligne et l'aperçu partagent la même base,
   et l'ancienne version du code ne doit rien avoir à refaire quand la nouvelle ajoute ses tables. */
export const SCHEMA_SP = `
CREATE TABLE IF NOT EXISTS evenements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  demande_id INTEGER NOT NULL,
  type TEXT NOT NULL,
  de TEXT, vers TEXT,
  detail TEXT,
  par TEXT NOT NULL,
  cree_le TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS evenements_demande ON evenements(demande_id, id);
CREATE TABLE IF NOT EXISTS visites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  demande_id INTEGER NOT NULL,
  etat TEXT NOT NULL DEFAULT 'demandee',
  creneaux TEXT NOT NULL DEFAULT '[]',
  debut TEXT,
  duree INTEGER NOT NULL DEFAULT 45,
  message TEXT NOT NULL DEFAULT '',
  demandee_le TEXT, fixee_le TEXT, rappel_le TEXT,
  cree_le TEXT NOT NULL, maj_le TEXT
);
CREATE INDEX IF NOT EXISTS visites_demande ON visites(demande_id);
CREATE INDEX IF NOT EXISTS visites_debut ON visites(debut);
CREATE TABLE IF NOT EXISTS avis (
  demande_id INTEGER PRIMARY KEY,
  contenu TEXT NOT NULL DEFAULT '{}',
  ventes TEXT,
  fichier_id TEXT,
  prepare_le TEXT, valide_le TEXT, maj_le TEXT
);
CREATE TABLE IF NOT EXISTS comptes_rendus (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  demande_id INTEGER NOT NULL,
  visite_le TEXT NOT NULL,
  texte TEXT NOT NULL,
  publie INTEGER NOT NULL DEFAULT 0,
  publie_le TEXT,
  cree_le TEXT NOT NULL, maj_le TEXT
);
CREATE INDEX IF NOT EXISTS comptes_rendus_demande ON comptes_rendus(demande_id);
CREATE TABLE IF NOT EXISTS offres (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  demande_id INTEGER NOT NULL,
  montant INTEGER NOT NULL,
  recue_le TEXT NOT NULL,
  conditions TEXT NOT NULL DEFAULT '',
  statut TEXT NOT NULL DEFAULT 'etude',
  decidee_le TEXT,
  cree_le TEXT NOT NULL, maj_le TEXT
);
CREATE INDEX IF NOT EXISTS offres_demande ON offres(demande_id);
CREATE TABLE IF NOT EXISTS notaires (
  demande_id INTEGER PRIMARY KEY,
  nom TEXT NOT NULL DEFAULT '',
  coordonnees TEXT NOT NULL DEFAULT '',
  etapes TEXT NOT NULL DEFAULT '{}',
  maj_le TEXT
);
CREATE TABLE IF NOT EXISTS courriers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  demande_id INTEGER NOT NULL,
  motif TEXT NOT NULL,
  contenu TEXT NOT NULL,
  origine TEXT NOT NULL,
  cree_le TEXT NOT NULL,
  envoye_le TEXT
);
CREATE TABLE IF NOT EXISTS mesures_biens (
  jour TEXT NOT NULL,
  ref TEXT NOT NULL,
  evt TEXT NOT NULL,
  n INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (jour, ref, evt)
);
CREATE TABLE IF NOT EXISTS socle_ombre (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  automation TEXT NOT NULL,
  site TEXT NOT NULL,
  site_raison TEXT,
  socle TEXT,
  regle TEXT,
  code TEXT,
  erreur TEXT,
  resultat TEXT NOT NULL,
  cree_le TEXT NOT NULL
);
`;
const COLONNES_SP = [
  ['courriers', 'canal', "TEXT NOT NULL DEFAULT 'email'"],
  ['courriers', 'source_reference', "TEXT"],
  ['courriers', 'avis_id', "TEXT"],
  ['courriers', 'retour', "TEXT"],
  ['courriers', 'retour_le', "TEXT"],

  ['demandes', 'raison', 'TEXT'],       // « Pas maintenant » ou « Perdu » : la raison notée par l'agence
  ['demandes', 'statut_le', 'TEXT'],    // date du dernier changement de statut
  ['fichiers', 'libelle', 'TEXT'],      // nature d'un document déposé par l'agence (mandat, diagnostics, compromis…)
];
/* 1 : étape 2 (journal, visites, avis de valeur). 2 : étape 3 (comptes rendus de visite, offres, notaire, e-mails
   gardés pour le matin, nature des documents). */
const VERSION_SP = '5';   // 3 : mesures_biens (vues, clics « Visiter », vidéo, par bien et par jour, sans cookie) ; 4 : socle_ombre (décisions du site et du socle AIMMO, côte à côte, sans donnée personnelle)

/* Les 10 statuts d'un dossier, dans l'ordre (jamais plus), et les deux sorties : « Pas maintenant » (relance programmée)
   et « Perdu » (raison notée). Les clés des cinq premiers statuts sont celles de la première version. */
export const PARCOURS = ['recue', 'appele', 'visite', 'avis', 'mandat', 'annonce', 'visites', 'offre', 'compromis', 'acte'];
export const SORTIES = ['pause', 'close'];
export const STATUTS = {
  recue: 'Estimation reçue',
  appele: 'Appelé',
  visite: 'Visite prévue',
  avis: 'Avis de valeur envoyé',
  mandat: 'Mandat signé',
  annonce: 'Annonce en ligne',
  visites: 'Visites en cours',
  offre: 'Offre reçue',
  compromis: 'Compromis signé',
  acte: 'Acte signé',
  pause: 'Pas maintenant',
  close: 'Perdu',
};
/* Les mêmes étapes, dites au vendeur dans son espace. */
export const STATUTS_CLIENT = {
  recue: 'Estimation reçue',
  appele: 'Premier appel',
  visite: 'Visite d\'estimation',
  avis: 'Avis de valeur',
  mandat: 'Mandat signé',
  annonce: 'Annonce en ligne',
  visites: 'Visites',
  offre: 'Offre reçue',
  compromis: 'Compromis signé',
  acte: 'Acte signé',
  pause: 'En pause',
  close: 'Dossier clos',
};

let pret = false;
export async function db(env) {
  if (!env.DB) throw new Erreur(503, 'base_absente');
  if (!pret) {
    // une seule petite lecture quand la base est à jour ; sinon création des tables et des colonnes manquantes
    let version = null;
    let versionSp = null;
    try {
      const r = await env.DB.prepare("SELECT cle, valeur FROM reglages WHERE cle IN ('schema', 'schema_sp')").all();
      for (const l of r.results || []) { if (l.cle === 'schema') version = l.valeur; else versionSp = l.valeur; }
    } catch (e) { /* première fois */ }
    const colonnes = async (liste) => {
      for (const table of [...new Set(liste.map((c) => c[0]))]) {
        const info = await env.DB.prepare(`PRAGMA table_info(${table})`).all();
        const presentes = new Set((info.results || []).map((c) => c.name));
        for (const [t, nom, type] of liste) {
          if (t !== table || presentes.has(nom)) continue;
          try { await env.DB.prepare(`ALTER TABLE ${t} ADD COLUMN ${nom} ${type}`).run(); }
          catch (e) { if (!/duplicate column/i.test(String(e && e.message))) throw e; }
        }
      }
    };
    const ordres = (sql) => sql.split(';').map((s) => s.trim()).filter(Boolean).map((s) => env.DB.prepare(s));
    if (version !== VERSION_SCHEMA) {
      await env.DB.batch(ordres(SCHEMA));
      await colonnes(COLONNES);
      await env.DB.prepare('CREATE UNIQUE INDEX IF NOT EXISTS demandes_cle ON demandes(cle)').run();
      await env.DB.prepare("INSERT INTO reglages (cle, valeur) VALUES ('schema', ?1) ON CONFLICT(cle) DO UPDATE SET valeur = ?1").bind(VERSION_SCHEMA).run();
    }
    if (!(Number(versionSp) >= Number(VERSION_SP))) {
      await env.DB.batch(ordres(SCHEMA_SP));
      await colonnes(COLONNES_SP);
      await env.DB.prepare("INSERT INTO reglages (cle, valeur) VALUES ('schema_sp', ?1) ON CONFLICT(cle) DO UPDATE SET valeur = ?1").bind(VERSION_SP).run();
    }
    pret = true;
  }
  return env.DB;
}

export class Erreur extends Error {
  constructor(status, code, extra) { super(code); this.status = status; this.code = code; this.extra = extra; }
}

export function json(status, corps, entetes = {}) {
  const h = new Headers({
    'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex',
    // réponses de l'API : jamais interprétées comme une page, jamais dans un cadre, jamais de provenance transmise
    'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'X-Frame-Options': 'DENY',
  });
  for (const [k, v] of Object.entries(entetes)) {
    if (Array.isArray(v)) v.forEach((x) => h.append(k, x)); else h.set(k, v);
  }
  return new Response(JSON.stringify(corps), { status, headers: h });
}

export const maintenant = () => new Date().toISOString();

/* ---------- Lecture et validation stricte ---------- */
export async function corps(request, max = 20000) {
  const ct = request.headers.get('Content-Type') || '';
  if (!ct.includes('application/json')) throw new Erreur(415, 'format');
  const brut = await request.text();
  if (brut.length > max) throw new Erreur(413, 'taille');
  try {
    const d = JSON.parse(brut);
    if (!d || typeof d !== 'object' || Array.isArray(d)) throw 0;
    return d;
  } catch { throw new Erreur(400, 'json'); }
}

export function texte(v, max, { requis = false, nom = 'champ' } = {}) {
  if (v == null || v === '') { if (requis) throw new Erreur(400, 'champs', { champ: nom }); return ''; }
  if (typeof v !== 'string' && typeof v !== 'number') throw new Erreur(400, 'champs', { champ: nom });
  // pas de caractères de contrôle
  const s = String(v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim();
  if (requis && !s) throw new Erreur(400, 'champs', { champ: nom });
  if (s.length > max) throw new Erreur(400, 'champs', { champ: nom });
  return s;
}

export function entier(v, min, max, { requis = false, nom = 'champ' } = {}) {
  if (v == null || v === '') { if (requis) throw new Erreur(400, 'champs', { champ: nom }); return null; }
  const n = Number(v);
  if (!Number.isFinite(n) || n < min || n > max) throw new Erreur(400, 'champs', { champ: nom });
  return Math.round(n);
}

export function choix(v, liste, { requis = false, nom = 'champ' } = {}) {
  if (v == null || v === '') { if (requis) throw new Erreur(400, 'champs', { champ: nom }); return ''; }
  if (!liste.includes(v)) throw new Erreur(400, 'champs', { champ: nom });
  return v;
}

export function email(v) {
  // mêmes règles à la création et à la connexion : sans espaces (même invisibles), en minuscules
  const brut = typeof v === 'string' ? v.replace(/[\s\u00A0\u200B-\u200D\u2060\uFEFF]/g, '') : v;
  const s = texte(brut, 160, { requis: true, nom: 'email' }).toLowerCase();
  if (!/^[^\s@"<>(),;:]+@[^\s@"<>(),;:]+\.[a-z]{2,}$/i.test(s)) throw new Erreur(400, 'champs', { champ: 'email' });
  return s;
}

export function telephone(v) {
  const s = texte(v, 30, { requis: true, nom: 'telephone' });
  const chiffres = s.replace(/[^\d]/g, '');
  if (!/^[+\d][\d\s.\-()]+$/.test(s) || chiffres.length < 9 || chiffres.length > 15) throw new Erreur(400, 'champs', { champ: 'telephone' });
  return s;
}

// Les espaces en début et en fin sont retirés, à l'enregistrement comme à la connexion : les claviers de téléphone
// en ajoutent un après une suggestion, et le mot de passe « ne marchait plus ».
export function motDePasse(v) {
  const s = typeof v === 'string' ? v.trim() : '';
  if (s.length < 8 || s.length > 200) throw new Erreur(400, 'champs', { champ: 'mot_de_passe' });
  return s;
}

/* ---------- Origine : les requêtes qui modifient viennent du site lui-même ---------- */
export function verifierOrigine(request) {
  if (request.method === 'GET' || request.method === 'HEAD') return;
  const o = request.headers.get('Origin');
  const ici = new URL(request.url).origin;
  if (!o || o !== ici) throw new Erreur(403, 'origine');
}

/* ---------- Limite de débit simple (D1) ---------- */
export function ip(request) {
  return request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || 'local';
}

export async function limiter(env, cle, max, secondes) {
  const f = Number(env.LIMITE_FACTEUR);           // tests locaux seulement : multiplie les plafonds
  if (Number.isFinite(f) && f >= 1 && f <= 1000) max = Math.round(max * f);
  const base = await db(env);
  const t = Math.floor(Date.now() / 1000);
  const r = await base.prepare(
    `INSERT INTO limites (cle, n, fin) VALUES (?1, 1, ?2)
     ON CONFLICT(cle) DO UPDATE SET n = CASE WHEN fin < ?3 THEN 1 ELSE n + 1 END,
                                    fin = CASE WHEN fin < ?3 THEN ?2 ELSE fin END
     RETURNING n`
  ).bind(cle, t + secondes, t).first();
  if (r && r.n > max) throw new Erreur(429, 'trop_de_demandes');
  // ménage occasionnel
  if (Math.random() < 0.02) await base.prepare('DELETE FROM limites WHERE fin < ?1').bind(t).run();
}

/* ---------- Mots de passe : PBKDF2-SHA256 (WebCrypto) ---------- */
// 100 000 : maximum accepté par WebCrypto dans les Workers. Réglable par la variable PBKDF2_ITER
// (chaque empreinte garde son propre nombre d'itérations : changer la valeur ne casse aucun compte).
let ITER = 100000;
export function reglerHachage(env) {
  const n = Number(env && env.PBKDF2_ITER);
  if (Number.isInteger(n) && n >= 10000 && n <= 100000) ITER = n;
}
const b64 = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf)));
const deb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function derive(mdp, sel, iter) {
  const cle = await crypto.subtle.importKey('raw', new TextEncoder().encode(mdp), 'PBKDF2', false, ['deriveBits']);
  return crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: sel, iterations: iter }, cle, 256);
}

export async function hacher(mdp) {
  const sel = crypto.getRandomValues(new Uint8Array(16));
  return `pbkdf2-sha256$${ITER}$${b64(sel)}$${b64(await derive(mdp, sel, ITER))}`;
}

async function memeEmpreinte(mdp, sel, iter, attendu) {
  const calc = new Uint8Array(await derive(mdp, sel, iter));
  if (calc.length !== attendu.length) return false;
  let diff = 0;
  for (let i = 0; i < calc.length; i++) diff |= calc[i] ^ attendu[i];
  return diff === 0;
}

/* Empreinte factice : quand l'e-mail n'a pas de compte (ou pas de mot de passe), le calcul est fait quand même,
   pour que le temps de réponse ne dise pas si l'adresse existe. */
let LEURRE = null;
export async function verifierLeurre(mdp) {
  if (!LEURRE) LEURRE = await hacher('leurre-' + jeton());
  await verifierMdp(typeof mdp === 'string' && mdp ? mdp.slice(0, 200) : 'x', LEURRE);
  return false;
}

export async function verifierMdp(mdp, stocke) {
  const [algo, iter, sel, h] = String(stocke || '').split('$');
  if (algo !== 'pbkdf2-sha256' || typeof mdp !== 'string' || !mdp || mdp.length > 200) return false;   // '' = compte sans mot de passe
  const s = deb64(sel), attendu = deb64(h), n = Number(iter);
  if (await memeEmpreinte(mdp, s, n, attendu)) return true;
  const net = mdp.trim();
  return net !== mdp && net.length > 0 && memeEmpreinte(net, s, n, attendu);
}

/* ---------- Jetons et sessions ---------- */
export function jeton() {
  const b = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function sha256(s) {
  const h = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(h)].map((x) => x.toString(16).padStart(2, '0')).join('');
}

const COOKIE = 'se_session';
const DUREE = 30 * 24 * 3600;            // vendeur : 30 jours sans visite
const DUREE_AGENCE = 7 * 24 * 3600;      // agence (accès à tous les dossiers) : 7 jours sans visite
const RENOUVELER = 24 * 3600;            // la session est prolongée au plus une fois par jour (une seule écriture)

// Deux cookies : la session (HttpOnly, illisible par les scripts) et un simple témoin « se_ok=1 », sans valeur secrète,
// que les pages lisent pour afficher le pictogramme « connecté » sans appeler l'API à chaque page.
const TEMOIN = 'se_ok';
const cookiesSession = (t, duree) => [
  `${COOKIE}=${t}; Path=/; Max-Age=${duree}; HttpOnly; Secure; SameSite=Lax`,
  `${TEMOIN}=1; Path=/; Max-Age=${duree}; Secure; SameSite=Lax`,
];
const dureeDe = (compte, env) => (estAdmin(compte, env) ? DUREE_AGENCE : DUREE);

export async function ouvrirSession(env, compteId, prouve = false) {
  const base = await db(env);
  const t = jeton();
  const c = await base.prepare('SELECT email, verifie FROM comptes WHERE id = ?1').bind(compteId).first();
  const duree = dureeDe(c, env);
  const exp = Math.floor(Date.now() / 1000) + duree;
  await base.batch([
    base.prepare('INSERT INTO sessions (id, compte_id, expire, cree_le, prouve) VALUES (?1, ?2, ?3, ?4, ?5)').bind(await sha256(t), compteId, exp, maintenant(), prouve ? 1 : 0),
    base.prepare('UPDATE comptes SET derniere_connexion = ?1 WHERE id = ?2').bind(maintenant(), compteId),
    base.prepare('DELETE FROM sessions WHERE expire < ?1').bind(Math.floor(Date.now() / 1000)),
  ]);
  return cookiesSession(t, duree);
}

export const cookieEfface = [
  `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`,
  `${TEMOIN}=; Path=/; Max-Age=0; Secure; SameSite=Lax`,
];
export const temoinPresent = (request) => /(?:^|;\s*)se_ok=1/.test(request.headers.get('Cookie') || '');

function lireCookie(request) {
  const c = request.headers.get('Cookie') || '';
  const m = c.match(new RegExp('(?:^|;\\s*)' + COOKIE + '=([A-Za-z0-9_-]{20,})'));
  return m ? m[1] : null;
}

/* Session glissante : tant que la personne revient, elle reste connectée (30 jours sans visite pour un vendeur,
   7 jours pour l'agence). La prolongation s'écrit au plus une fois par jour et le cookie prolongé repart avec la
   réponse (renouvellement(request), lu par l'API). Une ancienne session de l'agence ouverte pour 30 jours est ramenée à 7. */
const renouvellements = new WeakMap();
export const renouvellement = (request) => renouvellements.get(request) || null;

export async function compteSession(request, env) {
  const t = lireCookie(request);
  if (!t) return null;
  const base = await db(env);
  const id = await sha256(t);
  const maintenantS = Math.floor(Date.now() / 1000);
  const r = await base.prepare(
    `SELECT c.* , s.id AS session_id, s.prouve AS session_prouvee, s.expire AS session_expire FROM sessions s JOIN comptes c ON c.id = s.compte_id WHERE s.id = ?1 AND s.expire > ?2`
  ).bind(id, maintenantS).first();
  if (!r) return null;
  const duree = dureeDe(r, env);
  if (Math.abs(r.session_expire - (maintenantS + duree)) > RENOUVELER) {
    try {
      await base.prepare('UPDATE sessions SET expire = ?1 WHERE id = ?2').bind(maintenantS + duree, id).run();
      renouvellements.set(request, cookiesSession(t, duree));
    } catch (e) { /* la session reste valable jusqu'à son ancienne échéance */ }
  }
  return r;
}

export async function fermerSession(request, env) {
  const t = lireCookie(request);
  if (t) await (await db(env)).prepare('DELETE FROM sessions WHERE id = ?1').bind(await sha256(t)).run();
}

/* Déconnexion de tous les appareils (téléphone perdu, ordinateur partagé). */
export async function fermerSessions(env, compteId) {
  await (await db(env)).prepare('DELETE FROM sessions WHERE compte_id = ?1').bind(compteId).run();
}

/* ---------- Admins ---------- */
export function admins(env) {
  return String(env.ADMIN_EMAILS || 'shawez@gravelin-immo.com').split(/[,;\s]+/).map((s) => s.trim().toLowerCase()).filter(Boolean);
}

// Un compte est admin si son e-mail figure dans ADMIN_EMAILS ET a été vérifié (lien reçu par e-mail,
// ou validation manuelle dans la console D1) : personne ne peut devenir admin en créant un compte à ce nom.
export function estAdmin(compte, env) {
  return !!(compte && compte.verifie && admins(env).includes(String(compte.email).toLowerCase()));
}

export function comptepublic(c, env) {
  return {
    email: c.email, civilite: c.civilite || '', prenom: c.prenom || '', nom: c.nom || '', telephone: c.telephone || '',
    verifie: !!c.verifie, admin: estAdmin(c, env), cree_le: c.cree_le, mot_de_passe: !!c.mdp,
  };
}

export const SQL_COURRIERS_DUS = "SELECT * FROM courriers WHERE canal = 'email' AND envoye_le IS NULL ORDER BY id LIMIT 25";
export const SQL_COURRIERS_NETTOYAGE = "DELETE FROM courriers WHERE canal = 'email' AND envoye_le IS NOT NULL AND envoye_le < ?1";

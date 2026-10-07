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
`;

export const STATUTS = {
  recue: 'Demande reçue',
  visite: 'Visite prévue',
  avis: 'Avis de valeur envoyé',
  close: 'Dossier clos',
};

let pret = false;
export async function db(env) {
  if (!env.DB) throw new Erreur(503, 'base_absente');
  if (!pret) {
    const ordres = SCHEMA.split(';').map((s) => s.trim()).filter(Boolean);
    await env.DB.batch(ordres.map((s) => env.DB.prepare(s)));
    pret = true;
  }
  return env.DB;
}

export class Erreur extends Error {
  constructor(status, code, extra) { super(code); this.status = status; this.code = code; this.extra = extra; }
}

export function json(status, corps, entetes = {}) {
  const h = new Headers({ 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' });
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
  const s = texte(v, 160, { requis: true, nom: 'email' }).toLowerCase();
  if (!/^[^\s@"<>(),;:]+@[^\s@"<>(),;:]+\.[a-z]{2,}$/i.test(s)) throw new Erreur(400, 'champs', { champ: 'email' });
  return s;
}

export function telephone(v) {
  const s = texte(v, 30, { requis: true, nom: 'telephone' });
  const chiffres = s.replace(/[^\d]/g, '');
  if (!/^[+\d][\d\s.\-()]+$/.test(s) || chiffres.length < 9 || chiffres.length > 15) throw new Erreur(400, 'champs', { champ: 'telephone' });
  return s;
}

export function motDePasse(v) {
  if (typeof v !== 'string' || v.length < 8 || v.length > 200) throw new Erreur(400, 'champs', { champ: 'mot_de_passe' });
  return v;
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

export async function verifierMdp(mdp, stocke) {
  const [algo, iter, sel, h] = String(stocke || '').split('$');
  if (algo !== 'pbkdf2-sha256') return false;
  const calc = new Uint8Array(await derive(mdp, deb64(sel), Number(iter)));
  const attendu = deb64(h);
  if (calc.length !== attendu.length) return false;
  let diff = 0;
  for (let i = 0; i < calc.length; i++) diff |= calc[i] ^ attendu[i];
  return diff === 0;
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
const DUREE = 30 * 24 * 3600;

export async function ouvrirSession(env, compteId) {
  const base = await db(env);
  const t = jeton();
  const exp = Math.floor(Date.now() / 1000) + DUREE;
  await base.batch([
    base.prepare('INSERT INTO sessions (id, compte_id, expire, cree_le) VALUES (?1, ?2, ?3, ?4)').bind(await sha256(t), compteId, exp, maintenant()),
    base.prepare('UPDATE comptes SET derniere_connexion = ?1 WHERE id = ?2').bind(maintenant(), compteId),
    base.prepare('DELETE FROM sessions WHERE expire < ?1').bind(Math.floor(Date.now() / 1000)),
  ]);
  return `${COOKIE}=${t}; Path=/; Max-Age=${DUREE}; HttpOnly; Secure; SameSite=Lax`;
}

export const cookieEfface = `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`;

function lireCookie(request) {
  const c = request.headers.get('Cookie') || '';
  const m = c.match(new RegExp('(?:^|;\\s*)' + COOKIE + '=([A-Za-z0-9_-]{20,})'));
  return m ? m[1] : null;
}

export async function compteSession(request, env) {
  const t = lireCookie(request);
  if (!t) return null;
  const base = await db(env);
  const r = await base.prepare(
    `SELECT c.* , s.id AS session_id FROM sessions s JOIN comptes c ON c.id = s.compte_id WHERE s.id = ?1 AND s.expire > ?2`
  ).bind(await sha256(t), Math.floor(Date.now() / 1000)).first();
  return r || null;
}

export async function fermerSession(request, env) {
  const t = lireCookie(request);
  if (t) await (await db(env)).prepare('DELETE FROM sessions WHERE id = ?1').bind(await sha256(t)).run();
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
    verifie: !!c.verifie, admin: estAdmin(c, env), cree_le: c.cree_le,
  };
}

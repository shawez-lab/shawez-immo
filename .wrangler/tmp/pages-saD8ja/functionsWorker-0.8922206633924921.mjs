var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// _lib/base.js
var SCHEMA = `
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
var STATUTS = {
  recue: "Demande re\xE7ue",
  visite: "Visite pr\xE9vue",
  avis: "Avis de valeur envoy\xE9",
  close: "Dossier clos"
};
var pret = false;
async function db(env) {
  if (!env.DB) throw new Erreur(503, "base_absente");
  if (!pret) {
    const ordres = SCHEMA.split(";").map((s) => s.trim()).filter(Boolean);
    await env.DB.batch(ordres.map((s) => env.DB.prepare(s)));
    pret = true;
  }
  return env.DB;
}
__name(db, "db");
var Erreur = class extends Error {
  static {
    __name(this, "Erreur");
  }
  constructor(status, code, extra) {
    super(code);
    this.status = status;
    this.code = code;
    this.extra = extra;
  }
};
function json(status, corps2, entetes = {}) {
  const h = new Headers({ "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex" });
  for (const [k, v] of Object.entries(entetes)) {
    if (Array.isArray(v)) v.forEach((x) => h.append(k, x));
    else h.set(k, v);
  }
  return new Response(JSON.stringify(corps2), { status, headers: h });
}
__name(json, "json");
var maintenant = /* @__PURE__ */ __name(() => (/* @__PURE__ */ new Date()).toISOString(), "maintenant");
async function corps(request, max = 2e4) {
  const ct = request.headers.get("Content-Type") || "";
  if (!ct.includes("application/json")) throw new Erreur(415, "format");
  const brut = await request.text();
  if (brut.length > max) throw new Erreur(413, "taille");
  try {
    const d = JSON.parse(brut);
    if (!d || typeof d !== "object" || Array.isArray(d)) throw 0;
    return d;
  } catch {
    throw new Erreur(400, "json");
  }
}
__name(corps, "corps");
function texte(v, max, { requis = false, nom = "champ" } = {}) {
  if (v == null || v === "") {
    if (requis) throw new Erreur(400, "champs", { champ: nom });
    return "";
  }
  if (typeof v !== "string" && typeof v !== "number") throw new Erreur(400, "champs", { champ: nom });
  const s = String(v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim();
  if (requis && !s) throw new Erreur(400, "champs", { champ: nom });
  if (s.length > max) throw new Erreur(400, "champs", { champ: nom });
  return s;
}
__name(texte, "texte");
function entier(v, min, max, { requis = false, nom = "champ" } = {}) {
  if (v == null || v === "") {
    if (requis) throw new Erreur(400, "champs", { champ: nom });
    return null;
  }
  const n = Number(v);
  if (!Number.isFinite(n) || n < min || n > max) throw new Erreur(400, "champs", { champ: nom });
  return Math.round(n);
}
__name(entier, "entier");
function choix(v, liste, { requis = false, nom = "champ" } = {}) {
  if (v == null || v === "") {
    if (requis) throw new Erreur(400, "champs", { champ: nom });
    return "";
  }
  if (!liste.includes(v)) throw new Erreur(400, "champs", { champ: nom });
  return v;
}
__name(choix, "choix");
function email(v) {
  const s = texte(v, 160, { requis: true, nom: "email" }).toLowerCase();
  if (!/^[^\s@"<>(),;:]+@[^\s@"<>(),;:]+\.[a-z]{2,}$/i.test(s)) throw new Erreur(400, "champs", { champ: "email" });
  return s;
}
__name(email, "email");
function telephone(v) {
  const s = texte(v, 30, { requis: true, nom: "telephone" });
  const chiffres = s.replace(/[^\d]/g, "");
  if (!/^[+\d][\d\s.\-()]+$/.test(s) || chiffres.length < 9 || chiffres.length > 15) throw new Erreur(400, "champs", { champ: "telephone" });
  return s;
}
__name(telephone, "telephone");
function motDePasse(v) {
  if (typeof v !== "string" || v.length < 8 || v.length > 200) throw new Erreur(400, "champs", { champ: "mot_de_passe" });
  return v;
}
__name(motDePasse, "motDePasse");
function verifierOrigine(request) {
  if (request.method === "GET" || request.method === "HEAD") return;
  const o = request.headers.get("Origin");
  const ici = new URL(request.url).origin;
  if (!o || o !== ici) throw new Erreur(403, "origine");
}
__name(verifierOrigine, "verifierOrigine");
function ip(request) {
  return request.headers.get("CF-Connecting-IP") || request.headers.get("X-Forwarded-For") || "local";
}
__name(ip, "ip");
async function limiter(env, cle, max, secondes) {
  const base = await db(env);
  const t = Math.floor(Date.now() / 1e3);
  const r = await base.prepare(
    `INSERT INTO limites (cle, n, fin) VALUES (?1, 1, ?2)
     ON CONFLICT(cle) DO UPDATE SET n = CASE WHEN fin < ?3 THEN 1 ELSE n + 1 END,
                                    fin = CASE WHEN fin < ?3 THEN ?2 ELSE fin END
     RETURNING n`
  ).bind(cle, t + secondes, t).first();
  if (r && r.n > max) throw new Erreur(429, "trop_de_demandes");
  if (Math.random() < 0.02) await base.prepare("DELETE FROM limites WHERE fin < ?1").bind(t).run();
}
__name(limiter, "limiter");
var ITER = 1e5;
var b64 = /* @__PURE__ */ __name((buf) => btoa(String.fromCharCode(...new Uint8Array(buf))), "b64");
var deb64 = /* @__PURE__ */ __name((s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0)), "deb64");
async function derive(mdp, sel, iter) {
  const cle = await crypto.subtle.importKey("raw", new TextEncoder().encode(mdp), "PBKDF2", false, ["deriveBits"]);
  return crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: sel, iterations: iter }, cle, 256);
}
__name(derive, "derive");
async function hacher(mdp) {
  const sel = crypto.getRandomValues(new Uint8Array(16));
  return `pbkdf2-sha256$${ITER}$${b64(sel)}$${b64(await derive(mdp, sel, ITER))}`;
}
__name(hacher, "hacher");
async function verifierMdp(mdp, stocke) {
  const [algo, iter, sel, h] = String(stocke || "").split("$");
  if (algo !== "pbkdf2-sha256") return false;
  const calc = new Uint8Array(await derive(mdp, deb64(sel), Number(iter)));
  const attendu = deb64(h);
  if (calc.length !== attendu.length) return false;
  let diff = 0;
  for (let i = 0; i < calc.length; i++) diff |= calc[i] ^ attendu[i];
  return diff === 0;
}
__name(verifierMdp, "verifierMdp");
function jeton() {
  const b = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...b)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
__name(jeton, "jeton");
async function sha256(s) {
  const h = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(h)].map((x) => x.toString(16).padStart(2, "0")).join("");
}
__name(sha256, "sha256");
var COOKIE = "se_session";
var DUREE = 30 * 24 * 3600;
async function ouvrirSession(env, compteId) {
  const base = await db(env);
  const t = jeton();
  const exp = Math.floor(Date.now() / 1e3) + DUREE;
  await base.batch([
    base.prepare("INSERT INTO sessions (id, compte_id, expire, cree_le) VALUES (?1, ?2, ?3, ?4)").bind(await sha256(t), compteId, exp, maintenant()),
    base.prepare("UPDATE comptes SET derniere_connexion = ?1 WHERE id = ?2").bind(maintenant(), compteId),
    base.prepare("DELETE FROM sessions WHERE expire < ?1").bind(Math.floor(Date.now() / 1e3))
  ]);
  return `${COOKIE}=${t}; Path=/; Max-Age=${DUREE}; HttpOnly; Secure; SameSite=Lax`;
}
__name(ouvrirSession, "ouvrirSession");
var cookieEfface = `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`;
function lireCookie(request) {
  const c = request.headers.get("Cookie") || "";
  const m = c.match(new RegExp("(?:^|;\\s*)" + COOKIE + "=([A-Za-z0-9_-]{20,})"));
  return m ? m[1] : null;
}
__name(lireCookie, "lireCookie");
async function compteSession(request, env) {
  const t = lireCookie(request);
  if (!t) return null;
  const base = await db(env);
  const r = await base.prepare(
    `SELECT c.* , s.id AS session_id FROM sessions s JOIN comptes c ON c.id = s.compte_id WHERE s.id = ?1 AND s.expire > ?2`
  ).bind(await sha256(t), Math.floor(Date.now() / 1e3)).first();
  return r || null;
}
__name(compteSession, "compteSession");
async function fermerSession(request, env) {
  const t = lireCookie(request);
  if (t) await (await db(env)).prepare("DELETE FROM sessions WHERE id = ?1").bind(await sha256(t)).run();
}
__name(fermerSession, "fermerSession");
function admins(env) {
  return String(env.ADMIN_EMAILS || "shawez@gravelin-immo.com").split(/[,;\s]+/).map((s) => s.trim().toLowerCase()).filter(Boolean);
}
__name(admins, "admins");
function estAdmin(compte, env) {
  return !!(compte && compte.verifie && admins(env).includes(String(compte.email).toLowerCase()));
}
__name(estAdmin, "estAdmin");
function comptepublic(c, env) {
  return {
    email: c.email,
    civilite: c.civilite || "",
    prenom: c.prenom || "",
    nom: c.nom || "",
    telephone: c.telephone || "",
    verifie: !!c.verifie,
    admin: estAdmin(c, env),
    cree_le: c.cree_le
  };
}
__name(comptepublic, "comptepublic");

// _lib/estimation.js
var RAYONS = {
  appartement: [300, 500, 800, 1200, 2e3, 3e3, 5e3],
  maison: [500, 1e3, 2e3, 3e3, 5e3, 8e3, 12e3]
};
var VISE = 12;
var MINI = 5;
var tuiles = /* @__PURE__ */ new Map();
var index = null;
async function lireJson(env, base, chemin) {
  const r = await env.ASSETS.fetch(new URL(chemin, base));
  if (!r.ok) return null;
  return r.json();
}
__name(lireJson, "lireJson");
async function chargerIndex(env, base) {
  if (!index) index = await lireJson(env, base, "/donnees-dvf/index.json");
  return index;
}
__name(chargerIndex, "chargerIndex");
async function tuile(env, base, nom) {
  if (!tuiles.has(nom)) tuiles.set(nom, index.tuiles.includes(nom) ? await lireJson(env, base, `/donnees-dvf/t/${nom}.json`) || [] : []);
  return tuiles.get(nom);
}
__name(tuile, "tuile");
function distance(lat1, lon1, lat2, lon2) {
  const k = Math.PI / 180;
  const x = (lon2 - lon1) * k * Math.cos((lat1 + lat2) / 2 * k);
  const y = (lat2 - lat1) * k;
  return Math.sqrt(x * x + y * y) * 6371e3;
}
__name(distance, "distance");
function quantile(tri, q) {
  const p = (tri.length - 1) * q;
  const b = Math.floor(p);
  return tri[b] + (tri[Math.min(b + 1, tri.length - 1)] - tri[b]) * (p - b);
}
__name(quantile, "quantile");
function arrondi(v) {
  const pas = v >= 5e5 ? 5e3 : 1e3;
  return Math.round(v / pas) * pas;
}
__name(arrondi, "arrondi");
function ajustements(r) {
  const lignes = [];
  const add = /* @__PURE__ */ __name((libelle, v) => {
    if (v) lignes.push([libelle, v]);
  }, "add");
  const etat = { travaux: -0.12, rafraichir: -0.05, bon: 0, neuf: 0.06 }[r.etat] || 0;
  add("\xC9tat g\xE9n\xE9ral", etat);
  const epoque = { avant1948: 0, "1948-1974": -0.03, "1975-2000": 0, "2001-2012": 0.02, apres2012: 0.04 }[r.epoque] || 0;
  add("\xC9poque de construction", epoque);
  if (r.type === "appartement") {
    const et = r.etage ?? 0;
    if (et === 0) add("Rez-de-chauss\xE9e", -0.05);
    if (et >= 3 && !r.ascenseur) add("\xC9tage \xE9lev\xE9 sans ascenseur", -Math.min(0.08, 0.03 * (et - 2)));
    if (et >= 4 && r.ascenseur) add("\xC9tage \xE9lev\xE9 avec ascenseur", 0.02);
    if (et > 0 && r.etages_immeuble && et >= r.etages_immeuble) add("Dernier \xE9tage", 0.02);
    if (r.terrasse) add("Terrasse", 0.05);
    else if (r.balcon) add("Balcon", 0.02);
    if (r.parking_box) add("Garage ou box", 0.03);
    else if (r.parking) add("Place de parking", 0.02);
    if (r.cave) add("Cave", 0.01);
    if (r.gardien) add("Gardien", 0.01);
  } else {
    if (r.piscine) add("Piscine", 0.04);
    if (r.garage) add("Garage", 0.03);
    if (r.plain_pied) add("Plain-pied", 0.02);
    if (r.terrasse) add("Terrasse", 0.02);
    if ((r.terrain || 0) >= 1500) add("Grand terrain", 0.03);
    else if (r.terrain != null && r.terrain < 150) add("Petit terrain", -0.03);
  }
  let total = lignes.reduce((s, [, v]) => s + v, 0);
  total = Math.max(-0.25, Math.min(0.18, total));
  return { total, lignes };
}
__name(ajustements, "ajustements");
async function estimer(env, requestUrl, r) {
  const base = new URL(requestUrl).origin;
  const idx = await chargerIndex(env, base);
  const meta = idx ? { donnees_du: idx.derniere_vente, annees: idx.annees, source: idx.source } : { donnees_du: null };
  const sans = /* @__PURE__ */ __name((raison) => ({ fourchette: false, raison, ...meta }), "sans");
  if (!idx) return sans("donnees_absentes");
  if (r.type !== "appartement" && r.type !== "maison") return sans("type");
  if (r.lat == null || r.lon == null || !r.surface) return sans("adresse");
  if (!String(r.code_postal || "").startsWith(idx.departement)) return sans("hors_zone");
  const t = r.type === "maison" ? 1 : 0;
  const [smin, smax] = t ? [0.6, 1.7] : [0.6, 1.6];
  const pas = idx.tuile;
  let comps = [];
  let rayon = 0;
  for (const rr of RAYONS[r.type]) {
    rayon = rr;
    const dLat = rr / 111320;
    const dLon = rr / (111320 * Math.cos(r.lat * Math.PI / 180));
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
  if (comps.length < MINI) return { ...sans("peu_de_ventes"), comparables: comps.length, rayon };
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
    ...meta
  };
}
__name(estimer, "estimer");

// _lib/mail.js
var enc = /* @__PURE__ */ __name((s) => "=?UTF-8?B?" + btoa(unescape(encodeURIComponent(s))) + "?=", "enc");
var b642 = /* @__PURE__ */ __name((s) => btoa(unescape(encodeURIComponent(s))).replace(/.{76}/g, "$&\r\n"), "b64");
function mailPossible(env) {
  return !!(env.EMAIL || env.MAILER);
}
__name(mailPossible, "mailPossible");
function peutEcrire(env, to) {
  if (!mailPossible(env)) return false;
  if (String(env.CLIENT_MAIL || "") === "1") return true;
  const verifiees = String((env.ADMIN_EMAILS || "shawez@gravelin-immo.com") + "," + (env.NOTIFY_EMAILS || "shawez@gravelin-immo.com")).toLowerCase().split(/[,;\s]+/).filter(Boolean);
  return verifiees.includes(String(to || "").toLowerCase());
}
__name(peutEcrire, "peutEcrire");
function mime({ from, to, subject, text, html, replyTo }) {
  const fr = "b" + crypto.randomUUID().replace(/-/g, "");
  const domaine = from.split("@")[1];
  return [
    `From: ${enc("Shawez Ali \u2014 Estimation")} <${from}>`,
    `To: <${to}>`,
    replyTo ? `Reply-To: <${replyTo}>` : null,
    `Subject: ${enc(subject)}`,
    `Message-ID: <${crypto.randomUUID()}@${domaine}>`,
    `Date: ${(/* @__PURE__ */ new Date()).toUTCString()}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${fr}"`,
    "",
    `--${fr}`,
    "Content-Type: text/plain; charset=utf-8",
    "Content-Transfer-Encoding: base64",
    "",
    b642(text),
    `--${fr}`,
    "Content-Type: text/html; charset=utf-8",
    "Content-Transfer-Encoding: base64",
    "",
    b642(html),
    `--${fr}--`,
    ""
  ].filter((l) => l !== null).join("\r\n");
}
__name(mime, "mime");
async function envoyer(env, m) {
  const from = env.MAIL_FROM || "estimation@shawez-immo.com";
  const msg = { ...m, from };
  if (env.EMAIL) {
    try {
      await env.EMAIL.send({ to: m.to, from: { email: from, name: "Shawez Ali \u2014 Estimation" }, subject: m.subject, text: m.text, html: m.html, replyTo: m.replyTo });
      return true;
    } catch (e1) {
      try {
        const { EmailMessage } = await import("cloudflare:email");
        await env.EMAIL.send(new EmailMessage(from, m.to, mime(msg)));
        return true;
      } catch (e2) {
        console.log("email", e1 && e1.message, e2 && e2.message);
      }
    }
  }
  if (env.MAILER) {
    try {
      const r = await env.MAILER.fetch("https://mailer/envoyer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(msg)
      });
      if (r.ok) return true;
      console.log("mailer", r.status, await r.text());
    } catch (e) {
      console.log("mailer", e && e.message);
    }
  }
  return false;
}
__name(envoyer, "envoyer");
var esc = /* @__PURE__ */ __name((s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]), "esc");
function gabarit(titre, blocs) {
  return `<!doctype html><html lang="fr"><body style="margin:0;background:#F7F6F2;font-family:Arial,Helvetica,sans-serif;color:#0F0E0C;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F7F6F2;"><tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border:1px solid #E1DCD2;">
<tr><td style="padding:24px 24px 8px;font-size:12px;letter-spacing:.13em;text-transform:uppercase;color:#8A6614;font-weight:bold;">Shawez Ali \xB7 Estimation</td></tr>
<tr><td style="padding:0 24px 8px;font-size:24px;line-height:1.2;">${esc(titre)}</td></tr>
${blocs}
<tr><td style="padding:20px 24px 24px;font-size:12px;color:#6B655C;border-top:1px solid #E1DCD2;">GRAVELIN IMMO \u2014 30 rue Bannelier, 21000 Dijon \xB7 shawez-immo.com</td></tr>
</table></td></tr></table></body></html>`;
}
__name(gabarit, "gabarit");
var bouton = /* @__PURE__ */ __name((lien, libelle, sombre = true) => `<a href="${esc(lien)}" style="display:inline-block;padding:14px 22px;margin:4px 8px 4px 0;border-radius:999px;font-weight:bold;text-decoration:none;font-size:15px;${sombre ? "background:#0F0E0C;color:#F3EFE6;" : "border:1px solid #0F0E0C;color:#0F0E0C;"}">${esc(libelle)}</a>`, "bouton");

// api/espace/[[route]].js
async function onRequest(context) {
  const { request, env, params } = context;
  const chemin = "/" + [].concat(params.route || []).join("/");
  try {
    verifierOrigine(request);
    const r = ROUTES[`${request.method} ${chemin}`];
    if (!r) return json(404, { error: "introuvable" });
    return await r(context);
  } catch (e) {
    if (e instanceof Erreur) return json(e.status, { error: e.code, ...e.extra || {} });
    console.log("erreur", e && e.stack);
    return json(500, { error: "serveur" });
  }
}
__name(onRequest, "onRequest");
var ROUTES = {
  "GET /sante": sante,
  "POST /estimation": estimation,
  "POST /connexion": connexion,
  "POST /deconnexion": deconnexion,
  "POST /inscription": inscription,
  "POST /mot-de-passe/oubli": oubli,
  "POST /mot-de-passe/reinit": reinit,
  "GET /verifier": verifier,
  "GET /moi": moi,
  "POST /verification": renvoyerVerification,
  "POST /compte/supprimer": supprimerCompte,
  "GET /admin/demandes": adminDemandes,
  "GET /admin/comptes": adminComptes,
  "POST /admin/demande": adminDemande,
  "POST /admin/compte/supprimer": adminSupprimerCompte,
  "POST /admin/compte/lien": adminLienMdp,
  "GET /admin/export.csv": adminExport
};
async function sante({ env, request }) {
  let base = false, dvf = null;
  try {
    await (await db(env)).prepare("SELECT 1").first();
    base = true;
  } catch (e) {
  }
  try {
    const r = await env.ASSETS.fetch(new URL("/donnees-dvf/index.json", request.url));
    if (r.ok) {
      const i = await r.json();
      dvf = { ventes: i.ventes, derniere_vente: i.derniere_vente, annees: i.annees };
    }
  } catch (e) {
  }
  return json(200, { base, dvf, email: mailPossible(env) });
}
__name(sante, "sante");
function antiRobot(d) {
  if (d.website) return true;
  const ms = Number(d.duree);
  return !Number.isFinite(ms) || ms < 4e3;
}
__name(antiRobot, "antiRobot");
var BOOL = /* @__PURE__ */ __name((v) => v === true, "BOOL");
function lireReponses(d) {
  const type = choix(d.type, ["appartement", "maison", "autre"], { requis: true, nom: "type" });
  const r = {
    type,
    adresse: texte(d.adresse, 200, { requis: true, nom: "adresse" }),
    code_postal: texte(d.code_postal, 5, { nom: "code_postal" }),
    commune: texte(d.commune, 100, { nom: "commune" }),
    citycode: texte(d.citycode, 5, { nom: "citycode" }),
    lat: d.lat == null || d.lat === "" ? null : Number(d.lat),
    lon: d.lon == null || d.lon === "" ? null : Number(d.lon),
    prix_ideal: entier(d.prix_ideal, 0, 1e8, { nom: "prix_ideal" }),
    delai: choix(d.delai, ["asap", "6mois", "plus6mois", "nsp", "aucun"], { requis: true, nom: "delai" }),
    message: texte(d.message, 1500, { nom: "message" })
  };
  if (r.code_postal && !/^\d{5}$/.test(r.code_postal)) throw new Erreur(400, "champs", { champ: "code_postal" });
  if (r.lat != null && !(r.lat > 41 && r.lat < 52)) throw new Erreur(400, "champs", { champ: "lat" });
  if (r.lon != null && !(r.lon > -6 && r.lon < 10)) throw new Erreur(400, "champs", { champ: "lon" });
  if (type === "autre") {
    r.autre_type = choix(d.autre_type, ["commerce", "murs", "immeuble", "terrain", "autre"], { requis: true, nom: "autre_type" });
    r.surface = entier(d.surface, 1, 1e5, { nom: "surface" });
    return r;
  }
  Object.assign(r, {
    surface: entier(d.surface, 9, 2e3, { requis: true, nom: "surface" }),
    pieces: entier(d.pieces, 1, 30, { requis: true, nom: "pieces" }),
    chambres: entier(d.chambres, 0, 20, { requis: true, nom: "chambres" }),
    epoque: choix(d.epoque, ["avant1948", "1948-1974", "1975-2000", "2001-2012", "apres2012", "nsp"], { requis: true, nom: "epoque" }),
    etat: choix(d.etat, ["travaux", "rafraichir", "bon", "neuf"], { requis: true, nom: "etat" }),
    terrasse: BOOL(d.terrasse)
  });
  if (type === "appartement") {
    Object.assign(r, {
      etage: entier(d.etage, 0, 60, { requis: true, nom: "etage" }),
      etages_immeuble: entier(d.etages_immeuble, 0, 60, { requis: true, nom: "etages_immeuble" }),
      ascenseur: BOOL(d.ascenseur),
      balcon: BOOL(d.balcon),
      cave: BOOL(d.cave),
      gardien: BOOL(d.gardien),
      parking: BOOL(d.parking),
      parking_box: BOOL(d.parking_box)
    });
  } else {
    Object.assign(r, {
      terrain: entier(d.terrain, 0, 1e6, { requis: true, nom: "terrain" }),
      niveaux: entier(d.niveaux, 1, 6, { requis: true, nom: "niveaux" }),
      plain_pied: BOOL(d.plain_pied),
      piscine: BOOL(d.piscine),
      garage: BOOL(d.garage)
    });
  }
  return r;
}
__name(lireReponses, "lireReponses");
function lireContact(c) {
  if (!c || typeof c !== "object") throw new Erreur(400, "champs", { champ: "contact" });
  return {
    civilite: choix(c.civilite, ["M.", "Mme"], { nom: "civilite" }),
    prenom: texte(c.prenom, 80, { requis: true, nom: "prenom" }),
    nom: texte(c.nom, 80, { requis: true, nom: "nom" }),
    email: email(c.email),
    telephone: telephone(c.telephone)
  };
}
__name(lireContact, "lireContact");
function reference() {
  const d = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10).replace(/-/g, "");
  return `E-${d}-${crypto.randomUUID().replace(/-/g, "").slice(0, 6).toUpperCase()}`;
}
__name(reference, "reference");
function source(request, env) {
  return env.SOURCE || new URL(request.url).hostname.replace(/^www\./, "");
}
__name(source, "source");
async function estimation(ctx) {
  const { request, env } = ctx;
  const d = await corps(request);
  if (antiRobot(d)) return json(202, { reference: reference(), resultat: { fourchette: false, raison: "rappel" } });
  await limiter(env, "est:" + ip(request), 8, 3600);
  const rep = lireReponses(d.reponses || {});
  if (d.consentement !== true) throw new Erreur(400, "champs", { champ: "consentement" });
  const base = await db(env);
  let compte = await compteSession(request, env);
  let cookie = null;
  let contact;
  if (compte) {
    contact = { civilite: compte.civilite, prenom: compte.prenom, nom: compte.nom, email: compte.email, telephone: compte.telephone };
    if (d.contact && d.contact.telephone) contact.telephone = telephone(d.contact.telephone);
  } else {
    contact = lireContact(d.contact);
    const mdp = motDePasse(d.contact.mot_de_passe);
    const existant = await base.prepare("SELECT * FROM comptes WHERE email = ?1").bind(contact.email).first();
    if (existant) {
      await limiter(env, "cnx:" + contact.email, 10, 900);
      if (!await verifierMdp(mdp, existant.mdp)) throw new Erreur(409, "compte_existe");
      compte = existant;
    } else {
      const r = await base.prepare(
        `INSERT INTO comptes (email, mdp, civilite, prenom, nom, telephone, source, consentement_le, cree_le)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?8) RETURNING *`
      ).bind(contact.email, await hacher(mdp), contact.civilite, contact.prenom, contact.nom, contact.telephone, source(request, env), maintenant()).first();
      compte = r;
      ctx.waitUntil(lienVerification(env, request, compte).catch(() => {
      }));
    }
    cookie = await ouvrirSession(env, compte.id);
  }
  const res = await estimer(env, request.url, rep);
  const ref = reference();
  await base.prepare(
    `INSERT INTO demandes (reference, compte_id, source, type, adresse, code_postal, commune, lat, lon, reponses, contact,
       prix_bas, prix_haut, prix_m2, comparables, rayon, donnees_du, cree_le)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18)`
  ).bind(
    ref,
    compte.id,
    source(request, env),
    rep.type,
    rep.adresse,
    rep.code_postal,
    rep.commune,
    rep.lat,
    rep.lon,
    JSON.stringify(rep),
    JSON.stringify(contact),
    res.fourchette ? res.bas : null,
    res.fourchette ? res.haut : null,
    res.fourchette ? res.prix_m2 : null,
    res.comparables ?? null,
    res.rayon ?? null,
    res.donnees_du || null,
    maintenant()
  ).run();
  ctx.waitUntil(notifier(env, request, ref, rep, contact, res).catch((e) => console.log("notification", e && e.message)));
  return json(201, { reference: ref, resultat: res, compte: comptepublic(compte, env) }, cookie ? { "Set-Cookie": cookie } : {});
}
__name(estimation, "estimation");
async function connexion({ request, env }) {
  const d = await corps(request, 2e3);
  const e = email(d.email);
  await limiter(env, "cnx:" + ip(request), 20, 900);
  await limiter(env, "cnx:" + e, 10, 900);
  const c = await (await db(env)).prepare("SELECT * FROM comptes WHERE email = ?1").bind(e).first();
  const ok = c && typeof d.mot_de_passe === "string" && await verifierMdp(d.mot_de_passe, c.mdp);
  if (!ok) throw new Erreur(401, "identifiants");
  return json(200, { compte: comptepublic(c, env) }, { "Set-Cookie": await ouvrirSession(env, c.id) });
}
__name(connexion, "connexion");
async function deconnexion({ request, env }) {
  await fermerSession(request, env);
  return json(200, { ok: true }, { "Set-Cookie": cookieEfface });
}
__name(deconnexion, "deconnexion");
async function inscription(ctx) {
  const { request, env } = ctx;
  const d = await corps(request, 4e3);
  if (d.website) return json(202, { ok: true });
  await limiter(env, "ins:" + ip(request), 5, 3600);
  if (d.consentement !== true) throw new Erreur(400, "champs", { champ: "consentement" });
  const c = lireContact(d);
  const mdp = motDePasse(d.mot_de_passe);
  const base = await db(env);
  if (await base.prepare("SELECT id FROM comptes WHERE email = ?1").bind(c.email).first()) throw new Erreur(409, "compte_existe");
  const compte = await base.prepare(
    `INSERT INTO comptes (email, mdp, civilite, prenom, nom, telephone, source, consentement_le, cree_le)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?8) RETURNING *`
  ).bind(c.email, await hacher(mdp), c.civilite, c.prenom, c.nom, c.telephone, source(request, env), maintenant()).first();
  ctx.waitUntil(lienVerification(env, request, compte).catch(() => {
  }));
  return json(201, { compte: comptepublic(compte, env) }, { "Set-Cookie": await ouvrirSession(env, compte.id) });
}
__name(inscription, "inscription");
async function nouveauJeton(env, compteId, usage, secondes) {
  const t = jeton();
  const base = await db(env);
  await base.batch([
    base.prepare("DELETE FROM jetons WHERE compte_id = ?1 AND usage = ?2").bind(compteId, usage),
    base.prepare("INSERT INTO jetons (id, compte_id, usage, expire) VALUES (?1, ?2, ?3, ?4)").bind(await sha256(t), compteId, usage, Math.floor(Date.now() / 1e3) + secondes)
  ]);
  return t;
}
__name(nouveauJeton, "nouveauJeton");
async function consommerJeton(env, t, usage) {
  if (typeof t !== "string" || t.length < 20 || t.length > 100) return null;
  const base = await db(env);
  const id = await sha256(t);
  const r = await base.prepare("DELETE FROM jetons WHERE id = ?1 AND usage = ?2 AND expire > ?3 RETURNING compte_id").bind(id, usage, Math.floor(Date.now() / 1e3)).first();
  return r ? r.compte_id : null;
}
__name(consommerJeton, "consommerJeton");
async function lienVerification(env, request, compte) {
  if (!peutEcrire(env, compte.email)) return false;
  const t = await nouveauJeton(env, compte.id, "verif", 7 * 24 * 3600);
  const lien = `${new URL(request.url).origin}/api/espace/verifier?jeton=${t}`;
  return envoyer(env, {
    to: compte.email,
    subject: "Confirmez votre adresse e-mail",
    text: `Bonjour ${compte.prenom || ""},

Pour confirmer votre adresse e-mail et s\xE9curiser votre espace, ouvrez ce lien (valable 7 jours) :
${lien}

Shawez Ali \u2014 GRAVELIN IMMO`,
    html: gabarit("Confirmez votre adresse e-mail", `<tr><td style="padding:8px 24px 16px;font-size:16px;line-height:1.55;color:#3A3630;">Bonjour ${esc(compte.prenom || "")},<br>pour confirmer votre adresse et s\xE9curiser votre espace, cliquez ci-dessous. Le lien est valable 7 jours.</td></tr><tr><td style="padding:0 24px 16px;">${bouton(lien, "Confirmer mon adresse")}</td></tr>`)
  });
}
__name(lienVerification, "lienVerification");
async function verifier({ request, env }) {
  const t = new URL(request.url).searchParams.get("jeton");
  const id = await consommerJeton(env, t, "verif");
  if (id) await (await db(env)).prepare("UPDATE comptes SET verifie = 1 WHERE id = ?1").bind(id).run();
  return Response.redirect(new URL(id ? "/mon-espace/?verifie=1" : "/mon-espace/?verifie=0", request.url).toString(), 303);
}
__name(verifier, "verifier");
async function renvoyerVerification({ request, env }) {
  const c = await compteSession(request, env);
  if (!c) throw new Erreur(401, "connexion");
  await limiter(env, "ver:" + c.id, 3, 3600);
  const ok = await lienVerification(env, request, c);
  return json(200, { envoye: !!ok });
}
__name(renvoyerVerification, "renvoyerVerification");
async function oubli({ request, env }) {
  const d = await corps(request, 1e3);
  const e = email(d.email);
  await limiter(env, "oubli:" + ip(request), 5, 3600);
  if (!peutEcrire(env, e)) return json(200, { envoye: false, raison: "email_indisponible" });
  const c = await (await db(env)).prepare("SELECT * FROM comptes WHERE email = ?1").bind(e).first();
  if (c) {
    const t = await nouveauJeton(env, c.id, "reinit", 3600);
    const lien = `${new URL(request.url).origin}/mon-espace/?reinit=${t}`;
    await envoyer(env, {
      to: c.email,
      subject: "Nouveau mot de passe pour votre espace",
      text: `Bonjour,

Pour choisir un nouveau mot de passe, ouvrez ce lien (valable 1 heure) :
${lien}

Si vous n'avez rien demand\xE9, ignorez ce message.

Shawez Ali \u2014 GRAVELIN IMMO`,
      html: gabarit("Nouveau mot de passe", `<tr><td style="padding:8px 24px 16px;font-size:16px;line-height:1.55;color:#3A3630;">Pour choisir un nouveau mot de passe, cliquez ci-dessous. Le lien est valable 1 heure. Si vous n'avez rien demand\xE9, ignorez ce message.</td></tr><tr><td style="padding:0 24px 16px;">${bouton(lien, "Choisir un mot de passe")}</td></tr>`)
    });
  }
  return json(200, { envoye: true });
}
__name(oubli, "oubli");
async function reinit({ request, env }) {
  const d = await corps(request, 1e3);
  const mdp = motDePasse(d.mot_de_passe);
  await limiter(env, "reinit:" + ip(request), 10, 3600);
  const id = await consommerJeton(env, d.jeton, "reinit");
  if (!id) throw new Erreur(400, "jeton");
  const base = await db(env);
  await base.batch([
    base.prepare("UPDATE comptes SET mdp = ?1, verifie = 1 WHERE id = ?2").bind(await hacher(mdp), id),
    base.prepare("DELETE FROM sessions WHERE compte_id = ?1").bind(id)
  ]);
  const c = await base.prepare("SELECT * FROM comptes WHERE id = ?1").bind(id).first();
  return json(200, { compte: comptepublic(c, env) }, { "Set-Cookie": await ouvrirSession(env, id) });
}
__name(reinit, "reinit");
function demandePublique(d) {
  const rep = JSON.parse(d.reponses || "{}");
  return {
    id: d.id,
    reference: d.reference,
    cree_le: d.cree_le,
    type: d.type,
    adresse: d.adresse,
    commune: d.commune,
    surface: rep.surface ?? null,
    pieces: rep.pieces ?? null,
    prix_bas: d.prix_bas,
    prix_haut: d.prix_haut,
    prix_m2: d.prix_m2,
    comparables: d.comparables,
    donnees_du: d.donnees_du,
    statut: d.statut,
    statut_libelle: STATUTS[d.statut] || d.statut,
    maj_le: d.maj_le
  };
}
__name(demandePublique, "demandePublique");
async function moi({ request, env }) {
  const c = await compteSession(request, env);
  if (!c) return json(200, { compte: null, email: mailPossible(env) });
  const r = await (await db(env)).prepare("SELECT * FROM demandes WHERE compte_id = ?1 ORDER BY cree_le DESC").bind(c.id).all();
  return json(200, { compte: comptepublic(c, env), demandes: r.results.map(demandePublique), email: peutEcrire(env, c.email) });
}
__name(moi, "moi");
async function supprimerCompte({ request, env }) {
  const c = await compteSession(request, env);
  if (!c) throw new Erreur(401, "connexion");
  const d = await corps(request, 1e3);
  if (typeof d.mot_de_passe !== "string" || !await verifierMdp(d.mot_de_passe, c.mdp)) throw new Erreur(401, "identifiants");
  await effacerCompte(env, c.id);
  return json(200, { ok: true }, { "Set-Cookie": cookieEfface });
}
__name(supprimerCompte, "supprimerCompte");
async function effacerCompte(env, id) {
  const base = await db(env);
  await base.batch([
    base.prepare("DELETE FROM demandes WHERE compte_id = ?1").bind(id),
    base.prepare("DELETE FROM sessions WHERE compte_id = ?1").bind(id),
    base.prepare("DELETE FROM jetons WHERE compte_id = ?1").bind(id),
    base.prepare("DELETE FROM comptes WHERE id = ?1").bind(id)
  ]);
}
__name(effacerCompte, "effacerCompte");
async function exigerAdmin(request, env) {
  const c = await compteSession(request, env);
  if (!c) throw new Erreur(401, "connexion");
  if (!estAdmin(c, env)) throw new Erreur(403, admins(env).includes(c.email) ? "admin_non_verifie" : "interdit");
  return c;
}
__name(exigerAdmin, "exigerAdmin");
async function adminDemandes({ request, env }) {
  await exigerAdmin(request, env);
  const r = await (await db(env)).prepare(
    `SELECT d.*, c.email AS compte_email FROM demandes d LEFT JOIN comptes c ON c.id = d.compte_id ORDER BY d.cree_le DESC LIMIT 2000`
  ).all();
  return json(200, {
    statuts: STATUTS,
    demandes: r.results.map((d) => ({ ...demandePublique(d), source: d.source, notes: d.notes, contact: JSON.parse(d.contact), reponses: JSON.parse(d.reponses), compte_email: d.compte_email }))
  });
}
__name(adminDemandes, "adminDemandes");
async function adminComptes({ request, env }) {
  await exigerAdmin(request, env);
  const r = await (await db(env)).prepare(
    `SELECT c.id, c.email, c.civilite, c.prenom, c.nom, c.telephone, c.verifie, c.source, c.cree_le, c.derniere_connexion,
            (SELECT COUNT(*) FROM demandes d WHERE d.compte_id = c.id) AS demandes
     FROM comptes c ORDER BY c.cree_le DESC LIMIT 5000`
  ).all();
  return json(200, { comptes: r.results.map((c) => ({ ...c, admin: estAdmin(c, env) })) });
}
__name(adminComptes, "adminComptes");
async function adminDemande({ request, env }) {
  await exigerAdmin(request, env);
  const d = await corps(request, 8e3);
  const id = entier(d.id, 1, 1e12, { requis: true, nom: "id" });
  const sets = [];
  const vals = [];
  if (d.statut != null) {
    sets.push("statut = ?");
    vals.push(choix(d.statut, Object.keys(STATUTS), { requis: true, nom: "statut" }));
  }
  if (d.notes != null) {
    sets.push("notes = ?");
    vals.push(texte(d.notes, 5e3, { nom: "notes" }));
  }
  if (!sets.length) throw new Erreur(400, "champs");
  sets.push("maj_le = ?");
  vals.push(maintenant(), id);
  const r = await (await db(env)).prepare(`UPDATE demandes SET ${sets.join(", ")} WHERE id = ? RETURNING *`).bind(...vals).first();
  if (!r) throw new Erreur(404, "introuvable");
  return json(200, { demande: { ...demandePublique(r), notes: r.notes } });
}
__name(adminDemande, "adminDemande");
async function adminSupprimerCompte({ request, env }) {
  const moiAdmin = await exigerAdmin(request, env);
  const d = await corps(request, 500);
  const id = entier(d.id, 1, 1e12, { requis: true, nom: "id" });
  if (id === moiAdmin.id) throw new Erreur(400, "soi_meme");
  await effacerCompte(env, id);
  return json(200, { ok: true });
}
__name(adminSupprimerCompte, "adminSupprimerCompte");
async function adminLienMdp({ request, env }) {
  await exigerAdmin(request, env);
  const d = await corps(request, 500);
  const id = entier(d.id, 1, 1e12, { requis: true, nom: "id" });
  const c = await (await db(env)).prepare("SELECT id FROM comptes WHERE id = ?1").bind(id).first();
  if (!c) throw new Erreur(404, "introuvable");
  const t = await nouveauJeton(env, id, "reinit", 24 * 3600);
  return json(200, { lien: `${new URL(request.url).origin}/mon-espace/?reinit=${t}` });
}
__name(adminLienMdp, "adminLienMdp");
var csvCase = /* @__PURE__ */ __name((v) => {
  let s = v == null ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}, "csvCase");
async function adminExport({ request, env }) {
  await exigerAdmin(request, env);
  const quoi = new URL(request.url).searchParams.get("quoi") === "comptes" ? "comptes" : "demandes";
  const base = await db(env);
  let lignes;
  if (quoi === "comptes") {
    const r = await base.prepare("SELECT id, cree_le, email, civilite, prenom, nom, telephone, verifie, source, derniere_connexion FROM comptes ORDER BY cree_le DESC").all();
    lignes = [
      ["id", "cr\xE9\xE9 le", "e-mail", "civilit\xE9", "pr\xE9nom", "nom", "t\xE9l\xE9phone", "e-mail v\xE9rifi\xE9", "source", "derni\xE8re connexion"],
      ...r.results.map((c) => [c.id, c.cree_le, c.email, c.civilite, c.prenom, c.nom, c.telephone, c.verifie ? "oui" : "non", c.source, c.derniere_connexion])
    ];
  } else {
    const r = await base.prepare("SELECT * FROM demandes ORDER BY cree_le DESC").all();
    lignes = [[
      "r\xE9f\xE9rence",
      "re\xE7ue le",
      "source",
      "statut",
      "civilit\xE9",
      "pr\xE9nom",
      "nom",
      "e-mail",
      "t\xE9l\xE9phone",
      "type",
      "adresse",
      "code postal",
      "commune",
      "surface",
      "pi\xE8ces",
      "chambres",
      "\xE9tage",
      "\xE9tat",
      "\xE9poque",
      "terrain",
      "prix id\xE9al",
      "d\xE9lai",
      "fourchette basse",
      "fourchette haute",
      "prix m\xB2",
      "comparables",
      "donn\xE9es du",
      "notes",
      "r\xE9ponses (JSON)"
    ]];
    for (const d of r.results) {
      const c = JSON.parse(d.contact || "{}");
      const p = JSON.parse(d.reponses || "{}");
      lignes.push([
        d.reference,
        d.cree_le,
        d.source,
        STATUTS[d.statut] || d.statut,
        c.civilite,
        c.prenom,
        c.nom,
        c.email,
        c.telephone,
        d.type,
        d.adresse,
        d.code_postal,
        d.commune,
        p.surface,
        p.pieces,
        p.chambres,
        p.etage,
        p.etat,
        p.epoque,
        p.terrain,
        p.prix_ideal,
        p.delai,
        d.prix_bas,
        d.prix_haut,
        d.prix_m2,
        d.comparables,
        d.donnees_du,
        d.notes,
        d.reponses
      ]);
    }
  }
  const csv = "\uFEFF" + lignes.map((l) => l.map(csvCase).join(";")).join("\r\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex",
      "Content-Disposition": `attachment; filename="${quoi}-${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.csv"`
    }
  });
}
__name(adminExport, "adminExport");
var LIBELLES = {
  delai: { asap: "D\xE8s que possible", "6mois": "Dans les 6 mois", plus6mois: "Dans plus de 6 mois", nsp: "Ne sait pas encore", aucun: "Pas de projet de vente" },
  etat: { travaux: "Travaux importants", rafraichir: "Quelques travaux", bon: "Bon \xE9tat", neuf: "Refait \xE0 neuf" },
  epoque: { avant1948: "Avant 1948", "1948-1974": "1948 \u2013 1974", "1975-2000": "1975 \u2013 2000", "2001-2012": "2001 \u2013 2012", apres2012: "Apr\xE8s 2012", nsp: "Ne sait pas" },
  autre_type: { commerce: "Fonds de commerce", murs: "Murs commerciaux", immeuble: "Immeuble", terrain: "Terrain", autre: "Autre" }
};
var euros = /* @__PURE__ */ __name((n) => n == null ? "" : n.toLocaleString("fr-FR") + " \u20AC", "euros");
function fiche(rep) {
  const L = [];
  const add = /* @__PURE__ */ __name((k, v) => {
    if (v !== "" && v != null && v !== false) L.push([k, v === true ? "oui" : String(v)]);
  }, "add");
  add("Type", rep.type === "autre" ? LIBELLES.autre_type[rep.autre_type] : rep.type === "maison" ? "Maison" : "Appartement");
  add("Adresse", rep.adresse);
  add("Surface", rep.surface ? rep.surface + " m\xB2" : "");
  add("Pi\xE8ces", rep.pieces);
  add("Chambres", rep.chambres);
  if (rep.type === "appartement") {
    add("\xC9tage", rep.etage === 0 ? "Rez-de-chauss\xE9e" : rep.etage);
    add("\xC9tages de l'immeuble", rep.etages_immeuble);
  }
  if (rep.type === "maison") {
    add("Terrain", rep.terrain != null ? rep.terrain + " m\xB2" : "");
    add("Niveaux", rep.niveaux);
  }
  add("\xC9poque", LIBELLES.epoque[rep.epoque]);
  add("\xC9tat", LIBELLES.etat[rep.etat]);
  const sp = ["ascenseur", "balcon", "terrasse", "cave", "gardien", "parking", "parking_box", "plain_pied", "piscine", "garage"].filter((k) => rep[k]).map((k) => ({ parking_box: "garage ou box", plain_pied: "plain-pied" })[k] || k);
  add("Atouts", sp.join(", "));
  add("Prix id\xE9al", rep.prix_ideal ? euros(rep.prix_ideal) : "");
  add("D\xE9lai", LIBELLES.delai[rep.delai]);
  add("Message", rep.message);
  return L;
}
__name(fiche, "fiche");
async function notifier(env, request, ref, rep, c, res) {
  if (!mailPossible(env)) return;
  const dest = String(env.NOTIFY_EMAILS || "shawez@gravelin-immo.com").split(/[,;\s]+/).filter(Boolean);
  const nom = [c.civilite, c.prenom, c.nom].filter(Boolean).join(" ");
  const fourchette = res.fourchette ? `${euros(res.bas)} \u2013 ${euros(res.haut)} (${res.comparables} ventes, rayon ${res.rayon} m)` : "Pas de fourchette automatique : rappel promis";
  const lignes = [["Contact", nom], ["T\xE9l\xE9phone", c.telephone], ["E-mail", c.email], ["Fourchette", fourchette], ...fiche(rep), ["Source", source(request, env)]];
  const tel = "tel:" + c.telephone.replace(/[^\d+]/g, "");
  const admin = new URL("/admin/", request.url).toString();
  const html = gabarit(`${rep.commune || "Nouvelle estimation"} \u2014 ${nom}`, `
<tr><td style="padding:4px 24px 12px;">${bouton(tel, "Appeler " + (c.prenom || ""))}${bouton("mailto:" + c.email + "?subject=" + encodeURIComponent("Votre estimation " + ref), "R\xE9pondre", false)}</td></tr>
<tr><td style="padding:0 24px 8px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;line-height:1.45;">
${lignes.map(([k, v]) => `<tr><td style="padding:7px 12px 7px 0;color:#6B655C;border-bottom:1px solid #ECE8E0;vertical-align:top;width:38%;">${esc(k)}</td><td style="padding:7px 0;border-bottom:1px solid #ECE8E0;">${esc(v)}</td></tr>`).join("")}
</table></td></tr>
<tr><td style="padding:12px 24px 8px;font-size:13px;color:#6B655C;">R\xE9f\xE9rence ${esc(ref)} \xB7 <a href="${esc(admin)}" style="color:#8A6614;">ouvrir l'espace admin</a></td></tr>`);
  const text = `Nouvelle estimation ${ref}

${lignes.map(([k, v]) => `${k} : ${v}`).join("\n")}

Appeler : ${c.telephone}
Admin : ${admin}`;
  for (const to of dest) {
    await envoyer(env, { to, subject: `Estimation ${rep.commune || ""} \u2014 ${nom} \u2014 ${c.telephone}`, text, html, replyTo: c.email });
  }
}
__name(notifier, "notifier");

// ../.wrangler/tmp/pages-saD8ja/functionsRoutes-0.2669452507239982.mjs
var routes = [
  {
    routePath: "/api/espace/:route*",
    mountPath: "/api/espace",
    method: "",
    middlewares: [],
    modules: [onRequest]
  }
];

// ../../../../tmp/claude-0/wr/node_modules/path-to-regexp/dist.es2015/index.js
function lexer(str) {
  var tokens = [];
  var i = 0;
  while (i < str.length) {
    var char = str[i];
    if (char === "*" || char === "+" || char === "?") {
      tokens.push({ type: "MODIFIER", index: i, value: str[i++] });
      continue;
    }
    if (char === "\\") {
      tokens.push({ type: "ESCAPED_CHAR", index: i++, value: str[i++] });
      continue;
    }
    if (char === "{") {
      tokens.push({ type: "OPEN", index: i, value: str[i++] });
      continue;
    }
    if (char === "}") {
      tokens.push({ type: "CLOSE", index: i, value: str[i++] });
      continue;
    }
    if (char === ":") {
      var name = "";
      var j = i + 1;
      while (j < str.length) {
        var code = str.charCodeAt(j);
        if (
          // `0-9`
          code >= 48 && code <= 57 || // `A-Z`
          code >= 65 && code <= 90 || // `a-z`
          code >= 97 && code <= 122 || // `_`
          code === 95
        ) {
          name += str[j++];
          continue;
        }
        break;
      }
      if (!name)
        throw new TypeError("Missing parameter name at ".concat(i));
      tokens.push({ type: "NAME", index: i, value: name });
      i = j;
      continue;
    }
    if (char === "(") {
      var count = 1;
      var pattern = "";
      var j = i + 1;
      if (str[j] === "?") {
        throw new TypeError('Pattern cannot start with "?" at '.concat(j));
      }
      while (j < str.length) {
        if (str[j] === "\\") {
          pattern += str[j++] + str[j++];
          continue;
        }
        if (str[j] === ")") {
          count--;
          if (count === 0) {
            j++;
            break;
          }
        } else if (str[j] === "(") {
          count++;
          if (str[j + 1] !== "?") {
            throw new TypeError("Capturing groups are not allowed at ".concat(j));
          }
        }
        pattern += str[j++];
      }
      if (count)
        throw new TypeError("Unbalanced pattern at ".concat(i));
      if (!pattern)
        throw new TypeError("Missing pattern at ".concat(i));
      tokens.push({ type: "PATTERN", index: i, value: pattern });
      i = j;
      continue;
    }
    tokens.push({ type: "CHAR", index: i, value: str[i++] });
  }
  tokens.push({ type: "END", index: i, value: "" });
  return tokens;
}
__name(lexer, "lexer");
function parse(str, options) {
  if (options === void 0) {
    options = {};
  }
  var tokens = lexer(str);
  var _a = options.prefixes, prefixes = _a === void 0 ? "./" : _a, _b = options.delimiter, delimiter = _b === void 0 ? "/#?" : _b;
  var result = [];
  var key = 0;
  var i = 0;
  var path = "";
  var tryConsume = /* @__PURE__ */ __name(function(type) {
    if (i < tokens.length && tokens[i].type === type)
      return tokens[i++].value;
  }, "tryConsume");
  var mustConsume = /* @__PURE__ */ __name(function(type) {
    var value2 = tryConsume(type);
    if (value2 !== void 0)
      return value2;
    var _a2 = tokens[i], nextType = _a2.type, index2 = _a2.index;
    throw new TypeError("Unexpected ".concat(nextType, " at ").concat(index2, ", expected ").concat(type));
  }, "mustConsume");
  var consumeText = /* @__PURE__ */ __name(function() {
    var result2 = "";
    var value2;
    while (value2 = tryConsume("CHAR") || tryConsume("ESCAPED_CHAR")) {
      result2 += value2;
    }
    return result2;
  }, "consumeText");
  var isSafe = /* @__PURE__ */ __name(function(value2) {
    for (var _i = 0, delimiter_1 = delimiter; _i < delimiter_1.length; _i++) {
      var char2 = delimiter_1[_i];
      if (value2.indexOf(char2) > -1)
        return true;
    }
    return false;
  }, "isSafe");
  var safePattern = /* @__PURE__ */ __name(function(prefix2) {
    var prev = result[result.length - 1];
    var prevText = prefix2 || (prev && typeof prev === "string" ? prev : "");
    if (prev && !prevText) {
      throw new TypeError('Must have text between two parameters, missing text after "'.concat(prev.name, '"'));
    }
    if (!prevText || isSafe(prevText))
      return "[^".concat(escapeString(delimiter), "]+?");
    return "(?:(?!".concat(escapeString(prevText), ")[^").concat(escapeString(delimiter), "])+?");
  }, "safePattern");
  while (i < tokens.length) {
    var char = tryConsume("CHAR");
    var name = tryConsume("NAME");
    var pattern = tryConsume("PATTERN");
    if (name || pattern) {
      var prefix = char || "";
      if (prefixes.indexOf(prefix) === -1) {
        path += prefix;
        prefix = "";
      }
      if (path) {
        result.push(path);
        path = "";
      }
      result.push({
        name: name || key++,
        prefix,
        suffix: "",
        pattern: pattern || safePattern(prefix),
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    var value = char || tryConsume("ESCAPED_CHAR");
    if (value) {
      path += value;
      continue;
    }
    if (path) {
      result.push(path);
      path = "";
    }
    var open = tryConsume("OPEN");
    if (open) {
      var prefix = consumeText();
      var name_1 = tryConsume("NAME") || "";
      var pattern_1 = tryConsume("PATTERN") || "";
      var suffix = consumeText();
      mustConsume("CLOSE");
      result.push({
        name: name_1 || (pattern_1 ? key++ : ""),
        pattern: name_1 && !pattern_1 ? safePattern(prefix) : pattern_1,
        prefix,
        suffix,
        modifier: tryConsume("MODIFIER") || ""
      });
      continue;
    }
    mustConsume("END");
  }
  return result;
}
__name(parse, "parse");
function match(str, options) {
  var keys = [];
  var re = pathToRegexp(str, keys, options);
  return regexpToFunction(re, keys, options);
}
__name(match, "match");
function regexpToFunction(re, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.decode, decode = _a === void 0 ? function(x) {
    return x;
  } : _a;
  return function(pathname) {
    var m = re.exec(pathname);
    if (!m)
      return false;
    var path = m[0], index2 = m.index;
    var params = /* @__PURE__ */ Object.create(null);
    var _loop_1 = /* @__PURE__ */ __name(function(i2) {
      if (m[i2] === void 0)
        return "continue";
      var key = keys[i2 - 1];
      if (key.modifier === "*" || key.modifier === "+") {
        params[key.name] = m[i2].split(key.prefix + key.suffix).map(function(value) {
          return decode(value, key);
        });
      } else {
        params[key.name] = decode(m[i2], key);
      }
    }, "_loop_1");
    for (var i = 1; i < m.length; i++) {
      _loop_1(i);
    }
    return { path, index: index2, params };
  };
}
__name(regexpToFunction, "regexpToFunction");
function escapeString(str) {
  return str.replace(/([.+*?=^!:${}()[\]|/\\])/g, "\\$1");
}
__name(escapeString, "escapeString");
function flags(options) {
  return options && options.sensitive ? "" : "i";
}
__name(flags, "flags");
function regexpToRegexp(path, keys) {
  if (!keys)
    return path;
  var groupsRegex = /\((?:\?<(.*?)>)?(?!\?)/g;
  var index2 = 0;
  var execResult = groupsRegex.exec(path.source);
  while (execResult) {
    keys.push({
      // Use parenthesized substring match if available, index otherwise
      name: execResult[1] || index2++,
      prefix: "",
      suffix: "",
      modifier: "",
      pattern: ""
    });
    execResult = groupsRegex.exec(path.source);
  }
  return path;
}
__name(regexpToRegexp, "regexpToRegexp");
function arrayToRegexp(paths, keys, options) {
  var parts = paths.map(function(path) {
    return pathToRegexp(path, keys, options).source;
  });
  return new RegExp("(?:".concat(parts.join("|"), ")"), flags(options));
}
__name(arrayToRegexp, "arrayToRegexp");
function stringToRegexp(path, keys, options) {
  return tokensToRegexp(parse(path, options), keys, options);
}
__name(stringToRegexp, "stringToRegexp");
function tokensToRegexp(tokens, keys, options) {
  if (options === void 0) {
    options = {};
  }
  var _a = options.strict, strict = _a === void 0 ? false : _a, _b = options.start, start = _b === void 0 ? true : _b, _c = options.end, end = _c === void 0 ? true : _c, _d = options.encode, encode = _d === void 0 ? function(x) {
    return x;
  } : _d, _e = options.delimiter, delimiter = _e === void 0 ? "/#?" : _e, _f = options.endsWith, endsWith = _f === void 0 ? "" : _f;
  var endsWithRe = "[".concat(escapeString(endsWith), "]|$");
  var delimiterRe = "[".concat(escapeString(delimiter), "]");
  var route = start ? "^" : "";
  for (var _i = 0, tokens_1 = tokens; _i < tokens_1.length; _i++) {
    var token = tokens_1[_i];
    if (typeof token === "string") {
      route += escapeString(encode(token));
    } else {
      var prefix = escapeString(encode(token.prefix));
      var suffix = escapeString(encode(token.suffix));
      if (token.pattern) {
        if (keys)
          keys.push(token);
        if (prefix || suffix) {
          if (token.modifier === "+" || token.modifier === "*") {
            var mod = token.modifier === "*" ? "?" : "";
            route += "(?:".concat(prefix, "((?:").concat(token.pattern, ")(?:").concat(suffix).concat(prefix, "(?:").concat(token.pattern, "))*)").concat(suffix, ")").concat(mod);
          } else {
            route += "(?:".concat(prefix, "(").concat(token.pattern, ")").concat(suffix, ")").concat(token.modifier);
          }
        } else {
          if (token.modifier === "+" || token.modifier === "*") {
            throw new TypeError('Can not repeat "'.concat(token.name, '" without a prefix and suffix'));
          }
          route += "(".concat(token.pattern, ")").concat(token.modifier);
        }
      } else {
        route += "(?:".concat(prefix).concat(suffix, ")").concat(token.modifier);
      }
    }
  }
  if (end) {
    if (!strict)
      route += "".concat(delimiterRe, "?");
    route += !options.endsWith ? "$" : "(?=".concat(endsWithRe, ")");
  } else {
    var endToken = tokens[tokens.length - 1];
    var isEndDelimited = typeof endToken === "string" ? delimiterRe.indexOf(endToken[endToken.length - 1]) > -1 : endToken === void 0;
    if (!strict) {
      route += "(?:".concat(delimiterRe, "(?=").concat(endsWithRe, "))?");
    }
    if (!isEndDelimited) {
      route += "(?=".concat(delimiterRe, "|").concat(endsWithRe, ")");
    }
  }
  return new RegExp(route, flags(options));
}
__name(tokensToRegexp, "tokensToRegexp");
function pathToRegexp(path, keys, options) {
  if (path instanceof RegExp)
    return regexpToRegexp(path, keys);
  if (Array.isArray(path))
    return arrayToRegexp(path, keys, options);
  return stringToRegexp(path, keys, options);
}
__name(pathToRegexp, "pathToRegexp");

// ../../../../tmp/claude-0/wr/node_modules/wrangler/templates/pages-template-worker.ts
var escapeRegex = /[.+?^${}()|[\]\\]/g;
function* executeRequest(request) {
  const requestPath = new URL(request.url).pathname;
  for (const route of [...routes].reverse()) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult) {
      for (const handler of route.middlewares.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: mountMatchResult.path
        };
      }
    }
  }
  for (const route of routes) {
    if (route.method && route.method !== request.method) {
      continue;
    }
    const routeMatcher = match(route.routePath.replace(escapeRegex, "\\$&"), {
      end: true
    });
    const mountMatcher = match(route.mountPath.replace(escapeRegex, "\\$&"), {
      end: false
    });
    const matchResult = routeMatcher(requestPath);
    const mountMatchResult = mountMatcher(requestPath);
    if (matchResult && mountMatchResult && route.modules.length) {
      for (const handler of route.modules.flat()) {
        yield {
          handler,
          params: matchResult.params,
          path: matchResult.path
        };
      }
      break;
    }
  }
}
__name(executeRequest, "executeRequest");
var pages_template_worker_default = {
  async fetch(originalRequest, env, workerContext) {
    let request = originalRequest;
    const handlerIterator = executeRequest(request);
    let data = {};
    let isFailOpen = false;
    const next = /* @__PURE__ */ __name(async (input, init) => {
      if (input !== void 0) {
        let url = input;
        if (typeof input === "string") {
          url = new URL(input, request.url).toString();
        }
        request = new Request(url, init);
      }
      const result = handlerIterator.next();
      if (result.done === false) {
        const { handler, params, path } = result.value;
        const context = {
          request: new Request(request.clone()),
          functionPath: path,
          next,
          params,
          get data() {
            return data;
          },
          set data(value) {
            if (typeof value !== "object" || value === null) {
              throw new Error("context.data must be an object");
            }
            data = value;
          },
          env,
          waitUntil: workerContext.waitUntil.bind(workerContext),
          passThroughOnException: /* @__PURE__ */ __name(() => {
            isFailOpen = true;
          }, "passThroughOnException")
        };
        const response = await handler(context);
        if (!(response instanceof Response)) {
          throw new Error("Your Pages function should return a Response");
        }
        return cloneResponse(response);
      } else if ("ASSETS") {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      } else {
        const response = await fetch(request);
        return cloneResponse(response);
      }
    }, "next");
    try {
      return await next();
    } catch (error) {
      if (isFailOpen) {
        const response = await env["ASSETS"].fetch(request);
        return cloneResponse(response);
      }
      throw error;
    }
  }
};
var cloneResponse = /* @__PURE__ */ __name((response) => (
  // https://fetch.spec.whatwg.org/#null-body-status
  new Response(
    [101, 204, 205, 304].includes(response.status) ? null : response.body,
    response
  )
), "cloneResponse");

// ../../../../tmp/claude-0/wr/node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// ../../../../tmp/claude-0/wr/node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    const body = JSON.stringify(error);
    const headers = {
      "Content-Type": "application/json",
      "MF-Experimental-Error-Stack": "true"
    };
    const encoded = encodeURIComponent(body);
    if (encoded.length <= 8192) {
      headers["MF-Experimental-Error-Stack-Payload"] = encoded;
    }
    return new Response(body, { status: 500, headers });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// ../.wrangler/tmp/bundle-wnFSZV/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = pages_template_worker_default;

// ../../../../tmp/claude-0/wr/node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// ../.wrangler/tmp/bundle-wnFSZV/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  scheduledTime;
  cron;
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=functionsWorker-0.8922206633924921.mjs.map

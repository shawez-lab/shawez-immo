/* /api/mesure-site — le compteur « visiteurs → demandes → RDV → mandats » de l'espace agence (/admin/stats/).

   POST /api/mesure-site   { p: chemin de la page, n: 1 si première page de la visite, r: site d'où vient le visiteur, u: utm_source }
                           → 204. Envoyé par le petit script id="mesure-site" de chaque page publique (outils/compteur.py).
   GET  /api/mesure-site?jours=7|30|90   (agence seulement) → visites, pages vues, sources, pages d'entrée, par jour,
                           demandes, RDV d'estimation fixés, mandats, et les deux taux de la mission (5 % et 40 %).

   Sans cookie et sans adresse IP gardée : un compteur par jour, par page et par source, rien d'autre (ni qui, ni quel
   appareil). Une « visite » = un onglet ouvert sur le site (mémoire de l'onglet, effacée à sa fermeture, jamais un cookie).
   Les essais ne comptent pas : ?test dans l'adresse, navigateur piloté (tests automatiques), robots connus ; côté
   demandes, les mêmes règles que le reste de l'espace (prénom « TEST… », adresse @test.invalid, compte de l'agence).
   Table créée ici au premier appel (rien à faire à la main) ; ce fichier ne touche à aucune table existante. */
import { db, json, Erreur, ip, limiter, compteSession, estAdmin, admins } from '../_lib/base.js';
import { adresseDeTest } from '../_lib/mail.js';
import { paris } from '../_lib/suivi.js';

const TABLE = `CREATE TABLE IF NOT EXISTS mesures_site (
  jour TEXT NOT NULL,
  chemin TEXT NOT NULL,
  source TEXT NOT NULL,
  evt TEXT NOT NULL,
  n INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (jour, chemin, source, evt)
)`;
let prete = false;
async function base(env) {
  const b = await db(env);
  if (!prete) { await b.prepare(TABLE).run(); prete = true; }
  return b;
}

/* D'où vient le visiteur : quelques familles lisibles par Shawez, jamais l'adresse complète de la page d'origine. */
const SOURCES = [
  ['google', /(^|\.)google\./], ['bing', /(^|\.)bing\.com$/], ['chatgpt', /(^|\.)(chatgpt\.com|openai\.com)$/],
  ['perplexity', /(^|\.)perplexity\.ai$/], ['gemini', /(^|\.)gemini\.google\.com$/], ['instagram', /(^|\.)instagram\.com$/],
  ['facebook', /(^|\.)(facebook\.com|fb\.com|messenger\.com)$/], ['tiktok', /(^|\.)tiktok\.com$/],
  ['youtube', /(^|\.)(youtube\.com|youtu\.be)$/], ['whatsapp', /(^|\.)whatsapp\.(com|net)$/],
  ['linkedin', /(^|\.)(linkedin\.com|lnkd\.in)$/], ['gravelin', /(^|\.)gravelin-immo\.com$/],
  ['annuaires', /(^|\.)(pagesjaunes\.fr|meilleursagents\.com|realadvisor\.fr|hoodspot\.fr|leboncoin\.fr|seloger\.com)$/],
  ['qwant', /(^|\.)qwant\.com$/], ['duckduckgo', /(^|\.)duckduckgo\.com$/], ['yahoo', /(^|\.)yahoo\./], ['ecosia', /(^|\.)ecosia\.org$/],
];
const LIBELLES = {
  direct: 'Accès direct (favori, adresse tapée, QR code, appli)', google: 'Google', bing: 'Bing', chatgpt: 'ChatGPT',
  perplexity: 'Perplexity', gemini: 'Gemini', instagram: 'Instagram', facebook: 'Facebook', tiktok: 'TikTok',
  youtube: 'YouTube', whatsapp: 'WhatsApp', linkedin: 'LinkedIn', gravelin: 'Site Gravelin Immo',
  annuaires: 'Annuaires et portails', qwant: 'Qwant', duckduckgo: 'DuckDuckGo', yahoo: 'Yahoo', ecosia: 'Ecosia', autre: 'Autres sites',
};
export function source(referent, utm) {
  const u = String(utm || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  if (u) {
    for (const [nom] of SOURCES) if (u.startsWith(nom)) return nom;
    if (u === 'ig') return 'instagram';
    if (u === 'fb') return 'facebook';
  }
  const h = String(referent || '').toLowerCase().replace(/^www\./, '');
  if (!h) return 'direct';
  if (h === 'shawez-immo.com' || h.endsWith('.shawez-immo.pages.dev') || h === 'shawez-immo.pages.dev') return 'direct';
  for (const [nom, re] of SOURCES) if (re.test(h)) return nom;
  return 'autre';
}

/* Chemin propre et court : seulement des lettres, chiffres, tirets et barres ; sinon « / autre ». */
export function chemin(p) {
  let s = String(p || '/').split(/[?#]/)[0].toLowerCase();
  if (!s.startsWith('/')) s = '/' + s;
  s = s.replace(/\/index\.html$/, '/').replace(/\/{2,}/g, '/');
  if (!/^\/[a-z0-9\-/._]{0,120}$/.test(s)) return '/autre';
  if (!s.endsWith('/') && !/\.[a-z0-9]{2,5}$/.test(s)) s += '/';
  if (s.startsWith('/admin') || s.startsWith('/mon-espace')) return '/prive';
  return s;
}

const ROBOTS = /bot|crawl|spider|slurp|preview|lighthouse|pagespeed|headless|phantom|python|curl|wget|httpclient|monitor|uptime|facebookexternalhit|embedly|quora|whatsapp\/|scan/i;

async function compter({ request, env }) {
  const ua = request.headers.get('User-Agent') || '';
  if (!ua || ROBOTS.test(ua)) return vide();
  const o = request.headers.get('Origin');
  if (o && o !== new URL(request.url).origin) return vide();
  const brut = await request.text();
  if (brut.length > 600) return vide();
  let d;
  try { d = JSON.parse(brut); } catch { return vide(); }
  if (!d || typeof d !== 'object') return vide();
  await limiter(env, 'msite:' + ip(request), 200, 3600);
  const b = await base(env);
  const jour = paris(new Date()).date;
  const page = chemin(d.p);
  const ordre = 'INSERT INTO mesures_site (jour, chemin, source, evt, n) VALUES (?1, ?2, ?3, ?4, 1) ON CONFLICT(jour, chemin, source, evt) DO UPDATE SET n = n + 1';
  const lots = [b.prepare(ordre).bind(jour, page, '-', 'vue')];
  if (Number(d.n) === 1) lots.push(b.prepare(ordre).bind(jour, page, source(d.r, d.u), 'visite'));
  await b.batch(lots);
  return vide();
}
const vide = () => new Response(null, { status: 204, headers: { 'Cache-Control': 'no-store' } });

/* Une demande d'essai ne compte jamais (mêmes règles que /admin/promesses/). */
function essai(dem, env) {
  let c = {};
  try { c = JSON.parse(dem.contact || '{}') || {}; } catch { /* contact illisible : compté */ }
  const mail = String(c.email || '').toLowerCase();
  return adresseDeTest(mail) || /^test\b/i.test(String(c.prenom || '')) || (mail && admins(env).includes(mail));
}
const MANDAT_ET_APRES = ['mandat', 'annonce', 'visites', 'offre', 'compromis', 'acte'];
const taux = (a, b) => (b > 0 ? Math.round((a / b) * 1000) / 10 : null);

async function lire({ request, env }) {
  const c = await compteSession(request, env);
  if (!c) throw new Erreur(401, 'connexion');
  if (!estAdmin(c, env)) throw new Erreur(403, 'interdit');
  const url = new URL(request.url);
  const jours = [7, 30, 90].includes(Number(url.searchParams.get('jours'))) ? Number(url.searchParams.get('jours')) : 30;
  const maintenantMs = Date.now();
  const depuis = paris(new Date(maintenantMs - (jours - 1) * 86400000)).date;
  const depuisIso = new Date(maintenantMs - jours * 86400000).toISOString();
  const b = await base(env);
  const [lignes, dem, vis, premiere] = await Promise.all([
    b.prepare('SELECT jour, chemin, source, evt, SUM(n) AS n FROM mesures_site WHERE jour >= ?1 GROUP BY jour, chemin, source, evt').bind(depuis).all(),
    b.prepare('SELECT id, contact, statut, statut_le, suspect, cree_le FROM demandes').all(),
    b.prepare("SELECT demande_id, fixee_le FROM visites WHERE etat = 'fixee'").all().catch(() => ({ results: [] })),
    b.prepare('SELECT MIN(jour) AS j FROM mesures_site').first(),
  ]);
  const parJour = new Map();
  const parSource = new Map();
  const entrees = new Map();
  const pages = new Map();
  let visites = 0, vues = 0;
  for (const l of lignes.results || []) {
    const n = Number(l.n) || 0;
    const j = parJour.get(l.jour) || { jour: l.jour, visites: 0, vues: 0, demandes: 0 };
    if (l.evt === 'visite') {
      visites += n; j.visites += n;
      parSource.set(l.source, (parSource.get(l.source) || 0) + n);
      entrees.set(l.chemin, (entrees.get(l.chemin) || 0) + n);
    } else if (l.evt === 'vue') {
      vues += n; j.vues += n;
      pages.set(l.chemin, (pages.get(l.chemin) || 0) + n);
    }
    parJour.set(l.jour, j);
  }
  const vraies = (dem.results || []).filter((d) => !d.suspect && !essai(d, env));
  const ids = new Set(vraies.map((d) => d.id));
  const nouvelles = vraies.filter((d) => d.cree_le >= depuisIso);
  for (const d of nouvelles) {
    const jour = paris(new Date(d.cree_le)).date;
    const j = parJour.get(jour) || { jour, visites: 0, vues: 0, demandes: 0 };
    j.demandes += 1; parJour.set(jour, j);
  }
  // RDV fixés pendant la période (vraies demandes seulement), et parmi les demandes de la période, celles qui ont un RDV
  const fixes = (vis.results || []).filter((v) => ids.has(v.demande_id));
  const rdvPeriode = new Set(fixes.filter((v) => v.fixee_le && v.fixee_le >= depuisIso).map((v) => v.demande_id));
  const avecRdv = new Set(fixes.map((v) => v.demande_id));
  const nouvellesAvecRdv = nouvelles.filter((d) => avecRdv.has(d.id)).length;
  const mandats = vraies.filter((d) => MANDAT_ET_APRES.includes(d.statut) && d.statut_le && d.statut_le >= depuisIso).length;
  const tri = (m, lib) => [...m.entries()].sort((a, b) => b[1] - a[1]).map(([k, n]) => (lib ? { cle: k, nom: LIBELLES[k] || k, n } : { chemin: k, n }));
  return json(200, {
    jours, depuis, mesure_depuis: (premiere && premiere.j) || null,
    visites, vues, demandes: nouvelles.length, rdv: rdvPeriode.size, demandes_avec_rdv: nouvellesAvecRdv, mandats,
    taux_visite_demande: taux(nouvelles.length, visites),
    taux_demande_rdv: taux(nouvellesAvecRdv, nouvelles.length),
    objectifs: { visite_demande: 5, demande_rdv: 40 },
    sources: tri(parSource, true),
    entrees: tri(entrees).slice(0, 15),
    pages: tri(pages).slice(0, 15),
    par_jour: [...parJour.values()].sort((a, b) => (a.jour < b.jour ? -1 : 1)),
  });
}

export async function onRequest(ctx) {
  try {
    if (ctx.request.method === 'POST') return await compter(ctx);
    if (ctx.request.method === 'GET') return await lire(ctx);
    return json(405, { error: 'methode' }, { Allow: 'GET, POST' });
  } catch (e) {
    if (e instanceof Erreur) return json(e.status, { error: e.code });
    console.log('mesure-site', e && e.message);
    if (ctx.request.method === 'POST') return vide();      // le compteur ne doit jamais gêner la page
    return json(500, { error: 'serveur' });
  }
}

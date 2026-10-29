/* Le site demande au socle AIMMO, en ombre (tâche B03 du chantier AIMMO).

   Avant chaque rappel de visite et chaque e-mail gardé, le site demande au socle AIMMO
   (POST /v1/automatisations/envoi, clé de dépôt « site_auto ») si l'envoi pourrait partir. Le socle répond en mode
   essai : il n'envoie jamais rien. Le site, lui, envoie exactement comme avant : la question part en tâche de fond,
   n'est jamais attendue par l'envoi, et une panne, une lenteur ou une erreur du socle ne change rien.
   Les deux décisions sont rangées côte à côte (table socle_ombre), sans adresse, sans texte, sans nom : seulement
   l'automatisation, la décision du site et sa raison, la décision du socle et sa règle. Le rapport compte les écarts
   par règle (GET /api/espace/admin/ombre).

   Mise en service : variable AIMMO_API_URL (adresse du Worker aimmo-api, https) et secret AIMMO_SITE_AUTO_KEY (la clé
   « site_auto » ; seule son empreinte est rangée chez AIMMO). Sans les deux, rien n'est demandé, rien n'est rangé.
   AIMMO_OMBRE = '0' coupe la demande sans toucher au reste. */

export const AUTOMATISATIONS = ['rappel_visite', 'courrier_vendeur'];
export const DELAI_SOCLE_MS = 4000;
const TEXTE_MAX = 4000;
const CHIFFRES_MAX = 30;
const REF = /^[A-Za-z0-9_-]{1,64}$/;

/* L'adresse du socle, seulement en https (ou sur la machine même, pour les tests locaux). */
export function adresseSocle(env) {
  const brut = String((env && env.AIMMO_API_URL) || '').trim();
  if (!brut) return null;
  let u;
  try { u = new URL(brut); } catch (e) { return null; }
  const local = u.protocol === 'http:' && (u.hostname === '127.0.0.1' || u.hostname === 'localhost');
  if (u.protocol !== 'https:' && !local) return null;
  if (u.username || u.password || u.search || u.hash) return null;
  return u.origin + u.pathname.replace(/\/+$/, '') + '/v1/automatisations/envoi';
}

export function socleConfigure(env) {
  return String((env && env.AIMMO_OMBRE) || '') !== '0' && !!adresseSocle(env) && String((env && env.AIMMO_SITE_AUTO_KEY) || '').length >= 32;
}

/* Le texte du site tel qu'il part (sujet et paragraphes), sans le lien personnel ni la signature. */
export function texteDuCourrier(contenu) {
  const c = contenu || {};
  const morceaux = [c.sujet, ...(Array.isArray(c.paragraphes) ? c.paragraphes : [])].map((x) => String(x ?? '').trim()).filter(Boolean);
  return morceaux.join('\n\n').slice(0, TEXTE_MAX);
}

/* Les chiffres du texte : tous viennent des données du site (date et heure de la visite, référence) ou de ses modèles.
   Le socle vérifie qu'aucun autre chiffre n'y figure [R10 d'AIMMO]. */
export function chiffresDu(texte) {
  const vus = [];
  for (const m of String(texte || '').match(/\d+/g) || []) {
    const n = m.replace(/^0+(?=\d)/, '');
    if (!vus.includes(n)) vus.push(n);
    if (vus.length >= CHIFFRES_MAX) break;
  }
  return vus;
}

/* La question au socle. Ne lève jamais : rend { statut, regle, code, erreur }.
   statut : 'part' (le socle l'aurait laissé partir), 'ne_part_pas', ou null si pas de réponse (erreur dit pourquoi). */
export async function demanderAuSocle(env, { automation, email, ref, texte }, { fetchImpl, delai = DELAI_SOCLE_MS } = {}) {
  const url = adresseSocle(env);
  if (!socleConfigure(env)) return { statut: null, regle: null, code: null, erreur: 'non_configure' };
  if (!AUTOMATISATIONS.includes(automation) || !REF.test(String(ref || '')) || !email || !texte) {
    return { statut: null, regle: null, code: null, erreur: 'demande_invalide' };
  }
  const f = fetchImpl || globalThis.fetch;
  const arret = new AbortController();
  const minuteur = setTimeout(() => arret.abort(), delai);
  try {
    const r = await f(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.AIMMO_SITE_AUTO_KEY}` },
      body: JSON.stringify({ automation, email, ref, text: texte, figures: chiffresDu(texte) }),
      signal: arret.signal,
    });
    if (!r || !r.ok) return { statut: null, regle: null, code: null, erreur: `http_${r ? r.status : 0}` };
    let corps;
    try { corps = await r.json(); } catch (e) { return { statut: null, regle: null, code: null, erreur: 'reponse_illisible' }; }
    const d = corps && corps.data;
    if (!corps || corps.ok !== true || corps.sent !== false || !d || !['would_send', 'refused', 'failed'].includes(d.status)) {
      return { statut: null, regle: null, code: null, erreur: 'reponse_illisible' };
    }
    const court = (x) => (typeof x === 'string' && /^[A-Za-z0-9_]{1,40}$/.test(x) ? x : null);
    return { statut: d.status === 'would_send' ? 'part' : 'ne_part_pas', regle: court(d.rule), code: court(d.code), erreur: d.status === 'failed' ? 'echec_socle' : null };
  } catch (e) {
    return { statut: null, regle: null, code: null, erreur: arret.signal.aborted ? 'delai' : 'injoignable' };
  } finally {
    clearTimeout(minuteur);
  }
}

/* accord : les deux décisions sont les mêmes ; ecart : elles diffèrent ; sans_reponse : le socle n'a pas répondu ;
   site_seul : le site n'envoie pas, le socle n'est pas interrogé (hors écarts). */
export function comparer(site, socle) {
  if (site !== 'part') return 'site_seul';
  if (!socle || socle.statut == null) return 'sans_reponse';
  return socle.statut === site ? 'accord' : 'ecart';
}

/* La table socle_ombre est créée avec les tables du « système parfait » (functions/_lib/base.js, SCHEMA_SP). */

/* Range les deux décisions, sans adresse, sans texte, sans nom, sans référence du dossier. */
export async function noterOmbre(base, { automation, site, siteRaison = null, socle, quand = new Date() }) {
  await base.prepare('INSERT INTO socle_ombre (automation, site, site_raison, socle, regle, code, erreur, resultat, cree_le) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)')
    .bind(automation, site, siteRaison, socle.statut, socle.regle, socle.code, socle.erreur, comparer(site, socle), quand.toISOString()).run();
}

/* Tout le passage en ombre pour un envoi : demander, ranger. Ne lève jamais, et n'est jamais attendu par l'envoi.
   site : 'part' ou 'ne_part_pas' ; siteRaison : la raison du site quand il ne l'envoie pas. */
export async function ombre(env, base, { automation, ref, email, contenu, site, siteRaison = null }, options = {}) {
  if (!socleConfigure(env)) return null;
  try {
    // Seul un envoi réel du site est soumis au socle : en essai, un « would_send » y est rangé comme un envoi (sujet gardé,
    // pression commerciale) ; lui soumettre ce que le site n'envoie pas fausserait ses décisions suivantes.
    const socle = site !== 'part'
      ? { statut: null, regle: null, code: null, erreur: null }
      : email
      ? await demanderAuSocle(env, { automation, email, ref, texte: texteDuCourrier(contenu) }, options)
      : { statut: null, regle: null, code: null, erreur: 'sans_adresse' };
    await noterOmbre(base, { automation, site, siteRaison, socle, quand: options.quand || new Date() });
    return socle;
  } catch (e) {
    console.log('ombre', e && e.name);   // jamais le message : il pourrait porter une donnée
    return null;
  }
}

/* Le rapport : les écarts comptés par règle, sur les derniers jours. Aucune donnée personnelle. */
export async function rapportOmbre(env, base, { jours = 7, maintenant = new Date() } = {}) {
  const depuis = new Date(maintenant.getTime() - jours * 86400000).toISOString();
  const r = await base.prepare(`SELECT automation, site, site_raison, socle, regle, code, erreur, resultat, COUNT(*) AS n
    FROM socle_ombre WHERE cree_le >= ?1 GROUP BY automation, site, site_raison, socle, regle, code, erreur, resultat
    ORDER BY n DESC, automation, resultat`).bind(depuis).all();
  const lignes = (r.results || []).map((l) => ({
    automation: l.automation, site: l.site, site_raison: l.site_raison || null, socle: l.socle || null,
    regle: l.regle || null, code: l.code || null, erreur: l.erreur || null, resultat: l.resultat, n: Number(l.n),
  }));
  const total = (f) => lignes.filter(f).reduce((s, l) => s + l.n, 0);
  const parRegle = {};
  for (const l of lignes.filter((x) => x.resultat === 'ecart')) {
    const cle = l.regle || l.code || 'sans_regle';
    parRegle[cle] = (parRegle[cle] || 0) + l.n;
  }
  return {
    actif: socleConfigure(env), jours, depuis,
    total: total(() => true), accords: total((l) => l.resultat === 'accord'), ecarts: total((l) => l.resultat === 'ecart'),
    sans_reponse: total((l) => l.resultat === 'sans_reponse'), site_seul: total((l) => l.resultat === 'site_seul'), ecarts_par_regle: parRegle, lignes,
  };
}
